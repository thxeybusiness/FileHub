import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { canGiftTeam, TEAM_STORAGE, FREE_STORAGE, MAX_TEAM_GIFTS } from "@/lib/plans";

export const runtime = "nodejs";

// Marqueur stocké dans planStatus des bénéficiaires : « gift:<idDuDonneur> ».
// Cela évite toute migration de schéma (aucune nouvelle colonne).
const giftTag = (granterId: string) => `gift:${granterId}`;

async function loadCaller(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, plan: true } });
}

/** Liste des bénéficiaires + éligibilité de l'appelant. */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const me = await loadCaller(userId);
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const eligible = canGiftTeam(me.plan, me.email);
  const gifts = eligible
    ? await prisma.user.findMany({
        where: { plan: "team", planStatus: giftTag(userId) },
        select: { id: true, email: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return NextResponse.json({ canGift: eligible, max: MAX_TEAM_GIFTS, used: gifts.length, gifts });
}

const grantSchema = z.object({ email: z.string().trim().email().max(200) });

/** Offre le grade Team à un utilisateur (réservé aux membres Business/Fondateur). */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const me = await loadCaller(userId);
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!canGiftTeam(me.plan, me.email)) {
    return NextResponse.json({ error: "Le grade Team ne peut être offert que par un membre Business." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  // Quota : 2 grades maximum par membre Business.
  const used = await prisma.user.count({ where: { plan: "team", planStatus: giftTag(userId) } });
  if (used >= MAX_TEAM_GIFTS) {
    return NextResponse.json({ error: `Vous avez déjà offert ${MAX_TEAM_GIFTS} grades Team.` }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, plan: true, planStatus: true } });
  if (!recipient) return NextResponse.json({ error: "Aucun compte FileHub avec cet e-mail." }, { status: 404 });
  if (recipient.id === userId) return NextResponse.json({ error: "Vous ne pouvez pas vous offrir le grade à vous-même." }, { status: 400 });
  if (recipient.plan === "team") {
    return NextResponse.json({ error: "Cette personne bénéficie déjà d'un grade Team." }, { status: 400 });
  }
  if (recipient.plan !== "free") {
    return NextResponse.json({ error: "Cette personne a déjà un grade supérieur (Pro/Business)." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: recipient.id },
    data: { plan: "team", planStatus: giftTag(userId), storageLimit: BigInt(TEAM_STORAGE) },
  });

  await notify(recipient.id, {
    type: "team_gift",
    title: "Vous avez reçu le grade Team 🎁",
    body: `${me.name || me.email} vous offre le grade Team : 5 Go de stockage et 3 espaces partagés.`,
  });

  return NextResponse.json({ ok: true, recipient: { id: recipient.id, email: recipient.email, name: recipient.name } });
}

const revokeSchema = z.object({ recipientId: z.string().min(1) });

/** Retire un grade Team précédemment offert (seul le donneur peut le faire). */
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  // On ne peut retirer que les grades qu'on a soi-même offerts.
  const recipient = await prisma.user.findFirst({
    where: { id: parsed.data.recipientId, plan: "team", planStatus: giftTag(userId) },
    select: { id: true },
  });
  if (!recipient) return NextResponse.json({ error: "Bénéficiaire introuvable." }, { status: 404 });

  await prisma.user.update({
    where: { id: recipient.id },
    data: { plan: "free", planStatus: null, storageLimit: BigInt(FREE_STORAGE) },
  });

  return NextResponse.json({ ok: true });
}
