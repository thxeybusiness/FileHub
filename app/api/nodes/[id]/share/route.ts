import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId, randomToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashSharePassword } from "@/lib/share";
import { logActivity, actorNameFor } from "@/lib/activity";

export const runtime = "nodejs";

type ShareView = {
  token: string;
  expiresAt: string | null;
  allowDownload: boolean;
  hasPassword: boolean;
  views: number;
  lastViewedAt: string | null;
};

function view(s: {
  token: string;
  expiresAt: Date | null;
  allowDownload: boolean;
  passwordHash: string | null;
  views?: number;
  lastViewedAt?: Date | null;
}): ShareView {
  return {
    token: s.token,
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
    allowDownload: s.allowDownload,
    hasPassword: !!s.passwordHash,
    views: s.views ?? 0,
    lastViewedAt: s.lastViewedAt ? s.lastViewedAt.toISOString() : null,
  };
}

async function ownNode(id: string, userId: string) {
  return prisma.node.findFirst({ where: { id, userId }, select: { id: true, name: true, spaceId: true } });
}

// GET — réglages du lien existant (ou null).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  if (!(await ownNode(id, userId))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const share = await prisma.share.findFirst({ where: { nodeId: id, ownerId: userId } });
  return NextResponse.json({ share: share ? view(share) : null });
}

// POST — crée le lien s'il n'existe pas, renvoie ses réglages.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const node = await ownNode(id, userId);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let share = await prisma.share.findFirst({ where: { nodeId: id, ownerId: userId } });
  if (!share) {
    share = await prisma.share.create({
      data: { token: randomToken(12), nodeId: id, ownerId: userId },
    });
    await logActivity({
      userId,
      actorName: await actorNameFor(userId),
      action: "shared",
      targetName: node.name,
      spaceId: node.spaceId,
      nodeId: node.id,
    });
  }
  return NextResponse.json({ share: view(share) });
}

const patchSchema = z.object({
  // Durée avant expiration en jours (null = jamais).
  expiresInDays: z.number().int().positive().max(3650).nullable().optional(),
  // Mot de passe : "" ou null pour retirer, chaîne pour définir.
  password: z.string().max(200).nullable().optional(),
  allowDownload: z.boolean().optional(),
});

// PATCH — met à jour les réglages (expiration, mot de passe, téléchargement).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  if (!(await ownNode(id, userId))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const share = await prisma.share.findFirst({ where: { nodeId: id, ownerId: userId } });
  if (!share) return NextResponse.json({ error: "Aucun lien" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.expiresInDays !== undefined) {
    data.expiresAt =
      parsed.data.expiresInDays === null
        ? null
        : new Date(Date.now() + parsed.data.expiresInDays * 86400_000);
  }
  if (parsed.data.password !== undefined) {
    data.passwordHash =
      parsed.data.password && parsed.data.password.length > 0
        ? await hashSharePassword(parsed.data.password)
        : null;
  }
  if (parsed.data.allowDownload !== undefined) data.allowDownload = parsed.data.allowDownload;

  const updated = await prisma.share.update({ where: { id: share.id }, data });
  return NextResponse.json({ share: view(updated) });
}

// DELETE — révoque le lien.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const node = await ownNode(id, userId);
  const { count } = await prisma.share.deleteMany({ where: { nodeId: id, ownerId: userId } });
  if (count > 0 && node) {
    await logActivity({
      userId,
      actorName: await actorNameFor(userId),
      action: "unshared",
      targetName: node.name,
      spaceId: node.spaceId,
      nodeId: node.id,
    });
  }
  return NextResponse.json({ ok: true });
}
