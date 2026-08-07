// Modèles du studio Design.
//
// Un modèle n'est pas un dessin figé : c'est une COMPOSITION — une mise en
// page, une palette, un format et un texte. Les écrire un par un à la main
// donnerait trois cents variantes du même réflexe ; ils sont donc bâtis à
// partir de MISES EN PAGE réutilisables, chacune déclinée sur des formats,
// des palettes et des contenus différents.
//
// Chaque mise en page se calcule à partir de la largeur et de la hauteur du
// document : la même composition tient donc en carré, en story verticale ou
// en bannière large, sans coordonnées codées en dur.

import {
  type DesignDoc, type Layer, type GradientFill, type ShapeKind,
  DEFAULT_SHADOW, FONTS,
} from "./design";
/* Les lignes du catalogue vivent dans des fichiers séparés : un seul fichier
   de deux mille compositions serait illisible. Ils n'importent d'ici qu'un
   type, l'import inverse est donc effacé à la compilation — pas de cycle. */
import { ROWS_RESEAUX } from "./design-rows-reseaux";
import { ROWS_COMMERCE } from "./design-rows-commerce";
import { ROWS_METIERS } from "./design-rows-metiers";
import { ROWS_PRO } from "./design-rows-pro";
import { ROWS_PRINT } from "./design-rows-print";
import { ROWS_VIE } from "./design-rows-vie";
import { ROWS_SAISON } from "./design-rows-saison";
import { ROWS_SOCIAL2 } from "./design-rows-social2";
import { ROWS_SERVICES2 } from "./design-rows-services2";
import { ROWS_BESOINS } from "./design-rows-besoins";
import { ROWS_CANAUX } from "./design-rows-canaux";
import { ROWS_METIERS2 } from "./design-rows-metiers2";
import { ROWS_SOCIAL3 } from "./design-rows-social3";

/** Un modèle. `w` et `h` se lisent sans rien construire : ils suffisent aux
 *  libellés et à la recherche. `doc`, lui, n'est bâti qu'à la première
 *  lecture puis mémorisé — une page n'affiche qu'une vingtaine de vignettes,
 *  il serait absurde de monter deux mille documents à chaque import. */
export type Template = {
  id: string; label: string; group: string; w: number; h: number;
  readonly doc: DesignDoc;
};

const S = { ...DEFAULT_SHADOW };
const font = (i: number) => FONTS[i].css;
let seq = 0;
const tid = () => `tplx-${++seq}`;

function shape(p: Record<string, unknown>): Layer {
  return {
    id: tid(), name: "Forme", type: "shape", shape: "rect", x: 0, y: 0, w: 100, h: 100,
    rotation: 0, opacity: 1, blend: "normal", visible: true, locked: false, flipX: false, flipY: false,
    shadow: { ...S }, fill: "#8b5cf6", gradient: null, stroke: "#000000", strokeWidth: 0, radius: 0,
    ...p,
  } as Layer;
}
function text(p: Record<string, unknown>): Layer {
  return {
    id: tid(), name: "Texte", type: "text", x: 0, y: 0, w: 600, h: 120,
    rotation: 0, opacity: 1, blend: "normal", visible: true, locked: false, flipX: false, flipY: false,
    shadow: { ...S }, text: "", color: "#111827", fontFamily: font(0), fontSize: 64, fontWeight: 700,
    italic: false, underline: false, uppercase: false, align: "center", lineHeight: 1.15, letterSpacing: 0,
    strokeColor: "#000000", strokeWidth: 0,
    ...p,
  } as Layer;
}
function line(p: Record<string, unknown>): Layer {
  return {
    id: tid(), name: "Ligne", type: "line", x: 0, y: 0, w: 300, h: 24,
    rotation: 0, opacity: 1, blend: "normal", visible: true, locked: false, flipX: false, flipY: false,
    shadow: { ...S }, stroke: "#111827", strokeWidth: 6, dash: "solid",
    ...p,
  } as Layer;
}

/* ── Lisibilité ──
   Une palette dont l'accent frôle le fond rend un libellé invisible. Plutôt
   que de retirer l'accent partout, on ne le garde que là où il contraste
   assez, et on retombe sur une couleur sûre sinon. */
function lum(hex: string): number {
  const h = hex.replace("#", "");
  const t = h.length < 6 ? h.slice(0, 3).split("").map((c) => c + c).join("") : h.slice(0, 6);
  const v = [0, 2, 4].map((i) => {
    const c = parseInt(t.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** L'accent s'il tient sur ce fond, le secours sinon. */
const lis = (fg: string, fond: string, secours: string) => (contraste(fg, fond) >= 3 ? fg : secours);
/** Blanc ou noir, selon ce qui tient le mieux sur ce fond. */
const sur = (fond: string) => (lum(fond) > 0.3 ? "#111827" : "#ffffff");

const ombre = (blur: number, opacity = 0.3, y = 12, color = "#000000") =>
  ({ enabled: true, x: 0, y, blur, color, opacity });

/* ═══════════ Formats ═══════════ */
const F = {
  carre: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920],
  yt: [1280, 720], ytban: [2048, 1152], large: [1200, 630], li: [1200, 1200],
  couv: [1640, 856], pin: [1000, 1500], banx: [1500, 500],
  a4: [1240, 1754], a5: [874, 1240], carte: [1050, 600], slide: [1920, 1080],
  ebook: [1600, 2400], pod: [1400, 1400], bandeau: [1920, 600],
  billet: [1200, 480], badge: [800, 1120], logo: [800, 800], cv: [1240, 1754],
  a3: [1754, 2480], paysage: [1754, 1240], carreL: [1440, 1440], etiq: [600, 900],
  carteV: [600, 1050], bannli: [1584, 396], signa: [1000, 250], diapo43: [1440, 1080],
  affiche: [1587, 2245], menuc: [1000, 1600],
} as const;
type Fmt = keyof typeof F;

/* ═══════════ Palettes ═══════════
   fond, fond secondaire (dégradé), encre, texte secondaire, accent, accent 2,
   et la couleur du texte posé SUR l'accent. */
type Pal = { bg: string; bg2: string | null; ink: string; sub: string; acc: string; acc2: string; on: string };
const PALS: Pal[] = [
  { bg: "#0f172a", bg2: "#312e81", ink: "#f8fafc", sub: "#a5b4fc", acc: "#6366f1", acc2: "#a855f7", on: "#ffffff" },
  { bg: "#ffffff", bg2: null, ink: "#0f172a", sub: "#64748b", acc: "#2563eb", acc2: "#0ea5e9", on: "#ffffff" },
  { bg: "#fef3c7", bg2: "#fde68a", ink: "#78350f", sub: "#b45309", acc: "#f59e0b", acc2: "#ea580c", on: "#451a03" },
  { bg: "#052e16", bg2: "#14532d", ink: "#ecfdf5", sub: "#86efac", acc: "#22c55e", acc2: "#84cc16", on: "#052e16" },
  { bg: "#fdf2f8", bg2: "#fce7f3", ink: "#831843", sub: "#be185d", acc: "#ec4899", acc2: "#f43f5e", on: "#ffffff" },
  { bg: "#18181b", bg2: "#3f3f46", ink: "#fafafa", sub: "#a1a1aa", acc: "#eab308", acc2: "#f97316", on: "#18181b" },
  { bg: "#ecfeff", bg2: "#cffafe", ink: "#164e63", sub: "#0e7490", acc: "#06b6d4", acc2: "#14b8a6", on: "#04353d" },
  { bg: "#1c1917", bg2: "#292524", ink: "#fafaf9", sub: "#a8a29e", acc: "#d97706", acc2: "#b45309", on: "#1c1917" },
  { bg: "#faf5ff", bg2: "#f3e8ff", ink: "#4c1d95", sub: "#7c3aed", acc: "#8b5cf6", acc2: "#d946ef", on: "#ffffff" },
  { bg: "#450a0a", bg2: "#7f1d1d", ink: "#fef2f2", sub: "#fca5a5", acc: "#ef4444", acc2: "#f97316", on: "#ffffff" },
  { bg: "#f8fafc", bg2: "#e2e8f0", ink: "#0f172a", sub: "#475569", acc: "#0f172a", acc2: "#475569", on: "#ffffff" },
  { bg: "#042f2e", bg2: "#134e4a", ink: "#f0fdfa", sub: "#5eead4", acc: "#14b8a6", acc2: "#06b6d4", on: "#042f2e" },
  { bg: "#fff7ed", bg2: "#ffedd5", ink: "#7c2d12", sub: "#c2410c", acc: "#f97316", acc2: "#facc15", on: "#431407" },
  { bg: "#020617", bg2: "#0f172a", ink: "#e2e8f0", sub: "#64748b", acc: "#38bdf8", acc2: "#818cf8", on: "#020617" },
  { bg: "#f0fdf4", bg2: "#dcfce7", ink: "#14532d", sub: "#15803d", acc: "#16a34a", acc2: "#65a30d", on: "#ffffff" },
  { bg: "#1e1b4b", bg2: "#4c1d95", ink: "#ede9fe", sub: "#c4b5fd", acc: "#a78bfa", acc2: "#f472b6", on: "#1e1b4b" },
  { bg: "#fafaf9", bg2: null, ink: "#292524", sub: "#78716c", acc: "#a16207", acc2: "#57534e", on: "#ffffff" },
  { bg: "#0c4a6e", bg2: "#075985", ink: "#f0f9ff", sub: "#7dd3fc", acc: "#0ea5e9", acc2: "#22d3ee", on: "#082f49" },
  { bg: "#fef2f2", bg2: "#fee2e2", ink: "#7f1d1d", sub: "#b91c1c", acc: "#dc2626", acc2: "#f59e0b", on: "#ffffff" },
  { bg: "#111827", bg2: "#1f2937", ink: "#f9fafb", sub: "#9ca3af", acc: "#10b981", acc2: "#34d399", on: "#062e21" },
  { bg: "#f5f3ff", bg2: "#ede9fe", ink: "#312e81", sub: "#4f46e5", acc: "#4f46e5", acc2: "#7c3aed", on: "#ffffff" },
  { bg: "#292524", bg2: "#44403c", ink: "#fef3c7", sub: "#d6d3d1", acc: "#fbbf24", acc2: "#f59e0b", on: "#292524" },
  { bg: "#ffffff", bg2: null, ink: "#171717", sub: "#737373", acc: "#e11d48", acc2: "#f43f5e", on: "#ffffff" },
  { bg: "#0a0a0a", bg2: "#171717", ink: "#fafafa", sub: "#a3a3a3", acc: "#e5e5e5", acc2: "#737373", on: "#0a0a0a" },
  /* 24 */ { bg: "#fef6f0", bg2: "#fde4d3", ink: "#7c2d12", sub: "#9a3412", acc: "#c2410c", acc2: "#ea580c", on: "#ffffff" },
  /* 25 */ { bg: "#f2f5f0", bg2: "#e3ebe0", ink: "#2f3e2f", sub: "#5b6b58", acc: "#4f7357", acc2: "#8ca884", on: "#ffffff" },
  /* 26 */ { bg: "#2b0a14", bg2: "#4c0f22", ink: "#fdf2f5", sub: "#f0a3b8", acc: "#e11d48", acc2: "#fb7185", on: "#ffffff" },
  /* 27 */ { bg: "#0b1c39", bg2: "#12294f", ink: "#f6f4ee", sub: "#b9c6de", acc: "#d4af37", acc2: "#f0d178", on: "#1a1405" },
  /* 28 */ { bg: "#effcf6", bg2: "#d6f5e6", ink: "#04503a", sub: "#0d7a58", acc: "#059669", acc2: "#34d399", on: "#ffffff" },
  /* 29 */ { bg: "#f4f2fd", bg2: "#e6e1fb", ink: "#322175", sub: "#5b4bb8", acc: "#6d5ce0", acc2: "#b39cf7", on: "#ffffff" },
  /* 30 */ { bg: "#14161a", bg2: "#24282f", ink: "#f4f6f8", sub: "#9aa3ae", acc: "#a3e635", acc2: "#65a30d", on: "#14161a" },
  /* 31 */ { bg: "#fff5f0", bg2: "#ffe6da", ink: "#7a2e1a", sub: "#b04a2a", acc: "#e11d48", acc2: "#fdba74", on: "#ffffff" },
  /* 32 */ { bg: "#04283c", bg2: "#06415f", ink: "#e8f6fd", sub: "#93c5e8", acc: "#38bdf8", acc2: "#67e8f9", on: "#04283c" },
  /* 33 */ { bg: "#f7f3ea", bg2: "#ece5d6", ink: "#1c1b18", sub: "#5c574c", acc: "#7a6a3e", acc2: "#c2b280", on: "#ffffff" },
  /* 34 */ { bg: "#ffffff", bg2: null, ink: "#18181b", sub: "#52525b", acc: "#c026d3", acc2: "#8b5cf6", on: "#ffffff" },
  /* 35 */ { bg: "#0b1f14", bg2: "#143324", ink: "#eaf6ee", sub: "#8fc7a4", acc: "#4ade80", acc2: "#a3e635", on: "#06180e" },
  /* 36 */ { bg: "#f6efe7", bg2: "#e9dccd", ink: "#4a3728", sub: "#7c6350", acc: "#b45309", acc2: "#d97706", on: "#ffffff" },
  /* 37 */ { bg: "#08080f", bg2: "#14142b", ink: "#f2f2ff", sub: "#a5a5d0", acc: "#7c3aed", acc2: "#22d3ee", on: "#ffffff" },
  /* 38 */ { bg: "#fff7f5", bg2: "#ffe4e0", ink: "#7f1d1d", sub: "#b91c1c", acc: "#e11d48", acc2: "#fb923c", on: "#ffffff" },
  /* 39 */ { bg: "#eef1f5", bg2: "#dbe2ea", ink: "#1f2937", sub: "#4b5563", acc: "#334155", acc2: "#64748b", on: "#ffffff" },
  /* 40 */ { bg: "#fffbe8", bg2: "#fef3c7", ink: "#3f2d00", sub: "#8a6a08", acc: "#ca8a04", acc2: "#f59e0b", on: "#3f2d00" },
  /* 41 */ { bg: "#2a1033", bg2: "#45185a", ink: "#faf2ff", sub: "#d8b4fe", acc: "#c084fc", acc2: "#f472b6", on: "#2a1033" },
  /* 42 */ { bg: "#f5fbff", bg2: "#e2f2fd", ink: "#0b3a5c", sub: "#2c6d99", acc: "#0284c7", acc2: "#38bdf8", on: "#ffffff" },
  /* 43 */ { bg: "#f6f6ee", bg2: "#e9e9d5", ink: "#33361f", sub: "#5f6338", acc: "#66761f", acc2: "#a3b018", on: "#ffffff" },
  /* 44 */ { bg: "#fdf6f6", bg2: "#f7e6e6", ink: "#4a2c33", sub: "#8a5c66", acc: "#9c6270", acc2: "#d9b3bb", on: "#ffffff" },
  /* 45 */ { bg: "#101010", bg2: "#1d1d1d", ink: "#fafafa", sub: "#a3a3a3", acc: "#ff6b00", acc2: "#ffb703", on: "#101010" },
];

/* ── Familles d'ambiance ──
   Écrire mille sept cents indices de palette à la main donnerait mille sept
   cents choix arbitraires. Une ligne demande donc une AMBIANCE — « chic »,
   « nature », « sombre » — et le bâtisseur y prend la première palette encore
   inutilisée pour ce couple mise en page / format. La cohérence reste
   dirigée, la variété devient mécanique. */
type Ambiance = "clair" | "sombre" | "chaud" | "froid" | "nature" | "chic" | "pastel" | "vif" | "tech" | "terre";
const AMB: Record<Ambiance, number[]> = {
  clair:  [1, 10, 22, 34, 39, 42, 16, 6, 14, 12, 19, 33],
  sombre: [0, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 26, 27, 30, 32, 35, 37, 41, 45],
  chaud:  [2, 12, 18, 24, 31, 36, 38, 40, 5, 8, 10, 45],
  froid:  [6, 11, 13, 17, 32, 42, 1, 0, 20, 39, 7, 29],
  nature: [3, 14, 19, 25, 28, 35, 43, 11, 6, 12, 33, 36],
  chic:   [10, 16, 21, 23, 26, 27, 33, 39, 41, 44, 8, 9],
  pastel: [4, 8, 20, 25, 29, 31, 38, 42, 44, 6, 14, 2],
  vif:    [5, 9, 18, 22, 30, 34, 40, 45, 12, 4, 13, 1],
  tech:   [0, 13, 15, 20, 23, 29, 37, 39, 11, 17, 30, 42],
  terre:  [7, 16, 21, 24, 33, 36, 43, 2, 3, 12, 18, 25],
};

/* ═══════════ Contenu ═══════════ */
type Copy = {
  sur?: string; titre?: string; sous?: string; cta?: string; meta?: string;
  gros?: string; auteur?: string; items?: string[]; emoji?: string;
};

type Ctx = { w: number; h: number; P: Pal; C: Copy; f: number };
type Bati = { bg: string; bgg: GradientFill | null; layers: Layer[] };

/** Échelle typographique : rapportée à la plus petite dimension, pour qu'une
    même mise en page reste lisible en carré comme en bannière. */
const ech = (w: number, h: number) => Math.min(w, h) / 1080;

/* ═══════════ Mises en page ═══════════ */
const MEP: Record<string, (c: Ctx) => Bati> = {

  /* Titre centré, filet, sous-titre. La base sobre. */
  centre: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 150, from: P.bg, to: P.bg2 } : null,
    layers: [
      ...(C.sur ? [text({ name: "Sur-titre", x: w * 0.1, y: h * 0.3, w: w * 0.8, h: 60 * f, text: C.sur, color: P.acc, fontSize: 32 * f, fontWeight: 700, letterSpacing: 10 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.08, y: h * 0.38, w: w * 0.84, h: h * 0.22, text: C.titre ?? "", color: P.ink, fontFamily: font(13), fontSize: 96 * f, fontWeight: 900, lineHeight: 1.1 }),
      line({ x: (w - 160 * f) / 2, y: h * 0.63, w: 160 * f, stroke: P.acc, strokeWidth: 8 * f }),
      ...(C.sous ? [text({ name: "Sous-titre", x: w * 0.14, y: h * 0.68, w: w * 0.72, h: h * 0.12, text: C.sous, color: P.sub, fontSize: 38 * f, fontWeight: 500, lineHeight: 1.4 })] : []),
    ],
  }),

  /* Bandeau de couleur en haut, contenu dessous. */
  bandeau: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Bandeau", x: 0, y: 0, w, h: h * 0.34, fill: P.acc, gradient: { type: "linear", angle: 135, from: P.acc, to: P.acc2 } }),
      ...(C.sur ? [text({ name: "Sur-titre", x: w * 0.08, y: h * 0.08, w: w * 0.84, h: 56 * f, text: C.sur, color: P.on, fontSize: 30 * f, fontWeight: 700, letterSpacing: 8 * f, uppercase: true, opacity: 0.85 })] : []),
      text({ name: "Titre", x: w * 0.07, y: h * 0.14, w: w * 0.86, h: h * 0.16, text: C.titre ?? "", color: P.on, fontSize: 82 * f, fontWeight: 900, lineHeight: 1.08 }),
      ...(C.sous ? [text({ name: "Corps", x: w * 0.1, y: h * 0.44, w: w * 0.8, h: h * 0.2, text: C.sous, color: P.ink, fontSize: 40 * f, fontWeight: 500, lineHeight: 1.45 })] : []),
      ...(C.cta ? [
        shape({ name: "Bouton", x: (w - w * 0.44) / 2, y: h * 0.74, w: w * 0.44, h: 100 * f, fill: P.acc, radius: 60 * f, shadow: ombre(30 * f, 0.3, 10 * f) }),
        text({ name: "CTA", x: (w - w * 0.44) / 2, y: h * 0.74 + 28 * f, w: w * 0.44, h: 50 * f, text: C.cta, color: sur(P.acc), fontSize: 34 * f, fontWeight: 800 }),
      ] : []),
    ],
  }),

  /* Diagonale colorée traversant la page. */
  diagonale: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 115, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Diagonale", x: -w * 0.2, y: -h * 0.2, w: w * 0.62, h: h * 1.5, fill: P.acc, rotation: 18, gradient: { type: "linear", angle: 160, from: P.acc, to: P.acc2 }, shadow: ombre(60 * f, 0.4, 0) }),
      text({ name: "Titre", x: w * 0.42, y: h * 0.22, w: w * 0.52, h: h * 0.3, text: C.titre ?? "", color: P.ink, fontFamily: font(14), fontSize: 78 * f, fontWeight: 900, align: "left", lineHeight: 1.1, uppercase: true }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.42, y: h * 0.58, w: w * 0.5, h: h * 0.14, text: C.sous, color: P.sub, fontSize: 34 * f, fontWeight: 500, align: "left", lineHeight: 1.4 })] : []),
      ...(C.gros ? [text({ name: "Gros", x: w * 0.04, y: h * 0.38, w: w * 0.3, h: h * 0.2, text: C.gros, color: P.on, fontFamily: font(14), fontSize: 110 * f, fontWeight: 900 })] : []),
    ],
  }),

  /* Panneau vertical à gauche, contenu à droite. */
  panneau: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Panneau", x: 0, y: 0, w: w * 0.36, h, fill: P.acc, gradient: { type: "linear", angle: 170, from: P.acc, to: P.acc2 } }),
      ...(C.gros ? [text({ name: "Gros", x: w * 0.03, y: h * 0.4, w: w * 0.3, h: h * 0.2, text: C.gros, color: P.on, fontFamily: font(13), fontSize: 120 * f, fontWeight: 900 })] : []),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.42, y: h * 0.2, w: w * 0.52, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, align: "left", letterSpacing: 7 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.42, y: h * 0.28, w: w * 0.53, h: h * 0.26, text: C.titre ?? "", color: P.ink, fontSize: 68 * f, fontWeight: 800, align: "left", lineHeight: 1.15 }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.42, y: h * 0.6, w: w * 0.5, h: h * 0.16, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500, align: "left", lineHeight: 1.5 })] : []),
      ...(C.meta ? [text({ name: "Méta", x: w * 0.42, y: h * 0.84, w: w * 0.5, h: 50 * f, text: C.meta, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 700, align: "left" })] : []),
    ],
  }),

  /* Cadre fin, tout centré : invitation, faire-part, minimal. */
  cadre: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Cadre", x: w * 0.06, y: h * 0.05, w: w * 0.88, h: h * 0.9, fill: "transparent", stroke: P.acc, strokeWidth: 3 * f, radius: 4 }),
      shape({ name: "Cadre intérieur", x: w * 0.08, y: h * 0.068, w: w * 0.84, h: h * 0.864, fill: "transparent", stroke: P.acc, strokeWidth: 1 * f, opacity: 0.5, radius: 2 }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.14, y: h * 0.24, w: w * 0.72, h: 56 * f, text: C.sur, color: P.sub, fontSize: 28 * f, fontWeight: 600, letterSpacing: 12 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.12, y: h * 0.34, w: w * 0.76, h: h * 0.22, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 88 * f, fontWeight: 700, lineHeight: 1.2 }),
      line({ x: (w - 120 * f) / 2, y: h * 0.6, w: 120 * f, stroke: P.acc, strokeWidth: 2 * f }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.16, y: h * 0.65, w: w * 0.68, h: h * 0.12, text: C.sous, color: P.sub, fontSize: 34 * f, fontWeight: 400, lineHeight: 1.5, italic: true })] : []),
      ...(C.meta ? [text({ name: "Méta", x: w * 0.16, y: h * 0.8, w: w * 0.68, h: 50 * f, text: C.meta, color: P.ink, fontSize: 30 * f, fontWeight: 600, letterSpacing: 4 * f })] : []),
    ],
  }),

  /* Un chiffre qui occupe la moitié de la page. */
  chiffre: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 135, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Éclat", shape: "sparkle", x: w * 0.06, y: h * 0.07, w: 150 * f, h: 150 * f, fill: P.acc2, rotation: 15 }),
      shape({ name: "Éclat 2", shape: "sparkle", x: w * 0.8, y: h * 0.78, w: 110 * f, h: 110 * f, fill: P.acc2, rotation: -12, opacity: 0.85 }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.19, w: w * 0.8, h: 60 * f, text: C.sur, color: P.sub, fontSize: 34 * f, fontWeight: 700, letterSpacing: 10 * f, uppercase: true })] : []),
      text({ name: "Chiffre", x: w * 0.05, y: h * 0.28, w: w * 0.9, h: h * 0.3, text: C.gros ?? C.titre ?? "", color: P.ink, fontFamily: font(14), fontSize: 260 * f, fontWeight: 900, shadow: ombre(44 * f, 0.35, 16 * f) }),
      text({ name: "Titre", x: w * 0.12, y: h * 0.62, w: w * 0.76, h: h * 0.12, text: C.titre ?? "", color: P.ink, fontSize: 46 * f, fontWeight: 700 }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.72, w: w * 0.72, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500 })] : []),
      ...(C.cta ? [
        shape({ name: "Bouton", x: (w - w * 0.42) / 2, y: h * 0.82, w: w * 0.42, h: 96 * f, fill: P.acc, radius: 60 * f, shadow: ombre(34 * f, 0.35, 12 * f) }),
        text({ name: "CTA", x: (w - w * 0.42) / 2, y: h * 0.82 + 26 * f, w: w * 0.42, h: 50 * f, text: C.cta, color: sur(P.acc), fontSize: 34 * f, fontWeight: 800 }),
      ] : []),
    ],
  }),

  /* Citation : guillemet géant, texte en italique, auteur. */
  citation: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "radial", angle: 0, from: P.bg2, to: P.bg } : null,
    layers: [
      text({ name: "Guillemet", x: w * 0.08, y: h * 0.12, w: w * 0.3, h: h * 0.25, text: "“", color: P.acc, fontFamily: font(10), fontSize: 300 * f, fontWeight: 900, align: "left", opacity: 0.5 }),
      text({ name: "Citation", x: w * 0.1, y: h * 0.34, w: w * 0.8, h: h * 0.3, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 72 * f, fontWeight: 700, italic: true, lineHeight: 1.3 }),
      line({ x: (w - 140 * f) / 2, y: h * 0.7, w: 140 * f, stroke: P.acc, strokeWidth: 6 * f }),
      text({ name: "Auteur", x: w * 0.15, y: h * 0.75, w: w * 0.7, h: 60 * f, text: C.auteur ?? "— VOTRE NOM", color: P.acc, fontSize: 30 * f, fontWeight: 700, letterSpacing: 6 * f, uppercase: true }),
      ...(C.sous ? [text({ name: "Rôle", x: w * 0.15, y: h * 0.82, w: w * 0.7, h: 50 * f, text: C.sous, color: P.sub, fontSize: 26 * f, fontWeight: 500 })] : []),
    ],
  }),

  /* Liste numérotée : conseils, étapes, arguments. */
  liste: ({ w, h, P, C, f }) => {
    const it = C.items ?? [];
    const y0 = h * 0.32, dy = (h * 0.52) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Filet haut", x: 0, y: 0, w, h: 14 * f, fill: P.acc }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.11, w: w * 0.84, h: 56 * f, text: C.sur, color: P.acc, fontSize: 28 * f, fontWeight: 800, align: "left", letterSpacing: 8 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.07, y: h * 0.17, w: w * 0.86, h: h * 0.13, text: C.titre ?? "", color: P.ink, fontSize: 68 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...it.flatMap((s, i) => [
          shape({ name: `Puce ${i + 1}`, shape: "ellipse", x: w * 0.08, y: y0 + i * dy, w: 62 * f, h: 62 * f, fill: P.acc }),
          text({ name: `N° ${i + 1}`, x: w * 0.08, y: y0 + i * dy + 13 * f, w: 62 * f, h: 40 * f, text: String(i + 1), color: P.on, fontSize: 32 * f, fontWeight: 900 }),
          text({ name: `Item ${i + 1}`, x: w * 0.08 + 86 * f, y: y0 + i * dy + 6 * f, w: w * 0.84 - 86 * f, h: dy * 0.8, text: s, color: P.ink, fontSize: 36 * f, fontWeight: 600, align: "left", lineHeight: 1.3 }),
        ]),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.08, y: h * 0.9, w: w * 0.84, h: 50 * f, text: C.meta, color: P.sub, fontSize: 28 * f, fontWeight: 600, align: "left" })] : []),
      ],
    };
  },

  /* Trois cartes côte à côte : offres, services, formules. */
  cartes: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 3);
    const cw = (w * 0.86 - 2 * w * 0.03) / Math.max(1, it.length), x0 = w * 0.07;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 160, from: P.bg, to: P.bg2 } : null,
      layers: [
        text({ name: "Titre", x: w * 0.08, y: h * 0.12, w: w * 0.84, h: h * 0.12, text: C.titre ?? "", color: P.ink, fontSize: 66 * f, fontWeight: 900, lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.26, w: w * 0.72, h: h * 0.08, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500 })] : []),
        ...it.flatMap((s, i) => {
          const x = x0 + i * (cw + w * 0.03);
          const [t, d] = s.split("|");
          return [
            shape({ name: `Carte ${i + 1}`, x, y: h * 0.4, w: cw, h: h * 0.38, fill: i === 1 ? P.acc : P.bg, gradient: i === 1 ? { type: "linear", angle: 160, from: P.acc, to: P.acc2 } : null, radius: 32 * f, stroke: P.acc, strokeWidth: i === 1 ? 0 : 2 * f, shadow: ombre(40 * f, 0.18, 16 * f) }),
            text({ name: `Titre ${i + 1}`, x, y: h * 0.46, w: cw, h: 70 * f, text: t ?? "", color: i === 1 ? P.on : P.ink, fontSize: 40 * f, fontWeight: 800 }),
            text({ name: `Détail ${i + 1}`, x: x + cw * 0.08, y: h * 0.56, w: cw * 0.84, h: h * 0.18, text: d ?? "", color: i === 1 ? P.on : P.sub, fontSize: 26 * f, fontWeight: 500, lineHeight: 1.45 }),
          ];
        }),
      ],
    };
  },

  /* Carte d'événement : grande date, détails, appel. */
  evenement: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 180, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Astre", shape: "ellipse", x: w * 0.62, y: h * 0.06, w: w * 0.24, h: w * 0.24, fill: P.acc, gradient: { type: "radial", angle: 0, from: P.acc2, to: P.acc }, shadow: ombre(80 * f, 0.55, 0, P.acc) }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.3, w: w * 0.8, h: 60 * f, text: C.sur, color: P.sub, fontSize: 36 * f, fontWeight: 700, letterSpacing: 12 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.07, y: h * 0.37, w: w * 0.86, h: h * 0.2, text: C.titre ?? "", color: P.ink, fontFamily: font(13), fontSize: 104 * f, fontWeight: 900, lineHeight: 1.1, uppercase: true }),
      line({ x: (w - 220 * f) / 2, y: h * 0.62, w: 220 * f, stroke: P.acc, strokeWidth: 5 * f }),
      shape({ name: "Carte", x: w * 0.14, y: h * 0.68, w: w * 0.72, h: h * 0.16, fill: P.acc, radius: 28 * f, opacity: 0.14, stroke: P.acc, strokeWidth: 2 * f }),
      text({ name: "Date", x: w * 0.14, y: h * 0.71, w: w * 0.72, h: 56 * f, text: C.meta ?? "VENDREDI 20 SEPTEMBRE — 19H", color: P.ink, fontSize: 34 * f, fontWeight: 700, letterSpacing: 2 * f }),
      ...(C.sous ? [text({ name: "Lieu", x: w * 0.14, y: h * 0.77, w: w * 0.72, h: 50 * f, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500 })] : []),
      ...(C.cta ? [text({ name: "CTA", x: w * 0.2, y: h * 0.9, w: w * 0.6, h: 50 * f, text: C.cta, color: P.acc, fontSize: 30 * f, fontWeight: 700 })] : []),
    ],
  }),

  /* Grille tarifaire : prix géant, liste d'inclusions. */
  tarif: ({ w, h, P, C, f }) => {
    const it = C.items ?? [];
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Carte", x: w * 0.1, y: h * 0.08, w: w * 0.8, h: h * 0.84, fill: P.bg, radius: 40 * f, stroke: P.acc, strokeWidth: 3 * f, shadow: ombre(50 * f, 0.16, 20 * f) }),
        shape({ name: "Chapeau", x: w * 0.1, y: h * 0.08, w: w * 0.8, h: h * 0.2, fill: P.acc, gradient: { type: "linear", angle: 135, from: P.acc, to: P.acc2 }, radius: 40 * f }),
        text({ name: "Formule", x: w * 0.1, y: h * 0.13, w: w * 0.8, h: 70 * f, text: C.sur ?? "FORMULE", color: sur(P.acc), fontSize: 38 * f, fontWeight: 800, letterSpacing: 6 * f, uppercase: true }),
        text({ name: "Prix", x: w * 0.1, y: h * 0.31, w: w * 0.8, h: h * 0.14, text: C.gros ?? "49 €", color: P.ink, fontFamily: font(13), fontSize: 140 * f, fontWeight: 900 }),
        text({ name: "Période", x: w * 0.1, y: h * 0.45, w: w * 0.8, h: 50 * f, text: C.sous ?? "par mois, sans engagement", color: P.sub, fontSize: 28 * f, fontWeight: 500 }),
        ...it.slice(0, 5).map((s, i) => text({ name: `Inclus ${i + 1}`, x: w * 0.16, y: h * 0.53 + i * h * 0.065, w: w * 0.68, h: 54 * f, text: `✓  ${s}`, color: P.ink, fontSize: 28 * f, fontWeight: 500, align: "left" })),
        ...(C.cta ? [
          shape({ name: "Bouton", x: w * 0.18, y: h * 0.82, w: w * 0.64, h: 92 * f, fill: P.acc, radius: 50 * f }),
          text({ name: "CTA", x: w * 0.18, y: h * 0.82 + 26 * f, w: w * 0.64, h: 50 * f, text: C.cta, color: sur(P.acc), fontSize: 32 * f, fontWeight: 800 }),
        ] : []),
      ],
    };
  },

  /* Carte de menu : lignes de plats et de prix. */
  menu: ({ w, h, P, C, f }) => {
    const it = C.items ?? [];
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Filet", x: w * 0.08, y: h * 0.06, w: w * 0.84, h: h * 0.88, fill: "transparent", stroke: P.acc, strokeWidth: 2 * f }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.12, y: h * 0.12, w: w * 0.76, h: 50 * f, text: C.sur, color: P.acc, fontSize: 26 * f, fontWeight: 600, letterSpacing: 12 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.12, y: h * 0.17, w: w * 0.76, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 82 * f, fontWeight: 700 }),
        line({ x: w * 0.35, y: h * 0.28, w: w * 0.3, stroke: P.acc, strokeWidth: 2 * f }),
        ...it.slice(0, 6).flatMap((s, i) => {
          const [nom, prix] = s.split("|");
          const y = h * 0.34 + i * h * 0.095;
          return [
            text({ name: `Plat ${i + 1}`, x: w * 0.13, y, w: w * 0.55, h: 50 * f, text: nom ?? "", color: P.ink, fontSize: 34 * f, fontWeight: 700, align: "left" }),
            text({ name: `Prix ${i + 1}`, x: w * 0.68, y, w: w * 0.19, h: 50 * f, text: prix ?? "", color: lis(P.acc, P.bg, P.ink), fontSize: 34 * f, fontWeight: 800, align: "right" }),
            line({ x: w * 0.13, y: y + 62 * f, w: w * 0.74, stroke: P.sub, strokeWidth: 1 * f, dash: "dotted", opacity: 0.5 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.12, y: h * 0.88, w: w * 0.76, h: 46 * f, text: C.meta, color: P.sub, fontSize: 24 * f, fontWeight: 500, letterSpacing: 3 * f })] : []),
      ],
    };
  },

  /* Miniature vidéo : texte épais cerné, rond portrait. */
  miniature: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: { type: "linear", angle: 115, from: P.bg, to: P.bg2 ?? P.bg },
    layers: [
      shape({ name: "Diagonale", x: -w * 0.2, y: -h * 0.2, w: w * 0.55, h: h * 1.5, fill: P.acc, rotation: 18, gradient: { type: "linear", angle: 160, from: P.acc, to: P.acc2 }, shadow: ombre(60 * f, 0.5, 0) }),
      shape({ name: "Rond", shape: "ellipse", x: w * 0.05, y: h * 0.2, w: h * 0.6, h: h * 0.6, fill: P.acc2, stroke: P.ink, strokeWidth: 10 * f, shadow: ombre(40 * f, 0.45, 10 * f) }),
      ...(C.emoji ? [text({ name: "Emoji", x: w * 0.05, y: h * 0.3, w: h * 0.6, h: h * 0.4, text: C.emoji, fontSize: h * 0.32, fontWeight: 400 })] : []),
      text({ name: "Titre", x: w * 0.45, y: h * 0.16, w: w * 0.52, h: h * 0.5, text: C.titre ?? "", color: P.ink, fontFamily: font(14), fontSize: 84 * f, fontWeight: 900, align: "left", lineHeight: 1.06, uppercase: true, strokeColor: P.bg, strokeWidth: 5 * f, shadow: ombre(0, 0.6, 8 * f) }),
      ...(C.meta ? [
        shape({ name: "Badge", x: w * 0.45, y: h * 0.74, w: w * 0.26, h: 88 * f, fill: P.acc2, radius: 16 * f, rotation: -3 }),
        text({ name: "Badge txt", x: w * 0.45, y: h * 0.74 + 22 * f, w: w * 0.26, h: 50 * f, text: C.meta, color: sur(P.acc2), fontSize: 36 * f, fontWeight: 800, rotation: -3 }),
      ] : []),
    ],
  }),

  /* Bannière large : identité à gauche, appel à droite. */
  banniere: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 120, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Cercle", shape: "ellipse", x: w * 0.72, y: -h * 0.4, w: h * 1.6, h: h * 1.6, fill: P.acc, opacity: 0.18 }),
      shape({ name: "Pastille", shape: "ellipse", x: w * 0.05, y: h * 0.26, w: h * 0.48, h: h * 0.48, fill: P.acc, gradient: { type: "linear", angle: 135, from: P.acc, to: P.acc2 } }),
      ...(C.gros ? [text({ name: "Sigle", x: w * 0.05, y: h * 0.36, w: h * 0.48, h: h * 0.3, text: C.gros, color: sur(P.acc), fontFamily: font(13), fontSize: h * 0.24, fontWeight: 900 })] : []),
      text({ name: "Titre", x: w * 0.05 + h * 0.6, y: h * 0.3, w: w * 0.5, h: h * 0.24, text: C.titre ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.05 + h * 0.6, y: h * 0.58, w: w * 0.46, h: h * 0.18, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500, align: "left" })] : []),
      ...(C.cta ? [
        shape({ name: "Bouton", x: w * 0.76, y: h * 0.4, w: w * 0.18, h: h * 0.2, fill: P.acc, radius: 60 * f, shadow: ombre(30 * f, 0.3, 10 * f) }),
        text({ name: "CTA", x: w * 0.76, y: h * 0.45, w: w * 0.18, h: h * 0.1, text: C.cta, color: sur(P.acc), fontSize: 30 * f, fontWeight: 800 }),
      ] : []),
    ],
  }),

  /* Carte de visite : bande latérale, coordonnées. */
  visite: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Bande", x: 0, y: 0, w: w * 0.32, h, fill: P.ink, gradient: { type: "linear", angle: 160, from: P.ink, to: P.sub } }),
      shape({ name: "Accent", x: w * 0.3, y: 0, w: w * 0.024, h, fill: P.acc, gradient: { type: "linear", angle: 180, from: P.acc, to: P.acc2 } }),
      text({ name: "Sigle", x: w * 0.06, y: h * 0.36, w: w * 0.2, h: h * 0.24, text: C.gros ?? "TX", color: P.bg, fontFamily: font(13), fontSize: 120 * f, fontWeight: 900 }),
      text({ name: "Nom", x: w * 0.38, y: h * 0.26, w: w * 0.56, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontSize: 66 * f, fontWeight: 800, align: "left" }),
      text({ name: "Rôle", x: w * 0.38, y: h * 0.42, w: w * 0.56, h: 54 * f, text: C.sur ?? "", color: P.acc, fontSize: 26 * f, fontWeight: 700, align: "left", letterSpacing: 5 * f, uppercase: true }),
      line({ x: w * 0.38, y: h * 0.56, w: w * 0.5, stroke: P.sub, strokeWidth: 2 * f, opacity: 0.4 }),
      text({ name: "Contact", x: w * 0.38, y: h * 0.62, w: w * 0.56, h: h * 0.3, text: C.sous ?? "", color: P.sub, fontSize: 28 * f, fontWeight: 500, align: "left", lineHeight: 1.6 }),
    ],
  }),

  /* Certificat : double filet, sceau, signature. */
  certificat: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Cadre", x: w * 0.05, y: h * 0.06, w: w * 0.9, h: h * 0.88, fill: "transparent", stroke: P.acc, strokeWidth: 6 * f }),
      shape({ name: "Cadre fin", x: w * 0.07, y: h * 0.082, w: w * 0.86, h: h * 0.836, fill: "transparent", stroke: P.acc, strokeWidth: 2 * f, opacity: 0.6 }),
      text({ name: "Sur", x: w * 0.12, y: h * 0.16, w: w * 0.76, h: 60 * f, text: C.sur ?? "CERTIFICAT", color: lis(P.acc, P.bg, P.ink), fontSize: 34 * f, fontWeight: 700, letterSpacing: 14 * f, uppercase: true }),
      text({ name: "Objet", x: w * 0.12, y: h * 0.24, w: w * 0.76, h: h * 0.09, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 62 * f, fontWeight: 700 }),
      text({ name: "Mention", x: w * 0.16, y: h * 0.38, w: w * 0.68, h: 60 * f, text: "décerné à", color: P.sub, fontSize: 30 * f, fontWeight: 400, italic: true }),
      text({ name: "Nom", x: w * 0.1, y: h * 0.44, w: w * 0.8, h: h * 0.1, text: C.auteur ?? "PRÉNOM NOM", color: P.ink, fontFamily: font(16), fontSize: 92 * f, fontWeight: 700 }),
      line({ x: w * 0.28, y: h * 0.57, w: w * 0.44, stroke: P.acc, strokeWidth: 2 * f }),
      ...(C.sous ? [text({ name: "Motif", x: w * 0.16, y: h * 0.62, w: w * 0.68, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 28 * f, fontWeight: 500, lineHeight: 1.5 })] : []),
      shape({ name: "Sceau", shape: "seal", x: w * 0.72, y: h * 0.72, w: 150 * f, h: 150 * f, fill: P.acc, opacity: 0.9 }),
      line({ x: w * 0.14, y: h * 0.84, w: w * 0.28, stroke: P.ink, strokeWidth: 2 * f }),
      text({ name: "Signature", x: w * 0.14, y: h * 0.855, w: w * 0.28, h: 46 * f, text: C.meta ?? "Signature", color: P.sub, fontSize: 24 * f, fontWeight: 500 }),
    ],
  }),

  /* Statistiques : trois pavés chiffrés. */
  stats: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 3);
    const cw = (w * 0.86 - 2 * w * 0.025) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 150, from: P.bg, to: P.bg2 } : null,
      layers: [
        ...(C.sur ? [text({ name: "Sur", x: w * 0.07, y: h * 0.14, w: w * 0.86, h: 56 * f, text: C.sur, color: P.acc, fontSize: 28 * f, fontWeight: 800, align: "left", letterSpacing: 8 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.07, y: h * 0.2, w: w * 0.86, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontSize: 66 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...it.flatMap((s, i) => {
          const [n, lab] = s.split("|");
          const x = w * 0.07 + i * (cw + w * 0.025);
          return [
            shape({ name: `Pavé ${i + 1}`, x, y: h * 0.46, w: cw, h: h * 0.3, fill: P.acc, opacity: 0.12, radius: 28 * f }),
            text({ name: `Chiffre ${i + 1}`, x, y: h * 0.51, w: cw, h: h * 0.12, text: n ?? "", color: P.acc, fontFamily: font(13), fontSize: 84 * f, fontWeight: 900 }),
            text({ name: `Libellé ${i + 1}`, x: x + cw * 0.06, y: h * 0.65, w: cw * 0.88, h: h * 0.08, text: lab ?? "", color: P.sub, fontSize: 26 * f, fontWeight: 600, lineHeight: 1.3 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.85, w: w * 0.86, h: 50 * f, text: C.meta, color: P.sub, fontSize: 26 * f, fontWeight: 500, align: "left" })] : []),
      ],
    };
  },

  /* Témoignage : rond portrait, texte, étoiles. */
  temoignage: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Carte", x: w * 0.08, y: h * 0.14, w: w * 0.84, h: h * 0.72, fill: P.acc, opacity: 0.1, radius: 40 * f }),
      shape({ name: "Portrait", shape: "ellipse", x: (w - 170 * f) / 2, y: h * 0.2, w: 170 * f, h: 170 * f, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 } }),
      ...(C.emoji ? [text({ name: "Emoji", x: (w - 170 * f) / 2, y: h * 0.23, w: 170 * f, h: 120 * f, text: C.emoji, fontSize: 100 * f, fontWeight: 400 })] : []),
      text({ name: "Étoiles", x: w * 0.2, y: h * 0.42, w: w * 0.6, h: 60 * f, text: "★★★★★", color: lis(P.acc2, P.bg, P.ink), fontSize: 42 * f, fontWeight: 700, letterSpacing: 6 * f }),
      text({ name: "Avis", x: w * 0.14, y: h * 0.5, w: w * 0.72, h: h * 0.2, text: C.titre ?? "", color: P.ink, fontSize: 42 * f, fontWeight: 500, italic: true, lineHeight: 1.4 }),
      text({ name: "Nom", x: w * 0.2, y: h * 0.74, w: w * 0.6, h: 56 * f, text: C.auteur ?? "Camille D.", color: P.ink, fontSize: 32 * f, fontWeight: 800 }),
      ...(C.sous ? [text({ name: "Rôle", x: w * 0.2, y: h * 0.79, w: w * 0.6, h: 46 * f, text: C.sous, color: P.sub, fontSize: 26 * f, fontWeight: 500 })] : []),
    ],
  }),

  /* Étapes reliées : parcours, méthode, tunnel. */
  etapes: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 4);
    const y0 = h * 0.34, dy = (h * 0.5) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Titre", x: w * 0.08, y: h * 0.14, w: w * 0.84, h: h * 0.12, text: C.titre ?? "", color: P.ink, fontSize: 66 * f, fontWeight: 900, lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.26, w: w * 0.72, h: 60 * f, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500 })] : []),
        /* Rail vertical : un calque « ligne » se trace horizontalement dans sa
           boîte, le faire pivoter obligerait à recalculer son centre — un
           rectangle fin dit la même chose sans ce détour. */
        ...(it.length > 1 ? [shape({ name: "Rail", x: w * 0.09 + 38 * f, y: y0 + 40 * f, w: 4 * f, h: dy * (it.length - 1), fill: P.acc, opacity: 0.4 })] : []),
        ...it.flatMap((s, i) => {
          const [t, d] = s.split("|");
          const y = y0 + i * dy;
          return [
            shape({ name: `Rond ${i + 1}`, shape: "ellipse", x: w * 0.09, y, w: 80 * f, h: 80 * f, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 }, shadow: ombre(20 * f, 0.25, 8 * f) }),
            text({ name: `N° ${i + 1}`, x: w * 0.09, y: y + 20 * f, w: 80 * f, h: 46 * f, text: String(i + 1), color: P.on, fontSize: 36 * f, fontWeight: 900 }),
            text({ name: `Étape ${i + 1}`, x: w * 0.09 + 110 * f, y: y + 2 * f, w: w * 0.82 - 110 * f, h: 56 * f, text: t ?? "", color: P.ink, fontSize: 38 * f, fontWeight: 800, align: "left" }),
            text({ name: `Détail ${i + 1}`, x: w * 0.09 + 110 * f, y: y + 52 * f, w: w * 0.82 - 110 * f, h: dy * 0.5, text: d ?? "", color: P.sub, fontSize: 28 * f, fontWeight: 500, align: "left", lineHeight: 1.35 }),
          ];
        }),
      ],
    };
  },

  /* Pastille de remise, façon autocollant. */
  pastille: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 135, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Sceau", shape: "seal", x: (w - Math.min(w, h) * 0.6) / 2, y: h * 0.18, w: Math.min(w, h) * 0.6, h: Math.min(w, h) * 0.6, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 }, shadow: ombre(50 * f, 0.35, 18 * f) }),
      text({ name: "Remise", x: w * 0.2, y: h * 0.32, w: w * 0.6, h: h * 0.18, text: C.gros ?? "-40%", color: sur(P.acc), fontFamily: font(14), fontSize: 150 * f, fontWeight: 900 }),
      text({ name: "Mention", x: w * 0.24, y: h * 0.5, w: w * 0.52, h: 60 * f, text: C.sur ?? "SUR TOUT LE SITE", color: sur(P.acc), fontSize: 30 * f, fontWeight: 700, letterSpacing: 5 * f, uppercase: true }),
      text({ name: "Titre", x: w * 0.1, y: h * 0.74, w: w * 0.8, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 52 * f, fontWeight: 900 }),
      ...(C.meta ? [text({ name: "Code", x: w * 0.2, y: h * 0.86, w: w * 0.6, h: 56 * f, text: C.meta, color: P.sub, fontSize: 30 * f, fontWeight: 700, letterSpacing: 6 * f })] : []),
    ],
  }),

  /* Couverture éditoriale : filet, gros titre, mention basse. */
  couverture: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 200, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Voile", x: 0, y: h * 0.55, w, h: h * 0.45, fill: P.acc, opacity: 0.16 }),
      shape({ name: "Filet", x: w * 0.1, y: h * 0.1, w: w * 0.8, h: 6 * f, fill: P.acc }),
      ...(C.sur ? [text({ name: "Collection", x: w * 0.1, y: h * 0.13, w: w * 0.8, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 700, letterSpacing: 10 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.08, y: h * 0.24, w: w * 0.84, h: h * 0.28, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 116 * f, fontWeight: 900, lineHeight: 1.08 }),
      ...(C.sous ? [text({ name: "Accroche", x: w * 0.12, y: h * 0.58, w: w * 0.76, h: h * 0.12, text: C.sous, color: P.sub, fontSize: 36 * f, fontWeight: 400, italic: true, lineHeight: 1.4 })] : []),
      line({ x: w * 0.35, y: h * 0.76, w: w * 0.3, stroke: P.acc, strokeWidth: 3 * f }),
      text({ name: "Auteur", x: w * 0.12, y: h * 0.82, w: w * 0.76, h: 60 * f, text: C.auteur ?? "PRÉNOM NOM", color: P.ink, fontSize: 34 * f, fontWeight: 700, letterSpacing: 8 * f, uppercase: true }),
    ],
  }),

  /* Mosaïque de pavés colorés, titre par-dessus. */
  mosaique: ({ w, h, P, C, f }) => {
    const cols = 4, rows = 4, cw = w / cols, ch = h / rows;
    const teintes = [P.acc, P.acc2, P.sub, P.acc, P.acc2];
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...Array.from({ length: cols * rows }, (_, i) =>
          shape({ name: `Pavé ${i + 1}`, x: (i % cols) * cw, y: ((i / cols) | 0) * ch, w: cw, h: ch, fill: teintes[(i * 3 + ((i / cols) | 0)) % teintes.length], opacity: 0.25 + ((i * 7) % 5) * 0.13 })),
        shape({ name: "Carte", x: w * 0.1, y: h * 0.32, w: w * 0.8, h: h * 0.36, fill: P.bg, radius: 32 * f, stroke: P.acc, strokeWidth: 2 * f, shadow: ombre(60 * f, 0.35, 20 * f) }),
        text({ name: "Titre", x: w * 0.13, y: h * 0.38, w: w * 0.74, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontSize: 66 * f, fontWeight: 900, lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.15, y: h * 0.55, w: w * 0.7, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500 })] : []),
      ],
    };
  },

  /* Rayons rétro partant du centre. */
  retro: ({ w, h, P, C, f }) => {
    const n = 12, d = Math.max(w, h) * 1.6;
    return {
      bg: P.bg, bgg: { type: "radial", angle: 0, from: P.bg2 ?? P.bg, to: P.bg },
      layers: [
        ...Array.from({ length: n }, (_, i) =>
          shape({ name: `Rayon ${i + 1}`, shape: "triangle", x: w / 2 - d * 0.06, y: h / 2 - d / 2, w: d * 0.12, h: d / 2, fill: P.acc, rotation: (i * 360) / n, opacity: i % 2 ? 0.22 : 0.12 })),
        shape({ name: "Disque", shape: "ellipse", x: (w - Math.min(w, h) * 0.62) / 2, y: h * 0.24, w: Math.min(w, h) * 0.62, h: Math.min(w, h) * 0.62, fill: P.bg, stroke: P.acc, strokeWidth: 6 * f }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.2, y: h * 0.35, w: w * 0.6, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, letterSpacing: 8 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.16, y: h * 0.42, w: w * 0.68, h: h * 0.16, text: C.titre ?? "", color: P.ink, fontFamily: font(13), fontSize: 84 * f, fontWeight: 900, lineHeight: 1.1, uppercase: true }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.2, y: h * 0.72, w: w * 0.6, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 600 })] : []),
      ],
    };
  },

  /* Halo lumineux sur fond sombre. */
  neon: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: { type: "radial", angle: 0, from: P.bg2 ?? P.bg, to: P.bg },
    layers: [
      shape({ name: "Halo", shape: "ellipse", x: w * 0.1, y: h * 0.16, w: w * 0.8, h: w * 0.8, fill: P.acc, opacity: 0.2, shadow: ombre(120 * f, 0.8, 0, P.acc) }),
      shape({ name: "Anneau", shape: "ring", x: (w - Math.min(w, h) * 0.56) / 2, y: h * 0.2, w: Math.min(w, h) * 0.56, h: Math.min(w, h) * 0.56, fill: P.acc, gradient: { type: "linear", angle: 135, from: P.acc, to: P.acc2 }, shadow: ombre(60 * f, 0.7, 0, P.acc2) }),
      ...(C.gros ? [text({ name: "Sigle", x: w * 0.25, y: h * 0.32, w: w * 0.5, h: h * 0.16, text: C.gros, color: P.ink, fontFamily: font(13), fontSize: 120 * f, fontWeight: 900 })] : []),
      text({ name: "Titre", x: w * 0.1, y: h * 0.66, w: w * 0.8, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900, letterSpacing: 4 * f, uppercase: true, shadow: ombre(30 * f, 0.7, 0, P.acc) }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.8, w: w * 0.72, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500, letterSpacing: 6 * f })] : []),
    ],
  }),

  /* Formes organiques et typographie douce. */
  organique: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Galet", shape: "ellipse", x: -w * 0.28, y: -h * 0.12, w: w * 0.6, h: w * 0.56, fill: P.acc, opacity: 0.2, rotation: -18 }),
      shape({ name: "Galet 2", shape: "ellipse", x: w * 0.72, y: h * 0.74, w: w * 0.52, h: w * 0.48, fill: P.acc2, opacity: 0.18, rotation: 24 }),
      shape({ name: "Goutte", shape: "drop", x: w * 0.8, y: h * 0.06, w: 110 * f, h: 128 * f, fill: P.acc, opacity: 0.45, rotation: 20 }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.32, w: w * 0.8, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 700, letterSpacing: 9 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.1, y: h * 0.39, w: w * 0.8, h: h * 0.2, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 86 * f, fontWeight: 700, lineHeight: 1.2 }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.15, y: h * 0.63, w: w * 0.7, h: h * 0.12, text: C.sous, color: P.sub, fontSize: 34 * f, fontWeight: 400, lineHeight: 1.45 })] : []),
      ...(C.cta ? [text({ name: "CTA", x: w * 0.2, y: h * 0.82, w: w * 0.6, h: 56 * f, text: C.cta, color: lis(P.acc, P.bg, P.ink), fontSize: 30 * f, fontWeight: 800, letterSpacing: 4 * f, underline: true })] : []),
    ],
  }),

  /* Billet perforé : entrée, bon, coupon. */
  billet: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Billet", x: w * 0.04, y: h * 0.1, w: w * 0.92, h: h * 0.8, fill: P.bg, radius: 26 * f, stroke: P.acc, strokeWidth: 3 * f, shadow: ombre(40 * f, 0.2, 14 * f) }),
      shape({ name: "Souche", x: w * 0.68, y: h * 0.1, w: w * 0.28, h: h * 0.8, fill: P.acc, opacity: 0.12, radius: 26 * f }),
      line({ x: w * 0.68, y: h * 0.1, w: 3 * f, h: h * 0.8, stroke: P.acc, strokeWidth: 3 * f, dash: "dashed", rotation: 90, opacity: 0.7 }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.2, w: w * 0.54, h: 50 * f, text: C.sur, color: P.acc, fontSize: 26 * f, fontWeight: 800, align: "left", letterSpacing: 8 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.08, y: h * 0.3, w: w * 0.56, h: h * 0.2, text: C.titre ?? "", color: P.ink, fontSize: 58 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
      ...(C.meta ? [text({ name: "Infos", x: w * 0.08, y: h * 0.62, w: w * 0.56, h: h * 0.2, text: C.meta, color: P.sub, fontSize: 28 * f, fontWeight: 500, align: "left", lineHeight: 1.5 })] : []),
      text({ name: "Valeur", x: w * 0.68, y: h * 0.36, w: w * 0.28, h: h * 0.2, text: C.gros ?? "N° 042", color: lis(P.acc, P.bg, P.ink), fontFamily: font(13), fontSize: 62 * f, fontWeight: 900 }),
      ...(C.sous ? [text({ name: "Mention", x: w * 0.68, y: h * 0.6, w: w * 0.28, h: 60 * f, text: C.sous, color: P.sub, fontSize: 24 * f, fontWeight: 600 })] : []),
    ],
  }),

  /* Diapositive de présentation : titre à gauche, appui à droite. */
  diapo: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 140, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Bloc", x: w * 0.56, y: 0, w: w * 0.44, h, fill: P.acc, opacity: 0.14 }),
      shape({ name: "Filet", x: w * 0.07, y: h * 0.24, w: 8 * f, h: h * 0.16, fill: P.acc }),
      ...(C.sur ? [text({ name: "Chapitre", x: w * 0.1, y: h * 0.16, w: w * 0.4, h: 56 * f, text: C.sur, color: P.acc, fontSize: 26 * f, fontWeight: 800, align: "left", letterSpacing: 8 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.1, y: h * 0.26, w: w * 0.42, h: h * 0.26, text: C.titre ?? "", color: P.ink, fontSize: 76 * f, fontWeight: 900, align: "left", lineHeight: 1.12 }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.1, y: h * 0.58, w: w * 0.4, h: h * 0.2, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500, align: "left", lineHeight: 1.5 })] : []),
      ...(C.items ?? []).slice(0, 4).map((s, i) => text({
        name: `Point ${i + 1}`, x: w * 0.62, y: h * 0.28 + i * h * 0.12, w: w * 0.32, h: h * 0.1,
        text: `•  ${s}`, color: P.ink, fontSize: 32 * f, fontWeight: 600, align: "left", lineHeight: 1.35,
      })),
      ...(C.meta ? [text({ name: "Pied", x: w * 0.1, y: h * 0.88, w: w * 0.4, h: 46 * f, text: C.meta, color: P.sub, fontSize: 24 * f, fontWeight: 500, align: "left" })] : []),
    ],
  }),

  /* Deux moitiés opposées : avant/après, vrai/faux, A ou B. */
  duo: ({ w, h, P, C, f }) => {
    const [a, b] = (C.items ?? ["Avant|Le problème", "Après|La solution"]).slice(0, 2);
    const [at, ad] = (a ?? "").split("|");
    const [bt, bd] = (b ?? "").split("|");
    const vert = h >= w;
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Moitié A", x: 0, y: 0, w: vert ? w : w / 2, h: vert ? h / 2 : h, fill: P.sub, opacity: 0.18 }),
        shape({ name: "Moitié B", x: vert ? 0 : w / 2, y: vert ? h / 2 : 0, w: vert ? w : w / 2, h: vert ? h / 2 : h, fill: P.acc, gradient: { type: "linear", angle: 150, from: P.acc, to: P.acc2 } }),
        text({ name: "Titre A", x: vert ? w * 0.1 : w * 0.06, y: vert ? h * 0.16 : h * 0.34, w: vert ? w * 0.8 : w * 0.38, h: h * 0.1, text: at ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900 }),
        text({ name: "Détail A", x: vert ? w * 0.14 : w * 0.08, y: vert ? h * 0.28 : h * 0.46, w: vert ? w * 0.72 : w * 0.34, h: h * 0.14, text: ad ?? "", color: P.sub, fontSize: 30 * f, fontWeight: 500, lineHeight: 1.4 }),
        text({ name: "Titre B", x: vert ? w * 0.1 : w * 0.56, y: vert ? h * 0.64 : h * 0.34, w: vert ? w * 0.8 : w * 0.38, h: h * 0.1, text: bt ?? "", color: P.on, fontSize: 62 * f, fontWeight: 900 }),
        text({ name: "Détail B", x: vert ? w * 0.14 : w * 0.58, y: vert ? h * 0.76 : h * 0.46, w: vert ? w * 0.72 : w * 0.34, h: h * 0.14, text: bd ?? "", color: P.on, fontSize: 30 * f, fontWeight: 500, lineHeight: 1.4, opacity: 0.9 }),
        shape({ name: "Pastille", shape: "ellipse", x: (w - 96 * f) / 2, y: (h - 96 * f) / 2, w: 96 * f, h: 96 * f, fill: P.bg, shadow: ombre(24 * f, 0.3, 6 * f) }),
        text({ name: "VS", x: (w - 96 * f) / 2, y: (h - 96 * f) / 2 + 26 * f, w: 96 * f, h: 46 * f, text: C.gros ?? "VS", color: P.ink, fontSize: 32 * f, fontWeight: 900 }),
      ],
    };
  },

  /* Fiche annonce : bandeau, prix, caractéristiques. */
  annonce: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 3);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Visuel", x: 0, y: 0, w, h: h * 0.44, fill: P.acc, gradient: { type: "linear", angle: 145, from: P.acc, to: P.acc2 } }),
        ...(C.emoji ? [text({ name: "Emoji", x: w * 0.3, y: h * 0.1, w: w * 0.4, h: h * 0.24, text: C.emoji, fontSize: Math.min(w, h) * 0.2, fontWeight: 400 })] : []),
        shape({ name: "Étiquette", x: w * 0.06, y: h * 0.38, w: w * 0.34, h: 84 * f, fill: P.bg, radius: 44 * f, shadow: ombre(26 * f, 0.25, 8 * f) }),
        text({ name: "Prix", x: w * 0.06, y: h * 0.38 + 20 * f, w: w * 0.34, h: 54 * f, text: C.gros ?? "129 €", color: lis(P.acc, P.bg, P.ink), fontSize: 40 * f, fontWeight: 900 }),
        text({ name: "Titre", x: w * 0.06, y: h * 0.52, w: w * 0.88, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontSize: 60 * f, fontWeight: 900, align: "left", lineHeight: 1.12 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.06, y: h * 0.66, w: w * 0.86, h: h * 0.08, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500, align: "left" })] : []),
        ...it.map((s, i) => text({ name: `Carac ${i + 1}`, x: w * 0.06, y: h * 0.74 + i * h * 0.058, w: w * 0.86, h: 50 * f, text: `•  ${s}`, color: P.ink, fontSize: 27 * f, fontWeight: 600, align: "left" })),
      ],
    };
  },

  /* CV : colonne latérale et parcours. */
  cv: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 4);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Colonne", x: 0, y: 0, w: w * 0.34, h, fill: P.ink }),
        shape({ name: "Portrait", shape: "ellipse", x: w * 0.08, y: h * 0.06, w: w * 0.18, h: w * 0.18, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 } }),
        text({ name: "Sigle", x: w * 0.08, y: h * 0.06 + w * 0.045, w: w * 0.18, h: w * 0.1, text: C.gros ?? "TX", color: P.on, fontSize: 62 * f, fontWeight: 900 }),
        text({ name: "Nom", x: w * 0.04, y: h * 0.2, w: w * 0.26, h: h * 0.06, text: C.titre ?? "", color: P.bg, fontSize: 42 * f, fontWeight: 900, lineHeight: 1.1 }),
        text({ name: "Rôle", x: w * 0.04, y: h * 0.26, w: w * 0.26, h: 50 * f, text: C.sur ?? "", color: lis(P.acc, P.ink, P.bg), fontSize: 22 * f, fontWeight: 700, letterSpacing: 3 * f, uppercase: true }),
        text({ name: "Contact", x: w * 0.05, y: h * 0.34, w: w * 0.25, h: h * 0.14, text: C.sous ?? "", color: lis(P.sub, P.ink, P.bg), fontSize: 20 * f, fontWeight: 500, align: "left", lineHeight: 1.7 }),
        text({ name: "Section", x: w * 0.4, y: h * 0.08, w: w * 0.5, h: 56 * f, text: C.meta ?? "PARCOURS", color: lis(P.acc, P.bg, P.ink), fontSize: 26 * f, fontWeight: 800, align: "left", letterSpacing: 8 * f, uppercase: true }),
        line({ x: w * 0.4, y: h * 0.13, w: w * 0.52, stroke: P.acc, strokeWidth: 3 * f }),
        ...it.flatMap((s, i) => {
          const [t, d] = s.split("|");
          const y = h * 0.18 + i * h * 0.18;
          return [
            text({ name: `Poste ${i + 1}`, x: w * 0.4, y, w: w * 0.54, h: 54 * f, text: t ?? "", color: P.ink, fontSize: 32 * f, fontWeight: 800, align: "left" }),
            text({ name: `Détail ${i + 1}`, x: w * 0.4, y: y + 46 * f, w: w * 0.54, h: h * 0.1, text: d ?? "", color: P.sub, fontSize: 23 * f, fontWeight: 500, align: "left", lineHeight: 1.5 }),
          ];
        }),
      ],
    };
  },

  /* Logo sur anneau ou bouclier, avec nom sous le signe. */
  embleme: ({ w, h, P, C, f }) => {
    const k = (C.meta as ShapeKind) || "ring";
    const d = Math.min(w, h) * 0.6;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "radial", angle: 0, from: P.bg2, to: P.bg } : null,
      layers: [
        shape({ name: "Signe", shape: k, x: (w - d) / 2, y: h * 0.14, w: d, h: d, fill: P.acc, gradient: { type: "linear", angle: 135, from: P.acc, to: P.acc2 }, shadow: ombre(40 * f, 0.28, 14 * f) }),
        text({ name: "Sigle", x: (w - d) / 2, y: h * 0.14 + d * 0.28, w: d, h: d * 0.4, text: C.gros ?? "TX", color: k === "ring" ? lis(P.ink, P.bg, sur(P.bg)) : sur(P.acc), fontFamily: font(13), fontSize: d * 0.34, fontWeight: 900, letterSpacing: 2 * f }),
        text({ name: "Nom", x: w * 0.08, y: h * 0.79, w: w * 0.84, h: h * 0.08, text: C.titre ?? "", color: P.ink, fontSize: 52 * f, fontWeight: 800, letterSpacing: 10 * f, uppercase: true }),
        ...(C.sous ? [text({ name: "Baseline", x: w * 0.12, y: h * 0.88, w: w * 0.76, h: 50 * f, text: C.sous, color: P.sub, fontSize: 26 * f, fontWeight: 500, letterSpacing: 5 * f })] : []),
      ],
    };
  },

  /* Recrutement : encadré poste, mission, contact. */
  recrute: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 3);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 160, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Étiquette", x: w * 0.08, y: h * 0.12, w: w * 0.42, h: 82 * f, fill: P.acc, radius: 44 * f, rotation: -2 }),
        text({ name: "Nous recrutons", x: w * 0.08, y: h * 0.12 + 20 * f, w: w * 0.42, h: 54 * f, text: C.sur ?? "NOUS RECRUTONS", color: P.on, fontSize: 28 * f, fontWeight: 800, letterSpacing: 4 * f, rotation: -2 }),
        text({ name: "Poste", x: w * 0.07, y: h * 0.26, w: w * 0.86, h: h * 0.18, text: C.titre ?? "", color: P.ink, fontSize: 78 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Contrat", x: w * 0.07, y: h * 0.46, w: w * 0.86, h: 60 * f, text: C.sous, color: lis(P.acc, P.bg, P.ink), fontSize: 32 * f, fontWeight: 700, align: "left" })] : []),
        ...it.map((s, i) => text({ name: `Mission ${i + 1}`, x: w * 0.07, y: h * 0.56 + i * h * 0.075, w: w * 0.86, h: 60 * f, text: `→  ${s}`, color: P.ink, fontSize: 30 * f, fontWeight: 600, align: "left" })),
        ...(C.meta ? [
          shape({ name: "Pied", x: 0, y: h * 0.86, w, h: h * 0.14, fill: P.acc }),
          text({ name: "Contact", x: w * 0.08, y: h * 0.9, w: w * 0.84, h: 60 * f, text: C.meta, color: sur(P.acc), fontSize: 30 * f, fontWeight: 700 }),
        ] : []),
      ],
    };
  },
  /* Grand aplat typographique : le texte EST l'image. */
  typo: ({ w, h, P, C, f }) => ({
    bg: P.acc, bgg: { type: "linear", angle: 150, from: P.acc, to: P.acc2 },
    layers: [
      text({ name: "Titre", x: w * 0.05, y: h * 0.16, w: w * 0.9, h: h * 0.5, text: C.titre ?? "", color: sur(P.acc), fontFamily: font(14), fontSize: 150 * f, fontWeight: 900, align: "left", lineHeight: 0.95, uppercase: true }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.05, y: h * 0.72, w: w * 0.6, h: h * 0.14, text: C.sous, color: sur(P.acc), fontSize: 34 * f, fontWeight: 600, align: "left", lineHeight: 1.4, opacity: 0.9 })] : []),
      ...(C.meta ? [text({ name: "Méta", x: w * 0.05, y: h * 0.88, w: w * 0.9, h: 50 * f, text: C.meta, color: sur(P.acc), fontSize: 26 * f, fontWeight: 700, align: "left", letterSpacing: 8 * f, uppercase: true, opacity: 0.8 })] : []),
    ],
  }),

  /* Fiche recette / mode d'emploi : ingrédients à gauche, étapes à droite. */
  fiche: ({ w, h, P, C, f }) => {
    const it = C.items ?? [];
    const mi = Math.ceil(it.length / 2);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Chapeau", x: 0, y: 0, w, h: h * 0.2, fill: P.acc, gradient: { type: "linear", angle: 130, from: P.acc, to: P.acc2 } }),
        text({ name: "Titre", x: w * 0.06, y: h * 0.06, w: w * 0.88, h: h * 0.1, text: C.titre ?? "", color: sur(P.acc), fontSize: 66 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.06, y: h * 0.155, w: w * 0.88, h: 46 * f, text: C.meta, color: sur(P.acc), fontSize: 26 * f, fontWeight: 600, align: "left", opacity: 0.85 })] : []),
        text({ name: "Colonne A", x: w * 0.06, y: h * 0.26, w: w * 0.4, h: 50 * f, text: C.sur ?? "INGRÉDIENTS", color: lis(P.acc, P.bg, P.ink), fontSize: 24 * f, fontWeight: 800, align: "left", letterSpacing: 6 * f, uppercase: true }),
        text({ name: "Colonne B", x: w * 0.54, y: h * 0.26, w: w * 0.4, h: 50 * f, text: C.sous ?? "PRÉPARATION", color: lis(P.acc, P.bg, P.ink), fontSize: 24 * f, fontWeight: 800, align: "left", letterSpacing: 6 * f, uppercase: true }),
        ...it.slice(0, mi).map((t, i) => text({ name: `A${i}`, x: w * 0.06, y: h * 0.33 + i * h * 0.075, w: w * 0.4, h: 60 * f, text: `•  ${t}`, color: P.ink, fontSize: 27 * f, fontWeight: 500, align: "left", lineHeight: 1.3 })),
        ...it.slice(mi).map((t, i) => text({ name: `B${i}`, x: w * 0.54, y: h * 0.33 + i * h * 0.075, w: w * 0.4, h: 60 * f, text: `${i + 1}.  ${t}`, color: P.ink, fontSize: 27 * f, fontWeight: 500, align: "left", lineHeight: 1.3 })),
        line({ x: w * 0.5, y: h * 0.26, w: 2 * f, h: h * 0.58, stroke: P.sub, strokeWidth: 2 * f, opacity: 0.3, rotation: 90 }),
      ],
    };
  },

  /* Calendrier : une grande date, un mois, des repères. */
  calendrier: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 4);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Fiche", x: w * 0.12, y: h * 0.1, w: w * 0.76, h: h * 0.44, fill: P.bg, radius: 36 * f, stroke: P.acc, strokeWidth: 3 * f, shadow: ombre(40 * f, 0.2, 16 * f) }),
        shape({ name: "Bandeau", x: w * 0.12, y: h * 0.1, w: w * 0.76, h: h * 0.1, fill: P.acc, radius: 36 * f }),
        text({ name: "Mois", x: w * 0.12, y: h * 0.125, w: w * 0.76, h: 60 * f, text: C.sur ?? "JUIN 2026", color: sur(P.acc), fontSize: 34 * f, fontWeight: 800, letterSpacing: 8 * f, uppercase: true }),
        text({ name: "Jour", x: w * 0.12, y: h * 0.235, w: w * 0.76, h: h * 0.2, text: C.gros ?? "12", color: P.ink, fontFamily: font(13), fontSize: 190 * f, fontWeight: 900 }),
        text({ name: "Titre", x: w * 0.1, y: h * 0.6, w: w * 0.8, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 58 * f, fontWeight: 900, lineHeight: 1.1 }),
        ...it.map((t, i) => text({ name: `Info ${i}`, x: w * 0.14, y: h * 0.72 + i * h * 0.06, w: w * 0.72, h: 50 * f, text: t, color: P.sub, fontSize: 28 * f, fontWeight: 500 })),
      ],
    };
  },

  /* Deux colonnes de texte, façon page de magazine. */
  colonnes: ({ w, h, P, C, f }) => {
    const it = C.items ?? [];
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Sur", x: w * 0.07, y: h * 0.09, w: w * 0.86, h: 50 * f, text: C.sur ?? "", color: P.acc, fontSize: 26 * f, fontWeight: 800, align: "left", letterSpacing: 9 * f, uppercase: true }),
        text({ name: "Titre", x: w * 0.06, y: h * 0.15, w: w * 0.88, h: h * 0.16, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 88 * f, fontWeight: 900, align: "left", lineHeight: 1.05 }),
        line({ x: w * 0.07, y: h * 0.34, w: w * 0.86, stroke: P.acc, strokeWidth: 3 * f }),
        ...(C.sous ? [text({ name: "Chapô", x: w * 0.07, y: h * 0.38, w: w * 0.86, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500, align: "left", italic: true, lineHeight: 1.4 })] : []),
        ...it.slice(0, 2).map((t, i) => text({
          name: `Colonne ${i + 1}`, x: w * 0.07 + i * w * 0.45, y: h * 0.52, w: w * 0.41, h: h * 0.36,
          text: t, color: P.ink, fontSize: 25 * f, fontWeight: 400, align: "left", lineHeight: 1.6,
        })),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.92, w: w * 0.86, h: 46 * f, text: C.meta, color: P.sub, fontSize: 22 * f, fontWeight: 600, align: "left", letterSpacing: 4 * f })] : []),
      ],
    };
  },

  /* Trombinoscope : quatre portraits et leurs légendes. */
  equipe: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 4);
    const cols = it.length > 2 ? 2 : it.length || 1;
    const cw = (w * 0.84) / cols, d = Math.min(cw * 0.5, h * 0.14);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 160, from: P.bg, to: P.bg2 } : null,
      layers: [
        text({ name: "Titre", x: w * 0.08, y: h * 0.12, w: w * 0.84, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.23, w: w * 0.72, h: 60 * f, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500 })] : []),
        ...it.flatMap((t, i) => {
          const [nom, role] = t.split("|");
          const x = w * 0.08 + (i % cols) * cw, y = h * 0.34 + ((i / cols) | 0) * h * 0.3;
          return [
            shape({ name: `Portrait ${i + 1}`, shape: "ellipse", x: x + (cw - d) / 2, y, w: d, h: d, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 } }),
            text({ name: `Init ${i + 1}`, x: x + (cw - d) / 2, y: y + d * 0.28, w: d, h: d * 0.5, text: (nom ?? "?").slice(0, 1), color: P.on, fontSize: d * 0.4, fontWeight: 900 }),
            text({ name: `Nom ${i + 1}`, x, y: y + d + 16 * f, w: cw, h: 52 * f, text: nom ?? "", color: P.ink, fontSize: 30 * f, fontWeight: 800 }),
            text({ name: `Rôle ${i + 1}`, x, y: y + d + 60 * f, w: cw, h: 46 * f, text: role ?? "", color: P.sub, fontSize: 24 * f, fontWeight: 500 }),
          ];
        }),
      ],
    };
  },

  /* Question posée en grand, réponse en petit : accroche de carrousel. */
  question: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 200, from: P.bg, to: P.bg2 } : null,
    layers: [
      text({ name: "Point", x: w * 0.06, y: h * 0.1, w: w * 0.4, h: h * 0.3, text: "?", color: P.acc, fontFamily: font(13), fontSize: 320 * f, fontWeight: 900, align: "left", opacity: 0.28 }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.32, w: w * 0.84, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, letterSpacing: 8 * f, uppercase: true })] : []),
      text({ name: "Question", x: w * 0.07, y: h * 0.4, w: w * 0.86, h: h * 0.24, text: C.titre ?? "", color: P.ink, fontSize: 76 * f, fontWeight: 900, lineHeight: 1.15 }),
      line({ x: (w - 130 * f) / 2, y: h * 0.68, w: 130 * f, stroke: P.acc, strokeWidth: 6 * f }),
      ...(C.sous ? [text({ name: "Réponse", x: w * 0.12, y: h * 0.73, w: w * 0.76, h: h * 0.14, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500, lineHeight: 1.45 })] : []),
    ],
  }),

  /* Ruban d'annonce en travers, façon autocollant de vitrine. */
  ruban: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 140, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Ruban", x: -w * 0.1, y: h * 0.36, w: w * 1.2, h: h * 0.22, fill: P.acc, rotation: -8, gradient: { type: "linear", angle: 100, from: P.acc, to: P.acc2 }, shadow: ombre(40 * f, 0.35, 14 * f) }),
      text({ name: "Titre", x: w * 0.05, y: h * 0.41, w: w * 0.9, h: h * 0.13, text: C.titre ?? "", color: P.on, fontFamily: font(14), fontSize: 92 * f, fontWeight: 900, rotation: -8, uppercase: true }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.2, w: w * 0.8, h: 60 * f, text: C.sur, color: P.ink, fontSize: 34 * f, fontWeight: 700, letterSpacing: 9 * f, uppercase: true })] : []),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.12, y: h * 0.66, w: w * 0.76, h: h * 0.12, text: C.sous, color: P.ink, fontSize: 34 * f, fontWeight: 500, lineHeight: 1.4 })] : []),
      ...(C.meta ? [text({ name: "Méta", x: w * 0.15, y: h * 0.84, w: w * 0.7, h: 56 * f, text: C.meta, color: P.sub, fontSize: 28 * f, fontWeight: 700, letterSpacing: 6 * f })] : []),
    ],
  }),

  /* Grille de vignettes : portfolio, avant-goût, sommaire visuel. */
  grille: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 6);
    const cols = 3, cw = (w * 0.86 - 2 * w * 0.02) / cols, chh = Math.min(cw * 0.78, h * 0.22);
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Titre", x: w * 0.07, y: h * 0.1, w: w * 0.86, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900, align: "left" }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.07, y: h * 0.2, w: w * 0.86, h: 56 * f, text: C.sous, color: P.sub, fontSize: 28 * f, fontWeight: 500, align: "left" })] : []),
        ...it.flatMap((t, i) => {
          const x = w * 0.07 + (i % cols) * (cw + w * 0.02);
          const y = h * 0.3 + ((i / cols) | 0) * (chh + h * 0.05);
          return [
            shape({ name: `Vignette ${i + 1}`, x, y, w: cw, h: chh, fill: i % 2 ? P.acc : P.acc2, opacity: 0.85, radius: 20 * f, gradient: { type: "linear", angle: 140 + i * 20, from: i % 2 ? P.acc : P.acc2, to: i % 2 ? P.acc2 : P.acc } }),
            text({ name: `Légende ${i + 1}`, x, y: y + chh + 10 * f, w: cw, h: 46 * f, text: t, color: P.ink, fontSize: 24 * f, fontWeight: 600 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.9, w: w * 0.86, h: 50 * f, text: C.meta, color: lis(P.acc, P.bg, P.ink), fontSize: 26 * f, fontWeight: 700, align: "left" })] : []),
      ],
    };
  },

  /* ═══ Volumes et découpes ═══ */

  /* Une voûte pleine au centre, le texte posé dedans. */
  arche: ({ w, h, P, C, f }) => {
    const aw = Math.min(w * 0.66, h * 0.5), x0 = (w - aw) / 2, y0 = h * 0.1, bas = h * 0.8;
    const t = sur(P.acc);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 165, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Voûte", shape: "ellipse", x: x0, y: y0, w: aw, h: aw, fill: P.acc }),
        shape({ name: "Fût", x: x0, y: y0 + aw / 2, w: aw, h: Math.max(10, bas - y0 - aw / 2), fill: P.acc }),
        ...(C.sur ? [text({ name: "Sur", x: x0, y: y0 + aw * 0.28, w: aw, h: 56 * f, text: C.sur, color: t, fontSize: 27 * f, fontWeight: 700, letterSpacing: 8 * f, uppercase: true, opacity: 0.9 })] : []),
        text({ name: "Titre", x: x0 + aw * 0.08, y: y0 + aw * 0.42, w: aw * 0.84, h: h * 0.2, text: C.titre ?? "", color: t, fontFamily: font(10), fontSize: 62 * f, fontWeight: 800, lineHeight: 1.18 }),
        ...(C.sous ? [text({ name: "Sous", x: x0 + aw * 0.1, y: bas - h * 0.15, w: aw * 0.8, h: h * 0.11, text: C.sous, color: t, fontSize: 26 * f, fontWeight: 500, lineHeight: 1.4, opacity: 0.92 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: h * 0.86, w: w * 0.8, h: 54 * f, text: C.meta, color: P.ink, fontSize: 28 * f, fontWeight: 700, letterSpacing: 6 * f })] : []),
      ],
    };
  },

  /* Deux bandes pleines, haut et bas, le message pris entre les deux. */
  sablier: ({ w, h, P, C, f }) => {
    const t = sur(P.acc);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Bande haute", x: 0, y: 0, w, h: h * 0.19, fill: P.acc }),
        shape({ name: "Bande basse", x: 0, y: h * 0.81, w, h: h * 0.19, fill: P.acc }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.06, w: w * 0.84, h: 62 * f, text: C.sur, color: t, fontSize: 32 * f, fontWeight: 800, letterSpacing: 10 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.08, y: h * 0.31, w: w * 0.84, h: h * 0.22, text: C.titre ?? "", color: P.ink, fontFamily: font(13), fontSize: 88 * f, fontWeight: 900, lineHeight: 1.12 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.58, w: w * 0.72, h: h * 0.14, text: C.sous, color: P.sub, fontSize: 34 * f, fontWeight: 500, lineHeight: 1.45 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.08, y: h * 0.87, w: w * 0.84, h: 58 * f, text: C.meta, color: t, fontSize: 30 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
      ],
    };
  },

  /* Tirage instantané : cadre blanc, marge basse pour la légende. */
  polaroid: ({ w, h, P, C, f }) => {
    const cw = Math.min(w * 0.72, h * 0.58), ch = cw * 1.22, x0 = (w - cw) / 2, y0 = (h - ch) / 2 - h * 0.04;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 150, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Tirage", x: x0, y: y0, w: cw, h: ch, fill: "#ffffff", radius: 6 * f, shadow: ombre(50 * f, 0.38, 22 * f) }),
        shape({ name: "Image", x: x0 + cw * 0.06, y: y0 + cw * 0.06, w: cw * 0.88, h: ch * 0.7, fill: P.acc, gradient: { type: "linear", angle: 150, from: P.acc, to: P.acc2 } }),
        ...(C.emoji ? [text({ name: "Emoji", x: x0 + cw * 0.06, y: y0 + ch * 0.24, w: cw * 0.88, h: cw * 0.4, text: C.emoji, fontSize: cw * 0.3, fontWeight: 400 })] : []),
        ...(C.sur ? [text({ name: "Sur", x: x0 + cw * 0.1, y: y0 + cw * 0.12, w: cw * 0.8, h: 54 * f, text: C.sur, color: sur(P.acc), fontSize: 26 * f, fontWeight: 800, letterSpacing: 7 * f, uppercase: true })] : []),
        text({ name: "Légende", x: x0 + cw * 0.06, y: y0 + ch * 0.79, w: cw * 0.88, h: ch * 0.14, text: C.titre ?? "", color: "#1f2937", fontFamily: font(17), fontSize: 38 * f, fontWeight: 700, lineHeight: 1.2 }),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: y0 + ch + h * 0.04, w: w * 0.8, h: 54 * f, text: C.meta, color: P.sub, fontSize: 28 * f, fontWeight: 600, letterSpacing: 4 * f })] : []),
      ],
    };
  },

  /* Bulle de dialogue : ce qu'on dit, et qui le dit. */
  bulle: ({ w, h, P, C, f }) => {
    const bw = w * 0.84, bh = h * 0.52, x0 = w * 0.08, y0 = h * 0.14;
    const t = sur(P.acc);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 200, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Bulle", shape: "message", x: x0, y: y0, w: bw, h: bh, fill: P.acc, gradient: { type: "linear", angle: 145, from: P.acc, to: P.acc2 }, shadow: ombre(40 * f, 0.3, 16 * f) }),
        ...(C.sur ? [text({ name: "Sur", x: x0 + bw * 0.08, y: y0 + bh * 0.12, w: bw * 0.84, h: 54 * f, text: C.sur, color: t, fontSize: 26 * f, fontWeight: 800, letterSpacing: 7 * f, uppercase: true, opacity: 0.9 })] : []),
        text({ name: "Réplique", x: x0 + bw * 0.08, y: y0 + bh * 0.26, w: bw * 0.84, h: bh * 0.42, text: C.titre ?? "", color: t, fontSize: 52 * f, fontWeight: 800, lineHeight: 1.25 }),
        text({ name: "Nom", x: w * 0.1, y: h * 0.76, w: w * 0.8, h: 60 * f, text: C.auteur ?? "", color: P.ink, fontSize: 34 * f, fontWeight: 800 }),
        ...(C.sous ? [text({ name: "Rôle", x: w * 0.14, y: h * 0.83, w: w * 0.72, h: 54 * f, text: C.sous, color: P.sub, fontSize: 27 * f, fontWeight: 500 })] : []),
      ],
    };
  },

  /* Moitié haute pleine, moitié basse nue : un mot, puis l'explication. */
  demi: ({ w, h, P, C, f }) => {
    const t = sur(P.acc);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Moitié", x: 0, y: 0, w, h: h * 0.5, fill: P.acc, gradient: { type: "linear", angle: 135, from: P.acc, to: P.acc2 } }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.1, w: w * 0.84, h: 58 * f, text: C.sur, color: t, fontSize: 30 * f, fontWeight: 700, letterSpacing: 10 * f, uppercase: true, opacity: 0.88 })] : []),
        text({ name: "Mot", x: w * 0.06, y: h * 0.19, w: w * 0.88, h: h * 0.24, text: C.gros ?? C.titre ?? "", color: t, fontFamily: font(14), fontSize: 128 * f, fontWeight: 900, lineHeight: 1.02, uppercase: true }),
        text({ name: "Titre", x: w * 0.08, y: h * 0.57, w: w * 0.84, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontSize: 56 * f, fontWeight: 800, lineHeight: 1.15 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.12, y: h * 0.72, w: w * 0.76, h: h * 0.12, text: C.sous, color: P.sub, fontSize: 31 * f, fontWeight: 500, lineHeight: 1.45 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.12, y: h * 0.89, w: w * 0.76, h: 52 * f, text: C.meta, color: lis(P.acc, P.bg, P.ink), fontSize: 27 * f, fontWeight: 700 })] : []),
      ],
    };
  },

  /* Barres empilées : une idée par barre, sans hiérarchie inutile. */
  empilement: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 5);
    const y0 = h * 0.27, bh = (h * 0.62) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Titre", x: w * 0.07, y: h * 0.1, w: w * 0.86, h: h * 0.11, text: C.titre ?? "", color: P.ink, fontSize: 64 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.07, y: h * 0.2, w: w * 0.86, h: 56 * f, text: C.sous, color: P.sub, fontSize: 29 * f, fontWeight: 500, align: "left" })] : []),
        ...it.flatMap((s, i) => {
          const c = i % 2 ? P.acc2 : P.acc;
          const y = y0 + i * bh;
          return [
            shape({ name: `Barre ${i + 1}`, x: w * 0.07, y, w: w * 0.86 * (1 - i * 0.06), h: bh * 0.82, fill: c, radius: 14 * f }),
            text({ name: `Ligne ${i + 1}`, x: w * 0.1, y: y + bh * 0.24, w: w * 0.8 * (1 - i * 0.06), h: bh * 0.5, text: s, color: sur(c), fontSize: 32 * f, fontWeight: 700, align: "left" }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.92, w: w * 0.86, h: 50 * f, text: C.meta, color: P.sub, fontSize: 26 * f, fontWeight: 600, align: "left" })] : []),
      ],
    };
  },

  /* Un disque immense derrière le titre : la forme fait tout le travail. */
  disque: ({ w, h, P, C, f }) => {
    const d = Math.min(w, h) * 1.05;
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Disque", shape: "ellipse", x: w * 0.5 - d * 0.42, y: h * 0.5 - d * 0.5, w: d, h: d, fill: P.acc, gradient: { type: "radial", angle: 0, from: P.acc2, to: P.acc } }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.28, w: w * 0.8, h: 58 * f, text: C.sur, color: sur(P.acc), fontSize: 29 * f, fontWeight: 800, letterSpacing: 9 * f, uppercase: true, opacity: 0.9 })] : []),
        text({ name: "Titre", x: w * 0.1, y: h * 0.37, w: w * 0.8, h: h * 0.22, text: C.titre ?? "", color: sur(P.acc), fontFamily: font(5), fontSize: 78 * f, fontWeight: 900, lineHeight: 1.12 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.16, y: h * 0.62, w: w * 0.68, h: h * 0.1, text: C.sous, color: sur(P.acc), fontSize: 30 * f, fontWeight: 500, lineHeight: 1.4, opacity: 0.92 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.5 - d * 0.4, y: h * 0.5 + d * 0.3, w: d * 0.8, h: 52 * f, text: C.meta, color: sur(P.acc), fontSize: 27 * f, fontWeight: 700, letterSpacing: 5 * f, opacity: 0.9 })] : []),
      ],
    };
  },

  /* Avant / après : deux volets, même cadre, verdict en bas. */
  avantapres: ({ w, h, P, C, f }) => {
    const it = C.items ?? [];
    const pw = w * 0.42, y0 = h * 0.26, ph = h * 0.46;
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Titre", x: w * 0.06, y: h * 0.1, w: w * 0.88, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 60 * f, fontWeight: 900, lineHeight: 1.1 }),
        shape({ name: "Avant", x: w * 0.05, y: y0, w: pw, h: ph, fill: P.sub, opacity: 0.28, radius: 24 * f }),
        shape({ name: "Après", x: w * 0.53, y: y0, w: pw, h: ph, fill: P.acc, gradient: { type: "linear", angle: 150, from: P.acc, to: P.acc2 }, radius: 24 * f }),
        text({ name: "Ét. avant", x: w * 0.05, y: y0 + ph * 0.08, w: pw, h: 54 * f, text: C.sur ?? "AVANT", color: P.ink, fontSize: 27 * f, fontWeight: 800, letterSpacing: 7 * f, uppercase: true }),
        text({ name: "Ét. après", x: w * 0.53, y: y0 + ph * 0.08, w: pw, h: 54 * f, text: C.cta ?? "APRÈS", color: sur(P.acc), fontSize: 27 * f, fontWeight: 800, letterSpacing: 7 * f, uppercase: true }),
        text({ name: "Texte avant", x: w * 0.07, y: y0 + ph * 0.32, w: pw - w * 0.04, h: ph * 0.5, text: it[0] ?? "", color: P.ink, fontSize: 30 * f, fontWeight: 600, lineHeight: 1.4 }),
        text({ name: "Texte après", x: w * 0.55, y: y0 + ph * 0.32, w: pw - w * 0.04, h: ph * 0.5, text: it[1] ?? "", color: sur(P.acc), fontSize: 30 * f, fontWeight: 700, lineHeight: 1.4 }),
        ...(C.sous ? [text({ name: "Verdict", x: w * 0.08, y: h * 0.79, w: w * 0.84, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500, lineHeight: 1.4 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.08, y: h * 0.91, w: w * 0.84, h: 50 * f, text: C.meta, color: lis(P.acc, P.bg, P.ink), fontSize: 26 * f, fontWeight: 700 })] : []),
      ],
    };
  },

  /* Promotion chiffrée : ancien prix barré, nouveau prix en grand. */
  promo: ({ w, h, P, C, f }) => {
    const it = C.items ?? [];
    const ancien = it[0] ?? "", nouveau = C.gros ?? "";
    const lw = ancien.length * 30 * f;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 145, from: P.bg, to: P.bg2 } : null,
      layers: [
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.13, w: w * 0.84, h: 60 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 32 * f, fontWeight: 800, letterSpacing: 10 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.07, y: h * 0.21, w: w * 0.86, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontSize: 64 * f, fontWeight: 900, lineHeight: 1.12 }),
        text({ name: "Ancien prix", x: w * 0.07, y: h * 0.42, w: w * 0.86, h: 70 * f, text: ancien, color: P.sub, fontSize: 46 * f, fontWeight: 600 }),
        /* Barré : un calque « ligne » se trace au milieu de sa boîte, donc une
           hauteur nulle le pose exactement sur le y demandé. */
        ...(ancien ? [line({ x: (w - lw) / 2, y: h * 0.42 + 35 * f, w: lw, h: 0, stroke: P.sub, strokeWidth: 5 * f })] : []),
        text({ name: "Nouveau prix", x: w * 0.06, y: h * 0.5, w: w * 0.88, h: h * 0.18, text: nouveau, color: lis(P.acc, P.bg, P.ink), fontFamily: font(13), fontSize: 156 * f, fontWeight: 900, shadow: ombre(30 * f, 0.22, 12 * f) }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.12, y: h * 0.71, w: w * 0.76, h: h * 0.1, text: C.sous, color: P.ink, fontSize: 32 * f, fontWeight: 600, lineHeight: 1.4 })] : []),
        ...(C.meta ? [
          shape({ name: "Bandeau code", x: w * 0.16, y: h * 0.84, w: w * 0.68, h: 88 * f, fill: P.acc, radius: 16 * f }),
          text({ name: "Code", x: w * 0.16, y: h * 0.84 + 24 * f, w: w * 0.68, h: 54 * f, text: C.meta, color: sur(P.acc), fontSize: 30 * f, fontWeight: 800, letterSpacing: 6 * f }),
        ] : []),
      ],
    };
  },

  /* Horaires d'ouverture : une ligne par jour, filet entre chaque. */
  horaires: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 7);
    const y0 = h * 0.3, dy = (h * 0.54) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Cadre", x: w * 0.06, y: h * 0.05, w: w * 0.88, h: h * 0.9, fill: "transparent", stroke: P.acc, strokeWidth: 3 * f, radius: 18 * f }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.12, w: w * 0.8, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 27 * f, fontWeight: 800, letterSpacing: 9 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.1, y: h * 0.18, w: w * 0.8, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 58 * f, fontWeight: 800 }),
        ...it.flatMap((s, i) => {
          const [j, hr] = s.split("|");
          const y = y0 + i * dy;
          return [
            text({ name: `Jour ${i + 1}`, x: w * 0.12, y, w: w * 0.38, h: dy * 0.7, text: j ?? "", color: P.ink, fontSize: 32 * f, fontWeight: 600, align: "left" }),
            text({ name: `Heures ${i + 1}`, x: w * 0.5, y, w: w * 0.38, h: dy * 0.7, text: hr ?? "", color: P.sub, fontSize: 32 * f, fontWeight: 500, align: "right" }),
            ...(i < it.length - 1 ? [line({ x: w * 0.12, y: y + dy * 0.72, w: w * 0.76, stroke: P.sub, strokeWidth: 1.5 * f, opacity: 0.4, dash: "dotted" })] : []),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.1, y: h * 0.87, w: w * 0.8, h: 52 * f, text: C.meta, color: lis(P.acc, P.bg, P.ink), fontSize: 26 * f, fontWeight: 700 })] : []),
      ],
    };
  },

  /* Bloc de contact : quatre lignes, une puce par ligne. */
  contact: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 4);
    const y0 = h * 0.42, dy = (h * 0.4) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 160, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Angle", x: 0, y: 0, w: w * 0.34, h: h * 0.02 + 12 * f, fill: P.acc }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.13, w: w * 0.84, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 27 * f, fontWeight: 800, align: "left", letterSpacing: 9 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.07, y: h * 0.19, w: w * 0.86, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontSize: 66 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.07, y: h * 0.33, w: w * 0.86, h: 58 * f, text: C.sous, color: P.sub, fontSize: 29 * f, fontWeight: 500, align: "left" })] : []),
        ...it.flatMap((s, i) => {
          const y = y0 + i * dy;
          return [
            shape({ name: `Puce ${i + 1}`, shape: "ellipse", x: w * 0.08, y: y + dy * 0.08, w: 44 * f, h: 44 * f, fill: P.acc }),
            text({ name: `Contact ${i + 1}`, x: w * 0.08 + 68 * f, y, w: w * 0.84 - 68 * f, h: dy * 0.8, text: s, color: P.ink, fontSize: 32 * f, fontWeight: 600, align: "left" }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.89, w: w * 0.86, h: 52 * f, text: C.meta, color: P.sub, fontSize: 26 * f, fontWeight: 600, align: "left" })] : []),
      ],
    };
  },

  /* En-tête de papier à lettres : filet, identité, place libre dessous. */
  entete: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Filet", x: 0, y: 0, w, h: 18 * f, fill: P.acc, gradient: { type: "linear", angle: 0, from: P.acc, to: P.acc2 } }),
      text({ name: "Nom", x: w * 0.08, y: h * 0.06, w: w * 0.5, h: h * 0.05, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 46 * f, fontWeight: 800, align: "left", letterSpacing: 3 * f }),
      ...(C.sur ? [text({ name: "Activité", x: w * 0.08, y: h * 0.11, w: w * 0.5, h: 42 * f, text: C.sur, color: lis(P.acc, P.bg, P.sub), fontSize: 22 * f, fontWeight: 700, align: "left", letterSpacing: 5 * f, uppercase: true })] : []),
      ...(C.sous ? [text({ name: "Coordonnées", x: w * 0.5, y: h * 0.06, w: w * 0.42, h: h * 0.09, text: C.sous, color: P.sub, fontSize: 21 * f, fontWeight: 500, align: "right", lineHeight: 1.6 })] : []),
      line({ x: w * 0.08, y: h * 0.17, w: w * 0.84, stroke: P.acc, strokeWidth: 2 * f }),
      ...(C.meta ? [text({ name: "Objet", x: w * 0.08, y: h * 0.22, w: w * 0.84, h: 52 * f, text: C.meta, color: P.ink, fontSize: 26 * f, fontWeight: 700, align: "left" })] : []),
      ...(C.items ?? []).slice(0, 6).map((s, i) => text({ name: `Ligne ${i + 1}`, x: w * 0.08, y: h * 0.29 + i * h * 0.055, w: w * 0.84, h: h * 0.05, text: s, color: P.sub, fontSize: 22 * f, fontWeight: 400, align: "left", lineHeight: 1.6 })),
      line({ x: w * 0.08, y: h * 0.93, w: w * 0.84, stroke: P.sub, strokeWidth: 1 * f, opacity: 0.5 }),
      ...(C.cta ? [text({ name: "Pied", x: w * 0.08, y: h * 0.95, w: w * 0.84, h: 40 * f, text: C.cta, color: P.sub, fontSize: 18 * f, fontWeight: 500 })] : []),
    ],
  }),

  /* Sommaire : intitulé à gauche, page à droite, pointillés entre. */
  sommaire: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 8);
    const y0 = h * 0.3, dy = (h * 0.56) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.12, w: w * 0.8, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 26 * f, fontWeight: 800, align: "left", letterSpacing: 10 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.09, y: h * 0.17, w: w * 0.82, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 66 * f, fontWeight: 800, align: "left" }),
        line({ x: w * 0.1, y: h * 0.27, w: w * 0.8, stroke: P.acc, strokeWidth: 3 * f }),
        ...it.flatMap((s, i) => {
          const [t, p] = s.split("|");
          const y = y0 + i * dy;
          return [
            text({ name: `Entrée ${i + 1}`, x: w * 0.1, y, w: w * 0.6, h: dy * 0.7, text: t ?? "", color: P.ink, fontSize: 30 * f, fontWeight: 600, align: "left" }),
            line({ x: w * 0.1, y: y + dy * 0.42, w: w * 0.8, stroke: P.sub, strokeWidth: 1.5 * f, opacity: 0.35, dash: "dotted" }),
            text({ name: `Page ${i + 1}`, x: w * 0.72, y, w: w * 0.18, h: dy * 0.7, text: p ?? "", color: lis(P.acc, P.bg, P.ink), fontSize: 30 * f, fontWeight: 800, align: "right" }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.1, y: h * 0.9, w: w * 0.8, h: 50 * f, text: C.meta, color: P.sub, fontSize: 24 * f, fontWeight: 500, align: "left" })] : []),
      ],
    };
  },

  /* Ouverture de chapitre : le numéro discret, le titre immense. */
  chapitre: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 200, from: P.bg, to: P.bg2 } : null,
    layers: [
      text({ name: "Numéro fantôme", x: w * 0.5, y: h * 0.04, w: w * 0.46, h: h * 0.4, text: C.gros ?? "", color: P.acc, fontFamily: font(13), fontSize: 300 * f, fontWeight: 900, align: "right", opacity: 0.18 }),
      text({ name: "Chapitre", x: w * 0.09, y: h * 0.3, w: w * 0.82, h: 58 * f, text: C.sur ?? "", color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, align: "left", letterSpacing: 12 * f, uppercase: true }),
      text({ name: "Titre", x: w * 0.08, y: h * 0.37, w: w * 0.84, h: h * 0.26, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 92 * f, fontWeight: 800, align: "left", lineHeight: 1.12 }),
      line({ x: w * 0.09, y: h * 0.68, w: w * 0.22, stroke: P.acc, strokeWidth: 6 * f }),
      ...(C.sous ? [text({ name: "Chapeau", x: w * 0.09, y: h * 0.73, w: w * 0.7, h: h * 0.14, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500, align: "left", lineHeight: 1.5 })] : []),
      ...(C.meta ? [text({ name: "Pied", x: w * 0.09, y: h * 0.92, w: w * 0.82, h: 46 * f, text: C.meta, color: P.sub, fontSize: 22 * f, fontWeight: 600, align: "left", letterSpacing: 4 * f })] : []),
    ],
  }),

  /* Note globale : le chiffre, les étoiles, un avis, la source. */
  notation: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Pavé", x: w * 0.07, y: h * 0.12, w: w * 0.86, h: h * 0.34, fill: P.acc, opacity: 0.14, radius: 32 * f }),
      text({ name: "Note", x: w * 0.09, y: h * 0.16, w: w * 0.36, h: h * 0.22, text: C.gros ?? "4,9", color: lis(P.acc, P.bg, P.ink), fontFamily: font(13), fontSize: 150 * f, fontWeight: 900 }),
      text({ name: "Étoiles", x: w * 0.46, y: h * 0.2, w: w * 0.46, h: 70 * f, text: "★★★★★", color: lis(P.acc2, P.bg, P.ink), fontSize: 46 * f, fontWeight: 700, letterSpacing: 6 * f, align: "left" }),
      ...(C.sur ? [text({ name: "Base", x: w * 0.46, y: h * 0.29, w: w * 0.46, h: 56 * f, text: C.sur, color: P.sub, fontSize: 26 * f, fontWeight: 600, align: "left" })] : []),
      text({ name: "Avis", x: w * 0.09, y: h * 0.54, w: w * 0.82, h: h * 0.22, text: C.titre ?? "", color: P.ink, fontSize: 40 * f, fontWeight: 600, italic: true, align: "left", lineHeight: 1.4 }),
      text({ name: "Auteur", x: w * 0.09, y: h * 0.79, w: w * 0.82, h: 56 * f, text: C.auteur ?? "", color: P.ink, fontSize: 30 * f, fontWeight: 800, align: "left" }),
      ...(C.meta ? [text({ name: "Source", x: w * 0.09, y: h * 0.86, w: w * 0.82, h: 50 * f, text: C.meta, color: P.sub, fontSize: 25 * f, fontWeight: 500, align: "left" })] : []),
    ],
  }),

  /* Comparatif à deux colonnes : la nôtre est celle qui est pleine. */
  comparatif: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 5);
    const cw = w * 0.4, xa = w * 0.06, xb = w * 0.54, y0 = h * 0.36, dy = (h * 0.48) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Titre", x: w * 0.06, y: h * 0.09, w: w * 0.88, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 60 * f, fontWeight: 900, lineHeight: 1.1 }),
        shape({ name: "Colonne A", x: xa, y: h * 0.24, w: cw, h: h * 0.66, fill: P.sub, opacity: 0.14, radius: 24 * f }),
        shape({ name: "Colonne B", x: xb, y: h * 0.22, w: cw, h: h * 0.7, fill: P.acc, gradient: { type: "linear", angle: 165, from: P.acc, to: P.acc2 }, radius: 24 * f, shadow: ombre(36 * f, 0.28, 14 * f) }),
        text({ name: "Titre A", x: xa, y: h * 0.27, w: cw, h: 60 * f, text: C.sur ?? "", color: P.ink, fontSize: 30 * f, fontWeight: 800, uppercase: true, letterSpacing: 3 * f }),
        text({ name: "Titre B", x: xb, y: h * 0.26, w: cw, h: 60 * f, text: C.cta ?? "", color: sur(P.acc), fontSize: 30 * f, fontWeight: 800, uppercase: true, letterSpacing: 3 * f }),
        ...it.flatMap((s, i) => {
          const [a, b] = s.split("|");
          const y = y0 + i * dy;
          return [
            text({ name: `A${i + 1}`, x: xa + cw * 0.06, y, w: cw * 0.88, h: dy * 0.82, text: a ?? "", color: P.ink, fontSize: 25 * f, fontWeight: 500, lineHeight: 1.3 }),
            text({ name: `B${i + 1}`, x: xb + cw * 0.06, y, w: cw * 0.88, h: dy * 0.82, text: b ?? "", color: sur(P.acc), fontSize: 25 * f, fontWeight: 700, lineHeight: 1.3 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.06, y: h * 0.94, w: w * 0.88, h: 46 * f, text: C.meta, color: P.sub, fontSize: 24 * f, fontWeight: 500 })] : []),
      ],
    };
  },

  /* Chronologie horizontale : une ligne, des jalons dessus. */
  chrono: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 4);
    const n = Math.max(1, it.length), pas = (w * 0.84) / n, x0 = w * 0.08 + pas / 2;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 160, from: P.bg, to: P.bg2 } : null,
      layers: [
        text({ name: "Titre", x: w * 0.08, y: h * 0.12, w: w * 0.84, h: h * 0.12, text: C.titre ?? "", color: P.ink, fontSize: 60 * f, fontWeight: 900, lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.26, w: w * 0.72, h: 56 * f, text: C.sous, color: P.sub, fontSize: 28 * f, fontWeight: 500 })] : []),
        shape({ name: "Rail", x: w * 0.08, y: h * 0.52, w: w * 0.84, h: 6 * f, fill: P.acc, opacity: 0.35 }),
        ...it.flatMap((s, i) => {
          const [d, t] = s.split("|");
          const cx = x0 + i * pas;
          return [
            shape({ name: `Jalon ${i + 1}`, shape: "ellipse", x: cx - 26 * f, y: h * 0.52 - 23 * f, w: 52 * f, h: 52 * f, fill: P.acc, shadow: ombre(18 * f, 0.3, 6 * f) }),
            text({ name: `Date ${i + 1}`, x: cx - pas * 0.46, y: h * 0.4, w: pas * 0.92, h: 56 * f, text: d ?? "", color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800 }),
            text({ name: `Jalon txt ${i + 1}`, x: cx - pas * 0.46, y: h * 0.6, w: pas * 0.92, h: h * 0.2, text: t ?? "", color: P.ink, fontSize: 25 * f, fontWeight: 600, lineHeight: 1.35 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.08, y: h * 0.88, w: w * 0.84, h: 50 * f, text: C.meta, color: P.sub, fontSize: 25 * f, fontWeight: 500 })] : []),
      ],
    };
  },

  /* Frise verticale : la date à gauche, l'événement à droite. */
  frise: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 5);
    const y0 = h * 0.28, dy = (h * 0.58) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Titre", x: w * 0.07, y: h * 0.1, w: w * 0.86, h: h * 0.11, text: C.titre ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.07, y: h * 0.21, w: w * 0.86, h: 54 * f, text: C.sous, color: P.sub, fontSize: 28 * f, fontWeight: 500, align: "left" })] : []),
        shape({ name: "Rail", x: w * 0.3, y: y0, w: 4 * f, h: dy * Math.max(0, it.length - 1) + 20 * f, fill: P.acc, opacity: 0.35 }),
        ...it.flatMap((s, i) => {
          const [d, t] = s.split("|");
          const y = y0 + i * dy;
          return [
            text({ name: `Date ${i + 1}`, x: w * 0.06, y, w: w * 0.2, h: 56 * f, text: d ?? "", color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, align: "right" }),
            shape({ name: `Point ${i + 1}`, shape: "ellipse", x: w * 0.3 - 14 * f, y: y + 6 * f, w: 32 * f, h: 32 * f, fill: P.acc }),
            text({ name: `Fait ${i + 1}`, x: w * 0.36, y, w: w * 0.57, h: dy * 0.86, text: t ?? "", color: P.ink, fontSize: 30 * f, fontWeight: 600, align: "left", lineHeight: 1.35 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.92, w: w * 0.86, h: 48 * f, text: C.meta, color: P.sub, fontSize: 25 * f, fontWeight: 500, align: "left" })] : []),
      ],
    };
  },

  /* Volet de carrousel : le rang, l'accroche, la flèche qui invite. */
  carrousel: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 155, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Pastille", x: w * 0.08, y: h * 0.1, w: w * 0.2, h: 70 * f, fill: P.acc, radius: 40 * f }),
      text({ name: "Rang", x: w * 0.08, y: h * 0.1 + 18 * f, w: w * 0.2, h: 44 * f, text: C.meta ?? "1/6", color: sur(P.acc), fontSize: 28 * f, fontWeight: 800 }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.24, w: w * 0.84, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 27 * f, fontWeight: 800, align: "left", letterSpacing: 8 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.07, y: h * 0.31, w: w * 0.86, h: h * 0.26, text: C.titre ?? "", color: P.ink, fontSize: 76 * f, fontWeight: 900, align: "left", lineHeight: 1.14 }),
      ...(C.sous ? [text({ name: "Corps", x: w * 0.07, y: h * 0.6, w: w * 0.8, h: h * 0.2, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500, align: "left", lineHeight: 1.5 })] : []),
      shape({ name: "Flèche", shape: "arrow", x: w * 0.78, y: h * 0.86, w: 90 * f, h: 60 * f, fill: P.acc }),
      ...(C.cta ? [text({ name: "CTA", x: w * 0.07, y: h * 0.87, w: w * 0.6, h: 54 * f, text: C.cta, color: P.ink, fontSize: 28 * f, fontWeight: 700, align: "left" })] : []),
    ],
  }),

  /* Jauge d'avancement : le pourcentage se lit dans la barre. */
  progression: ({ w, h, P, C, f }) => {
    const pct = Math.max(0, Math.min(100, parseInt(C.gros ?? "70", 10) || 70));
    const bw = w * 0.84, bh = 64 * f;
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.16, w: w * 0.84, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, align: "left", letterSpacing: 9 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.07, y: h * 0.23, w: w * 0.86, h: h * 0.16, text: C.titre ?? "", color: P.ink, fontSize: 66 * f, fontWeight: 900, align: "left", lineHeight: 1.12 }),
        shape({ name: "Rail", x: w * 0.08, y: h * 0.5, w: bw, h: bh, fill: P.sub, opacity: 0.22, radius: bh / 2 }),
        shape({ name: "Jauge", x: w * 0.08, y: h * 0.5, w: Math.max(bh, bw * pct / 100), h: bh, fill: P.acc, gradient: { type: "linear", angle: 0, from: P.acc, to: P.acc2 }, radius: bh / 2 }),
        text({ name: "Pourcentage", x: w * 0.08, y: h * 0.59, w: bw, h: h * 0.14, text: `${pct} %`, color: lis(P.acc, P.bg, P.ink), fontFamily: font(13), fontSize: 108 * f, fontWeight: 900, align: "left" }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.08, y: h * 0.75, w: w * 0.84, h: h * 0.12, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500, align: "left", lineHeight: 1.45 })] : []),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.08, y: h * 0.9, w: w * 0.84, h: 50 * f, text: C.meta, color: P.ink, fontSize: 26 * f, fontWeight: 700, align: "left" })] : []),
      ],
    };
  },

  /* Tableau : une ligne d'en-tête, des lignes alternées dessous. */
  tableau: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 7);
    const y0 = h * 0.32, dy = (h * 0.54) / Math.max(1, it.length + 1);
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Titre", x: w * 0.07, y: h * 0.12, w: w * 0.86, h: h * 0.11, text: C.titre ?? "", color: P.ink, fontSize: 60 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.07, y: h * 0.23, w: w * 0.86, h: 54 * f, text: C.sous, color: P.sub, fontSize: 27 * f, fontWeight: 500, align: "left" })] : []),
        shape({ name: "En-tête", x: w * 0.07, y: y0, w: w * 0.86, h: dy * 0.92, fill: P.acc, radius: 12 * f }),
        text({ name: "Col 1", x: w * 0.1, y: y0 + dy * 0.24, w: w * 0.46, h: dy * 0.6, text: (C.sur ?? "|").split("|")[0], color: sur(P.acc), fontSize: 26 * f, fontWeight: 800, align: "left", uppercase: true, letterSpacing: 3 * f }),
        text({ name: "Col 2", x: w * 0.56, y: y0 + dy * 0.24, w: w * 0.34, h: dy * 0.6, text: (C.sur ?? "|").split("|")[1] ?? "", color: sur(P.acc), fontSize: 26 * f, fontWeight: 800, align: "right", uppercase: true, letterSpacing: 3 * f }),
        ...it.flatMap((s, i) => {
          const [a, b] = s.split("|");
          const y = y0 + (i + 1) * dy;
          return [
            ...(i % 2 === 0 ? [shape({ name: `Zèbre ${i + 1}`, x: w * 0.07, y, w: w * 0.86, h: dy * 0.92, fill: P.sub, opacity: 0.12, radius: 8 * f })] : []),
            text({ name: `Cel A${i + 1}`, x: w * 0.1, y: y + dy * 0.22, w: w * 0.46, h: dy * 0.6, text: a ?? "", color: P.ink, fontSize: 27 * f, fontWeight: 600, align: "left" }),
            text({ name: `Cel B${i + 1}`, x: w * 0.56, y: y + dy * 0.22, w: w * 0.34, h: dy * 0.6, text: b ?? "", color: P.ink, fontSize: 27 * f, fontWeight: 700, align: "right" }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.9, w: w * 0.86, h: 48 * f, text: C.meta, color: P.sub, fontSize: 24 * f, fontWeight: 500, align: "left" })] : []),
      ],
    };
  },

  /* ═══ Partis pris graphiques ═══ */

  /* Blocs décalés, angles vifs : l'affiche qui ne s'excuse pas. */
  bloc: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      shape({ name: "Bloc 1", x: w * 0.06, y: h * 0.14, w: w * 0.7, h: h * 0.16, fill: P.acc }),
      shape({ name: "Bloc 2", x: w * 0.18, y: h * 0.31, w: w * 0.7, h: h * 0.16, fill: P.ink }),
      shape({ name: "Bloc 3", x: w * 0.06, y: h * 0.48, w: w * 0.52, h: h * 0.16, fill: P.acc2 }),
      text({ name: "Mot 1", x: w * 0.08, y: h * 0.17, w: w * 0.66, h: h * 0.1, text: (C.titre ?? "").split("\n")[0] ?? "", color: sur(P.acc), fontFamily: font(14), fontSize: 76 * f, fontWeight: 900, align: "left", uppercase: true }),
      text({ name: "Mot 2", x: w * 0.2, y: h * 0.34, w: w * 0.66, h: h * 0.1, text: (C.titre ?? "").split("\n")[1] ?? "", color: P.bg, fontFamily: font(14), fontSize: 76 * f, fontWeight: 900, align: "left", uppercase: true }),
      text({ name: "Mot 3", x: w * 0.08, y: h * 0.51, w: w * 0.48, h: h * 0.1, text: (C.titre ?? "").split("\n")[2] ?? "", color: sur(P.acc2), fontFamily: font(14), fontSize: 76 * f, fontWeight: 900, align: "left", uppercase: true }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.06, y: h * 0.7, w: w * 0.8, h: h * 0.14, text: C.sous, color: P.ink, fontSize: 32 * f, fontWeight: 600, align: "left", lineHeight: 1.4 })] : []),
      ...(C.meta ? [text({ name: "Méta", x: w * 0.06, y: h * 0.89, w: w * 0.8, h: 52 * f, text: C.meta, color: P.sub, fontSize: 26 * f, fontWeight: 700, align: "left", letterSpacing: 5 * f })] : []),
    ],
  }),

  /* Surligneur : des rectangles de couleur derrière les mots-clés. */
  souligne: ({ w, h, P, C, f }) => {
    const li = (C.titre ?? "").split("\n").slice(0, 3);
    const y0 = h * 0.3, dy = h * 0.14;
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.17, w: w * 0.84, h: 58 * f, text: C.sur, color: P.sub, fontSize: 29 * f, fontWeight: 700, align: "left", letterSpacing: 9 * f, uppercase: true })] : []),
        ...li.flatMap((s, i) => [
          shape({ name: `Trait ${i + 1}`, x: w * 0.07, y: y0 + i * dy + dy * 0.42, w: Math.min(w * 0.86, s.length * 34 * f), h: dy * 0.42, fill: i === 1 ? P.acc2 : P.acc, opacity: 0.55 }),
          text({ name: `Ligne ${i + 1}`, x: w * 0.07, y: y0 + i * dy, w: w * 0.86, h: dy * 0.9, text: s, color: P.ink, fontSize: 68 * f, fontWeight: 900, align: "left" }),
        ]),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.07, y: h * 0.75, w: w * 0.8, h: h * 0.13, text: C.sous, color: P.sub, fontSize: 31 * f, fontWeight: 500, align: "left", lineHeight: 1.45 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.07, y: h * 0.9, w: w * 0.8, h: 50 * f, text: C.meta, color: P.ink, fontSize: 26 * f, fontWeight: 700, align: "left" })] : []),
      ],
    };
  },

  /* Lettres évidées : le titre n'est plus qu'un contour. */
  contour: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 145, from: P.bg, to: P.bg2 } : null,
    layers: [
      text({ name: "Titre creux", x: w * 0.05, y: h * 0.24, w: w * 0.9, h: h * 0.3, text: C.gros ?? C.titre ?? "", color: P.bg, strokeColor: P.ink, strokeWidth: 3 * f, fontFamily: font(14), fontSize: 150 * f, fontWeight: 900, lineHeight: 1.02, uppercase: true }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.16, w: w * 0.8, h: 58 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 30 * f, fontWeight: 800, letterSpacing: 12 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.1, y: h * 0.6, w: w * 0.8, h: h * 0.12, text: C.titre ?? "", color: P.ink, fontSize: 52 * f, fontWeight: 800, lineHeight: 1.15 }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.74, w: w * 0.72, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500, lineHeight: 1.45 })] : []),
      ...(C.meta ? [text({ name: "Méta", x: w * 0.14, y: h * 0.89, w: w * 0.72, h: 50 * f, text: C.meta, color: lis(P.acc, P.bg, P.ink), fontSize: 26 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
    ],
  }),

  /* Ombre dure : le même mot deux fois, décalé, sans flou. */
  ombredure: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: null,
    layers: [
      text({ name: "Ombre", x: w * 0.08 + 14 * f, y: h * 0.32 + 14 * f, w: w * 0.84, h: h * 0.26, text: C.titre ?? "", color: P.acc, fontFamily: font(14), fontSize: 112 * f, fontWeight: 900, lineHeight: 1.06, uppercase: true }),
      text({ name: "Titre", x: w * 0.08, y: h * 0.32, w: w * 0.84, h: h * 0.26, text: C.titre ?? "", color: P.ink, fontFamily: font(14), fontSize: 112 * f, fontWeight: 900, lineHeight: 1.06, uppercase: true }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.2, w: w * 0.84, h: 58 * f, text: C.sur, color: P.sub, fontSize: 30 * f, fontWeight: 700, letterSpacing: 10 * f, uppercase: true })] : []),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.12, y: h * 0.66, w: w * 0.76, h: h * 0.14, text: C.sous, color: P.sub, fontSize: 32 * f, fontWeight: 500, lineHeight: 1.45 })] : []),
      ...(C.meta ? [text({ name: "Méta", x: w * 0.12, y: h * 0.88, w: w * 0.76, h: 52 * f, text: C.meta, color: P.ink, fontSize: 27 * f, fontWeight: 800, letterSpacing: 4 * f })] : []),
    ],
  }),

  /* Équerres aux quatre coins : une mise au point photographique. */
  coins: ({ w, h, P, C, f }) => {
    const L = Math.min(w, h) * 0.16, e = 8 * f, m = 0.05;
    const eq = (x: number, y: number, sx: number, sy: number, i: number) => [
      shape({ name: `Coin ${i}a`, x: sx > 0 ? x : x - L, y, w: L, h: e, fill: P.acc }),
      shape({ name: `Coin ${i}b`, x: sx > 0 ? x : x - e, y: sy > 0 ? y : y - L, w: e, h: L, fill: P.acc }),
    ];
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 170, from: P.bg, to: P.bg2 } : null,
      layers: [
        ...eq(w * m, h * m, 1, 1, 1),
        ...eq(w * (1 - m), h * m, -1, 1, 2),
        ...eq(w * m, h * (1 - m), 1, -1, 3),
        ...eq(w * (1 - m), h * (1 - m), -1, -1, 4),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.12, y: h * 0.28, w: w * 0.76, h: 58 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, letterSpacing: 11 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.1, y: h * 0.36, w: w * 0.8, h: h * 0.24, text: C.titre ?? "", color: P.ink, fontFamily: font(5), fontSize: 80 * f, fontWeight: 800, lineHeight: 1.15 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.16, y: h * 0.63, w: w * 0.68, h: h * 0.12, text: C.sous, color: P.sub, fontSize: 30 * f, fontWeight: 500, lineHeight: 1.45 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.16, y: h * 0.79, w: w * 0.68, h: 52 * f, text: C.meta, color: P.ink, fontSize: 26 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
      ],
    };
  },

  /* Champ de pois : un fond qui respire sans rien dire. */
  pois: ({ w, h, P, C, f }) => {
    const cols = 7, rows = Math.max(4, Math.round((cols * h) / w)), d = (w * 0.9) / (cols * 2.4);
    const pts = Array.from({ length: cols * rows }, (_, i) => ({
      x: w * 0.05 + (i % cols) * ((w * 0.9) / (cols - 1)) - d / 2,
      y: h * 0.05 + ((i / cols) | 0) * ((h * 0.9) / (rows - 1)) - d / 2,
      i,
    }));
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...pts.map((p) => shape({ name: `Pois ${p.i + 1}`, shape: "ellipse", x: p.x, y: p.y, w: d, h: d, fill: p.i % 3 ? P.acc : P.acc2, opacity: 0.3 })),
        shape({ name: "Carte", x: w * 0.1, y: h * 0.28, w: w * 0.8, h: h * 0.44, fill: P.bg, radius: 32 * f, shadow: ombre(50 * f, 0.22, 20 * f) }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.14, y: h * 0.34, w: w * 0.72, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 27 * f, fontWeight: 800, letterSpacing: 9 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.14, y: h * 0.41, w: w * 0.72, h: h * 0.16, text: C.titre ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900, lineHeight: 1.14 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.16, y: h * 0.59, w: w * 0.68, h: h * 0.1, text: C.sous, color: P.sub, fontSize: 29 * f, fontWeight: 500, lineHeight: 1.4 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: h * 0.8, w: w * 0.8, h: 54 * f, text: C.meta, color: P.ink, fontSize: 28 * f, fontWeight: 700 })] : []),
      ],
    };
  },

  /* Rayures obliques : un fond de kiosque, franc et lisible. */
  rayures: ({ w, h, P, C, f }) => {
    const n = 9, bw = w * 0.14;
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...Array.from({ length: n }, (_, i) => shape({
          name: `Rayure ${i + 1}`, x: -w * 0.3 + i * bw * 1.6, y: -h * 0.3, w: bw, h: h * 1.6,
          fill: i % 2 ? P.acc : P.acc2, opacity: 0.18, rotation: 22,
        })),
        shape({ name: "Bandeau", x: 0, y: h * 0.3, w, h: h * 0.4, fill: P.bg, opacity: 0.94 }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.34, w: w * 0.84, h: 58 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 29 * f, fontWeight: 800, letterSpacing: 10 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.07, y: h * 0.41, w: w * 0.86, h: h * 0.18, text: C.titre ?? "", color: P.ink, fontFamily: font(13), fontSize: 90 * f, fontWeight: 900, lineHeight: 1.08, uppercase: true }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.12, y: h * 0.74, w: w * 0.76, h: h * 0.1, text: C.sous, color: P.ink, fontSize: 32 * f, fontWeight: 600, lineHeight: 1.4 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.12, y: h * 0.87, w: w * 0.76, h: 52 * f, text: C.meta, color: P.sub, fontSize: 27 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
      ],
    };
  },

  /* Ondes : trois disques débordants font une houle basse. */
  vagues: ({ w, h, P, C, f }) => {
    const d = w * 1.5;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 180, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Onde 3", shape: "ellipse", x: -w * 0.25, y: h * 0.62, w: d, h: d * 0.5, fill: P.acc2, opacity: 0.4 }),
        shape({ name: "Onde 2", shape: "ellipse", x: -w * 0.25, y: h * 0.7, w: d, h: d * 0.5, fill: P.acc, opacity: 0.6 }),
        shape({ name: "Onde 1", shape: "ellipse", x: -w * 0.25, y: h * 0.78, w: d, h: d * 0.5, fill: P.acc }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.1, y: h * 0.16, w: w * 0.8, h: 58 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 29 * f, fontWeight: 800, letterSpacing: 10 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.08, y: h * 0.24, w: w * 0.84, h: h * 0.22, text: C.titre ?? "", color: P.ink, fontSize: 78 * f, fontWeight: 900, lineHeight: 1.14 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.5, w: w * 0.72, h: h * 0.12, text: C.sous, color: P.sub, fontSize: 31 * f, fontWeight: 500, lineHeight: 1.45 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: h * 0.88, w: w * 0.8, h: 54 * f, text: C.meta, color: sur(P.acc), fontSize: 28 * f, fontWeight: 700, letterSpacing: 4 * f })] : []),
      ],
    };
  },

  /* Massifs : des triangles superposés font un horizon. */
  montagne: ({ w, h, P, C, f }) => ({
    bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 180, from: P.bg, to: P.bg2 } : null,
    layers: [
      shape({ name: "Soleil", shape: "ellipse", x: w * 0.62, y: h * 0.16, w: w * 0.2, h: w * 0.2, fill: P.acc2, opacity: 0.7 }),
      shape({ name: "Crête 3", shape: "triangle", x: -w * 0.1, y: h * 0.42, w: w * 0.8, h: h * 0.48, fill: P.acc2, opacity: 0.5 }),
      shape({ name: "Crête 2", shape: "triangle", x: w * 0.3, y: h * 0.5, w: w * 0.8, h: h * 0.4, fill: P.acc, opacity: 0.7 }),
      shape({ name: "Crête 1", shape: "triangle", x: w * 0.05, y: h * 0.58, w: w * 0.7, h: h * 0.32, fill: P.acc }),
      shape({ name: "Sol", x: 0, y: h * 0.89, w, h: h * 0.11, fill: P.acc }),
      ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.1, w: w * 0.84, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, letterSpacing: 10 * f, uppercase: true })] : []),
      text({ name: "Titre", x: w * 0.07, y: h * 0.17, w: w * 0.86, h: h * 0.2, text: C.titre ?? "", color: P.ink, fontFamily: font(5), fontSize: 82 * f, fontWeight: 900, lineHeight: 1.12 }),
      ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.37, w: w * 0.72, h: h * 0.08, text: C.sous, color: P.sub, fontSize: 29 * f, fontWeight: 500 })] : []),
      ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: h * 0.91, w: w * 0.8, h: 52 * f, text: C.meta, color: sur(P.acc), fontSize: 27 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
    ],
  }),

  /* Rayons de soleil : des lames qui partent d'un même point. */
  soleil: ({ w, h, P, C, f }) => {
    const n = 12, L = Math.max(w, h) * 1.2;
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...Array.from({ length: n }, (_, i) => shape({
          name: `Rayon ${i + 1}`, x: w * 0.5 - L * 0.03, y: h * 0.5 - L / 2, w: L * 0.06, h: L,
          fill: i % 2 ? P.acc : P.acc2, opacity: 0.16, rotation: (180 / n) * i,
        })),
        shape({ name: "Cœur", shape: "ellipse", x: w * 0.5 - Math.min(w, h) * 0.34, y: h * 0.5 - Math.min(w, h) * 0.34, w: Math.min(w, h) * 0.68, h: Math.min(w, h) * 0.68, fill: P.acc2, gradient: { type: "radial", angle: 0, from: P.acc2, to: P.acc } }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.2, y: h * 0.36, w: w * 0.6, h: 56 * f, text: C.sur, color: sur(P.acc2), fontSize: 27 * f, fontWeight: 800, letterSpacing: 9 * f, uppercase: true, opacity: 0.9 })] : []),
        text({ name: "Titre", x: w * 0.18, y: h * 0.43, w: w * 0.64, h: h * 0.16, text: C.titre ?? "", color: sur(P.acc2), fontFamily: font(13), fontSize: 72 * f, fontWeight: 900, lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.22, y: h * 0.59, w: w * 0.56, h: h * 0.08, text: C.sous, color: sur(P.acc2), fontSize: 26 * f, fontWeight: 500, opacity: 0.92 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: h * 0.88, w: w * 0.8, h: 54 * f, text: C.meta, color: P.ink, fontSize: 28 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
      ],
    };
  },

  /* Damier : un motif d'échiquier en fond de page. */
  damier: ({ w, h, P, C, f }) => {
    const cols = 6, cell = w / cols, rows = Math.ceil(h / cell);
    const cases: number[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((r + c) % 2 === 0) cases.push(r * cols + c);
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...cases.map((k) => shape({
          name: `Case ${k + 1}`, x: (k % cols) * cell, y: ((k / cols) | 0) * cell, w: cell, h: cell,
          fill: P.acc, opacity: 0.13,
        })),
        shape({ name: "Cartouche", x: w * 0.08, y: h * 0.3, w: w * 0.84, h: h * 0.4, fill: P.acc, gradient: { type: "linear", angle: 150, from: P.acc, to: P.acc2 }, radius: 20 * f, shadow: ombre(44 * f, 0.32, 18 * f) }),
        ...(C.sur ? [text({ name: "Sur", x: w * 0.12, y: h * 0.35, w: w * 0.76, h: 56 * f, text: C.sur, color: sur(P.acc), fontSize: 27 * f, fontWeight: 800, letterSpacing: 9 * f, uppercase: true, opacity: 0.9 })] : []),
        text({ name: "Titre", x: w * 0.12, y: h * 0.42, w: w * 0.76, h: h * 0.16, text: C.titre ?? "", color: sur(P.acc), fontFamily: font(14), fontSize: 74 * f, fontWeight: 900, lineHeight: 1.1, uppercase: true }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.59, w: w * 0.72, h: h * 0.08, text: C.sous, color: sur(P.acc), fontSize: 27 * f, fontWeight: 500, opacity: 0.92 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: h * 0.78, w: w * 0.8, h: 54 * f, text: C.meta, color: P.ink, fontSize: 28 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
      ],
    };
  },

  /* ═══ Objets ═══ */

  /* Étiquette de prix : le carton, l'œillet, la ficelle sous-entendue. */
  etiquette: ({ w, h, P, C, f }) => {
    const tw = Math.min(w * 0.66, h * 0.5), th = tw * 1.35, x0 = (w - tw) / 2, y0 = h * 0.16;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 155, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Carton", x: x0, y: y0, w: tw, h: th, fill: P.acc, gradient: { type: "linear", angle: 150, from: P.acc, to: P.acc2 }, radius: 24 * f, shadow: ombre(40 * f, 0.32, 16 * f) }),
        shape({ name: "Œillet", shape: "ellipse", x: x0 + tw / 2 - 22 * f, y: y0 + 30 * f, w: 44 * f, h: 44 * f, fill: P.bg }),
        ...(C.sur ? [text({ name: "Sur", x: x0, y: y0 + th * 0.22, w: tw, h: 54 * f, text: C.sur, color: sur(P.acc), fontSize: 26 * f, fontWeight: 800, letterSpacing: 8 * f, uppercase: true, opacity: 0.9 })] : []),
        text({ name: "Prix", x: x0, y: y0 + th * 0.34, w: tw, h: th * 0.26, text: C.gros ?? "", color: sur(P.acc), fontFamily: font(13), fontSize: 116 * f, fontWeight: 900 }),
        text({ name: "Article", x: x0 + tw * 0.08, y: y0 + th * 0.66, w: tw * 0.84, h: th * 0.22, text: C.titre ?? "", color: sur(P.acc), fontSize: 34 * f, fontWeight: 700, lineHeight: 1.25 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.1, y: y0 + th + h * 0.04, w: w * 0.8, h: h * 0.1, text: C.sous, color: P.ink, fontSize: 30 * f, fontWeight: 600, lineHeight: 1.4 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: h * 0.92, w: w * 0.8, h: 50 * f, text: C.meta, color: P.sub, fontSize: 26 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
      ],
    };
  },

  /* Sceau : un cachet dentelé, doublé d'un anneau. */
  sceau: ({ w, h, P, C, f }) => {
    const d = Math.min(w, h) * 0.58, x0 = (w - d) / 2, y0 = h * 0.2;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "radial", angle: 0, from: P.bg2, to: P.bg } : null,
      layers: [
        shape({ name: "Cachet", shape: "seal", x: x0, y: y0, w: d, h: d, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 }, shadow: ombre(38 * f, 0.3, 14 * f) }),
        shape({ name: "Anneau", shape: "ring", x: x0 + d * 0.11, y: y0 + d * 0.11, w: d * 0.78, h: d * 0.78, fill: sur(P.acc), opacity: 0.55 }),
        text({ name: "Mention", x: x0, y: y0 + d * 0.28, w: d, h: 54 * f, text: C.sur ?? "", color: sur(P.acc), fontSize: 24 * f, fontWeight: 800, letterSpacing: 6 * f, uppercase: true }),
        text({ name: "Sigle", x: x0, y: y0 + d * 0.4, w: d, h: d * 0.26, text: C.gros ?? "", color: sur(P.acc), fontFamily: font(13), fontSize: d * 0.22, fontWeight: 900 }),
        text({ name: "Année", x: x0, y: y0 + d * 0.66, w: d, h: 50 * f, text: C.meta ?? "", color: sur(P.acc), fontSize: 24 * f, fontWeight: 700, letterSpacing: 5 * f }),
        text({ name: "Titre", x: w * 0.08, y: y0 + d + h * 0.05, w: w * 0.84, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 50 * f, fontWeight: 800, lineHeight: 1.15 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.14, y: h * 0.9, w: w * 0.72, h: 54 * f, text: C.sous, color: P.sub, fontSize: 27 * f, fontWeight: 500 })] : []),
      ],
    };
  },

  /* Écusson : un blason plein, un sigle, une devise. */
  ecusson: ({ w, h, P, C, f }) => {
    const bw = Math.min(w * 0.5, h * 0.42), bh = bw * 1.18, x0 = (w - bw) / 2, y0 = h * 0.18;
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Blason", shape: "shield", x: x0, y: y0, w: bw, h: bh, fill: P.acc, gradient: { type: "linear", angle: 160, from: P.acc, to: P.acc2 }, shadow: ombre(36 * f, 0.3, 14 * f) }),
        text({ name: "Sigle", x: x0, y: y0 + bh * 0.24, w: bw, h: bh * 0.34, text: C.gros ?? "", color: sur(P.acc), fontFamily: font(13), fontSize: bw * 0.34, fontWeight: 900 }),
        ...(C.meta ? [text({ name: "Année", x: x0, y: y0 + bh * 0.62, w: bw, h: 50 * f, text: C.meta, color: sur(P.acc), fontSize: 24 * f, fontWeight: 700, letterSpacing: 5 * f })] : []),
        text({ name: "Nom", x: w * 0.06, y: y0 + bh + h * 0.05, w: w * 0.88, h: h * 0.09, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 56 * f, fontWeight: 800, letterSpacing: 6 * f, uppercase: true }),
        line({ x: (w - w * 0.24) / 2, y: y0 + bh + h * 0.16, w: w * 0.24, stroke: P.acc, strokeWidth: 4 * f }),
        ...(C.sous ? [text({ name: "Devise", x: w * 0.12, y: y0 + bh + h * 0.19, w: w * 0.76, h: 56 * f, text: C.sous, color: P.sub, fontSize: 27 * f, fontWeight: 600, letterSpacing: 4 * f, italic: true })] : []),
      ],
    };
  },

  /* Monogramme : deux lettres, un filet, rien d'autre. */
  monogramme: ({ w, h, P, C, f }) => {
    const d = Math.min(w, h) * 0.56;
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 150, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Filet", x: (w - d) / 2, y: h * 0.5 - d * 0.55, w: d, h: d * 1.1, fill: "transparent", stroke: P.acc, strokeWidth: 3 * f }),
        text({ name: "Lettres", x: (w - d) / 2, y: h * 0.5 - d * 0.28, w: d, h: d * 0.6, text: C.gros ?? "AB", color: P.ink, fontFamily: font(10), fontSize: d * 0.5, fontWeight: 700, letterSpacing: 6 * f }),
        line({ x: (w - d * 0.4) / 2, y: h * 0.5 + d * 0.16, w: d * 0.4, stroke: P.acc, strokeWidth: 2 * f }),
        text({ name: "Nom", x: w * 0.08, y: h * 0.5 + d * 0.62, w: w * 0.84, h: h * 0.07, text: C.titre ?? "", color: P.ink, fontSize: 40 * f, fontWeight: 600, letterSpacing: 12 * f, uppercase: true }),
        ...(C.sous ? [text({ name: "Baseline", x: w * 0.14, y: h * 0.5 + d * 0.76, w: w * 0.72, h: 50 * f, text: C.sous, color: P.sub, fontSize: 24 * f, fontWeight: 500, letterSpacing: 6 * f })] : []),
      ],
    };
  },

  /* Fiche recette : ce qu'il faut à gauche, ce qu'on fait à droite. */
  recette: ({ w, h, P, C, f }) => {
    const it = C.items ?? [];
    const coupe = Math.ceil(it.length / 2);
    const ing = it.slice(0, coupe), etp = it.slice(coupe);
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Bandeau", x: 0, y: 0, w, h: h * 0.2, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 } }),
        text({ name: "Titre", x: w * 0.06, y: h * 0.05, w: w * 0.88, h: h * 0.1, text: C.titre ?? "", color: sur(P.acc), fontFamily: font(10), fontSize: 62 * f, fontWeight: 800, lineHeight: 1.1 }),
        ...(C.meta ? [text({ name: "Repères", x: w * 0.06, y: h * 0.15, w: w * 0.88, h: 52 * f, text: C.meta, color: sur(P.acc), fontSize: 25 * f, fontWeight: 600, letterSpacing: 3 * f, opacity: 0.92 })] : []),
        text({ name: "Titre ingrédients", x: w * 0.07, y: h * 0.26, w: w * 0.38, h: 56 * f, text: C.sur ?? "INGRÉDIENTS", color: lis(P.acc, P.bg, P.ink), fontSize: 26 * f, fontWeight: 800, align: "left", letterSpacing: 5 * f, uppercase: true }),
        text({ name: "Titre étapes", x: w * 0.53, y: h * 0.26, w: w * 0.4, h: 56 * f, text: C.cta ?? "PRÉPARATION", color: lis(P.acc, P.bg, P.ink), fontSize: 26 * f, fontWeight: 800, align: "left", letterSpacing: 5 * f, uppercase: true }),
        ...ing.map((s, i) => text({ name: `Ingrédient ${i + 1}`, x: w * 0.07, y: h * 0.33 + i * h * 0.075, w: w * 0.38, h: h * 0.07, text: `•  ${s}`, color: P.ink, fontSize: 26 * f, fontWeight: 500, align: "left", lineHeight: 1.35 })),
        ...etp.map((s, i) => text({ name: `Étape ${i + 1}`, x: w * 0.53, y: h * 0.33 + i * h * 0.11, w: w * 0.4, h: h * 0.1, text: `${i + 1}.  ${s}`, color: P.ink, fontSize: 26 * f, fontWeight: 500, align: "left", lineHeight: 1.4 })),
        ...(C.sous ? [text({ name: "Astuce", x: w * 0.07, y: h * 0.9, w: w * 0.86, h: 54 * f, text: C.sous, color: P.sub, fontSize: 25 * f, fontWeight: 500, align: "left", italic: true })] : []),
      ],
    };
  },

  /* Questions fréquentes : la question en gras, la réponse dessous. */
  faq: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 4);
    const y0 = h * 0.28, dy = (h * 0.58) / Math.max(1, it.length);
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...(C.sur ? [text({ name: "Sur", x: w * 0.07, y: h * 0.1, w: w * 0.86, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 27 * f, fontWeight: 800, align: "left", letterSpacing: 9 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.07, y: h * 0.16, w: w * 0.86, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...it.flatMap((s, i) => {
          const [q, r] = s.split("|");
          const y = y0 + i * dy;
          return [
            shape({ name: `Marque ${i + 1}`, x: w * 0.07, y: y + 6 * f, w: 6 * f, h: dy * 0.7, fill: P.acc }),
            text({ name: `Question ${i + 1}`, x: w * 0.11, y, w: w * 0.82, h: dy * 0.32, text: q ?? "", color: P.ink, fontSize: 34 * f, fontWeight: 800, align: "left", lineHeight: 1.25 }),
            text({ name: `Réponse ${i + 1}`, x: w * 0.11, y: y + dy * 0.34, w: w * 0.82, h: dy * 0.5, text: r ?? "", color: P.sub, fontSize: 27 * f, fontWeight: 500, align: "left", lineHeight: 1.4 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.91, w: w * 0.86, h: 50 * f, text: C.meta, color: P.ink, fontSize: 26 * f, fontWeight: 700, align: "left" })] : []),
      ],
    };
  },

  /* Trois arguments alignés, chacun sur sa pastille. */
  avantages: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 3);
    const y0 = h * 0.34, dy = (h * 0.48) / Math.max(1, it.length), d = Math.min(w * 0.16, dy * 0.7);
    const formes: ShapeKind[] = ["check", "bolt", "heart"];
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 160, from: P.bg, to: P.bg2 } : null,
      layers: [
        text({ name: "Titre", x: w * 0.07, y: h * 0.13, w: w * 0.86, h: h * 0.12, text: C.titre ?? "", color: P.ink, fontSize: 64 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.07, y: h * 0.25, w: w * 0.86, h: 56 * f, text: C.sous, color: P.sub, fontSize: 29 * f, fontWeight: 500, align: "left" })] : []),
        ...it.flatMap((s, i) => {
          const [t, d2] = s.split("|");
          const y = y0 + i * dy;
          return [
            shape({ name: `Rond ${i + 1}`, shape: "ellipse", x: w * 0.07, y, w: d, h: d, fill: P.acc, opacity: 0.16 }),
            shape({ name: `Icône ${i + 1}`, shape: formes[i % formes.length], x: w * 0.07 + d * 0.26, y: y + d * 0.26, w: d * 0.48, h: d * 0.48, fill: P.acc }),
            text({ name: `Titre ${i + 1}`, x: w * 0.07 + d + 30 * f, y: y + d * 0.06, w: w * 0.86 - d - 30 * f, h: dy * 0.3, text: t ?? "", color: P.ink, fontSize: 36 * f, fontWeight: 800, align: "left" }),
            text({ name: `Détail ${i + 1}`, x: w * 0.07 + d + 30 * f, y: y + d * 0.4, w: w * 0.86 - d - 30 * f, h: dy * 0.5, text: d2 ?? "", color: P.sub, fontSize: 27 * f, fontWeight: 500, align: "left", lineHeight: 1.4 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.88, w: w * 0.86, h: 52 * f, text: C.meta, color: lis(P.acc, P.bg, P.ink), fontSize: 27 * f, fontWeight: 700, align: "left" })] : []),
      ],
    };
  },

  /* Couverture de magazine : titre de tête, accroches en marge. */
  magazine: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 3);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 170, from: P.bg2, to: P.bg } : null,
      layers: [
        shape({ name: "Aplat", shape: "ellipse", x: w * 0.18, y: h * 0.24, w: w * 0.7, h: w * 0.7, fill: P.acc, opacity: 0.28 }),
        text({ name: "Titre de tête", x: w * 0.05, y: h * 0.05, w: w * 0.9, h: h * 0.11, text: C.sur ?? "", color: P.ink, fontFamily: font(10), fontSize: 118 * f, fontWeight: 900, letterSpacing: 6 * f, uppercase: true }),
        line({ x: w * 0.05, y: h * 0.17, w: w * 0.9, stroke: P.acc, strokeWidth: 4 * f }),
        ...(C.meta ? [text({ name: "Numéro", x: w * 0.05, y: h * 0.185, w: w * 0.9, h: 48 * f, text: C.meta, color: P.sub, fontSize: 24 * f, fontWeight: 600, letterSpacing: 8 * f, uppercase: true })] : []),
        text({ name: "Une", x: w * 0.06, y: h * 0.6, w: w * 0.76, h: h * 0.2, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 84 * f, fontWeight: 800, align: "left", lineHeight: 1.12 }),
        ...(C.sous ? [text({ name: "Chapeau", x: w * 0.06, y: h * 0.81, w: w * 0.6, h: h * 0.08, text: C.sous, color: P.sub, fontSize: 28 * f, fontWeight: 500, align: "left", lineHeight: 1.4 })] : []),
        ...it.map((s, i) => text({ name: `Accroche ${i + 1}`, x: w * 0.55, y: h * 0.26 + i * h * 0.08, w: w * 0.39, h: h * 0.07, text: s, color: P.ink, fontSize: 26 * f, fontWeight: 700, align: "right", lineHeight: 1.3 })),
      ],
    };
  },

  /* Journal : manchette, filets, colonnes de texte. */
  journal: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 3);
    const cw = (w * 0.88 - 2 * w * 0.03) / 3;
    return {
      bg: P.bg, bgg: null,
      layers: [
        text({ name: "Manchette", x: w * 0.06, y: h * 0.04, w: w * 0.88, h: h * 0.07, text: C.sur ?? "", color: P.ink, fontFamily: font(10), fontSize: 88 * f, fontWeight: 900, letterSpacing: 4 * f, uppercase: true }),
        line({ x: w * 0.06, y: h * 0.115, w: w * 0.88, stroke: P.ink, strokeWidth: 4 * f }),
        line({ x: w * 0.06, y: h * 0.125, w: w * 0.88, stroke: P.ink, strokeWidth: 1.5 * f }),
        ...(C.meta ? [text({ name: "Ourse", x: w * 0.06, y: h * 0.135, w: w * 0.88, h: 44 * f, text: C.meta, color: P.sub, fontSize: 20 * f, fontWeight: 600, letterSpacing: 5 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.06, y: h * 0.19, w: w * 0.88, h: h * 0.14, text: C.titre ?? "", color: P.ink, fontFamily: font(10), fontSize: 72 * f, fontWeight: 800, lineHeight: 1.12 }),
        ...(C.sous ? [text({ name: "Chapeau", x: w * 0.12, y: h * 0.34, w: w * 0.76, h: h * 0.08, text: C.sous, color: P.sub, fontSize: 27 * f, fontWeight: 600, italic: true, lineHeight: 1.4 })] : []),
        line({ x: w * 0.06, y: h * 0.44, w: w * 0.88, stroke: P.sub, strokeWidth: 1.5 * f, opacity: 0.5 }),
        ...it.map((s, i) => text({
          name: `Colonne ${i + 1}`, x: w * 0.06 + i * (cw + w * 0.03), y: h * 0.47, w: cw, h: h * 0.44,
          text: s, color: P.ink, fontFamily: font(6), fontSize: 21 * f, fontWeight: 400, align: "left", lineHeight: 1.55,
        })),
        ...(C.cta ? [text({ name: "Pied", x: w * 0.06, y: h * 0.94, w: w * 0.88, h: 44 * f, text: C.cta, color: lis(P.acc, P.bg, P.ink), fontSize: 22 * f, fontWeight: 700, letterSpacing: 4 * f })] : []),
      ],
    };
  },

  /* Bon de réduction : la valeur d'un côté, les conditions de l'autre. */
  coupon: ({ w, h, P, C, f }) => {
    const y0 = h * 0.18, ch = h * 0.62, x0 = w * 0.06, cw = w * 0.88, coupe = x0 + cw * 0.42;
    return {
      bg: P.bg, bgg: null,
      layers: [
        shape({ name: "Bon", x: x0, y: y0, w: cw, h: ch, fill: P.bg, radius: 20 * f, stroke: P.acc, strokeWidth: 3 * f, shadow: ombre(36 * f, 0.2, 14 * f) }),
        shape({ name: "Volet", x: x0, y: y0, w: cw * 0.42, h: ch, fill: P.acc, gradient: { type: "linear", angle: 160, from: P.acc, to: P.acc2 }, radius: 20 * f }),
        line({ x: coupe - ch * 0.5, y: y0 + ch / 2, w: ch, h: 0, stroke: P.acc, strokeWidth: 3 * f, dash: "dashed", rotation: 90 }),
        text({ name: "Valeur", x: x0, y: y0 + ch * 0.3, w: cw * 0.42, h: ch * 0.28, text: C.gros ?? "", color: sur(P.acc), fontFamily: font(13), fontSize: 96 * f, fontWeight: 900 }),
        ...(C.sur ? [text({ name: "Mention", x: x0, y: y0 + ch * 0.6, w: cw * 0.42, h: 52 * f, text: C.sur, color: sur(P.acc), fontSize: 24 * f, fontWeight: 700, letterSpacing: 5 * f, uppercase: true, opacity: 0.92 })] : []),
        text({ name: "Titre", x: coupe + cw * 0.04, y: y0 + ch * 0.16, w: cw * 0.5, h: ch * 0.22, text: C.titre ?? "", color: P.ink, fontSize: 40 * f, fontWeight: 800, align: "left", lineHeight: 1.2 }),
        ...(C.sous ? [text({ name: "Conditions", x: coupe + cw * 0.04, y: y0 + ch * 0.42, w: cw * 0.5, h: ch * 0.3, text: C.sous, color: P.sub, fontSize: 24 * f, fontWeight: 500, align: "left", lineHeight: 1.45 })] : []),
        ...(C.meta ? [text({ name: "Code", x: coupe + cw * 0.04, y: y0 + ch * 0.76, w: cw * 0.5, h: 54 * f, text: C.meta, color: lis(P.acc, P.bg, P.ink), fontFamily: font(11), fontSize: 30 * f, fontWeight: 800, align: "left", letterSpacing: 4 * f })] : []),
        ...(C.cta ? [text({ name: "Pied", x: w * 0.06, y: h * 0.86, w: w * 0.88, h: 50 * f, text: C.cta, color: P.sub, fontSize: 24 * f, fontWeight: 500 })] : []),
      ],
    };
  },

  /* Carte cadeau : un montant, un mot, un code au dos. */
  cartecadeau: ({ w, h, P, C, f }) => {
    const cw = w * 0.84, ch = Math.min(h * 0.56, cw * 0.62), x0 = (w - cw) / 2, y0 = (h - ch) / 2;
    const t = sur(P.acc);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 150, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Carte", x: x0, y: y0, w: cw, h: ch, fill: P.acc, gradient: { type: "linear", angle: 145, from: P.acc, to: P.acc2 }, radius: 32 * f, shadow: ombre(48 * f, 0.35, 20 * f) }),
        shape({ name: "Ruban", x: x0 + cw * 0.5 - 12 * f, y: y0, w: 24 * f, h: ch, fill: t, opacity: 0.18 }),
        ...(C.sur ? [text({ name: "Sur", x: x0 + cw * 0.06, y: y0 + ch * 0.12, w: cw * 0.88, h: 54 * f, text: C.sur, color: t, fontSize: 26 * f, fontWeight: 800, align: "left", letterSpacing: 8 * f, uppercase: true, opacity: 0.9 })] : []),
        text({ name: "Montant", x: x0 + cw * 0.06, y: y0 + ch * 0.32, w: cw * 0.88, h: ch * 0.3, text: C.gros ?? "", color: t, fontFamily: font(13), fontSize: 108 * f, fontWeight: 900, align: "left" }),
        text({ name: "Titre", x: x0 + cw * 0.06, y: y0 + ch * 0.68, w: cw * 0.88, h: ch * 0.2, text: C.titre ?? "", color: t, fontSize: 32 * f, fontWeight: 700, align: "left", lineHeight: 1.25 }),
        ...(C.meta ? [text({ name: "Code", x: w * 0.08, y: y0 + ch + h * 0.04, w: w * 0.84, h: 56 * f, text: C.meta, color: P.ink, fontFamily: font(11), fontSize: 30 * f, fontWeight: 800, letterSpacing: 6 * f })] : []),
        ...(C.sous ? [text({ name: "Validité", x: w * 0.12, y: h * 0.9, w: w * 0.76, h: 50 * f, text: C.sous, color: P.sub, fontSize: 25 * f, fontWeight: 500 })] : []),
      ],
    };
  },

  /* Liste à cocher : des cases vides, et la satisfaction à venir. */
  checklist: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 7);
    const y0 = h * 0.28, dy = (h * 0.58) / Math.max(1, it.length), d = Math.min(52 * f, dy * 0.55);
    return {
      bg: P.bg, bgg: null,
      layers: [
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.11, w: w * 0.84, h: 56 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 27 * f, fontWeight: 800, align: "left", letterSpacing: 9 * f, uppercase: true })] : []),
        text({ name: "Titre", x: w * 0.08, y: h * 0.17, w: w * 0.84, h: h * 0.11, text: C.titre ?? "", color: P.ink, fontSize: 62 * f, fontWeight: 900, align: "left", lineHeight: 1.1 }),
        ...it.flatMap((s, i) => {
          const y = y0 + i * dy;
          return [
            shape({ name: `Case ${i + 1}`, x: w * 0.08, y, w: d, h: d, fill: "transparent", stroke: P.acc, strokeWidth: 3 * f, radius: 8 * f }),
            ...(i === 0 ? [shape({ name: "Coche", shape: "check", x: w * 0.08 + d * 0.16, y: y + d * 0.18, w: d * 0.68, h: d * 0.68, fill: P.acc })] : []),
            text({ name: `Tâche ${i + 1}`, x: w * 0.08 + d + 26 * f, y: y + d * 0.08, w: w * 0.84 - d - 26 * f, h: dy * 0.7, text: s, color: P.ink, fontSize: 30 * f, fontWeight: 600, align: "left", lineHeight: 1.3 }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.08, y: h * 0.91, w: w * 0.84, h: 50 * f, text: C.meta, color: P.sub, fontSize: 25 * f, fontWeight: 500, align: "left" })] : []),
      ],
    };
  },

  /* Tableau d'affichage : deux camps, un score, une date. */
  score: ({ w, h, P, C, f }) => {
    const [a, b] = (C.items ?? ["", ""]);
    const [sa, sb] = (C.gros ?? "0-0").split("-");
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 160, from: P.bg, to: P.bg2 } : null,
      layers: [
        ...(C.sur ? [text({ name: "Sur", x: w * 0.08, y: h * 0.12, w: w * 0.84, h: 58 * f, text: C.sur, color: lis(P.acc, P.bg, P.ink), fontSize: 29 * f, fontWeight: 800, letterSpacing: 10 * f, uppercase: true })] : []),
        text({ name: "Équipe A", x: w * 0.04, y: h * 0.32, w: w * 0.36, h: h * 0.1, text: a ?? "", color: P.ink, fontSize: 44 * f, fontWeight: 800, lineHeight: 1.15 }),
        text({ name: "Équipe B", x: w * 0.6, y: h * 0.32, w: w * 0.36, h: h * 0.1, text: b ?? "", color: P.ink, fontSize: 44 * f, fontWeight: 800, lineHeight: 1.15 }),
        shape({ name: "Pavé score", x: w * 0.16, y: h * 0.45, w: w * 0.68, h: h * 0.2, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 }, radius: 24 * f, shadow: ombre(34 * f, 0.3, 14 * f) }),
        text({ name: "Score", x: w * 0.16, y: h * 0.47, w: w * 0.68, h: h * 0.16, text: `${sa ?? "0"} – ${sb ?? "0"}`, color: sur(P.acc), fontFamily: font(13), fontSize: 112 * f, fontWeight: 900 }),
        ...(C.titre ? [text({ name: "Titre", x: w * 0.08, y: h * 0.7, w: w * 0.84, h: h * 0.1, text: C.titre, color: P.ink, fontSize: 46 * f, fontWeight: 800, lineHeight: 1.15 })] : []),
        ...(C.meta ? [text({ name: "Méta", x: w * 0.1, y: h * 0.85, w: w * 0.8, h: 56 * f, text: C.meta, color: P.sub, fontSize: 28 * f, fontWeight: 600, letterSpacing: 4 * f })] : []),
      ],
    };
  },

  /* Liste de morceaux : rang, titre, durée. */
  playlist: ({ w, h, P, C, f }) => {
    const it = (C.items ?? []).slice(0, 6);
    const y0 = h * 0.34, dy = (h * 0.52) / Math.max(1, it.length);
    /* La pochette est carrée : la borner à la hauteur évite qu'elle recouvre
       la première piste sur les formats larges. */
    const pd = Math.min(w * 0.2, h * 0.26);
    return {
      bg: P.bg, bgg: P.bg2 ? { type: "linear", angle: 175, from: P.bg, to: P.bg2 } : null,
      layers: [
        shape({ name: "Pochette", x: w * 0.07, y: h * 0.08, w: pd, h: pd, fill: P.acc, gradient: { type: "linear", angle: 140, from: P.acc, to: P.acc2 }, radius: 16 * f }),
        ...(C.emoji ? [text({ name: "Emoji", x: w * 0.07, y: h * 0.08 + pd * 0.22, w: pd, h: pd * 0.6, text: C.emoji, fontSize: pd * 0.5, fontWeight: 400 })] : []),
        text({ name: "Titre", x: w * 0.31, y: h * 0.1, w: w * 0.62, h: h * 0.1, text: C.titre ?? "", color: P.ink, fontSize: 54 * f, fontWeight: 900, align: "left", lineHeight: 1.12 }),
        ...(C.sous ? [text({ name: "Sous", x: w * 0.31, y: h * 0.21, w: w * 0.62, h: 54 * f, text: C.sous, color: P.sub, fontSize: 27 * f, fontWeight: 500, align: "left" })] : []),
        ...it.flatMap((s, i) => {
          const [t, d] = s.split("|");
          const y = y0 + i * dy;
          return [
            text({ name: `Rang ${i + 1}`, x: w * 0.07, y, w: w * 0.06, h: dy * 0.7, text: String(i + 1), color: lis(P.acc, P.bg, P.ink), fontSize: 28 * f, fontWeight: 800, align: "left" }),
            text({ name: `Morceau ${i + 1}`, x: w * 0.15, y, w: w * 0.6, h: dy * 0.7, text: t ?? "", color: P.ink, fontSize: 30 * f, fontWeight: 600, align: "left" }),
            text({ name: `Durée ${i + 1}`, x: w * 0.77, y, w: w * 0.16, h: dy * 0.7, text: d ?? "", color: P.sub, fontSize: 27 * f, fontWeight: 500, align: "right" }),
          ];
        }),
        ...(C.meta ? [text({ name: "Pied", x: w * 0.07, y: h * 0.9, w: w * 0.86, h: 50 * f, text: C.meta, color: P.sub, fontSize: 25 * f, fontWeight: 600, align: "left" })] : []),
      ],
    };
  },

};

/* ═══════════ Le catalogue ═══════════
   [mise en page, format, palette OU ambiance, groupe, libellé, contenu] */
export type Mep = keyof typeof MEP;
export type Row = [Mep, Fmt, number | Ambiance, string, string, Copy];

const ROWS: Row[] = [
  /* ── Instagram : posts carrés ── */
  ["centre", "carre", 0, "Instagram", "Citation nuit", { sur: "Pensée du jour", titre: "Crée la vie\ndont tu rêves.", sous: "Un pas par jour, c'est déjà une direction." }],
  ["chiffre", "carre", 9, "Instagram", "Promo -50 %", { sur: "Offre limitée", gros: "-50%", titre: "sur toute la boutique", sous: "Jusqu'à dimanche minuit", cta: "J'EN PROFITE" }],
  ["citation", "carre", 15, "Instagram", "Citation violette", { titre: "Le meilleur moment\nc'était hier.\nLe deuxième, c'est\nmaintenant.", auteur: "— PROVERBE", sous: "Motivation" }],
  ["liste", "carre", 1, "Instagram", "5 conseils", { sur: "Carrousel", titre: "5 réflexes qui\nchangent tout", items: ["Range ton bureau le soir", "Écris trois priorités", "Coupe les notifications", "Bouge vingt minutes", "Relis tes notes"], meta: "→ Enregistre ce post" }],
  ["cartes", "carre", 7, "Instagram", "Trois formules", { titre: "Nos formules", sous: "Choisis ce qui te ressemble", items: ["Découverte|1 séance d'essai offerte", "Régulier|4 séances par mois", "Intensif|Accès illimité + suivi"] }],
  ["temoignage", "carre", 4, "Instagram", "Avis client", { titre: "« En trois semaines,\nj'ai retrouvé\nun rythme. »", auteur: "Camille D.", sous: "Cliente depuis 2024", emoji: "🌸" }],
  ["duo", "carre", 19, "Instagram", "Avant / après", { items: ["AVANT|Des fichiers partout, rien de retrouvable.", "APRÈS|Un espace, une recherche, tout sous la main."], gros: "VS" }],
  ["stats", "carre", 13, "Instagram", "Chiffres clés", { sur: "Bilan de l'année", titre: "Ce que vous\navez construit", items: ["12 k|documents créés", "480|équipes actives", "99,9 %|de disponibilité"], meta: "Merci pour votre confiance." }],
  ["mosaique", "carre", 8, "Instagram", "Mosaïque douce", { titre: "Nouvelle collection", sous: "Disponible en boutique dès vendredi" }],
  ["organique", "carre", 14, "Instagram", "Formes douces", { sur: "Bien-être", titre: "Respire.\nTu fais déjà\nbeaucoup.", sous: "Trois minutes de pause, ça compte.", cta: "Voir la séance" }],
  ["retro", "carre", 2, "Instagram", "Rayons rétro", { sur: "Édition limitée", titre: "Summer\nsale", sous: "Du 1er au 15 juillet" }],
  ["neon", "carre", 23, "Instagram", "Néon minimal", { gros: "TX", titre: "Nouveau logo", sous: "IDENTITÉ 2026" }],
  ["etapes", "carre", 20, "Instagram", "Méthode en 4 temps", { titre: "Comment on\ntravaille", sous: "De la première idée à la mise en ligne", items: ["Cadrage|On pose l'objectif et le périmètre.", "Maquette|Vous validez avant tout code.", "Fabrication|Livraison par lots visibles.", "Suivi|Corrections et mesures pendant un mois."] }],
  ["pastille", "carre", 12, "Instagram", "Code promo", { gros: "-30%", sur: "Sur tout le site", titre: "Soldes d'été", meta: "CODE : ETE30" }],
  ["bandeau", "carre", 3, "Instagram", "Annonce verte", { sur: "Nouveauté", titre: "Livraison offerte\ndès 40 €", sous: "Partout en France métropolitaine,\nsans code à saisir.", cta: "Découvrir" }],
  ["diagonale", "carre", 5, "Instagram", "Diagonale jaune", { titre: "Portes\nouvertes", sous: "Samedi 12, de 10h à 18h", gros: "12" }],
  ["cadre", "carre", 16, "Instagram", "Faire-part sobre", { sur: "Save the date", titre: "Léa & Marc", sous: "se marient le 6 juin 2026", meta: "DOMAINE DE LA ROSERAIE" }],
  ["couverture", "carre", 21, "Instagram", "Couverture éditoriale", { sur: "Dossier", titre: "Travailler\nautrement", sous: "Enquête sur les nouvelles organisations", auteur: "RÉDACTION" }],
  ["annonce", "carre", 6, "Instagram", "Fiche produit", { gros: "89 €", titre: "Sac en toile recyclée", sous: "Fabriqué en Bretagne, garanti 5 ans", items: ["Toile recyclée 600 g", "Doublure imperméable", "Bandoulière réglable"], emoji: "🎒" }],
  ["tarif", "carre", 11, "Instagram", "Formule mensuelle", { sur: "Formule Pro", gros: "29 €", sous: "par mois, sans engagement", items: ["Documents illimités", "5 collaborateurs", "Historique 90 jours", "Support sous 24 h"], cta: "Commencer" }],

  /* ── Story & Reel ── */
  ["evenement", "story", 0, "Story & Reel", "Soirée de lancement", { sur: "Save the date", titre: "Soirée\nde lancement", meta: "VENDREDI 20 SEPTEMBRE — 19H", sous: "Le Rooftop, Paris 11e", cta: "⬆︎ Balaye pour t'inscrire" }],
  ["chiffre", "story", 9, "Story & Reel", "Compte à rebours", { sur: "Plus que", gros: "3", titre: "jours avant l'ouverture", sous: "Inscris-toi avant tout le monde", cta: "JE M'INSCRIS" }],
  ["citation", "story", 15, "Story & Reel", "Citation verticale", { titre: "Fais-le mal,\nmais fais-le.", auteur: "— MANTRA", sous: "Puis recommence mieux." }],
  ["liste", "story", 1, "Story & Reel", "Checklist du matin", { sur: "Routine", titre: "Ma checklist\ndu matin", items: ["Un grand verre d'eau", "Dix minutes sans écran", "Trois priorités écrites", "Vingt minutes de marche"], meta: "Balaye pour la version imprimable" }],
  ["etapes", "story", 20, "Story & Reel", "Tutoriel en 4 étapes", { titre: "Créer sa\npremière affiche", sous: "En moins de dix minutes", items: ["Choisir un format|Affiche, story, carte de visite…", "Prendre un modèle|Tout est déjà en place.", "Remplacer le texte|Double-clic, c'est modifiable.", "Exporter|PNG, JPEG ou PDF."] }],
  ["organique", "story", 4, "Story & Reel", "Douceur rose", { sur: "Nouveau", titre: "Une routine\nqui te ressemble", sous: "Trois gestes, matin et soir.", cta: "Voir la routine" }],
  ["neon", "story", 13, "Story & Reel", "Néon soirée", { gros: "★", titre: "Nuit blanche", sous: "SAMEDI — MINUIT" }],
  ["duo", "story", 19, "Story & Reel", "Vrai ou faux", { items: ["VRAI|Boire avant d'avoir soif aide vraiment.", "FAUX|Il faut huit verres, ni plus ni moins."], gros: "?" }],
  ["pastille", "story", 12, "Story & Reel", "Vente flash", { gros: "-60%", sur: "48 heures seulement", titre: "Vente flash", meta: "CODE : FLASH60" }],
  ["stats", "story", 3, "Story & Reel", "Résultats du mois", { sur: "Récap", titre: "Le mois\nen trois chiffres", items: ["+42 %|de visites", "1 240|nouveaux membres", "4,8/5|satisfaction"], meta: "Merci à toutes et tous." }],
  ["centre", "story", 23, "Story & Reel", "Annonce minimale", { sur: "Bientôt", titre: "Quelque chose\narrive.", sous: "Rendez-vous lundi, 9 h." }],
  ["cartes", "story", 7, "Story & Reel", "Trois offres verticales", { titre: "Trois façons\nde commencer", sous: "À toi de voir", items: ["Essai|7 jours offerts", "Mensuel|Sans engagement", "Annuel|Deux mois offerts"] }],
  ["evenement", "story", 21, "Story & Reel", "Concert", { sur: "En concert", titre: "Les Nuits\nÉlectriques", meta: "SAMEDI 4 OCTOBRE — 21H", sous: "Le Trianon, Paris", cta: "Billetterie en ligne" }],
  ["bandeau", "story", 11, "Story & Reel", "Recrutement story", { sur: "On recrute", titre: "Développeur·se\nfront-end", sous: "CDI · Lyon ou télétravail complet.\nÉquipe de douze, produit installé.", cta: "Postuler" }],
  ["retro", "story", 2, "Story & Reel", "Rétro chaleureux", { sur: "Festival", titre: "Beach\nparty", sous: "Du 12 au 14 août" }],

  /* ── YouTube ── */
  ["miniature", "yt", 9, "YouTube", "Miniature choc", { titre: "LE SECRET QUE\nPERSONNE\nNE DIT", meta: "ÉPISODE 12", emoji: "🤯" }],
  ["miniature", "yt", 13, "YouTube", "Miniature tech", { titre: "J'AI TESTÉ\nPENDANT\n30 JOURS", meta: "VERDICT", emoji: "🧪" }],
  ["miniature", "yt", 3, "YouTube", "Miniature tuto", { titre: "DE ZÉRO À\nEN LIGNE\nEN 1 H", meta: "TUTORIEL", emoji: "🚀" }],
  ["miniature", "yt", 5, "YouTube", "Miniature classement", { titre: "LE TOP 10\nQUI FAIT\nDÉBAT", meta: "CLASSEMENT", emoji: "🏆" }],
  ["miniature", "yt", 19, "YouTube", "Miniature erreur", { titre: "L'ERREUR QUE\nTOUT LE MONDE\nFAIT", meta: "À ÉVITER", emoji: "⚠️" }],
  ["banniere", "ytban", 0, "YouTube", "Bannière de chaîne", { gros: "TX", titre: "Chaîne Filehub", sous: "Design, montage et organisation — chaque mardi.", cta: "S'abonner" }],
  ["banniere", "ytban", 6, "YouTube", "Bannière claire", { gros: "AB", titre: "Atelier Bois", sous: "Menuiserie, outils et projets à faire chez soi.", cta: "Voir" }],
  ["diapo", "yt", 1, "YouTube", "Écran de fin", { sur: "Merci d'avoir regardé", titre: "On se retrouve\nmardi prochain", sous: "Abonne-toi pour ne rien rater.", items: ["Vidéo suivante", "Playlist complète", "Newsletter"], meta: "filehub.business" }],
  ["duo", "yt", 11, "YouTube", "Comparatif", { items: ["OPTION A|Rapide à mettre en place.", "OPTION B|Plus long, mais durable."], gros: "VS" }],

  /* ── LinkedIn ── */
  ["panneau", "large", 1, "LinkedIn", "Annonce produit", { sur: "Nouveau", titre: "Votre produit,\nprésenté comme un pro.", sous: "Design, montage et fichiers réunis au même endroit.", meta: "filehub.business", gros: "→" }],
  ["stats", "large", 11, "LinkedIn", "Résultats trimestre", { sur: "Trimestre", titre: "Ce que l'équipe\na livré", items: ["18|fonctionnalités", "-40 %|de temps de chargement", "0|incident majeur"], meta: "Bravo à toute l'équipe." }],
  ["citation", "li", 0, "LinkedIn", "Citation pro", { titre: "On ne recrute pas\ndes diplômes.\nOn recrute\ndes trajectoires.", auteur: "— DIRECTION", sous: "Culture d'entreprise" }],
  ["recrute", "li", 20, "LinkedIn", "Offre d'emploi", { sur: "NOUS RECRUTONS", titre: "Chef·fe de projet\ndigital", sous: "CDI · Paris ou distanciel", items: ["Piloter deux à trois projets clients", "Faire le lien design et technique", "Suivre budgets et délais"], meta: "carrieres@exemple.fr" }],
  ["etapes", "li", 1, "LinkedIn", "Notre méthode", { titre: "Comment nous\naccompagnons", sous: "Un cadre simple, quatre temps", items: ["Diagnostic|Deux semaines d'observation.", "Plan|Priorités chiffrées et datées.", "Mise en œuvre|Par lots visibles.", "Transfert|Vos équipes reprennent la main."] }],
  ["temoignage", "li", 7, "LinkedIn", "Retour client", { titre: "« Six mois après,\nle temps de traitement\na été divisé par trois. »", auteur: "Sofia M.", sous: "Directrice des opérations", emoji: "💬" }],
  ["banniere", "banx", 0, "LinkedIn", "Bannière de profil", { gros: "TX", titre: "Thomas Xey", sous: "Fondateur — produits numériques utiles.", cta: "Écrire" }],
  ["banniere", "banx", 16, "LinkedIn", "Bannière sobre", { gros: "AL", titre: "Cabinet Aline Legrand", sous: "Droit du travail — conseil et contentieux.", cta: "Contact" }],
  ["cartes", "large", 13, "LinkedIn", "Trois services", { titre: "Ce que nous faisons", sous: "Trois métiers, une même équipe", items: ["Conseil|Cadrage et feuille de route", "Design|Interfaces et identité", "Développement|Web et mobile"] }],
  ["diapo", "slide", 1, "LinkedIn", "Slide de présentation", { sur: "Chapitre 2", titre: "Le marché\nen 2026", sous: "Trois tendances qui redessinent le secteur.", items: ["Concentration des acteurs", "Exigence de sobriété", "Automatisation du support", "Retour du sur-mesure"], meta: "Étude interne — mars 2026" }],

  /* ── Facebook ── */
  ["panneau", "large", 6, "Facebook", "Annonce cyan", { sur: "Nouveau", titre: "Un espace pour\ntous vos fichiers.", sous: "Rangez, partagez, retrouvez. Sans effort.", meta: "Essai gratuit 14 jours", gros: "☁" }],
  ["bandeau", "large", 12, "Facebook", "Promo restaurant", { sur: "Cette semaine", titre: "Menu du midi à 14 €", sous: "Entrée, plat, dessert — du lundi au vendredi.", cta: "Réserver" }],
  ["evenement", "large", 15, "Facebook", "Événement local", { sur: "Rendez-vous", titre: "Brocante\ndu village", meta: "DIMANCHE 8 JUIN — DÈS 7H", sous: "Place de la mairie", cta: "J'y vais" }],
  ["annonce", "large", 3, "Facebook", "Offre immobilière", { gros: "285 000 €", titre: "Maison 4 pièces avec jardin", sous: "Quartier calme, proche écoles", items: ["96 m² habitables", "Jardin clos de 340 m²", "DPE : C"], emoji: "🏡" }],
  ["couverture", "couv", 8, "Facebook", "Couverture de page", { sur: "Depuis 2019", titre: "Atelier\nFleur & Feuille", sous: "Compositions de saison, livrées le jour même.", auteur: "LYON 6e" }],
  ["couverture", "couv", 2, "Facebook", "Couverture boulangerie", { sur: "Artisan", titre: "Le Fournil\nde Camille", sous: "Pains au levain, cuits au feu de bois.", auteur: "OUVERT DU MARDI AU DIMANCHE" }],
  ["pastille", "large", 19, "Facebook", "Bon de réduction", { gros: "-15%", sur: "Première commande", titre: "Bienvenue chez nous", meta: "CODE : BIENVENUE" }],

  /* ── Pinterest ── */
  ["liste", "pin", 14, "Pinterest", "Recette en 5 temps", { sur: "Recette", titre: "Pain perdu\nà la poêle", items: ["Battre deux œufs et du lait", "Tremper le pain une minute", "Poêle chaude, un peu de beurre", "Trois minutes par face", "Sucre, cannelle, servir chaud"], meta: "Pour 2 personnes — 15 min" }],
  ["couverture", "pin", 16, "Pinterest", "Guide pratique", { sur: "Guide", titre: "Ranger\nsa maison\nen un week-end", sous: "Pièce par pièce, sans tout sortir d'un coup.", auteur: "MÉTHODE COMPLÈTE" }],
  ["organique", "pin", 4, "Pinterest", "Inspiration douce", { sur: "Slow living", titre: "Ralentir,\nc'est aussi\navancer", sous: "Cinq habitudes à essayer cette semaine.", cta: "Lire l'article" }],
  ["etapes", "pin", 15, "Pinterest", "DIY en 4 étapes", { titre: "Fabriquer\nune étagère", sous: "Deux planches, quatre équerres", items: ["Mesurer|Repérer les montants du mur.", "Couper|Deux planches de 80 cm.", "Fixer|Chevilles adaptées au support.", "Poncer et huiler|Deux couches suffisent."] }],
  ["cartes", "pin", 12, "Pinterest", "Trois idées déco", { titre: "Trois ambiances", sous: "Pour une chambre calme", items: ["Naturel|Bois clair et lin", "Nuit|Bleus profonds", "Terracotta|Chaleur et ocre"] }],
  ["chiffre", "pin", 5, "Pinterest", "Défi 30 jours", { sur: "Défi", gros: "30", titre: "jours pour prendre l'habitude", sous: "Une action minuscule, tous les jours.", cta: "JE COMMENCE" }],

  /* ── Marque & logo ── */
  ["embleme", "logo", 0, "Marque & logo", "Monogramme anneau", { gros: "TX", titre: "Votre marque", sous: "DEPUIS 2024", meta: "ring" }],
  ["embleme", "logo", 11, "Marque & logo", "Écusson", { gros: "AB", titre: "Atelier Bois", sous: "MENUISERIE SUR MESURE", meta: "shield" }],
  ["embleme", "logo", 3, "Marque & logo", "Sceau végétal", { gros: "F", titre: "Ferme du Clos", sous: "PRODUITS DE SAISON", meta: "seal" }],
  ["embleme", "logo", 21, "Marque & logo", "Hexagone tech", { gros: "N", titre: "Nova", sous: "LOGICIELS UTILES", meta: "hexagon" }],
  ["embleme", "logo", 5, "Marque & logo", "Losange or", { gros: "LB", titre: "Lucie Blanc", sous: "BIJOUX D'ATELIER", meta: "diamond" }],
  ["embleme", "logo", 17, "Marque & logo", "Cercle marine", { gros: "PC", titre: "Port & Cie", sous: "LOCATION DE BATEAUX", meta: "ellipse" }],
  ["neon", "logo", 23, "Marque & logo", "Signe lumineux", { gros: "⌘", titre: "Studio Halo", sous: "MOTION & DESIGN" }],
  ["centre", "logo", 22, "Marque & logo", "Nom typographique", { sur: "Maison fondée en 1998", titre: "BERTRAND\n& FILLES", sous: "Ébénisterie, Paris" }],

  /* ── Carte & papeterie ── */
  ["visite", "carte", 0, "Carte & papeterie", "Carte de visite nuit", { gros: "TX", titre: "Thomas Xey", sur: "Fondateur — Filehub", sous: "contact@filehub.business\nfilehub.business\n+33 6 00 00 00 00" }],
  ["visite", "carte", 16, "Carte & papeterie", "Carte de visite sable", { gros: "AL", titre: "Aline Legrand", sur: "Avocate au barreau de Lyon", sous: "a.legrand@cabinet.fr\ncabinet-legrand.fr\n+33 4 00 00 00 00" }],
  ["visite", "carte", 12, "Carte & papeterie", "Carte de visite chaude", { gros: "CF", titre: "Camille Fournier", sur: "Boulangère — Le Fournil", sous: "lefournil@exemple.fr\n12 rue des Halles, Nantes\n+33 2 00 00 00 00" }],
  ["visite", "carte", 20, "Carte & papeterie", "Carte de visite indigo", { gros: "NR", titre: "Noé Rivière", sur: "Photographe", sous: "studio@noeriviere.fr\nnoeriviere.fr\n@noe.riviere" }],
  ["cadre", "a5", 16, "Carte & papeterie", "Carte de vœux", { sur: "Meilleurs vœux", titre: "Belle et douce\nannée 2026", sous: "Qu'elle vous apporte du temps pour ce qui compte.", meta: "L'ÉQUIPE FILEHUB" }],
  ["cadre", "a5", 4, "Carte & papeterie", "Faire-part de naissance", { sur: "Il est arrivé", titre: "Gabriel", sous: "né le 14 mars 2026, 3,4 kg", meta: "LÉA ET MARC" }],
  ["cadre", "a5", 8, "Carte & papeterie", "Invitation mariage", { sur: "Save the date", titre: "Léa & Marc", sous: "vous invitent à célébrer leur mariage", meta: "6 JUIN 2026 — DOMAINE DE LA ROSERAIE" }],
  ["cadre", "a5", 2, "Carte & papeterie", "Invitation anniversaire", { sur: "On fête ça", titre: "Les 30 ans\nde Julie", sous: "Apporte juste ta bonne humeur.", meta: "SAMEDI 18 MAI — 20H" }],
  ["billet", "billet", 15, "Carte & papeterie", "Billet de concert", { sur: "Entrée", titre: "Les Nuits\nÉlectriques", meta: "Samedi 4 octobre — 21h\nLe Trianon, Paris\nPlacement libre", gros: "N° 042", sous: "À PRÉSENTER" }],
  ["billet", "billet", 12, "Carte & papeterie", "Bon cadeau", { sur: "Bon cadeau", titre: "Une séance\nau choix", meta: "Valable un an à compter de l'émission.\nNon remboursable, cessible.", gros: "50 €", sous: "MERCI" }],
  ["billet", "billet", 3, "Carte & papeterie", "Ticket atelier", { sur: "Atelier", titre: "Initiation\nau levain", meta: "Dimanche 9 novembre — 10h\nLe Fournil, Nantes\n8 places", gros: "PLACE 3", sous: "SUR PLACE" }],
  ["certificat", "a4", 16, "Carte & papeterie", "Certificat de formation", { sur: "Certificat", titre: "Formation « Design d'interface »", auteur: "PRÉNOM NOM", sous: "a suivi et validé les 21 heures du programme,\nsession de mars 2026.", meta: "La direction" }],
  ["certificat", "a4", 11, "Carte & papeterie", "Diplôme de concours", { sur: "Premier prix", titre: "Concours photo — Regards de ville", auteur: "PRÉNOM NOM", sous: "pour la série « Passages », présentée au jury\nle 14 juin 2026.", meta: "Le président du jury" }],
  ["certificat", "a4", 3, "Carte & papeterie", "Attestation de stage", { sur: "Attestation", titre: "Stage d'observation", auteur: "PRÉNOM NOM", sous: "a effectué un stage du 3 au 28 février 2026\nau sein du service production.", meta: "Le tuteur" }],

  /* ── Impression ── */
  ["bandeau", "a4", 8, "Impression", "Affiche conférence", { sur: "Conférence annuelle", titre: "Entreprendre\nen 2026", sous: "Une journée de conférences, d'ateliers et de rencontres\npour passer à la vitesse supérieure.", cta: "S'INSCRIRE" }],
  ["evenement", "a4", 0, "Impression", "Affiche festival", { sur: "3e édition", titre: "Festival\ndes lumières", meta: "DU 12 AU 15 DÉCEMBRE", sous: "Centre-ville — entrée libre", cta: "programme sur le site" }],
  ["retro", "a4", 2, "Impression", "Affiche rétro", { sur: "Grande braderie", titre: "Vide\ngrenier", sous: "Dimanche 8 juin, dès 7 h" }],
  ["liste", "a4", 1, "Impression", "Affiche consignes", { sur: "Merci de respecter", titre: "Consignes\ndu local", items: ["Éteindre les lumières en partant", "Fermer les fenêtres", "Ranger les chaises", "Sortir les poubelles le mardi", "Signaler toute panne au 04 00 00 00 00"], meta: "Syndic — mise à jour mars 2026" }],
  ["menu", "a4", 22, "Impression", "Carte de restaurant", { sur: "Carte du soir", titre: "Le Comptoir", items: ["Velouté de saison|8 €", "Œuf parfait, lard croustillant|11 €", "Poisson du jour, légumes rôtis|22 €", "Suprême de volaille, jus corsé|21 €", "Tarte fine aux pommes|9 €", "Fondant chocolat, crème anglaise|9 €"], meta: "PRIX NETS — SERVICE COMPRIS" }],
  ["menu", "a4", 12, "Impression", "Carte des boissons", { sur: "Bar", titre: "Nos boissons", items: ["Café expresso|2,20 €", "Thé, infusion|3,50 €", "Jus pressé du jour|5 €", "Limonade artisanale|4,50 €", "Bière locale 33 cl|6 €", "Verre de vin de la maison|5,50 €"], meta: "ABUS D'ALCOOL DANGEREUX POUR LA SANTÉ" }],
  ["menu", "a4", 14, "Impression", "Menu du midi", { sur: "Du lundi au vendredi", titre: "Formule midi", items: ["Entrée + plat|16 €", "Plat + dessert|16 €", "Entrée + plat + dessert|21 €", "Plat du jour seul|13 €", "Café gourmand|6 €", "Menu enfant|9 €"], meta: "SERVICE DE 12H À 14H30" }],
  ["annonce", "a4", 6, "Impression", "Flyer service", { gros: "dès 39 €", titre: "Ménage à domicile", sous: "Intervention en 48 h, sur toute l'agglomération", items: ["Devis gratuit sous 24 h", "Produits fournis", "Crédit d'impôt de 50 %"], emoji: "🧽" }],
  ["annonce", "a5", 19, "Impression", "Flyer plombier", { gros: "24h/24", titre: "Dépannage plomberie", sous: "Fuite, engorgement, chauffe-eau", items: ["Déplacement en 1 h", "Devis avant intervention", "Garantie pièces et main-d'œuvre"], emoji: "🔧" }],
  ["annonce", "a5", 14, "Impression", "Flyer jardinage", { gros: "sur devis", titre: "Entretien de jardins", sous: "Tonte, taille, élagage, évacuation", items: ["Contrat à l'année possible", "Matériel professionnel", "Déchets emportés"], emoji: "🌿" }],
  ["cartes", "a4", 11, "Impression", "Grille tarifaire", { titre: "Nos tarifs", sous: "À partir de, hors options", items: ["Essentiel|Une prestation ponctuelle", "Confort|Quatre passages par mois", "Sérénité|Passage hebdomadaire + urgences"] }],
  ["stats", "a4", 20, "Impression", "Rapport annuel", { sur: "Rapport 2025", titre: "Une année\nen trois chiffres", items: ["1 420|adhérents", "38|événements", "92 %|de satisfaction"], meta: "Assemblée générale du 12 avril 2026" }],
  ["diapo", "a4", 16, "Impression", "Note de service", { sur: "Note interne", titre: "Nouveaux horaires\nd'ouverture", sous: "Applicables à compter du 1er avril 2026.", items: ["Lundi au jeudi : 8h30 – 18h", "Vendredi : 8h30 – 16h30", "Samedi : 9h – 12h", "Dimanche : fermé"], meta: "Direction — mars 2026" }],
  ["mosaique", "a4", 9, "Impression", "Affiche portes ouvertes", { titre: "Portes ouvertes", sous: "Samedi 12 avril, de 10 h à 18 h — entrée libre" }],
  ["cadre", "a4", 17, "Impression", "Affiche citation", { sur: "Atelier", titre: "Fais de ton\nmieux, avec\nce que tu as.", sous: "et recommence demain", meta: "AFFICHE À ENCADRER" }],

  /* ── Présentation ── */
  ["diapo", "slide", 0, "Présentation", "Diapositive titre", { sur: "Réunion trimestrielle", titre: "Où nous\nen sommes", sous: "Point d'étape et priorités du prochain trimestre.", items: ["Résultats", "Chantiers en cours", "Difficultés", "Prochaines étapes"], meta: "12 avril 2026" }],
  ["stats", "slide", 13, "Présentation", "Diapositive chiffres", { sur: "Résultats", titre: "Trois indicateurs\nà retenir", items: ["+24 %|de chiffre d'affaires", "-18 %|de coût d'acquisition", "4,7/5|note moyenne"], meta: "Source : tableau de bord interne, mars 2026" }],
  ["etapes", "slide", 1, "Présentation", "Diapositive feuille de route", { titre: "Feuille de route", sous: "Quatre jalons d'ici décembre", items: ["T2|Refonte de l'espace client.", "T3|Ouverture de l'API publique.", "T4|Application mobile.", "T1 2027|Internationalisation."] }],
  ["cartes", "slide", 11, "Présentation", "Diapositive offres", { titre: "Trois niveaux d'offre", sous: "Le même produit, trois intensités d'accompagnement", items: ["Autonome|Documentation et communauté", "Accompagné|Un référent dédié", "Sur mesure|Équipe projet complète"] }],
  ["duo", "slide", 19, "Présentation", "Diapositive comparaison", { items: ["AUJOURD'HUI|Sept outils, aucun ne se parle.", "DEMAIN|Un socle unique, ouvert."], gros: "→" }],
  ["citation", "slide", 15, "Présentation", "Diapositive citation", { titre: "« La stratégie,\nc'est choisir\nce qu'on ne fera pas. »", auteur: "— MICHAEL PORTER", sous: "Cité en introduction" }],
  ["centre", "slide", 23, "Présentation", "Diapositive de transition", { sur: "Partie 2", titre: "Les chantiers\nen cours", sous: "Ce qui avance, ce qui coince." }],
  ["liste", "slide", 20, "Présentation", "Diapositive à puces", { sur: "Décisions", titre: "Ce qu'il faut\ntrancher aujourd'hui", items: ["Budget du second semestre", "Recrutement d'un profil data", "Report ou non de la version 3", "Choix de l'hébergeur"], meta: "Décisions attendues en fin de séance" }],

  /* ── Commerce ── */
  ["annonce", "carre", 5, "Commerce", "Fiche article mode", { gros: "59 €", titre: "Chemise en lin lavé", sous: "Coupe droite, du 36 au 46", items: ["Lin français", "Lavable en machine", "Retours offerts 30 jours"], emoji: "👔" }],
  ["annonce", "carre", 14, "Commerce", "Fiche article épicerie", { gros: "12,50 €", titre: "Miel de printemps", sous: "Récolte 2025, 500 g", items: ["Rucher familial, Ardèche", "Non chauffé", "Pot en verre consigné"], emoji: "🍯" }],
  ["annonce", "carre", 17, "Commerce", "Fiche article maison", { gros: "34 €", titre: "Bougie parfumée", sous: "Cire végétale, 45 h de combustion", items: ["Figue et bois de cèdre", "Mèche coton", "Fabriquée en France"], emoji: "🕯️" }],
  ["pastille", "carre", 9, "Commerce", "Black Friday", { gros: "-70%", sur: "Black Friday", titre: "Trois jours seulement", meta: "DU 28 AU 30 NOVEMBRE" }],
  ["pastille", "carre", 3, "Commerce", "Déstockage", { gros: "2+1", sur: "Deux achetés, un offert", titre: "Déstockage", meta: "JUSQU'À ÉPUISEMENT" }],
  ["chiffre", "carre", 12, "Commerce", "Livraison offerte", { sur: "Ce week-end", gros: "0 €", titre: "de frais de livraison", sous: "Dès 30 € d'achat, partout en France", cta: "EN PROFITER" }],
  ["cartes", "carre", 1, "Commerce", "Trois abonnements", { titre: "Abonnements", sous: "Résiliables à tout moment", items: ["Mensuel|19 € / mois", "Trimestriel|49 € — deux semaines offertes", "Annuel|179 € — deux mois offerts"] }],
  ["tarif", "carre", 20, "Commerce", "Formule annuelle", { sur: "Formule Équipe", gros: "199 €", sous: "par an et par utilisateur", items: ["Utilisateurs illimités", "Espaces partagés", "Journal d'audit", "Assistance prioritaire", "Sauvegarde quotidienne"], cta: "Demander un devis" }],
  ["bandeau", "large", 7, "Commerce", "Bandeau soldes", { sur: "Soldes d'hiver", titre: "Jusqu'à -60 %", sous: "Sur une sélection de plus de 400 articles.", cta: "Voir la sélection" }],
  ["duo", "large", 22, "Commerce", "Comparatif produit", { items: ["ANCIEN MODÈLE|Autonomie de 8 heures.", "NOUVEAU|Autonomie de 22 heures."], gros: "→" }],
  ["billet", "billet", 5, "Commerce", "Carte de fidélité", { sur: "Fidélité", titre: "Votre 10e café\nest offert", meta: "Un tampon par boisson chaude.\nValable dans nos trois adresses.", gros: "10", sous: "MERCI" }],
  ["menu", "a5", 21, "Commerce", "Liste de prix", { sur: "Prestations", titre: "Tarifs 2026", items: ["Coupe femme|38 €", "Coupe homme|25 €", "Couleur racines|45 €", "Balayage|85 €", "Brushing|22 €", "Soin profond|18 €"], meta: "TARIFS TTC — SUR RENDEZ-VOUS" }],

  /* ── Événement ── */
  ["evenement", "carre", 15, "Événement", "Soirée club", { sur: "Ce samedi", titre: "Nuit\nélectro", meta: "SAMEDI 4 OCTOBRE — 23H", sous: "Le Sous-sol, Bordeaux", cta: "Prévente en ligne" }],
  ["evenement", "carre", 3, "Événement", "Marché de producteurs", { sur: "Tous les dimanches", titre: "Marché\ndes producteurs", meta: "DIMANCHE — DE 8H À 13H", sous: "Place de la République", cta: "Venez tôt !" }],
  ["evenement", "portrait", 8, "Événement", "Vernissage", { sur: "Exposition", titre: "Traces\net passages", meta: "VERNISSAGE JEUDI 15 MAI — 18H", sous: "Galerie du Port, La Rochelle", cta: "Entrée libre" }],
  ["evenement", "portrait", 11, "Événement", "Webinaire", { sur: "En ligne", titre: "Bien démarrer\nson site", meta: "MARDI 3 JUIN — 13H", sous: "Une heure, questions comprises", cta: "Lien envoyé après inscription" }],
  ["cadre", "portrait", 16, "Événement", "Menu de mariage", { sur: "Le dîner", titre: "Léa & Marc", sous: "Amuse-bouches de saison\nRisotto aux asperges\nAgneau confit, jus au thym\nPièce montée", meta: "6 JUIN 2026" }],
  ["etapes", "portrait", 0, "Événement", "Programme de journée", { titre: "Programme\nde la journée", sous: "Samedi 12 avril", items: ["9h30|Accueil et café", "10h|Conférence d'ouverture", "14h|Ateliers en petits groupes", "17h|Clôture et pot"] }],
  ["liste", "portrait", 12, "Événement", "Liste d'invités", { sur: "Anniversaire", titre: "Ce qu'il faut\napporter", items: ["Une chaise pliante", "Un plat à partager", "De quoi couvrir en soirée", "Ta playlist préférée"], meta: "On s'occupe des boissons." }],
  ["mosaique", "portrait", 2, "Événement", "Kermesse", { titre: "Kermesse de l'école", sous: "Samedi 21 juin — jeux, stands et buvette" }],

  /* ── CV & document ── */
  ["cv", "cv", 0, "CV & document", "CV sombre", { gros: "TX", titre: "Thomas\nXey", sur: "Chef de projet digital", sous: "thomas@exemple.fr\n+33 6 00 00 00 00\nLyon (69)\nlinkedin.com/in/exemple", meta: "PARCOURS", items: ["Chef de projet — Studio Nova|2022 → aujourd'hui. Pilotage de six projets clients, budgets de 40 à 200 k€.", "Consultant — Cabinet Rivage|2019 → 2022. Cadrage et conduite du changement.", "Chargé de mission — Ville de Lyon|2017 → 2019. Numérisation des services au public.", "Master Management de projet|Université Lyon 3 — 2017."] }],
  ["cv", "cv", 11, "CV & document", "CV clair", { gros: "AL", titre: "Aline\nLegrand", sur: "Développeuse front-end", sous: "aline@exemple.fr\n+33 6 00 00 00 00\nNantes — télétravail\ngithub.com/exemple", meta: "EXPÉRIENCE", items: ["Développeuse senior — Filehub|2023 → aujourd'hui. Studio Design, éditeur temps réel.", "Développeuse — Atelier Web|2020 → 2023. Sites e-commerce, accessibilité.", "Alternance — Agence Bleu|2018 → 2020. Intégration et maintenance.", "Licence informatique|Université de Nantes — 2020."] }],
  ["cv", "cv", 16, "CV & document", "CV sobre", { gros: "CF", titre: "Camille\nFournier", sur: "Boulangère — chef d'équipe", sous: "camille@exemple.fr\n+33 6 00 00 00 00\nNantes (44)", meta: "PARCOURS", items: ["Chef d'équipe — Le Fournil|2021 → aujourd'hui. Encadrement de quatre personnes.", "Boulangère — Maison Rousseau|2017 → 2021. Levain naturel, cuisson au bois.", "Apprentie — Boulangerie du Port|2015 → 2017.", "CAP Boulangerie|CFA de Nantes — 2017."] }],
  ["diapo", "a4", 1, "CV & document", "Lettre de motivation", { sur: "Candidature", titre: "Chef·fe de\nprojet digital", sous: "Madame, Monsieur,\n\nVotre annonce a retenu mon attention parce qu'elle décrit\nexactement ce que je fais depuis six ans : faire tenir\nensemble des équipes, un budget et une échéance.", items: ["Six ans de pilotage de projets", "Habitude des équipes mixtes", "Disponible sous un mois", "Mobilité Lyon et Paris"], meta: "Thomas Xey — thomas@exemple.fr" }],
  ["menu", "a4", 11, "CV & document", "Devis", { sur: "Devis n° 2026-014", titre: "Refonte du site", items: ["Cadrage et ateliers|1 200 €", "Maquettes (8 écrans)|2 400 €", "Intégration|3 600 €", "Reprise du contenu|900 €", "Formation (une journée)|700 €", "Total HT|8 800 €"], meta: "VALABLE 30 JOURS — ACOMPTE 30 %" }],
  ["menu", "a4", 1, "CV & document", "Facture", { sur: "Facture n° 2026-031", titre: "Prestations de mars", items: ["Accompagnement (12 h)|1 080 €", "Développement (28 h)|2 520 €", "Hébergement (mars)|45 €", "Total HT|3 645 €", "TVA 20 %|729 €", "Total TTC|4 374 €"], meta: "PAIEMENT À 30 JOURS — VIREMENT" }],
  ["liste", "a4", 20, "CV & document", "Compte rendu", { sur: "Réunion du 12 mars", titre: "Compte rendu\nde réunion", items: ["Le budget du T2 est validé en l'état", "Le recrutement data est reporté à septembre", "La version 3 sort le 15 mai, sans l'API", "Prochaine réunion : mardi 26 mars, 10 h"], meta: "Rédigé par T. Xey — diffusé le 13 mars" }],
  ["diapo", "a4", 17, "CV & document", "Fiche de poste", { sur: "Fiche de poste", titre: "Développeur·se\nfront-end", sous: "CDI, temps plein, Lyon ou distanciel complet.\nRattachement : responsable technique.", items: ["Développer les interfaces du produit", "Participer aux revues de code", "Contribuer aux choix techniques", "Accompagner les nouveaux arrivants"], meta: "Publiée le 3 mars 2026" }],

  /* ── Web & e-mail ── */
  ["bandeau", "large", 0, "Web & e-mail", "En-tête d'infolettre", { sur: "Infolettre — mars", titre: "Ce qui a changé\nce mois-ci", sous: "Trois nouveautés, une correction et un mot sur la suite.", cta: "Lire en ligne" }],
  ["bandeau", "large", 14, "Web & e-mail", "En-tête bienvenue", { sur: "Bienvenue", titre: "Content de\nvous compter parmi nous", sous: "Voici par où commencer pour prendre en main l'outil.", cta: "Commencer" }],
  ["panneau", "large", 21, "Web & e-mail", "Bandeau d'accueil", { sur: "Nouveau", titre: "Tout votre travail,\nau même endroit.", sous: "Documents, design et partage, sans changer d'outil.", meta: "Essai gratuit — sans carte", gros: "✦" }],
  ["stats", "bandeau", 13, "Web & e-mail", "Bandeau de preuves", { sur: "Ils nous font confiance", titre: "Trois chiffres", items: ["12 000|utilisateurs", "4,8/5|note moyenne", "99,9 %|disponibilité"], meta: "Mis à jour chaque trimestre." }],
  ["banniere", "bandeau", 9, "Web & e-mail", "Bandeau promotionnel", { gros: "%", titre: "Soldes en cours", sous: "Jusqu'à -50 % sur les abonnements annuels.", cta: "En profiter" }],
  ["duo", "large", 11, "Web & e-mail", "Bandeau comparatif", { items: ["SANS|Des heures perdues à chercher.", "AVEC|Tout retrouvé en trois secondes."], gros: "→" }],
  ["cartes", "bandeau", 6, "Web & e-mail", "Bandeau trois atouts", { titre: "Pourquoi nous", sous: "Trois raisons, pas trente", items: ["Simple|Prise en main en dix minutes", "Sûr|Chiffrement de bout en bout", "Ouvert|Export à tout moment"] }],
  ["chiffre", "large", 19, "Web & e-mail", "Compte à rebours e-mail", { sur: "Dernier jour", gros: "24h", titre: "avant la fin de l'offre", sous: "Ensuite, retour au tarif normal.", cta: "J'EN PROFITE" }],

  /* ── Podcast & musique ── */
  ["neon", "pod", 23, "Podcast & musique", "Pochette néon", { gros: "◉", titre: "Signal faible", sous: "UN ÉPISODE PAR SEMAINE" }],
  ["embleme", "pod", 15, "Podcast & musique", "Pochette emblème", { gros: "SF", titre: "Sur le fil", sous: "CONVERSATIONS SANS FILTRE", meta: "ellipse" }],
  ["couverture", "pod", 8, "Podcast & musique", "Pochette éditoriale", { sur: "Podcast", titre: "Métiers\nde l'ombre", sous: "Ceux qui font tourner ce qu'on ne voit pas.", auteur: "SAISON 2" }],
  ["retro", "pod", 2, "Podcast & musique", "Pochette rétro", { sur: "Album", titre: "Été\nindien", sous: "12 titres — 2026" }],
  ["organique", "pod", 4, "Podcast & musique", "Pochette douce", { sur: "EP", titre: "Lueurs", sous: "Quatre morceaux enregistrés en une nuit.", cta: "Écouter" }],
  ["mosaique", "pod", 13, "Podcast & musique", "Pochette graphique", { titre: "Fréquences", sous: "Compilation — volume 3" }],
  ["miniature", "yt", 15, "Podcast & musique", "Miniature d'épisode", { titre: "ELLE A TOUT\nQUITTÉ POUR\nÇA", meta: "ÉPISODE 41", emoji: "🎙️" }],
  ["centre", "pod", 22, "Podcast & musique", "Pochette typographique", { sur: "Nouvel album", titre: "SILENCE\nRADIO", sous: "Sortie le 14 novembre" }],

  /* ── Sport & bien-être ── */
  ["chiffre", "carre", 20, "Sport & bien-être", "Défi 30 jours", { sur: "Défi", gros: "30", titre: "jours pour reprendre", sous: "Dix minutes par jour, pas plus.", cta: "JE M'INSCRIS" }],
  ["etapes", "story", 3, "Sport & bien-être", "Séance en 4 temps", { titre: "Séance\ndu matin", sous: "Quinze minutes, sans matériel", items: ["Échauffement|Trois minutes de mobilité.", "Cardio|Quatre fois trente secondes.", "Renforcement|Gainage et fentes.", "Retour au calme|Étirements et respiration."] }],
  ["tarif", "carre", 19, "Sport & bien-être", "Abonnement salle", { sur: "Formule Liberté", gros: "39 €", sous: "par mois, sans engagement", items: ["Accès 6h – 23h", "Cours collectifs inclus", "Suivi tous les deux mois", "Accès aux trois salles"], cta: "Je m'abonne" }],
  ["temoignage", "carre", 14, "Sport & bien-être", "Témoignage sportif", { titre: "« Trois mois,\nquatre kilos,\net surtout : je dors. »", auteur: "Marc T.", sous: "Adhérent depuis janvier", emoji: "💪" }],
  ["liste", "portrait", 15, "Sport & bien-être", "Routine du soir", { sur: "Récupération", titre: "Cinq gestes\navant de dormir", items: ["Couper les écrans une heure avant", "Baisser la lumière", "Cinq minutes d'étirements", "Aérer la chambre", "Se coucher à heure fixe"], meta: "Enregistre pour ce soir" }],
  ["organique", "story", 7, "Sport & bien-être", "Séance de yoga", { sur: "Yoga doux", titre: "Reviens\nà ta respiration", sous: "Vingt minutes pour desserrer les épaules.", cta: "Rejoindre la séance" }],

  /* ── Immobilier & services ── */
  ["annonce", "portrait", 1, "Immobilier & services", "Annonce appartement", { gros: "1 150 € / mois", titre: "T3 de 68 m² avec balcon", sous: "Quartier Saint-Michel, 3e étage avec ascenseur", items: ["Deux chambres", "Balcon exposé sud", "Charges : 90 € — DPE : D"], emoji: "🏢" }],
  ["annonce", "portrait", 16, "Immobilier & services", "Annonce maison", { gros: "329 000 €", titre: "Maison de village rénovée", sous: "Quatre pièces, jardin clos, garage", items: ["112 m² habitables", "Toiture refaite en 2023", "Chauffage pompe à chaleur"], emoji: "🏠" }],
  ["annonce", "portrait", 11, "Immobilier & services", "Annonce local", { gros: "890 € / mois", titre: "Local commercial 45 m²", sous: "Rue passante, vitrine de 6 mètres", items: ["Bail 3/6/9", "Réserve de 12 m²", "Libre au 1er juillet"], emoji: "🏪" }],
  ["cartes", "large", 17, "Immobilier & services", "Trois prestations", { titre: "Nos prestations", sous: "Devis gratuit sous 24 heures", items: ["Diagnostic|État des lieux complet", "Travaux|Suivi de chantier", "Livraison|Réception et garanties"] }],
  ["recrute", "carre", 12, "Immobilier & services", "Recrutement artisan", { sur: "ON RECRUTE", titre: "Menuisier·ère\nposeur", sous: "CDI · Chantiers en Loire-Atlantique", items: ["Pose de menuiseries extérieures", "Lecture de plans", "Permis B exigé"], meta: "recrutement@exemple.fr" }],
  ["recrute", "carre", 6, "Immobilier & services", "Recrutement service", { sur: "ON RECRUTE", titre: "Conseiller·ère\nclientèle", sous: "CDD 6 mois · Bordeaux", items: ["Accueil et suivi des demandes", "Traitement des réclamations", "Aisance à l'écrit"], meta: "rh@exemple.fr" }],

  /* ── Éducation & association ── */
  ["bandeau", "a4", 1, "Éducation & association", "Affiche rentrée", { sur: "Année 2026-2027", titre: "Inscriptions\nouvertes", sous: "Du 2 au 30 juin, en ligne ou au secrétariat.\nPièces à fournir sur le site.", cta: "S'INSCRIRE" }],
  ["liste", "a4", 14, "Éducation & association", "Fournitures scolaires", { sur: "Classe de 6e", titre: "Liste de\nfournitures", items: ["Un cahier grand format par matière", "Trousse complète et calculatrice", "Une clé USB de 8 Go", "Tenue de sport et chaussures propres", "Un agenda (pas de téléphone)"], meta: "Collège Jean-Moulin — juin 2026" }],
  ["evenement", "a4", 15, "Éducation & association", "Fête de l'école", { sur: "On y est", titre: "Fête\nde l'école", meta: "SAMEDI 21 JUIN — DÈS 14H", sous: "Cour de l'école, entrée libre", cta: "Buvette tenue par les parents" }],
  ["etapes", "a4", 20, "Éducation & association", "Devenir bénévole", { titre: "Devenir\nbénévole", sous: "Quatre étapes, une demi-heure", items: ["Prendre contact|Un formulaire, trois questions.", "Rencontre|Un café avec un référent.", "Essai|Une première mission courte.", "Engagement|Le rythme que vous choisissez."] }],
  ["stats", "a4", 3, "Éducation & association", "Bilan associatif", { sur: "Rapport moral", titre: "Notre année\nen chiffres", items: ["216|bénévoles actifs", "8 400|repas distribués", "31|maraudes"], meta: "Assemblée générale — 12 avril 2026" }],
  ["chiffre", "carre", 19, "Éducation & association", "Appel aux dons", { sur: "Collecte", gros: "18 €", titre: "financent un repas chaud", sous: "Chaque don compte, même petit.", cta: "JE DONNE" }],

  /* ── Voyage & saison ── */
  ["couverture", "pin", 17, "Voyage & saison", "Carnet de voyage", { sur: "Carnet", titre: "Deux\nsemaines\nen Sicile", sous: "Itinéraire, budget et ce que j'aurais fait autrement.", auteur: "JOURNAL DE BORD" }],
  ["liste", "pin", 7, "Voyage & saison", "Valise essentielle", { sur: "Check-list", titre: "Ma valise\ncabine", items: ["Une trousse de toilette au format", "Trois hauts, deux bas, un pull", "Chargeur et adaptateur", "Copies des documents", "Une gourde vide"], meta: "7 kg, pas un de plus" }],
  ["evenement", "story", 12, "Voyage & saison", "Départ en vacances", { sur: "C'est parti", titre: "Cap\nau sud", meta: "DÉPART SAMEDI — 6H", sous: "Trois semaines, zéro réveil", cta: "Suivez le voyage" }],
  ["retro", "carre", 13, "Voyage & saison", "Nouvel an", { sur: "Réveillon", titre: "Bonne\nannée", sous: "Rendez-vous à minuit" }],
  ["organique", "carre", 2, "Voyage & saison", "Automne", { sur: "Saison", titre: "L'automne\nest arrivé", sous: "Nouvelles teintes en boutique.", cta: "Découvrir" }],
  ["mosaique", "carre", 4, "Voyage & saison", "Printemps", { titre: "Le printemps arrive", sous: "Collection fleurie, disponible en ligne" }],
  ["neon", "carre", 0, "Voyage & saison", "Fêtes de fin d'année", { gros: "❄", titre: "Joyeuses fêtes", sous: "BOUTIQUE OUVERTE JUSQU'AU 24" }],
  ["cadre", "carre", 21, "Voyage & saison", "Vœux sobres", { sur: "2026", titre: "Belle année\nà vous", sous: "Merci pour cette année passée ensemble.", meta: "L'ÉQUIPE" }],
  /* ── Instagram, suite ── */
  ["typo", "carre", 9, "Instagram", "Typo pleine page", { titre: "Fais\nle\npremier\npas", sous: "Le reste suit toujours.", meta: "@votrecompte" }],
  ["typo", "carre", 3, "Instagram", "Typo verte", { titre: "Moins\nmais\nmieux", sous: "Notre engagement pour 2026.", meta: "Manifeste" }],
  ["question", "carre", 1, "Instagram", "Question ouverte", { sur: "On vous écoute", titre: "Et vous, qu'est-ce\nqui vous fait\nvraiment gagner\ndu temps ?", sous: "Répondez en commentaire, on compile la semaine prochaine." }],
  ["question", "carre", 15, "Instagram", "Idée reçue", { sur: "Idée reçue", titre: "« Il faut être\nà l'aise en dessin\npour créer. »", sous: "Faux. Il faut surtout un bon point de départ." }],
  ["ruban", "carre", 5, "Instagram", "Ruban promo", { sur: "Cette semaine", titre: "-20 %", sous: "Sur toute la papeterie, en boutique et en ligne.", meta: "JUSQU'À DIMANCHE" }],
  ["grille", "carre", 11, "Instagram", "Portfolio six vues", { titre: "Six projets\nde l'année", sous: "Identité, web, édition", items: ["Atelier Bois", "Fleur & Feuille", "Port & Cie", "Le Fournil", "Studio Halo", "Nova"], meta: "Voir le portfolio complet →" }],
  ["equipe", "carre", 7, "Instagram", "Présentation d'équipe", { titre: "L'équipe", sous: "Quatre personnes, un même bureau", items: ["Camille|Direction artistique", "Noé|Développement", "Aline|Contenus", "Marc|Relation client"] }],
  ["calendrier", "carre", 0, "Instagram", "Date à retenir", { sur: "JUIN 2026", gros: "12", titre: "Journée portes\nouvertes", items: ["De 10 h à 18 h", "Entrée libre", "Ateliers toutes les heures", "Petite restauration sur place"] }],
  ["fiche", "carre", 14, "Instagram", "Recette en fiche", { titre: "Cookies au sarrasin", meta: "12 pièces — 25 minutes", sur: "INGRÉDIENTS", sous: "PRÉPARATION", items: ["120 g de farine de sarrasin", "100 g de beurre mou", "80 g de sucre de canne", "Préchauffer à 180 °C", "Mélanger beurre et sucre", "Ajouter la farine, former des boules", "Cuire 12 minutes"] }],
  ["colonnes", "carre", 16, "Instagram", "Article court", { sur: "Décryptage", titre: "Pourquoi\nvos fichiers\nse perdent", sous: "Ce n'est pas un problème de rangement, c'est un problème de nommage.", items: ["Un fichier bien nommé se retrouve sans dossier. Un fichier mal nommé se perd même bien rangé. La règle tient en trois éléments : la date, le sujet, la version.", "Commencez par la date au format inversé. Puis le sujet en deux mots. Puis la version, jamais « final ». Trois mois plus tard, vous remercierez cette discipline."], meta: "LECTURE — 2 MIN" }],
  ["centre", "portrait", 12, "Instagram", "Post portrait", { sur: "Nouveauté", titre: "La collection\nautomne\nest arrivée", sous: "Teintes chaudes, matières épaisses." }],
  ["cartes", "portrait", 20, "Instagram", "Trois piliers", { titre: "Nos trois\nengagements", sous: "Simples, vérifiables", items: ["Local|Tout fabriqué en France", "Durable|Garantie cinq ans", "Juste|Prix affiché, sans promo permanente"] }],
  ["stats", "portrait", 4, "Instagram", "Chiffres portrait", { sur: "Depuis le début", titre: "Merci pour\nces trois ans", items: ["3 200|commandes", "97 %|d'avis positifs", "0|plastique"], meta: "Et ce n'est qu'un début." }],
  ["liste", "portrait", 17, "Instagram", "Erreurs fréquentes", { sur: "À éviter", titre: "Cinq erreurs\nde débutant", items: ["Trop de polices sur une page", "Un texte collé au bord", "Des couleurs sans contraste", "Aucune hiérarchie de tailles", "Un logo étiré"], meta: "→ Enregistre pour plus tard" }],
  ["temoignage", "portrait", 21, "Instagram", "Avis portrait", { titre: "« Je pensais qu'il\nme faudrait un graphiste.\nJ'ai fait l'affiche\nmoi-même. »", auteur: "Julie R.", sous: "Gérante d'un salon de thé", emoji: "☕" }],

  /* ── Story & Reel, suite ── */
  ["typo", "story", 13, "Story & Reel", "Typo verticale", { titre: "Ça\ncommence\nlundi", sous: "Sept jours, sept exercices.", meta: "Rejoins le défi" }],
  ["question", "story", 0, "Story & Reel", "Sondage story", { sur: "Sondage", titre: "Vous préférez\nquoi, au fond :\nplus vite ou\nplus simple ?", sous: "Réponds avec le sticker au-dessus ⬆︎" }],
  ["ruban", "story", 9, "Story & Reel", "Ruban vente", { sur: "Dernière heure", titre: "-70 %", sous: "Sur les derniers articles disponibles.", meta: "SE TERMINE À MINUIT" }],
  ["grille", "story", 8, "Story & Reel", "Six nouveautés", { titre: "Six nouveautés\ncette semaine", sous: "Balaye pour tout voir", items: ["Chemise lin", "Tote bag", "Carnet", "Mug", "Affiche", "Bougie"], meta: "Boutique en ligne ouverte →" }],
  ["calendrier", "story", 3, "Story & Reel", "Rappel de date", { sur: "SEPTEMBRE 2026", gros: "05", titre: "Rentrée des\nateliers", items: ["Premier cours à 18 h", "Places limitées à 12", "Inscription sur le site"] }],
  ["fiche", "story", 12, "Story & Reel", "Fiche pratique", { titre: "Détacher un vêtement", meta: "Sans machine, en 10 minutes", sur: "IL FAUT", sous: "ON FAIT", items: ["Du savon de Marseille", "De l'eau tiède", "Un chiffon propre", "Tamponner, ne pas frotter", "Laisser agir 5 minutes", "Rincer à l'eau claire"] }],
  ["equipe", "story", 11, "Story & Reel", "Qui fait quoi", { titre: "Qui vous\nrépond", sous: "Une petite équipe, joignable", items: ["Camille|Commandes", "Noé|Technique", "Aline|Ateliers", "Marc|Livraisons"] }],
  ["colonnes", "story", 22, "Story & Reel", "Édito vertical", { sur: "Édito", titre: "Ce qui\nchange\ncette année", sous: "Trois décisions prises cet hiver, et pourquoi.", items: ["Nous arrêtons les promotions permanentes. Le prix affiché est le prix juste, toute l'année, sans compte à rebours artificiel.", "Nous passons au réemploi pour tous les emballages. C'est un peu plus lent au départ, et beaucoup mieux ensuite."], meta: "L'ÉQUIPE" }],

  /* ── YouTube, suite ── */
  ["miniature", "yt", 11, "YouTube", "Miniature interview", { titre: "IL A DIT\nCE QUE\nPERSONNE N'OSE", meta: "INTERVIEW", emoji: "🎤" }],
  ["miniature", "yt", 20, "YouTube", "Miniature avant/après", { titre: "AVANT\nAPRÈS :\nLE RÉSULTAT", meta: "TRANSFORMATION", emoji: "😱" }],
  ["miniature", "yt", 2, "YouTube", "Miniature cuisine", { titre: "LA RECETTE\nEN 3\nINGRÉDIENTS", meta: "FACILE", emoji: "🍳" }],
  ["miniature", "yt", 17, "YouTube", "Miniature voyage", { titre: "7 JOURS\nAVEC 300 €", meta: "CARNET", emoji: "✈️" }],
  ["typo", "yt", 23, "YouTube", "Carton de titre", { titre: "ÉPISODE 12", sous: "Ce que personne ne vous dit sur les débuts.", meta: "Nouvelle saison" }],
  ["grille", "ytban", 13, "YouTube", "Bannière portfolio", { titre: "Studio Halo", sous: "Motion design et identité visuelle", items: ["Habillage", "Générique", "Logo animé", "Réseaux", "Clip", "Spot"], meta: "Nouvelle vidéo chaque jeudi" }],
  ["question", "yt", 5, "YouTube", "Écran de question", { sur: "Question du jour", titre: "Faut-il vraiment\npublier tous les jours ?", sous: "La réponse en trois minutes." }],

  /* ── LinkedIn, suite ── */
  ["typo", "large", 0, "LinkedIn", "Accroche typographique", { titre: "ON RECRUTE", sous: "Trois postes ouverts, à Lyon ou en distanciel complet.", meta: "carrieres@exemple.fr" }],
  ["colonnes", "li", 11, "LinkedIn", "Tribune", { sur: "Tribune", titre: "Le télétravail\nn'a pas tué\nle bureau", sous: "Il l'a obligé à justifier son existence — et c'est une bonne nouvelle.", items: ["Pendant trois ans, on a opposé les deux. À distance pour se concentrer, au bureau pour se voir. La réalité observée dans nos équipes est plus simple : les gens viennent quand il se passe quelque chose.", "Le bureau redevient ce qu'il n'aurait jamais dû cesser d'être : un lieu de rencontres décidées, pas une obligation de présence. Reste à en faire un endroit où l'on a envie d'aller."], meta: "THOMAS XEY — MARS 2026" }],
  ["equipe", "li", 1, "LinkedIn", "Nouvelles arrivées", { titre: "Bienvenue\nà elles et eux", sous: "Quatre arrivées ce trimestre", items: ["Sofia|Directrice des opérations", "Marc|Ingénieur données", "Léa|Designer produit", "Yanis|Support client"] }],
  ["question", "li", 20, "LinkedIn", "Question au réseau", { sur: "Retour d'expérience", titre: "Combien de temps\nfaut-il vraiment\npour recruter\nun bon profil ?", sous: "Chez nous : onze semaines en moyenne. Et chez vous ?" }],
  ["calendrier", "li", 13, "LinkedIn", "Annonce de webinaire", { sur: "MAI 2026", gros: "22", titre: "Webinaire :\nchiffrer un projet", items: ["Jeudi 22 mai, 13 h", "45 minutes + questions", "Gratuit, sur inscription", "Replay envoyé aux inscrits"] }],
  ["ruban", "large", 7, "LinkedIn", "Annonce de levée", { sur: "Nouvelle étape", titre: "2,5 M€", sous: "Pour ouvrir trois marchés et doubler l'équipe technique.", meta: "MERCI À NOS INVESTISSEURS" }],
  ["grille", "li", 16, "LinkedIn", "Nos réalisations", { titre: "Ce que nous\navons livré", sous: "Sur les douze derniers mois", items: ["Refonte SI", "App mobile", "Portail client", "Entrepôt de données", "Automatisation", "Formation"], meta: "Détails sur demande" }],
  ["fiche", "li", 17, "LinkedIn", "Fiche méthode", { titre: "Préparer un entretien", meta: "Pour les candidats comme pour les recruteurs", sur: "À PRÉPARER", sous: "À ÉVITER", items: ["Trois exemples concrets", "Deux questions sincères", "Un ordre de grandeur salarial", "Réciter son CV", "Improviser la fin", "Ne rien demander"] }],

  /* ── Facebook, suite ── */
  ["typo", "large", 12, "Facebook", "Accroche restaurant", { titre: "OUVERT\nLE DIMANCHE", sous: "Service continu de 11 h à 22 h.", meta: "Réservation conseillée" }],
  ["calendrier", "large", 15, "Facebook", "Événement daté", { sur: "OCTOBRE 2026", gros: "04", titre: "Concert\nau Trianon", items: ["Ouverture des portes 20 h", "Première partie 21 h", "Billetterie en ligne"] }],
  ["grille", "couv", 6, "Facebook", "Couverture services", { titre: "Nos services", sous: "Une équipe, six métiers", items: ["Plomberie", "Électricité", "Peinture", "Menuiserie", "Carrelage", "Dépannage"], meta: "Devis gratuit — 04 00 00 00 00" }],
  ["ruban", "large", 2, "Facebook", "Annonce d'ouverture", { sur: "Enfin", titre: "ON OUVRE", sous: "Samedi 12 avril, à partir de 10 h — café offert.", meta: "12 RUE DES HALLES, NANTES" }],
  ["equipe", "large", 21, "Facebook", "Notre équipe", { titre: "Qui vous accueille", sous: "Du mardi au samedi", items: ["Camille|Gérante", "Noé|Boulanger", "Aline|Pâtissière", "Marc|Vente"] }],
  ["question", "large", 19, "Facebook", "Question aux clients", { sur: "On prépare la carte", titre: "Quel plat aimeriez-vous\nretrouver cet automne ?", sous: "Dites-le en commentaire, on en choisira trois." }],

  /* ── Pinterest, suite ── */
  ["fiche", "pin", 12, "Pinterest", "Fiche recette longue", { titre: "Soupe de courge rôtie", meta: "4 personnes — 45 minutes", sur: "INGRÉDIENTS", sous: "PRÉPARATION", items: ["1 courge butternut", "1 oignon, 2 gousses d'ail", "30 cl de bouillon", "Crème et noisettes", "Couper et rôtir 30 min à 200 °C", "Faire suer l'oignon et l'ail", "Mixer avec le bouillon", "Servir avec crème et noisettes"] }],
  ["grille", "pin", 8, "Pinterest", "Planche d'inspiration", { titre: "Palette\nautomne", sous: "Six teintes qui vont ensemble", items: ["Terracotta", "Ocre", "Vert sauge", "Crème", "Brun", "Rouille"], meta: "Enregistre la planche →" }],
  ["typo", "pin", 4, "Pinterest", "Affiche typographique", { titre: "SLOW\nLIVING", sous: "Faire moins de choses, mieux.", meta: "Journal" }],
  ["calendrier", "pin", 14, "Pinterest", "Planning de semaine", { sur: "SEMAINE TYPE", gros: "7", titre: "jours, un rythme", items: ["Lundi : planifier", "Mercredi : créer", "Vendredi : ranger", "Dimanche : ne rien faire"] }],
  ["colonnes", "pin", 17, "Pinterest", "Article de blog", { sur: "Maison", titre: "Une entrée\nqui range\nvraiment", sous: "Trois mètres carrés bien pensés valent mieux qu'un dressing.", items: ["Le principe est simple : ce qui sert tous les jours reste visible, le reste disparaît. Une patère à hauteur d'adulte, une autre à hauteur d'enfant, un banc creux pour les chaussures.", "Ajoutez un miroir en face de la porte : il double la lumière et sert au dernier coup d'œil. Et surtout, une corbeille pour ce qui traîne — vidée le dimanche."], meta: "LECTURE — 4 MIN" }],
  ["question", "pin", 5, "Pinterest", "Question déco", { sur: "Dilemme", titre: "Peindre le plafond\nen couleur :\nbonne ou mauvaise\nidée ?", sous: "Ça dépend de la hauteur sous plafond. On vous explique." }],

  /* ── Marque & logo, suite ── */
  ["embleme", "logo", 9, "Marque & logo", "Bouclier rouge", { gros: "SR", titre: "Sécurité Rivage", sous: "SURVEILLANCE ET GARDIENNAGE", meta: "shield" }],
  ["embleme", "logo", 14, "Marque & logo", "Rond nature", { gros: "V", titre: "Verger du Pré", sous: "JUS ET CONFITURES", meta: "ellipse" }],
  ["embleme", "logo", 7, "Marque & logo", "Octogone", { gros: "OC", titre: "Océan Conseil", sous: "STRATÉGIE MARITIME", meta: "octagon" }],
  ["embleme", "logo", 19, "Marque & logo", "Sceau rouge", { gros: "MR", titre: "Maison Rousseau", sous: "TRAITEUR DEPUIS 1954", meta: "seal" }],
  ["typo", "logo", 22, "Marque & logo", "Logotype plein", { titre: "HALO", sous: "Studio de création", meta: "Depuis 2021" }],
  ["typo", "logo", 13, "Marque & logo", "Logotype nuit", { titre: "NOVA", sous: "Logiciels utiles", meta: "nova.fr" }],
  ["centre", "logo", 11, "Marque & logo", "Nom et baseline", { sur: "Cabinet", titre: "LEGRAND\n& ASSOCIÉS", sous: "Droit du travail — Lyon" }],
  ["neon", "logo", 0, "Marque & logo", "Signe nocturne", { gros: "◈", titre: "Prisme", sous: "AGENCE CRÉATIVE" }],

  /* ── Carte & papeterie, suite ── */
  ["visite", "carte", 3, "Carte & papeterie", "Carte de visite verte", { gros: "VP", titre: "Vincent Petit", sur: "Paysagiste — Verger du Pré", sous: "vincent@vergerdupre.fr\nvergerdupre.fr\n+33 6 00 00 00 00" }],
  ["visite", "carte", 9, "Carte & papeterie", "Carte de visite rouge", { gros: "MR", titre: "Marie Rousseau", sur: "Traiteur — Maison Rousseau", sous: "contact@maisonrousseau.fr\n8 place du Marché, Rennes\n+33 2 00 00 00 00" }],
  ["visite", "carte", 7, "Carte & papeterie", "Carte de visite cyan", { gros: "PC", titre: "Paul Corbin", sur: "Location de bateaux", sous: "paul@portetcie.fr\nportetcie.fr\n+33 6 00 00 00 00" }],
  ["cadre", "a5", 21, "Carte & papeterie", "Carte de remerciement", { sur: "Merci", titre: "Merci\nd'être venus", sous: "Votre présence a fait toute la soirée.", meta: "LÉA & MARC" }],
  ["cadre", "a5", 12, "Carte & papeterie", "Invitation crémaillère", { sur: "Pendaison de crémaillère", titre: "On s'installe", sous: "Venez voir, il y aura à boire et à manger.", meta: "SAMEDI 14 MARS — 19H" }],
  ["cadre", "a5", 3, "Carte & papeterie", "Invitation baptême", { sur: "Baptême", titre: "Gabriel", sous: "Nous serions heureux de vous compter parmi nous.", meta: "DIMANCHE 7 JUIN — 11H" }],
  ["calendrier", "a5", 0, "Carte & papeterie", "Carte de rendez-vous", { sur: "PROCHAIN RENDEZ-VOUS", gros: "18", titre: "Cabinet Legrand", items: ["Mardi 18 mars — 14 h 30", "12 rue de la Paix, Lyon 2e", "Prévoir vos justificatifs", "Annulation 48 h à l'avance"] }],
  ["billet", "billet", 20, "Carte & papeterie", "Carte de vestiaire", { sur: "Vestiaire", titre: "Gardez\nce ticket", meta: "Un article par ticket.\nÉtablissement non responsable en cas de perte.", gros: "N° 128", sous: "MERCI" }],
  ["certificat", "a4", 21, "Carte & papeterie", "Certificat de bénévolat", { sur: "Attestation", titre: "Engagement bénévole", auteur: "PRÉNOM NOM", sous: "a consacré 120 heures aux maraudes de l'association\nentre janvier et décembre 2025.", meta: "La présidente" }],
  ["certificat", "a4", 0, "Carte & papeterie", "Certificat de garantie", { sur: "Garantie", titre: "Garantie 5 ans — mobilier", auteur: "N° 2026-0431", sous: "Pièces et main-d'œuvre, hors usure normale\net dommages accidentels.", meta: "Le fabricant" }],

  /* ── Impression, suite ── */
  ["typo", "a4", 5, "Impression", "Affiche typo", { titre: "GRANDE\nVENTE", sous: "Trois jours, tout doit partir.", meta: "12 — 14 AVRIL" }],
  ["ruban", "a4", 15, "Impression", "Affiche spectacle", { sur: "Compagnie du Vent", titre: "L'ENVOL", sous: "Théâtre de rue — tout public à partir de 6 ans.", meta: "SAMEDI 20 JUIN — 18H — PLACE DU MARCHÉ" }],
  ["grille", "a4", 6, "Impression", "Affiche programme", { titre: "Programme\nde la saison", sous: "Six rendez-vous, de septembre à février", items: ["Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février"], meta: "Réservations au 04 00 00 00 00" }],
  ["fiche", "a4", 1, "Impression", "Mode d'emploi", { titre: "Monter l'étagère", meta: "Deux personnes — 40 minutes", sur: "FOURNI", sous: "MONTAGE", items: ["4 montants", "6 tablettes", "24 vis + clé Allen", "Assembler les montants au sol", "Fixer la tablette du bas", "Redresser et plaquer au mur", "Visser l'équerre anti-bascule"] }],
  ["equipe", "a4", 11, "Impression", "Affiche équipe", { titre: "Votre équipe\nmédicale", sous: "Maison de santé du Bourg", items: ["Dr Martin|Médecin généraliste", "Dr Nguyen|Pédiatre", "Aline|Infirmière", "Marc|Kinésithérapeute"] }],
  ["calendrier", "a4", 3, "Impression", "Affiche date unique", { sur: "MARS 2026", gros: "21", titre: "Nettoyage\nde printemps", items: ["Rendez-vous 9 h, place de la mairie", "Gants et sacs fournis", "Pique-nique offert à midi", "Ouvert à tous, enfants bienvenus"] }],
  ["colonnes", "a4", 16, "Impression", "Page de journal", { sur: "Vie locale", titre: "La halle\nrouvre\nen juin", sous: "Après dix-huit mois de travaux, le marché retrouve son toit.", items: ["Les charpentes ont été entièrement reprises, et la couverture en zinc remplacée. Le sol, longtemps glissant, a été refait en pierre naturelle antidérapante.", "Vingt-huit emplacements sont prévus, contre vingt-deux auparavant. Les commerçants réintégreront les lieux le 6 juin, jour de la réouverture officielle."], meta: "BULLETIN MUNICIPAL — AVRIL 2026" }],
  ["question", "a4", 19, "Impression", "Affiche prévention", { sur: "Prévention", titre: "Savez-vous où\nse trouve\nl'extincteur\nle plus proche ?", sous: "Prenez trente secondes pour le repérer. Un jour, ça comptera." }],
  ["menu", "a4", 8, "Impression", "Carte des desserts", { sur: "Sucré", titre: "Nos desserts", items: ["Tarte fine aux pommes|9 €", "Fondant chocolat|9 €", "Crème caramel|7 €", "Sorbets, deux boules|6 €", "Café gourmand|8 €", "Assiette de fromages|11 €"], meta: "FAIT MAISON — SUR PLACE" }],
  ["annonce", "a5", 12, "Impression", "Flyer déménagement", { gros: "dès 290 €", titre: "Déménagement clé en main", sous: "Emballage, transport, remontage", items: ["Devis gratuit à domicile", "Camion 20 m³ et 40 m³", "Assurance incluse"], emoji: "📦" }],
  ["annonce", "a5", 20, "Impression", "Flyer informatique", { gros: "45 € / h", titre: "Dépannage informatique", sous: "À domicile ou à distance", items: ["Ordinateur lent, virus, sauvegarde", "Installation et configuration", "Intervention sous 24 h"], emoji: "💻" }],

  /* ── Présentation, suite ── */
  ["typo", "slide", 0, "Présentation", "Diapositive d'ouverture", { titre: "2026", sous: "Ce que nous allons construire ensemble.", meta: "Réunion générale — janvier" }],
  ["equipe", "slide", 11, "Présentation", "Diapositive équipe", { titre: "L'équipe projet", sous: "Quatre personnes à temps plein", items: ["Sofia|Direction de projet", "Noé|Architecture", "Léa|Design produit", "Marc|Qualité"] }],
  ["grille", "slide", 13, "Présentation", "Diapositive références", { titre: "Ils nous font confiance", sous: "Six références sur les deux dernières années", items: ["Secteur public", "Industrie", "Santé", "Éducation", "Commerce", "Transport"], meta: "Références détaillées en annexe" }],
  ["question", "slide", 20, "Présentation", "Diapositive question", { sur: "Le vrai sujet", titre: "Est-ce qu'on résout\nle bon problème ?", sous: "Avant de parler solution, revenons trente secondes sur le constat." }],
  ["calendrier", "slide", 1, "Présentation", "Diapositive jalon", { sur: "DÉCEMBRE 2026", gros: "15", titre: "Mise en\nproduction", items: ["Gel des développements le 1er", "Recette du 2 au 10", "Bascule le 15 au soir", "Astreinte pendant deux semaines"] }],
  ["colonnes", "slide", 16, "Présentation", "Diapositive texte", { sur: "Contexte", titre: "D'où l'on\npart", sous: "Trois ans d'empilement d'outils, sans schéma d'ensemble.", items: ["Sept applications se partagent aujourd'hui les mêmes données, sans source de vérité. Chaque équipe a construit ses contournements, et personne ne peut dire quel chiffre fait foi.", "Le coût n'est pas seulement financier : il se paie en temps de réconciliation, en erreurs de facturation et en confiance perdue auprès des clients."], meta: "DIAGNOSTIC — FÉVRIER 2026" }],
  ["ruban", "slide", 9, "Présentation", "Diapositive annonce", { sur: "Décision", titre: "ON Y VA", sous: "Le projet est validé, le budget est engagé, l'équipe est constituée.", meta: "DÉMARRAGE LE 2 MAI" }],
  ["fiche", "slide", 17, "Présentation", "Diapositive comparaison", { titre: "Faire ou acheter", meta: "Arbitrage à rendre avant fin mars", sur: "FAIRE", sous: "ACHETER", items: ["Contrôle total du produit", "Coût étalé sur trois ans", "Dépend du recrutement", "Disponible en six semaines", "Abonnement annuel fixe", "Dépendance à l'éditeur"] }],

  /* ── Commerce, suite ── */
  ["typo", "carre", 19, "Commerce", "Accroche soldes", { titre: "SOLDES", sous: "Jusqu'à -60 % sur plus de 400 articles.", meta: "Du 8 au 28 janvier" }],
  ["ruban", "carre", 12, "Commerce", "Ruban nouveauté", { sur: "Enfin disponible", titre: "NOUVEAU", sous: "La version rechargeable, en trois coloris.", meta: "EN BOUTIQUE ET EN LIGNE" }],
  ["grille", "carre", 6, "Commerce", "Six nouveautés", { titre: "La collection", sous: "Six pièces, une matière", items: ["Chemise", "Pantalon", "Veste", "Robe", "Écharpe", "Sac"], meta: "Voir la collection →" }],
  ["calendrier", "carre", 9, "Commerce", "Date de lancement", { sur: "NOVEMBRE 2026", gros: "28", titre: "Black Friday", items: ["Ouverture à 8 h", "-70 % sur une sélection", "Stocks limités", "Retours acceptés 60 jours"] }],
  ["question", "carre", 1, "Commerce", "Aide au choix", { sur: "Aide au choix", titre: "Modèle classique\nou modèle léger ?", sous: "Le classique dure plus longtemps. Le léger se transporte mieux." }],
  ["equipe", "carre", 17, "Commerce", "Nos artisans", { titre: "Ceux qui\nfabriquent", sous: "Quatre ateliers partenaires", items: ["Camille|Maroquinerie", "Noé|Menuiserie", "Aline|Céramique", "Marc|Textile"] }],
  ["fiche", "carre", 11, "Commerce", "Guide des tailles", { titre: "Guide des tailles", meta: "Mesures en centimètres, à plat", sur: "MESURER", sous: "CHOISIR", items: ["Tour de poitrine", "Tour de taille", "Longueur de manche", "Entre deux tailles : prenez la plus grande", "Coupe droite, non cintrée", "Lavage à 30 °C, sans sèche-linge"] }],
  ["annonce", "carre", 21, "Commerce", "Fiche article papeterie", { gros: "18 €", titre: "Carnet à couture apparente", sous: "192 pages, papier ivoire 100 g", items: ["Ouverture à plat", "Papier certifié FSC", "Fabriqué en Italie"], emoji: "📓" }],
  ["tarif", "carre", 7, "Commerce", "Formule découverte", { sur: "Formule Découverte", gros: "0 €", sous: "pendant 14 jours, sans carte", items: ["Toutes les fonctions", "Un espace de travail", "Trois collaborateurs", "Assistance par courriel"], cta: "Essayer" }],
  ["duo", "carre", 13, "Commerce", "Deux formules", { items: ["MENSUEL|19 € par mois, résiliable.", "ANNUEL|179 € par an, deux mois offerts."], gros: "ou" }],

  /* ── Événement, suite ── */
  ["typo", "carre", 15, "Événement", "Affiche typo soirée", { titre: "NUIT\nBLANCHE", sous: "Douze lieux ouverts jusqu'à l'aube.", meta: "Samedi 3 octobre" }],
  ["calendrier", "carre", 2, "Événement", "Date de festival", { sur: "AOÛT 2026", gros: "14", titre: "Fête du village", items: ["Repas à 19 h, sur réservation", "Bal à 21 h", "Feu d'artifice à 23 h", "Buvette tenue par le comité"] }],
  ["grille", "portrait", 8, "Événement", "Programme en six temps", { titre: "Le programme", sous: "Samedi 12 avril", items: ["9h30 Accueil", "10h Ouverture", "11h Atelier A", "14h Atelier B", "16h Table ronde", "18h Clôture"], meta: "Programme détaillé sur le site" }],
  ["equipe", "portrait", 0, "Événement", "Les intervenants", { titre: "Ils prennent\nla parole", sous: "Quatre intervenants, quatre regards", items: ["Sofia|Chercheuse", "Noé|Entrepreneur", "Aline|Élue locale", "Marc|Artisan"] }],
  ["ruban", "portrait", 12, "Événement", "Annonce de report", { sur: "Information", titre: "REPORTÉ", sous: "L'événement du 12 avril est reporté au 17 mai, même lieu, même heure.", meta: "BILLETS VALABLES SANS ÉCHANGE" }],
  ["question", "portrait", 20, "Événement", "Appel à participation", { sur: "Appel à participation", titre: "Vous avez\nquelque chose\nà montrer ?", sous: "Les inscriptions pour les stands sont ouvertes jusqu'au 30 avril." }],
  ["fiche", "portrait", 3, "Événement", "Infos pratiques", { titre: "Infos pratiques", meta: "Festival des lumières — 12 au 15 décembre", sur: "SUR PLACE", sous: "BON À SAVOIR", items: ["Buvette et restauration", "Toilettes accessibles", "Parking gratuit à 300 m", "Entrée libre, sans réservation", "Chiens tenus en laisse", "Programme modifiable en cas de pluie"] }],

  /* ── CV & document, suite ── */
  ["cv", "cv", 20, "CV & document", "CV indigo", { gros: "SM", titre: "Sofia\nMartin", sur: "Directrice des opérations", sous: "sofia@exemple.fr\n+33 6 00 00 00 00\nBordeaux (33)", meta: "PARCOURS", items: ["Directrice des opérations — Groupe Rivage|2021 → aujourd'hui. 60 personnes, 3 sites.", "Responsable production — Atelier Nord|2016 → 2021. Réduction de 30 % des délais.", "Ingénieure méthodes — Verdier|2012 → 2016.", "Diplôme d'ingénieur|Arts et Métiers — 2012."] }],
  ["cv", "cv", 7, "CV & document", "CV cyan", { gros: "NR", titre: "Noé\nRivière", sur: "Photographe indépendant", sous: "studio@noeriviere.fr\n+33 6 00 00 00 00\nMarseille (13)\nnoeriviere.fr", meta: "RÉFÉRENCES", items: ["Campagnes — Marques de mode|2020 → aujourd'hui. Douze campagnes, huit marques.", "Reportage — Presse régionale|2017 → 2020. Terrain, portraits, événements.", "Assistant studio — Lumière Sud|2015 → 2017.", "BTS Photographie|Marseille — 2015."] }],
  ["colonnes", "a4", 11, "CV & document", "Lettre officielle", { sur: "Courrier", titre: "Demande de\nrendez-vous", sous: "À l'attention du service urbanisme — dossier n° 2026-114.", items: ["Madame, Monsieur,\n\nJe me permets de solliciter un rendez-vous afin d'évoquer le dossier cité en référence, déposé le 14 janvier dernier et resté sans réponse à ce jour.", "Je reste à votre disposition pour tout complément et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\nThomas Xey"], meta: "LYON, LE 12 MARS 2026" }],
  ["fiche", "a4", 1, "CV & document", "Fiche de procédure", { titre: "Accueillir un nouvel arrivant", meta: "Procédure interne — version 3", sur: "AVANT L'ARRIVÉE", sous: "LE PREMIER JOUR", items: ["Créer les accès", "Préparer le poste", "Prévenir l'équipe", "Café d'accueil à 9 h", "Tour des bureaux", "Déjeuner avec l'équipe", "Point de fin de journée"] }],
  ["calendrier", "a4", 16, "CV & document", "Convocation", { sur: "AVRIL 2026", gros: "09", titre: "Convocation\nà l'assemblée", items: ["Jeudi 9 avril, 18 h 30", "Salle des fêtes, 1er étage", "Pouvoir joint en cas d'absence", "Ordre du jour au verso"] }],
  ["menu", "a4", 20, "CV & document", "Note de frais", { sur: "Note de frais — mars", titre: "Déplacements", items: ["Train Lyon–Paris (A/R)|142 €", "Hôtel, deux nuits|218 €", "Repas (4)|96 €", "Taxi|38 €", "Péage et carburant|64 €", "Total|558 €"], meta: "JUSTIFICATIFS JOINTS — REMBOURSEMENT SOUS 30 J" }],

  /* ── Web & e-mail, suite ── */
  ["typo", "bandeau", 0, "Web & e-mail", "Bandeau typo", { titre: "NOUVELLE VERSION", sous: "Plus rapide, plus simple, et enfin hors ligne.", meta: "Découvrir les nouveautés" }],
  ["grille", "large", 13, "Web & e-mail", "Bandeau fonctions", { titre: "Ce que vous pouvez faire", sous: "Six fonctions, une seule application", items: ["Éditer", "Partager", "Signer", "Archiver", "Chercher", "Exporter"], meta: "Tout est inclus dans chaque formule" }],
  ["question", "large", 7, "Web & e-mail", "Bandeau relance", { sur: "On vous a perdu ?", titre: "Votre panier\nvous attend encore.", sous: "Il reste deux articles, et le stock baisse." }],
  ["calendrier", "large", 20, "Web & e-mail", "Rappel d'échéance", { sur: "AVRIL 2026", gros: "30", titre: "Fin de votre\npériode d'essai", items: ["Il vous reste 5 jours", "Aucune action requise pour arrêter", "Vos données restent 30 jours", "Réactivable à tout moment"] }],
  ["ruban", "bandeau", 12, "Web & e-mail", "Bandeau anniversaire", { sur: "Trois ans déjà", titre: "MERCI", sous: "Pour fêter ça : trois mois offerts sur l'abonnement annuel.", meta: "CODE : TROISANS" }],
  ["equipe", "large", 1, "Web & e-mail", "Bandeau équipe support", { titre: "Une vraie équipe\nau bout du fil", sous: "Réponse moyenne : 2 h 40", items: ["Camille|Support", "Noé|Technique", "Aline|Facturation", "Marc|Comptes"] }],

  /* ── Podcast & musique, suite ── */
  ["typo", "pod", 9, "Podcast & musique", "Pochette typo", { titre: "BRUIT\nDE\nFOND", sous: "Un podcast sur ce qu'on n'écoute plus.", meta: "Saison 1" }],
  ["question", "pod", 20, "Podcast & musique", "Pochette question", { sur: "Chaque semaine", titre: "Pourquoi\non travaille\ncomme ça ?", sous: "Trente minutes pour comprendre une habitude." }],
  ["grille", "pod", 17, "Podcast & musique", "Pochette compilation", { titre: "Volume 4", sous: "Six artistes, six villes", items: ["Lyon", "Nantes", "Lille", "Brest", "Nice", "Metz"], meta: "Sortie le 12 septembre" }],
  ["ruban", "pod", 5, "Podcast & musique", "Pochette single", { sur: "Nouveau single", titre: "ORAGE", sous: "Disponible sur toutes les plateformes.", meta: "SORTIE LE 3 MAI" }],
  ["calendrier", "carre", 15, "Podcast & musique", "Annonce de concert", { sur: "OCTOBRE 2026", gros: "04", titre: "En concert\nau Trianon", items: ["Portes 20 h", "Première partie 21 h", "Placement libre", "Billetterie en ligne"] }],
  ["typo", "carre", 23, "Podcast & musique", "Annonce de sortie", { titre: "NOUVEL\nALBUM", sous: "Douze titres enregistrés en trois semaines.", meta: "14 novembre" }],

  /* ── Sport & bien-être, suite ── */
  ["typo", "carre", 3, "Sport & bien-être", "Accroche défi", { titre: "BOUGE\n20 MIN", sous: "Chaque jour, pendant trente jours.", meta: "#défi30jours" }],
  ["fiche", "carre", 11, "Sport & bien-être", "Fiche exercice", { titre: "Le gainage, bien fait", meta: "3 séries de 30 secondes", sur: "À FAIRE", sous: "À ÉVITER", items: ["Coudes sous les épaules", "Dos plat, regard au sol", "Respirer régulièrement", "Creuser le bas du dos", "Relever les fesses", "Bloquer sa respiration"] }],
  ["calendrier", "story", 19, "Sport & bien-être", "Planning de la semaine", { sur: "SEMAINE 12", gros: "5", titre: "séances\nau programme", items: ["Lundi : cardio", "Mardi : renforcement", "Jeudi : mobilité", "Samedi : sortie longue", "Dimanche : repos"] }],
  ["equipe", "carre", 7, "Sport & bien-être", "Les coachs", { titre: "Vos coachs", sous: "Quatre spécialités", items: ["Camille|Renforcement", "Noé|Course à pied", "Aline|Yoga", "Marc|Nutrition"] }],
  ["question", "carre", 14, "Sport & bien-être", "Question santé", { sur: "On répond", titre: "Faut-il s'étirer\navant ou après\nl'effort ?", sous: "Après, et doucement. Avant, on s'échauffe — ce n'est pas pareil." }],
  ["grille", "story", 4, "Sport & bien-être", "Six exercices", { titre: "Six exercices\nsans matériel", sous: "Trente secondes chacun", items: ["Squats", "Pompes", "Gainage", "Fentes", "Montées", "Étirements"], meta: "Deux tours, une minute de pause" }],

  /* ── Immobilier & services, suite ── */
  ["grille", "portrait", 6, "Immobilier & services", "Six prestations", { titre: "Ce que nous\nfaisons", sous: "Artisans, tous corps d'état", items: ["Plomberie", "Électricité", "Peinture", "Menuiserie", "Cloisons", "Sols"], meta: "Devis gratuit sous 24 h" }],
  ["fiche", "portrait", 17, "Immobilier & services", "Fiche visite", { titre: "Préparer sa visite", meta: "Ce qu'il faut regarder, ce qu'il faut demander", sur: "À REGARDER", sous: "À DEMANDER", items: ["Traces d'humidité", "État des menuiseries", "Isolation phonique", "Montant des charges", "Travaux votés", "Date du dernier ravalement"] }],
  ["calendrier", "portrait", 11, "Immobilier & services", "Journée portes ouvertes", { sur: "MAI 2026", gros: "16", titre: "Visites\nsans rendez-vous", items: ["Samedi 16 mai, 10 h – 17 h", "12 rue des Lilas, Nantes", "Pièces d'identité demandées", "Dossier de location sur place"] }],
  ["typo", "large", 1, "Immobilier & services", "Bandeau agence", { titre: "VENDU\nEN 21 JOURS", sous: "Estimation gratuite, mandat sans exclusivité.", meta: "Agence du Port — 02 00 00 00 00" }],
  ["ruban", "carre", 16, "Immobilier & services", "Annonce vendu", { sur: "Encore un", titre: "VENDU", sous: "Maison de village, quatre pièces — au prix demandé.", meta: "MERCI POUR VOTRE CONFIANCE" }],
  ["question", "large", 19, "Immobilier & services", "Question propriétaire", { sur: "Propriétaires", titre: "Savez-vous ce que\nvaut vraiment\nvotre bien ?", sous: "Estimation gratuite et sans engagement, sous 48 heures." }],

  /* ── Éducation & association, suite ── */
  ["fiche", "a4", 20, "Éducation & association", "Fiche de révision", { titre: "Le théorème de Pythagore", meta: "Classe de 4e — géométrie", sur: "À RETENIR", sous: "MÉTHODE", items: ["Vrai uniquement dans un triangle rectangle", "Le carré de l'hypoténuse…", "…égale la somme des carrés des côtés", "Repérer l'angle droit", "Nommer l'hypoténuse", "Écrire l'égalité puis calculer"] }],
  ["grille", "a4", 14, "Éducation & association", "Ateliers proposés", { titre: "Nos ateliers", sous: "Toute l'année, pour tous les âges", items: ["Théâtre", "Poterie", "Guitare", "Dessin", "Danse", "Échecs"], meta: "Inscriptions ouvertes du 1er au 30 juin" }],
  ["typo", "carre", 3, "Éducation & association", "Appel à bénévoles", { titre: "ON A\nBESOIN\nDE VOUS", sous: "Deux heures par semaine suffisent.", meta: "Contactez-nous" }],
  ["calendrier", "a4", 0, "Éducation & association", "Réunion de rentrée", { sur: "SEPTEMBRE 2026", gros: "10", titre: "Réunion\nde rentrée", items: ["Jeudi 10 septembre, 18 h", "Salle polyvalente", "Présentation de l'équipe", "Verre de l'amitié offert"] }],
  ["question", "carre", 11, "Éducation & association", "Question aux parents", { sur: "Consultation", titre: "Quels horaires\nvous arrangeraient\npour les ateliers ?", sous: "Répondez au questionnaire avant le 30 mai." }],
  ["equipe", "a4", 21, "Éducation & association", "Le bureau", { titre: "Le bureau\nde l'association", sous: "Élu le 12 avril 2026", items: ["Sofia|Présidente", "Noé|Trésorier", "Aline|Secrétaire", "Marc|Vice-président"] }],

  /* ── Voyage & saison, suite ── */
  ["grille", "pin", 13, "Voyage & saison", "Six étapes de voyage", { titre: "Sicile\nen six étapes", sous: "Deux semaines, en voiture", items: ["Palerme", "Cefalù", "Etna", "Taormine", "Syracuse", "Agrigente"], meta: "Itinéraire détaillé sur le blog" }],
  ["fiche", "pin", 6, "Voyage & saison", "Fiche destination", { titre: "Partir en Sicile", meta: "Meilleure période : mai à juin, septembre", sur: "PRÉVOIR", sous: "SUR PLACE", items: ["Voiture de location", "Crème solaire élevée", "Chaussures de marche", "Réserver l'Etna à l'avance", "Éviter la côte en août", "Prendre les routes intérieures"] }],
  ["typo", "story", 12, "Voyage & saison", "Compte à rebours vacances", { titre: "J-7", sous: "Avant trois semaines sans réveil.", meta: "Valises presque prêtes" }],
  ["calendrier", "carre", 2, "Voyage & saison", "Ouverture saison", { sur: "AVRIL 2026", gros: "04", titre: "Ouverture\nde la saison", items: ["Tous les jours de 10 h à 19 h", "Location de vélos sur place", "Terrasse ouverte", "Chiens acceptés" ] }],
  ["ruban", "carre", 17, "Voyage & saison", "Fermeture annuelle", { sur: "Information", titre: "FERMÉ", sous: "Congés annuels du 1er au 21 août. Réouverture le 22 à 8 h.", meta: "MERCI DE VOTRE COMPRÉHENSION" }],
  ["question", "story", 7, "Voyage & saison", "Question voyage", { sur: "Dilemme de départ", titre: "Sac à dos\nou valise\nà roulettes ?", sous: "Ça dépend surtout du sol, pas du poids." }],
  ["equipe", "carre", 15, "Voyage & saison", "L'équipe du camping", { titre: "L'équipe\nvous accueille", sous: "D'avril à octobre", items: ["Camille|Accueil", "Noé|Animations", "Aline|Snack", "Marc|Entretien"] }],
  ["colonnes", "pin", 22, "Voyage & saison", "Récit de voyage", { sur: "Carnet", titre: "Trois jours\nsans\ntéléphone", sous: "Un refuge, deux cols, et le silence qui va avec.", items: ["Le premier jour, la main cherche la poche toutes les dix minutes. Le deuxième, elle oublie. Le troisième, on regarde vraiment le paysage, et il est beaucoup plus grand qu'en photo.", "On redescend avec l'impression d'avoir gagné du temps, alors qu'on n'a rien fait de productif. C'est peut-être exactement ça, des vacances."], meta: "SEPTEMBRE 2026" }],

];

/* ── Répartition des palettes ──
   Une ligne qui nomme une ambiance laisse le choix de la palette au
   bâtisseur : il prend, dans la famille, la première encore inutilisée pour
   ce couple mise en page / format. Deux modèles ne peuvent donc jamais être
   la même composition dans la même robe. Un indice explicite passe outre :
   certaines compositions n'ont de sens que dans une couleur précise. */
const pris = new Set<string>();
function palette(mep: Mep, fmt: Fmt, spec: number | Ambiance, i: number): Pal {
  if (typeof spec === "number") {
    pris.add(`${mep}|${fmt}|${spec % PALS.length}`);
    return PALS[spec % PALS.length];
  }
  const fam = AMB[spec];
  for (let k = 0; k < fam.length; k++) {
    const p = fam[(i + k) % fam.length];
    const cle = `${mep}|${fmt}|${p}`;
    if (!pris.has(cle)) { pris.add(cle); return PALS[p]; }
  }
  return PALS[fam[i % fam.length]];
}

/* Chaque ligne devient un modèle : la mise en page reçoit le format, la
   palette et le contenu, puis le tout est empaqueté en document — mais
   seulement au moment où ce document est réellement demandé. */
function bati(row: Row, i: number): Template {
  const [mep, fmt, spec, group, label, C] = row;
  const [w, h] = F[fmt];
  const P = palette(mep, fmt, spec, i);
  let cache: DesignDoc | null = null;
  return {
    id: `tx-${i + 1}-${mep}`, label, group, w, h,
    get doc(): DesignDoc {
      if (!cache) {
        const b = MEP[mep]({ w, h, P, C, f: ech(w, h) });
        cache = { version: 1, width: w, height: h, background: b.bg, backgroundGradient: b.bgg, layers: b.layers };
      }
      return cache;
    },
  };
}

export const TEMPLATES_PLUS: Template[] = [
  ...ROWS, ...ROWS_RESEAUX, ...ROWS_COMMERCE, ...ROWS_METIERS, ...ROWS_PRO,
  ...ROWS_PRINT, ...ROWS_VIE, ...ROWS_SAISON, ...ROWS_SOCIAL2, ...ROWS_SERVICES2, ...ROWS_BESOINS, ...ROWS_CANAUX, ...ROWS_METIERS2, ...ROWS_SOCIAL3,
].map(bati);

/** Groupes présents, dans l'ordre d'apparition. */
export function templateGroups(list: Template[]): string[] {
  const vus: string[] = [];
  for (const t of list) if (!vus.includes(t.group)) vus.push(t.group);
  return vus;
}
