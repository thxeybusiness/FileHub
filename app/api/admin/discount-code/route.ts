import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounder, PLANS } from "@/lib/plans";
import { getStripe, priceIdForPlan, stripeConfigured } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/env";

export const runtime = "nodejs";

const PERCENT_OFF = 60; // « Vendre à -60 % »

const schema = z.object({
  plan: z.enum(["premium", "business"]),
  interval: z.enum(["month", "year"]).default("month"),
  maxRedemptions: z.number().int().min(1).max(1000).optional(),
});

// Génère un code alphanumérique lisible (sans caractères ambigus).
function makeCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return `FH60-${s}`;
}

// POST /api/admin/discount-code — RÉSERVÉ AU FONDATEUR.
// Crée un coupon Stripe -60 % + un code promo à remettre à « certaines
// personnes » : elles paient l'abonnement 60 % moins cher (via la page
// d'abonnement classique, où les codes promo sont déjà acceptés).
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!me || !isFounder(me.email)) {
    return NextResponse.json({ error: "Réservé au compte Fondateur." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const { plan, interval, maxRedemptions } = parsed.data;

  const stripe = getStripe();
  const priceId = priceIdForPlan(plan, interval);
  if (!stripe || !priceId || !stripeConfigured()) {
    return NextResponse.json(
      { error: "Le paiement (Stripe) n'est pas encore configuré. Impossible de générer un code pour l'instant." },
      { status: 503 },
    );
  }

  // On limite le coupon au produit du plan concerné (le -60 % ne s'applique
  // qu'à ce plan). Si le produit ne peut être lu, coupon général en repli.
  let productId: string | undefined;
  try {
    const price = await stripe.prices.retrieve(priceId);
    productId = typeof price.product === "string" ? price.product : price.product?.id;
  } catch {
    /* repli : coupon général */
  }

  const planName = PLANS[plan].name;

  const coupon = await stripe.coupons.create({
    percent_off: PERCENT_OFF,
    duration: "forever",
    name: `FileHub ${planName} -${PERCENT_OFF}%`,
    ...(productId ? { applies_to: { products: [productId] } } : {}),
    metadata: { founderUserId: userId, plan, interval },
  });

  // Code promo unique (réessaie une fois en cas de collision improbable).
  let promo;
  try {
    promo = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: makeCode(),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
      metadata: { founderUserId: userId, plan, interval },
    });
  } catch {
    promo = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: makeCode(),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
      metadata: { founderUserId: userId, plan, interval },
    });
  }

  const base = interval === "year" ? (PLANS[plan].priceYearly ?? PLANS[plan].priceMonthly) : PLANS[plan].priceMonthly;
  const discounted = Math.round(base * (1 - PERCENT_OFF / 100) * 100) / 100;

  return NextResponse.json({
    ok: true,
    code: promo.code,
    percentOff: PERCENT_OFF,
    plan,
    interval,
    basePrice: base,
    discountedPrice: discounted,
    maxRedemptions: maxRedemptions ?? null,
    checkoutUrl: `${getBaseUrl()}/drive/abonnement`,
  });
}
