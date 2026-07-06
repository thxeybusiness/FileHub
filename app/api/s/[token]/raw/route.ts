import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

// Public file serving via a share token. For a folder share, `child` must be a
// descendant of the shared folder (validated by walking up the tree).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const share = await prisma.share.findUnique({ where: { token } });
  if (!share) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: "Lien expiré" }, { status: 410 });
  }

  const childId = new URL(req.url).searchParams.get("child");
  const targetId = childId || share.nodeId;

  const node = await prisma.node.findFirst({
    where: { id: targetId, userId: share.ownerId, type: "file", trashed: false },
    select: { name: true, mimeType: true, storageKey: true, parentId: true },
  });
  if (!node || !node.storageKey) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  // If a child was requested, ensure it lives inside the shared subtree.
  if (childId && childId !== share.nodeId) {
    let current: string | null = node.parentId;
    let inside = false;
    for (let i = 0; i < 100 && current; i++) {
      if (current === share.nodeId) {
        inside = true;
        break;
      }
      const parent: { parentId: string | null } | null = await prisma.node.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      current = parent?.parentId ?? null;
    }
    if (!inside) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await storage.read(node.storageKey);
  } catch {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 404 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const filename = encodeURIComponent(node.name);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": node.mimeType || "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
