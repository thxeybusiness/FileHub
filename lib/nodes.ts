import { prisma } from "./prisma";

export type SerializedNode = {
  id: string;
  parentId: string | null;
  name: string;
  type: "folder" | "file";
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
    type: n.type as "folder" | "file",
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

/** Ordered breadcrumb from root to the given folder (inclusive). */
export async function getBreadcrumb(
  userId: string,
  folderId: string | null,
): Promise<{ id: string; name: string }[]> {
  const crumbs: { id: string; name: string }[] = [];
  let current = folderId;
  // Guard against cycles / runaway depth.
  for (let i = 0; i < 100 && current; i++) {
    const node = await prisma.node.findFirst({
      where: { id: current, userId },
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
  userId: string,
  folderId: string,
  candidateAncestorId: string,
): Promise<boolean> {
  let current: string | null = folderId;
  for (let i = 0; i < 100 && current; i++) {
    if (current === candidateAncestorId) return true;
    const node: { parentId: string | null } | null = await prisma.node.findFirst({
      where: { id: current, userId },
      select: { parentId: true },
    });
    current = node?.parentId ?? null;
  }
  return false;
}

/** Adjust a user's used-storage counter by a signed delta (bytes). */
export async function adjustStorage(userId: string, delta: bigint) {
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsed: { increment: delta } },
  });
}
