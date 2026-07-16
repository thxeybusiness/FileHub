import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify, displayName } from "@/lib/notifications";
import {
  getCoachingRole, listCoachingMembers, addCoachingMember,
  setCoachingMemberRole, removeCoachingMember, type CoachingRole,
} from "@/lib/coaching-members";

export const runtime = "nodejs";

type MemberInfo = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  role: string;
  isOwner: boolean;
  isMe: boolean;
};

async function loadNode(id: string) {
  return prisma.node.findFirst({
    where: { id, type: "coaching" },
    select: { id: true, userId: true, name: true },
  });
}

async function buildMembers(
  ownerId: string,
  meId: string,
  memberRows: { userId: string; role: CoachingRole }[],
): Promise<MemberInfo[]> {
  const ids = [ownerId, ...memberRows.map((m) => m.userId)];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, username: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const out: MemberInfo[] = [];
  const owner = byId.get(ownerId);
  if (owner) out.push({ ...owner, role: "owner", isOwner: true, isMe: owner.id === meId });
  for (const m of memberRows) {
    const u = byId.get(m.userId);
    if (u) out.push({ ...u, role: m.role, isOwner: false, isMe: u.id === meId });
  }
  return out;
}

// GET /api/coaching/:id/members — liste des membres (propriétaire + invités).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const node = await loadNode(id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isOwner = node.userId === userId;
  const myRole = isOwner ? "owner" : await getCoachingRole(id, userId);
  if (!myRole) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const members = await buildMembers(node.userId, userId, await listCoachingMembers(id));
  return NextResponse.json({ id: node.id, name: node.name, isOwner, myRole, members });
}

const inviteSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  role: z.enum(["editor", "viewer"]).optional(),
});

// POST /api/coaching/:id/members — inviter par nom d'utilisateur ou email.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const node = await loadNode(id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Inviter exige d'être propriétaire ou éditeur.
  const isOwner = node.userId === userId;
  const myRole = isOwner ? "owner" : await getCoachingRole(id, userId);
  if (myRole !== "owner" && myRole !== "editor") {
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
    return NextResponse.json({ error: "Aucun utilisateur avec ce nom d'utilisateur ou cet email." }, { status: 404 });
  }
  if (invited.id === node.userId) {
    return NextResponse.json({ error: "Cette personne est le propriétaire du suivi." }, { status: 409 });
  }
  if (await getCoachingRole(id, invited.id)) {
    return NextResponse.json({ error: "Cette personne est déjà membre." }, { status: 409 });
  }

  const role: CoachingRole = parsed.data.role ?? "editor";
  await addCoachingMember(id, invited.id, role);

  // Notifie l'invité.
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, email: true } });
  const actorName = actor ? displayName(actor) : "Quelqu'un";
  await notify(invited.id, {
    type: "coaching_shared",
    title: `Vous avez été ajouté au suivi « ${node.name} »`,
    body: `Invité par ${actorName}`,
    actorName,
  }).catch(() => {});

  return NextResponse.json({
    member: { id: invited.id, name: invited.name, username: invited.username, email: invited.email, role, isOwner: false, isMe: false },
  });
}

const roleSchema = z.object({ userId: z.string(), role: z.enum(["editor", "viewer"]) });

// PATCH /api/coaching/:id/members — change le rôle d'un membre (propriétaire).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const node = await loadNode(id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (node.userId !== userId) return NextResponse.json({ error: "Propriétaire uniquement" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  if (!(await getCoachingRole(id, parsed.data.userId))) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }

  await setCoachingMemberRole(id, parsed.data.userId, parsed.data.role);
  return NextResponse.json({ ok: true });
}

const removeSchema = z.object({ userId: z.string() });

// DELETE /api/coaching/:id/members — retirer un membre (propriétaire).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const node = await loadNode(id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (node.userId !== userId) return NextResponse.json({ error: "Propriétaire uniquement" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  await removeCoachingMember(id, parsed.data.userId);
  return NextResponse.json({ ok: true });
}
