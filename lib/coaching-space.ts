import { prisma } from "./prisma";
import { listCoachingMembers } from "./coaching-members";

// Chaque coaché possède un « drive » : un espace FileHub dédié et CACHÉ (exclu
// de la liste des espaces et des quotas). Le lien coaché → espace vit dans la
// table filehub_coaching_space, DÉCLARÉE dans le schéma Prisma (modèle
// CoachingSpaceLink) — elle n'est donc plus détruite par le `prisma db push`
// du build (cause racine des espaces en double).
//
// Robustesse : les LECTURES du lien sont STRICTES — une erreur SQL remonte au
// lieu de renvoyer « pas de lien », pour ne jamais créer de doublon sur un
// incident transitoire. Les REPARATIONS (adoption/fusion/suppression) sont
// volontairement CONSERVATRICES : jamais de perte de contenu, jamais la
// capture silencieuse d'un espace légitime (voir reconcileOrphanCoachingSpaces).

/** Espace dédié d'un coaché, ou null s'il n'a pas encore été créé. */
export async function getCoachingSpaceId(coachingId: string): Promise<string | null> {
  const link = await prisma.coachingSpaceLink.findUnique({
    where: { coachingId },
    select: { spaceId: true },
  });
  return link?.spaceId ?? null;
}

/** Parmi une liste d'ids d'espaces, ceux qui sont des drives de coaché (cachés). */
export async function filterCoachingSpaceIds(spaceIds: string[]): Promise<Set<string>> {
  if (!spaceIds.length) return new Set();
  const rows = await prisma.coachingSpaceLink.findMany({
    where: { spaceId: { in: spaceIds } },
    select: { spaceId: true },
  });
  return new Set(rows.map((r) => r.spaceId));
}

/** Ids des espaces-coaché possédés par un utilisateur (pour exclure des quotas). */
export async function ownerCoachingSpaceIds(ownerId: string): Promise<string[]> {
  const rows = await prisma.coachingSpaceLink.findMany({
    where: { ownerId },
    select: { spaceId: true },
  });
  return rows.map((r) => r.spaceId);
}

/** Nom affiché d'un coaché : coachee.name de la fiche, sinon nom du node. */
function coacheeDisplayName(content: string | null, fallback: string): string {
  try {
    const c = JSON.parse(content || "{}") as { coachee?: { name?: unknown } };
    const n = c.coachee?.name;
    return typeof n === "string" && n.trim() ? n.trim() : fallback?.trim() || "Coaché";
  } catch {
    return fallback?.trim() || "Coaché";
  }
}

/** Nom canonique du drive d'un coaché, dérivé du node (source unique de vérité,
 *  indépendante du nom passé par l'appelant). */
async function coachingDisplayName(coachingId: string, fallback: string): Promise<string> {
  const node = await prisma.node
    .findUnique({ where: { id: coachingId }, select: { name: true, content: true } })
    .catch(() => null);
  return coacheeDisplayName(node?.content ?? null, node?.name ?? fallback);
}

/** Recopie les membres invités du suivi comme membres de l'espace (best-effort). */
async function syncMembersToSpace(coachingId: string, spaceId: string): Promise<void> {
  const members = await listCoachingMembers(coachingId).catch(() => []);
  await Promise.all(
    members.map((m) =>
      prisma.spaceMember
        .upsert({
          where: { spaceId_userId: { spaceId, userId: m.userId } },
          create: { spaceId, userId: m.userId, role: m.role },
          update: {},
        })
        .catch(() => {}),
    ),
  );
}

/**
 * Garantit l'existence de l'espace dédié d'un coaché (idempotent). Renvoie l'id
 * de l'espace. ownerId = propriétaire du suivi (le coach).
 *
 * Reconnexion SÛRE uniquement : si le coaché n'a pas de lien, on adopte un
 * espace du même nom possédé par le coach SEULEMENT s'il est UNIQUE ET VIDE
 * (opération non destructive, aucun risque d'avaler un espace légitime rempli).
 * Les doublons remplis sont réunis par reconcileOrphanCoachingSpaces.
 */
export async function ensureCoachingSpace(coachingId: string, ownerId: string, fallbackName: string): Promise<string> {
  const existing = await getCoachingSpaceId(coachingId);
  if (existing) {
    const sp = await prisma.space.findUnique({ where: { id: existing }, select: { id: true } }).catch(() => null);
    if (sp) {
      await removeEmptyStarterFolders(existing);
      return existing;
    }
    // Lien pendouillant (espace supprimé) → on le nettoie et on recrée.
    await prisma.coachingSpaceLink.delete({ where: { coachingId } }).catch(() => {});
  }

  // Nom canonique dérivé du node — cohérent quel que soit l'appelant.
  const name = await coachingDisplayName(coachingId, fallbackName);

  // Reconnexion sûre : adopter l'unique espace homonyme VIDE non relié.
  const sameName = await prisma.space.findMany({
    where: { ownerId, name },
    select: { id: true, _count: { select: { nodes: true } } },
  });
  if (sameName.length) {
    const linkedIds = new Set(
      (
        await prisma.coachingSpaceLink.findMany({
          where: { spaceId: { in: sameName.map((s) => s.id) } },
          select: { spaceId: true },
        })
      ).map((l) => l.spaceId),
    );
    const free = sameName.filter((s) => !linkedIds.has(s.id));
    if (free.length === 1 && free[0]._count.nodes === 0) {
      try {
        await prisma.coachingSpaceLink.create({ data: { coachingId, spaceId: free[0].id, ownerId } });
        await syncMembersToSpace(coachingId, free[0].id);
        return free[0].id;
      } catch {
        const again = await getCoachingSpaceId(coachingId);
        if (again) return again;
        // sinon → création normale
      }
    }
  }

  // Création ATOMIQUE de l'espace + du lien.
  let spaceId: string;
  try {
    spaceId = await prisma.$transaction(async (tx) => {
      const s = await tx.space.create({
        data: { name, ownerId, members: { create: { userId: ownerId, role: "owner" } } },
        select: { id: true },
      });
      await tx.coachingSpaceLink.create({ data: { coachingId, spaceId: s.id, ownerId } });
      return s.id;
    });
  } catch {
    const again = await getCoachingSpaceId(coachingId);
    if (again) return again;
    throw new Error("Impossible de préparer le drive du coaché.");
  }

  await syncMembersToSpace(coachingId, spaceId);
  return spaceId;
}

// Supprime les anciens dossiers de départ restés VIDES à la racine du drive.
const STARTER_FOLDER_NAMES = ["Séances", "Ressources", "Documents", "Administratif"];
async function removeEmptyStarterFolders(spaceId: string): Promise<void> {
  const folders = await prisma.node
    .findMany({
      where: { spaceId, parentId: null, type: "folder", name: { in: STARTER_FOLDER_NAMES } },
      select: { id: true, _count: { select: { children: true } } },
    })
    .catch(() => [] as { id: string; _count: { children: number } }[]);
  await Promise.all(
    folders
      .filter((f) => f._count.children === 0)
      .map((f) => prisma.node.delete({ where: { id: f.id } }).catch(() => {})),
  );
}

/**
 * Supprime le drive d'un coaché (espace + lien). Ordre SÛR : on ne retire le
 * lien QUE si la suppression de l'espace a réussi (ou si l'espace n'existait
 * plus) — sinon un espace non supprimé mais délié réapparaîtrait dans « Espaces ».
 */
export async function deleteCoachingSpace(coachingId: string): Promise<void> {
  const spaceId = await getCoachingSpaceId(coachingId).catch(() => null);
  if (spaceId) {
    const sp = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } }).catch(() => null);
    if (sp) {
      try {
        await prisma.space.delete({ where: { id: spaceId } });
      } catch {
        // Échec transitoire : on GARDE le lien (l'espace reste filtré/caché) et
        // on abandonne — l'appelant pourra retenter.
        return;
      }
    }
  }
  await prisma.coachingSpaceLink.delete({ where: { coachingId } }).catch(() => {});
}

// Supprime un espace UNIQUEMENT s'il est vide au moment du delete (garde
// atomique dans une transaction, insensible au TOCTOU / aux ajouts concurrents).
async function deleteSpaceIfEmpty(spaceId: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      const n = await tx.node.count({ where: { spaceId } });
      if (n > 0) return false;
      await tx.space.delete({ where: { id: spaceId } });
      return true;
    });
  } catch {
    return false;
  }
}

// Fusionne un espace source dans un espace cible : déplace les nodes et les
// membres, puis supprime la source si elle est bien vide. Aucune perte de
// contenu (on DÉPLACE, on ne supprime jamais un espace non vide).
async function mergeSpaceInto(srcId: string, targetId: string): Promise<boolean> {
  if (srcId === targetId) return false;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.node.updateMany({ where: { spaceId: srcId }, data: { spaceId: targetId } });
      const members = await tx.spaceMember.findMany({ where: { spaceId: srcId }, select: { userId: true, role: true } });
      for (const m of members) {
        const already = await tx.spaceMember.findUnique({
          where: { spaceId_userId: { spaceId: targetId, userId: m.userId } },
          select: { id: true },
        });
        if (!already) await tx.spaceMember.create({ data: { spaceId: targetId, userId: m.userId, role: m.role } });
      }
      const remaining = await tx.node.count({ where: { spaceId: srcId } });
      if (remaining === 0) {
        await tx.space.delete({ where: { id: srcId } });
        return true;
      }
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Répare l'état laissé par l'ancien bug (liens effacés à chaque déploiement)
 * SANS jamais risquer un espace légitime :
 *
 *  • On ne traite QUE la « signature du bug » : plusieurs espaces possédés
 *    portant EXACTEMENT le nom d'un coaché (un utilisateur ne crée jamais deux
 *    espaces partagés strictement homonymes). Ces doublons sont réunis dans un
 *    seul drive (contenu + membres déplacés), qui est relié au coaché.
 *  • Un espace homonyme UNIQUE et non relié est laissé INTACT (il pourrait être
 *    un espace partagé légitime) — sauf s'il est VIDE, auquel cas il est
 *    supprimé (aucune donnée).
 *  • Les noms ambigus (2+ coachés du même nom, corbeille comprise) sont ignorés.
 *  • On ne « vole » jamais un espace déjà relié à un AUTRE coaché.
 *  • Suppressions/fusions atomiques et gardées → aucune perte de contenu.
 *
 * Renvoie le nombre d'espaces retirés de la liste « Espaces ».
 */
export async function reconcileOrphanCoachingSpaces(userId: string): Promise<number> {
  const [coachings, spaces, links] = await Promise.all([
    prisma.node.findMany({
      where: { userId, type: "coaching" }, // corbeille COMPRISE (détection d'ambiguïté)
      select: { id: true, name: true, content: true, trashed: true },
    }),
    prisma.space.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, createdAt: true, _count: { select: { nodes: true } } },
    }),
    prisma.coachingSpaceLink.findMany({
      where: { ownerId: userId },
      select: { coachingId: true, spaceId: true },
    }),
  ]);

  const norm = (s: string) => s.trim().toLowerCase();

  // Combien de coachés (corbeille comprise) portent chaque nom → ambiguïté.
  const nameCount = new Map<string, number>();
  for (const c of coachings) {
    const key = norm(coacheeDisplayName(c.content, c.name));
    nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
  }

  const linkByCoaching = new Map(links.map((l) => [l.coachingId, l.spaceId]));

  let removed = 0;
  for (const c of coachings) {
    if (c.trashed) continue; // on ne relie/consolide que pour les coachés actifs
    const key = norm(coacheeDisplayName(c.content, c.name));
    if ((nameCount.get(key) ?? 0) > 1) continue; // ambigu → on ne touche à rien

    // Espaces du coach portant EXACTEMENT ce nom, non reliés à un AUTRE coaché.
    const linkedElsewhere = new Set(links.filter((l) => l.coachingId !== c.id).map((l) => l.spaceId));
    const group = spaces.filter((s) => norm(s.name) === key && !linkedElsewhere.has(s.id));
    if (!group.length) continue;

    const myLink = linkByCoaching.get(c.id);
    const myLinkInGroup = myLink && group.some((s) => s.id === myLink);

    if (group.length >= 2 || myLinkInGroup) {
      // Consolidation : signature du bug (doublons) ou reconnexion du drive relié.
      const target = myLinkInGroup
        ? group.find((s) => s.id === myLink)!
        : [...group].sort((a, b) => b._count.nodes - a._count.nodes || +b.createdAt - +a.createdAt)[0];

      // Assure le lien coaché → cible.
      if (myLink !== target.id) {
        try {
          await prisma.coachingSpaceLink.upsert({
            where: { coachingId: c.id },
            create: { coachingId: c.id, spaceId: target.id, ownerId: userId },
            update: { spaceId: target.id },
          });
          linkByCoaching.set(c.id, target.id);
        } catch {
          continue; // course : on réessaiera au prochain chargement
        }
      }

      for (const src of group) {
        if (src.id === target.id) continue;
        if (await mergeSpaceInto(src.id, target.id)) removed++;
      }
      await removeEmptyStarterFolders(target.id).catch(() => {});
    } else {
      // Un seul espace homonyme, non relié : on n'y touche QUE s'il est vide.
      const only = group[0];
      if (!myLink && only._count.nodes === 0) {
        if (await deleteSpaceIfEmpty(only.id)) removed++;
      }
    }
  }

  // Balayage final : enveloppes VIDES au nom système « Nouveau coaché » (nom par
  // défaut d'un drive fraîchement créé), non reliées et sans fiche homonyme —
  // ce sont des doublons purs de l'ancien bug. Suppression gardée (aucune donnée).
  const linkedNow = new Set([...linkByCoaching.values()]);
  for (const s of spaces) {
    if (norm(s.name) === "nouveau coaché" && s._count.nodes === 0 && !linkedNow.has(s.id) && !nameCount.has("nouveau coaché")) {
      if (await deleteSpaceIfEmpty(s.id)) removed++;
    }
  }
  return removed;
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
