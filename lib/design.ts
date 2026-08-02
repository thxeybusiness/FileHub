// Modèle de document du studio Design (éditeur graphique à calques).
// Client-only à l'usage (le rendu utilise le DOM/canvas), mais les types et
// helpers purs sont sûrs à importer partout.

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
  { id: "color-dodge", label: "Densité -" },
  { id: "color-burn", label: "Densité +" },
  { id: "hard-light", label: "Lumière crue" },
  { id: "soft-light", label: "Lumière tamisée" },
  { id: "difference", label: "Différence" },
  { id: "exclusion", label: "Exclusion" },
  { id: "hue", label: "Teinte" },
  { id: "saturation", label: "Saturation" },
  { id: "color", label: "Couleur" },
  { id: "luminosity", label: "Luminosité" },
];

export type Filters = {
  brightness: number; // % (100 = neutre)
  contrast: number;   // %
  saturate: number;   // %
  blur: number;       // px
  grayscale: number;  // 0..100
  sepia: number;      // 0..100
  hueRotate: number;  // deg
  invert: number;     // 0..100
};

export const NEUTRAL_FILTERS: Filters = {
  brightness: 100, contrast: 100, saturate: 100, blur: 0,
  grayscale: 0, sepia: 0, hueRotate: 0, invert: 0,
};

type LayerKind = "rect" | "ellipse" | "triangle" | "line" | "text" | "image";

export type BaseLayer = {
  id: string;
  type: LayerKind;
  name: string;
  x: number; y: number;   // coin haut-gauche (repère toile)
  w: number; h: number;
  rotation: number;       // deg
  opacity: number;        // 0..1
  blend: BlendMode;
  visible: boolean;
  locked: boolean;
};

export type RectLayer = BaseLayer & { type: "rect"; fill: string; stroke: string; strokeWidth: number; radius: number };
export type EllipseLayer = BaseLayer & { type: "ellipse"; fill: string; stroke: string; strokeWidth: number };
export type TriangleLayer = BaseLayer & { type: "triangle"; fill: string; stroke: string; strokeWidth: number };
export type LineLayer = BaseLayer & { type: "line"; stroke: string; strokeWidth: number };
export type TextLayer = BaseLayer & {
  type: "text";
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  lineHeight: number;   // multiplicateur
  letterSpacing: number; // px
};
export type ImageLayer = BaseLayer & {
  type: "image";
  src: string;         // /api/media/… ou data:
  filters: Filters;
  radius: number;      // arrondi des coins
  naturalW?: number;
  naturalH?: number;
};

export type Layer = RectLayer | EllipseLayer | TriangleLayer | LineLayer | TextLayer | ImageLayer;

export type DesignDoc = {
  version: 1;
  width: number;
  height: number;
  background: string; // hex ou "transparent"
  layers: Layer[];    // index 0 = arrière-plan, dernier = premier plan
};

export const DEFAULT_DESIGN: DesignDoc = {
  version: 1, width: 1080, height: 1080, background: "#ffffff", layers: [],
};

// ── Formats de toile prêts à l'emploi (façon Canva) ──
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
  { id: "hd", label: "Écran HD", w: 1920, h: 1080, group: "Écran" },
];

// ── Polices (piles système : aucune webfont à charger) ──
export type FontDef = { label: string; css: string };
export const FONTS: FontDef[] = [
  { label: "Sans (moderne)", css: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  { label: "Helvetica / Arial", css: 'Helvetica, Arial, sans-serif' },
  { label: "Verdana", css: 'Verdana, Geneva, sans-serif' },
  { label: "Trebuchet", css: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: "Tahoma", css: 'Tahoma, Geneva, sans-serif' },
  { label: "Georgia (serif)", css: 'Georgia, "Times New Roman", serif' },
  { label: "Times", css: '"Times New Roman", Times, serif' },
  { label: "Palatino", css: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { label: "Garamond", css: 'Garamond, "Times New Roman", serif' },
  { label: "Courier (mono)", css: '"Courier New", Courier, monospace' },
  { label: "Impact", css: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
  { label: "Brush", css: '"Brush Script MT", "Comic Sans MS", cursive' },
];

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `l-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const newId = uid;

export function parseDesign(raw: string | null | undefined): DesignDoc {
  if (!raw) return structuredCloneSafe(DEFAULT_DESIGN);
  try {
    const d = JSON.parse(raw) as Partial<DesignDoc>;
    if (!d || typeof d !== "object" || !Array.isArray(d.layers)) return structuredCloneSafe(DEFAULT_DESIGN);
    return {
      version: 1,
      width: clampSize(d.width ?? 1080),
      height: clampSize(d.height ?? 1080),
      background: typeof d.background === "string" ? d.background : "#ffffff",
      layers: (d.layers as Layer[]).filter(Boolean),
    };
  } catch {
    return structuredCloneSafe(DEFAULT_DESIGN);
  }
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
function clampSize(n: number): number {
  return Math.max(16, Math.min(8000, Math.round(n || 1080)));
}

/** Chaîne de filtres CSS (identique pour le DOM et pour ctx.filter du canvas). */
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

// ── Défauts de calques ──
export function makeLayer(type: LayerKind, doc: DesignDoc, patch: Partial<Layer> = {}): Layer {
  const cx = doc.width / 2;
  const cy = doc.height / 2;
  const base = {
    id: uid(),
    name: "",
    rotation: 0,
    opacity: 1,
    blend: "normal" as BlendMode,
    visible: true,
    locked: false,
  };
  const unit = Math.round(Math.min(doc.width, doc.height) * 0.32);
  if (type === "text") {
    const w = Math.round(doc.width * 0.7);
    const fontSize = Math.max(24, Math.round(doc.width * 0.06));
    return {
      ...base, type: "text", name: "Texte",
      x: Math.round(cx - w / 2), y: Math.round(cy - fontSize),
      w, h: Math.round(fontSize * 1.5),
      text: "Votre texte", color: "#111827",
      fontFamily: FONTS[0].css, fontSize, fontWeight: 700,
      italic: false, underline: false, align: "center",
      lineHeight: 1.2, letterSpacing: 0,
      ...(patch as object),
    } as TextLayer;
  }
  if (type === "image") {
    const w = Math.round(doc.width * 0.6);
    const h = Math.round(doc.height * 0.6);
    return {
      ...base, type: "image", name: "Image",
      x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h,
      src: "", filters: { ...NEUTRAL_FILTERS }, radius: 0,
      ...(patch as object),
    } as ImageLayer;
  }
  if (type === "line") {
    const w = Math.round(doc.width * 0.5);
    return {
      ...base, type: "line", name: "Ligne",
      x: Math.round(cx - w / 2), y: Math.round(cy), w, h: 0,
      stroke: "#111827", strokeWidth: 6,
      ...(patch as object),
    } as LineLayer;
  }
  const shapeBase = {
    ...base,
    x: Math.round(cx - unit / 2), y: Math.round(cy - unit / 2), w: unit, h: unit,
    fill: "#6366f1", stroke: "#000000", strokeWidth: 0,
  };
  if (type === "ellipse") return { ...shapeBase, type: "ellipse", name: "Cercle", ...(patch as object) } as EllipseLayer;
  if (type === "triangle") return { ...shapeBase, type: "triangle", name: "Triangle", ...(patch as object) } as TriangleLayer;
  return { ...shapeBase, type: "rect", name: "Rectangle", radius: 0, ...(patch as object) } as RectLayer;
}

// ─────────────────────── Export (rasterisation) ───────────────────────
// Rend le document dans un <canvas> à la résolution réelle, en miroir du DOM.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    if (raw === "") { out.push(""); continue; }
    const words = raw.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

export async function rasterize(doc: DesignDoc, scale = 1): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(doc.width * scale);
  canvas.height = Math.round(doc.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  if (doc.background && doc.background !== "transparent") {
    ctx.fillStyle = doc.background;
    ctx.fillRect(0, 0, doc.width, doc.height);
  }

  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = (layer.blend === "normal" ? "source-over" : layer.blend) as GlobalCompositeOperation;

    const cx = layer.x + layer.w / 2;
    const cy = layer.y + layer.h / 2;
    ctx.translate(cx, cy);
    if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-layer.w / 2, -layer.h / 2); // repère local : coin haut-gauche

    try {
      if (layer.type === "rect") drawRect(ctx, layer);
      else if (layer.type === "ellipse") drawEllipse(ctx, layer);
      else if (layer.type === "triangle") drawTriangle(ctx, layer);
      else if (layer.type === "line") drawLine(ctx, layer);
      else if (layer.type === "text") drawText(ctx, layer);
      else if (layer.type === "image") await drawImageLayer(ctx, layer);
    } catch {
      /* un calque en échec ne casse pas tout l'export */
    }
    ctx.restore();
  }
  return canvas;
}

function roundRectPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(rad, 0);
  ctx.arcTo(w, 0, w, h, rad);
  ctx.arcTo(w, h, 0, h, rad);
  ctx.arcTo(0, h, 0, 0, rad);
  ctx.arcTo(0, 0, w, 0, rad);
  ctx.closePath();
}

function drawRect(ctx: CanvasRenderingContext2D, l: RectLayer) {
  roundRectPath(ctx, l.w, l.h, l.radius);
  if (l.fill && l.fill !== "transparent") { ctx.fillStyle = l.fill; ctx.fill(); }
  if (l.strokeWidth > 0) { ctx.lineWidth = l.strokeWidth; ctx.strokeStyle = l.stroke; ctx.stroke(); }
}

function drawEllipse(ctx: CanvasRenderingContext2D, l: EllipseLayer) {
  ctx.beginPath();
  ctx.ellipse(l.w / 2, l.h / 2, l.w / 2, l.h / 2, 0, 0, Math.PI * 2);
  if (l.fill && l.fill !== "transparent") { ctx.fillStyle = l.fill; ctx.fill(); }
  if (l.strokeWidth > 0) { ctx.lineWidth = l.strokeWidth; ctx.strokeStyle = l.stroke; ctx.stroke(); }
}

function drawTriangle(ctx: CanvasRenderingContext2D, l: TriangleLayer) {
  ctx.beginPath();
  ctx.moveTo(l.w / 2, 0);
  ctx.lineTo(l.w, l.h);
  ctx.lineTo(0, l.h);
  ctx.closePath();
  if (l.fill && l.fill !== "transparent") { ctx.fillStyle = l.fill; ctx.fill(); }
  if (l.strokeWidth > 0) { ctx.lineWidth = l.strokeWidth; ctx.strokeStyle = l.stroke; ctx.stroke(); }
}

function drawLine(ctx: CanvasRenderingContext2D, l: LineLayer) {
  ctx.beginPath();
  ctx.moveTo(0, l.h / 2);
  ctx.lineTo(l.w, l.h / 2);
  ctx.lineWidth = l.strokeWidth;
  ctx.strokeStyle = l.stroke;
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawText(ctx: CanvasRenderingContext2D, l: TextLayer) {
  const style = l.italic ? "italic " : "";
  ctx.font = `${style}${l.fontWeight} ${l.fontSize}px ${l.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = l.color;
  const lines = wrapLines(ctx, l.text, l.w);
  const lh = l.fontSize * l.lineHeight;
  ctx.textAlign = l.align;
  const anchorX = l.align === "center" ? l.w / 2 : l.align === "right" ? l.w : 0;
  lines.forEach((line, i) => {
    const y = i * lh;
    if (l.letterSpacing && "letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.letterSpacing}px`;
    }
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
}

async function drawImageLayer(ctx: CanvasRenderingContext2D, l: ImageLayer) {
  if (!l.src) return;
  const img = await loadImage(l.src);
  ctx.save();
  if (l.radius > 0) {
    roundRectPath(ctx, l.w, l.h, l.radius);
    ctx.clip();
  }
  const filter = filterCss(l.filters);
  if (filter !== "none") ctx.filter = filter;
  ctx.drawImage(img, 0, 0, l.w, l.h);
  ctx.restore();
}
