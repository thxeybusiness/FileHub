// Définition des paliers d'abonnement FileHub.
// Le stockage est le principal levier ; la limite est appliquée à l'upload.

export type PlanId = "free" | "premium" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string; // affichage ("0 €", "9 € / mois")
  priceMonthly: number; // en euros, informatif
  storage: number; // octets
  storageLabel: string;
  features: string[];
  highlight?: boolean;
};

const GB = 1024 ** 3;
const TB = 1024 ** 4;

export const FREE_STORAGE = 1 * GB; // 1 Go
export const PREMIUM_STORAGE = 250 * GB; // 250 Go
export const BUSINESS_STORAGE = 2 * TB; // 2 To

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Basic",
    priceLabel: "0 €",
    priceMonthly: 0,
    storage: FREE_STORAGE,
    storageLabel: "1 Go",
    features: [
      "1 Go de stockage",
      "Documents, feuilles, graphiques, dessins",
      "1 espace partagé",
      "Partage par lien",
    ],
  },
  premium: {
    id: "premium",
    name: "Pro",
    priceLabel: "9 € / mois",
    priceMonthly: 9,
    storage: PREMIUM_STORAGE,
    storageLabel: "250 Go",
    highlight: true,
    features: [
      "250 Go de stockage",
      "Espaces partagés illimités",
      "Tous les éditeurs sans limite",
      "Badge Pro",
      "Support prioritaire",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceLabel: "24 € / mois",
    priceMonthly: 24,
    storage: BUSINESS_STORAGE,
    storageLabel: "2 To",
    features: [
      "2 To de stockage",
      "Tout ce qui est inclus dans Pro",
      "Collaboration temps réel avancée",
      "Espaces d'équipe & gestion des membres",
      "Historique de versions étendu",
      "Badge Business",
      "Support prioritaire dédié",
    ],
  },
};

export function planStorage(plan: string): number {
  if (plan === "business") return BUSINESS_STORAGE;
  if (plan === "premium") return PREMIUM_STORAGE;
  return FREE_STORAGE;
}

/** Vrai si le plan est une formule payante (Pro ou Business). */
export function isPaidPlan(plan: string | null | undefined): boolean {
  return plan === "premium" || plan === "business";
}

// ── Grade spécial « Fondateur » ────────────────────────────────────────────
// Comptes fondateurs : accès illimité, hors système d'abonnement Stripe.
export const FOUNDER_EMAILS = new Set<string>(["thxeybusiness@gmail.com"]);

// 1 Po : concrètement illimité (le quota d'upload ne sera jamais atteint).
export const FOUNDER_STORAGE = 1024 ** 5;

export function isFounder(email: string | null | undefined): boolean {
  return !!email && FOUNDER_EMAILS.has(email.trim().toLowerCase());
}

/** Plan effectif pour l'affichage : le fondateur prime sur tout. */
export function effectivePlan(email: string | null | undefined, plan: string): string {
  return isFounder(email) ? "founder" : plan;
}

export function isActive(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
