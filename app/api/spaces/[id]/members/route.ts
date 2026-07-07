import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSpaceRole } from "@/lib/spaces";
import { notify, notifyMany, displayName } from "@/lib/notifications";
import { logActivity, actorNameFor } from "@/lib/activity";

export const runtime = "nodejs";

const inviteSchema = z.object({
  identifier: z.string().trim().min(1).max(255), // username ou email
  role: z.enum(["editor", "viewer"]).optional(),
});

// POST /api/spaces/:id/members — inviter par nom d'utilisateur ou email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  if (!(await getSpaceRole(userId, id))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const raw = parsed.data.identifier.replace(/^@/, "");
  const invited = await prisma.user.findFirst({
    where: { OR: [{ username: raw }, { email: raw.toLowerCase() }] },
    select: { id: true, name: true, username: true, email: true },
  });
  if (!invited) {
    return NextResponse.json(
      { error: "Aucun utilisateur avec ce nom d'utilisateur ou cet email." },
      { status: 404 },
    );
  }

  const existing = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId: id, userId: invited.id } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Cette personne est déjà membre." }, { status: 409 });
  }

  // Membres existants (avant ajout) + infos pour les notifications.
  const [space, actor, currentMembers] = await Promise.all([
    prisma.space.findUnique({ where: { id }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, email: true } }),
    prisma.spaceMember.findMany({ where: { spaceId: id }, select: { userId: true } }),
  ]);

  const role = parsed.data.role ?? "editor";
  await prisma.spaceMember.create({
    data: { spaceId: id, userId: invited.id, role },
  });

  // ── Notifications ──
  const spaceName = space?.name ?? "l'espace";
  const actorName = actor ? displayName(actor) : "Quelqu'un";
  const invitedName = displayName(invited);

  await logActivity({
    userId,
    actorName,
    action: "member_added",
    targetName: invitedName,
    spaceId: id,
  });

  // À l'invité : il a rejoint l'espace.
  await notify(invited.id, {
    type: "space_joined",
    title: `Vous avez rejoint « ${spaceName} »`,
    body: `Invité par ${actorName}`,
    spaceId: id,
    actorName,
  });
  // À l'invitant : confirmation « bien enregistré ».
  await notify(userId, {
    type: "member_joined",
    title: `${invitedName} a rejoint « ${spaceName} »`,
    body: "Invitation enregistrée",
    spaceId: id,
    actorName: invitedName,
  });
  // Aux autres membres existants.
  await notifyMany(
    currentMembers.map((e) => e.userId).filter((uid) => uid !== userId && uid !== invited.id),
    {
      type: "member_joined",
      title: `${invitedName} a rejoint « ${spaceName} »`,
      body: `Invité par ${actorName}`,
      spaceId: id,
      actorName: invitedName,
    },
  );

  return NextResponse.json({
    member: {
      id: invited.id,
      name: invited.name,
      username: invited.username,
      email: invited.email,
      role,
      isOwner: false,
      isMe: false,
    },
  });
}

const roleSchema = z.object({
  userId: z.string(),
  role: z.enum(["editor", "viewer"]),
});

// PATCH /api/spaces/:id/members — change le rôle d'un membre (propriétaire)
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
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  if (parsed.data.userId === userId) {
    return NextResponse.json({ error: "Impossible de changer votre propre rôle." }, { status: 400 });
  }

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId: id, userId: parsed.data.userId } },
    select: { role: true, user: { select: { name: true, username: true, email: true } } },
  });
  if (!member || member.role === "owner") {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }

  await prisma.spaceMember.update({
    where: { spaceId_userId: { spaceId: id, userId: parsed.data.userId } },
    data: { role: parsed.data.role },
  });

  await logActivity({
    userId,
    actorName: await actorNameFor(userId),
    action: "role_changed",
    targetName: `${displayName(member.user)} → ${parsed.data.role === "viewer" ? "Lecteur" : "Éditeur"}`,
    spaceId: id,
  });
  return NextResponse.json({ ok: true });
}

const removeSchema = z.object({ userId: z.string() });

// DELETE /api/spaces/:id/members — retirer un membre (propriétaire)
export async function DELETE(
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
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  if (parsed.data.userId === userId) {
    return NextResponse.json({ error: "Le propriétaire ne peut pas se retirer." }, { status: 400 });
  }

  const removed = await prisma.spaceMember
    .findUnique({
      where: { spaceId_userId: { spaceId: id, userId: parsed.data.userId } },
      select: { user: { select: { name: true, username: true, email: true } } },
    })
    .catch(() => null);

  await prisma.spaceMember
    .delete({ where: { spaceId_userId: { spaceId: id, userId: parsed.data.userId } } })
    .catch(() => {});

  if (removed) {
    await logActivity({
      userId,
      actorName: await actorNameFor(userId),
      action: "member_removed",
      targetName: displayName(removed.user),
      spaceId: id,
    });
  }
  return NextResponse.json({ ok: true });
}
