import { prisma } from "./prisma";

// Ids des espaces dont l'utilisateur est membre.
export async function getMemberSpaceIds(userId: string): Promise<string[]> {
  const rows = await prisma.spaceMember.findMany({
    where: { userId },
    select: { spaceId: true },
  });
  return rows.map((r) => r.spaceId);
}

// Clause Prisma : nœud accessible = personnel (spaceId null + propriétaire) OU
// dans un espace dont l'utilisateur est membre.
export function nodeAccessWhere(userId: string, memberSpaceIds: string[]) {
  return {
    OR: [
      { spaceId: null, userId },
      { spaceId: { in: memberSpaceIds } },
    ],
  };
}

// Rôle de l'utilisateur dans un espace, ou null s'il n'est pas membre.
export async function getSpaceRole(
  userId: string,
  spaceId: string,
): Promise<string | null> {
  const m = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

// Un rôle qui autorise l'écriture (créer / modifier / supprimer).
export function canEditRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

// L'utilisateur peut-il écrire dans cet espace ? (éditeur/admin/owner)
export async function canWriteSpace(userId: string, spaceId: string): Promise<boolean> {
  return canEditRole(await getSpaceRole(userId, spaceId));
}

// Autorise l'écriture sur un nœud : espace -> rôle éditeur requis ;
// drive personnel -> propriétaire.
export async function canWriteNode(
  userId: string,
  node: { spaceId: string | null; userId: string },
): Promise<boolean> {
  if (node.spaceId) return canWriteSpace(userId, node.spaceId);
  return node.userId === userId;
}

// Génère un username unique à partir d'un nom / email.
export async function generateUsername(base: string): Promise<string> {
  const slug =
    base
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "user";
  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? slug : `${slug}${i + 1}`;
    const exists = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${slug}${Math.floor(performance.now())}`;
}
