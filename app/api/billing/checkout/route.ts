import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, priceIdForPlan, stripeConfigured } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/env";

export const runtime = "nodejs";

// POST /api/billing/checkout — démarre un abonnement (Pro ou Business) via Stripe Checkout.
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Plan demandé : "premium" (Pro) par défaut, ou "business".
  let plan = "premium";
  try {
    const body = (await req.json().catch(() => null)) as { plan?: string } | null;
    if (body?.plan === "business") plan = "business";
  } catch {
    /* corps vide → Pro par défaut */
  }

  const stripe = getStripe();
  const priceId = priceIdForPlan(plan);
  if (!stripe || !priceId || !stripeConfigured()) {
    return NextResponse.json(
      { error: "Le paiement n'est pas encore configuré. Réessayez bientôt." },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, plan: true, stripeCustomerId: true },
  });
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.plan === plan) {
    return NextResponse.json(
      { error: plan === "business" ? "Vous êtes déjà Business." : "Vous êtes déjà Pro." },
      { status: 400 },
    );
  }

  // Réutilise le client Stripe existant, sinon en crée un.
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const base = getBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan },
    subscription_data: { metadata: { userId: user.id, plan } },
    success_url: `${base}/drive/abonnement?success=1`,
    cancel_url: `${base}/drive/abonnement?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
