import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isUnlocked, unlockCookieName } from "@/lib/share";

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

  // Lien protégé : exige le cookie de déverrouillage.
  if (share.passwordHash) {
    const store = await cookies();
    const val = store.get(unlockCookieName(token))?.value;
    if (!isUnlocked(val, token, share.passwordHash)) {
      return NextResponse.json({ error: "Mot de passe requis" }, { status: 401 });
    }
  }

  const wantsDownload = new URL(req.url).searchParams.get("download") === "1";
  // Téléchargement interdit si le lien est en lecture seule.
  if (wantsDownload && !share.allowDownload) {
    return NextResponse.json({ error: "Téléchargement désactivé" }, { status: 403 });
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

  const mime = node.mimeType || "application/octet-stream";
  // Types « actifs » (HTML/SVG/XML) toujours téléchargés : un fichier partagé
  // ne doit jamais s'exécuter sur l'origine filehub.business.
  const forceDownload = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|application\/xml|text\/xml)/i.test(mime);
  // Le téléchargement forcé reste soumis à l'autorisation de téléchargement du lien.
  const asAttachment = forceDownload || wantsDownload;
  const filename = encodeURIComponent(node.name);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
