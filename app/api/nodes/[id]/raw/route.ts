import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";

export const runtime = "nodejs";

// HTML, SVG et XML peuvent embarquer des scripts : servis en téléchargement.
const ACTIVE_TYPES = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|application\/xml|text\/xml)/i;

// GET /api/nodes/:id/raw?download=1  — serve file bytes inline or as download.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const node = await prisma.node.findFirst({
    where: { id, type: "file", ...nodeAccessWhere(userId, memberIds) },
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

  const mime = node.mimeType || "application/octet-stream";
  // Types « actifs » toujours téléchargés, jamais rendus en ligne.
  const download = ACTIVE_TYPES.test(mime) || new URL(req.url).searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";
  const filename = encodeURIComponent(node.name);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
