import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { adjustStorage } from "@/lib/nodes";

export const runtime = "nodejs";

// DELETE /api/trash — permanently empty the trash for the current user.
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const trashed = await prisma.node.findMany({
    where: { userId, trashed: true },
    select: { id: true },
  });
  if (trashed.length === 0) return NextResponse.json({ ok: true, freed: 0 });

  const ids = trashed.map((n) => n.id);

  // Include descendants of trashed folders.
  const allIds = new Set(ids);
  let frontier = ids;
  while (frontier.length) {
    const kids = await prisma.node.findMany({
      where: { userId, parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = kids.map((k) => k.id).filter((k) => !allIds.has(k));
    frontier.forEach((k) => allIds.add(k));
  }
  const everything = [...allIds];

  const files = await prisma.node.findMany({
    where: { id: { in: everything }, type: "file" },
    select: { size: true, storageKey: true },
  });
  let freed = 0n;
  for (const f of files) {
    freed += f.size;
    if (f.storageKey) await storage.delete(f.storageKey);
  }
  const versions = await prisma.fileVersion.findMany({
    where: { nodeId: { in: everything } },
    select: { storageKey: true },
  });
  for (const v of versions) if (v.storageKey) await storage.delete(v.storageKey);

  await prisma.node.deleteMany({ where: { id: { in: everything } } });
  if (freed > 0n) await adjustStorage(userId, -freed);

  return NextResponse.json({ ok: true, freed: Number(freed) });
}
