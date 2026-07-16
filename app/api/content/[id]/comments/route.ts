import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";
import { addComment, listComments, deleteComment } from "@/lib/comments";
import { notify } from "@/lib/notifications";

export const runtime = "nodejs";

const TYPES = ["note", "diagram", "board", "slides", "project", "coaching"];

async function loadNode(userId: string, id: string) {
  const memberIds = await getMemberSpaceIds(userId);
  return prisma.node.findFirst({
    where: { id, type: { in: TYPES }, ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, spaceId: true },
  });
}

// GET /api/content/:id/comments — liste des commentaires.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const node = await loadNode(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ comments: await listComments(id), me: userId });
}

const addSchema = z.object({ body: z.string().trim().min(1).max(4000) });

// POST /api/content/:id/comments — ajoute un commentaire (+ notifie les mentions @).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const node = await loadNode(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Commentaire vide ou trop long." }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, email: true } });
  const authorName = me?.name || (me?.username ? `@${me.username}` : me?.email?.split("@")[0]) || "Anonyme";
  const comment = await addComment(id, userId, authorName, parsed.data.body);

  // Mentions @pseudo → notifications aux membres concernés.
  const usernames = [...new Set((parsed.data.body.match(/@([a-zA-Z0-9_-]{3,30})/g) ?? []).map((m) => m.slice(1)))];
  if (usernames.length) {
    const mentioned = await prisma.user.findMany({
      where: { username: { in: usernames }, id: { not: userId } },
      select: { id: true, username: true },
    });
    let allowed = mentioned;
    if (node.spaceId) {
      const members = await prisma.spaceMember.findMany({
        where: { spaceId: node.spaceId, userId: { in: mentioned.map((u) => u.id) } },
        select: { userId: true },
      });
      const memberSet = new Set(members.map((m) => m.userId));
      allowed = mentioned.filter((u) => memberSet.has(u.id));
    }
    await Promise.all(
      allowed.map((u) =>
        notify(u.id, {
          type: "mention",
          title: `${authorName} vous a mentionné`,
          body: `Dans « ${node.name} » : ${parsed.data.body.slice(0, 120)}`,
          spaceId: node.spaceId ?? undefined,
        }),
      ),
    );
  }

  return NextResponse.json({ comment });
}

const delSchema = z.object({ commentId: z.string().min(1) });

// DELETE /api/content/:id/comments — supprime son propre commentaire.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const node = await loadNode(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = delSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const ok = await deleteComment(id, parsed.data.commentId, userId);
  if (!ok) return NextResponse.json({ error: "Commentaire introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
