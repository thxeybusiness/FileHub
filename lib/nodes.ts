import { prisma } from "./prisma";

export type SerializedNode = {
  id: string;
  parentId: string | null;
  name: string;
  type: "folder" | "file" | "doc" | "sheet" | "chart" | "draw" | "note" | "diagram" | "board" | "slides" | "project";
  color: string | null;
  mimeType: string | null;
  size: number;
  starred: boolean;
  trashed: boolean;
  createdAt: string;
  updatedAt: string;
  childCount?: number;
};

type NodeRow = {
  id: string;
  parentId: string | null;
  name: string;
  type: string;
  color: string | null;
  mimeType: string | null;
  size: bigint;
  starred: boolean;
  trashed: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { children: number };
};

export function serializeNode(n: NodeRow): SerializedNode {
  return {
    id: n.id,
    parentId: n.parentId,
    name: n.name,
    type: n.type as "folder" | "file" | "doc" | "sheet" | "chart" | "draw" | "note" | "diagram" | "board" | "slides" | "project",
    color: n.color,
    mimeType: n.mimeType,
    size: Number(n.size),
    starred: n.starred,
    trashed: n.trashed,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    childCount: n._count?.children,
  };
}

// Portée d'accès : drive personnel ({ userId }) ou espace commun ({ spaceId }).
export type NodeScope = { userId: string; spaceId?: null } | { spaceId: string };

function scopeWhere(scope: NodeScope): Record<string, unknown> {
  return "spaceId" in scope && scope.spaceId
    ? { spaceId: scope.spaceId }
    : { userId: (scope as { userId: string }).userId, spaceId: null };
}

/** Ordered breadcrumb from root to the given folder (inclusive). */
export async function getBreadcrumb(
  scope: NodeScope,
  folderId: string | null,
): Promise<{ id: string; name: string }[]> {
  const base = scopeWhere(scope);
  const crumbs: { id: string; name: string }[] = [];
  let current = folderId;
  for (let i = 0; i < 100 && current; i++) {
    const node = await prisma.node.findFirst({
      where: { id: current, ...base },
      select: { id: true, name: true, parentId: true },
    });
    if (!node) break;
    crumbs.unshift({ id: node.id, name: node.name });
    current = node.parentId;
  }
  return crumbs;
}

/** True if `folderId` is `candidateAncestorId` or a descendant of it. Used to
 * prevent moving a folder into its own subtree. */
export async function isDescendantOrSelf(
  scope: NodeScope,
  folderId: string,
  candidateAncestorId: string,
): Promise<boolean> {
  const base = scopeWhere(scope);
  let current: string | null = folderId;
  for (let i = 0; i < 100 && current; i++) {
    if (current === candidateAncestorId) return true;
    const node: { parentId: string | null } | null = await prisma.node.findFirst({
      where: { id: current, ...base },
      select: { parentId: true },
    });
    current = node?.parentId ?? null;
  }
  return false;
}

/** Lien de retour d'un éditeur vers son dossier (personnel ou espace). */
export function nodeBackHref(spaceId: string | null, parentId: string | null): string {
  if (spaceId) return parentId ? `/drive/space/${spaceId}/folder/${parentId}` : `/drive/space/${spaceId}`;
  return parentId ? `/drive/folder/${parentId}` : "/drive";
}

/** Adjust a user's used-storage counter by a signed delta (bytes). */
export async function adjustStorage(userId: string, delta: bigint) {
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsed: { increment: delta } },
  });
}
