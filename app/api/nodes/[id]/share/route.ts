import { NextRequest, NextResponse } from "next/server";
import { getUserId, randomToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// POST — create (or return existing) a public share link for a node.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const node = await prisma.node.findFirst({ where: { id, userId }, select: { id: true } });
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let share = await prisma.share.findFirst({ where: { nodeId: id, ownerId: userId } });
  if (!share) {
    share = await prisma.share.create({
      data: { token: randomToken(12), nodeId: id, ownerId: userId },
    });
  }

  return NextResponse.json({ token: share.token });
}

// DELETE — revoke sharing.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  await prisma.share.deleteMany({ where: { nodeId: id, ownerId: userId } });
  return NextResponse.json({ ok: true });
}
