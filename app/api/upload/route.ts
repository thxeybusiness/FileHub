import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { adjustStorage, serializeNode } from "@/lib/nodes";
import { getSpaceRole } from "@/lib/spaces";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const form = await req.formData();
  const parentIdRaw = form.get("parentId");
  const parentId = parentIdRaw && parentIdRaw !== "null" ? String(parentIdRaw) : null;
  const spaceIdRaw = form.get("spaceId");
  const spaceId = spaceIdRaw && spaceIdRaw !== "null" ? String(spaceIdRaw) : null;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  }

  // Espace commun : membre requis.
  if (spaceId && !(await getSpaceRole(userId, spaceId))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Validate parent folder (dans la même portée).
  if (parentId) {
    const parent = await prisma.node.findFirst({
      where: { id: parentId, type: "folder", ...(spaceId ? { spaceId } : { userId, spaceId: null }) },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  // Quota (uniquement pour le drive personnel — les espaces ne comptent pas).
  if (!spaceId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true, storageLimit: true },
    });
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const incoming = files.reduce((sum, f) => sum + f.size, 0);
    if (user.storageUsed + BigInt(incoming) > user.storageLimit) {
      return NextResponse.json({ error: "Quota de stockage dépassé" }, { status: 413 });
    }
  }

  const created = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { key } = await storage.save(buffer);
    const node = await prisma.node.create({
      data: {
        userId,
        parentId,
        spaceId,
        name: file.name,
        type: "file",
        mimeType: file.type || "application/octet-stream",
        size: BigInt(buffer.length),
        storageKey: key,
      },
    });
    if (!spaceId) await adjustStorage(userId, BigInt(buffer.length));
    created.push(serializeNode(node));
  }

  return NextResponse.json({ nodes: created });
}
