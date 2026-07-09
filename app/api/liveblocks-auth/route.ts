import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";

export const runtime = "nodejs";

// Couleur stable dérivée de l'identifiant (identique à /api/collab).
function colorFor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) % 360;
  return `hsl(${h} 72% 58%)`;
}

// Authentifie une session Liveblocks pour une room « filehub:node:<id> ».
// N'autorise que les membres de l'espace du document (les documents
// personnels ne sont pas collaboratifs).
export async function POST(req: NextRequest) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Temps réel non configuré" }, { status: 501 });

  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { room } = (await req.json().catch(() => ({}))) as { room?: string };
  const m = typeof room === "string" ? room.match(/^filehub:node:(.+)$/) : null;
  if (!m) return NextResponse.json({ error: "Room invalide" }, { status: 400 });
  const nodeId = m[1];

  const memberIds = await getMemberSpaceIds(userId);
  const node = await prisma.node.findFirst({
    where: { id: nodeId, spaceId: { not: null }, ...nodeAccessWhere(userId, memberIds) },
    select: { id: true },
  });
  if (!node) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, email: true } });
  const name = me?.name || me?.username || me?.email?.split("@")[0] || "Utilisateur";

  const lb = new Liveblocks({ secret });
  const session = lb.prepareSession(userId, { userInfo: { name, color: colorFor(userId) } });
  session.allow(room!, session.FULL_ACCESS);
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
