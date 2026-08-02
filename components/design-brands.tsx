"use client";

// Logos des plateformes pour les formats de création — SVG inline (aucune
// ressource externe : rien à charger, rien à bloquer par la CSP).

import { FileText, CreditCard, Sparkles, Monitor, Laptop, type LucideIcon } from "lucide-react";

export type BrandId =
  | "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "x"
  | "logo" | "print" | "card" | "screen" | "wallpaper";

/** Palette de chaque plateforme : fond de la vignette + couleur du logo. */
export const BRANDS: Record<BrandId, { bg: string; fg: string; ring?: string }> = {
  instagram: { bg: "linear-gradient(135deg,#f9ce34 0%,#ee2a7b 48%,#6228d7 100%)", fg: "#ffffff" },
  tiktok: { bg: "#0b0b0f", fg: "#ffffff", ring: "rgba(255,255,255,0.16)" },
  youtube: { bg: "#e8202a", fg: "#ffffff" },
  facebook: { bg: "#1877f2", fg: "#ffffff" },
  linkedin: { bg: "#0a66c2", fg: "#ffffff" },
  x: { bg: "#0a0a0a", fg: "#ffffff", ring: "rgba(255,255,255,0.16)" },
  logo: { bg: "linear-gradient(135deg,#a855f7,#6366f1)", fg: "#ffffff" },
  print: { bg: "#f4f4f5", fg: "#3f3f46" },
  card: { bg: "linear-gradient(135deg,#334155,#0f172a)", fg: "#e2e8f0" },
  screen: { bg: "linear-gradient(135deg,#0ea5e9,#1e293b)", fg: "#ffffff" },
  wallpaper: { bg: "linear-gradient(140deg,#1e1b4b,#4c1d95 55%,#0f172a)", fg: "#e9d5ff" },
};

const LUCIDE: Partial<Record<BrandId, LucideIcon>> = {
  logo: Sparkles,
  print: FileText,
  card: CreditCard,
  screen: Monitor,
  wallpaper: Laptop,
};

/* ── Catégories de formats : chaque plateforme et toutes ses tailles ── */

export type PlatformFormat = { label: string; w: number; h: number };
export type Platform = { id: BrandId; label: string; formats: PlatformFormat[] };

export const PLATFORMS: Platform[] = [
  {
    id: "instagram", label: "Instagram",
    formats: [
      { label: "Post carré", w: 1080, h: 1080 },
      { label: "Post portrait", w: 1080, h: 1350 },
      { label: "Story / Reel", w: 1080, h: 1920 },
      { label: "Post paysage", w: 1080, h: 566 },
      { label: "Photo de profil", w: 320, h: 320 },
    ],
  },
  {
    id: "tiktok", label: "TikTok",
    formats: [
      { label: "Vidéo / Story", w: 1080, h: 1920 },
      { label: "Carrousel", w: 1080, h: 1080 },
      { label: "Photo de profil", w: 400, h: 400 },
    ],
  },
  {
    id: "youtube", label: "YouTube",
    formats: [
      { label: "Miniature", w: 1280, h: 720 },
      { label: "Bannière de chaîne", w: 2560, h: 1440 },
      { label: "Short", w: 1080, h: 1920 },
      { label: "Avatar / logo", w: 800, h: 800 },
      { label: "Écran de fin", w: 1280, h: 720 },
    ],
  },
  {
    id: "facebook", label: "Facebook",
    formats: [
      { label: "Post", w: 1200, h: 630 },
      { label: "Post carré", w: 1080, h: 1080 },
      { label: "Story", w: 1080, h: 1920 },
      { label: "Couverture", w: 1640, h: 624 },
      { label: "Photo de profil", w: 320, h: 320 },
    ],
  },
  {
    id: "x", label: "X",
    formats: [
      { label: "Post", w: 1600, h: 900 },
      { label: "Bannière", w: 1500, h: 500 },
      { label: "Photo de profil", w: 400, h: 400 },
    ],
  },
  {
    id: "linkedin", label: "LinkedIn",
    formats: [
      { label: "Post carré", w: 1200, h: 1200 },
      { label: "Post paysage", w: 1200, h: 627 },
      { label: "Bannière de profil", w: 1584, h: 396 },
      { label: "Bannière de page", w: 1128, h: 191 },
      { label: "Photo de profil", w: 400, h: 400 },
    ],
  },
  {
    id: "logo", label: "Marque",
    formats: [
      { label: "Logo", w: 800, h: 800 },
      { label: "Logo horizontal", w: 1600, h: 600 },
      { label: "Favicon", w: 512, h: 512 },
      { label: "Carte de visite", w: 1050, h: 600 },
    ],
  },
  {
    id: "print", label: "Impression",
    formats: [
      { label: "A4 portrait", w: 1240, h: 1754 },
      { label: "A4 paysage", w: 1754, h: 1240 },
      { label: "A5 portrait", w: 874, h: 1240 },
      { label: "Flyer A6", w: 620, h: 874 },
      { label: "Affiche A3", w: 1754, h: 2480 },
    ],
  },
  {
    id: "wallpaper", label: "Fonds d'écran",
    formats: [
      { label: "MacBook Air 13\"", w: 2560, h: 1664 },
      { label: "MacBook Air 15\"", w: 2880, h: 1864 },
      { label: "MacBook Pro 14\"", w: 3024, h: 1964 },
      { label: "MacBook Pro 16\"", w: 3456, h: 2234 },
      { label: "iMac 24\" 4,5K", w: 4480, h: 2520 },
      { label: "Studio Display 5K", w: 5120, h: 2880 },
      { label: "Écran 4K UHD", w: 3840, h: 2160 },
      { label: "Écran 2K QHD", w: 2560, h: 1440 },
      { label: "Écran Full HD", w: 1920, h: 1080 },
      { label: "Ultra-large 21:9", w: 3440, h: 1440 },
      { label: "iPad Pro 12,9\"", w: 2048, h: 2732 },
      { label: "iPhone", w: 1179, h: 2556 },
      { label: "iPhone Pro Max", w: 1320, h: 2868 },
    ],
  },
  {
    id: "screen", label: "Web",
    formats: [
      { label: "Présentation 16:9", w: 1920, h: 1080 },
      { label: "Bannière web", w: 1440, h: 400 },
      { label: "Vignette d'article", w: 1600, h: 900 },
      { label: "Bandeau e-mail", w: 1200, h: 400 },
    ],
  },
];

export function BrandGlyph({ id, size = 22 }: { id: BrandId; size?: number }) {
  const Icon = LUCIDE[id];
  if (Icon) return <Icon width={size} height={size} strokeWidth={1.9} aria-hidden />;

  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;

  switch (id) {
    case "instagram":
      return (
        <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.85}>
          <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" />
          <circle cx="12" cy="12" r="4.25" />
          <circle cx="17.5" cy="6.5" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...p} fill="currentColor">
          <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.59 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12v-3.2a5.78 5.78 0 0 0-.76-.05 5.77 5.77 0 0 0 0 11.54 5.77 5.77 0 0 0 5.77-5.77V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.33-1.48z" />
        </svg>
      );
    case "youtube":
      // Le triangle est un trou (evenodd) : la couleur de fond transparaît.
      return (
        <svg {...p} fill="currentColor">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M21.58 7.19a2.51 2.51 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41A2.51 2.51 0 0 0 2.42 7.2C2 8.77 2 12 2 12s0 3.23.42 4.8a2.51 2.51 0 0 0 1.77 1.79C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.51 2.51 0 0 0 1.77-1.79C22 15.23 22 12 22 12s0-3.23-.42-4.81zM10.05 15.11V8.89L15.5 12l-5.45 3.11z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg {...p} fill="currentColor">
          <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...p} fill="currentColor">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
        </svg>
      );
    case "x":
      return (
        <svg {...p} fill="currentColor">
          <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z" />
        </svg>
      );
    default:
      return null;
  }
}
