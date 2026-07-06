import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { adjustStorage, isDescendantOrSelf, serializeNode } from "@/lib/nodes";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  parentId: z.string().nullable().optional(),
  starred: z.boolean().optional(),
  trashed: z.boolean().optional(),
  color: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const node = await prisma.node.findFirst({ where: { id, userId } });
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const data: Record<string, unknown> = {};
  const { name, parentId, starred, trashed, color } = parsed.data;

  if (name !== undefined) data.name = name;
  if (starred !== undefined) data.starred = starred;
  if (color !== undefined) data.color = color;
  if (trashed !== undefined) {
    data.trashed = trashed;
    data.trashedAt = trashed ? new Date() : null;
  }

  if (parentId !== undefined) {
    if (parentId) {
      const target = await prisma.node.findFirst({
        where: { id: parentId, userId, type: "folder" },
        select: { id: true },
      });
      if (!target) return NextResponse.json({ error: "Cible introuvable" }, { status: 404 });
      // Prevent moving a folder into itself or its own descendants.
      if (node.type === "folder" && (await isDescendantOrSelf(userId, parentId, node.id))) {
        return NextResponse.json(
          { error: "Impossible de déplacer un dossier dans lui-même" },
          { status: 400 },
        );
      }
    }
    data.parentId = parentId;
  }

  const updated = await prisma.node.update({
    where: { id },
    data,
    include: { _count: { select: { children: true } } },
  });
  return NextResponse.json({ node: serializeNode(updated) });
}

// Permanently delete a node and its whole subtree, freeing storage.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const root = await prisma.node.findFirst({ where: { id, userId }, select: { id: true } });
  if (!root) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Collect the entire subtree (BFS).
  const toDelete: string[] = [];
  let frontier = [id];
  while (frontier.length) {
    toDelete.push(...frontier);
    const kids = await prisma.node.findMany({
      where: { userId, parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = kids.map((k) => k.id);
  }

  // Free storage: sum sizes + remove blobs & versions.
  const files = await prisma.node.findMany({
    where: { id: { in: toDelete }, type: "file" },
    select: { size: true, storageKey: true },
  });
  const versions = await prisma.fileVersion.findMany({
    where: { nodeId: { in: toDelete } },
    select: { storageKey: true },
  });
  let freed = 0n;
  for (const f of files) {
    freed += f.size;
    if (f.storageKey) await storage.delete(f.storageKey);
  }
  for (const v of versions) {
    if (v.storageKey) await storage.delete(v.storageKey);
  }

  // Deleting the root cascades children in DB, but we delete the collected set
  // explicitly to be safe across providers.
  await prisma.node.deleteMany({ where: { id: { in: toDelete } } });
  if (freed > 0n) await adjustStorage(userId, -freed);

  return NextResponse.json({ ok: true });
}
