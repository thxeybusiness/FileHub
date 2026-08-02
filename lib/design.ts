// Moteur du studio Design (éditeur graphique à calques).
// Types + géométrie + rendu : la VÉRITÉ UNIQUE partagée par l'éditeur (DOM),
// les aperçus (DocPreview) et l'export (rasterize). Toute nouveauté visuelle
// doit être implémentée des deux côtés (DOM + canvas) pour garantir que
// « ce qu'on voit » = « ce qu'on exporte ».

/* ═══════════════ Types ═══════════════ */

export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
  | "color-dodge" | "color-burn" | "hard-light" | "soft-light"
  | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";

export const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Produit" },
  { id: "screen", label: "Superposition" },
  { id: "overlay", label: "Incrustation" },
  { id: "darken", label: "Obscurcir" },
  { id: "lighten", label: "Éclaircir" },
  { id: "color-dodge", label: "Densité couleur -" },
  { id: "color-burn", label: "Densité couleur +" },
  { id: "hard-light", label: "Lumière crue" },
  { id: "soft-light", label: "Lumière tamisée" },
  { id: "difference", label: "Différence" },
  { id: "exclusion", label: "Exclusion" },
  { id: "hue", label: "Teinte" },
  { id: "saturation", label: "Saturation" },
  { id: "color", label: "Couleur" },
  { id: "luminosity", label: "Luminosité" },
];

export type GradientFill = {
  type: "linear" | "radial";
  from: string;
  to: string;
  angle: number; // deg — 0 = vers le haut, sens horaire (convention CSS)
};

export type Shadow = {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number; // 0..1
};

export const DEFAULT_SHADOW: Shadow = { enabled: false, x: 0, y: 8, blur: 24, color: "#000000", opacity: 0.35 };

export type Filters = {
  brightness: number; // % (100 = neutre)
  contrast: number;
  saturate: number;
  blur: number; // px
  grayscale: number; // 0..100
  sepia: number;
  hueRotate: number; // deg
  invert: number;
};

export const NEUTRAL_FILTERS: Filters = {
  brightness: 100, contrast: 100, saturate: 100, blur: 0,
  grayscale: 0, sepia: 0, hueRotate: 0, invert: 0,
};

export type ShapeKind =
  | "rect" | "ellipse" | "triangle" | "diamond" | "pentagon" | "hexagon"
  | "star" | "sparkle" | "heart" | "arrow" | "bolt" | "cross"
  | "message" | "cloud" | "ring" | "half"
  | "star6" | "octagon" | "parallelogram" | "trapezoid" | "chevron" | "doubleArrow"
  | "drop" | "pin" | "shield" | "seal" | "check" | "crescent";

export const SHAPE_KINDS: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangle" },
  { id: "ellipse", label: "Cercle" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Losange" },
  { id: "pentagon", label: "Pentagone" },
  { id: "hexagon", label: "Hexagone" },
  { id: "octagon", label: "Octogone" },
  { id: "parallelogram", label: "Parallélogramme" },
  { id: "trapezoid", label: "Trapèze" },
  { id: "star", label: "Étoile" },
  { id: "star6", label: "Étoile 6" },
  { id: "sparkle", label: "Éclat" },
  { id: "seal", label: "Sceau" },
  { id: "heart", label: "Cœur" },
  { id: "arrow", label: "Flèche" },
  { id: "doubleArrow", label: "Double flèche" },
  { id: "chevron", label: "Chevron" },
  { id: "bolt", label: "Éclair" },
  { id: "cross", label: "Croix" },
  { id: "check", label: "Coche" },
  { id: "message", label: "Bulle" },
  { id: "cloud", label: "Nuage" },
  { id: "ring", label: "Anneau" },
  { id: "half", label: "Demi-cercle" },
  { id: "drop", label: "Goutte" },
  { id: "pin", label: "Repère" },
  { id: "shield", label: "Bouclier" },
  { id: "crescent", label: "Croissant" },
];

export type BaseLayer = {
  id: string;
  name: string;
  x: number; y: number; // coin haut-gauche (repère toile)
  w: number; h: number;
  rotation: number; // deg
  opacity: number; // 0..1
  blend: BlendMode;
  visible: boolean;
  locked: boolean;
  flipX: boolean;
  flipY: boolean;
  shadow: Shadow;
};

export type ShapeLayer = BaseLayer & {
  type: "shape";
  shape: ShapeKind;
  fill: string; // hex ou "transparent"
  gradient: GradientFill | null; // si présent, prime sur fill
  stroke: string;
  strokeWidth: number;
  radius: number; // rect uniquement
};

export type LineDash = "solid" | "dashed" | "dotted";
export type LineLayer = BaseLayer & {
  type: "line";
  stroke: string;
  strokeWidth: number;
  dash: LineDash;
};

export type TextAlign = "left" | "center" | "right";
export type TextLayer = BaseLayer & {
  type: "text";
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  align: TextAlign;
  lineHeight: number; // multiplicateur
  letterSpacing: number; // px
  strokeColor: string;
  strokeWidth: number; // contour du texte (0 = aucun)
};

export type ImageLayer = BaseLayer & {
  type: "image";
  src: string; // /api/media/… ou data:
  filters: Filters;
  radius: number;
  naturalW?: number;
  naturalH?: number;
};

// Élément de la bibliothèque : géométrie vectorielle MONOCHROME référencée par
// id stable — la couleur (unie ou dégradé) appartient au calque et reste
// éditable à volonté. Règle d'or du catalogue.
export type ElementLayer = BaseLayer & {
  type: "element";
  ref: string;
  fill: string;
  gradient: GradientFill | null;
  natW: number; // viewBox natif (ratio + repère du dégradé)
  natH: number;
};

export type Layer = ShapeLayer | LineLayer | TextLayer | ImageLayer | ElementLayer;

export type DesignDoc = {
  version: 1;
  width: number;
  height: number;
  background: string; // hex ou "transparent"
  backgroundGradient: GradientFill | null;
  layers: Layer[]; // index 0 = arrière-plan
};

export const DEFAULT_DESIGN: DesignDoc = {
  version: 1, width: 1080, height: 1080, background: "#ffffff", backgroundGradient: null, layers: [],
};

/* ═══════════════ Formats & polices ═══════════════ */

export type SizePreset = { id: string; label: string; w: number; h: number; group: string };
export const SIZE_PRESETS: SizePreset[] = [
  { id: "ig-post", label: "Post Instagram", w: 1080, h: 1080, group: "Réseaux" },
  { id: "ig-story", label: "Story / Reel / TikTok", w: 1080, h: 1920, group: "Réseaux" },
  { id: "ig-portrait", label: "Post portrait", w: 1080, h: 1350, group: "Réseaux" },
  { id: "fb-post", label: "Post Facebook", w: 1200, h: 630, group: "Réseaux" },
  { id: "yt-thumb", label: "Miniature YouTube", w: 1280, h: 720, group: "Réseaux" },
  { id: "x-post", label: "Post X / Twitter", w: 1600, h: 900, group: "Réseaux" },
  { id: "linkedin", label: "Bannière LinkedIn", w: 1584, h: 396, group: "Réseaux" },
  { id: "logo", label: "Logo", w: 800, h: 800, group: "Marque" },
  { id: "card", label: "Carte de visite", w: 1050, h: 600, group: "Impression" },
  { id: "a4-p", label: "A4 portrait", w: 1240, h: 1754, group: "Impression" },
  { id: "a4-l", label: "A4 paysage", w: 1754, h: 1240, group: "Impression" },
  { id: "hd", label: "Écran Full HD", w: 1920, h: 1080, group: "Écran" },
  { id: "qhd", label: "Écran 2K QHD", w: 2560, h: 1440, group: "Écran" },
  { id: "uhd", label: "Écran 4K UHD", w: 3840, h: 2160, group: "Écran" },
  { id: "ultrawide", label: "Ultra-large 21:9", w: 3440, h: 1440, group: "Écran" },
  { id: "mba13", label: "MacBook Air 13\"", w: 2560, h: 1664, group: "Fonds d'écran" },
  { id: "mbp14", label: "MacBook Pro 14\"", w: 3024, h: 1964, group: "Fonds d'écran" },
  { id: "mbp16", label: "MacBook Pro 16\"", w: 3456, h: 2234, group: "Fonds d'écran" },
  { id: "imac24", label: "iMac 24\" 4,5K", w: 4480, h: 2520, group: "Fonds d'écran" },
  { id: "ipad-pro", label: "iPad Pro 12,9\"", w: 2048, h: 2732, group: "Fonds d'écran" },
  { id: "iphone", label: "iPhone", w: 1179, h: 2556, group: "Fonds d'écran" },
];

export type FontDef = { label: string; css: string };
export const FONTS: FontDef[] = [
  { label: "Sans (moderne)", css: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  { label: "Helvetica / Arial", css: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", css: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet", css: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: "Tahoma", css: "Tahoma, Geneva, sans-serif" },
  { label: "Futura / Century", css: 'Futura, "Century Gothic", "Apple SD Gothic Neo", sans-serif' },
  { label: "Georgia (serif)", css: 'Georgia, "Times New Roman", serif' },
  { label: "Times", css: '"Times New Roman", Times, serif' },
  { label: "Palatino", css: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { label: "Garamond", css: 'Garamond, "Times New Roman", serif' },
  { label: "Didot / Bodoni", css: 'Didot, "Bodoni MT", "Playfair Display", Georgia, serif' },
  { label: "Courier (mono)", css: '"Courier New", Courier, monospace' },
  { label: "Menlo (mono)", css: 'Menlo, Consolas, "Courier New", monospace' },
  { label: "Impact", css: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
  { label: "Arial Black", css: '"Arial Black", "Arial Bold", Arial, sans-serif' },
  { label: "Brush (script)", css: '"Brush Script MT", "Savoye LET", cursive' },
  { label: "Snell (calligraphie)", css: '"Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive' },
  { label: "Marker", css: '"Marker Felt", "Comic Sans MS", cursive' },
];

/* ═══════════════ Utilitaires ═══════════════ */

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `l-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const newId = genId;

function clampSize(n: number): number {
  return Math.max(16, Math.min(8000, Math.round(Number(n) || 1080)));
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Clone un calque avec un nouvel id (duplication / collage / modèle). */
export function cloneLayer(l: Layer, dx = 0, dy = 0): Layer {
  return { ...deepClone(l), id: genId(), x: l.x + dx, y: l.y + dy };
}

/** Chaîne de filtres CSS (identique DOM et ctx.filter). */
export function filterCss(f: Filters): string {
  const parts: string[] = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.grayscale) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.sepia) parts.push(`sepia(${f.sepia}%)`);
  if (f.invert) parts.push(`invert(${f.invert}%)`);
  if (f.hueRotate) parts.push(`hue-rotate(${f.hueRotate}deg)`);
  if (f.blur) parts.push(`blur(${f.blur}px)`);
  return parts.join(" ") || "none";
}

/** rgba() à partir d'un hex + alpha (pour les ombres). */
export function hexToRgba(hex: string, alpha: number): string {
  let s = (hex || "#000000").replace(/^#/, "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) s = "000000";
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

/** filter CSS drop-shadow d'un calque (ou "" si désactivée). */
export function shadowCss(s: Shadow | undefined): string {
  if (!s || !s.enabled) return "";
  return `drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${hexToRgba(s.color, s.opacity)})`;
}

/* ── Dégradés : points de tracé (convention CSS, partagée DOM/SVG/canvas) ── */

/** Points de la ligne d'un dégradé linéaire CSS (angle en deg, 0 = vers le haut). */
export function linearGradientPoints(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180;
  const vx = Math.sin(rad);
  const vy = -Math.cos(rad);
  const len = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
  const cx = w / 2, cy = h / 2;
  return {
    x1: cx - (vx * len) / 2, y1: cy - (vy * len) / 2,
    x2: cx + (vx * len) / 2, y2: cy + (vy * len) / 2,
  };
}

/** Rayon d'un dégradé radial CSS (circle farthest-corner). */
export function radialGradientRadius(w: number, h: number) {
  return Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
}

/** background CSS d'un fond (couleur ou dégradé). */
export function backgroundCss(color: string, gradient: GradientFill | null): string {
  if (gradient) {
    return gradient.type === "linear"
      ? `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`
      : `radial-gradient(circle, ${gradient.from}, ${gradient.to})`;
  }
  return color;
}

/* ═══════════════ Tracés des formes ═══════════════ */
// Chaque forme = un chemin SVG en unités pixel (w×h). La MÊME chaîne alimente
// le <path> du DOM et Path2D du canvas → parité de rendu garantie.

const N = (n: number) => Math.round(n * 100) / 100;

function polygonPath(w: number, h: number, sides: number, rotate = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ((rotate + (i * 360) / sides) * Math.PI) / 180;
    pts.push(`${N(w / 2 + (w / 2) * Math.cos(a))} ${N(h / 2 + (h / 2) * Math.sin(a))}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function starPath(w: number, h: number, points: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 1 : inner;
    const a = ((-90 + (i * 360) / (points * 2)) * Math.PI) / 180;
    pts.push(`${N(w / 2 + (w / 2) * r * Math.cos(a))} ${N(h / 2 + (h / 2) * r * Math.sin(a))}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function roundedRectPath(w: number, h: number, r: number): string {
  const rad = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  if (rad <= 0) return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  return [
    `M ${rad} 0`,
    `L ${w - rad} 0`, `A ${rad} ${rad} 0 0 1 ${w} ${rad}`,
    `L ${w} ${h - rad}`, `A ${rad} ${rad} 0 0 1 ${w - rad} ${h}`,
    `L ${rad} ${h}`, `A ${rad} ${rad} 0 0 1 0 ${h - rad}`,
    `L 0 ${rad}`, `A ${rad} ${rad} 0 0 1 ${rad} 0`,
    "Z",
  ].join(" ");
}

function ellipsePath(w: number, h: number, cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2): string {
  return `M ${N(cx + rx)} ${N(cy)} A ${N(rx)} ${N(ry)} 0 1 1 ${N(cx - rx)} ${N(cy)} A ${N(rx)} ${N(ry)} 0 1 1 ${N(cx + rx)} ${N(cy)} Z`;
}

export function shapePath(kind: ShapeKind, w: number, h: number, radius = 0): string {
  switch (kind) {
    case "rect": return roundedRectPath(w, h, radius);
    case "ellipse": return ellipsePath(w, h);
    case "triangle": return `M ${N(w / 2)} 0 L ${w} ${h} L 0 ${h} Z`;
    case "diamond": return `M ${N(w / 2)} 0 L ${w} ${N(h / 2)} L ${N(w / 2)} ${h} L 0 ${N(h / 2)} Z`;
    case "pentagon": return polygonPath(w, h, 5);
    case "hexagon": return polygonPath(w, h, 6, 0);
    case "star": return starPath(w, h, 5, 0.45);
    case "sparkle": return starPath(w, h, 4, 0.18);
    case "heart":
      return `M ${N(0.5 * w)} ${N(0.3 * h)} C ${N(0.5 * w)} ${N(0.12 * h)} ${N(0.32 * w)} ${N(0.02 * h)} ${N(0.18 * w)} ${N(0.1 * h)} C ${N(0.02 * w)} ${N(0.2 * h)} ${N(0.02 * w)} ${N(0.42 * h)} ${N(0.16 * w)} ${N(0.58 * h)} L ${N(0.5 * w)} ${N(0.94 * h)} L ${N(0.84 * w)} ${N(0.58 * h)} C ${N(0.98 * w)} ${N(0.42 * h)} ${N(0.98 * w)} ${N(0.2 * h)} ${N(0.82 * w)} ${N(0.1 * h)} C ${N(0.68 * w)} ${N(0.02 * h)} ${N(0.5 * w)} ${N(0.12 * h)} ${N(0.5 * w)} ${N(0.3 * h)} Z`;
    case "arrow":
      return `M 0 ${N(0.32 * h)} L ${N(0.62 * w)} ${N(0.32 * h)} L ${N(0.62 * w)} ${N(0.06 * h)} L ${w} ${N(0.5 * h)} L ${N(0.62 * w)} ${N(0.94 * h)} L ${N(0.62 * w)} ${N(0.68 * h)} L 0 ${N(0.68 * h)} Z`;
    case "bolt":
      return `M ${N(0.62 * w)} 0 L ${N(0.08 * w)} ${N(0.6 * h)} L ${N(0.42 * w)} ${N(0.6 * h)} L ${N(0.34 * w)} ${h} L ${N(0.92 * w)} ${N(0.36 * h)} L ${N(0.55 * w)} ${N(0.36 * h)} Z`;
    case "cross":
      return `M ${N(0.35 * w)} 0 L ${N(0.65 * w)} 0 L ${N(0.65 * w)} ${N(0.35 * h)} L ${w} ${N(0.35 * h)} L ${w} ${N(0.65 * h)} L ${N(0.65 * w)} ${N(0.65 * h)} L ${N(0.65 * w)} ${h} L ${N(0.35 * w)} ${h} L ${N(0.35 * w)} ${N(0.65 * h)} L 0 ${N(0.65 * h)} L 0 ${N(0.35 * h)} L ${N(0.35 * w)} ${N(0.35 * h)} Z`;
    case "message":
      return `M ${N(0.14 * w)} ${N(0.02 * h)} L ${N(0.86 * w)} ${N(0.02 * h)} C ${N(0.94 * w)} ${N(0.02 * h)} ${N(0.98 * w)} ${N(0.08 * h)} ${N(0.98 * w)} ${N(0.16 * h)} L ${N(0.98 * w)} ${N(0.56 * h)} C ${N(0.98 * w)} ${N(0.64 * h)} ${N(0.94 * w)} ${N(0.7 * h)} ${N(0.86 * w)} ${N(0.7 * h)} L ${N(0.42 * w)} ${N(0.7 * h)} L ${N(0.2 * w)} ${N(0.96 * h)} L ${N(0.26 * w)} ${N(0.7 * h)} L ${N(0.14 * w)} ${N(0.7 * h)} C ${N(0.06 * w)} ${N(0.7 * h)} ${N(0.02 * w)} ${N(0.64 * h)} ${N(0.02 * w)} ${N(0.56 * h)} L ${N(0.02 * w)} ${N(0.16 * h)} C ${N(0.02 * w)} ${N(0.08 * h)} ${N(0.06 * w)} ${N(0.02 * h)} ${N(0.14 * w)} ${N(0.02 * h)} Z`;
    case "cloud":
      return `M ${N(0.25 * w)} ${N(0.85 * h)} C ${N(0.1 * w)} ${N(0.85 * h)} ${N(0.02 * w)} ${N(0.72 * h)} ${N(0.07 * w)} ${N(0.6 * h)} C ${N(0.02 * w)} ${N(0.48 * h)} ${N(0.12 * w)} ${N(0.36 * h)} ${N(0.24 * w)} ${N(0.4 * h)} C ${N(0.26 * w)} ${N(0.22 * h)} ${N(0.44 * w)} ${N(0.14 * h)} ${N(0.56 * w)} ${N(0.24 * h)} C ${N(0.64 * w)} ${N(0.1 * h)} ${N(0.84 * w)} ${N(0.14 * h)} ${N(0.86 * w)} ${N(0.3 * h)} C ${N(0.98 * w)} ${N(0.32 * h)} ${N(1 * w)} ${N(0.52 * h)} ${N(0.9 * w)} ${N(0.6 * h)} C ${N(0.98 * w)} ${N(0.72 * h)} ${N(0.88 * w)} ${N(0.85 * h)} ${N(0.75 * w)} ${N(0.85 * h)} Z`;
    case "ring":
      return `${ellipsePath(w, h)} ${ellipsePath(w, h, w / 2, h / 2, (w / 2) * 0.62, (h / 2) * 0.62)}`;
    case "half":
      return `M 0 ${h} A ${N(w / 2)} ${h} 0 0 1 ${w} ${h} Z`;
    case "star6": return starPath(w, h, 6, 0.58);
    case "octagon": return polygonPath(w, h, 8, -67.5);
    case "parallelogram":
      return `M ${N(0.25 * w)} 0 L ${w} 0 L ${N(0.75 * w)} ${h} L 0 ${h} Z`;
    case "trapezoid":
      return `M ${N(0.2 * w)} 0 L ${N(0.8 * w)} 0 L ${w} ${h} L 0 ${h} Z`;
    case "chevron":
      return `M 0 0 L ${N(0.62 * w)} 0 L ${w} ${N(0.5 * h)} L ${N(0.62 * w)} ${h} L 0 ${h} L ${N(0.38 * w)} ${N(0.5 * h)} Z`;
    case "doubleArrow":
      return `M 0 ${N(0.5 * h)} L ${N(0.25 * w)} ${N(0.1 * h)} L ${N(0.25 * w)} ${N(0.32 * h)} L ${N(0.75 * w)} ${N(0.32 * h)} L ${N(0.75 * w)} ${N(0.1 * h)} L ${w} ${N(0.5 * h)} L ${N(0.75 * w)} ${N(0.9 * h)} L ${N(0.75 * w)} ${N(0.68 * h)} L ${N(0.25 * w)} ${N(0.68 * h)} L ${N(0.25 * w)} ${N(0.9 * h)} Z`;
    case "drop":
      return `M ${N(0.5 * w)} 0 C ${N(0.78 * w)} ${N(0.32 * h)} ${N(0.94 * w)} ${N(0.5 * h)} ${N(0.94 * w)} ${N(0.68 * h)} C ${N(0.94 * w)} ${N(0.86 * h)} ${N(0.74 * w)} ${h} ${N(0.5 * w)} ${h} C ${N(0.26 * w)} ${h} ${N(0.06 * w)} ${N(0.86 * h)} ${N(0.06 * w)} ${N(0.68 * h)} C ${N(0.06 * w)} ${N(0.5 * h)} ${N(0.22 * w)} ${N(0.32 * h)} ${N(0.5 * w)} 0 Z`;
    case "pin":
      return `M ${N(0.5 * w)} 0 C ${N(0.79 * w)} 0 ${N(0.93 * w)} ${N(0.19 * h)} ${N(0.93 * w)} ${N(0.37 * h)} C ${N(0.93 * w)} ${N(0.6 * h)} ${N(0.5 * w)} ${h} ${N(0.5 * w)} ${h} C ${N(0.5 * w)} ${h} ${N(0.07 * w)} ${N(0.6 * h)} ${N(0.07 * w)} ${N(0.37 * h)} C ${N(0.07 * w)} ${N(0.19 * h)} ${N(0.21 * w)} 0 ${N(0.5 * w)} 0 Z ${ellipsePath(w, h, 0.5 * w, 0.36 * h, 0.16 * w, 0.16 * h)}`;
    case "shield":
      return `M ${N(0.5 * w)} 0 L ${N(0.95 * w)} ${N(0.16 * h)} C ${N(0.95 * w)} ${N(0.52 * h)} ${N(0.82 * w)} ${N(0.84 * h)} ${N(0.5 * w)} ${h} C ${N(0.18 * w)} ${N(0.84 * h)} ${N(0.05 * w)} ${N(0.52 * h)} ${N(0.05 * w)} ${N(0.16 * h)} Z`;
    case "seal": return starPath(w, h, 14, 0.86);
    case "check":
      return `M ${N(0.04 * w)} ${N(0.56 * h)} L ${N(0.2 * w)} ${N(0.4 * h)} L ${N(0.4 * w)} ${N(0.6 * h)} L ${N(0.8 * w)} ${N(0.14 * h)} L ${N(0.96 * w)} ${N(0.3 * h)} L ${N(0.4 * w)} ${N(0.92 * h)} Z`;
    case "crescent":
      // Deux cercles de même rayon décalés : arcs toujours valides (rayon
      // 0,425 > demi-corde 0,402), croissant net à toutes les tailles.
      return `M ${N(0.6125 * w)} ${N(0.0979 * h)} A ${N(0.425 * w)} ${N(0.425 * h)} 0 1 0 ${N(0.6125 * w)} ${N(0.9021 * h)} A ${N(0.425 * w)} ${N(0.425 * h)} 0 0 1 ${N(0.6125 * w)} ${N(0.0979 * h)} Z`;
    default:
      return roundedRectPath(w, h, 0);
  }
}

/* ═══════════════ Lecture / migration d'un document ═══════════════ */

type LegacyLayer = Record<string, unknown> & { type?: string };

function withBaseDefaults<T extends Record<string, unknown>>(l: T): T & BaseLayer {
  return {
    id: typeof l.id === "string" ? l.id : genId(),
    name: typeof l.name === "string" ? l.name : "Calque",
    x: Number(l.x) || 0, y: Number(l.y) || 0,
    w: Math.max(1, Number(l.w) || 100), h: Math.max(0, Number(l.h) || 100),
    rotation: Number(l.rotation) || 0,
    opacity: typeof l.opacity === "number" ? Math.max(0, Math.min(1, l.opacity)) : 1,
    blend: (l.blend as BlendMode) || "normal",
    visible: l.visible !== false,
    locked: l.locked === true,
    flipX: l.flipX === true,
    flipY: l.flipY === true,
    shadow: l.shadow && typeof l.shadow === "object" ? { ...DEFAULT_SHADOW, ...(l.shadow as Shadow) } : { ...DEFAULT_SHADOW },
    ...l,
  } as T & BaseLayer;
}

/** Normalise un calque brut (y compris les anciens schémas rect/ellipse/triangle). */
function migrateLayer(raw: LegacyLayer): Layer | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw.type;
  // Anciens types « formes » → calque shape générique.
  if (t === "rect" || t === "ellipse" || t === "triangle") {
    return withBaseDefaults({
      ...raw,
      type: "shape",
      shape: t as ShapeKind,
      fill: typeof raw.fill === "string" ? (raw.fill as string) : "#8b5cf6",
      gradient: (raw.gradient as GradientFill) ?? null,
      stroke: typeof raw.stroke === "string" ? (raw.stroke as string) : "#000000",
      strokeWidth: Number(raw.strokeWidth) || 0,
      radius: Number(raw.radius) || 0,
    }) as ShapeLayer;
  }
  if (t === "shape") {
    return withBaseDefaults({
      ...raw,
      type: "shape",
      shape: (raw.shape as ShapeKind) || "rect",
      fill: typeof raw.fill === "string" ? (raw.fill as string) : "#8b5cf6",
      gradient: (raw.gradient as GradientFill) ?? null,
      stroke: typeof raw.stroke === "string" ? (raw.stroke as string) : "#000000",
      strokeWidth: Number(raw.strokeWidth) || 0,
      radius: Number(raw.radius) || 0,
    }) as ShapeLayer;
  }
  if (t === "line") {
    return withBaseDefaults({
      ...raw,
      type: "line",
      // Une ligne garde une zone de saisie minimale (les anciennes avaient h=0).
      h: Math.max(24, Number(raw.h) || 0),
      stroke: typeof raw.stroke === "string" ? (raw.stroke as string) : "#111827",
      strokeWidth: Number(raw.strokeWidth) || 6,
      dash: (raw.dash as LineDash) || "solid",
    }) as LineLayer;
  }
  if (t === "text") {
    return withBaseDefaults({
      ...raw,
      type: "text",
      text: typeof raw.text === "string" ? (raw.text as string) : "",
      color: typeof raw.color === "string" ? (raw.color as string) : "#111827",
      fontFamily: typeof raw.fontFamily === "string" ? (raw.fontFamily as string) : FONTS[0].css,
      fontSize: Number(raw.fontSize) || 48,
      fontWeight: Number(raw.fontWeight) || 700,
      italic: raw.italic === true,
      underline: raw.underline === true,
      uppercase: raw.uppercase === true,
      align: (raw.align as TextAlign) || "center",
      lineHeight: Number(raw.lineHeight) || 1.2,
      letterSpacing: Number(raw.letterSpacing) || 0,
      strokeColor: typeof raw.strokeColor === "string" ? (raw.strokeColor as string) : "#000000",
      strokeWidth: Number(raw.strokeWidth) || 0,
    }) as TextLayer;
  }
  if (t === "element") {
    return withBaseDefaults({
      ...raw,
      type: "element",
      ref: typeof raw.ref === "string" ? (raw.ref as string) : "",
      fill: typeof raw.fill === "string" ? (raw.fill as string) : "#8b5cf6",
      gradient: (raw.gradient as GradientFill) ?? null,
      natW: Number(raw.natW) || 200,
      natH: Number(raw.natH) || 200,
    }) as ElementLayer;
  }
  if (t === "image") {
    return withBaseDefaults({
      ...raw,
      type: "image",
      src: typeof raw.src === "string" ? (raw.src as string) : "",
      filters: raw.filters && typeof raw.filters === "object" ? { ...NEUTRAL_FILTERS, ...(raw.filters as Filters) } : { ...NEUTRAL_FILTERS },
      radius: Number(raw.radius) || 0,
      naturalW: typeof raw.naturalW === "number" ? (raw.naturalW as number) : undefined,
      naturalH: typeof raw.naturalH === "number" ? (raw.naturalH as number) : undefined,
    }) as ImageLayer;
  }
  return null;
}

export function parseDesign(raw: string | null | undefined): DesignDoc {
  if (!raw) return deepClone(DEFAULT_DESIGN);
  try {
    const d = JSON.parse(raw) as Partial<DesignDoc> & { layers?: LegacyLayer[] };
    if (!d || typeof d !== "object" || !Array.isArray(d.layers)) return deepClone(DEFAULT_DESIGN);
    return {
      version: 1,
      width: clampSize(d.width ?? 1080),
      height: clampSize(d.height ?? 1080),
      background: typeof d.background === "string" ? d.background : "#ffffff",
      backgroundGradient: (d.backgroundGradient as GradientFill) ?? null,
      layers: d.layers.map(migrateLayer).filter((l): l is Layer => l !== null),
    };
  } catch {
    return deepClone(DEFAULT_DESIGN);
  }
}

/* ═══════════════ Fabrique de calques ═══════════════ */

export function makeShape(kind: ShapeKind, doc: DesignDoc, patch: Partial<ShapeLayer> = {}): ShapeLayer {
  const unit = Math.round(Math.min(doc.width, doc.height) * 0.34);
  return withBaseDefaults({
    type: "shape",
    shape: kind,
    name: SHAPE_KINDS.find((s) => s.id === kind)?.label ?? "Forme",
    x: Math.round(doc.width / 2 - unit / 2),
    y: Math.round(doc.height / 2 - unit / 2),
    w: unit, h: unit,
    fill: "#8b5cf6",
    gradient: null,
    stroke: "#000000",
    strokeWidth: 0,
    radius: 0,
    ...patch,
  }) as ShapeLayer;
}

export function makeLine(doc: DesignDoc, patch: Partial<LineLayer> = {}): LineLayer {
  const w = Math.round(doc.width * 0.5);
  return withBaseDefaults({
    type: "line",
    name: "Ligne",
    x: Math.round(doc.width / 2 - w / 2),
    y: Math.round(doc.height / 2 - 12),
    w, h: 24,
    stroke: "#111827",
    strokeWidth: 6,
    dash: "solid",
    ...patch,
  }) as LineLayer;
}

export function makeText(doc: DesignDoc, patch: Partial<TextLayer> = {}): TextLayer {
  const w = Math.round(doc.width * 0.7);
  const fontSize = Math.max(24, Math.round(doc.width * 0.06));
  return withBaseDefaults({
    type: "text",
    name: "Texte",
    x: Math.round(doc.width / 2 - w / 2),
    y: Math.round(doc.height / 2 - fontSize),
    w, h: Math.round(fontSize * 1.5),
    text: "Votre texte",
    color: "#111827",
    fontFamily: FONTS[0].css,
    fontSize,
    fontWeight: 700,
    italic: false, underline: false, uppercase: false,
    align: "center",
    lineHeight: 1.2, letterSpacing: 0,
    strokeColor: "#000000", strokeWidth: 0,
    ...patch,
  }) as TextLayer;
}

export function makeElement(doc: DesignDoc, patch: Partial<ElementLayer> = {}): ElementLayer {
  const w = Math.round(doc.width * 0.4);
  return withBaseDefaults({
    type: "element",
    name: "Élément",
    x: Math.round(doc.width / 2 - w / 2),
    y: Math.round(doc.height / 2 - w / 2),
    w, h: w,
    ref: "",
    fill: "#8b5cf6",
    gradient: null,
    natW: 200,
    natH: 200,
    ...patch,
  }) as ElementLayer;
}

export function makeImage(doc: DesignDoc, patch: Partial<ImageLayer> = {}): ImageLayer {
  const w = Math.round(doc.width * 0.6);
  const h = Math.round(doc.height * 0.6);
  return withBaseDefaults({
    type: "image",
    name: "Image",
    x: Math.round(doc.width / 2 - w / 2),
    y: Math.round(doc.height / 2 - h / 2),
    w, h,
    src: "",
    filters: { ...NEUTRAL_FILTERS },
    radius: 0,
    ...patch,
  }) as ImageLayer;
}

/* ═══════════════ Export (rasterisation canvas) ═══════════════ */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function canvasGradient(ctx: CanvasRenderingContext2D, g: GradientFill, w: number, h: number): CanvasGradient {
  if (g.type === "radial") {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radialGradientRadius(w, h));
    grad.addColorStop(0, g.from);
    grad.addColorStop(1, g.to);
    return grad;
  }
  const p = linearGradientPoints(g.angle, w, h);
  const grad = ctx.createLinearGradient(p.x1, p.y1, p.x2, p.y2);
  grad.addColorStop(0, g.from);
  grad.addColorStop(1, g.to);
  return grad;
}

// Ombre « device » : ctx.shadow* IGNORE la matrice de transformation du canvas
// (échelle d'export, rotation, miroir). On pré-calcule donc l'offset dans le
// repère écran — comme le fait CSS drop-shadow (filtre appliqué AVANT transform).
type DevShadow = { dx: number; dy: number; blur: number; color: string };

function devShadow(l: Layer, scale: number): DevShadow | null {
  const s = l.shadow;
  if (!s || !s.enabled) return null;
  const ox = s.x * (l.flipX ? -1 : 1);
  const oy = s.y * (l.flipY ? -1 : 1);
  const rad = (l.rotation * Math.PI) / 180;
  return {
    dx: (ox * Math.cos(rad) - oy * Math.sin(rad)) * scale,
    dy: (ox * Math.sin(rad) + oy * Math.cos(rad)) * scale,
    blur: s.blur * scale,
    color: hexToRgba(s.color, s.opacity),
  };
}

function applyShadow(ctx: CanvasRenderingContext2D, s: DevShadow | null) {
  if (!s) return;
  ctx.shadowOffsetX = s.dx;
  ctx.shadowOffsetY = s.dy;
  ctx.shadowBlur = s.blur;
  ctx.shadowColor = s.color;
}
function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine === "") { out.push(""); continue; }
    const words = rawLine.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) { line = test; continue; }
      if (line) { out.push(line); line = ""; }
      // Mot plus large que la boîte : coupe au caractère (parité break-word du DOM).
      if (ctx.measureText(word).width <= maxWidth) { line = word; continue; }
      let chunk = "";
      for (const ch of word) {
        if (chunk && ctx.measureText(chunk + ch).width > maxWidth) { out.push(chunk); chunk = ch; }
        else chunk += ch;
      }
      line = chunk;
    }
    out.push(line);
  }
  return out;
}

export async function rasterize(
  doc: DesignDoc,
  scale = 1,
  opts: { transparent?: boolean; flatten?: string } = {},
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(doc.width * scale);
  canvas.height = Math.round(doc.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Base opaque (export JPEG d'un document à fond transparent → blanc, pas noir).
  if (opts.flatten && !opts.transparent) {
    ctx.fillStyle = opts.flatten;
    ctx.fillRect(0, 0, doc.width, doc.height);
  }
  if (!opts.transparent) {
    if (doc.backgroundGradient) {
      ctx.fillStyle = canvasGradient(ctx, doc.backgroundGradient, doc.width, doc.height);
      ctx.fillRect(0, 0, doc.width, doc.height);
    } else if (doc.background && doc.background !== "transparent") {
      ctx.fillStyle = doc.background;
      ctx.fillRect(0, 0, doc.width, doc.height);
    }
  }

  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = (layer.blend === "normal" ? "source-over" : layer.blend) as GlobalCompositeOperation;

    // translate → rotate → flip, autour du centre du calque (même ordre que le DOM).
    ctx.translate(layer.x + layer.w / 2, layer.y + layer.h / 2);
    if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
    ctx.translate(-layer.w / 2, -layer.h / 2);

    const sh = devShadow(layer, scale);
    try {
      if (layer.type === "shape") drawShape(ctx, layer, sh);
      else if (layer.type === "line") drawLine(ctx, layer, sh);
      else if (layer.type === "text") drawText(ctx, layer, sh);
      else if (layer.type === "image") await drawImage(ctx, layer, sh, scale);
      else if (layer.type === "element") await drawElement(ctx, layer, sh, scale);
    } catch {
      /* un calque en échec ne casse pas l'export */
    }
    ctx.restore();
  }
  return canvas;
}

function drawShape(ctx: CanvasRenderingContext2D, l: ShapeLayer, sh: DevShadow | null) {
  const path = new Path2D(shapePath(l.shape, l.w, l.h, l.radius));
  const hasFill = l.gradient || (l.fill && l.fill !== "transparent");
  if (hasFill) {
    applyShadow(ctx, sh);
    ctx.fillStyle = l.gradient ? canvasGradient(ctx, l.gradient, l.w, l.h) : l.fill;
    ctx.fill(path, "evenodd");
    clearShadow(ctx);
  }
  if (l.strokeWidth > 0) {
    if (!hasFill) applyShadow(ctx, sh);
    ctx.lineWidth = l.strokeWidth;
    ctx.strokeStyle = l.stroke;
    ctx.lineJoin = "round";
    ctx.stroke(path);
    clearShadow(ctx);
  }
}

function drawLine(ctx: CanvasRenderingContext2D, l: LineLayer, sh: DevShadow | null) {
  applyShadow(ctx, sh);
  ctx.beginPath();
  ctx.moveTo(0, l.h / 2);
  ctx.lineTo(l.w, l.h / 2);
  ctx.lineWidth = l.strokeWidth;
  ctx.strokeStyle = l.stroke;
  ctx.lineCap = "round";
  if (l.dash === "dashed") ctx.setLineDash([l.strokeWidth * 3, l.strokeWidth * 2]);
  else if (l.dash === "dotted") ctx.setLineDash([0.01, l.strokeWidth * 2.2]);
  ctx.stroke();
  ctx.setLineDash([]);
  clearShadow(ctx);
}

function drawText(ctx: CanvasRenderingContext2D, l: TextLayer, sh: DevShadow | null) {
  const style = l.italic ? "italic " : "";
  ctx.font = `${style}${l.fontWeight} ${l.fontSize}px ${l.fontFamily}`;
  ctx.textBaseline = "top";
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.letterSpacing}px`;
  }
  const text = l.uppercase ? l.text.toUpperCase() : l.text;
  const lines = wrapLines(ctx, text, l.w);
  const lh = l.fontSize * l.lineHeight;
  // Demi-interligne : CSS centre chaque ligne dans sa boîte de hauteur lh.
  const y0 = (lh - l.fontSize) / 2;
  ctx.textAlign = l.align;
  const anchorX = l.align === "center" ? l.w / 2 : l.align === "right" ? l.w : 0;

  applyShadow(ctx, sh);
  lines.forEach((line, i) => {
    const y = y0 + i * lh;
    if (l.strokeWidth > 0) {
      // Trait centré de largeur W, recouvert par le remplissage → W/2 visibles,
      // exactement comme -webkit-text-stroke + paint-order du DOM.
      ctx.lineWidth = l.strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeStyle = l.strokeColor;
      ctx.strokeText(line, anchorX, y);
    }
    ctx.fillStyle = l.color;
    ctx.fillText(line, anchorX, y);
    if (l.underline) {
      const wdt = ctx.measureText(line).width;
      const ux = l.align === "center" ? anchorX - wdt / 2 : l.align === "right" ? anchorX - wdt : anchorX;
      ctx.beginPath();
      ctx.moveTo(ux, y + l.fontSize * 1.02);
      ctx.lineTo(ux + wdt, y + l.fontSize * 1.02);
      ctx.lineWidth = Math.max(1, l.fontSize / 16);
      ctx.strokeStyle = l.color;
      ctx.stroke();
    }
  });
  clearShadow(ctx);
}

async function drawElement(ctx: CanvasRenderingContext2D, l: ElementLayer, sh: DevShadow | null, scale = 1) {
  // Import différé pour éviter tout cycle au chargement (design-elements ne
  // consomme de ce module que des types).
  const { elementSvgByRef } = await import("./design-elements");
  const svg = elementSvgByRef(l.ref, l.fill, l.gradient);
  if (!svg) return;
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  // Rendu ÉTIRÉ (comme le DOM) dans un intermédiaire en pixels d'export.
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.round(l.w * scale));
  off.height = Math.max(1, Math.round(l.h * scale));
  off.getContext("2d")!.drawImage(img, 0, 0, off.width, off.height);
  applyShadow(ctx, sh);
  ctx.drawImage(off, 0, 0, l.w, l.h);
  clearShadow(ctx);
}

async function drawImage(ctx: CanvasRenderingContext2D, l: ImageLayer, sh: DevShadow | null, scale = 1) {
  if (!l.src) return;
  const img = await loadImage(l.src);
  // L'ombre doit suivre la silhouette arrondie → on dessine l'image filtrée dans
  // un canvas intermédiaire, puis on la pose avec l'ombre.
  // L'intermédiaire est en PIXELS D'EXPORT (l.w × scale) : en 2×/3×, les SVG de
  // la bibliothèque restent vectoriels-nets et les photos gardent leur piqué
  // (sinon tout serait rastérisé en 1× puis agrandi → flou).
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.round(l.w * scale));
  off.height = Math.max(1, Math.round(l.h * scale));
  const octx = off.getContext("2d")!;
  if (l.radius > 0) {
    octx.beginPath();
    const p = new Path2D(roundedRectPath(off.width, off.height, l.radius * scale));
    octx.clip(p);
  }
  // Le flou est en pixels : il suit l'échelle ; les autres filtres (%/deg) non.
  const f = filterCss(scale === 1 ? l.filters : { ...l.filters, blur: l.filters.blur * scale });
  if (f !== "none") octx.filter = f;
  // Recadrage « cover » centré (parité avec object-fit: cover du DOM).
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const k = Math.max(off.width / iw, off.height / ih);
  const cw = off.width / k;
  const ch = off.height / k;
  octx.drawImage(img, (iw - cw) / 2, (ih - ch) / 2, cw, ch, 0, 0, off.width, off.height);
  applyShadow(ctx, sh);
  ctx.drawImage(off, 0, 0, l.w, l.h);
  clearShadow(ctx);
}
