import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

// GET /api/nodes/:id/raw?download=1  — serve file bytes inline or as download.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const node = await prisma.node.findFirst({
    where: { id, userId, type: "file" },
    select: { name: true, mimeType: true, storageKey: true, size: true },
  });
  if (!node || !node.storageKey) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await storage.read(node.storageKey);
  } catch {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 404 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";
  const filename = encodeURIComponent(node.name);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": node.mimeType || "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
