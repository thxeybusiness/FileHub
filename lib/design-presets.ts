// Bibliothèques du studio Design : emojis, fonds, dégradés, filtres photo,
// presets de texte et modèles prêts à l'emploi.

import {
  type DesignDoc, type Layer, type Filters, type GradientFill,
  NEUTRAL_FILTERS, DEFAULT_SHADOW, FONTS, newId, cloneLayer,
} from "./design";
import { TEMPLATES_PLUS, type Template } from "./design-templates";

export { templateGroups } from "./design-templates";
export type { Template };

/* ═══════════ Emojis (stickers) ═══════════ */

export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "🥳", "😜", "🤪", "😇", "🙂", "😉", "🤔", "🤯", "😱", "😴", "🤤", "😭", "😅", "🫠", "🤑", "🤗", "🫡", "🤫", "🙃", "😏", "💀"],
  },
  {
    label: "Gestes",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "💪", "🫶", "👌", "✌️", "🤞", "🤟", "🤘", "👊", "✊", "🖐️", "👋", "🤙", "👉", "👈", "☝️", "✍️", "🙏"],
  },
  {
    label: "Cœurs",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💔"],
  },
  {
    label: "Feu & symboles",
    emojis: ["🔥", "⭐", "🌟", "✨", "💫", "⚡", "💥", "❄️", "🌈", "☀️", "🌙", "💧", "🎯", "🏆", "🥇", "🎖️", "💎", "👑", "🔔", "📣", "💡", "🚀", "🎉", "🎊", "🎁", "🎈", "✅", "❌", "⚠️", "❗", "❓", "💯", "🆕", "🆓", "▶️", "⏸️"],
  },
  {
    label: "Business",
    emojis: ["💼", "📈", "📉", "📊", "💰", "💸", "💳", "🪙", "🧾", "📝", "📌", "📎", "🗂️", "📅", "⏰", "⌛", "📱", "💻", "🖥️", "⌨️", "🖱️", "📷", "🎥", "🎙️", "🎧", "📚", "🔍", "🔒", "🔑", "⚙️", "🛠️", "📦", "✉️", "📞"],
  },
  {
    label: "Nourriture",
    emojis: ["🍕", "🍔", "🌮", "🍣", "🍜", "🥗", "🍩", "🍪", "🎂", "🧁", "🍦", "🍫", "🍿", "☕", "🍵", "🥤", "🧋", "🍹", "🍾", "🥂", "🍇", "🍓", "🍒", "🍑", "🥑", "🍋", "🍉", "🥐"],
  },
  {
    label: "Nature & animaux",
    emojis: ["🐶", "🐱", "🦁", "🐼", "🐨", "🦊", "🦋", "🐝", "🐬", "🐢", "🦜", "🌸", "🌺", "🌻", "🌹", "🌴", "🌵", "🍀", "🌿", "🍁", "🏔️", "🌊", "🪐", "🌍"],
  },
  {
    label: "Sport & loisirs",
    emojis: ["⚽", "🏀", "🏈", "🎾", "🏐", "🏓", "🥊", "🏋️", "🚴", "🏄", "⛷️", "🎮", "🎲", "🎸", "🎹", "🎤", "🎬", "🎨", "✈️", "🚗", "🏖️", "🗺️", "🎡", "🛍️"],
  },
];

/* ═══════════ Fonds & dégradés ═══════════ */

export const BG_SOLIDS = [
  "#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0", "#94a3b8", "#475569", "#1e293b", "#0f172a", "#000000",
  "#fef2f2", "#fff7ed", "#fefce8", "#f0fdf4", "#ecfeff", "#eff6ff", "#f5f3ff", "#fdf4ff", "#fdf2f8",
];

export const GRADIENT_PRESETS: { label: string; g: GradientFill }[] = [
  { label: "Violet nuit", g: { type: "linear", angle: 135, from: "#667eea", to: "#764ba2" } },
  { label: "Océan", g: { type: "linear", angle: 135, from: "#2193b0", to: "#6dd5ed" } },
  { label: "Sunset", g: { type: "linear", angle: 135, from: "#f97316", to: "#ec4899" } },
  { label: "Flamant", g: { type: "linear", angle: 135, from: "#ec4899", to: "#8b5cf6" } },
  { label: "Émeraude", g: { type: "linear", angle: 135, from: "#10b981", to: "#0ea5e9" } },
  { label: "Or", g: { type: "linear", angle: 135, from: "#f59e0b", to: "#ef4444" } },
  { label: "Menthe", g: { type: "linear", angle: 135, from: "#a7f3d0", to: "#38bdf8" } },
  { label: "Pêche", g: { type: "linear", angle: 135, from: "#fed7aa", to: "#fda4af" } },
  { label: "Nuit", g: { type: "linear", angle: 160, from: "#0f172a", to: "#334155" } },
  { label: "Charbon", g: { type: "linear", angle: 135, from: "#111827", to: "#4b5563" } },
  { label: "Halo violet", g: { type: "radial", angle: 0, from: "#7c3aed", to: "#0f0a1f" } },
  { label: "Halo bleu", g: { type: "radial", angle: 0, from: "#0ea5e9", to: "#082f49" } },
];

/* ═══════════ Filtres photo (presets 1 clic) ═══════════ */

export const FILTER_PRESETS: { label: string; f: Filters }[] = [
  { label: "Original", f: { ...NEUTRAL_FILTERS } },
  { label: "N&B", f: { ...NEUTRAL_FILTERS, grayscale: 100, contrast: 108 } },
  { label: "Sépia", f: { ...NEUTRAL_FILTERS, sepia: 85, brightness: 104 } },
  { label: "Vif", f: { ...NEUTRAL_FILTERS, saturate: 145, contrast: 110 } },
  { label: "Doux", f: { ...NEUTRAL_FILTERS, brightness: 106, contrast: 92, saturate: 88 } },
  { label: "Vintage", f: { ...NEUTRAL_FILTERS, sepia: 32, contrast: 92, brightness: 105, saturate: 85 } },
  { label: "Froid", f: { ...NEUTRAL_FILTERS, saturate: 110, hueRotate: 12, brightness: 102 } },
  { label: "Chaud", f: { ...NEUTRAL_FILTERS, sepia: 20, saturate: 120, brightness: 103 } },
  { label: "Drama", f: { ...NEUTRAL_FILTERS, contrast: 135, brightness: 94, saturate: 110 } },
  { label: "Fade", f: { ...NEUTRAL_FILTERS, contrast: 80, brightness: 110, saturate: 70 } },
];

/* ═══════════ Presets de texte ═══════════ */

export type TextPreset = { id: string; label: string; fontSize: (docW: number) => number; fontWeight: number; sample: string };
export const TEXT_PRESETS: TextPreset[] = [
  { id: "h1", label: "Titre", fontSize: (w) => Math.round(w * 0.085), fontWeight: 800, sample: "Grand titre" },
  { id: "h2", label: "Sous-titre", fontSize: (w) => Math.round(w * 0.05), fontWeight: 600, sample: "Sous-titre" },
  { id: "body", label: "Corps de texte", fontSize: (w) => Math.round(w * 0.032), fontWeight: 400, sample: "Un peu de texte pour raconter votre histoire." },
];

/* ═══════════ Modèles prêts à l'emploi ═══════════ */
// Chaque modèle est un DesignDoc complet. À l'application, les ids des calques
// sont régénérés (templateDoc) pour éviter toute collision.

const S = { ...DEFAULT_SHADOW };
const font = (i: number) => FONTS[i].css;
// Ids uniques pour les calques des modèles (les aperçus les utilisent comme clés
// React ; templateDoc les régénère de toute façon à l'application).
let tplSeq = 0;
const tid = () => `tpl-${++tplSeq}`;

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

/* Les modèles d'origine portent leur document en clair ; `w`/`h` en sont
   déduits juste après, pour qu'ils aient la même forme que les autres. */
const TEMPLATES_BASE: Omit<Template, "w" | "h">[] = [
  {
    id: "quote-min",
    label: "Citation élégante",
    group: "Instagram",
    doc: {
      version: 1, width: 1080, height: 1080, background: "#0f172a", backgroundGradient: null,
      layers: [
        shape({ name: "Halo", shape: "ellipse", x: 620, y: -220, w: 760, h: 760, fill: "#1d4ed8", gradient: { type: "radial", angle: 0, from: "#312e81", to: "#0f172a" }, opacity: 0.9 }),
        line({ x: 460, y: 320, w: 160, stroke: "#a78bfa", strokeWidth: 8 }),
        text({ name: "Citation", x: 120, y: 400, w: 840, h: 320, text: "Crée la vie dont\ntu rêves.", color: "#f8fafc", fontFamily: font(10), fontSize: 88, fontWeight: 700, italic: true, lineHeight: 1.25 }),
        text({ name: "Auteur", x: 240, y: 760, w: 600, h: 60, text: "— VOTRE NOM", color: "#a78bfa", fontSize: 30, fontWeight: 600, letterSpacing: 6, uppercase: true }),
      ],
    },
  },
  {
    id: "promo-flash",
    label: "Promo flash",
    group: "Instagram",
    doc: {
      version: 1, width: 1080, height: 1080, background: "#111111", backgroundGradient: { type: "linear", angle: 135, from: "#7c3aed", to: "#db2777" },
      layers: [
        shape({ name: "Éclat", shape: "sparkle", x: 60, y: 70, w: 170, h: 170, fill: "#fde047", rotation: 15 }),
        shape({ name: "Éclat 2", shape: "sparkle", x: 860, y: 800, w: 120, h: 120, fill: "#fde047", rotation: -10, opacity: 0.85 }),
        text({ name: "Avant-titre", x: 140, y: 200, w: 800, h: 60, text: "OFFRE LIMITÉE", color: "#fdf2f8", fontSize: 36, fontWeight: 700, letterSpacing: 10, uppercase: true }),
        text({ name: "-50%", x: 90, y: 300, w: 900, h: 330, text: "-50%", color: "#ffffff", fontFamily: font(14), fontSize: 300, fontWeight: 900, shadow: { enabled: true, x: 0, y: 18, blur: 44, color: "#000000", opacity: 0.4 } }),
        text({ name: "Détail", x: 190, y: 665, w: 700, h: 70, text: "sur toute la boutique", color: "#fce7f3", fontSize: 44, fontWeight: 500 }),
        shape({ name: "Bouton", shape: "rect", x: 330, y: 800, w: 420, h: 108, fill: "#ffffff", radius: 60, shadow: { enabled: true, x: 0, y: 14, blur: 36, color: "#000000", opacity: 0.35 } }),
        text({ name: "CTA", x: 330, y: 828, w: 420, h: 60, text: "J'EN PROFITE", color: "#be185d", fontSize: 36, fontWeight: 800, letterSpacing: 3 }),
      ],
    },
  },
  {
    id: "story-event",
    label: "Story événement",
    group: "Story",
    doc: {
      version: 1, width: 1080, height: 1920, background: "#0c0a09", backgroundGradient: { type: "linear", angle: 180, from: "#0f172a", to: "#312e81" },
      layers: [
        shape({ name: "Lune", shape: "ellipse", x: 700, y: 150, w: 240, h: 240, fill: "#fbbf24", gradient: { type: "radial", angle: 0, from: "#fde68a", to: "#f59e0b" }, shadow: { enabled: true, x: 0, y: 0, blur: 80, color: "#f59e0b", opacity: 0.6 } }),
        text({ name: "Sur-titre", x: 140, y: 560, w: 800, h: 70, text: "SAVE THE DATE", color: "#a5b4fc", fontSize: 44, fontWeight: 700, letterSpacing: 12, uppercase: true }),
        text({ name: "Titre", x: 80, y: 680, w: 920, h: 420, text: "Soirée\nde lancement", color: "#f8fafc", fontFamily: font(13), fontSize: 130, fontWeight: 900, lineHeight: 1.1, uppercase: true }),
        line({ x: 400, y: 1180, w: 280, stroke: "#6366f1", strokeWidth: 6 }),
        shape({ name: "Carte date", shape: "rect", x: 190, y: 1290, w: 700, h: 200, fill: "#1e1b4b", radius: 32, stroke: "#6366f1", strokeWidth: 2, opacity: 0.92 }),
        text({ name: "Date", x: 190, y: 1330, w: 700, h: 60, text: "VENDREDI 20 SEPTEMBRE — 19H", color: "#e0e7ff", fontSize: 38, fontWeight: 700, letterSpacing: 2 }),
        text({ name: "Lieu", x: 190, y: 1400, w: 700, h: 50, text: "📍 Le Rooftop, Paris 11e", color: "#a5b4fc", fontSize: 32, fontWeight: 500 }),
        text({ name: "Swipe", x: 340, y: 1750, w: 400, h: 50, text: "⬆︎ Balaye pour t'inscrire", color: "#818cf8", fontSize: 30, fontWeight: 600 }),
      ],
    },
  },
  {
    id: "yt-thumb",
    label: "Miniature YouTube",
    group: "YouTube",
    doc: {
      version: 1, width: 1280, height: 720, background: "#18181b", backgroundGradient: { type: "linear", angle: 115, from: "#18181b", to: "#3f3f46" },
      layers: [
        shape({ name: "Diagonale", shape: "rect", x: -260, y: -140, w: 700, h: 1050, fill: "#dc2626", rotation: 18, gradient: { type: "linear", angle: 160, from: "#ef4444", to: "#b91c1c" }, shadow: { enabled: true, x: 12, y: 0, blur: 60, color: "#000000", opacity: 0.5 } }),
        shape({ name: "Rond photo", shape: "ellipse", x: 60, y: 140, w: 440, h: 440, fill: "#fca5a5", stroke: "#ffffff", strokeWidth: 10, shadow: { enabled: true, x: 0, y: 10, blur: 40, color: "#000000", opacity: 0.45 } }),
        text({ name: "Emoji", x: 190, y: 250, w: 200, h: 220, text: "🤯", fontSize: 190, fontWeight: 400 }),
        text({ name: "Titre", x: 560, y: 150, w: 660, h: 320, text: "LE SECRET QUE\nPERSONNE\nNE DIT", color: "#ffffff", fontFamily: font(14), fontSize: 92, fontWeight: 900, align: "left", lineHeight: 1.08, uppercase: true, strokeColor: "#000000", strokeWidth: 4, shadow: { enabled: true, x: 4, y: 8, blur: 0, color: "#000000", opacity: 0.6 } }),
        shape({ name: "Badge", shape: "rect", x: 560, y: 520, w: 320, h: 90, fill: "#facc15", radius: 18, rotation: -3 }),
        text({ name: "Badge txt", x: 560, y: 542, w: 320, h: 50, text: "ÉPISODE 12", color: "#111827", fontSize: 40, fontWeight: 800, rotation: -3 }),
      ],
    },
  },
  {
    id: "logo-ring",
    label: "Logo monogramme",
    group: "Marque",
    doc: {
      version: 1, width: 800, height: 800, background: "transparent", backgroundGradient: null,
      layers: [
        shape({ name: "Anneau", shape: "ring", x: 150, y: 90, w: 500, h: 500, fill: "#111827", gradient: { type: "linear", angle: 135, from: "#6366f1", to: "#a855f7" } }),
        text({ name: "Initiales", x: 250, y: 235, w: 300, h: 220, text: "TH", color: "#111827", fontFamily: font(13), fontSize: 190, fontWeight: 900, letterSpacing: 2 }),
        text({ name: "Nom", x: 100, y: 640, w: 600, h: 60, text: "VOTRE MARQUE", color: "#111827", fontSize: 44, fontWeight: 700, letterSpacing: 14, uppercase: true }),
      ],
    },
  },
  {
    id: "biz-card",
    label: "Carte de visite",
    group: "Marque",
    doc: {
      version: 1, width: 1050, height: 600, background: "#ffffff", backgroundGradient: null,
      layers: [
        shape({ name: "Bande", shape: "rect", x: 0, y: 0, w: 340, h: 600, fill: "#0f172a", gradient: { type: "linear", angle: 160, from: "#1e293b", to: "#0f172a" } }),
        shape({ name: "Accent", shape: "rect", x: 316, y: 0, w: 24, h: 600, fill: "#a855f7", gradient: { type: "linear", angle: 180, from: "#a855f7", to: "#6366f1" } }),
        text({ name: "Initiales", x: 70, y: 220, w: 200, h: 140, text: "TH", color: "#f8fafc", fontFamily: font(13), fontSize: 120, fontWeight: 900 }),
        text({ name: "Nom", x: 400, y: 170, w: 580, h: 80, text: "Thomas Xey", color: "#0f172a", fontSize: 66, fontWeight: 800, align: "left" }),
        text({ name: "Rôle", x: 400, y: 255, w: 580, h: 50, text: "FONDATEUR — FILEHUB", color: "#7c3aed", fontSize: 28, fontWeight: 700, align: "left", letterSpacing: 5 }),
        line({ x: 400, y: 340, w: 520, stroke: "#e2e8f0", strokeWidth: 3 }),
        text({ name: "Contact", x: 400, y: 380, w: 580, h: 140, text: "contact@filehub.business\nfilehub.business\n+33 6 00 00 00 00", color: "#475569", fontSize: 30, fontWeight: 500, align: "left", lineHeight: 1.6 }),
      ],
    },
  },
  {
    id: "affiche-a4",
    label: "Affiche événement",
    group: "Impression",
    doc: {
      version: 1, width: 1240, height: 1754, background: "#fafaf9", backgroundGradient: null,
      layers: [
        shape({ name: "Header", shape: "rect", x: 0, y: 0, w: 1240, h: 620, fill: "#7c3aed", gradient: { type: "linear", angle: 135, from: "#7c3aed", to: "#db2777" } }),
        shape({ name: "Vague", shape: "half", x: -120, y: 500, w: 1480, h: 240, fill: "#fafaf9" }),
        text({ name: "Sur-titre", x: 220, y: 130, w: 800, h: 60, text: "CONFÉRENCE ANNUELLE", color: "#fdf2f8", fontSize: 38, fontWeight: 700, letterSpacing: 10 }),
        text({ name: "Titre", x: 120, y: 220, w: 1000, h: 260, text: "Entreprendre\nen 2026", color: "#ffffff", fontFamily: font(13), fontSize: 128, fontWeight: 900, lineHeight: 1.05, shadow: { enabled: true, x: 0, y: 10, blur: 30, color: "#000000", opacity: 0.25 } }),
        text({ name: "Pitch", x: 220, y: 840, w: 800, h: 160, text: "Une journée de talks, d'ateliers et de rencontres\npour passer à la vitesse supérieure.", color: "#44403c", fontSize: 42, fontWeight: 500, lineHeight: 1.45 }),
        shape({ name: "Carte infos", shape: "rect", x: 170, y: 1100, w: 900, h: 320, fill: "#ffffff", radius: 36, stroke: "#e7e5e4", strokeWidth: 2, shadow: { enabled: true, x: 0, y: 22, blur: 60, color: "#78716c", opacity: 0.22 } }),
        text({ name: "Date", x: 230, y: 1160, w: 780, h: 70, text: "📅  Samedi 14 mars — 9h à 18h", color: "#1c1917", fontSize: 46, fontWeight: 700, align: "left" }),
        text({ name: "Lieu", x: 230, y: 1250, w: 780, h: 70, text: "📍  Palais des Congrès, Lyon", color: "#1c1917", fontSize: 46, fontWeight: 700, align: "left" }),
        text({ name: "Prix", x: 230, y: 1340, w: 780, h: 60, text: "🎟️  Entrée libre sur inscription", color: "#78716c", fontSize: 36, fontWeight: 500, align: "left" }),
        text({ name: "Site", x: 220, y: 1580, w: 800, h: 60, text: "filehub.business/conf", color: "#7c3aed", fontSize: 44, fontWeight: 800, letterSpacing: 2 }),
      ],
    },
  },
  {
    id: "annonce-fb",
    label: "Annonce produit",
    group: "Facebook",
    doc: {
      version: 1, width: 1200, height: 630, background: "#ecfeff", backgroundGradient: { type: "linear", angle: 115, from: "#ecfeff", to: "#cffafe" },
      layers: [
        shape({ name: "Cercle déco", shape: "ellipse", x: 820, y: -160, w: 560, h: 560, fill: "#06b6d4", gradient: { type: "linear", angle: 135, from: "#22d3ee", to: "#0891b2" }, opacity: 0.95 }),
        shape({ name: "Cercle 2", shape: "ellipse", x: 1010, y: 330, w: 300, h: 300, fill: "#a5f3fc", opacity: 0.8 }),
        text({ name: "Nouveau", x: 90, y: 95, w: 300, h: 46, text: "NOUVEAU", color: "#0e7490", fontSize: 28, fontWeight: 800, align: "left", letterSpacing: 8 }),
        text({ name: "Titre", x: 90, y: 150, w: 660, h: 220, text: "Votre produit,\nprésenté comme un pro.", color: "#164e63", fontSize: 72, fontWeight: 800, align: "left", lineHeight: 1.15 }),
        text({ name: "Sous", x: 90, y: 390, w: 620, h: 60, text: "Design, montage et fichiers réunis au même endroit.", color: "#155e75", fontSize: 32, fontWeight: 500, align: "left" }),
        shape({ name: "CTA", shape: "rect", x: 90, y: 480, w: 300, h: 84, fill: "#0e7490", radius: 46, shadow: { enabled: true, x: 0, y: 12, blur: 28, color: "#0e7490", opacity: 0.35 } }),
        text({ name: "CTA txt", x: 90, y: 502, w: 300, h: 46, text: "Essayer gratuitement", color: "#ffffff", fontSize: 28, fontWeight: 700 }),
        text({ name: "Emoji", x: 940, y: 120, w: 240, h: 240, text: "🚀", fontSize: 200, fontWeight: 400, rotation: 8 }),
      ],
    },
  },
];

/** Les onze modèles d'origine, puis la bibliothèque bâtie par composition. */
export const TEMPLATES: Template[] = [
  ...TEMPLATES_BASE.map((t) => ({ ...t, w: t.doc.width, h: t.doc.height })),
  ...TEMPLATES_PLUS,
];

/** Instancie un modèle : clone profond + nouveaux ids de calques. */
export function templateDoc(t: Template): DesignDoc {
  const d = JSON.parse(JSON.stringify(t.doc)) as DesignDoc;
  d.layers = d.layers.map((l) => ({ ...cloneLayer(l), id: newId() }));
  return d;
}
