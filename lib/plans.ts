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
export const TEAM_STORAGE = 5 * GB; // 5 Go (grade offert)

// Nombre maximum de grades « Team » qu'un membre Business peut offrir.
export const MAX_TEAM_GIFTS = 2;

// Grade « Team » : non achetable, offert par un membre Business. Comme Basic,
// mais avec 5 Go de stockage et jusqu'à 3 espaces partagés.
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
  if (plan === "team") return TEAM_STORAGE;
  return FREE_STORAGE;
}

/** Nombre d'espaces partagés qu'un plan autorise à créer (Infinity = illimité). */
export function spaceLimit(plan: string): number {
  if (plan === "founder" || plan === "premium" || plan === "business") return Infinity;
  if (plan === "team") return 3;
  return 1; // Basic
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
