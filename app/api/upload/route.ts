import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { adjustStorage, serializeNode } from "@/lib/nodes";
import { getSpaceRole, canEditRole } from "@/lib/spaces";
import { isFounder, planStorage } from "@/lib/plans";
import { logActivity, actorNameFor } from "@/lib/activity";

export const runtime = "nodejs";

// Bornes anti-abus (le corps est aussi limité au niveau plateforme).
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 Mo par fichier
const MAX_REQUEST_SIZE = 200 * 1024 * 1024; // 200 Mo par requête

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

  // Bornes de taille (par fichier et pour la requête) — anti-abus / DoS.
  const incoming = files.reduce((sum, f) => sum + f.size, 0);
  if (files.some((f) => f.size > MAX_FILE_SIZE)) {
    return NextResponse.json({ error: "Fichier trop volumineux (100 Mo maximum)." }, { status: 413 });
  }
  if (incoming > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "Import trop volumineux (200 Mo maximum par envoi)." }, { status: 413 });
  }

  // Espace commun : rôle éditeur (ou plus) requis pour importer.
  if (spaceId && !canEditRole(await getSpaceRole(userId, spaceId))) {
    return NextResponse.json({ error: "Vous êtes en lecture seule sur cet espace" }, { status: 403 });
  }

  // Validate parent folder (dans la même portée).
  if (parentId) {
    const parent = await prisma.node.findFirst({
      where: { id: parentId, type: "folder", ...(spaceId ? { spaceId } : { userId, spaceId: null }) },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  if (!spaceId) {
    // Drive personnel : quota du plan de l'utilisateur (Fondateur illimité).
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, plan: true, storageUsed: true },
    });
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (!isFounder(user.email)) {
      const limit = BigInt(planStorage(user.plan));
      if (user.storageUsed + BigInt(incoming) > limit) {
        return NextResponse.json({ error: "Quota de stockage dépassé" }, { status: 413 });
      }
    }
  } else {
    // Espace commun : le stockage de l'espace est borné par le plan de SON
    // propriétaire (sinon un compte gratuit contournerait son quota en créant
    // un espace et en y important sans limite).
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { owner: { select: { email: true, plan: true } } },
    });
    if (space && !isFounder(space.owner.email)) {
      const limit = BigInt(planStorage(space.owner.plan));
      const used = await prisma.node.aggregate({ where: { spaceId }, _sum: { size: true } });
      const current = used._sum.size ?? BigInt(0);
      if (current + BigInt(incoming) > limit) {
        return NextResponse.json({ error: "Quota de stockage de l'espace dépassé" }, { status: 413 });
      }
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

  if (created.length) {
    const actorName = await actorNameFor(userId);
    for (const n of created) {
      await logActivity({
        userId,
        actorName,
        action: "uploaded",
        targetName: n.name,
        spaceId,
        nodeId: n.id,
      });
    }
  }

  return NextResponse.json({ nodes: created });
}
