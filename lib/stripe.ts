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

/** Identifiant du prix Premium (récurrent) créé dans le tableau de bord Stripe. */
export function premiumPriceId(): string | undefined {
  return process.env.STRIPE_PREMIUM_PRICE_ID;
}

/** Identifiant du prix Business (récurrent) créé dans le tableau de bord Stripe. */
export function businessPriceId(): string | undefined {
  return process.env.STRIPE_BUSINESS_PRICE_ID;
}

/** Renvoie l'identifiant de prix Stripe pour un plan payant donné. */
export function priceIdForPlan(plan: string): string | undefined {
  if (plan === "business") return businessPriceId();
  return premiumPriceId();
}

/** Mappe un identifiant de prix Stripe vers un plan FileHub. */
export function planForPriceId(priceId: string | null | undefined): "premium" | "business" {
  if (priceId && businessPriceId() && priceId === businessPriceId()) return "business";
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
