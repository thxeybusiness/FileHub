import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { adjustStorage, serializeNode } from "@/lib/nodes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const form = await req.formData();
  const parentIdRaw = form.get("parentId");
  const parentId = parentIdRaw && parentIdRaw !== "null" ? String(parentIdRaw) : null;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  }

  // Validate parent folder ownership.
  if (parentId) {
    const parent = await prisma.node.findFirst({
      where: { id: parentId, userId, type: "folder" },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  // Quota check.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageUsed: true, storageLimit: true },
  });
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const incoming = files.reduce((sum, f) => sum + f.size, 0);
  if (user.storageUsed + BigInt(incoming) > user.storageLimit) {
    return NextResponse.json(
      { error: "Quota de stockage dépassé" },
      { status: 413 },
    );
  }

  const created = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name);
    const { key } = await storage.save(buffer, ext);
    const node = await prisma.node.create({
      data: {
        userId,
        parentId,
        name: file.name,
        type: "file",
        mimeType: file.type || "application/octet-stream",
        size: BigInt(buffer.length),
        storageKey: key,
      },
    });
    await adjustStorage(userId, BigInt(buffer.length));
    created.push(serializeNode(node));
  }

  return NextResponse.json({ nodes: created });
}
