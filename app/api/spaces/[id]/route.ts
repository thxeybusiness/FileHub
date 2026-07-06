import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSpaceRole } from "@/lib/spaces";

export const runtime = "nodejs";

// GET /api/spaces/:id — détails + membres
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const role = await getSpaceRole(userId, id);
  if (!role) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const space = await prisma.space.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ownerId: true,
      members: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          user: { select: { id: true, name: true, username: true, email: true } },
        },
      },
    },
  });
  if (!space) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: space.id,
    name: space.name,
    myRole: role,
    isOwner: space.ownerId === userId,
    members: space.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      username: m.user.username,
      email: m.user.email,
      role: m.role,
      isOwner: m.user.id === space.ownerId,
      isMe: m.user.id === userId,
    })),
  });
}

const patchSchema = z.object({ name: z.string().trim().min(1).max(80) });

// PATCH /api/spaces/:id — renommer (propriétaire)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  if ((await getSpaceRole(userId, id)) !== "owner") {
    return NextResponse.json({ error: "Propriétaire uniquement" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  await prisma.space.update({ where: { id }, data: { name: parsed.data.name } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/spaces/:id — supprimer l'espace (propriétaire) ou le quitter (membre)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const role = await getSpaceRole(userId, id);
  if (!role) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  if (role === "owner") {
    await prisma.space.delete({ where: { id } });
  } else {
    await prisma.spaceMember.delete({ where: { spaceId_userId: { spaceId: id, userId } } });
  }
  return NextResponse.json({ ok: true });
}
