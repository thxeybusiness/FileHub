import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/env";

export const runtime = "nodejs";

// POST /api/billing/portal — ouvre le portail de facturation Stripe
// (changer de carte, télécharger les factures, résilier).
export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Facturation indisponible." }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "Aucun abonnement à gérer." }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getBaseUrl()}/drive/abonnement`,
  });

  return NextResponse.json({ url: session.url });
}
