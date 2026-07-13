import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounder, planStorage } from "@/lib/plans";

export const runtime = "nodejs";

// Réservé au compte Fondateur : attribue un grade à un utilisateur (par e-mail).
const schema = z.object({
  email: z.string().trim().email().max(200),
  plan: z.enum(["free", "team", "premium", "business"]),
});

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!me || !isFounder(me.email)) {
    return NextResponse.json({ error: "Réservé au compte Fondateur." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const plan = parsed.data.plan;

  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, plan: true } });
  if (!target) return NextResponse.json({ error: `Aucun compte FileHub avec l'e-mail « ${email} ».` }, { status: 404 });

  const paid = plan === "premium" || plan === "business";
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      plan,
      planStatus: paid ? "active" : null,
      storageLimit: BigInt(planStorage(plan)),
    },
    select: { email: true, name: true, plan: true },
  });

  return NextResponse.json({ ok: true, previousPlan: target.plan, user: updated });
}
