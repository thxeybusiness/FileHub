import Stripe from "stripe";

// Client Stripe côté serveur. Renvoie null si non configuré, pour que
// l'app fonctionne (page de tarifs visible) tant que les clés ne sont pas
// renseignées — le checkout renvoie alors une erreur explicite.
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}

// Identifiants de prix Stripe : mensuels et annuels (facturation annuelle).
export function premiumPriceId(): string | undefined {
  return process.env.STRIPE_PREMIUM_PRICE_ID;
}
export function premiumPriceIdYearly(): string | undefined {
  return process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY;
}
export function businessPriceId(): string | undefined {
  return process.env.STRIPE_BUSINESS_PRICE_ID;
}
export function businessPriceIdYearly(): string | undefined {
  return process.env.STRIPE_BUSINESS_PRICE_ID_YEARLY;
}

/** Renvoie l'identifiant de prix Stripe pour un plan payant + un cycle. */
export function priceIdForPlan(plan: string, interval: "month" | "year" = "month"): string | undefined {
  if (plan === "business") return interval === "year" ? businessPriceIdYearly() : businessPriceId();
  return interval === "year" ? premiumPriceIdYearly() : premiumPriceId();
}

/** Mappe un identifiant de prix Stripe vers un plan FileHub (mensuel ou annuel). */
export function planForPriceId(priceId: string | null | undefined): "premium" | "business" {
  if (priceId && (priceId === businessPriceId() || priceId === businessPriceIdYearly())) return "business";
  return "premium";
}

/** Secret de signature du webhook Stripe. */
export function webhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

/** Vrai si Stripe est prêt (clé secrète + prix Premium). */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PREMIUM_PRICE_ID);
}
