// Définition des paliers d'abonnement FileHub.
// Le stockage est le principal levier ; la limite est appliquée à l'upload.

export type PlanId = "free" | "premium" | "business";

export type BillingInterval = "month" | "year";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string; // affichage ("0 €", "9 € / mois")
  priceMonthly: number; // en euros / mois
  priceYearly?: number; // en euros / an (facturation annuelle)
  storage: number; // octets
  storageLabel: string;
  features: string[];
  highlight?: boolean;
};

const GB = 1024 ** 3;
const TB = 1024 ** 4;

export const FREE_STORAGE = 1 * GB; // 1 Go
export const PREMIUM_STORAGE = 50 * GB; // 50 Go
export const BUSINESS_STORAGE = 500 * GB; // 500 Go
export const TEAM_STORAGE = 5 * GB; // 5 Go (grade offert)

// Nombre maximum de grades « Team » qu'un membre Business peut offrir.
export const MAX_TEAM_GIFTS = 2;

// Grade « Team » : non achetable, offert par un membre Business. Comme Basic,
// mais avec 5 Go de stockage et jusqu'à 3 espaces partagés.
// (Identifiant interne conservé « team » pour éviter toute migration.)
export const TEAM_PLAN = {
  id: "team" as const,
  name: "Team",
  storage: TEAM_STORAGE,
  storageLabel: "5 Go",
  spaces: 3,
  features: [
    "5 Go de stockage",
    "Jusqu'à 3 espaces partagés",
    "Documents, feuilles, graphiques, dessins",
    "Partage par lien",
    "Grade offert (non achetable)",
  ],
};

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
      "Aucun accès à l'IA",
    ],
  },
  premium: {
    id: "premium",
    name: "Pro",
    priceLabel: "9 € / mois",
    priceMonthly: 9,
    priceYearly: 96, // annuel : équivalent 8 €/mois
    storage: PREMIUM_STORAGE,
    storageLabel: "50 Go",
    highlight: true,
    features: [
      "50 Go de stockage",
      "5 espaces partagés",
      "Tous les éditeurs sans limite",
      "Badge Pro",
      "Support prioritaire",
      "2 utilisations IA / jour",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceLabel: "24 € / mois",
    priceMonthly: 24,
    priceYearly: 264, // annuel : équivalent 22 €/mois
    storage: BUSINESS_STORAGE,
    storageLabel: "500 Go",
    features: [
      "500 Go de stockage",
      "Tout le forfait Pro",
      "Collaboration temps réel avancée",
      "Espaces communs illimités",
      "Badge Business",
      "2 abonnements Team offerts",
      "Support prioritaire dédié",
      "5 utilisations IA / jour",
    ],
  },
};

export function planStorage(plan: string): number {
  if (plan === "business") return BUSINESS_STORAGE;
  if (plan === "premium") return PREMIUM_STORAGE;
  if (plan === "team") return TEAM_STORAGE;
  return FREE_STORAGE;
}

/** Nombre d'espaces partagés qu'un plan autorise à créer (Infinity = illimité). */
export function spaceLimit(plan: string): number {
  if (plan === "founder" || plan === "business") return Infinity;
  if (plan === "premium") return 5;
  if (plan === "team") return 3;
  return 1; // Basic
}

/** Nombre d'utilisations de l'IA par jour selon le grade (Infinity = illimité). */
export function aiDailyLimit(plan: string): number {
  if (plan === "founder") return Infinity;
  if (plan === "business") return 5;
  if (plan === "premium") return 2;
  return 0; // Basic, Team : pas d'accès IA
}

/** Vrai si le grade a un accès (même limité) à l'IA. */
export function hasAiAccess(plan: string): boolean {
  return aiDailyLimit(plan) > 0;
}

/** Vrai si le plan est une formule payante (Pro ou Business). */
export function isPaidPlan(plan: string | null | undefined): boolean {
  return plan === "premium" || plan === "business";
}

/** Vrai si le membre peut offrir le grade Team (Business ou Fondateur). */
export function canGiftTeam(plan: string | null | undefined, email?: string | null): boolean {
  return plan === "business" || isFounder(email);
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
