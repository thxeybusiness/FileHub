import { prisma } from "./prisma";
import { listCoachingMembers } from "./coaching-members";

// Chaque coaché possède un « drive » complet, réalisé par un espace FileHub
// dédié et CACHÉ (exclu de la liste des espaces et des quotas visibles). Le lien
// coaché → espace est stocké dans une table provisionnée à la volée (sans
// migration). L'espace réutilise tout le modèle Node/Space (dossiers, upload,
// tous les éditeurs, contrôle d'accès par membre).
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS filehub_coaching_space (
       coaching_id text PRIMARY KEY,
       space_id text NOT NULL,
       owner_id text NOT NULL,
       created_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS filehub_coaching_space_space_idx ON filehub_coaching_space (space_id)`,
  );
  ensured = true;
}

/** Espace dédié d'un coaché, ou null s'il n'a pas encore été créé. */
export async function getCoachingSpaceId(coachingId: string): Promise<string | null> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ space_id: string }[]>(
    `SELECT space_id FROM filehub_coaching_space WHERE coaching_id = $1 LIMIT 1`,
    coachingId,
  );
  return rows[0]?.space_id ?? null;
}

/** Parmi une liste d'ids d'espaces, ceux qui sont des drives de coaché (cachés). */
export async function filterCoachingSpaceIds(spaceIds: string[]): Promise<Set<string>> {
  if (!spaceIds.length) return new Set();
  await ensureTable();
  const placeholders = spaceIds.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await prisma.$queryRawUnsafe<{ space_id: string }[]>(
    `SELECT space_id FROM filehub_coaching_space WHERE space_id IN (${placeholders})`,
    ...spaceIds,
  );
  return new Set(rows.map((r) => r.space_id));
}

/** Ids des espaces-coaché possédés par un utilisateur (pour exclure des quotas). */
export async function ownerCoachingSpaceIds(ownerId: string): Promise<string[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ space_id: string }[]>(
    `SELECT space_id FROM filehub_coaching_space WHERE owner_id = $1`,
    ownerId,
  );
  return rows.map((r) => r.space_id);
}

/**
 * Garantit l'existence de l'espace dédié d'un coaché (idempotent) et y
 * synchronise les membres du suivi. Renvoie l'id de l'espace.
 * ownerId = propriétaire du suivi (le coach) ; il est propriétaire de l'espace.
 */
export async function ensureCoachingSpace(coachingId: string, ownerId: string, name: string): Promise<string> {
  await ensureTable();
  const existing = await getCoachingSpaceId(coachingId);
  if (existing) return existing;

  const space = await prisma.space.create({
    data: {
      name: name?.trim() || "Coaché",
      ownerId,
      members: { create: { userId: ownerId, role: "owner" } },
    },
    select: { id: true },
  });

  // Revendique le lien ; en cas de course, on garde l'espace déjà créé.
  const claimed = await prisma.$executeRawUnsafe(
    `INSERT INTO filehub_coaching_space (coaching_id, space_id, owner_id) VALUES ($1, $2, $3)
       ON CONFLICT (coaching_id) DO NOTHING`,
    coachingId,
    space.id,
    ownerId,
  );
  if (Number(claimed) === 0) {
    await prisma.space.delete({ where: { id: space.id } }).catch(() => {});
    return (await getCoachingSpaceId(coachingId))!;
  }

  // Recopie les membres invités du suivi dans l'espace (mêmes rôles).
  const members = await listCoachingMembers(coachingId);
  await Promise.all(
    members.map((m) =>
      prisma.spaceMember.create({ data: { spaceId: space.id, userId: m.userId, role: m.role } }).catch(() => {}),
    ),
  );

  // Structure de départ prête à l'emploi (dossiers de rangement coaching).
  const STARTER_FOLDERS = ["Séances", "Ressources", "Documents", "Administratif"];
  await Promise.all(
    STARTER_FOLDERS.map((folderName) =>
      prisma.node
        .create({ data: { userId: ownerId, spaceId: space.id, parentId: null, name: folderName, type: "folder" } })
        .catch(() => {}),
    ),
  );

  return space.id;
}

/** Ajoute / met à jour un membre dans l'espace du coaché (miroir du suivi). */
export async function syncSpaceMember(spaceId: string, userId: string, role: "editor" | "viewer"): Promise<void> {
  await prisma.spaceMember
    .upsert({
      where: { spaceId_userId: { spaceId, userId } },
      create: { spaceId, userId, role },
      update: { role },
    })
    .catch(() => {});
}

/** Retire un membre de l'espace du coaché. */
export async function unsyncSpaceMember(spaceId: string, userId: string): Promise<void> {
  await prisma.spaceMember
    .delete({ where: { spaceId_userId: { spaceId, userId } } })
    .catch(() => {});
}
