import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";

export const runtime = "nodejs";

// Présence considérée active si vue il y a moins de 12 s.
const STALE_MS = 12_000;

const bodySchema = z.object({ editing: z.boolean().optional(), leave: z.boolean().optional() });

// Couleur stable dérivée de l'identifiant utilisateur (teinte HSL).
function colorFor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) % 360;
  return `hsl(${h} 72% 58%)`;
}

// POST /api/collab/:id — heartbeat de présence + version du document.
// Renvoie les autres collaborateurs actifs et l'horodatage de dernière
// modification (pour que le client tire les changements distants).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const node = await prisma.node.findFirst({
    where: { id, ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, spaceId: true, updatedAt: true },
  });
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // La collaboration ne s'active que dans les espaces communs.
  if (!node.spaceId) return NextResponse.json({ updatedAt: node.updatedAt.toISOString(), peers: [] });

  const body = bodySchema.safeParse(await req.json().catch(() => ({}))).data ?? {};

  if (body.leave) {
    await prisma.presence.deleteMany({ where: { nodeId: id, userId } }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, email: true } });
  const myName = me?.name || me?.username || me?.email?.split("@")[0] || "Utilisateur";

  await prisma.presence.upsert({
    where: { nodeId_userId: { nodeId: id, userId } },
    create: { nodeId: id, userId, name: myName, color: colorFor(userId), editing: !!body.editing },
    update: { name: myName, color: colorFor(userId), editing: !!body.editing },
  });

  const cutoff = new Date(Date.now() - STALE_MS);
  // Purge des présences obsolètes (au mieux, sans bloquer la réponse).
  await prisma.presence.deleteMany({ where: { nodeId: id, updatedAt: { lt: cutoff } } }).catch(() => {});

  const peers = await prisma.presence.findMany({
    where: { nodeId: id, userId: { not: userId }, updatedAt: { gte: cutoff } },
    select: { userId: true, name: true, color: true, editing: true },
    orderBy: { updatedAt: "asc" },
  });

  return NextResponse.json({ updatedAt: node.updatedAt.toISOString(), peers });
}
