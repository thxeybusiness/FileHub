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
  // Garantit l'unicité par coaché même si la PK n'était pas reconnue.
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS filehub_coaching_space_coaching_uidx ON filehub_coaching_space (coaching_id)`,
  ).catch(() => {});
  ensured = true;
}

/** Espace dédié d'un coaché, ou null s'il n'a pas encore été créé. */
export async function getCoachingSpaceId(coachingId: string): Promise<string | null> {
  try {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe<{ space_id: string }[]>(
      `SELECT space_id FROM filehub_coaching_space WHERE coaching_id = $1 LIMIT 1`,
      coachingId,
    );
    return rows[0]?.space_id ?? null;
  } catch {
    return null;
  }
}

/** Parmi une liste d'ids d'espaces, ceux qui sont des drives de coaché (cachés). */
export async function filterCoachingSpaceIds(spaceIds: string[]): Promise<Set<string>> {
  if (!spaceIds.length) return new Set();
  try {
    await ensureTable();
    const placeholders = spaceIds.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await prisma.$queryRawUnsafe<{ space_id: string }[]>(
      `SELECT space_id FROM filehub_coaching_space WHERE space_id IN (${placeholders})`,
      ...spaceIds,
    );
    return new Set(rows.map((r) => r.space_id));
  } catch {
    return new Set();
  }
}

/** Ids des espaces-coaché possédés par un utilisateur (pour exclure des quotas). */
export async function ownerCoachingSpaceIds(ownerId: string): Promise<string[]> {
  try {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe<{ space_id: string }[]>(
      `SELECT space_id FROM filehub_coaching_space WHERE owner_id = $1`,
      ownerId,
    );
    return rows.map((r) => r.space_id);
  } catch {
    return [];
  }
}

/**
 * Garantit l'existence de l'espace dédié d'un coaché (idempotent) et y
 * synchronise les membres du suivi. Renvoie l'id de l'espace.
 * ownerId = propriétaire du suivi (le coach) ; il est propriétaire de l'espace.
 */
export async function ensureCoachingSpace(coachingId: string, ownerId: string, name: string): Promise<string> {
  await ensureTable();

  const existing = await getCoachingSpaceId(coachingId);
  if (existing) {
    // Le lien existe : on vérifie que l'espace n'a pas été supprimé entre-temps.
    const sp = await prisma.space.findUnique({ where: { id: existing }, select: { id: true } }).catch(() => null);
    if (sp) return existing;
    // Lien orphelin (espace supprimé) → on le nettoie et on recrée.
    await prisma.$executeRawUnsafe(`DELETE FROM filehub_coaching_space WHERE coaching_id = $1`, coachingId).catch(() => {});
  }

  // Auto-réparation : récupère un espace orphelin laissé par l'ancien bug
  // (même nom, appartenant au coach, vide, sans lien) au lieu d'en créer un
  // doublon — ce qui nettoie au passage les espaces parasites déjà visibles.
  const cleanName = name?.trim() || "Coaché";
  const orphan = await prisma.space
    .findFirst({
      where: { ownerId, name: cleanName, nodes: { none: {} }, members: { every: { userId: ownerId } } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);
  if (orphan) {
    const mapped = await prisma.$queryRawUnsafe<{ x: number }[]>(
      `SELECT 1 AS x FROM filehub_coaching_space WHERE space_id = $1 LIMIT 1`,
      orphan.id,
    ).catch(() => [{ x: 1 }] as { x: number }[]);
    if (!mapped.length) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO filehub_coaching_space (coaching_id, space_id, owner_id) VALUES ($1, $2, $3)`,
          coachingId,
          orphan.id,
          ownerId,
        );
        await addStarterFolders(orphan.id, ownerId);
        return orphan.id;
      } catch {
        const again = await getCoachingSpaceId(coachingId);
        if (again) return again;
        // sinon on retombe sur la création normale ci-dessous
      }
    }
  }

  // Création ATOMIQUE de l'espace + du lien : si l'insert du lien échoue, la
  // transaction annule tout → jamais d'espace orphelin visible dans FileHub.
  // (Pas d'ON CONFLICT : on gère la course en catch.)
  let spaceId: string;
  try {
    spaceId = await prisma.$transaction(async (tx) => {
      const s = await tx.space.create({
        data: { name: name?.trim() || "Coaché", ownerId, members: { create: { userId: ownerId, role: "owner" } } },
        select: { id: true },
      });
      await tx.$executeRawUnsafe(
        `INSERT INTO filehub_coaching_space (coaching_id, space_id, owner_id) VALUES ($1, $2, $3)`,
        coachingId,
        s.id,
        ownerId,
      );
      return s.id;
    });
  } catch {
    // Course concurrente (lien déjà écrit) ou erreur transitoire : on réutilise
    // le lien existant sans laisser d'espace orphelin.
    const again = await getCoachingSpaceId(coachingId);
    if (again) return again;
    throw new Error("Impossible de préparer le drive du coaché.");
  }

  // Recopie les membres invités du suivi (mêmes rôles) — best-effort.
  const members = await listCoachingMembers(coachingId).catch(() => []);
  await Promise.all(
    members.map((m) =>
      prisma.spaceMember.create({ data: { spaceId, userId: m.userId, role: m.role } }).catch(() => {}),
    ),
  );

  await addStarterFolders(spaceId, ownerId);
  return spaceId;
}

// Structure de départ prête à l'emploi (dossiers de rangement coaching).
async function addStarterFolders(spaceId: string, ownerId: string): Promise<void> {
  const STARTER_FOLDERS = ["Séances", "Ressources", "Documents", "Administratif"];
  await Promise.all(
    STARTER_FOLDERS.map((folderName) =>
      prisma.node
        .create({ data: { userId: ownerId, spaceId, parentId: null, name: folderName, type: "folder" } })
        .catch(() => {}),
    ),
  );
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
