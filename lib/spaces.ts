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
