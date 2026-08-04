// Bibliothèque d'éléments du studio Design — v2 « règle d'or ».
// CHAQUE élément est une géométrie MONOCHROME générée paramétriquement : sa
// couleur appartient au calque (ElementLayer.fill / .gradient) et se change à
// volonté — couleur unie OU dégradé. Le jeton __C__ des corps SVG est remplacé
// au rendu. Les nuances internes d'un motif passent par l'opacité de la même
// couleur, jamais par une seconde couleur.
// Les ids sont STABLES (référencés par les documents sauvegardés) : ne jamais
// renommer ni réutiliser un id ; on ne fait qu'AJOUTER.

import type { GradientFill } from "./design";

export type ElementDef = {
  id: string;
  label: string;
  cat: string;
  w: number;
  h: number;
  body: string; // SVG interne, peinture = __C__
  keywords: string;
  defaultColor?: string;
  /** Emplacements de couleur ÉDITABLES. slots[0] = couleur principale (le
   *  fill/gradient du calque) ; slots[1..] = couleurs secondaires (calque.slots).
   *  Absent = élément monochrome classique (une seule couleur). */
  slots?: { label: string; def?: string }[];
};

/** Peinture d'un emplacement : couleur unie OU dégradé. */
export type SlotPaint = { fill: string; gradient: GradientFill | null };

/** Couleurs de départ de TOUS les emplacements d'un élément. */
export function elementSlotDefaults(def: ElementDef): SlotPaint[] {
  const base = def.defaultColor ?? "#8b5cf6";
  if (!def.slots?.length) return [{ fill: base, gradient: null }];
  return def.slots.map((s, i) => ({ fill: s.def ?? (i === 0 ? base : base), gradient: null }));
}

export const ELEMENT_CATEGORIES: { id: string; label: string }[] = [
  { id: "circles", label: "Cercles & cadres" },
  { id: "strokes", label: "Traits & surlignage" },
  { id: "arrows", label: "Flèches" },
  { id: "blobs", label: "Formes organiques" },
  { id: "stars", label: "Étoiles & éclats" },
  { id: "badges", label: "Badges & rubans" },
  { id: "bubbles", label: "Bulles" },
  { id: "nature", label: "Nature" },
  { id: "party", label: "Fête" },
  { id: "deco", label: "Déco & motifs" },
  { id: "icons", label: "Icônes" },
  { id: "tech", label: "Tech" },
  { id: "food", label: "Nourriture" },
  { id: "animals", label: "Animaux" },
  { id: "objects", label: "Objets" },
  { id: "weather", label: "Météo & ciel" },
  { id: "sport", label: "Sport & loisirs" },
  { id: "geo", label: "Formes géométriques" },
  { id: "ornaments", label: "Ornements & rosaces" },
  { id: "frames", label: "Cadres & bordures" },
];

/* Palette par catégorie : chaque élément reçoit une teinte de départ
   distribuée dans cette palette (index → couleur), pour un catalogue coloré
   et varié plutôt que monochrome. Chaque élément reste recolorable à volonté ;
   les motifs à couleur évidente sont ensuite surchargés (tint). */
const VIBRANT = ["#f472b6", "#fb7185", "#fb923c", "#fbbf24", "#facc15", "#a3e635", "#4ade80", "#2dd4bf", "#38bdf8", "#60a5fa", "#818cf8", "#c084fc", "#e879f9"];
const CAT_PALETTE: Record<string, string[]> = {
  circles: VIBRANT,
  strokes: VIBRANT,
  arrows: ["#38bdf8", "#60a5fa", "#818cf8", "#f472b6", "#fb923c", "#4ade80", "#facc15", "#c084fc", "#2dd4bf", "#fb7185"],
  blobs: ["#c084fc", "#f472b6", "#fb7185", "#38bdf8", "#2dd4bf", "#a3e635", "#fbbf24", "#fb923c", "#818cf8", "#e879f9", "#34d399"],
  stars: ["#fbbf24", "#facc15", "#fde047", "#fb923c", "#f472b6", "#38bdf8", "#c084fc", "#4ade80", "#fb7185", "#60a5fa"],
  badges: ["#fb7185", "#fb923c", "#f472b6", "#facc15", "#4ade80", "#38bdf8", "#c084fc", "#f87171", "#2dd4bf", "#a3e635"],
  bubbles: ["#5eead4", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fbbf24", "#4ade80", "#fb923c"],
  nature: ["#22c55e", "#16a34a", "#4ade80", "#84cc16", "#65a30d", "#10b981", "#34d399", "#a3e635"],
  party: ["#f472b6", "#fb7185", "#fbbf24", "#a78bfa", "#38bdf8", "#4ade80", "#fb923c", "#e879f9", "#facc15", "#2dd4bf"],
  deco: VIBRANT,
  icons: VIBRANT,
  tech: ["#22d3ee", "#38bdf8", "#60a5fa", "#818cf8", "#2dd4bf", "#4ade80", "#a3e635", "#c084fc"],
  food: ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15", "#84cc16", "#a3e635", "#fbbf24", "#f43f5e", "#65a30d"],
  animals: ["#fbbf24", "#f59e0b", "#fb923c", "#d97706", "#a16207", "#a78bfa", "#94a3b8", "#38bdf8", "#f472b6", "#22c55e"],
  objects: VIBRANT,
  weather: ["#38bdf8", "#60a5fa", "#0ea5e9", "#e2e8f0", "#cbd5e1", "#fbbf24", "#a78bfa", "#22d3ee"],
  sport: ["#f87171", "#fb923c", "#fbbf24", "#22c55e", "#38bdf8", "#6366f1", "#ec4899", "#14b8a6", "#84cc16", "#f472b6"],
  geo: VIBRANT,
  ornaments: VIBRANT,
  frames: VIBRANT,
};

/* ═══════════ Outils ═══════════ */

const C = "__C__";
const N = (n: number) => Math.round(n * 10) / 10;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  let d = `M ${N(pts[0][0])} ${N(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C ${N(p1[0] + (p2[0] - p0[0]) / 6)} ${N(p1[1] + (p2[1] - p0[1]) / 6)} ${N(p2[0] - (p3[0] - p1[0]) / 6)} ${N(p2[1] - (p3[1] - p1[1]) / 6)} ${N(p2[0])} ${N(p2[1])}`;
  }
  return d + " Z";
}

function starPts(cx: number, cy: number, points: number, rOut: number, rIn: number, rot = -90): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const [x, y] = polar(cx, cy, i % 2 === 0 ? rOut : rIn, rot + (i * 180) / points);
    d += (i === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
  }
  return d + "Z";
}

function polyPts(cx: number, cy: number, sides: number, r: number, rot = -90): string {
  let d = "";
  for (let i = 0; i < sides; i++) {
    const [x, y] = polar(cx, cy, r, rot + (i * 360) / sides);
    d += (i === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
  }
  return d + "Z";
}

function arrowHead(x: number, y: number, angRad: number, size: number): string {
  const p = (da: number) => `${N(x + size * Math.cos(angRad + da))} ${N(y + size * Math.sin(angRad + da))}`;
  return `<path d="M ${p(0)} L ${p(2.6)} L ${p(-2.6)} Z" fill="${C}"/>`;
}

const stroke = (d: string, sw: number, extra = "") =>
  `<path d="${d}" fill="none" stroke="${C}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const fillp = (d: string, extra = "") => `<path d="${d}" fill="${C}" ${extra}/>`;
// Tracé plein avec « trou » (évidement) : même couleur, découpe transparente
// via fill-rule evenodd — respecte la règle d'or (une seule couleur).
const eo = (d: string, extra = "") => `<path fill-rule="evenodd" d="${d}" fill="${C}" ${extra}/>`;
// Sous-tracé circulaire inverse pour créer un trou dans un eo(...).
const holeC = (cx: number, cy: number, r: number) => ` M ${N(cx - r)} ${N(cy)} a ${r} ${r} 0 1 0 ${N(2 * r)} 0 a ${r} ${r} 0 1 0 ${N(-2 * r)} 0 Z`;
// Nuance interne : même couleur en opacité réduite.
const op = (d: string, o: number, extra = "") => `<path d="${d}" fill="${C}" opacity="${o}" ${extra}/>`;
const opc = (cx: number, cy: number, r: number, o: number) => `<circle cx="${N(cx)}" cy="${N(cy)}" r="${N(r)}" fill="${C}" opacity="${o}"/>`;

/* ═══════════ Recherche ═══════════ */

/** Minuscules, sans accents ni ligatures : « fleche »→« flèche », « coeur »→« cœur ». */
export function normalizeSearch(s: string): string {
  return s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/* ═══════════ Fabrique ═══════════ */

const items: ElementDef[] = [];
const seen = new Set<string>();
function add(cat: string, id: string, label: string, keywords: string, w: number, h: number, body: string, defaultColor?: string, slots?: { label: string; def?: string }[]) {
  const full = `${cat}.${id}`;
  if (seen.has(full)) throw new Error(`id d'élément dupliqué : ${full}`);
  seen.add(full);
  items.push({ id: full, label, cat, w, h, body, keywords: normalizeSearch(`${label} ${keywords}`), defaultColor, slots });
}
// Surcharge ponctuelle de la couleur de départ d'un élément déjà créé.
function tint(id: string, color: string) {
  const def = items.find((e) => e.id === id);
  if (def) def.defaultColor = color;
}

/* ── 1. Cercles & cadres ── */
(() => {
  const K = "cercle rond cadre anneau ring";
  [2, 4, 6, 9, 13, 18, 24, 30].forEach((sw, i) =>
    add("circles", `ring${i}`, "Anneau", K, 200, 200, `<circle cx="100" cy="100" r="${96 - sw / 2}" fill="none" stroke="${C}" stroke-width="${sw}"/>`));
  ([["1 22", 7, "round"], ["1 14", 5, "round"], ["26 14", 6, "butt"], ["10 10", 5, "butt"], ["44 12", 8, "butt"], ["2 9", 3, "round"]] as const).forEach(([dash, sw, cap], i) =>
    add("circles", `dash${i}`, "Anneau pointillé", `${K} pointillé tirets dashed`, 200, 200, `<circle cx="100" cy="100" r="88" fill="none" stroke="${C}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-linecap="${cap}"/>`));
  [[90, 74], [92, 80], [88, 62], [94, 84]].forEach(([r1, r2], i) =>
    add("circles", `dbl${i}`, "Double anneau", K, 200, 200, `<circle cx="100" cy="100" r="${r1}" fill="none" stroke="${C}" stroke-width="4"/><circle cx="100" cy="100" r="${r2}" fill="none" stroke="${C}" stroke-width="4"/>`));
  add("circles", "tri0", "Triple anneau", K, 200, 200, [92, 76, 60].map((r) => `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${C}" stroke-width="4"/>`).join(""));
  add("circles", "conc0", "Anneaux dégradés", `${K} concentrique`, 200, 200, [92, 72, 52, 32].map((r, i) => `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${C}" stroke-width="5" opacity="${1 - i * 0.22}"/>`).join(""));
  [[96, 60], [96, 42], [80, 56]].forEach(([rx, ry], i) =>
    add("circles", `oval${i}`, "Anneau ovale", `${K} ovale ellipse`, 200, 200, `<ellipse cx="100" cy="100" rx="${rx}" ry="${ry}" fill="none" stroke="${C}" stroke-width="7"/>`));
  // Cercles pinceau (36 graines).
  for (let s = 0; s < 36; s++) {
    const r = rng(s * 13 + 7);
    const a0 = -140 + r() * 90, sweep = 285 + r() * 55;
    const w1 = 9 + r() * 8;
    const [x1, y1] = polar(100, 100, 84, a0);
    const [x2, y2] = polar(100, 100, 85, a0 + sweep * 0.95);
    const [x3, y3] = polar(100, 100, 77 + r() * 4, a0 + 20 + r() * 30);
    const [x4, y4] = polar(100, 100, 79, a0 + sweep * (0.6 + r() * 0.18));
    add("circles", `brush${s}`, "Cercle pinceau", `${K} pinceau brush main dessiné`, 200, 200,
      `<path d="M ${N(x1)} ${N(y1)} A 85 85 0 1 1 ${N(x2)} ${N(y2)}" fill="none" stroke="${C}" stroke-width="${N(w1)}" stroke-linecap="round"/>` +
      `<path d="M ${N(x3)} ${N(y3)} A 79 79 0 1 1 ${N(x4)} ${N(y4)}" fill="none" stroke="${C}" stroke-width="${N(w1 * 0.45)}" stroke-linecap="round" opacity="0.85"/>`);
  }
  // Cercles gribouillés (24 graines).
  for (let s = 0; s < 24; s++) {
    const r = rng(s * 29 + 3);
    const turns = 1.9 + r() * 1.2;
    let d = "";
    for (let i = 0; i <= 70; i++) {
      const t = i / 70;
      const [x, y] = polar(100, 101, 66 + t * 24 + (r() - 0.5) * 10, -90 + t * 360 * turns);
      d += (i === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
    }
    add("circles", `scrib${s}`, "Cercle gribouillé", `${K} gribouillage scribble`, 200, 200, stroke(d, 4 + (s % 3) * 2));
  }
  // Cadres rectangulaires.
  ([[0, 4], [0, 9], [12, 5], [12, 10], [28, 6], [28, 12]] as const).forEach(([rx, sw], i) =>
    add("circles", `frame${i}`, "Cadre", `${K} rectangle bordure frame`, 220, 160, `<rect x="${6 + sw / 2}" y="${6 + sw / 2}" width="${208 - sw}" height="${148 - sw}" rx="${rx}" fill="none" stroke="${C}" stroke-width="${sw}"/>`));
  ([["24 12", 5], ["8 8", 4], ["40 14", 7], ["2 10", 4]] as const).forEach(([dash, sw], i) =>
    add("circles", `framed${i}`, "Cadre tirets", `${K} pointillé`, 220, 160, `<rect x="8" y="8" width="204" height="144" rx="10" fill="none" stroke="${C}" stroke-width="${sw}" stroke-dasharray="${dash}"/>`));
  [7, 10].forEach((sw, i) =>
    add("circles", `corners${i}`, "Cadre coins", `${K} coins photo viseur`, 220, 160,
      ["M 8 48 V 20 Q 8 8 20 8 H 48", "M 172 8 H 200 Q 212 8 212 20 V 48", "M 212 112 V 140 Q 212 152 200 152 H 172", "M 48 152 H 20 Q 8 152 8 140 V 112"]
        .map((d) => stroke(d, sw)).join("")));
  add("circles", "framedbl0", "Cadre double", K, 220, 160, `<rect x="8" y="8" width="204" height="144" rx="8" fill="none" stroke="${C}" stroke-width="4"/><rect x="22" y="22" width="176" height="116" rx="4" fill="none" stroke="${C}" stroke-width="3"/>`);
  // Cadres pinceau rectangulaires (8 graines).
  for (let s = 0; s < 8; s++) {
    const r = rng(s * 41 + 11);
    const pts: [number, number][] = [];
    const per = [[14, 14], [206, 14], [206, 146], [14, 146]] as [number, number][];
    for (let k = 0; k < 4; k++) {
      const a = per[k], b = per[(k + 1) % 4];
      for (let t = 0; t < 5; t++) {
        const f = t / 5;
        pts.push([a[0] + (b[0] - a[0]) * f + (r() - 0.5) * 7, a[1] + (b[1] - a[1]) * f + (r() - 0.5) * 7]);
      }
    }
    add("circles", `framebr${s}`, "Cadre pinceau", `${K} pinceau main`, 220, 160, stroke(smoothClosed(pts), 6 + (s % 2) * 3));
  }
})();

/* ── 2. Traits & surlignage ── */
(() => {
  const K = "trait souligné ligne surlignage underline";
  [6, 9, 12, 16, 20, 26].forEach((sw, i) =>
    add("strokes", `thick${i}`, "Souligné épais", K, 300, 44, stroke(`M 12 22 H 288`, sw)));
  ([["18 14", 8], ["8 12", 7], ["30 18", 10], ["2 14", 6]] as const).forEach(([dash, sw], i) =>
    add("strokes", `tdash${i}`, "Souligné tirets", `${K} pointillé`, 300, 44, stroke(`M 12 22 H 288`, sw, `stroke-dasharray="${dash}"`)));
  // Traits pinceau effilés (28 graines).
  for (let s = 0; s < 28; s++) {
    const r = rng(s * 17 + 5);
    let top = `M 10 ${N(15 + r() * 4)} `, bot = "";
    for (let i = 1; i <= 10; i++) top += `L ${N(10 + i * 28)} ${N(12 + (r() - 0.5) * 9)} `;
    for (let i = 10; i >= 0; i--) bot += `L ${N(10 + i * 28)} ${N(27 + (r() - 0.5) * 9)} `;
    add("strokes", `brush${s}`, "Trait pinceau", `${K} pinceau brush`, 300, 40, fillp(`${top}${bot} Z`));
  }
  // Vagues (matrice amplitude × fréquence).
  [8, 14, 22].forEach((amp, ai) => [4, 6, 8, 11].forEach((freq, fi) => {
    let d = `M 10 ${22 + amp / 2} `;
    const step = 280 / freq;
    for (let i = 0; i < freq; i++) d += `q ${N(step / 2)} ${i % 2 ? amp : -amp} ${N(step)} 0 `;
    add("strokes", `wave${ai}_${fi}`, "Souligné vague", `${K} vague wave`, 300, 44 + amp, stroke(d, 7));
  }));
  // Zigzags.
  [10, 16, 24].forEach((amp, ai) => [6, 9, 13].forEach((seg, si) => {
    let d = `M 10 ${24 + amp / 2} `;
    const step = 280 / seg;
    for (let i = 1; i <= seg; i++) d += `L ${N(10 + i * step)} ${i % 2 ? 24 - amp / 2 : 24 + amp / 2} `;
    add("strokes", `zig${ai}_${si}`, "Zigzag", `${K} zigzag`, 300, 48 + amp, stroke(d, 6));
  }));
  [[7, 12], [5, 8], [9, 16], [4, 20]].forEach(([sw, gap], i) =>
    add("strokes", `dbl${i}`, "Double souligné", K, 300, 30 + gap + sw, stroke(`M 12 ${10 + sw / 2} H 288`, sw) + stroke(`M 26 ${10 + sw / 2 + gap + sw} H 274`, Math.max(3, sw - 2))));
  // Gribouillis de rature (12 graines).
  for (let s = 0; s < 12; s++) {
    const r = rng(s * 23 + 9);
    let d = `M 14 ${N(18 + r() * 10)} `;
    const loops = 4 + Math.floor(r() * 3);
    for (let i = 0; i < loops; i++) d += `Q ${N(30 + (i + 0.5) * (270 / loops) + r() * 16)} ${N(i % 2 ? 42 : 2)} ${N(24 + (i + 1) * (270 / loops))} ${N(20 + (r() - 0.5) * 12)} `;
    add("strokes", `scrib${s}`, "Gribouillis", `${K} rature scribble`, 300, 46, stroke(d, 5 + (s % 3)));
  }
  // Surligneur (opacité de la couleur du calque).
  [[24, -1], [34, -1.6], [46, 0], [28, 1.2], [40, -2.4], [20, 0]].forEach(([hh, rot], i) =>
    add("strokes", `hl${i}`, "Surligneur", `${K} surligneur marker highlight fluo`, 300, hh + 18,
      `<rect x="8" y="9" width="284" height="${hh}" rx="${Math.min(10, hh / 3)}" fill="${C}" opacity="0.55" transform="rotate(${rot} 150 ${9 + hh / 2})"/>`));
  // Traits pointillés ronds.
  [5, 8, 12].forEach((sw, i) =>
    add("strokes", `dots${i}`, "Points alignés", `${K} points dots`, 300, 40, stroke(`M 14 20 H 286`, sw, `stroke-dasharray="0.1 ${sw * 2.4}"`)));
})();

/* ── 3. Flèches ── */
(() => {
  const K = "flèche arrow direction pointeur";
  [[7, 22], [10, 26], [14, 32], [7, 34], [10, 40], [4, 18]].forEach(([sw, head], i) =>
    add("arrows", `str${i}`, "Flèche", K, 240, 80, stroke(`M 14 40 H ${212 - head}`, sw) + arrowHead(224 - head / 3, 40, 0, head)));
  [["18 16", 8], ["8 12", 6], ["30 16", 9], ["2 13", 6]].forEach(([dash, sw], i) =>
    add("arrows", `dash${i}`, "Flèche tirets", `${K} pointillé`, 240, 80, stroke(`M 14 40 H 192`, Number(sw), `stroke-dasharray="${dash}"`) + arrowHead(216, 40, 0, 26)));
  // Courbes (courbure × sens, 28).
  for (let ci = 0; ci < 7; ci++) {
    for (const dir of [1, -1]) {
      const lift = 18 + ci * 14;
      const y0 = dir === 1 ? 118 : 22, ym = dir === 1 ? 118 - lift * 1.6 : 22 + lift * 1.6;
      const d = `M 16 ${N(y0)} Q 82 ${N(ym)} 196 ${N(y0 - dir * 8)}`;
      const ang = Math.atan2((y0 - dir * 8) - ym, 196 - 82);
      add("arrows", `curve${ci}_${dir === 1 ? "u" : "d"}`, "Flèche courbe", `${K} courbe arc`, 240, 140,
        stroke(d, 8) + arrowHead(206, y0 - dir * 9, ang, 24));
      // variante tirets
      add("arrows", `curved${ci}_${dir === 1 ? "u" : "d"}`, "Courbe tirets", `${K} courbe pointillé`, 240, 140,
        stroke(d, 7, `stroke-dasharray="16 13"`) + arrowHead(206, y0 - dir * 9, ang, 22));
    }
  }
  // Boucles (6).
  for (let s = 0; s < 6; s++) {
    const r = rng(s * 31 + 19);
    const k = 0.85 + r() * 0.3;
    add("arrows", `loop${s}`, "Flèche boucle", `${K} boucle loop retour`, 200, 170,
      stroke(`M 30 150 C ${N(-14 * k)} ${N(60 * k)} ${N(88 * k)} 2 ${N(132 * k)} ${N(32 * k)} C ${N(176 * k)} ${N(64 * k)} 158 120 106 124`, 8 + (s % 2)) +
      arrowHead(94, 126, 3.0, 22));
  }
  // Zigzag (6).
  [14, 22, 32].forEach((amp, ai) => [3, 4].forEach((seg, si) => {
    let d = `M 14 ${55 - amp / 2} `;
    const step = 168 / seg;
    for (let i = 1; i <= seg; i++) d += `L ${N(14 + i * step)} ${i % 2 ? 55 + amp : 55 - amp} `;
    const last = seg % 2 ? 55 + amp : 55 - amp, prev = seg % 2 ? 55 - amp : 55 + amp;
    const ang = Math.atan2(last - prev, step);
    add("arrows", `zig${ai}_${si}`, "Flèche zigzag", `${K} zigzag éclair`, 240, 110, stroke(d, 8) + arrowHead(14 + seg * step + 16, last + Math.sin(ang) * 8, ang, 22));
  }));
  [[10, 24], [7, 18], [14, 30], [10, 34]].forEach(([sw, head], i) =>
    add("arrows", `both${i}`, "Double sens", `${K} double aller retour`, 240, 70,
      stroke(`M ${20 + head} 35 H ${220 - head}`, sw) + arrowHead(228 - head / 2, 35, 0, head) + arrowHead(12 + head / 2, 35, Math.PI, head)));
  // Coudes (8).
  ([["M 20 96 V 34 H 176", 0], ["M 20 24 V 86 H 176", 0], ["M 220 96 V 34 H 64", Math.PI], ["M 220 24 V 86 H 64", Math.PI]] as const).forEach(([d, ang], i) => {
    add("arrows", `elbow${i}`, "Flèche coude", `${K} angle coude`, 240, 120, stroke(d, 9) + arrowHead(ang === 0 ? 196 : 44, i % 2 === 0 ? 34 : (i === 1 ? 86 : 86), ang, 24));
  });
  add("arrows", "elbow4", "Coude descendant", `${K} angle`, 240, 120, stroke("M 20 24 H 176 V 86", 9) + arrowHead(176, 104, Math.PI / 2, 24));
  add("arrows", "elbow5", "Coude montant", `${K} angle`, 240, 120, stroke("M 20 96 H 176 V 40", 9) + arrowHead(176, 22, -Math.PI / 2, 24));
  // Flèches pleines (corps polygone, 8 profils).
  ([[0.28, 0.62], [0.4, 0.6], [0.2, 0.7], [0.34, 0.52], [0.5, 0.62], [0.24, 0.5], [0.44, 0.72], [0.3, 0.78]] as const).forEach(([body, split], i) =>
    add("arrows", `full${i}`, "Flèche pleine", `${K} pleine grosse`, 220, 120,
      fillp(`M 8 ${N(60 - body * 60)} H ${N(split * 220)} V 14 L 212 60 L ${N(split * 220)} 106 V ${N(60 + body * 60)} H 8 Z`)));
  // Retour / refresh circulaire.
  add("arrows", "cycle0", "Flèches cycle", `${K} cycle refresh boucle`, 200, 200,
    stroke("M 158 62 A 70 70 0 1 0 168 118", 11) + arrowHead(172, 100, -0.5, 26));
})();

/* ── 4. Formes organiques ── */
(() => {
  const K = "blob forme organique fluide tache";
  const blob = (seed: number, irr = 30): string => {
    const r = rng(seed);
    const pts: [number, number][] = [];
    const n = 7 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) pts.push(polar(100, 100, 60 + r() * irr, (i * 360) / n + r() * 16));
    return smoothClosed(pts);
  };
  for (let s = 0; s < 60; s++) add("blobs", `fill${s}`, "Blob", K, 200, 200, fillp(blob(s * 7 + 1, 26 + (s % 4) * 6)));
  for (let s = 0; s < 20; s++) add("blobs", `line${s}`, "Blob contour", `${K} contour outline`, 200, 200, stroke(blob(s * 13 + 4), 5 + (s % 3)));
  for (let s = 0; s < 8; s++) add("blobs", `soft${s}`, "Blob translucide", `${K} doux`, 200, 200, `<path d="${blob(s * 19 + 2)}" fill="${C}" opacity="0.45"/>` + fillp(blob(s * 19 + 60, 20), `transform="translate(100 100) scale(0.62) translate(-100 -100)"`));
  // Éclaboussures.
  for (let s = 0; s < 16; s++) {
    const r = rng(s * 37 + 5);
    let drops = "";
    for (let i = 0; i < 5 + Math.floor(r() * 4); i++) {
      const [x, y] = polar(100, 100, 74 + r() * 20, r() * 360);
      drops += `<circle cx="${N(x)}" cy="${N(y)}" r="${N(2.5 + r() * 7)}" fill="${C}"/>`;
    }
    add("blobs", `splash${s}`, "Éclaboussure", `${K} splash peinture goutte`, 200, 200,
      fillp(blob(s * 11 + 3), `transform="translate(100 100) scale(0.7) translate(-100 -100)"`) + drops);
  }
  // Demi-blobs (pour bords de page).
  for (let s = 0; s < 8; s++) {
    const r = rng(s * 43 + 21);
    let d = "M 0 200 L 0 90 ";
    for (let i = 1; i <= 5; i++) d += `Q ${N(i * 40 - 20)} ${N(50 + r() * 60)} ${N(i * 40)} ${N(80 + r() * 40)} `;
    add("blobs", `edge${s}`, "Vague de bord", `${K} bord bordure page vague`, 200, 200, fillp(`${d} L 200 200 Z`));
  }
  // Gouttes / galets.
  [[1, 1], [0.8, 1.15], [1.2, 0.85], [0.9, 1.3]].forEach(([sx, sy], i) =>
    add("blobs", `pebble${i}`, "Galet", `${K} galet pierre`, 200, 200,
      fillp(blob(i * 53 + 8, 14), `transform="translate(100 100) scale(${sx} ${sy}) translate(-100 -100)"`)));
})();

/* ── 5. Étoiles & éclats ── */
(() => {
  const K = "étoile éclat brillant sparkle star";
  const sparkle = (cx: number, cy: number, r0: number, slim: number): string =>
    `M ${N(cx)} ${N(cy - r0)} C ${N(cx + r0 * slim)} ${N(cy - r0 * slim)} ${N(cx + r0 * slim)} ${N(cy - r0 * slim)} ${N(cx + r0)} ${N(cy)} C ${N(cx + r0 * slim)} ${N(cy + r0 * slim)} ${N(cx + r0 * slim)} ${N(cy + r0 * slim)} ${N(cx)} ${N(cy + r0)} C ${N(cx - r0 * slim)} ${N(cy + r0 * slim)} ${N(cx - r0 * slim)} ${N(cy + r0 * slim)} ${N(cx - r0)} ${N(cy)} C ${N(cx - r0 * slim)} ${N(cy - r0 * slim)} ${N(cx - r0 * slim)} ${N(cy - r0 * slim)} ${N(cx)} ${N(cy - r0)} Z`;
  [0.1, 0.14, 0.2, 0.28].forEach((slim, i) =>
    add("stars", `sp${i}`, "Éclat", K, 200, 200, fillp(sparkle(100, 100, 90, slim))));
  // Trios (10 graines).
  for (let s = 0; s < 10; s++) {
    const r = rng(s * 47 + 13);
    add("stars", `trio${s}`, "Trio d'éclats", `${K} trio groupe`, 200, 200,
      fillp(sparkle(70 + r() * 20, 100 + r() * 16, 56 + r() * 10, 0.15)) +
      fillp(sparkle(146 + r() * 8, 52 + r() * 14, 30 + r() * 8, 0.17)) +
      fillp(sparkle(152 + r() * 8, 140 + r() * 10, 18 + r() * 8, 0.2)));
  }
  [[7, 4], [10, 6], [5, 3]].forEach(([sw, sw2], i) =>
    add("stars", `twk${i}`, "Scintillement", `${K} twinkle croix`, 200, 200,
      stroke("M 100 10 V 190 M 10 100 H 190", sw) + stroke("M 46 46 L 154 154 M 154 46 L 46 154", sw2, `opacity="0.7"`)));
  // Polygones pleins & contours.
  for (let sides = 3; sides <= 12; sides++) {
    add("stars", `poly${sides}`, `Polygone ${sides}`, `${K} polygone`, 200, 200, fillp(polyPts(100, 100, sides, 92)));
    add("stars", `polyo${sides}`, `Polygone ${sides} contour`, `${K} polygone contour`, 200, 200, stroke(polyPts(100, 100, sides, 88), 6));
  }
  // Étoiles pleines (matrice points × creux) + contours.
  for (const pts of [4, 5, 6, 7, 8, 9, 10, 12, 14]) {
    [0.25, 0.4, 0.55, 0.7].forEach((inner, i) =>
      add("stars", `star${pts}_${i}`, `Étoile ${pts}`, `${K} branches`, 200, 200, fillp(starPts(100, 100, pts, 94, 94 * inner))));
    add("stars", `staro${pts}`, `Étoile ${pts} contour`, `${K} contour`, 200, 200, stroke(starPts(100, 100, pts, 90, 90 * 0.45), 6));
  }
  // Rayons.
  [10, 14, 18, 24, 30, 36].forEach((count, i) => {
    let rays = "";
    for (let k = 0; k < count; k++) {
      const [x1, y1] = polar(100, 100, 56, (k * 360) / count);
      const [x2, y2] = polar(100, 100, k % 2 ? 80 : 94, (k * 360) / count);
      rays += stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, Math.max(4, 10 - count * 0.15));
    }
    add("stars", `rays${i}`, "Rayons", `${K} soleil burst rayons`, 200, 200, rays);
  });
  [7, 9, 11].forEach((count, i) => {
    let half = "";
    for (let k = 0; k <= count; k++) {
      const ang = -180 + (k * 180) / count;
      const [x1, y1] = polar(100, 96, 42, ang);
      const [x2, y2] = polar(100, 96, k % 2 ? 68 : 88, ang);
      half += stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 9);
    }
    add("stars", `hrays${i}`, "Demi-rayons", `${K} idée surprise`, 200, 104, half);
  });
  // Étoiles filantes.
  for (let s = 0; s < 4; s++) {
    const tails = [0, 1, 2].map((t) => stroke(`M ${26} ${70 + t * 22 + s * 2} H ${96 - t * 18}`, 7 - t, `opacity="${1 - t * 0.28}"`)).join("");
    add("stars", `shoot${s}`, "Étoile filante", `${K} filante comète`, 220, 160, tails + fillp(starPts(158, 80, 5, 46, 20, -90 + s * 18)));
  }
})();

/* ── 6. Badges & rubans ── */
(() => {
  const K = "badge ruban bannière promo prix étiquette sceau";
  // Bursts (points × creux).
  for (const pts of [8, 10, 12, 14, 16, 20, 24, 28, 32]) {
    [0.72, 0.82].forEach((inner, i) =>
      add("badges", `burst${pts}_${i}`, "Badge promo", `${K} soldes burst`, 200, 200, fillp(starPts(100, 100, pts, 96, 96 * inner))));
  }
  for (const pts of [16, 20, 24, 28, 32, 40]) {
    // Anneau intérieur = découpe transparente (evenodd) : détail visible sans
    // seconde couleur.
    add("badges", `seal${pts}`, "Sceau", `${K} tampon seal`, 200, 200,
      `<path fill-rule="evenodd" d="${starPts(100, 100, pts, 96, 88)} M 100 30 a 70 70 0 1 0 0.1 0 Z M 100 42 a 58 58 0 1 1 -0.1 0 Z" fill="${C}"/>`);
    add("badges", `sealo${pts}`, "Sceau contour", `${K} tampon contour`, 200, 200,
      stroke(starPts(100, 100, pts, 92, 85), 5) + `<circle cx="100" cy="100" r="62" fill="none" stroke="${C}" stroke-width="4"/>`);
  }
  // Rubans à queues (variantes de plis via opacité).
  [[18, 72], [26, 64], [12, 78]].forEach(([top, bot], i) => {
    add("badges", `ribbon${i}`, "Ruban", `${K} bannière titre`, 260, 90,
      `<path d="M 30 ${26 + (i === 1 ? 2 : 0)} L 2 ${26} L 16 45 L 2 64 L 30 64 Z" fill="${C}" opacity="0.6"/>` +
      `<path d="M 230 26 L 258 26 L 244 45 L 258 64 L 230 64 Z" fill="${C}" opacity="0.6"/>` +
      fillp(`M 30 ${top} H 230 V ${bot} H 30 Z`));
  });
  add("badges", "ribbon3", "Ruban plié", `${K} bannière`, 260, 100,
    `<path d="M 36 24 L 10 24 L 22 47 L 10 70 L 36 70 Z" fill="${C}" opacity="0.55"/>` +
    `<path d="M 224 30 L 250 30 L 238 53 L 250 76 L 224 76 Z" fill="${C}" opacity="0.55"/>` +
    `<path d="M 36 70 L 48 78 L 48 70 Z" fill="${C}" opacity="0.35"/><path d="M 224 24 L 212 16 L 212 24 Z" fill="${C}" opacity="0.35"/>` +
    fillp("M 48 16 H 212 V 62 H 48 Z") + fillp("M 36 32 H 48 V 78 H 36 Z", `opacity="0.85"`) + fillp("M 212 16 H 224 V 62 H 224 Z"));
  // Bannières drapeaux ondulées.
  for (let s = 0; s < 6; s++) {
    const r = rng(s * 61 + 17);
    const a = 8 + r() * 10;
    add("badges", `flag${s}`, "Bannière", `${K} drapeau flag`, 260, 80,
      fillp(`M 14 ${N(16 + a / 2)} Q 65 ${N(6 - a / 2)} 130 ${N(12 + a / 3)} Q 195 ${N(20 + a / 2)} 246 ${N(10)} L 246 ${N(60 + a / 4)} Q 195 ${N(70 + a / 2)} 130 ${N(62 + a / 4)} Q 65 ${N(54 - a / 4)} 14 ${N(66)} Z`));
  }
  [[0.78, 0.5], [0.68, 0.5], [0.85, 0.42]].forEach(([notch, mid], i) =>
    add("badges", `pennant${i}`, "Fanion", `${K} fanion pennant`, 200, 120, fillp(`M 10 12 H 190 L ${N(notch * 190)} ${N(120 * mid)} L 190 108 H 10 Z`)));
  add("badges", "pennant3", "Fanion pointu", `${K} triangle`, 220, 110, fillp("M 10 12 H 210 L 110 98 Z"));
  // Étiquettes (contour du trou par opacité inverse impossible → trou en fill du fond via evenodd).
  [[-8, 24], [0, 16], [6, 30]].forEach(([rot, rx], i) =>
    add("badges", `tag${i}`, "Étiquette", `${K} tag prix`, 220, 130,
      `<g transform="rotate(${rot} 110 65)"><path fill-rule="evenodd" d="M 96 14 H 190 Q 206 14 206 30 V 100 Q 206 116 190 116 H 96 L 30 65 Z M 72 65 a 10 10 0 1 0 0.1 0 Z" fill="${C}"/></g>`));
  // Pastilles texte (monochromes : cercle + texte même couleur).
  const stamps: [string, string][] = [
    ["-10%", "promo"], ["-20%", "promo"], ["-30%", "promo"], ["-40%", "promo"], ["-50%", "promo"],
    ["-60%", "promo"], ["-70%", "promo"], ["NEW", "nouveau"], ["TOP", "meilleur"], ["HOT", "chaud"],
    ["SALE", "soldes"], ["PROMO", "promo"], ["VIP", "premium"], ["24H", "express"], ["BIO", "nature"], ["FREE", "gratuit"],
  ];
  stamps.forEach(([txt, kw], i) => {
    const fs = txt.length >= 5 ? 40 : txt.length === 4 ? 48 : 56;
    add("badges", `stamp${i}`, `Pastille ${txt}`, `${K} ${kw} ${txt}`, 200, 200,
      `<circle cx="100" cy="100" r="90" fill="none" stroke="${C}" stroke-width="8"/>` +
      `<circle cx="100" cy="100" r="76" fill="none" stroke="${C}" stroke-width="2" stroke-dasharray="4 8" opacity="0.7"/>` +
      `<text x="100" y="${100 + fs * 0.35}" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="800" fill="${C}" text-anchor="middle">${txt}</text>`);
  });
  // Écussons.
  add("badges", "shield0", "Écusson", `${K} écusson blason`, 200, 220,
    fillp("M 100 6 L 186 34 C 186 108 162 176 100 214 C 38 176 14 108 14 34 Z"));
  add("badges", "shield1", "Écusson contour", `${K} écusson blason`, 200, 220,
    stroke("M 100 10 L 182 36 C 182 106 158 172 100 208 C 42 172 18 106 18 36 Z", 7));
})();

/* ── 7. Bulles ── */
(() => {
  const K = "bulle message dialogue parole speech";
  const tails: Record<string, string> = {
    bl: "M 62 H1 L 44 H2 L 102 H3 Z",
    br: "M 158 H1 L 176 H2 L 118 H3 Z",
    cl: "M 90 H1 L 74 H2 L 122 H3 Z",
    cr: "M 130 H1 L 146 H2 L 98 H3 Z",
  };
  [8, 22, 40].forEach((rx, ri) => {
    (Object.keys(tails) as (keyof typeof tails)[]).forEach((pos) => {
      const tail = tails[pos].replace("H1", "118").replace("H2", "158").replace("H3", "122");
      add("bubbles", `rect${ri}_${pos}`, "Bulle", K, 220, 170,
        fillp(`M 18 10 H 202 Q 210 10 210 ${10 + rx} V ${112 - rx} Q 210 120 202 120 H 18 Q 10 120 10 ${112 - rx} V ${10 + rx} Q 10 10 18 10 Z`.replace(/Q 210 10 210/g, rx === 8 ? "Q 210 10 210" : "Q 210 10 210")) + fillp(tail));
    });
  });
  ["bl", "br"].forEach((pos) => {
    const tail = tails[pos].replace("H1", "128").replace("H2", "166").replace("H3", "130");
    add("bubbles", `ell_${pos}`, "Bulle ronde", K, 220, 180, `<ellipse cx="110" cy="72" rx="100" ry="62" fill="${C}"/>` + fillp(tail));
    add("bubbles", `ello_${pos}`, "Bulle ronde contour", `${K} contour`, 220, 180,
      `<ellipse cx="110" cy="72" rx="96" ry="58" fill="none" stroke="${C}" stroke-width="6"/>` + stroke(tails[pos].replace("H1", "124").replace("H2", "162").replace("H3", "126").replace("Z", ""), 6));
  });
  [["l", 56, 34], ["r", 164, 186]].forEach(([side, bx, sx]) => {
    add("bubbles", `think_${side}`, "Pensée", `${K} pensée nuage think`, 220, 190,
      `<ellipse cx="110" cy="66" rx="94" ry="54" fill="${C}"/><circle cx="${bx}" cy="138" r="14" fill="${C}"/><circle cx="${sx}" cy="164" r="8" fill="${C}"/>`);
  });
  [[10, 0.68], [12, 0.72], [14, 0.62], [11, 0.8]].forEach(([pts, inner], i) => {
    let d = "";
    for (let k = 0; k < pts * 2; k++) {
      const [x, y] = polar(110, 84, k % 2 === 0 ? 100 : 100 * inner, -90 + (k * 180) / pts);
      d += (k === 0 ? "M" : "L") + ` ${N(x)} ${N(y * 0.8 + 18)} `;
    }
    add("bubbles", `shout${i}`, "Bulle cri", `${K} cri boom bd comic`, 220, 175, fillp(d + "Z"));
  });
  add("bubbles", "square0", "Bulle carrée", K, 200, 190, fillp("M 12 12 H 188 V 132 H 96 L 60 168 L 66 132 H 12 Z"));
  add("bubbles", "square1", "Bulle carrée contour", `${K} contour`, 200, 190, stroke("M 14 14 H 186 V 130 H 96 L 62 164 L 68 130 H 14 Z", 6));
  add("bubbles", "duo0", "Dialogue", `${K} conversation`, 220, 180,
    fillp("M 10 10 H 130 V 84 H 58 L 34 108 L 40 84 H 10 Z") + `<path d="M 100 66 H 210 V 138 H 186 L 194 162 L 166 138 H 100 Z" fill="${C}" opacity="0.55"/>`);
})();

/* ── 8. Nature ── */
(() => {
  const K = "nature plante feuille fleur";
  // Feuilles paramétriques (largeur × courbure de nervure).
  [0.5, 0.7, 0.9].forEach((fat, fi) => [0, 18, -18].forEach((bend, bi) => {
    const half = 90 * fat;
    add("nature", `leaf${fi}_${bi}`, "Feuille", `${K} leaf`, 200, 200,
      fillp(`M 100 190 C ${N(100 - half)} 140 ${N(100 - half - bend)} 60 100 10 C ${N(100 + half - bend)} 60 ${N(100 + half)} 140 100 190 Z`) +
      stroke(`M 100 178 Q ${N(100 - bend / 2)} 100 100 32`, 4, `opacity="0.5"`));
  }));
  add("nature", "leaf_r0", "Feuille ronde", K, 200, 200, fillp("M 100 190 C 20 160 10 70 100 10 C 190 70 180 160 100 190 Z"));
  add("nature", "leaf_o0", "Feuille contour", `${K} contour`, 200, 200, stroke("M 100 186 C 30 150 24 70 100 14 C 176 70 170 150 100 186 Z", 6) + stroke("M 100 172 V 34", 4, `opacity="0.6"`));
  // Branches (20 graines).
  for (let s = 0; s < 20; s++) {
    const r = rng(s * 53 + 7);
    const nb = 4 + Math.floor(r() * 3);
    let g = stroke(`M 20 184 Q ${N(90 + r() * 30)} ${N(110 + r() * 20)} 182 ${N(18 + r() * 14)}`, 5);
    for (let i = 1; i <= nb; i++) {
      const t = i / (nb + 1);
      const x = 20 + 160 * t, y = 184 - 164 * t + Math.sin(t * 3) * 12;
      const side = i % 2 ? 1 : -1;
      g += `<ellipse cx="${N(x + side * 15)}" cy="${N(y - 8)}" rx="${N(16 + r() * 8)}" ry="${N(7 + r() * 3)}" fill="${C}" transform="rotate(${N(-40 + side * 35 + r() * 14)} ${N(x + side * 15)} ${N(y - 8)})"/>`;
    }
    add("nature", `branch${s}`, "Branche", `${K} branche rameau eucalyptus`, 200, 200, g);
  }
  // Fleurs (pétales × forme).
  [5, 6, 8, 10, 12].forEach((petals) => {
    [[24, 44, "r"], [16, 48, "s"]].forEach(([rx, ry, tag]) => {
      let g = "";
      for (let i = 0; i < petals; i++) g += `<ellipse cx="100" cy="56" rx="${rx}" ry="${ry}" fill="${C}" transform="rotate(${(i * 360) / petals} 100 100)"/>`;
      g += `<circle cx="100" cy="100" r="20" fill="${C}" opacity="0.45"/>`;
      add("nature", `flower${petals}${tag}`, "Fleur", `${K} flower marguerite`, 200, 200, g);
    });
  });
  add("nature", "flowero0", "Fleur contour", `${K} contour`, 200, 200,
    [0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="100" cy="58" rx="22" ry="42" fill="none" stroke="${C}" stroke-width="5" transform="rotate(${a} 100 100)"/>`).join("") + `<circle cx="100" cy="100" r="16" fill="${C}"/>`);
  // Tulipe / brin.
  add("nature", "sprout0", "Brin", `${K} pousse tige`, 200, 200,
    stroke("M 100 190 V 84", 6) + fillp("M 100 92 C 60 80 48 40 58 18 C 92 28 104 60 100 92 Z") + fillp("M 100 108 C 136 98 150 66 144 42 C 112 50 98 78 100 108 Z", `opacity="0.7"`));
  // Soleils.
  [[12, 8], [16, 6], [8, 12], [20, 5]].forEach(([count, sw], i) => {
    let g = `<circle cx="100" cy="100" r="44" fill="${C}"/>`;
    for (let k = 0; k < count; k++) {
      const [x1, y1] = polar(100, 100, 60, (k * 360) / count);
      const [x2, y2] = polar(100, 100, 88, (k * 360) / count);
      g += stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, sw);
    }
    add("nature", `sun${i}`, "Soleil", `${K} soleil été`, 200, 200, g);
  });
  add("nature", "suno0", "Soleil contour", `${K} soleil`, 200, 200,
    `<circle cx="100" cy="100" r="40" fill="none" stroke="${C}" stroke-width="7"/>` +
    Array.from({ length: 8 }, (_, k) => { const [x1, y1] = polar(100, 100, 58, k * 45); const [x2, y2] = polar(100, 100, 84, k * 45); return stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 7); }).join(""));
  // Lunes (géométrie sûre : deux cercles de même rayon).
  [[122.5, 85, 27.5], [112, 88, 16], [132, 80, 38], [126, 90, 30]].forEach(([mx, r0, off], i) => {
    const y = Math.sqrt(r0 * r0 - (off / 2) * (off / 2));
    add("nature", `moon${i}`, "Lune", `${K} lune nuit croissant`, 200, 200,
      fillp(`M ${N(mx)} ${N(100 - y)} A ${r0} ${r0} 0 1 0 ${N(mx)} ${N(100 + y)} A ${r0} ${r0} 0 0 1 ${N(mx)} ${N(100 - y)} Z`));
  });
  // Nuages (12 graines).
  for (let s = 0; s < 12; s++) {
    const r = rng(s * 67 + 9);
    const y0 = 112 + r() * 8;
    let d = `M ${N(48 + r() * 8)} ${N(y0)} `;
    d += `A ${N(26 + r() * 6)} ${N(24 + r() * 5)} 0 0 1 ${N(56 + r() * 10)} ${N(58 + r() * 8)} `;
    d += `A ${N(30 + r() * 10)} ${N(28 + r() * 6)} 0 0 1 ${N(122 + r() * 8)} ${N(46 + r() * 8)} `;
    d += `A ${N(26 + r() * 8)} ${N(24 + r() * 6)} 0 0 1 ${N(172 + r() * 8)} ${N(66 + r() * 8)} `;
    d += `A ${N(20 + r() * 6)} ${N(19 + r() * 5)} 0 0 1 ${N(174 + r() * 6)} ${N(y0)} Z`;
    add("nature", `cloud${s}`, "Nuage", `${K} nuage cloud ciel`, 220, 140, fillp(d));
  }
  // Vagues d'eau.
  [2, 3].forEach((rows, ri) => [10, 16].forEach((amp, ai) => {
    let g = "";
    for (let row = 0; row < rows; row++) {
      let d = `M 8 ${N(40 + row * (amp + 18))} `;
      for (let k = 0; k < 5; k++) d += `q 22 ${k % 2 ? amp : -amp} 44 0 `;
      g += stroke(d, 8, `opacity="${1 - row * 0.25}"`);
    }
    add("nature", `wave${ri}_${ai}`, "Vagues", `${K} mer vague eau`, 240, 60 + rows * (amp + 18), g);
  }));
  // Montagnes (second plan translucide VISIBLE : décalé, hors du premier plan).
  [[0.35, 0.62], [0.3, 0.75], [0.45, 0.55], [0.25, 0.5]].forEach(([p1, p2], i) =>
    add("nature", `mount${i}`, "Montagnes", `${K} montagne sommet`, 240, 140,
      `<path d="M 40 130 L ${N(240 * p2 - 24)} 20 L 236 130 Z" fill="${C}" opacity="0.45"/>` +
      fillp(`M 4 130 L ${N(240 * p1)} 34 L ${N(240 * (p1 + 0.2))} 88 L ${N(240 * (p1 + 0.34))} 58 L ${N(240 * (p1 + 0.6))} 130 Z`)));
  // Sapins.
  [1, 2, 3].forEach((n, i) => {
    let g = "";
    for (let t = 0; t < n; t++) {
      const cx = n === 1 ? 100 : 60 + t * 80 / (n - 1) * 1.0 + (t === 1 ? 40 : 0);
      const scale = t === 1 ? 1 : 0.72;
      g += fillp(`M ${N(cx)} ${N(190 - 160 * scale)} L ${N(cx + 46 * scale)} ${N(96)} L ${N(cx + 22 * scale)} ${N(96)} L ${N(cx + 56 * scale)} ${N(160)} L ${N(cx - 56 * scale)} ${N(160)} L ${N(cx - 22 * scale)} ${N(96)} L ${N(cx - 46 * scale)} ${N(96)} Z`, t !== 1 && n > 1 ? `opacity="0.6"` : "");
      g += fillp(`M ${N(cx - 7 * scale)} 160 H ${N(cx + 7 * scale)} V ${N(160 + 24 * scale)} H ${N(cx - 7 * scale)} Z`, `opacity="0.8"`);
    }
    add("nature", `pine${i}`, "Sapin", `${K} sapin arbre forêt`, 200, 200, g);
  });
  // Flocons.
  [6, 8].forEach((arms, ai) => [0, 1, 2].forEach((style, si) => {
    let g = "";
    for (let k = 0; k < arms; k++) {
      const ang = (k * 360) / arms;
      const [x2, y2] = polar(100, 100, 88, ang);
      g += stroke(`M 100 100 L ${N(x2)} ${N(y2)}`, 6);
      if (style > 0) {
        const [bx, by] = polar(100, 100, 56, ang);
        const [t1x, t1y] = polar(bx, by, 22, ang - 40);
        const [t2x, t2y] = polar(bx, by, 22, ang + 40);
        g += stroke(`M ${N(t1x)} ${N(t1y)} L ${N(bx)} ${N(by)} L ${N(t2x)} ${N(t2y)}`, 5);
      }
      if (style > 1) {
        const [bx, by] = polar(100, 100, 78, ang);
        const [t1x, t1y] = polar(bx, by, 14, ang - 45);
        const [t2x, t2y] = polar(bx, by, 14, ang + 45);
        g += stroke(`M ${N(t1x)} ${N(t1y)} L ${N(bx)} ${N(by)} L ${N(t2x)} ${N(t2y)}`, 4);
      }
    }
    add("nature", `flake${ai}_${si}`, "Flocon", `${K} flocon neige hiver snow`, 200, 200, g);
  }));
  // Gouttes de pluie.
  add("nature", "rain0", "Pluie", `${K} pluie goutte`, 200, 160,
    [0, 1, 2, 3, 4].map((i) => stroke(`M ${30 + i * 36} ${20 + (i % 2) * 26} L ${18 + i * 36} ${64 + (i % 2) * 26}`, 8, `opacity="${0.55 + (i % 3) * 0.2}"`)).join(""));
})();

/* ── 9. Fête ── */
(() => {
  const K = "fête célébration party anniversaire";
  // Ballons.
  [[36, 46, 0], [40, 40, 1], [30, 44, 2], [34, 50, 3]].forEach(([rx, ry, i]) =>
    add("party", `balloon${i}`, "Ballon", `${K} ballon`, 140, 220,
      `<ellipse cx="70" cy="${20 + ry}" rx="${rx}" ry="${ry}" fill="${C}"/>` +
      fillp(`M 70 ${18 + ry * 2} L ${62} ${34 + ry * 2} L ${78} ${34 + ry * 2} Z`) +
      stroke(`M 70 ${34 + ry * 2} q -14 30 6 52 q 16 20 -4 44`, 4)));
  add("party", "balloons2", "Duo de ballons", K, 220, 230,
    `<ellipse cx="80" cy="62" rx="40" ry="48" fill="${C}"/><path d="M 80 108 L 72 122 L 88 122 Z" fill="${C}"/>` +
    stroke("M 80 122 q -10 44 12 88", 4) +
    `<g opacity="0.6"><ellipse cx="152" cy="84" rx="34" ry="42" fill="${C}"/><path d="M 152 124 L 145 137 L 159 137 Z" fill="${C}"/>` + stroke("M 152 137 q 8 40 -10 74", 4) + "</g>");
  // Confettis monochromes (20 graines).
  for (let s = 0; s < 20; s++) {
    const r = rng(s * 71 + 3);
    let g = "";
    for (let i = 0; i < 15 + Math.floor(r() * 8); i++) {
      const x = 10 + r() * 180, y = 10 + r() * 180, op = 0.45 + r() * 0.55;
      const k = r();
      if (k < 0.3) g += `<circle cx="${N(x)}" cy="${N(y)}" r="${N(3.5 + r() * 4.5)}" fill="${C}" opacity="${N(op)}"/>`;
      else if (k < 0.62) g += `<rect x="${N(x)}" y="${N(y)}" width="${N(9 + r() * 6)}" height="${N(6 + r() * 4)}" rx="2" fill="${C}" opacity="${N(op)}" transform="rotate(${N(r() * 360)} ${N(x)} ${N(y)})"/>`;
      else if (k < 0.84) g += `<path d="M ${N(x)} ${N(y)} q 6 -11 13 0" stroke="${C}" stroke-width="4" fill="none" stroke-linecap="round" opacity="${N(op)}"/>`;
      else g += `<path d="${starPts(x, y, 4, 7 + r() * 4, 3)}" fill="${C}" opacity="${N(op)}"/>`;
    }
    add("party", `confetti${s}`, "Confettis", `${K} confetti pluie`, 200, 200, g);
  }
  // Guirlande fanions.
  [0, 1, 2].forEach((v) => {
    let g = stroke("M 6 26 Q 110 66 214 26", 4);
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const x = 6 + 208 * t, y = 26 + Math.sin(Math.PI * t) * 38;
      g += fillp(`M ${N(x - 14)} ${N(y - 2)} L ${N(x + 14)} ${N(y - 2)} L ${N(x)} ${N(y + 30 + v * 6)} Z`, i % 2 ? `opacity="0.6"` : "");
    }
    add("party", `bunting${v}`, "Guirlande", `${K} guirlande fanions`, 220, 110, g);
  });
  // Feux d'artifice (14 graines).
  for (let s = 0; s < 14; s++) {
    const r = rng(s * 83 + 29);
    const n2 = 10 + Math.floor(r() * 8);
    let g = "";
    for (let k = 0; k < n2; k++) {
      const ang = (k * 360) / n2 + r() * 10;
      const [x1, y1] = polar(100, 100, 22 + r() * 10, ang);
      const [x2, y2] = polar(100, 100, 66 + r() * 26, ang);
      g += stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 5, `opacity="${N(0.5 + r() * 0.5)}"`);
      if (r() > 0.4) { const [dx, dy] = polar(100, 100, 84 + r() * 10, ang); g += `<circle cx="${N(dx)}" cy="${N(dy)}" r="${N(3 + r() * 3)}" fill="${C}"/>`; }
    }
    add("party", `firework${s}`, "Feu d'artifice", `${K} artifice explosion`, 200, 200, g);
  }
  // Chapeaux de fête — monochromes : la « bande » est une découpe transparente
  // (le fond de la toile transparaît), jamais une seconde couleur.
  [[96, 116], [128, 146]].forEach(([bandTop, bandBot], v) =>
    add("party", `hat${v}`, "Chapeau", `${K} chapeau cône`, 180, 200,
      `<circle cx="90" cy="16" r="13" fill="${C}"/>` +
      fillp(`M 90 24 L ${N(90 + (bandTop - 24) * 0.42)} ${bandTop} H ${N(90 - (bandTop - 24) * 0.42)} Z`) +
      fillp(`M ${N(90 + (bandBot - 24) * 0.42)} ${bandBot} L ${N(90 + (168 - 24) * 0.42)} 168 H ${N(90 - (168 - 24) * 0.42)} L ${N(90 - (bandBot - 24) * 0.42)} ${bandBot} Z`)));
  // Serpentins.
  for (let s = 0; s < 8; s++) {
    const r = rng(s * 91 + 41);
    let d = `M ${N(20 + r() * 20)} ${N(180 - r() * 10)} `;
    let x = 30, y = 170;
    for (let i = 0; i < 6; i++) {
      const nx = x + 24 + r() * 10, ny = y - 26 - r() * 8;
      d += `Q ${N(x + 26)} ${N(y + 8 - (i % 2) * 40)} ${N(nx)} ${N(ny)} `;
      x = nx; y = ny;
    }
    add("party", `streamer${s}`, "Serpentin", `${K} serpentin spirale`, 200, 200, stroke(d, 6));
  }
  // Cadeau contour.
  add("party", "gift0", "Cadeau", `${K} cadeau gift`, 200, 200,
    stroke("M 24 84 H 176 V 182 H 24 Z", 8) + stroke("M 100 84 V 182", 8) + stroke("M 36 84 Q 60 44 100 82 Q 140 44 164 84", 8));
  add("party", "cake0", "Gâteau", `${K} gâteau anniversaire`, 210, 200,
    stroke("M 30 120 H 180 V 178 H 30 Z", 7) + stroke("M 30 142 q 19 14 38 0 q 19 14 37 0 q 19 14 38 0 q 19 14 37 0", 6) +
    stroke("M 70 120 V 96 M 105 120 V 88 M 140 120 V 96", 7) +
    `<circle cx="70" cy="86" r="6" fill="${C}"/><circle cx="105" cy="78" r="6" fill="${C}"/><circle cx="140" cy="86" r="6" fill="${C}"/>`);
})();

/* ── 10. Déco & motifs ── */
(() => {
  const K = "déco motif memphis pattern abstrait";
  // Grilles de points (taille × densité).
  [4, 5, 6, 7].forEach((n) => [6, 9].forEach((rad, ri) => {
    let g = "";
    const gap = 176 / (n - 1);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g += `<circle cx="${N(12 + i * gap)}" cy="${N(12 + j * gap)}" r="${rad}" fill="${C}"/>`;
    add("deco", `dots${n}_${ri}`, "Grille de points", `${K} points dots grille`, 200, 200, g);
  }));
  // Demi-teintes (4 directions × 2 formes).
  (["lr", "tb", "diag", "rad"] as const).forEach((dir) => [0, 1].forEach((shape) => {
    let g = "";
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const t = dir === "lr" ? i / 5 : dir === "tb" ? j / 5 : dir === "diag" ? (i + j) / 10 : Math.hypot(i - 2.5, j - 2.5) / 3.6;
      const rr = Math.max(1.2, 9.5 * (1 - t));
      const x = 18 + i * 33, y = 18 + j * 33;
      g += shape === 0
        ? `<circle cx="${x}" cy="${y}" r="${N(rr)}" fill="${C}"/>`
        : `<rect x="${N(x - rr)}" y="${N(y - rr)}" width="${N(rr * 2)}" height="${N(rr * 2)}" fill="${C}"/>`;
    }
    add("deco", `ht_${dir}_${shape}`, "Demi-teinte", `${K} halftone fondu`, 200, 200, g);
  }));
  // Lignes ondulées empilées.
  [3, 4, 6].forEach((rows, ri) => [10, 16].forEach((amp, ai) => {
    let g = "";
    for (let row = 0; row < rows; row++) {
      let d = `M 10 ${N(18 + row * (90 / rows))} `;
      for (let k = 0; k < 5; k++) d += `q 20 ${k % 2 ? amp : -amp} 40 0 `;
      g += stroke(d, 5);
    }
    add("deco", `waves${ri}_${ai}`, "Vagues déco", `${K} vagues lignes`, 220, 40 + 90, g);
  }));
  // Arches concentriques.
  [3, 4, 5].forEach((n, i) => {
    let g = "";
    for (let k = 0; k < n; k++) {
      const rr = 88 - k * (66 / n);
      g += stroke(`M ${N(110 - rr)} 112 A ${N(rr)} ${N(rr)} 0 0 1 ${N(110 + rr)} 112`, 12 - n);
    }
    add("deco", `arch${i}`, "Arches", `${K} arches arc-en-ciel rainbow`, 220, 120, g);
  });
  // Spirales.
  [2.2, 3.2, 4.2, 5.4].forEach((turns, ti) => [5, 8].forEach((sw, si) => {
    let d = "M 100 100 ";
    for (let i = 0; i <= 140; i++) {
      const t = i / 140;
      const [x, y] = polar(100, 100, 3 + t * 88, t * 360 * turns);
      d += `L ${N(x)} ${N(y)} `;
    }
    add("deco", `spiral${ti}_${si}`, "Spirale", `${K} spirale`, 200, 200, stroke(d, sw));
  }));
  // Croix / plus éparses.
  for (let s = 0; s < 8; s++) {
    const r = rng(s * 101 + 15);
    let g = "";
    for (let i = 0; i < 7 + Math.floor(r() * 4); i++) {
      const x = 16 + r() * 168, y = 16 + r() * 168, ss = 7 + r() * 9;
      g += stroke(`M ${N(x - ss)} ${N(y)} H ${N(x + ss)} M ${N(x)} ${N(y - ss)} V ${N(y + ss)}`, 5 + r() * 3, `opacity="${N(0.5 + r() * 0.5)}"`);
    }
    add("deco", `plus${s}`, "Croix éparses", `${K} plus scatter`, 200, 200, g);
  }
  // Triangles épars.
  for (let s = 0; s < 6; s++) {
    const r = rng(s * 113 + 27);
    let g = "";
    for (let i = 0; i < 8 + Math.floor(r() * 4); i++) {
      const x = 18 + r() * 164, y = 18 + r() * 164, ss = 8 + r() * 10;
      g += fillp(`M ${N(x)} ${N(y - ss)} L ${N(x + ss)} ${N(y + ss)} L ${N(x - ss)} ${N(y + ss)} Z`, `opacity="${N(0.45 + r() * 0.55)}" transform="rotate(${N(r() * 360)} ${N(x)} ${N(y)})"`);
    }
    add("deco", `tris${s}`, "Triangles épars", `${K} triangles scatter`, 200, 200, g);
  }
  // Damiers.
  [4, 6, 8].forEach((n, i) => {
    let g = "";
    const cell = 180 / n;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if ((a + b) % 2 === 0) g += `<rect x="${N(10 + a * cell)}" y="${N(10 + b * cell)}" width="${N(cell)}" height="${N(cell)}" fill="${C}"/>`;
    add("deco", `check${i}`, "Damier", `${K} damier checker`, 200, 200, g);
  });
  // Rayures.
  ([[0, 6], [0, 14], [45, 8], [45, 16], [90, 10], [-45, 12]] as const).forEach(([ang, sw], i) => {
    let g = `<g transform="rotate(${ang} 100 100)">`;
    for (let k = -3; k < 12; k++) g += `<rect x="${k * (sw * 2.4) - 40}" y="-60" width="${sw}" height="320" fill="${C}"/>`;
    add("deco", `stripes${i}`, "Rayures", `${K} rayures lignes stripes`, 200, 200, g + "</g>");
  });
  // Demi-cercles empilés.
  [0, 1].forEach((v) => {
    let g = "";
    for (let k = 0; k < 4; k++) g += fillp(`M ${20} ${170 - k * 38} A ${80 - k * 18} ${80 - k * 18} 0 0 1 ${180} ${170 - k * 38} Z`, `opacity="${1 - k * 0.2}" ${v ? `transform="rotate(180 100 ${170 - k * 38 - (80 - k * 18) / 2})"` : ""}`);
    add("deco", `semis${v}`, "Demi-cercles", `${K} arcs empilés`, 200, 200, g);
  });
  // Gribouillis simples (20 graines).
  for (let s = 0; s < 20; s++) {
    const r = rng(s * 127 + 33);
    let d = `M ${N(16 + r() * 20)} ${N(40 + r() * 120)} `;
    for (let i = 0; i < 5 + Math.floor(r() * 4); i++) {
      d += `Q ${N(30 + r() * 150)} ${N(20 + r() * 160)} ${N(40 + r() * 150)} ${N(30 + r() * 150)} `;
    }
    add("deco", `squig${s}`, "Gribouillis déco", `${K} squiggle ligne`, 200, 200, stroke(d, 5 + (s % 3)));
  }
  // Anneaux épars.
  for (let s = 0; s < 6; s++) {
    const r = rng(s * 131 + 51);
    let g = "";
    for (let i = 0; i < 6 + Math.floor(r() * 3); i++) {
      const x = 22 + r() * 156, y = 22 + r() * 156;
      g += `<circle cx="${N(x)}" cy="${N(y)}" r="${N(7 + r() * 12)}" fill="none" stroke="${C}" stroke-width="${N(3 + r() * 3)}" opacity="${N(0.5 + r() * 0.5)}"/>`;
    }
    add("deco", `rings${s}`, "Anneaux épars", `${K} cercles scatter`, 200, 200, g);
  }
})();

/* ── 11. Icônes ── */
(() => {
  const K = "icône symbole pictogramme";
  add("icons", "play0", "Lecture", `${K} play vidéo`, 200, 200, fillp("M 62 40 L 168 100 L 62 160 Z"));
  add("icons", "play1", "Lecture cercle", `${K} play`, 200, 200, `<circle cx="100" cy="100" r="88" fill="none" stroke="${C}" stroke-width="10"/>` + fillp("M 80 62 L 144 100 L 80 138 Z"));
  add("icons", "pause0", "Pause", K, 200, 200, fillp("M 56 40 H 88 V 160 H 56 Z") + fillp("M 112 40 H 144 V 160 H 112 Z"));
  add("icons", "stop0", "Stop", K, 200, 200, fillp("M 48 48 H 152 V 152 H 48 Z"));
  add("icons", "power0", "Power", `${K} on off`, 200, 200, stroke("M 100 24 V 96", 13) + stroke("M 58 52 A 62 62 0 1 0 142 52", 13));
  add("icons", "target0", "Cible", `${K} target objectif`, 200, 200, [88, 60, 32].map((r) => `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${C}" stroke-width="10"/>`).join("") + `<circle cx="100" cy="100" r="10" fill="${C}"/>`);
  add("icons", "cross0", "Viseur", `${K} crosshair`, 200, 200, `<circle cx="100" cy="100" r="64" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 100 12 V 52 M 100 148 V 188 M 12 100 H 52 M 148 100 H 188", 9));
  add("icons", "wifi0", "Wifi", `${K} wifi réseau`, 200, 170, stroke("M 30 78 A 96 96 0 0 1 170 78", 11) + stroke("M 56 108 A 62 62 0 0 1 144 108", 11) + `<circle cx="100" cy="140" r="12" fill="${C}"/>`);
  add("icons", "bell0", "Cloche", `${K} notification`, 200, 200, fillp("M 100 24 C 64 24 48 52 48 86 V 128 L 32 150 H 168 L 152 128 V 86 C 152 52 136 24 100 24 Z") + fillp("M 84 160 A 16 16 0 0 0 116 160 Z"));
  add("icons", "clock0", "Horloge", `${K} heure temps`, 200, 200, `<circle cx="100" cy="100" r="86" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 100 52 V 102 L 136 122", 10));
  add("icons", "checkc0", "Coche cercle", `${K} valider check`, 200, 200, `<circle cx="100" cy="100" r="88" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 58 102 L 88 132 L 144 70", 12));
  add("icons", "xc0", "Croix cercle", `${K} fermer erreur`, 200, 200, `<circle cx="100" cy="100" r="88" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 66 66 L 134 134 M 134 66 L 66 134", 12));
  add("icons", "plusc0", "Plus cercle", `${K} ajouter`, 200, 200, `<circle cx="100" cy="100" r="88" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 100 56 V 144 M 56 100 H 144", 12));
  add("icons", "heart0", "Cœur", `${K} coeur amour love`, 200, 190, fillp("M 100 174 C 40 128 16 92 22 60 C 27 32 52 18 76 26 C 89 31 97 41 100 49 C 103 41 111 31 124 26 C 148 18 173 32 178 60 C 184 92 160 128 100 174 Z"));
  add("icons", "hearto0", "Cœur contour", `${K} coeur`, 200, 190, stroke("M 100 168 C 46 126 24 92 29 62 C 33 38 54 26 74 33 C 87 38 96 48 100 56 C 104 48 113 38 126 33 C 146 26 167 38 171 62 C 176 92 154 126 100 168 Z", 9));
  add("icons", "pin0", "Repère", `${K} localisation map pin`, 160, 200, `<path fill-rule="evenodd" d="M 80 8 C 118 8 142 36 142 68 C 142 104 80 192 80 192 C 80 192 18 104 18 68 C 18 36 42 8 80 8 Z M 80 44 a 25 25 0 1 0 0.1 0 Z" fill="${C}"/>`);
  add("icons", "search0", "Loupe", `${K} recherche zoom`, 200, 200, `<circle cx="84" cy="84" r="56" fill="none" stroke="${C}" stroke-width="12"/>` + stroke("M 126 126 L 176 176", 14));
  [8, 10, 12].forEach((teeth, ti) => {
    let d = "";
    for (let k = 0; k < teeth * 4; k++) {
      const seg = Math.floor(k / 4);
      const phase = k % 4;
      const rr = phase < 2 ? 92 : 72;
      const ang = (seg * 360) / teeth + (phase === 0 ? -9 : phase === 1 ? 9 : phase === 2 ? 13 : (360 / teeth) - 13);
      const [x, y] = polar(100, 100, rr, ang);
      d += (k === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
    }
    add("icons", `gear${ti}`, "Engrenage", `${K} réglages gear`, 200, 200, `<path fill-rule="evenodd" d="${d} Z M 100 66 a 34 34 0 1 0 0.1 0 Z" fill="${C}"/>`);
  });
  add("icons", "bulb0", "Ampoule", `${K} idée lumière`, 170, 210, stroke("M 85 16 A 58 58 0 0 1 113 124 L 108 148 H 62 L 57 124 A 58 58 0 0 1 85 16 Z", 9) + stroke("M 64 166 H 106 M 70 184 H 100", 9));
  add("icons", "crown0", "Couronne", `${K} roi premium`, 220, 170, fillp("M 20 140 L 12 44 L 66 84 L 110 22 L 154 84 L 208 44 L 200 140 Z") + fillp("M 20 152 H 200 V 168 H 20 Z", `opacity="0.7"`));
  add("icons", "trophy0", "Trophée", `${K} victoire prix`, 200, 210, stroke("M 56 24 H 144 V 88 A 44 44 0 0 1 56 88 Z", 9) + stroke("M 56 40 H 24 A 32 32 0 0 0 60 88 M 144 40 H 176 A 32 32 0 0 1 140 88", 8) + stroke("M 100 132 V 158", 10) + fillp("M 64 158 H 136 V 178 H 64 Z"));
  add("icons", "medal0", "Médaille", `${K} récompense`, 180, 210, fillp("M 40 8 H 84 L 96 56 H 52 Z", `opacity="0.6"`) + fillp("M 140 8 H 96 L 84 56 H 128 Z", `opacity="0.8"`) + `<circle cx="90" cy="128" r="62" fill="none" stroke="${C}" stroke-width="11"/>` + fillp(starPts(90, 128, 5, 34, 15)));
  add("icons", "gem0", "Diamant", `${K} gemme diamond`, 210, 190, fillp("M 42 16 H 168 L 200 70 L 105 180 L 10 70 Z") + stroke("M 10 70 H 200 M 68 70 L 105 176 L 142 70 M 42 16 L 68 70 M 168 16 L 142 70", 5, `opacity="0.45"`));
  add("icons", "rocket0", "Fusée", `${K} rocket lancement`, 170, 210,
    `<path fill-rule="evenodd" d="M 85 6 C 118 34 128 82 118 130 H 52 C 42 82 52 34 85 6 Z M 85 54 a 18 18 0 1 0 0.1 0 Z" fill="${C}"/>` +
    fillp("M 52 108 L 18 150 L 54 144 Z") + fillp("M 118 108 L 152 150 L 116 144 Z") + fillp("M 70 138 H 100 L 85 182 Z", `opacity="0.7"`));
  add("icons", "chat0", "Message", `${K} chat sms`, 210, 190, stroke("M 18 20 H 192 V 132 H 96 L 54 170 L 62 132 H 18 Z", 9) + `<circle cx="70" cy="76" r="9" fill="${C}"/><circle cx="105" cy="76" r="9" fill="${C}"/><circle cx="140" cy="76" r="9" fill="${C}"/>`);
  add("icons", "mail0", "Mail", `${K} email courrier`, 220, 160, stroke("M 14 16 H 206 V 144 H 14 Z", 9) + stroke("M 16 22 L 110 96 L 204 22", 9));
  add("icons", "phone0", "Téléphone", `${K} appel`, 200, 200, fillp("M 48 16 L 84 22 L 92 62 L 68 82 C 78 108 96 126 120 138 L 140 114 L 180 124 L 184 160 C 184 176 172 186 156 184 C 90 176 28 114 20 46 C 18 30 30 18 48 16 Z"));
  add("icons", "eye0", "Œil", `${K} oeil vision regard`, 220, 140, stroke("M 12 70 C 50 18 170 18 208 70 C 170 122 50 122 12 70 Z", 8) + `<circle cx="110" cy="70" r="26" fill="${C}"/>`);
  add("icons", "note0", "Note", `${K} musique note`, 160, 200, stroke("M 62 152 V 24 L 138 40 V 132", 10) + `<ellipse cx="44" cy="154" rx="24" ry="18" fill="${C}"/><ellipse cx="120" cy="134" rx="24" ry="18" fill="${C}"/>`);
  add("icons", "note1", "Croche", `${K} musique`, 130, 200, stroke("M 76 150 V 20 Q 110 34 108 66", 10) + `<ellipse cx="58" cy="152" rx="24" ry="18" fill="${C}"/>`);
  add("icons", "thumb0", "Pouce", `${K} like approuver`, 200, 200, fillp("M 26 88 H 58 V 176 H 26 Z", `opacity="0.7"`) + fillp("M 70 176 V 92 L 108 24 C 122 26 128 40 124 56 L 116 84 H 162 C 176 84 184 96 180 110 L 164 162 C 160 172 152 176 142 176 Z"));
  add("icons", "flame0", "Flamme", `${K} feu hot`, 160, 200, fillp("M 80 8 C 96 44 128 62 128 108 A 48 48 0 0 1 32 108 C 32 84 44 66 56 52 C 56 72 64 80 72 84 C 66 56 70 30 80 8 Z"));
  add("icons", "drop0", "Goutte", `${K} eau liquide`, 150, 200, fillp("M 75 6 C 108 56 130 88 130 126 A 55 55 0 0 1 20 126 C 20 88 42 56 75 6 Z"));
  add("icons", "moonic0", "Lune icône", `${K} nuit sombre`, 200, 200, fillp("M 122.5 19.6 A 85 85 0 1 0 122.5 180.4 A 85 85 0 0 1 122.5 19.6 Z"));
  add("icons", "bolt0", "Éclair", `${K} énergie flash`, 150, 200, fillp("M 92 4 L 16 116 H 66 L 54 196 L 134 76 H 82 Z"));
  add("icons", "infinity0", "Infini", `${K} infini boucle`, 240, 120, stroke("M 60 60 C 20 20 20 100 60 60 C 100 20 140 100 180 60 C 220 20 220 100 180 60 C 140 100 100 20 60 60 Z", 11));
  add("icons", "peace0", "Paix", `${K} peace`, 200, 200, `<circle cx="100" cy="100" r="86" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 100 14 V 186 M 100 100 L 40 158 M 100 100 L 160 158", 10));
  add("icons", "smile0", "Sourire", `${K} smiley content`, 200, 200, `<circle cx="100" cy="100" r="86" fill="none" stroke="${C}" stroke-width="10"/><circle cx="70" cy="80" r="10" fill="${C}"/><circle cx="130" cy="80" r="10" fill="${C}"/>` + stroke("M 58 122 Q 100 158 142 122", 10));
})();

/* ── 12. Tech ── */
(() => {
  const K = "tech interface web code digital";
  add("tech", "brack0", "Crochets code", `${K} code dev`, 220, 160, stroke("M 70 20 Q 34 20 34 52 Q 34 80 14 80 Q 34 80 34 108 Q 34 140 70 140", 9) + stroke("M 150 20 Q 186 20 186 52 Q 186 80 206 80 Q 186 80 186 108 Q 186 140 150 140", 9));
  add("tech", "brack1", "Chevrons code", `${K} code html`, 220, 150, stroke("M 74 22 L 16 75 L 74 128", 11) + stroke("M 146 22 L 204 75 L 146 128", 11) + stroke("M 124 14 L 96 136", 9, `opacity="0.6"`));
  add("tech", "cursor0", "Curseur", `${K} souris clic`, 160, 200, fillp("M 24 10 L 136 108 L 84 116 L 110 170 L 84 182 L 58 128 L 24 156 Z"));
  add("tech", "cursor1", "Curseur contour", `${K} souris`, 160, 200, stroke("M 28 14 L 132 106 L 84 112 L 108 164 L 86 174 L 62 122 L 28 150 Z", 8));
  [0, 1, 2, 3].forEach((v) => {
    add("tech", `window${v}`, "Fenêtre", `${K} navigateur fenêtre app`, 220, 170,
      stroke(`M 12 14 H 208 V 156 H 12 Z`, 7) + stroke("M 12 44 H 208", 7) +
      `<circle cx="32" cy="29" r="6" fill="${C}"/><circle cx="52" cy="29" r="6" fill="${C}" opacity="0.7"/><circle cx="72" cy="29" r="6" fill="${C}" opacity="0.45"/>` +
      (v === 1 ? stroke("M 32 74 H 130 M 32 96 H 180 M 32 118 H 150", 7, `opacity="0.6"`) :
       v === 2 ? `<rect x="30" y="66" width="70" height="70" rx="8" fill="${C}" opacity="0.5"/>` + stroke("M 116 80 H 188 M 116 104 H 188 M 116 128 H 160", 7, `opacity="0.6"`) :
       v === 3 ? `<rect x="30" y="64" width="160" height="26" rx="13" fill="${C}" opacity="0.4"/>` + stroke("M 32 112 H 188 M 32 132 H 130", 7, `opacity="0.6"`) : ""));
  });
  // Circuits (14 graines).
  for (let s = 0; s < 14; s++) {
    const r = rng(s * 139 + 61);
    let g = "";
    for (let i = 0; i < 5; i++) {
      const y0 = 24 + i * 38 + r() * 8;
      const x1 = 14 + r() * 30, xm = 70 + r() * 70, x2 = 150 + r() * 40;
      const yb = y0 + (r() > 0.5 ? 20 : -20);
      g += stroke(`M ${N(x1)} ${N(y0)} H ${N(xm)} L ${N(xm + 16)} ${N(yb)} H ${N(x2)}`, 5);
      g += `<circle cx="${N(x1)}" cy="${N(y0)}" r="6" fill="${C}"/><circle cx="${N(x2)}" cy="${N(yb)}" r="6" fill="none" stroke="${C}" stroke-width="4"/>`;
    }
    add("tech", `circuit${s}`, "Circuit", `${K} circuit électronique`, 220, 210, g);
  }
  // Pixels / QR décoratif (8 graines).
  for (let s = 0; s < 8; s++) {
    const r = rng(s * 149 + 77);
    let g = "";
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (r() > 0.55) g += `<rect x="${12 + i * 22}" y="${12 + j * 22}" width="18" height="18" fill="${C}" opacity="${r() > 0.75 ? 0.55 : 1}"/>`;
    add("tech", `pixels${s}`, "Pixels", `${K} pixel qr data`, 200, 200, g);
  }
  [1, 2, 3].forEach((lvl) =>
    add("tech", `signal${lvl}`, "Signal", `${K} barres réseau`, 200, 170,
      [0, 1, 2, 3].map((b) => `<rect x="${20 + b * 46}" y="${130 - b * 36}" width="30" height="${24 + b * 36}" rx="6" fill="${C}" opacity="${b < lvl + 1 ? 1 : 0.25}"/>`).join("")));
  [0.3, 0.65, 1].forEach((lvl, i) =>
    add("tech", `battery${i}`, "Batterie", `${K} batterie énergie`, 230, 120,
      stroke("M 12 24 H 194 V 96 H 12 Z", 8) + fillp(`M 202 44 H 220 V 76 H 202 Z`) +
      `<rect x="24" y="36" width="${N(158 * lvl)}" height="48" rx="6" fill="${C}" opacity="0.75"/>`));
  add("tech", "cloud0", "Cloud", `${K} cloud sauvegarde`, 220, 150, stroke("M 60 118 A 30 30 0 0 1 52 60 A 38 38 0 0 1 122 42 A 32 32 0 0 1 178 62 A 28 28 0 0 1 170 118 Z", 9) + stroke("M 110 74 V 138 M 88 96 L 110 74 L 132 96", 9));
  add("tech", "link0", "Lien", `${K} lien url chaîne`, 220, 130, stroke("M 92 92 L 128 56", 10) + stroke("M 82 44 L 100 26 A 34 34 0 0 1 148 74 L 130 92", 10) + stroke("M 138 106 L 120 124 A 34 34 0 0 1 72 76 L 90 58", 10, `transform="translate(-18 -18)"`));
  add("tech", "at0", "Arobase", `${K} email at`, 200, 200, `<circle cx="100" cy="100" r="34" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 134 100 V 66 M 134 100 A 34 22 0 0 0 168 96 A 78 78 0 1 0 138 160", 10));
  add("tech", "hash0", "Hashtag", `${K} hashtag réseau`, 190, 190, stroke("M 62 16 L 46 174 M 144 16 L 128 174 M 20 62 H 178 M 12 128 H 170", 12));
})();

/* ── 13. Nourriture ── */
(() => {
  const K = "nourriture food cuisine repas";
  add("food", "apple0", "Pomme", `${K} pomme fruit apple`, 200, 200,
    fillp("M 100 64 C 82 46 52 48 44 80 C 36 112 52 160 84 178 C 92 183 100 178 100 178 C 100 178 108 183 116 178 C 148 160 164 112 156 80 C 148 48 118 46 100 64 Z") +
    stroke("M 100 62 C 102 42 108 32 120 28", 7) +
    op("M 108 42 C 128 28 150 34 152 54 C 130 60 110 52 108 42 Z", 0.6));
  add("food", "pear0", "Poire", `${K} poire fruit`, 180, 210,
    fillp("M 90 46 C 82 64 86 80 76 94 C 54 122 46 160 76 186 C 102 208 122 198 130 176 C 142 144 120 118 108 98 C 100 84 102 66 96 46 Z") +
    stroke("M 92 48 C 94 30 100 22 112 20", 7));
  add("food", "cherry0", "Cerises", `${K} cerise cherry fruit`, 200, 200,
    stroke("M 100 30 C 70 58 58 90 60 126", 8) + stroke("M 100 30 C 130 58 142 90 140 126", 8) +
    `<circle cx="60" cy="150" r="32" fill="${C}"/><circle cx="140" cy="150" r="32" fill="${C}"/>` +
    opc(50, 142, 7, 0.5) + opc(130, 142, 7, 0.5));
  add("food", "banana0", "Banane", `${K} banane banana fruit`, 210, 170,
    fillp("M 24 44 C 40 120 110 158 190 132 C 200 128 200 112 188 116 C 120 138 62 104 48 40 C 45 30 27 34 24 44 Z"));
  [6, 8, 10].forEach((seg, i) => {
    let g = `<circle cx="100" cy="100" r="86" fill="${C}"/>`;
    g += opc(100, 100, 74, 0.35);
    for (let k = 0; k < seg; k++) g += stroke(`M 100 100 L ${N(polar(100, 100, 72, (k * 360) / seg)[0])} ${N(polar(100, 100, 72, (k * 360) / seg)[1])}`, 4, `opacity="0.55"`);
    add("food", `citrus${i}`, "Agrume", `${K} orange citron agrume tranche slice`, 200, 200, g);
  });
  add("food", "watermelon0", "Pastèque", `${K} pastèque melon fruit`, 210, 140,
    fillp("M 12 24 A 96 96 0 0 0 204 24 Z") + op("M 24 24 A 84 84 0 0 0 192 24 Z", 0.4) +
    Array.from({ length: 6 }, (_, k) => opc(52 + k * 21, 60 + (k % 2) * 14, 5, 0.85)).join(""));
  add("food", "strawberry0", "Fraise", `${K} fraise strawberry fruit`, 180, 210,
    fillp("M 90 60 C 40 60 30 110 56 156 C 70 182 90 198 90 198 C 90 198 110 182 124 156 C 150 110 140 60 90 60 Z") +
    op("M 90 34 L 66 54 L 90 50 L 90 34 Z M 90 34 L 114 54 L 90 50 Z M 54 50 L 78 62 L 62 68 Z M 126 50 L 102 62 L 118 68 Z", 0.55) +
    Array.from({ length: 7 }, (_, k) => opc(64 + (k % 3) * 26, 96 + Math.floor(k / 3) * 30, 4, 0.4)).join(""));
  for (let s = 0; s < 3; s++) {
    let g = stroke("M 100 24 C 96 40 100 48 100 56", 6);
    const rows = [[100], [78, 122], [64, 100, 136], [82, 118], [100]];
    let cy = 66;
    rows.forEach((row) => { row.forEach((cx) => { g += `<circle cx="${cx}" cy="${cy}" r="21" fill="${C}"/>`; g += opc(cx - 7, cy - 7, 5, 0.4); }); cy += 34; });
    add("food", `grapes${s}`, "Raisin", `${K} raisin grappe grapes`, 200, 210, g);
  }
  add("food", "avocado0", "Avocat", `${K} avocat avocado fruit`, 180, 210,
    eo("M 90 20 C 40 20 30 90 40 140 C 48 182 72 200 90 200 C 108 200 132 182 140 140 C 150 90 140 20 90 20 Z" + holeC(90, 138, 34)) +
    `<circle cx="90" cy="138" r="24" fill="${C}"/>`);
  add("food", "carrot0", "Carotte", `${K} carotte légume carrot`, 180, 210,
    fillp("M 90 200 L 52 96 C 78 84 102 84 128 96 Z") +
    stroke("M 90 92 C 70 60 60 44 44 34 M 90 92 C 90 56 90 38 90 22 M 90 92 C 110 60 120 44 136 34", 9, `opacity="0.7"`));
  add("food", "pizza0", "Pizza", `${K} pizza part slice`, 200, 210,
    fillp("M 100 12 L 176 190 C 130 206 70 206 24 190 Z") +
    op("M 100 40 L 158 178 C 122 190 78 190 42 178 Z", 0.25) +
    opc(88, 96, 12, 0.7) + opc(126, 120, 11, 0.7) + opc(76, 150, 10, 0.7) + opc(120, 168, 9, 0.7));
  add("food", "donut0", "Donut", `${K} donut beignet`, 200, 200,
    eo("M 12 100 a 88 88 0 1 0 176 0 a 88 88 0 1 0 -176 0 Z" + holeC(100, 100, 34)) +
    Array.from({ length: 8 }, (_, k) => { const a = k * 45; const [x, y] = polar(100, 100, 62, a); return stroke(`M ${N(x - 6)} ${N(y)} l 12 -6`, 6, `opacity="0.5"`); }).join(""));
  add("food", "cupcake0", "Cupcake", `${K} cupcake gâteau muffin`, 190, 210,
    fillp("M 46 96 L 60 190 H 130 L 144 96 Z") + stroke("M 54 120 H 136 M 60 150 H 130", 5, `opacity="0.5"`) +
    fillp("M 95 30 C 60 30 42 64 62 88 C 46 96 52 118 74 116 C 78 132 110 132 116 116 C 138 118 146 94 128 84 C 146 60 128 30 95 30 Z") +
    `<circle cx="95" cy="20" r="9" fill="${C}"/>`);
  add("food", "icecream0", "Glace", `${K} glace cornet ice cream`, 160, 220,
    fillp("M 80 210 L 40 92 H 120 Z") + stroke("M 56 118 L 70 150 M 80 100 L 80 160 M 104 118 L 90 150", 4, `opacity="0.5"`) +
    fillp("M 80 20 C 44 20 30 54 52 76 C 34 96 60 108 80 96 C 100 108 126 96 108 76 C 130 54 116 20 80 20 Z"));
  add("food", "coffee0", "Café", `${K} café tasse boisson coffee`, 210, 190,
    stroke("M 30 60 H 150 V 118 A 44 44 0 0 1 30 118 Z", 9) + stroke("M 150 72 H 176 A 26 26 0 0 1 150 118", 9) +
    stroke("M 66 20 C 60 34 74 40 68 54 M 100 18 C 94 32 108 38 102 52 M 134 22 C 128 36 142 42 136 56", 6, `opacity="0.6"`));
  add("food", "croissant0", "Croissant", `${K} croissant viennoiserie`, 220, 160,
    fillp("M 24 118 C 44 74 92 52 132 60 C 118 46 96 44 96 44 C 150 34 196 68 196 112 C 196 130 176 138 168 122 C 160 108 150 104 150 104 C 162 120 158 138 158 138 C 132 118 116 118 116 118 C 128 134 124 150 124 150 C 96 124 78 124 78 124 C 88 140 82 152 82 152 C 52 132 34 130 24 118 Z"));
  for (let s = 0; s < 3; s++) {
    const r = rng(s * 71 + 3);
    let g = `<circle cx="100" cy="100" r="84" fill="${C}"/>`;
    for (let k = 0; k < 7; k++) g += opc(48 + r() * 104, 48 + r() * 104, 8 + r() * 4, 0.45);
    add("food", `cookie${s}`, "Cookie", `${K} cookie biscuit`, 200, 200, g);
  }
  add("food", "cake0", "Gâteau", `${K} gâteau cake anniversaire`, 210, 200,
    fillp("M 30 90 H 180 V 176 H 30 Z") + stroke("M 30 128 H 180", 6, `opacity="0.45"`) +
    stroke("M 30 90 Q 55 72 80 90 T 130 90 T 180 90", 7, `opacity="0.7"`) +
    stroke("M 105 40 V 78", 7) + `<circle cx="105" cy="30" r="9" fill="${C}"/>`);
  add("food", "burger0", "Burger", `${K} burger hamburger fast food`, 210, 190,
    fillp("M 26 60 C 26 28 184 28 184 60 Z") + opc(70, 46, 5, 0.5) + opc(105, 40, 5, 0.5) + opc(140, 46, 5, 0.5) +
    fillp("M 22 74 H 188 V 92 H 22 Z", `opacity="0.55"`) +
    fillp("M 26 104 C 20 104 20 128 30 128 H 180 C 190 128 190 104 184 104 Z") +
    fillp("M 26 142 C 26 170 184 170 184 142 Z"));
  add("food", "egg0", "Œuf", `${K} oeuf egg`, 180, 210,
    fillp("M 90 16 C 40 16 26 120 44 164 C 58 198 122 198 136 164 C 154 120 140 16 90 16 Z") +
    opc(90, 130, 30, 0.4));
  add("food", "bottle0", "Bouteille", `${K} bouteille boisson vin`, 130, 220,
    stroke("M 52 12 H 78 V 44 C 78 64 96 72 96 104 V 196 A 8 8 0 0 1 88 204 H 42 A 8 8 0 0 1 34 196 V 104 C 34 72 52 64 52 44 Z", 8) +
    fillp("M 34 118 H 96 V 176 H 34 Z", `opacity="0.35"`));
  add("food", "mushroom0", "Champignon", `${K} champignon mushroom`, 190, 200,
    fillp("M 20 100 C 20 46 170 46 170 100 C 170 108 20 108 20 100 Z") +
    opc(58, 78, 8, 0.4) + opc(120, 72, 10, 0.4) + opc(95, 90, 6, 0.4) +
    fillp("M 74 104 H 116 L 108 186 H 82 Z"));
})();

/* ── 14. Animaux ── */
(() => {
  const K = "animal animaux nature";
  add("animals", "cat0", "Chat", `${K} chat cat félin`, 200, 200,
    fillp("M 44 60 L 60 20 L 92 56 Z M 156 60 L 140 20 L 108 56 Z") +
    `<circle cx="100" cy="118" r="66" fill="${C}"/>` +
    `<circle cx="76" cy="106" r="8" fill="${C}"/><circle cx="124" cy="106" r="8" fill="${C}"/>` +
    stroke("M 100 122 L 100 132 M 100 132 Q 88 142 78 136 M 100 132 Q 112 142 122 136", 5) +
    stroke("M 60 122 H 30 M 60 132 H 32 M 140 122 H 170 M 140 132 H 168", 4, `opacity="0.6"`));
  add("animals", "dog0", "Chien", `${K} chien dog`, 200, 200,
    fillp("M 40 60 C 20 70 20 120 44 130 L 44 90 Z M 160 60 C 180 70 180 120 156 130 L 156 90 Z") +
    `<circle cx="100" cy="110" r="64" fill="${C}"/>` +
    `<circle cx="78" cy="100" r="8" fill="${C}"/><circle cx="122" cy="100" r="8" fill="${C}"/>` +
    `<ellipse cx="100" cy="128" rx="14" ry="10" fill="${C}"/>` +
    stroke("M 100 138 V 150", 4, `opacity="0.6"`));
  add("animals", "rabbit0", "Lapin", `${K} lapin rabbit`, 180, 220,
    fillp("M 66 20 C 56 60 60 96 74 108 C 86 100 88 60 82 20 C 78 10 68 10 66 20 Z") +
    fillp("M 114 20 C 124 60 120 96 106 108 C 94 100 92 60 98 20 C 102 10 112 10 114 20 Z") +
    `<circle cx="90" cy="150" r="58" fill="${C}"/>` +
    `<circle cx="72" cy="142" r="7" fill="${C}"/><circle cx="108" cy="142" r="7" fill="${C}"/>` +
    `<ellipse cx="90" cy="164" rx="10" ry="7" fill="${C}"/>`);
  add("animals", "bear0", "Ours", `${K} ours bear`, 200, 200,
    `<circle cx="56" cy="58" r="26" fill="${C}"/><circle cx="144" cy="58" r="26" fill="${C}"/>` +
    `<circle cx="100" cy="112" r="70" fill="${C}"/>` +
    `<circle cx="76" cy="100" r="8" fill="${C}"/><circle cx="124" cy="100" r="8" fill="${C}"/>` +
    opc(100, 128, 26, 0.35) + `<ellipse cx="100" cy="120" rx="12" ry="9" fill="${C}"/>`);
  add("animals", "fox0", "Renard", `${K} renard fox`, 200, 200,
    fillp("M 30 40 L 84 96 L 40 108 Z M 170 40 L 116 96 L 160 108 Z") +
    fillp("M 100 60 C 60 60 44 96 52 128 L 100 176 L 148 128 C 156 96 140 60 100 60 Z") +
    op("M 100 150 C 78 150 66 132 72 118 L 100 138 L 128 118 C 134 132 122 150 100 150 Z", 0.4) +
    `<circle cx="78" cy="106" r="7" fill="${C}"/><circle cx="122" cy="106" r="7" fill="${C}"/>` +
    `<circle cx="100" cy="150" r="8" fill="${C}"/>`);
  add("animals", "panda0", "Panda", `${K} panda`, 200, 200,
    `<circle cx="52" cy="52" r="24" fill="${C}"/><circle cx="148" cy="52" r="24" fill="${C}"/>` +
    `<circle cx="100" cy="112" r="72" fill="none" stroke="${C}" stroke-width="9"/>` +
    `<ellipse cx="74" cy="104" rx="15" ry="20" fill="${C}"/><ellipse cx="126" cy="104" rx="15" ry="20" fill="${C}"/>` +
    `<circle cx="100" cy="132" r="9" fill="${C}"/>` + opc(74, 100, 6, 0.4) + opc(126, 100, 6, 0.4));
  add("animals", "fish0", "Poisson", `${K} poisson fish mer`, 220, 160,
    fillp("M 150 44 C 90 24 40 52 30 80 C 40 108 90 136 150 116 C 148 100 148 60 150 44 Z") +
    fillp("M 150 44 L 200 24 L 190 80 L 200 136 L 150 116 C 148 100 148 60 150 44 Z", `opacity="0.55"`) +
    `<circle cx="68" cy="76" r="8" fill="${C}"/>` +
    stroke("M 96 62 A 38 38 0 0 1 96 98 M 118 58 A 44 44 0 0 1 118 102", 4, `opacity="0.5"`));
  add("animals", "whale0", "Baleine", `${K} baleine whale mer`, 220, 170,
    fillp("M 24 96 C 24 52 90 40 130 52 C 150 40 176 40 176 40 C 172 56 172 68 176 78 C 200 96 196 130 160 138 C 110 148 24 140 24 96 Z") +
    stroke("M 30 104 C 66 120 122 124 166 114", 4, `opacity="0.45"`) +
    `<circle cx="60" cy="92" r="7" fill="${C}"/>` +
    stroke("M 150 30 C 144 18 156 12 150 2", 6, `opacity="0.6"`));
  add("animals", "bird0", "Oiseau", `${K} oiseau bird`, 200, 180,
    fillp("M 60 60 C 30 60 20 100 44 120 C 36 140 52 156 76 150 C 96 168 140 168 158 140 C 186 132 190 96 168 84 C 168 60 140 44 116 56 C 100 44 76 46 60 60 Z") +
    fillp("M 168 84 L 196 76 L 176 100 Z") +
    `<circle cx="150" cy="92" r="7" fill="${C}"/>` +
    stroke("M 74 108 Q 100 126 128 112", 4, `opacity="0.5"`));
  add("animals", "butterfly0", "Papillon", `${K} papillon butterfly`, 220, 200,
    fillp("M 104 100 C 60 40 20 44 24 88 C 26 120 66 128 104 108 Z") +
    fillp("M 104 100 C 148 40 188 44 184 88 C 182 120 142 128 104 108 Z") +
    fillp("M 104 100 C 66 120 34 140 46 172 C 58 196 96 168 104 120 Z") +
    fillp("M 104 100 C 142 120 174 140 162 172 C 150 196 112 168 104 120 Z") +
    stroke("M 104 74 V 150", 8) +
    stroke("M 104 74 C 92 56 82 50 74 48 M 104 74 C 116 56 126 50 134 48", 5) +
    opc(56, 82, 8, 0.4) + opc(152, 82, 8, 0.4));
  add("animals", "bee0", "Abeille", `${K} abeille bee insecte`, 200, 170,
    fillp("M 44 40 C 20 60 24 100 54 108 C 40 118 46 90 60 78 Z", `opacity="0.55"`) +
    fillp("M 156 40 C 180 60 176 100 146 108 C 160 118 154 90 140 78 Z", `opacity="0.55"`) +
    `<ellipse cx="100" cy="104" rx="56" ry="44" fill="${C}"/>` +
    stroke("M 82 66 V 142 M 118 66 V 142", 8, `opacity="0.35"`) +
    stroke("M 78 46 C 70 30 60 26 54 28 M 122 46 C 130 30 140 26 146 28", 4));
  add("animals", "ladybug0", "Coccinelle", `${K} coccinelle ladybug insecte`, 190, 190,
    `<circle cx="95" cy="104" r="72" fill="${C}"/>` +
    stroke("M 95 34 V 174", 6, `opacity="0.35"`) +
    fillp("M 95 32 A 40 40 0 0 0 55 60 A 72 72 0 0 1 95 46 Z", `opacity="0.85"`) +
    fillp("M 95 32 A 40 40 0 0 1 135 60 A 72 72 0 0 0 95 46 Z", `opacity="0.85"`) +
    opc(66, 96, 9, 0.4) + opc(124, 96, 9, 0.4) + opc(72, 138, 8, 0.4) + opc(118, 138, 8, 0.4) +
    stroke("M 95 34 C 88 20 80 16 74 16 M 95 34 C 102 20 110 16 116 16", 4));
  add("animals", "snail0", "Escargot", `${K} escargot snail`, 220, 180,
    stroke("M 30 150 C 20 120 44 100 74 108 C 60 60 120 44 158 78 C 196 112 168 168 118 160 C 96 156 92 132 106 122 C 118 114 134 122 132 136", 10) +
    stroke("M 30 150 H 96", 10) + `<circle cx="30" cy="150" r="10" fill="${C}"/>` +
    stroke("M 34 148 C 26 128 22 118 24 106 M 44 148 C 44 128 46 118 52 108", 5) +
    opc(24, 104, 4, 1) + opc(52, 106, 4, 1));
  add("animals", "turtle0", "Tortue", `${K} tortue turtle`, 220, 170,
    fillp("M 60 120 A 60 46 0 0 1 180 120 Z") +
    stroke("M 120 78 V 118 M 84 98 L 102 118 M 156 98 L 138 118", 5, `opacity="0.5"`) +
    `<circle cx="196" cy="112" r="16" fill="${C}"/>` + opc(200, 108, 3, 1) +
    fillp("M 66 118 L 54 148 H 74 L 82 122 Z M 174 118 L 186 148 H 166 L 158 122 Z"));
  add("animals", "owl0", "Hibou", `${K} hibou chouette owl`, 190, 210,
    fillp("M 95 20 C 45 20 30 70 34 120 C 38 176 70 196 95 196 C 120 196 152 176 156 120 C 160 70 145 20 95 20 Z") +
    `<circle cx="68" cy="94" r="26" fill="none" stroke="${C}" stroke-width="7"/><circle cx="122" cy="94" r="26" fill="none" stroke="${C}" stroke-width="7"/>` +
    `<circle cx="68" cy="94" r="9" fill="${C}"/><circle cx="122" cy="94" r="9" fill="${C}"/>` +
    fillp("M 95 108 L 84 126 H 106 Z") +
    fillp("M 40 34 L 62 58 L 40 62 Z M 150 34 L 128 58 L 150 62 Z", `opacity="0.7"`));
  add("animals", "penguin0", "Pingouin", `${K} pingouin penguin`, 170, 220,
    fillp("M 85 14 C 40 14 30 80 32 130 C 34 180 56 208 85 208 C 114 208 136 180 138 130 C 140 80 130 14 85 14 Z") +
    op("M 85 40 C 58 40 50 90 52 130 C 54 172 68 190 85 190 C 102 190 116 172 118 130 C 120 90 112 40 85 40 Z", 0.35) +
    `<circle cx="68" cy="76" r="7" fill="${C}"/><circle cx="102" cy="76" r="7" fill="${C}"/>` +
    fillp("M 85 88 L 72 100 L 85 106 L 98 100 Z") +
    fillp("M 66 200 L 50 214 H 82 Z M 104 200 L 120 214 H 88 Z"));
  add("animals", "paw0", "Patte", `${K} patte paw empreinte`, 200, 200,
    `<circle cx="60" cy="82" r="20" fill="${C}"/><circle cx="100" cy="66" r="21" fill="${C}"/><circle cx="140" cy="82" r="20" fill="${C}"/><circle cx="158" cy="122" r="17" fill="${C}"/>` +
    fillp("M 100 190 C 62 190 44 158 60 132 C 76 108 124 108 140 132 C 156 158 138 190 100 190 Z"));
  add("animals", "chick0", "Poussin", `${K} poussin chick oiseau`, 190, 200,
    `<circle cx="95" cy="118" r="72" fill="${C}"/>` + `<circle cx="95" cy="52" r="34" fill="${C}"/>` +
    `<circle cx="84" cy="46" r="6" fill="none" stroke="${C}" stroke-width="4"/><circle cx="106" cy="46" r="6" fill="none" stroke="${C}" stroke-width="4"/>` +
    fillp("M 95 52 L 80 64 L 95 72 L 110 64 Z", `opacity="0.55"`) +
    stroke("M 40 118 L 18 108 M 40 130 L 18 132 M 150 118 L 172 108 M 150 130 L 172 132", 5, `opacity="0.6"`));
})();

/* ── 15. Objets ── */
(() => {
  const K = "objet objets";
  add("objects", "book0", "Livre", `${K} livre book lecture`, 210, 190,
    stroke("M 105 40 C 80 24 40 24 24 34 V 160 C 40 150 80 150 105 166 C 130 150 170 150 186 160 V 34 C 170 24 130 24 105 40 Z", 9) +
    stroke("M 105 40 V 166", 7, `opacity="0.6"`));
  add("objects", "camera0", "Caméra", `${K} caméra photo appareil camera`, 220, 170,
    stroke("M 16 48 H 66 L 82 26 H 138 L 154 48 H 204 V 150 H 16 Z", 8) +
    `<circle cx="110" cy="100" r="36" fill="none" stroke="${C}" stroke-width="9"/>` + opc(110, 100, 18, 0.4) +
    `<circle cx="180" cy="66" r="7" fill="${C}"/>`);
  add("objects", "key0", "Clé", `${K} clé key serrure`, 220, 130,
    `<circle cx="56" cy="66" r="38" fill="none" stroke="${C}" stroke-width="11"/>` + opc(56, 66, 14, 0.4) +
    stroke("M 92 66 H 200 M 160 66 V 96 M 186 66 V 92", 11));
  add("objects", "lock0", "Cadenas", `${K} cadenas serrure sécurité lock`, 180, 210,
    stroke("M 56 96 V 66 A 34 34 0 0 1 124 66 V 96", 12) +
    fillp("M 30 96 H 150 V 190 H 30 Z") + `<circle cx="90" cy="134" r="12" fill="none" stroke="${C}" stroke-width="6" opacity="0.5"/>` + stroke("M 90 146 V 164", 6, `opacity="0.5"`));
  add("objects", "umbrella0", "Parapluie", `${K} parapluie parasol umbrella`, 210, 210,
    fillp("M 105 24 C 45 24 12 80 12 108 C 40 92 56 92 60 112 C 78 92 92 92 105 112 C 118 92 132 92 150 112 C 154 92 170 92 198 108 C 198 80 165 24 105 24 Z") +
    stroke("M 105 24 V 176 C 105 196 82 196 78 178", 9));
  add("objects", "gift0", "Cadeau", `${K} cadeau gift boîte`, 200, 210,
    fillp("M 26 78 H 174 V 100 H 26 Z") + fillp("M 40 100 H 160 V 196 H 40 Z") +
    stroke("M 100 100 V 196", 8, `opacity="0.5"`) +
    stroke("M 100 78 C 60 78 44 40 66 30 C 88 22 100 60 100 78 C 100 60 112 22 134 30 C 156 40 140 78 100 78 Z", 8));
  add("objects", "balloon0", "Ballon", `${K} ballon baudruche balloon fête`, 170, 220,
    fillp("M 85 16 C 40 16 28 74 50 116 C 62 138 78 148 78 156 H 92 C 92 148 108 138 120 116 C 142 74 130 16 85 16 Z") +
    stroke("M 60 62 A 28 38 0 0 1 74 42", 5, `opacity="0.4"`) +
    fillp("M 78 156 L 92 156 L 85 168 Z") + stroke("M 85 168 C 96 184 74 196 85 210", 4));
  add("objects", "flag0", "Drapeau", `${K} drapeau flag`, 200, 210,
    stroke("M 44 16 V 196", 9) + fillp("M 44 24 C 90 4 120 44 166 24 V 108 C 120 128 90 88 44 108 Z"));
  add("objects", "house0", "Maison", `${K} maison house home`, 210, 190,
    fillp("M 105 20 L 196 100 H 168 V 176 H 42 V 100 H 14 Z") +
    eo("M 82 176 V 116 H 128 V 176 Z", `opacity="0.4"`));
  add("objects", "car0", "Voiture", `${K} voiture car auto`, 220, 150,
    fillp("M 16 108 L 30 74 C 36 58 50 50 66 50 H 150 C 166 50 180 60 188 74 L 204 108 V 128 H 16 Z") +
    op("M 60 54 L 52 82 H 104 V 54 Z M 116 54 V 82 H 172 L 158 60 C 154 56 148 54 144 54 Z", 0.35) +
    `<circle cx="62" cy="128" r="20" fill="${C}"/><circle cx="158" cy="128" r="20" fill="${C}"/>` + opc(62, 128, 8, 0.4) + opc(158, 128, 8, 0.4));
  add("objects", "plane0", "Avion", `${K} avion plane voyage`, 220, 200,
    fillp("M 108 12 C 96 12 90 30 90 58 V 88 L 20 132 V 152 L 90 130 V 168 L 66 186 V 198 L 108 188 L 150 198 V 186 L 126 168 V 130 L 196 152 V 132 L 126 88 V 58 C 126 30 120 12 108 12 Z"));
  add("objects", "boat0", "Bateau", `${K} bateau voilier boat mer`, 210, 210,
    fillp("M 20 150 H 190 L 168 196 H 42 Z") +
    fillp("M 104 20 L 104 140 L 30 140 Z") + fillp("M 116 40 L 116 140 L 176 140 Z", `opacity="0.6"`) +
    stroke("M 104 20 V 150", 5, `opacity="0.5"`));
  add("objects", "pencil0", "Crayon", `${K} crayon pencil dessin`, 200, 200,
    fillp("M 150 20 L 180 50 L 74 156 L 34 166 L 44 126 Z") +
    stroke("M 132 40 L 160 68", 5, `opacity="0.5"`) +
    fillp("M 44 126 L 34 166 L 74 156 Z", `opacity="0.5"`));
  add("objects", "brush0", "Pinceau", `${K} pinceau brush peinture`, 180, 210,
    stroke("M 90 200 C 60 200 40 180 40 150 L 90 120 L 140 150 C 140 180 120 200 90 200 Z", 0) +
    fillp("M 90 196 C 64 196 48 178 48 152 L 90 126 L 132 152 C 132 178 116 196 90 196 Z") +
    fillp("M 60 130 L 90 20 L 120 130 Z", `opacity="0.6"`) + stroke("M 90 20 V 118", 6, `opacity="0.5"`));
  add("objects", "palette0", "Palette", `${K} palette peinture couleur art`, 210, 190,
    eo("M 105 16 C 40 16 12 66 20 116 C 26 154 62 172 92 160 C 104 156 100 140 108 134 C 120 126 138 138 156 130 C 186 116 196 60 158 34 C 142 22 124 16 105 16 Z" + holeC(72, 132, 14)) +
    opc(56, 70, 12, 0.5) + opc(102, 52, 12, 0.5) + opc(150, 74, 12, 0.5) + opc(154, 108, 11, 0.5));
  add("objects", "scissors0", "Ciseaux", `${K} ciseaux scissors couper`, 200, 200,
    `<circle cx="46" cy="52" r="24" fill="none" stroke="${C}" stroke-width="9"/><circle cx="46" cy="148" r="24" fill="none" stroke="${C}" stroke-width="9"/>` +
    stroke("M 66 66 L 180 150 M 66 134 L 180 50", 9) + `<circle cx="104" cy="100" r="7" fill="${C}"/>`);
  add("objects", "briefcase0", "Mallette", `${K} mallette sac travail briefcase`, 210, 180,
    stroke("M 74 50 V 34 A 10 10 0 0 1 84 24 H 126 A 10 10 0 0 1 136 34 V 50", 9) +
    fillp("M 22 50 H 188 V 158 H 22 Z") + eo("M 84 92 H 126 V 116 H 84 Z", `opacity="0.4"`));
  add("objects", "bag0", "Sac", `${K} sac shopping panier bag`, 190, 210,
    stroke("M 66 66 V 48 A 30 30 0 0 1 126 48 V 66", 9) +
    fillp("M 30 66 H 160 L 150 194 H 40 Z") + stroke("M 66 92 V 78 M 126 92 V 78", 6, `opacity="0.5"`));
  add("objects", "watch0", "Montre", `${K} montre watch temps`, 170, 210,
    fillp("M 60 14 H 110 L 118 58 H 52 Z M 52 152 H 118 L 110 196 H 60 Z", `opacity="0.6"`) +
    `<circle cx="85" cy="105" r="52" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 85 74 V 105 L 108 118", 7));
  add("objects", "bulb1", "Ampoule déco", `${K} ampoule lampe idée`, 170, 210,
    stroke("M 85 18 A 56 56 0 0 1 112 122 L 108 146 H 62 L 58 122 A 56 56 0 0 1 85 18 Z", 9) +
    stroke("M 68 62 A 22 28 0 0 1 80 42", 5, `opacity="0.4"`) +
    stroke("M 64 162 H 106 M 70 180 H 100", 8));
  add("objects", "phone1", "Smartphone", `${K} smartphone téléphone mobile`, 130, 210,
    stroke("M 34 14 H 96 A 12 12 0 0 1 108 26 V 184 A 12 12 0 0 1 96 196 H 34 A 12 12 0 0 1 22 184 V 26 A 12 12 0 0 1 34 14 Z", 8) +
    stroke("M 22 44 H 108 M 22 166 H 108", 5, `opacity="0.4"`) +
    `<circle cx="65" cy="181" r="7" fill="none" stroke="${C}" stroke-width="4" opacity="0.5"/>`);
  add("objects", "cup0", "Trophée coupe", `${K} coupe gobelet mug tasse`, 190, 210,
    stroke("M 50 40 H 140 V 92 A 45 45 0 0 1 50 92 Z", 9) + stroke("M 140 52 H 168 A 24 24 0 0 1 140 96", 8) +
    stroke("M 95 136 V 160 M 66 186 H 124", 9));
})();

/* ── 16. Météo & ciel ── */
(() => {
  const K = "météo ciel weather temps";
  const cloud = (extra = "") => fillp("M 52 130 A 30 30 0 0 1 46 72 A 40 40 0 0 1 120 52 A 34 34 0 0 1 178 74 A 30 30 0 0 1 172 130 Z", extra);
  add("weather", "cloud0", "Nuage", `${K} nuage cloud`, 220, 150, cloud());
  add("weather", "cloudsun0", "Éclaircie", `${K} nuage soleil éclaircie`, 220, 180,
    (() => { let g = `<circle cx="150" cy="58" r="30" fill="${C}" opacity="0.6"/>`;
      for (let k = 0; k < 8; k++) { const [x1, y1] = polar(150, 58, 38, k * 45); const [x2, y2] = polar(150, 58, 52, k * 45); g += stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 5, `opacity="0.6"`); }
      return g; })() +
    fillp("M 44 158 A 28 28 0 0 1 38 104 A 38 38 0 0 1 108 84 A 32 32 0 0 1 164 106 A 28 28 0 0 1 158 158 Z"));
  add("weather", "rain0", "Pluie", `${K} pluie averse rain`, 220, 200,
    cloud() + stroke("M 60 138 L 50 176 M 105 138 L 95 176 M 150 138 L 140 176", 7, `opacity="0.7"`));
  add("weather", "snow0", "Neige", `${K} neige flocon snow`, 220, 200,
    cloud() + Array.from({ length: 3 }, (_, k) => opc(58 + k * 46, 168, 8, 0.7)).join(""));
  add("weather", "storm0", "Orage", `${K} orage éclair storm`, 220, 200,
    cloud() + fillp("M 108 132 L 78 180 H 100 L 88 200 L 132 160 H 108 L 122 132 Z", `opacity="0.85"`));
  add("weather", "rainbow0", "Arc-en-ciel", `${K} arc-en-ciel rainbow`, 220, 140,
    [0, 1, 2, 3].map((k) => `<path d="M ${20 + k * 14} 130 A ${90 - k * 14} ${90 - k * 14} 0 0 1 ${200 - k * 14} 130" fill="none" stroke="${C}" stroke-width="10" opacity="${1 - k * 0.2}"/>`).join(""));
  add("weather", "wind0", "Vent", `${K} vent brise wind`, 220, 160,
    stroke("M 20 52 H 130 A 22 22 0 1 0 108 30", 10) + stroke("M 20 96 H 168 A 24 24 0 1 1 144 120", 10, `opacity="0.75"`) + stroke("M 20 138 H 104 A 18 18 0 1 0 86 120", 10, `opacity="0.55"`));
  add("weather", "tornado0", "Tornade", `${K} tornade tourbillon tornado`, 200, 210,
    stroke("M 26 34 H 174 M 40 62 H 166 M 56 90 H 150 M 72 118 H 128 M 88 146 H 108", 10) +
    stroke("M 108 146 C 110 176 96 196 82 204", 9, `opacity="0.7"`));
  add("weather", "thermometer0", "Thermomètre", `${K} thermomètre température`, 120, 220,
    stroke("M 60 24 V 150 A 30 30 0 1 0 60 150 Z", 0) +
    stroke("M 60 22 V 150", 10) + `<circle cx="60" cy="180" r="26" fill="none" stroke="${C}" stroke-width="10"/>` +
    `<circle cx="60" cy="180" r="12" fill="${C}"/>` + fillp("M 55 120 H 65 V 178 H 55 Z", `opacity="0.6"`));
  add("weather", "moonstar0", "Nuit étoilée", `${K} lune étoile nuit nightsky`, 200, 200,
    fillp("M 132 22 A 82 82 0 1 0 132 178 A 82 82 0 0 1 132 22 Z") +
    op(starPts(56, 56, 4, 16, 6), 0.7) + op(starPts(150, 150, 4, 12, 4), 0.6));
  add("weather", "droplet0", "Goutte", `${K} goutte eau humidité`, 150, 200,
    fillp("M 75 8 C 108 58 130 90 130 128 A 55 55 0 0 1 20 128 C 20 90 42 58 75 8 Z") +
    stroke("M 96 126 A 22 22 0 0 1 74 148", 5, `opacity="0.4"`));
})();

/* ── 17. Sport & loisirs ── */
(() => {
  const K = "sport loisir jeu";
  add("sport", "soccer0", "Ballon foot", `${K} football ballon soccer`, 200, 200,
    `<circle cx="100" cy="100" r="86" fill="${C}"/>` +
    op(polyPts(100, 100, 5, 34), 0.35) +
    [0, 1, 2, 3, 4].map((k) => { const [x, y] = polar(100, 100, 62, -90 + k * 72); return stroke(`M 100 100 L ${N(x)} ${N(y)}`, 6, `opacity="0.35"`); }).join(""));
  add("sport", "basket0", "Ballon basket", `${K} basketball ballon`, 200, 200,
    `<circle cx="100" cy="100" r="86" fill="${C}"/>` +
    stroke("M 14 100 H 186 M 100 14 V 186 M 40 40 C 80 80 80 120 40 160 M 160 40 C 120 80 120 120 160 160", 6, `opacity="0.4"`));
  add("sport", "tennis0", "Balle tennis", `${K} tennis balle`, 200, 200,
    `<circle cx="100" cy="100" r="86" fill="${C}"/>` +
    stroke("M 40 30 C 78 68 78 132 40 170 M 160 30 C 122 68 122 132 160 170", 7, `opacity="0.4"`));
  add("sport", "football0", "Ballon rugby", `${K} rugby football américain`, 220, 160,
    `<ellipse cx="110" cy="80" rx="94" ry="52" fill="${C}"/>` +
    stroke("M 70 80 H 150 M 88 68 V 92 M 108 66 V 94 M 128 68 V 92", 5, `opacity="0.4"`));
  add("sport", "baseball0", "Balle baseball", `${K} baseball balle`, 200, 200,
    `<circle cx="100" cy="100" r="86" fill="${C}"/>` +
    stroke("M 44 32 C 72 68 72 132 44 168 M 156 32 C 128 68 128 132 156 168", 5, `opacity="0.4"`) +
    Array.from({ length: 6 }, (_, k) => stroke(`M 52 ${44 + k * 22} l 10 -6 M 148 ${44 + k * 22} l -10 -6`, 3, `opacity="0.4"`)).join(""));
  add("sport", "dumbbell0", "Haltère", `${K} haltère musculation dumbbell fitness`, 220, 130,
    fillp("M 14 40 H 40 V 90 H 14 Z M 46 30 H 70 V 100 H 46 Z") +
    fillp("M 206 40 H 180 V 90 H 206 Z M 174 30 H 150 V 100 H 174 Z") +
    fillp("M 70 56 H 150 V 74 H 70 Z"));
  add("sport", "whistle0", "Sifflet", `${K} sifflet arbitre whistle`, 210, 160,
    fillp("M 60 60 H 150 A 44 44 0 1 1 106 104 H 60 Z") + `<circle cx="60" cy="82" r="8" fill="none" stroke="${C}" stroke-width="6" opacity="0.5"/>` +
    stroke("M 150 60 A 40 40 0 0 1 190 24", 8));
  add("sport", "goal0", "But", `${K} but cage football goal`, 220, 150,
    stroke("M 20 130 V 30 H 200 V 130", 9) +
    stroke("M 50 30 V 130 M 80 30 V 130 M 110 30 V 130 M 140 30 V 130 M 170 30 V 130 M 20 55 H 200 M 20 82 H 200 M 20 108 H 200", 3, `opacity="0.4"`));
  add("sport", "bike0", "Vélo", `${K} vélo bicyclette bike cyclisme`, 230, 160,
    `<circle cx="52" cy="112" r="38" fill="none" stroke="${C}" stroke-width="8"/><circle cx="178" cy="112" r="38" fill="none" stroke="${C}" stroke-width="8"/>` +
    stroke("M 52 112 L 96 112 L 130 56 L 158 112 M 96 112 L 130 112 M 178 112 L 130 56 M 116 56 H 144 M 88 112 L 78 82 H 100", 7));
  add("sport", "medal1", "Médaille sport", `${K} médaille récompense sport`, 180, 210,
    fillp("M 44 8 H 86 L 96 60 H 56 Z M 136 8 H 94 L 84 60 H 124 Z", `opacity="0.55"`) +
    `<circle cx="90" cy="132" r="60" fill="none" stroke="${C}" stroke-width="10"/>` + `<circle cx="90" cy="132" r="42" fill="${C}" opacity="0.25"/>` +
    op(starPts(90, 132, 5, 30, 13), 1));
  add("sport", "flagp0", "Drapeau golf", `${K} golf drapeau trou flag`, 180, 210,
    stroke("M 48 196 V 20", 8) + fillp("M 48 24 L 150 52 L 48 80 Z") +
    `<ellipse cx="90" cy="196" rx="52" ry="12" fill="${C}" opacity="0.35"/>`);
  add("sport", "dart0", "Cible fléchette", `${K} fléchette dart cible`, 200, 200,
    [86, 66, 46, 26].map((r, k) => `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${C}" stroke-width="8" opacity="${1 - k * 0.15}"/>`).join("") + `<circle cx="100" cy="100" r="10" fill="${C}"/>`);
})();

/* ── 18. Nourriture (variantes & compléments) ── */
(() => {
  const K = "nourriture food cuisine repas fruit legume";
  add("food", "apple1", "Pomme ronde", `${K} pomme apple`, 200, 200,
    fillp("M 100 58 C 74 34 40 46 36 84 C 32 124 56 176 100 184 C 144 176 168 124 164 84 C 160 46 126 34 100 58 Z") + stroke("M 100 54 C 104 34 112 26 126 24", 7), "#f43f5e");
  add("food", "apple2", "Pomme croquée", `${K} pomme apple mordue trou bite`, 200, 200,
    eo("M 100 60 C 78 42 46 48 40 84 C 34 124 58 176 100 184 C 142 176 166 124 160 84 C 156 48 126 40 100 60 Z" + holeC(166, 92, 30)) + stroke("M 100 56 C 104 38 112 30 126 28", 7), "#ef4444");
  add("food", "appleo0", "Pomme contour", `${K} pomme apple contour`, 200, 200,
    stroke("M 100 62 C 80 44 50 50 44 84 C 38 122 60 172 100 178 C 140 172 162 122 156 84 C 150 50 120 44 100 62 Z", 8) + stroke("M 100 58 C 104 40 112 32 126 30", 6), "#ef4444");
  add("food", "lemon0", "Citron", `${K} citron lemon agrume`, 210, 160,
    fillp("M 24 80 C 24 40 90 34 130 46 C 170 58 190 78 190 80 C 190 82 170 102 130 114 C 90 126 24 120 24 80 Z") + opc(150, 80, 8, 0.4), "#facc15");
  add("food", "lime0", "Citron vert", `${K} citron vert lime agrume`, 210, 160,
    fillp("M 24 80 C 24 40 90 34 130 46 C 170 58 190 78 190 80 C 190 82 170 102 130 114 C 90 126 24 120 24 80 Z"), "#84cc16");
  add("food", "orange1", "Orange", `${K} orange agrume fruit`, 200, 200,
    `<circle cx="100" cy="108" r="76" fill="${C}"/>` + opc(70, 78, 10, 0.35) + fillp("M 100 34 L 82 12 L 118 12 Z", `opacity="0.6"`), "#fb923c");
  add("food", "peach0", "Pêche", `${K} pêche peach fruit`, 200, 200,
    fillp("M 100 44 C 60 44 34 78 40 120 C 46 162 74 184 100 184 C 126 184 154 162 160 120 C 166 78 140 44 100 44 Z") + stroke("M 100 60 V 170", 4, `opacity="0.4"`) + op("M 108 40 C 128 26 150 32 150 52 C 130 58 112 50 108 40 Z", 0.55), "#fb7185");
  add("food", "plum0", "Prune", `${K} prune plum fruit`, 190, 200,
    fillp("M 95 40 C 52 40 30 80 36 120 C 42 164 72 184 95 184 C 118 184 148 164 154 120 C 160 80 138 40 95 40 Z") + stroke("M 95 54 V 172", 4, `opacity="0.35"`), "#a78bfa");
  add("food", "blueberry0", "Myrtille", `${K} myrtille blueberry baie`, 190, 190,
    `<circle cx="95" cy="104" r="70" fill="${C}"/>` + op(starPts(95, 74, 5, 16, 7), 0.4) + opc(70, 88, 9, 0.3), "#6366f1");
  add("food", "pineapple0", "Ananas", `${K} ananas pineapple fruit`, 170, 220,
    fillp("M 85 66 C 46 66 34 110 40 154 C 46 194 70 210 85 210 C 100 210 124 194 130 154 C 136 110 124 66 85 66 Z") +
    Array.from({ length: 5 }, (_, r) => Array.from({ length: 3 }, (_, c) => stroke(`M ${52 + c * 22} ${96 + r * 20} l 14 12 M ${66 + c * 22} ${84 + r * 20} l -14 12`, 3, `opacity="0.4"`)).join("")).join("") +
    fillp("M 85 66 C 70 40 60 22 40 12 C 58 14 74 26 85 40 C 96 26 112 14 130 12 C 110 22 100 40 85 66 Z", `opacity="0.8"`), "#facc15");
  add("food", "kiwi0", "Kiwi", `${K} kiwi fruit tranche`, 200, 200,
    `<circle cx="100" cy="100" r="84" fill="${C}"/>` + opc(100, 100, 68, 0.3) + `<circle cx="100" cy="100" r="16" fill="${C}" opacity="0.6"/>` +
    Array.from({ length: 12 }, (_, k) => opc(polar(100, 100, 46, k * 30)[0], polar(100, 100, 46, k * 30)[1], 4, 0.85)).join(""), "#84cc16");
  add("food", "coconut0", "Noix de coco", `${K} coco coconut fruit`, 200, 200,
    eo(`M 100 20 a 80 80 0 1 0 0.1 0 Z` + holeC(78, 78, 9) + holeC(122, 78, 9) + holeC(100, 108, 9)), "#a16207");
  add("food", "tomato0", "Tomate", `${K} tomate tomato legume`, 200, 200,
    `<circle cx="100" cy="114" r="72" fill="${C}"/>` + op(starPts(100, 52, 5, 30, 12), 0.7), "#ef4444");
  add("food", "chili0", "Piment", `${K} piment chili pepper epice`, 190, 210,
    fillp("M 60 40 C 50 70 70 96 96 110 C 140 134 150 180 120 200 C 150 172 148 128 108 100 C 84 84 70 66 76 44 Z") + stroke("M 60 40 C 54 26 66 20 80 26", 8, `opacity="0.7"`), "#ef4444");
  add("food", "corn0", "Maïs", `${K} maïs corn epi legume`, 160, 220,
    fillp("M 80 40 C 44 40 40 100 52 160 C 60 196 100 196 108 160 C 120 100 116 40 80 40 Z") +
    Array.from({ length: 6 }, (_, r) => Array.from({ length: 4 }, (_, c) => opc(56 + c * 16, 70 + r * 22, 6, 0.35)).join("")).join("") +
    op("M 80 44 C 60 24 44 20 30 22 C 44 40 56 52 80 60 M 80 44 C 100 24 116 20 130 22 C 116 40 104 52 80 60 Z", 0.6), "#fbbf24");
  add("food", "broccoli0", "Brocoli", `${K} brocoli broccoli legume`, 200, 210,
    fillp("M 100 200 L 78 130 H 122 Z", `opacity="0.7"`) +
    `<circle cx="70" cy="86" r="32" fill="${C}"/><circle cx="130" cy="86" r="32" fill="${C}"/><circle cx="100" cy="62" r="34" fill="${C}"/><circle cx="100" cy="108" r="30" fill="${C}"/>`, "#22c55e");
  add("food", "eggplant0", "Aubergine", `${K} aubergine eggplant legume`, 180, 220,
    fillp("M 130 60 C 160 90 156 150 118 186 C 84 218 40 206 34 168 C 28 130 58 96 96 78 C 112 70 122 66 130 60 Z") + op("M 118 58 C 110 40 96 34 82 36 C 90 54 104 62 122 66 Z M 130 58 C 138 44 152 42 162 46 C 152 60 140 62 128 62 Z", 0.6), "#a855f7");
  add("food", "pepper0", "Poivron", `${K} poivron pepper legume`, 200, 200,
    fillp("M 60 70 C 40 92 44 150 74 176 C 88 188 96 176 100 176 C 104 176 112 188 126 176 C 156 150 160 92 140 70 C 122 84 112 84 100 84 C 88 84 78 84 60 70 Z") + stroke("M 100 84 V 60 M 100 60 C 92 50 92 42 100 38", 8, `opacity="0.7"`), "#22c55e");
  add("food", "pumpkin0", "Citrouille", `${K} citrouille pumpkin courge`, 220, 190,
    `<ellipse cx="110" cy="110" rx="90" ry="70" fill="${C}"/>` + stroke("M 80 46 C 62 70 62 150 80 174 M 140 46 C 158 70 158 150 140 174 M 110 42 V 178", 6, `opacity="0.35"`) + stroke("M 110 42 C 108 28 116 20 128 20", 8, `opacity="0.7"`), "#f97316");
  add("food", "bread0", "Pain", `${K} pain bread miche boulangerie`, 220, 160,
    fillp("M 24 120 C 24 70 70 44 110 44 C 150 44 196 70 196 120 C 196 138 180 146 160 146 H 60 C 40 146 24 138 24 120 Z") + stroke("M 60 74 L 48 100 M 90 66 L 76 96 M 122 66 L 108 96 M 152 74 L 140 100", 6, `opacity="0.5"`), "#d97706");
  add("food", "cheese0", "Fromage", `${K} fromage cheese trou`, 220, 170,
    eo("M 20 150 L 30 70 L 200 60 L 190 150 Z" + holeC(70, 110, 12) + holeC(130, 96, 15) + holeC(160, 128, 10) + holeC(105, 132, 8)), "#facc15");
  add("food", "hotdog0", "Hot-dog", `${K} hotdog saucisse fast food`, 230, 130,
    fillp("M 18 66 C 18 44 42 40 60 40 H 170 C 188 40 212 44 212 66 C 212 88 188 92 170 92 H 60 C 42 92 18 88 18 66 Z") +
    fillp("M 40 58 H 190 C 200 58 200 74 190 74 H 40 C 30 74 30 58 40 58 Z", `opacity="0.6"`) + stroke("M 56 50 L 76 82 M 96 50 L 116 82 M 136 50 L 156 82", 5, `opacity="0.5"`), "#f59e0b");
  add("food", "fries0", "Frites", `${K} frites fries pomme de terre fast food`, 190, 210,
    fillp("M 40 100 H 150 L 138 196 H 52 Z") + stroke("M 60 96 V 40 M 82 96 V 26 M 104 96 V 32 M 126 96 V 44", 14, `opacity="0.7"`) + stroke("M 40 118 H 150", 5, `opacity="0.4"`), "#fbbf24");
  add("food", "popcorn0", "Popcorn", `${K} popcorn maïs cinema`, 190, 220,
    fillp("M 50 96 L 66 200 H 124 L 140 96 Z") + stroke("M 50 96 H 140", 5, `opacity="0.4"`) +
    [[70, 70], [100, 56], [130, 72], [84, 90], [116, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="18" fill="${C}"/>`).join(""), "#fbbf24");
  add("food", "pretzel0", "Bretzel", `${K} bretzel pretzel boulangerie`, 210, 200,
    stroke("M 60 50 C 20 90 40 160 105 160 C 170 160 190 90 150 50 C 120 20 96 70 105 110 C 114 150 150 150 150 150 M 105 110 C 96 150 60 150 60 150", 14), "#d97706");
  add("food", "lollipop0", "Sucette", `${K} sucette lollipop bonbon candy`, 170, 220,
    `<circle cx="85" cy="70" r="58" fill="${C}"/>` + stroke("M 85 70 m 0 -44 a 44 44 0 0 1 0 88 a 32 32 0 0 1 0 -64 a 22 22 0 0 1 0 44 a 12 12 0 0 1 0 -24", 6, `opacity="0.4"`) + stroke("M 85 128 V 210", 9), "#f472b6");
  add("food", "candy0", "Bonbon", `${K} bonbon candy sucrerie`, 220, 130,
    `<ellipse cx="110" cy="65" rx="46" ry="40" fill="${C}"/>` + fillp("M 64 65 L 22 34 L 34 65 L 22 96 Z") + fillp("M 156 65 L 198 34 L 186 65 L 198 96 Z") + stroke("M 92 46 L 128 84 M 128 46 L 92 84", 5, `opacity="0.4"`), "#ec4899");
  add("food", "choco0", "Chocolat", `${K} chocolat chocolate tablette`, 200, 200,
    fillp("M 30 30 H 170 V 170 H 30 Z") + stroke("M 100 30 V 170 M 30 100 H 170 M 65 30 V 170 M 135 30 V 170 M 30 65 H 170 M 30 135 H 170", 5, `opacity="0.35"`), "#a16207");
  add("food", "macaron0", "Macaron", `${K} macaron patisserie`, 210, 160,
    fillp("M 24 66 C 24 40 78 30 105 30 C 132 30 186 40 186 66 C 186 78 160 84 105 84 C 50 84 24 78 24 66 Z") +
    fillp("M 24 94 C 24 120 78 130 105 130 C 132 130 186 120 186 94 C 186 82 160 76 105 76 C 50 76 24 82 24 94 Z") +
    fillp("M 30 78 H 180 V 88 H 30 Z", `opacity="0.55"`), "#f9a8d4");
  add("food", "cocktail0", "Cocktail", `${K} cocktail boisson verre`, 190, 220,
    stroke("M 30 40 H 160 L 95 108 Z", 8) + stroke("M 95 108 V 190 M 60 196 H 130", 8) + `<circle cx="132" cy="58" r="12" fill="${C}"/>` + stroke("M 132 58 L 150 32", 5), "#f472b6");
})();

/* ── 19. Animaux (variantes & compléments) ── */
(() => {
  const K = "animal animaux nature";
  add("animals", "cato0", "Chat contour", `${K} chat cat contour`, 200, 200,
    stroke("M 46 62 L 62 22 L 92 58 M 154 62 L 138 22 L 108 58", 8) + `<circle cx="100" cy="118" r="62" fill="none" stroke="${C}" stroke-width="8"/>` + `<circle cx="78" cy="108" r="7" fill="${C}"/><circle cx="122" cy="108" r="7" fill="${C}"/>` + stroke("M 100 122 V 132 M 100 132 Q 88 142 80 136 M 100 132 Q 112 142 120 136", 5), "#fbbf24");
  add("animals", "duck0", "Canard", `${K} canard duck oiseau`, 210, 190,
    `<circle cx="140" cy="70" r="40" fill="${C}"/>` + fillp("M 178 74 L 208 70 L 178 88 Z") + `<circle cx="150" cy="60" r="6" fill="none" stroke="${C}" stroke-width="4"/>` +
    fillp("M 30 130 C 30 100 70 92 120 96 C 150 98 168 118 156 146 C 140 176 60 178 40 152 C 34 144 30 138 30 130 Z"), "#facc15");
  add("animals", "frog0", "Grenouille", `${K} grenouille frog`, 210, 190,
    `<circle cx="60" cy="52" r="26" fill="${C}"/><circle cx="150" cy="52" r="26" fill="${C}"/>` + `<circle cx="60" cy="52" r="10" fill="none" stroke="${C}" stroke-width="5"/><circle cx="150" cy="52" r="10" fill="none" stroke="${C}" stroke-width="5"/>` +
    fillp("M 105 60 C 55 60 28 96 34 134 C 40 168 170 168 176 134 C 182 96 155 60 105 60 Z") + stroke("M 70 140 Q 105 160 140 140", 7), "#22c55e");
  add("animals", "pig0", "Cochon", `${K} cochon pig porc`, 200, 190,
    `<circle cx="100" cy="106" r="72" fill="${C}"/>` + fillp("M 44 54 L 40 84 L 66 74 Z M 156 54 L 160 84 L 134 74 Z") + `<ellipse cx="100" cy="120" rx="30" ry="22" fill="${C}" opacity="0.5"/>` + `<circle cx="92" cy="120" r="5" fill="${C}"/><circle cx="108" cy="120" r="5" fill="${C}"/>` + `<circle cx="80" cy="88" r="7" fill="${C}"/><circle cx="120" cy="88" r="7" fill="${C}"/>`, "#f9a8d4");
  add("animals", "cow0", "Vache", `${K} vache cow`, 210, 190,
    `<circle cx="105" cy="104" r="72" fill="${C}"/>` + fillp("M 40 70 C 22 56 20 92 44 100 Z M 170 70 C 188 56 190 92 166 100 Z") + `<ellipse cx="105" cy="128" rx="34" ry="26" fill="${C}" opacity="0.45"/>` + `<circle cx="86" cy="96" r="7" fill="${C}"/><circle cx="124" cy="96" r="7" fill="${C}"/>` + opc(70, 74, 12, 0.4) + opc(140, 82, 10, 0.4), "#94a3b8");
  add("animals", "sheep0", "Mouton", `${K} mouton sheep brebis`, 220, 190,
    fillp("M 60 110 A 30 30 0 0 1 66 62 A 34 34 0 0 1 130 52 A 32 32 0 0 1 186 74 A 30 30 0 0 1 178 130 A 34 34 0 0 1 120 156 A 34 34 0 0 1 60 110 Z") +
    `<ellipse cx="60" cy="120" rx="26" ry="30" fill="${C}"/>` + `<circle cx="52" cy="112" r="5" fill="none" stroke="${C}" stroke-width="3"/><circle cx="68" cy="112" r="5" fill="none" stroke="${C}" stroke-width="3"/>`, "#e2e8f0");
  add("animals", "elephant0", "Éléphant", `${K} éléphant elephant`, 220, 200,
    `<circle cx="110" cy="96" r="66" fill="${C}"/>` + fillp("M 44 70 C 10 70 10 140 50 140 C 60 140 62 96 60 84 Z M 176 70 C 210 70 210 140 170 140 C 160 140 158 96 160 84 Z", `opacity="0.7"`) +
    fillp("M 100 150 C 96 180 78 194 66 200 C 84 196 100 186 108 168 Z") + `<circle cx="88" cy="88" r="7" fill="${C}"/><circle cx="132" cy="88" r="7" fill="${C}"/>`, "#94a3b8");
  add("animals", "lion0", "Lion", `${K} lion félin`, 210, 210,
    Array.from({ length: 12 }, (_, k) => { const [x, y] = polar(105, 105, 92, k * 30); return `<circle cx="${N(x)}" cy="${N(y)}" r="20" fill="${C}" opacity="0.5"/>`; }).join("") +
    `<circle cx="105" cy="105" r="62" fill="${C}"/>` + `<circle cx="86" cy="96" r="7" fill="${C}"/><circle cx="124" cy="96" r="7" fill="${C}"/>` + fillp("M 105 112 L 94 126 H 116 Z") + stroke("M 105 126 V 138", 5), "#f59e0b");
  add("animals", "monkey0", "Singe", `${K} singe monkey`, 200, 200,
    `<circle cx="48" cy="90" r="24" fill="${C}"/><circle cx="152" cy="90" r="24" fill="${C}"/>` + opc(48, 90, 12, 0.4) + opc(152, 90, 12, 0.4) +
    `<circle cx="100" cy="104" r="66" fill="${C}"/>` + `<ellipse cx="100" cy="122" rx="42" ry="34" fill="${C}" opacity="0.35"/>` + `<circle cx="82" cy="96" r="7" fill="${C}"/><circle cx="118" cy="96" r="7" fill="${C}"/>` + `<circle cx="90" cy="128" r="4" fill="${C}"/><circle cx="110" cy="128" r="4" fill="${C}"/>`, "#a16207");
  add("animals", "mouse0", "Souris", `${K} souris mouse rongeur`, 200, 190,
    `<circle cx="60" cy="58" r="30" fill="${C}"/><circle cx="140" cy="58" r="30" fill="${C}"/>` + opc(60, 58, 15, 0.4) + opc(140, 58, 15, 0.4) +
    `<circle cx="100" cy="112" r="58" fill="${C}"/>` + `<circle cx="84" cy="104" r="6" fill="${C}"/><circle cx="116" cy="104" r="6" fill="${C}"/>` + `<circle cx="100" cy="126" r="7" fill="${C}"/>` + stroke("M 158 150 Q 190 150 186 120", 6), "#cbd5e1");
  add("animals", "hedgehog0", "Hérisson", `${K} hérisson hedgehog`, 220, 180,
    Array.from({ length: 16 }, (_, k) => stroke(`M ${40 + k * 9} 120 L ${34 + k * 9} ${70 + (k % 3) * 8}`, 6)).join("") +
    fillp("M 130 120 C 170 120 196 108 200 130 C 196 152 160 158 130 150 Z") + `<circle cx="192" cy="128" r="6" fill="${C}"/>` + `<circle cx="176" cy="122" r="4" fill="${C}"/>`, "#a16207");
  add("animals", "snake0", "Serpent", `${K} serpent snake reptile`, 210, 210,
    stroke("M 40 40 C 120 40 120 100 60 100 C 20 100 20 160 100 160 C 170 160 180 100 180 100", 14) + `<circle cx="184" cy="98" r="4" fill="${C}"/>` + stroke("M 188 96 L 200 90 M 188 100 L 200 106", 3), "#4ade80");
  add("animals", "spider0", "Araignée", `${K} araignée spider insecte`, 220, 200,
    `<circle cx="110" cy="110" r="40" fill="${C}"/>` + `<circle cx="110" cy="72" r="22" fill="${C}"/>` +
    stroke("M 72 96 L 24 70 M 72 110 L 20 110 M 72 124 L 24 150 M 148 96 L 196 70 M 148 110 L 200 110 M 148 124 L 196 150", 6) + `<circle cx="102" cy="70" r="4" fill="${C}"/><circle cx="118" cy="70" r="4" fill="${C}"/>`, "#818cf8");
  add("animals", "crab0", "Crabe", `${K} crabe crab mer`, 220, 180,
    `<ellipse cx="110" cy="106" rx="66" ry="44" fill="${C}"/>` + `<circle cx="88" cy="96" r="7" fill="${C}"/><circle cx="132" cy="96" r="7" fill="${C}"/>` +
    stroke("M 44 96 C 20 90 12 70 24 56 M 176 96 C 200 90 208 70 196 56", 8) + fillp("M 24 56 L 8 48 L 20 40 Z M 196 56 L 212 48 L 200 40 Z") +
    stroke("M 50 132 L 26 152 M 74 144 L 58 168 M 146 144 L 162 168 M 170 132 L 194 152", 6), "#f87171");
  add("animals", "octopus0", "Poulpe", `${K} poulpe octopus pieuvre mer`, 210, 210,
    fillp("M 105 30 C 65 30 40 62 40 102 V 120 H 170 V 102 C 170 62 145 30 105 30 Z") +
    stroke("M 50 120 C 40 160 28 176 20 184 M 74 122 C 70 166 60 184 52 194 M 105 124 V 196 M 136 122 C 140 166 150 184 158 194 M 160 120 C 170 160 182 176 190 184", 10) +
    `<circle cx="84" cy="86" r="8" fill="${C}"/><circle cx="126" cy="86" r="8" fill="${C}"/>`, "#f472b6");
  add("animals", "dolphin0", "Dauphin", `${K} dauphin dolphin mer`, 220, 190,
    fillp("M 20 150 C 40 90 110 60 180 66 C 160 46 150 34 150 34 C 200 40 206 96 200 120 C 196 140 170 148 152 138 C 120 120 70 130 46 168 C 40 176 26 168 20 150 Z") +
    fillp("M 60 150 L 40 186 L 76 172 Z", `opacity="0.7"`) + `<circle cx="176" cy="92" r="6" fill="${C}"/>`, "#38bdf8");
  add("animals", "shark0", "Requin", `${K} requin shark mer`, 230, 170,
    fillp("M 14 96 C 40 62 110 54 176 70 C 158 46 150 34 150 34 C 190 44 206 78 210 96 C 206 114 190 148 150 158 C 150 158 158 146 176 122 C 110 138 40 130 14 96 Z") +
    fillp("M 96 40 L 100 12 L 120 44 Z", `opacity="0.75"`) + `<circle cx="52" cy="90" r="6" fill="${C}"/>` + stroke("M 30 100 Q 60 108 90 100", 4, `opacity="0.5"`), "#94a3b8");
  add("animals", "starfish0", "Étoile de mer", `${K} étoile de mer starfish`, 200, 200,
    fillp(starPts(100, 104, 5, 90, 40)) + Array.from({ length: 5 }, (_, k) => { const [x, y] = polar(100, 104, 50, -90 + k * 72); return opc(x, y, 6, 0.4); }).join("") + opc(100, 104, 10, 0.4), "#fb923c");
  add("animals", "shell0", "Coquillage", `${K} coquillage shell mer`, 200, 190,
    fillp("M 100 20 C 40 20 16 90 100 176 C 184 90 160 20 100 20 Z") + stroke("M 100 24 V 172 M 60 46 C 68 100 82 140 100 172 M 140 46 C 132 100 118 140 100 172 M 34 92 C 60 120 80 150 100 172 M 166 92 C 140 120 120 150 100 172", 5, `opacity="0.4"`), "#f9a8d4");
  add("animals", "jellyfish0", "Méduse", `${K} méduse jellyfish mer`, 190, 220,
    fillp("M 30 110 C 30 56 74 26 95 26 C 116 26 160 56 160 110 C 160 120 30 120 30 110 Z") + opc(70, 84, 10, 0.35) + opc(120, 78, 12, 0.35) +
    stroke("M 46 116 C 40 160 52 190 46 210 M 74 118 C 72 164 82 190 76 212 M 95 120 V 214 M 116 118 C 118 164 108 190 114 212 M 144 116 C 150 160 138 190 144 210", 7), "#c084fc");
  add("animals", "butterflyo0", "Papillon contour", `${K} papillon butterfly contour`, 220, 200,
    stroke("M 104 100 C 60 40 20 44 24 88 C 26 120 66 128 104 108 Z", 7) + stroke("M 104 100 C 148 40 188 44 184 88 C 182 120 142 128 104 108 Z", 7) +
    stroke("M 104 100 C 66 120 34 140 46 172 C 58 196 96 168 104 120 Z", 7) + stroke("M 104 100 C 142 120 174 140 162 172 C 150 196 112 168 104 120 Z", 7) +
    stroke("M 104 74 V 150", 8) + stroke("M 104 74 C 92 56 82 50 74 48 M 104 74 C 116 56 126 50 134 48", 5), "#e879f9");
  add("animals", "dino0", "Dinosaure", `${K} dinosaure dino brontosaure`, 230, 200,
    fillp("M 20 150 C 20 120 44 110 60 112 C 56 70 84 40 120 40 C 168 40 196 78 196 120 C 196 130 178 132 172 122 C 160 100 138 90 120 90 C 96 90 84 108 88 130 C 92 150 96 160 96 176 H 74 C 74 160 70 148 60 140 C 50 148 46 162 46 176 H 24 C 24 166 22 158 20 150 Z") +
    `<circle cx="150" cy="72" r="6" fill="${C}"/>`, "#4ade80");
  add("animals", "penguin1", "Manchot", `${K} manchot penguin oiseau`, 180, 220,
    fillp("M 90 16 C 44 16 32 84 34 134 C 36 184 58 208 90 208 C 122 208 144 184 146 134 C 148 84 136 16 90 16 Z") +
    `<circle cx="72" cy="80" r="7" fill="${C}"/><circle cx="108" cy="80" r="7" fill="${C}"/>` + fillp("M 90 92 L 76 104 L 90 112 L 104 104 Z") +
    fillp("M 32 130 C 12 120 8 150 30 156 Z M 148 130 C 168 120 172 150 150 156 Z", `opacity="0.7"`), "#334155");
})();

/* ── 20. Objets (variantes & compléments) ── */
(() => {
  const K = "objet objets";
  add("objects", "tv0", "Télé", `${K} télé tv écran television`, 220, 190,
    stroke("M 20 40 H 200 V 150 H 20 Z", 8) + op("M 36 56 H 184 V 134 H 36 Z", 0.3) + stroke("M 80 170 L 100 150 M 140 170 L 120 150", 8), "#818cf8");
  add("objects", "laptop0", "Ordinateur", `${K} ordinateur laptop pc`, 230, 170,
    stroke("M 44 30 H 186 V 118 H 44 Z", 8) + op("M 58 44 H 172 V 104 H 58 Z", 0.3) + fillp("M 18 118 H 212 L 200 148 H 30 Z"), "#60a5fa");
  add("objects", "headphones0", "Casque", `${K} casque audio headphones musique`, 200, 200,
    stroke("M 34 116 V 96 A 66 66 0 0 1 166 96 V 116", 10) + fillp("M 22 112 H 52 V 172 H 22 Z") + fillp("M 148 112 H 178 V 172 H 148 Z"), "#c084fc");
  add("objects", "guitar0", "Guitare", `${K} guitare guitar musique`, 180, 220,
    stroke("M 110 20 V 120", 8) + fillp("M 90 20 H 130 V 40 H 90 Z", `opacity="0.7"`) + `<circle cx="88" cy="150" r="46" fill="none" stroke="${C}" stroke-width="10"/><circle cx="122" cy="176" r="30" fill="none" stroke="${C}" stroke-width="10"/>` + `<circle cx="100" cy="158" r="12" fill="${C}"/>`, "#f59e0b");
  add("objects", "mic0", "Micro", `${K} micro microphone chant`, 160, 220,
    stroke("M 80 20 A 30 30 0 0 1 110 50 V 96 A 30 30 0 0 1 50 96 V 50 A 30 30 0 0 1 80 20 Z", 0) + fillp("M 80 18 A 32 32 0 0 1 112 50 V 96 A 32 32 0 0 1 48 96 V 50 A 32 32 0 0 1 80 18 Z") + stroke("M 56 56 H 104 M 56 72 H 104 M 56 88 H 104", 4, `opacity="0.4"`) + stroke("M 34 92 A 46 46 0 0 0 126 92 M 80 138 V 176 M 52 196 H 108", 8), "#f472b6");
  add("objects", "glasses0", "Lunettes", `${K} lunettes glasses vue`, 230, 120,
    `<circle cx="62" cy="66" r="40" fill="none" stroke="${C}" stroke-width="9"/><circle cx="168" cy="66" r="40" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 102 60 Q 115 48 128 60 M 22 52 L 6 34 M 208 52 L 224 34", 9), "#38bdf8");
  add("objects", "sunglasses0", "Solaires", `${K} lunettes soleil solaires sunglasses`, 230, 120,
    fillp("M 16 44 H 108 V 60 A 34 34 0 0 1 40 66 V 52 Z") + fillp("M 214 44 H 122 V 60 A 34 34 0 0 0 190 66 V 52 Z") + stroke("M 108 50 Q 115 42 122 50", 8), "#fbbf24");
  add("objects", "hat0", "Chapeau", `${K} chapeau hat haut de forme`, 200, 200,
    fillp("M 60 40 H 140 V 140 H 60 Z") + fillp("M 24 140 H 176 V 162 H 24 Z") + stroke("M 60 116 H 140", 14, `opacity="0.5"`), "#6366f1");
  add("objects", "cap0", "Casquette", `${K} casquette cap chapeau`, 220, 150,
    fillp("M 40 100 A 70 70 0 0 1 180 100 Z") + fillp("M 180 100 H 210 A 30 16 0 0 1 180 116 Z") + `<circle cx="110" cy="34" r="8" fill="${C}"/>`, "#ef4444");
  add("objects", "tshirt0", "T-shirt", `${K} tshirt vêtement habit`, 220, 200,
    fillp("M 78 24 L 40 44 L 20 84 L 52 104 L 62 88 V 184 H 158 V 88 L 168 104 L 200 84 L 180 44 L 142 24 C 132 44 88 44 78 24 Z"), "#2dd4bf");
  add("objects", "dress0", "Robe", `${K} robe dress vêtement`, 190, 220,
    fillp("M 74 20 L 50 44 L 74 70 L 62 96 L 30 196 H 160 L 128 96 L 116 70 L 140 44 L 116 20 C 108 34 82 34 74 20 Z"), "#ec4899");
  add("objects", "shoe0", "Chaussure", `${K} chaussure shoe basket sneaker`, 230, 150,
    fillp("M 20 120 V 84 C 20 78 26 76 32 78 L 70 92 L 96 56 C 100 50 108 52 110 58 L 118 88 C 160 92 206 104 210 128 V 132 H 20 Z") + stroke("M 96 60 L 110 84 M 118 88 L 100 118", 4, `opacity="0.4"`), "#f87171");
  add("objects", "clock1", "Réveil", `${K} réveil alarme horloge clock`, 200, 210,
    `<circle cx="100" cy="120" r="76" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 100 76 V 122 L 132 138", 9) + stroke("M 44 44 L 66 66 M 156 44 L 134 66", 10) + `<circle cx="44" cy="40" r="18" fill="none" stroke="${C}" stroke-width="9"/><circle cx="156" cy="40" r="18" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 70 194 L 54 206 M 130 194 L 146 206", 9), "#fb923c");
  add("objects", "hourglass0", "Sablier", `${K} sablier hourglass temps`, 160, 220,
    stroke("M 30 20 H 130 M 30 200 H 130", 10) + fillp("M 40 24 H 120 C 120 70 84 96 80 110 C 76 96 40 70 40 24 Z") + fillp("M 80 110 C 84 124 120 150 120 196 H 40 C 40 150 76 124 80 110 Z", `opacity="0.6"`), "#fbbf24");
  add("objects", "calendar0", "Calendrier", `${K} calendrier calendar date`, 200, 200,
    stroke("M 26 40 H 174 V 176 H 26 Z", 8) + stroke("M 26 74 H 174", 8) + stroke("M 60 24 V 54 M 140 24 V 54", 10) +
    Array.from({ length: 3 }, (_, r) => Array.from({ length: 4 }, (_, c) => `<rect x="${44 + c * 30}" y="${96 + r * 24}" width="14" height="14" fill="${C}" opacity="0.4"/>`).join("")).join(""), "#38bdf8");
  add("objects", "folder0", "Dossier", `${K} dossier folder fichier`, 220, 170,
    fillp("M 22 44 H 90 L 108 66 H 198 V 150 H 22 Z") + stroke("M 22 78 H 198", 4, `opacity="0.35"`), "#facc15");
  add("objects", "envelope0", "Enveloppe", `${K} enveloppe courrier mail lettre`, 220, 160,
    stroke("M 18 26 H 202 V 140 H 18 Z", 8) + stroke("M 20 32 L 110 100 L 200 32", 8), "#60a5fa");
  add("objects", "clipboard0", "Presse-papier", `${K} presse-papier clipboard note`, 180, 220,
    stroke("M 34 40 H 146 V 200 H 34 Z", 8) + fillp("M 66 24 H 114 V 52 H 66 Z") + stroke("M 56 92 H 124 M 56 122 H 124 M 56 152 H 100", 6, `opacity="0.4"`), "#a3e635");
  add("objects", "ruler0", "Règle", `${K} règle ruler mesure`, 220, 100,
    stroke("M 20 30 H 200 V 70 H 20 Z", 8) + stroke("M 44 30 V 52 M 68 30 V 44 M 92 30 V 52 M 116 30 V 44 M 140 30 V 52 M 164 30 V 44 M 188 30 V 52", 4, `opacity="0.4"`), "#c084fc");
  add("objects", "magnet0", "Aimant", `${K} aimant magnet`, 190, 200,
    stroke("M 50 176 V 90 A 45 45 0 0 1 140 90 V 176", 26) + fillp("M 37 150 H 63 V 178 H 37 Z") + fillp("M 127 150 H 153 V 178 H 127 Z", `opacity="0.6"`), "#f87171");
  add("objects", "anchor0", "Ancre", `${K} ancre anchor marine`, 190, 220,
    `<circle cx="95" cy="40" r="20" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 95 60 V 190 M 55 96 H 135 M 95 190 C 50 190 26 156 24 128 M 95 190 C 140 190 164 156 166 128", 9) + stroke("M 24 128 L 12 142 M 24 128 L 40 138 M 166 128 L 178 142 M 166 128 L 150 138", 8), "#38bdf8");
  add("objects", "compass0", "Boussole", `${K} boussole compass direction`, 200, 200,
    `<circle cx="100" cy="100" r="86" fill="none" stroke="${C}" stroke-width="9"/>` + fillp("M 100 40 L 118 100 L 100 92 Z") + fillp("M 100 160 L 82 100 L 100 108 Z", `opacity="0.5"`) + `<circle cx="100" cy="100" r="8" fill="${C}"/>`, "#22d3ee");
  add("objects", "candle0", "Bougie", `${K} bougie candle flamme`, 140, 220,
    fillp("M 44 80 H 96 V 200 H 44 Z") + stroke("M 44 96 H 96", 4, `opacity="0.4"`) + stroke("M 70 80 V 60", 5) + fillp("M 70 16 C 84 34 84 54 70 58 C 56 54 56 34 70 16 Z"), "#fbbf24");
  add("objects", "rocket1", "Fusée déco", `${K} fusée rocket espace`, 170, 220,
    fillp("M 85 12 C 120 44 130 96 120 148 H 50 C 40 96 50 44 85 12 Z") + `<circle cx="85" cy="66" r="16" fill="none" stroke="${C}" stroke-width="8"/>` + fillp("M 50 122 L 20 164 L 54 156 Z M 120 122 L 150 164 L 116 156 Z") + fillp("M 68 148 H 102 L 85 200 Z", `opacity="0.7"`), "#fb7185");
  add("objects", "ufo0", "OVNI", `${K} ovni ufo soucoupe espace`, 220, 180,
    fillp("M 70 96 A 40 30 0 0 1 150 96 Z") + `<ellipse cx="110" cy="104" rx="94" ry="34" fill="${C}"/>` + opc(72, 100, 8, 0.35) + opc(110, 108, 8, 0.35) + opc(148, 100, 8, 0.35) + stroke("M 70 140 L 54 172 M 110 146 V 176 M 150 140 L 166 172", 6, `opacity="0.4"`), "#4ade80");
  add("objects", "tent0", "Tente", `${K} tente tent camping`, 220, 180,
    fillp("M 110 30 L 200 160 H 20 Z") + fillp("M 110 30 L 130 160 H 90 Z", `opacity="0.5"`) + stroke("M 110 30 L 92 14 M 200 160 L 212 168", 6), "#22c55e");
  add("objects", "feather0", "Plume", `${K} plume feather`, 170, 220,
    fillp("M 130 20 C 60 40 30 120 40 190 L 60 170 C 50 110 78 56 130 20 Z") + stroke("M 118 34 L 56 150 M 96 44 L 70 116 M 128 60 L 84 128", 4, `opacity="0.4"`) + stroke("M 40 190 L 70 150", 6), "#38bdf8");
  add("objects", "wand0", "Baguette magique", `${K} baguette magique wand magie`, 200, 200,
    stroke("M 40 176 L 150 66", 12) + fillp(starPts(160, 52, 4, 34, 12)) + op(starPts(96, 118, 4, 12, 4), 0.5) + op(starPts(60, 150, 4, 9, 3), 0.4), "#a855f7");
  add("objects", "key1", "Clé ornée", `${K} clé key ornée serrure`, 210, 130,
    `<circle cx="52" cy="65" r="36" fill="none" stroke="${C}" stroke-width="11"/>` + fillp(starPts(52, 65, 4, 14, 6)) + stroke("M 88 65 H 196 M 158 65 V 96 M 176 65 V 92 M 194 65 V 90", 11), "#fbbf24");
})();

/* ── 21. Météo (variantes & compléments) ── */
(() => {
  const K = "météo ciel weather temps";
  add("weather", "sunfull0", "Soleil plein", `${K} soleil sun rayons`, 210, 210,
    `<circle cx="105" cy="105" r="50" fill="${C}"/>` + Array.from({ length: 12 }, (_, k) => { const [x1, y1] = polar(105, 105, 66, k * 30); const [x2, y2] = polar(105, 105, 94, k * 30); return stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 8); }).join(""), "#fbbf24");
  add("weather", "sunhalf0", "Lever de soleil", `${K} soleil horizon lever sunrise`, 220, 160,
    fillp("M 40 130 A 70 70 0 0 1 180 130 Z") + Array.from({ length: 7 }, (_, k) => { const a = 180 + k * 30; const [x1, y1] = polar(110, 130, 82, a); const [x2, y2] = polar(110, 130, 104, a); return stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 7); }).join("") + stroke("M 14 130 H 206", 8), "#fb923c");
  add("weather", "cloudo0", "Nuage contour", `${K} nuage cloud contour`, 220, 150,
    stroke("M 52 126 A 30 30 0 0 1 46 70 A 40 40 0 0 1 120 50 A 34 34 0 0 1 178 72 A 30 30 0 0 1 172 126 Z", 8), "#e2e8f0");
  add("weather", "fog0", "Brouillard", `${K} brouillard brume fog`, 220, 160,
    stroke("M 24 46 H 196 M 14 82 H 186 M 34 118 H 206 M 24 150 H 160", 12, `opacity="0.7"`), "#cbd5e1");
  add("weather", "comet0", "Comète", `${K} comète comet étoile`, 220, 200,
    fillp("M 176 40 A 34 34 0 1 1 142 74 Z") + fillp("M 150 66 L 30 180 L 90 96 L 40 150 Z", `opacity="0.55"`), "#38bdf8");
  add("weather", "shootstar0", "Étoile filante", `${K} étoile filante shooting star`, 220, 180,
    fillp(starPts(168, 56, 5, 40, 17)) + stroke("M 140 76 L 40 156 M 156 92 L 70 158 M 130 60 L 54 128", 6, `opacity="0.5"`), "#fde047");
  add("weather", "snowman0", "Bonhomme de neige", `${K} bonhomme neige snowman hiver`, 180, 220,
    `<circle cx="90" cy="158" r="52" fill="${C}"/><circle cx="90" cy="80" r="38" fill="${C}"/>` + `<circle cx="78" cy="74" r="5" fill="${C}"/><circle cx="102" cy="74" r="5" fill="${C}"/>` + fillp("M 90 84 L 120 90 L 90 96 Z", `opacity="0.7"`) + opc(90, 132, 6, 0.4) + opc(90, 158, 6, 0.4) + stroke("M 52 96 L 20 84 M 128 96 L 160 84", 5), "#e2e8f0");
  add("weather", "raindrop2", "Averse", `${K} pluie averse gouttes rain`, 200, 200,
    Array.from({ length: 6 }, (_, k) => { const x = 40 + (k % 3) * 60, y = 30 + Math.floor(k / 3) * 90; return fillp(`M ${x} ${y} C ${x + 18} ${y + 28} ${x + 22} ${y + 44} ${x} ${y + 54} C ${x - 22} ${y + 44} ${x - 18} ${y + 28} ${x} ${y} Z`); }).join(""), "#38bdf8");
  add("weather", "moonc1", "Croissant fin", `${K} lune croissant moon nuit`, 200, 200,
    fillp("M 140 20 A 84 84 0 1 0 140 180 A 66 66 0 0 1 140 20 Z"), "#fde68a");
  add("weather", "tornado1", "Cyclone", `${K} cyclone tornade tourbillon`, 200, 210,
    stroke("M 30 30 H 172 M 44 60 H 158 M 58 90 H 144 M 74 120 H 128 M 90 150 H 112 M 100 150 C 104 178 92 198 78 206", 11), "#94a3b8");
})();

/* ── 22. Sport (variantes & compléments) ── */
(() => {
  const K = "sport loisir jeu";
  add("sport", "volley0", "Volley", `${K} volley volleyball ballon`, 200, 200,
    `<circle cx="100" cy="100" r="86" fill="${C}"/>` + stroke("M 100 14 C 60 60 60 140 100 186 M 14 100 C 70 90 150 120 186 90 M 40 40 C 90 100 90 140 60 180", 6, `opacity="0.4"`), "#fbbf24");
  add("sport", "bowling0", "Bowling", `${K} bowling boule quille`, 200, 200,
    `<circle cx="100" cy="100" r="86" fill="${C}"/>` + opc(78, 74, 9, 0.4) + opc(104, 68, 9, 0.4) + opc(92, 96, 9, 0.4), "#6366f1");
  add("sport", "dice0", "Dé", `${K} dé dice jeu`, 190, 190,
    stroke("M 30 30 H 160 V 160 H 30 Z", 8) + [[60, 60], [130, 60], [60, 130], [130, 130], [95, 95]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${C}"/>`).join(""), "#f87171");
  add("sport", "skate0", "Skateboard", `${K} skate skateboard planche`, 230, 130,
    fillp("M 20 60 C 20 44 44 44 60 46 H 170 C 186 44 210 44 210 60 C 210 76 186 76 170 74 H 60 C 44 76 20 76 20 60 Z") + `<circle cx="66" cy="104" r="18" fill="none" stroke="${C}" stroke-width="8"/><circle cx="164" cy="104" r="18" fill="none" stroke="${C}" stroke-width="8"/>`, "#fb923c");
  add("sport", "surf0", "Surf", `${K} surf surfboard planche mer`, 130, 230,
    fillp("M 65 10 C 30 60 30 170 65 220 C 100 170 100 60 65 10 Z") + stroke("M 65 30 V 200", 5, `opacity="0.5"`) + fillp("M 55 200 H 75 V 224 H 55 Z", `opacity="0.6"`), "#14b8a6");
  add("sport", "boxing0", "Gant de boxe", `${K} boxe gant boxing`, 200, 200,
    fillp("M 40 90 C 40 50 80 34 116 38 C 158 42 176 74 174 106 C 172 146 140 172 100 172 C 66 172 40 150 40 118 Z") + fillp("M 40 100 C 24 100 20 128 38 132 C 42 134 40 112 40 100 Z") + stroke("M 116 40 C 118 62 118 84 114 104", 5, `opacity="0.4"`) + fillp("M 60 168 H 150 V 190 H 60 Z", `opacity="0.6"`), "#ef4444");
  add("sport", "pingpong0", "Ping-pong", `${K} ping pong raquette tennis de table`, 180, 220,
    `<circle cx="90" cy="80" r="62" fill="${C}"/>` + opc(90, 80, 46, 0.3) + fillp("M 74 138 H 106 V 208 H 74 Z"), "#22c55e");
  add("sport", "kettlebell0", "Kettlebell", `${K} kettlebell fonte fitness musculation`, 190, 210,
    stroke("M 68 70 V 54 A 27 27 0 0 1 122 54 V 70", 12) + fillp("M 95 66 C 145 66 172 110 172 150 C 172 186 140 200 95 200 C 50 200 18 186 18 150 C 18 110 45 66 95 66 Z") + opc(95, 140, 24, 0.3), "#818cf8");
  add("sport", "stopwatch0", "Chrono", `${K} chrono chronomètre stopwatch temps`, 190, 210,
    `<circle cx="95" cy="120" r="76" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 95 76 V 122 L 124 138", 9) + fillp("M 74 14 H 116 V 34 H 74 Z") + stroke("M 95 34 V 44 M 150 62 L 164 48", 9), "#f472b6");
  add("sport", "medal2", "Ruban médaille", `${K} médaille ruban prix récompense`, 190, 220,
    fillp("M 50 12 L 95 96 L 140 12 Z", `opacity="0.5"`) + `<circle cx="95" cy="146" r="60" fill="none" stroke="${C}" stroke-width="11"/>` + fillp(starPts(95, 146, 5, 30, 13)), "#fbbf24");
  add("sport", "jumprope0", "Corde à sauter", `${K} corde sauter jump rope fitness`, 220, 200,
    stroke("M 44 40 C 10 90 10 200 110 200 C 210 200 210 90 176 40", 9) + fillp("M 30 26 H 58 V 54 H 30 Z") + fillp("M 162 26 H 190 V 54 H 162 Z", `opacity="0.7"`), "#ec4899");
  add("sport", "golfclub0", "Golf", `${K} golf club crosse balle`, 200, 220,
    stroke("M 140 20 L 70 180", 9) + fillp("M 70 180 C 50 180 40 196 58 204 L 96 190 Z") + `<circle cx="150" cy="120" r="16" fill="${C}"/>` + opc(146, 116, 4, 0.5), "#84cc16");
})();

/* ── 23. Nature & icônes (variantes) ── */
(() => {
  add("nature", "cloudo1", "Nuage rond", "nature nuage cloud rond", 220, 140,
    fillp("M 60 120 A 34 34 0 0 1 54 56 A 44 44 0 0 1 120 40 A 38 38 0 0 1 180 60 A 34 34 0 0 1 176 120 Z"), "#e2e8f0");
  add("nature", "leafheart0", "Feuille cœur", "nature feuille leaf coeur", 200, 200,
    fillp("M 100 184 C 30 150 20 60 100 24 C 180 60 170 150 100 184 Z") + stroke("M 100 170 V 40", 5, `opacity="0.5"`), "#22c55e");
  add("nature", "tree0", "Arbre", "nature arbre tree feuillu", 200, 220,
    fillp("M 100 20 C 50 20 30 76 60 108 C 34 118 44 160 84 156 V 200 H 116 V 156 C 156 160 166 118 140 108 C 170 76 150 20 100 20 Z"), "#22c55e");
  add("nature", "cactus0", "Cactus", "nature cactus plante désert", 170, 220,
    stroke("M 70 200 V 70 A 18 18 0 0 1 100 70 V 130 Q 100 150 118 150 V 110 A 14 14 0 0 1 146 110 V 150 Q 146 180 100 180 M 70 120 Q 70 150 40 150 V 120 A 14 14 0 0 1 68 120", 20), "#22c55e");
  add("icons", "starround0", "Étoile arrondie", "icône étoile star rond", 200, 200,
    fillp("M 100 20 C 112 20 118 64 134 78 C 150 92 190 84 194 100 C 190 116 150 108 134 122 C 118 136 112 180 100 180 C 88 180 82 136 66 122 C 50 108 10 116 6 100 C 10 84 50 92 66 78 C 82 64 88 20 100 20 Z"), "#fbbf24");
  add("icons", "heartround0", "Cœur rond", "icône coeur heart rond love", 200, 190,
    fillp("M 100 178 C 30 130 12 84 40 54 C 62 30 92 40 100 66 C 108 40 138 30 160 54 C 188 84 170 130 100 178 Z"), "#f43f5e");
  add("icons", "diamond0", "Losange", "icône losange diamond", 180, 200,
    fillp("M 90 10 L 170 100 L 90 190 L 10 100 Z"), "#22d3ee");
  add("icons", "shield0", "Bouclier", "icône bouclier shield protection", 180, 210,
    fillp("M 90 14 L 164 42 V 108 C 164 158 128 188 90 202 C 52 188 16 158 16 108 V 42 Z") + stroke("M 62 104 L 84 128 L 122 78", 10, `opacity="0.6"`), "#38bdf8");
})();

/* ═══════════ Grande vague paramétrique (+1000) ═══════════ */

/* ── 24. Formes géométriques ── */
(() => {
  const K = "forme géométrique geometric shape";
  // Polygones réguliers 3..12 : plein, contour, anneau, 2 orientations.
  for (let sides = 3; sides <= 12; sides++) {
    [-90, -90 + 180 / sides].forEach((rot, ri) => {
      add("geo", `poly${sides}_f${ri}`, `Polygone ${sides}`, `${K} polygone ${sides} côtés`, 200, 200, fillp(polyPts(100, 100, sides, 88, rot)));
      add("geo", `poly${sides}_o${ri}`, `Polygone ${sides} contour`, `${K} polygone contour ${sides}`, 200, 200, stroke(polyPts(100, 100, sides, 84, rot), 10));
    });
    add("geo", `polyring${sides}`, `Anneau ${sides}`, `${K} anneau polygone ${sides}`, 200, 200, eo(`${polyPts(100, 100, sides, 88, -90)} ${polyPts(100, 100, sides, 58, -90)}`));
  }
  // Étoiles régulières 3..12 × 3 creux × plein/contour.
  for (let pts = 3; pts <= 12; pts++) {
    [0.4, 0.52, 0.66].forEach((ratio, rr) => {
      add("geo", `star${pts}_${rr}`, `Étoile ${pts}`, `${K} étoile star ${pts} branches`, 200, 200, fillp(starPts(100, 100, pts, 92, 92 * ratio)));
      add("geo", `staro${pts}_${rr}`, `Étoile ${pts} contour`, `${K} étoile contour ${pts}`, 200, 200, stroke(starPts(100, 100, pts, 86, 86 * ratio), 8));
    });
  }
  // Explosions / badges pointus.
  for (let pts = 8; pts <= 30; pts += 2) add("geo", `burst${pts}`, "Explosion", `${K} explosion burst éclat ${pts}`, 200, 200, fillp(starPts(100, 100, pts, 94, 74)));
  // Rectangles / carrés / pilules arrondis.
  ([[160, 120], [180, 90], [130, 130], [190, 66], [110, 160]] as const).forEach(([w, h], wi) => {
    [8, 20, 40, Math.min(w, h) / 2].forEach((r, ri) => {
      add("geo", `rrect${wi}_${ri}`, "Rectangle arrondi", `${K} rectangle carré pilule arrondi`, 200, 200, `<rect x="${N(100 - w / 2)}" y="${N(100 - h / 2)}" width="${w}" height="${h}" rx="${N(r)}" fill="${C}"/>`);
      add("geo", `rrecto${wi}_${ri}`, "Rectangle contour", `${K} rectangle contour arrondi`, 200, 200, `<rect x="${N(100 - w / 2)}" y="${N(100 - h / 2)}" width="${w}" height="${h}" rx="${N(r)}" fill="none" stroke="${C}" stroke-width="9"/>`);
    });
  });
  // Secteurs / camemberts (fractions).
  for (let k = 1; k <= 7; k++) {
    const frac = k / 8, a1 = -90, a2 = -90 + frac * 360;
    const [x1, y1] = polar(100, 100, 88, a1), [x2, y2] = polar(100, 100, 88, a2);
    const large = frac > 0.5 ? 1 : 0;
    add("geo", `pie${k}`, "Secteur", `${K} secteur camembert part pie ${k}`, 200, 200, fillp(`M 100 100 L ${N(x1)} ${N(y1)} A 88 88 0 ${large} 1 ${N(x2)} ${N(y2)} Z`));
  }
  // Demi & quart de disque.
  add("geo", "half0", "Demi-disque", `${K} demi cercle`, 200, 120, fillp("M 12 108 A 88 88 0 0 1 188 108 Z"));
  add("geo", "quarter0", "Quart de disque", `${K} quart cercle`, 160, 160, fillp("M 20 140 V 20 A 120 120 0 0 1 140 140 Z"));
  // Formes de base pleines + contour.
  const base: [string, string][] = [
    ["diamond", "M 100 12 L 176 100 L 100 188 L 24 100 Z"],
    ["heart", "M 100 178 C 40 132 16 96 22 64 C 27 36 52 22 76 30 C 89 35 97 45 100 53 C 103 45 111 35 124 30 C 148 22 173 36 178 64 C 184 96 160 132 100 178 Z"],
    ["drop", "M 100 12 C 140 68 166 104 166 134 A 66 66 0 0 1 34 134 C 34 104 60 68 100 12 Z"],
    ["shieldg", "M 100 14 L 176 44 V 108 C 176 156 140 186 100 200 C 60 186 24 156 24 108 V 44 Z"],
    ["chevron", "M 40 24 L 120 100 L 40 176 L 68 176 L 148 100 L 68 24 Z"],
    ["plusg", "M 74 20 H 126 V 74 H 180 V 126 H 126 V 180 H 74 V 126 H 20 V 74 H 74 Z"],
    ["crossg", "M 100 72 L 148 24 L 176 52 L 128 100 L 176 148 L 148 176 L 100 128 L 52 176 L 24 148 L 72 100 L 24 52 L 52 24 Z"],
    ["parallelo", "M 56 40 H 184 L 144 160 H 16 Z"],
    ["trapeze", "M 56 40 H 144 L 184 160 H 16 Z"],
    ["house", "M 100 16 L 184 88 H 160 V 184 H 40 V 88 H 16 Z"],
    ["egg", "M 100 16 C 56 16 34 92 40 138 C 46 176 74 188 100 188 C 126 188 154 176 160 138 C 166 92 144 16 100 16 Z"],
    ["bolt", "M 120 8 L 40 108 H 92 L 76 192 L 160 84 H 104 Z"],
    ["moon", "M 128 16 A 90 90 0 1 0 128 184 A 72 72 0 0 1 128 16 Z"],
    ["arrowb", "M 20 74 H 120 V 40 L 184 100 L 120 160 V 126 H 20 Z"],
    ["pentaflat", ""],
  ];
  base.forEach(([id, d]) => {
    if (!d) return;
    add("geo", `${id}f`, "Forme", `${K} ${id}`, 200, 200, fillp(d));
    add("geo", `${id}o`, "Forme contour", `${K} ${id} contour`, 200, 200, stroke(d, 9));
  });
})();

/* ── 25. Ornements & rosaces ── */
(() => {
  const K = "ornement rosace mandala décoratif motif";
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  // Rosaces (pétales autour d'un centre).
  for (let s = 0; s < 44; s++) {
    const r = rng(s * 97 + 13);
    const petals = 6 + Math.floor(r() * 12);
    const rMid = 46 + r() * 22, ph = 26 + r() * 22, pw = 7 + r() * 9;
    let g = "";
    for (let k = 0; k < petals; k++) g += `<ellipse cx="100" cy="${N(100 - rMid)}" rx="${N(pw)}" ry="${N(ph)}" fill="${C}" transform="rotate(${N((k * 360) / petals)} 100 100)"/>`;
    if (r() > 0.4) for (let k = 0; k < petals; k++) g += `<ellipse cx="100" cy="${N(100 - rMid + 30)}" rx="${N(pw * 0.6)}" ry="${N(ph * 0.5)}" fill="${C}" opacity="0.5" transform="rotate(${N((k * 360) / petals + 180 / petals)} 100 100)"/>`;
    g += `<circle cx="100" cy="100" r="${N(12 + r() * 12)}" fill="${C}" opacity="0.55"/>`;
    add("ornaments", `rosette${s}`, "Rosace", `${K} rosace fleur`, 200, 200, g);
  }
  // Soleils / rayons.
  for (let s = 0; s < 34; s++) {
    const r = rng(s * 71 + 5);
    const rays = 10 + Math.floor(r() * 22);
    let g = r() > 0.5 ? `<circle cx="100" cy="100" r="${N(18 + r() * 12)}" fill="${C}"/>` : `<circle cx="100" cy="100" r="${N(18 + r() * 12)}" fill="none" stroke="${C}" stroke-width="6"/>`;
    const sw = 2 + r() * 6, r1 = 30 + r() * 8, r2 = 88;
    for (let k = 0; k < rays; k++) { const a = (k * 360) / rays; const [x1, y1] = polar(100, 100, r1, a); const [x2, y2] = polar(100, 100, k % 2 && r() > 0.5 ? r2 - 14 : r2, a); g += stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, N(sw)); }
    add("ornaments", `rays${s}`, "Rayons", `${K} rayons soleil éclat`, 200, 200, g);
  }
  // Étoiles-polygones entrelacées {n/k}.
  let sp = 0;
  for (let n = 5; n <= 14; n++) for (let k = 2; k < n / 2; k++) {
    if (gcd(n, k) !== 1) continue;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) { const [x, y] = polar(100, 100, 88, -90 + (i * 360 * k) / n); pts.push(`${N(x)} ${N(y)}`); }
    add("ornaments", `starpoly${sp++}`, "Étoile entrelacée", `${K} étoile polygone entrelacs ${n}/${k}`, 200, 200, stroke("M " + pts.join(" L "), 5));
  }
  // Couronnes de points / anneaux pointillés.
  for (let s = 0; s < 24; s++) {
    const r = rng(s * 59 + 3);
    const dots = 8 + Math.floor(r() * 20);
    const rad = 60 + r() * 24, dr = 3 + r() * 6;
    let g = "";
    for (let k = 0; k < dots; k++) { const [x, y] = polar(100, 100, rad, (k * 360) / dots); g += `<circle cx="${N(x)}" cy="${N(y)}" r="${N(dr)}" fill="${C}"/>`; }
    if (r() > 0.5) g += `<circle cx="100" cy="100" r="${N(rad - dr * 3)}" fill="none" stroke="${C}" stroke-width="${N(2 + r() * 3)}" opacity="0.5"/>`;
    add("ornaments", `dotring${s}`, "Anneau de points", `${K} anneau points cercle`, 200, 200, g);
  }
  // Guirlandes / séparateurs à médaillon.
  for (let s = 0; s < 20; s++) {
    const r = rng(s * 41 + 7);
    const cy = 40;
    let g = stroke(`M 8 ${cy} H 80`, N(3 + r() * 3)) + stroke(`M 160 ${cy} H 232`, N(3 + r() * 3));
    const shape = Math.floor(r() * 3);
    g += shape === 0 ? fillp(starPts(120, cy, 4, 26, 10)) : shape === 1 ? `<circle cx="120" cy="${cy}" r="18" fill="none" stroke="${C}" stroke-width="5"/><circle cx="120" cy="${cy}" r="7" fill="${C}"/>` : fillp(`M 120 ${cy - 24} L 138 ${cy} L 120 ${cy + 24} L 102 ${cy} Z`);
    g += `<circle cx="88" cy="${cy}" r="4" fill="${C}"/><circle cx="152" cy="${cy}" r="4" fill="${C}"/>`;
    add("ornaments", `divider${s}`, "Séparateur", `${K} séparateur divider ligne médaillon`, 240, 80, g);
  }
  // Volutes / coins fleuris (4 rotations).
  for (let v = 0; v < 6; v++) {
    const r = rng(v * 83 + 11);
    const swirl = `M 20 180 C 20 120 60 120 60 150 C 60 170 40 170 44 152 M 20 180 C 80 180 120 140 140 60 C 148 30 120 20 116 44 C 114 58 132 58 130 44`;
    add("ornaments", `swirl${v}`, "Volute", `${K} volute arabesque coin`, 200, 200, stroke(swirl, N(5 + r() * 3)));
  }
})();

/* ── 26. Cadres & bordures ── */
(() => {
  const K = "cadre bordure frame contour";
  // Cadres rectangulaires (styles variés).
  const rect = (x: number, y: number, w: number, h: number, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`;
  for (let s = 0; s < 8; s++) {
    const sw = 5 + s;
    add("frames", `rect${s}`, "Cadre", `${K} rectangle simple`, 220, 180, rect(14 + sw, 14 + sw, 192 - 2 * sw, 152 - 2 * sw, `fill="none" stroke="${C}" stroke-width="${sw}"`));
  }
  add("frames", "double0", "Cadre double", `${K} double trait`, 220, 180, rect(16, 16, 188, 148, `fill="none" stroke="${C}" stroke-width="6"`) + rect(30, 30, 160, 120, `fill="none" stroke="${C}" stroke-width="4" opacity="0.6"`));
  (["18 14", "30 10", "6 10", "40 16 6 16"] as const).forEach((dash, i) =>
    add("frames", `dashed${i}`, "Cadre pointillé", `${K} pointillé tirets`, 220, 180, rect(20, 20, 180, 140, `fill="none" stroke="${C}" stroke-width="6" stroke-dasharray="${dash}"`)));
  [10, 20, 34, 50].forEach((r, i) => add("frames", `round${i}`, "Cadre arrondi", `${K} arrondi`, 220, 180, `<rect x="20" y="20" width="180" height="140" rx="${r}" fill="none" stroke="${C}" stroke-width="7"/>`));
  // Coins / crochets d'angle.
  for (let s = 0; s < 6; s++) {
    const sw = 5 + s, L = 40 + s * 6;
    add("frames", `corner${s}`, "Coins", `${K} coins crochets angles`, 220, 180,
      stroke(`M 20 ${20 + L} V 20 H ${20 + L}`, sw) + stroke(`M ${200 - L} 20 H 200 V ${20 + L}`, sw) + stroke(`M 200 ${160 - L} V 160 H ${200 - L}`, sw) + stroke(`M ${20 + L} 160 H 20 V ${160 - L}`, sw));
  }
  // Cadres circulaires / ovales.
  for (let s = 0; s < 6; s++) add("frames", `circle${s}`, "Cadre rond", `${K} cercle rond`, 200, 200, `<circle cx="100" cy="100" r="${88 - s * 2}" fill="none" stroke="${C}" stroke-width="${5 + s}"/>`);
  add("frames", "circdouble0", "Cadre rond double", `${K} cercle double`, 200, 200, `<circle cx="100" cy="100" r="90" fill="none" stroke="${C}" stroke-width="5"/><circle cx="100" cy="100" r="76" fill="none" stroke="${C}" stroke-width="3" opacity="0.6"/>`);
  [[90, 64], [80, 74], [94, 58]].forEach(([rx, ry], i) => add("frames", `oval${i}`, "Cadre ovale", `${K} ovale ellipse`, 200, 200, `<ellipse cx="100" cy="100" rx="${rx}" ry="${ry}" fill="none" stroke="${C}" stroke-width="7"/>`));
  // Cadre festonné (bord ondulé).
  for (let s = 0; s < 4; s++) {
    const bumps = 8 + s * 2, R = 84, r = 10;
    let d = "";
    for (let k = 0; k < bumps * 4; k++) { const a = (k * 360) / (bumps * 4); const rr = k % 2 === 0 ? R : R - r; const [x, y] = polar(100, 100, rr, a); d += (k === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `; }
    add("frames", `scallop${s}`, "Cadre festonné", `${K} festonné vague scalloped`, 200, 200, stroke(d + "Z", 6));
  }
  // Ticket / étiquette (encoches).
  add("frames", "ticket0", "Cadre ticket", `${K} ticket billet encoches`, 230, 150, eo(`M 20 30 H 210 V 120 H 20 Z` + holeC(115, 30, 12) + holeC(115, 120, 12)));
  // Ruban / bannière rectangulaire.
  add("frames", "banner0", "Bannière", `${K} bannière ruban`, 240, 110, fillp("M 20 30 H 220 V 80 H 20 Z") + fillp("M 20 30 L 6 55 L 20 80 Z M 220 30 L 234 55 L 220 80 Z", `opacity="0.6"`));
  // Polaroid.
  add("frames", "polaroid0", "Cadre photo", `${K} photo polaroid`, 200, 220, stroke("M 24 20 H 176 V 200 H 24 Z", 8) + `<rect x="40" y="36" width="120" height="120" fill="${C}" opacity="0.25"/>`);
})();

/* ── 27. Expansions paramétriques massives ── */
(() => {
  // Blobs supplémentaires (150).
  const blob = (seed: number, irr: number, n: number): string => {
    const r = rng(seed);
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) pts.push(polar(100, 100, 58 + r() * irr, (i * 360) / n + r() * 18));
    return smoothClosed(pts);
  };
  for (let s = 0; s < 110; s++) add("blobs", `xf${s}`, "Blob", "blob forme organique tache goutte", 200, 200, fillp(blob(s * 17 + 101, 24 + (s % 5) * 8, 6 + (s % 5))));
  for (let s = 0; s < 40; s++) add("blobs", `xo${s}`, "Blob contour", "blob forme organique contour outline", 200, 200, stroke(blob(s * 29 + 303, 26 + (s % 4) * 6, 7 + (s % 3)), 5 + (s % 3)));

  // Étoiles / éclats supplémentaires (80).
  for (let s = 0; s < 40; s++) { const r = rng(s * 23 + 9); const pts = 4 + Math.floor(r() * 8); add("stars", `xs${s}`, "Éclat", "étoile éclat sparkle scintille", 200, 200, fillp(starPts(100, 100, pts, 90, 90 * (0.3 + r() * 0.4)))); }
  for (let s = 0; s < 20; s++) { const r = rng(s * 47 + 3); let g = ""; const arms = 4 + Math.floor(r() * 3); for (let k = 0; k < arms; k++) { const a = (k * 360) / arms; const [x, y] = polar(100, 100, 60 + r() * 24, a); g += fillp(`M 100 100 L ${N(x + 6)} ${N(y)} L ${N(polar(100, 100, 92, a)[0])} ${N(polar(100, 100, 92, a)[1])} L ${N(x - 6)} ${N(y)} Z`); } add("stars", `xsp${s}`, "Étincelle", "étincelle scintille sparkle éclat", 200, 200, g); }
  for (let s = 0; s < 20; s++) { const r = rng(s * 61 + 7); let g = `<circle cx="100" cy="100" r="${N(6 + r() * 6)}" fill="${C}"/>`; const n = 4 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { const a = (k * 360) / n; const [x1, y1] = polar(100, 100, 18, a), [x2, y2] = polar(100, 100, 40 + r() * 46, a); g += stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, N(3 + r() * 4)); } add("stars", `xburst${s}`, "Étoile rayons", "étoile rayons scintille sparkle", 200, 200, g); }

  // Badges / sceaux supplémentaires (50).
  for (let s = 0; s < 30; s++) { const r = rng(s * 37 + 11); const pts = 10 + Math.floor(r() * 18); add("badges", `xseal${s}`, "Sceau", "badge sceau étoile promo tampon", 200, 200, fillp(starPts(100, 100, pts, 92, 92 - (6 + r() * 16))) + (r() > 0.5 ? `<circle cx="100" cy="100" r="${N(58 + r() * 12)}" fill="none" stroke="${C}" stroke-width="4" opacity="0.5"/>` : "")); }
  for (let s = 0; s < 20; s++) { const r = rng(s * 53 + 5); const pts = 12 + Math.floor(r() * 16); add("badges", `xsealo${s}`, "Sceau contour", "badge sceau contour tampon", 200, 200, stroke(starPts(100, 100, pts, 90, 90 - (8 + r() * 14)), N(4 + r() * 3))); }

  // Bulles supplémentaires (30).
  for (let s = 0; s < 18; s++) { const r = rng(s * 43 + 13); const w = 140 + r() * 60, h = 90 + r() * 40, rad = 16 + r() * 20; const tail = 30 + r() * 100; add("bubbles", `xb${s}`, "Bulle", "bulle parole message chat", 240, 200, `<rect x="${N(120 - w / 2)}" y="14" width="${N(w)}" height="${N(h)}" rx="${N(rad)}" fill="${C}"/>` + fillp(`M ${N(tail)} ${N(14 + h - 4)} L ${N(tail + 10)} ${N(14 + h + 40)} L ${N(tail + 46)} ${N(14 + h - 4)} Z`)); }
  for (let s = 0; s < 12; s++) { const r = rng(s * 67 + 9); const w = 150 + r() * 50, h = 96 + r() * 30; add("bubbles", `xbo${s}`, "Bulle contour", "bulle parole contour message", 240, 200, `<rect x="${N(120 - w / 2)}" y="14" width="${N(w)}" height="${N(h)}" rx="20" fill="none" stroke="${C}" stroke-width="7"/>` + stroke(`M ${N(80)} ${N(14 + h)} L ${N(78)} ${N(14 + h + 34)} L ${N(112)} ${N(14 + h)}`, 7)); }

  // Flèches supplémentaires (60).
  for (let s = 0; s < 30; s++) { const r = rng(s * 31 + 3); const y = 40 + r() * 20; const bend = -30 + r() * 60; add("arrows", `xcurve${s}`, "Flèche courbe", "flèche arrow courbe", 240, 100, stroke(`M 16 ${N(y)} Q 120 ${N(y + bend)} 210 ${N(y)}`, N(6 + r() * 4)) + arrowHead(214, y, Math.atan2(0, 1) + (bend > 0 ? 0.35 : -0.35), 22)); }
  for (let s = 0; s < 16; s++) { const r = rng(s * 71 + 5); const sw = 8 + r() * 10; const split = 0.45 + r() * 0.2; add("arrows", `xfull${s}`, "Flèche pleine", "flèche arrow pleine grosse", 220, 120, fillp(`M 8 ${N(60 - sw)} H ${N(split * 220)} V 16 L 212 60 L ${N(split * 220)} 104 V ${N(60 + sw)} H 8 Z`)); }
  for (let s = 0; s < 14; s++) { const r = rng(s * 89 + 7); const rad = 60 + r() * 16; add("arrows", `xcycle${s}`, "Flèche boucle", "flèche cycle refresh rotation boucle", 200, 200, stroke(`M ${N(100 + rad * 0.8)} ${N(100 - rad * 0.6)} A ${N(rad)} ${N(rad)} 0 ${r() > 0.5 ? 1 : 0} 0 ${N(100 + rad * 0.9)} ${N(100 + rad * 0.5)}`, N(8 + r() * 3)) + arrowHead(100 + rad * 0.95, 100 + rad * 0.55, r() > 0.5 ? 2.2 : -0.6, 24)); }

  // Traits / séparateurs supplémentaires (60).
  for (let s = 0; s < 24; s++) { const r = rng(s * 19 + 5); const amp = 6 + r() * 16, sw = 4 + r() * 7; let d = `M 12 40 `; for (let k = 0; k < 6; k++) d += `q 20 ${k % 2 ? amp : -amp} 40 0 `; add("strokes", `xwave${s}`, "Vague", "trait vague ondulé séparateur ligne", 260, 80, stroke(d, N(sw))); }
  for (let s = 0; s < 18; s++) { const r = rng(s * 29 + 3); const sw = 3 + r() * 8; add("strokes", `xline${s}`, "Trait", "trait ligne séparateur souligne", 260, 40, stroke("M 14 20 H 246", N(sw), r() > 0.5 ? `stroke-dasharray="${N(8 + r() * 30)} ${N(6 + r() * 16)}"` : "")); }
  for (let s = 0; s < 18; s++) { const r = rng(s * 41 + 9); const amp = 12 + r() * 16, seg = 4 + Math.floor(r() * 4); let d = `M 12 ${N(40 - amp / 2)} `; const step = 236 / seg; for (let i = 1; i <= seg; i++) d += `L ${N(12 + i * step)} ${i % 2 ? 40 + amp : 40 - amp} `; add("strokes", `xzig${s}`, "Zigzag", "trait zigzag éclair séparateur", 260, 90, stroke(d, N(5 + r() * 4))); }

  // Déco / motifs supplémentaires (150).
  for (let s = 0; s < 40; s++) { const r = rng(s * 13 + 1); const cols = 5 + Math.floor(r() * 5), rows = 4 + Math.floor(r() * 4), gap = 30, dr = 3 + r() * 7; let g = ""; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) g += `<circle cx="${20 + i * gap}" cy="${20 + j * gap}" r="${N(dr)}" fill="${C}"/>`; add("deco", `xdots${s}`, "Grille de points", "motif points grille pois pattern", 20 + cols * gap, 20 + rows * gap, g); }
  for (let s = 0; s < 30; s++) { const r = rng(s * 23 + 7); const cols = 6 + Math.floor(r() * 4), rows = 5; let g = ""; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) g += `<circle cx="${18 + i * 26}" cy="${18 + j * 26}" r="${N(2 + (i / cols) * 9)}" fill="${C}"/>`; add("deco", `xhalf${s}`, "Demi-teinte", "motif demi-teinte halftone dégradé points", 18 + cols * 26 + 8, 150, g); }
  for (let s = 0; s < 24; s++) { const r = rng(s * 31 + 3); const n = 5 + Math.floor(r() * 6), sw = 6 + r() * 12; let g = ""; for (let k = 0; k < n; k++) g += stroke(`M ${N(16 + k * (232 / n))} 12 V 148`, N(sw), `opacity="${N(0.4 + (k % 3) * 0.3)}"`); add("deco", `xstripe${s}`, "Rayures", "motif rayures bandes lignes pattern", 260, 160, g); }
  for (let s = 0; s < 24; s++) { const r = rng(s * 37 + 5); const rows = 3 + Math.floor(r() * 3), amp = 12 + r() * 10; let g = ""; for (let row = 0; row < rows; row++) { let d = `M 10 ${N(30 + row * (amp + 24))} `; for (let k = 0; k < 5; k++) d += `q 24 ${k % 2 ? amp : -amp} 48 0 `; g += stroke(d, N(5 + r() * 3), `opacity="${N(1 - row * 0.18)}"`); } add("deco", `xwaves${s}`, "Vagues", "motif vagues ondes water pattern", 260, 30 + rows * (amp + 24), g); }
  for (let s = 0; s < 16; s++) { const r = rng(s * 43 + 9); const cols = 5 + Math.floor(r() * 3), rows = 4; let g = ""; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const cx = 30 + i * 44 + (j % 2) * 22, cy = 34 + j * 34; g += `<path d="M ${cx - 22} ${cy} A 22 22 0 0 1 ${cx + 22} ${cy}" fill="none" stroke="${C}" stroke-width="${N(3 + r() * 3)}"/>`; } add("deco", `xscale${s}`, "Écailles", "motif écailles scale éventail pattern", cols * 44 + 40, rows * 34 + 30, g); }
  for (let s = 0; s < 16; s++) { const r = rng(s * 53 + 11); const cols = 6 + Math.floor(r() * 4), rows = 5; let g = ""; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if ((i + j) % 2 === 0) g += `<rect x="${i * 28}" y="${j * 28}" width="28" height="28" fill="${C}"/>`; add("deco", `xcheck${s}`, "Damier", "motif damier échiquier carreaux pattern", cols * 28, rows * 28, g); }

  // Confettis / fête supplémentaires (40).
  for (let s = 0; s < 40; s++) { const r = rng(s * 61 + 17); let g = ""; const n = 16 + Math.floor(r() * 20); for (let k = 0; k < n; k++) { const x = 12 + r() * 216, y = 12 + r() * 176, t = Math.floor(r() * 3); g += t === 0 ? `<circle cx="${N(x)}" cy="${N(y)}" r="${N(3 + r() * 5)}" fill="${C}" opacity="${N(0.6 + r() * 0.4)}"/>` : t === 1 ? `<rect x="${N(x)}" y="${N(y)}" width="${N(6 + r() * 8)}" height="${N(4 + r() * 5)}" fill="${C}" opacity="${N(0.6 + r() * 0.4)}" transform="rotate(${N(r() * 90)} ${N(x)} ${N(y)})"/>` : stroke(`M ${N(x)} ${N(y)} l ${N(8 + r() * 10)} ${N(-6 + r() * 12)}`, N(2 + r() * 3), `opacity="${N(0.6 + r() * 0.4)}"`); } add("party", `xconf${s}`, "Confettis", "confettis fête party paillettes", 240, 200, g); }

  // Tech supplémentaires (40).
  for (let s = 0; s < 20; s++) { const r = rng(s * 71 + 13); let g = ""; for (let i = 0; i < 6; i++) { const y = 22 + i * 32 + r() * 8; const xm = 60 + r() * 80; g += stroke(`M 14 ${N(y)} H ${N(xm)} L ${N(xm + 14)} ${N(y + (r() > 0.5 ? 22 : -22))} H ${N(180 + r() * 30)}`, N(3 + r() * 3)); g += `<circle cx="14" cy="${N(y)}" r="5" fill="${C}"/>`; } add("tech", `xcircuit${s}`, "Circuit", "tech circuit électronique carte", 220, 220, g); }
  for (let s = 0; s < 20; s++) { const r = rng(s * 83 + 7); let g = ""; for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if (r() > 0.5) g += `<rect x="${10 + i * 20}" y="${10 + j * 20}" width="16" height="16" fill="${C}" opacity="${r() > 0.75 ? 0.5 : 1}"/>`; add("tech", `xpix${s}`, "Pixels", "tech pixels qr data grille", 200, 200, g); }

  // Cercles / cadres décoratifs supplémentaires (40).
  for (let s = 0; s < 20; s++) { const r = rng(s * 17 + 5); const sw = 3 + r() * 16; add("circles", `xring${s}`, "Anneau", "cercle rond anneau cadre", 200, 200, `<circle cx="100" cy="100" r="${N(94 - sw / 2)}" fill="none" stroke="${C}" stroke-width="${N(sw)}"/>`); }
  for (let s = 0; s < 12; s++) { const r = rng(s * 41 + 3); add("circles", `xdash${s}`, "Anneau pointillé", "cercle anneau pointillé tirets", 200, 200, `<circle cx="100" cy="100" r="88" fill="none" stroke="${C}" stroke-width="${N(4 + r() * 5)}" stroke-dasharray="${N(4 + r() * 40)} ${N(6 + r() * 16)}"/>`); }
  for (let s = 0; s < 8; s++) { const r = rng(s * 53 + 9); add("circles", `xoval${s}`, "Ovale", "cercle ovale ellipse cadre", 220, 180, `<ellipse cx="110" cy="90" rx="${N(94 - r() * 20)}" ry="${N(74 - r() * 20)}" fill="none" stroke="${C}" stroke-width="${N(5 + r() * 6)}"/>`); }

  // Nature supplémentaire (60).
  for (let s = 0; s < 24; s++) { const r = rng(s * 53 + 21); const fat = 0.5 + r() * 0.5, bend = -24 + r() * 48; const half = 90 * fat; add("nature", `xleaf${s}`, "Feuille", "nature feuille leaf plante", 200, 200, fillp(`M 100 190 C ${N(100 - half)} 140 ${N(100 - half - bend)} 60 100 10 C ${N(100 + half - bend)} 60 ${N(100 + half)} 140 100 190 Z`) + stroke(`M 100 178 Q ${N(100 - bend / 2)} 100 100 32`, N(3 + r() * 2), `opacity="0.5"`)); }
  for (let s = 0; s < 20; s++) { const r = rng(s * 67 + 11); const petals = 5 + Math.floor(r() * 8); let g = ""; for (let k = 0; k < petals; k++) g += `<ellipse cx="100" cy="${N(58 - r() * 6)}" rx="${N(14 + r() * 12)}" ry="${N(38 + r() * 10)}" fill="${C}" transform="rotate(${N((k * 360) / petals)} 100 100)"/>`; g += `<circle cx="100" cy="100" r="${N(14 + r() * 8)}" fill="${C}" opacity="0.5"/>`; add("nature", `xflower${s}`, "Fleur", "nature fleur flower marguerite", 200, 200, g); }
  for (let s = 0; s < 16; s++) { const r = rng(s * 71 + 5); const nb = 3 + Math.floor(r() * 4); let g = stroke(`M 20 184 Q ${N(90 + r() * 30)} ${N(110 + r() * 20)} 182 ${N(18 + r() * 14)}`, N(4 + r() * 2)); for (let i = 1; i <= nb; i++) { const t = i / (nb + 1); const x = 20 + 160 * t, y = 184 - 164 * t; const side = i % 2 ? 1 : -1; g += `<ellipse cx="${N(x + side * 15)}" cy="${N(y - 8)}" rx="${N(14 + r() * 8)}" ry="${N(6 + r() * 3)}" fill="${C}" transform="rotate(${N(-40 + side * 35)} ${N(x + side * 15)} ${N(y - 8)})"/>`; } add("nature", `xbranch${s}`, "Branche", "nature branche rameau feuillage", 200, 200, g); }
})();

/* ═══════════ Vague « nature → droite » : variantes & compléments ═══════════ */

/* ── 28. Icônes UI / réseaux / montage ── */
(() => {
  const K = "icône symbole pictogramme ui interface app";
  const I = (id: string, l: string, kw: string, body: string, color?: string) => add("icons", id, l, `${K} ${kw}`, 200, 200, body, color);
  I("share1", "Partager", "share partage", `<circle cx="152" cy="46" r="20" fill="${C}"/><circle cx="50" cy="100" r="20" fill="${C}"/><circle cx="152" cy="154" r="20" fill="${C}"/>` + stroke("M 68 91 L 134 55 M 68 109 L 134 145", 8));
  I("send1", "Envoyer", "send avion papier message", fillp("M 18 100 L 184 28 L 132 182 L 104 116 Z") + stroke("M 104 116 L 184 28", 4, `opacity="0.4"`));
  I("download1", "Télécharger", "download bas", stroke("M 100 22 V 128", 12) + stroke("M 58 90 L 100 134 L 142 90", 12) + stroke("M 40 168 H 160", 12));
  I("upload1", "Envoyer fichier", "upload haut", stroke("M 100 134 V 28", 12) + stroke("M 58 66 L 100 22 L 142 66", 12) + stroke("M 40 168 H 160", 12));
  I("bookmark1", "Marque-page", "bookmark favori", fillp("M 56 22 H 144 V 178 L 100 142 L 56 178 Z"));
  I("bookmarko1", "Marque-page contour", "bookmark favori contour", stroke("M 56 24 H 144 V 176 L 100 140 L 56 176 Z", 10));
  I("trash1", "Corbeille", "trash supprimer poubelle", stroke("M 40 48 H 160", 10) + stroke("M 56 48 V 168 H 144 V 48", 10) + stroke("M 78 34 H 122", 10) + stroke("M 84 74 V 146 M 116 74 V 146", 7, `opacity="0.5"`));
  I("settings1", "Réglages", "settings sliders curseurs", stroke("M 30 60 H 170 M 30 100 H 170 M 30 140 H 170", 9) + `<circle cx="72" cy="60" r="13" fill="${C}"/><circle cx="130" cy="100" r="13" fill="${C}"/><circle cx="90" cy="140" r="13" fill="${C}"/>`);
  I("filter1", "Filtre", "filter entonnoir tri", fillp("M 26 34 H 174 L 116 106 V 172 L 84 152 V 106 Z"));
  I("crop1", "Rogner", "crop recadrer", stroke("M 52 20 V 148 H 180 M 20 52 H 148 V 180", 10));
  I("magic1", "Baguette IA", "magic ia sparkle magie", fillp(starPts(72, 72, 4, 34, 12)) + op(starPts(140, 60, 4, 16, 6), 0.6) + op(starPts(150, 130, 4, 13, 5), 0.5) + op(starPts(96, 140, 4, 11, 4), 0.5));
  I("minusc1", "Moins", "minus retirer moins cercle", `<circle cx="100" cy="100" r="88" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 56 100 H 144", 12));
  I("menu1", "Menu", "menu hamburger lignes", stroke("M 34 60 H 166 M 34 100 H 166 M 34 140 H 166", 12));
  I("dots1", "Options", "menu points options plus", `<circle cx="100" cy="46" r="14" fill="${C}"/><circle cx="100" cy="100" r="14" fill="${C}"/><circle cx="100" cy="154" r="14" fill="${C}"/>`);
  I("grid1", "Grille", "grid grille disposition", [[40, 40], [116, 40], [40, 116], [116, 116]].map(([x, y]) => `<rect x="${x}" y="${y}" width="44" height="44" rx="8" fill="${C}"/>`).join(""));
  I("list1", "Liste", "list liste", `<circle cx="34" cy="52" r="9" fill="${C}"/><circle cx="34" cy="100" r="9" fill="${C}"/><circle cx="34" cy="148" r="9" fill="${C}"/>` + stroke("M 62 52 H 172 M 62 100 H 172 M 62 148 H 172", 9));
  I("eyeoff1", "Masquer", "eye off masquer oeil barré", stroke("M 12 70 C 50 18 150 18 188 70 C 176 90 158 106 138 116 M 62 122 C 44 112 26 96 12 76", 8) + `<circle cx="110" cy="70" r="22" fill="${C}" opacity="0.6"/>` + stroke("M 40 168 L 160 32", 9));
  I("micoff1", "Micro coupé", "micro mute coupé off", stroke("M 80 30 A 22 22 0 0 1 120 44 V 90 M 122 118 A 22 22 0 0 1 78 106 V 96", 8) + stroke("M 56 96 A 44 44 0 0 0 96 138 M 100 138 V 172 M 68 172 H 132", 8) + stroke("M 44 40 L 156 168", 9));
  I("video1", "Vidéo", "video caméra film", `<rect x="24" y="60" width="110" height="80" rx="12" fill="${C}"/>` + fillp("M 134 84 L 180 60 V 140 L 134 116 Z"));
  I("volume1", "Volume", "volume son haut-parleur", fillp("M 24 76 H 56 L 96 40 V 160 L 56 124 H 24 Z") + stroke("M 120 74 A 40 40 0 0 1 120 126 M 138 56 A 66 66 0 0 1 138 144", 8));
  I("mute1", "Muet", "mute silence son coupé", fillp("M 24 76 H 56 L 96 40 V 160 L 56 124 H 24 Z") + stroke("M 126 78 L 174 122 M 174 78 L 126 122", 9));
  I("tag1", "Étiquette", "tag étiquette prix label", eo("M 22 60 L 100 60 L 170 130 L 130 170 L 60 100 L 22 100 Z" + holeC(52, 82, 11)));
  I("copy1", "Copier", "copy copier dupliquer", `<rect x="34" y="34" width="90" height="110" rx="12" fill="none" stroke="${C}" stroke-width="9"/><rect x="76" y="66" width="90" height="110" rx="12" fill="none" stroke="${C}" stroke-width="9"/>`);
  I("user1", "Profil", "user profil compte personne", `<circle cx="100" cy="74" r="38" fill="${C}"/>` + fillp("M 32 178 C 32 128 168 128 168 178 Z"));
  I("users1", "Groupe", "users groupe équipe personnes", `<circle cx="76" cy="76" r="32" fill="${C}"/>` + fillp("M 20 170 C 20 126 132 126 132 170 Z") + `<circle cx="146" cy="82" r="26" fill="${C}" opacity="0.6"/>` + op("M 118 168 C 118 132 190 130 190 168 Z", 0.6));
  I("globe1", "Globe", "globe monde web internet", `<circle cx="100" cy="100" r="84" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 16 100 H 184 M 100 16 V 184 M 100 16 C 56 50 56 150 100 184 M 100 16 C 144 50 144 150 100 184", 7));
  I("chartbar1", "Barres", "chart graphique barres stats", fillp("M 34 110 H 66 V 168 H 34 Z M 84 70 H 116 V 168 H 84 Z M 134 40 H 166 V 168 H 134 Z"));
  I("chartline1", "Courbe", "chart graphique courbe stats", stroke("M 28 32 V 168 H 176", 9) + stroke("M 44 140 L 84 96 L 116 118 L 168 52", 9));
  I("chartpie1", "Camembert", "chart graphique camembert stats", `<circle cx="100" cy="100" r="76" fill="none" stroke="${C}" stroke-width="10"/>` + fillp("M 100 100 V 24 A 76 76 0 0 1 168 108 Z"));
  I("coin1", "Pièce", "coin pièce monnaie argent", `<circle cx="100" cy="100" r="82" fill="${C}"/>` + `<circle cx="100" cy="100" r="62" fill="none" stroke="${C}" stroke-width="5" opacity="0.4"/>` + stroke("M 100 58 V 142 M 82 74 H 112 A 14 14 0 0 1 112 102 H 82 H 118", 7, `opacity="0.5"`), "#fbbf24");
  I("card1", "Carte", "credit card carte bancaire paiement", `<rect x="20" y="48" width="160" height="104" rx="14" fill="none" stroke="${C}" stroke-width="9"/>` + fillp("M 20 74 H 180 V 92 H 20 Z") + stroke("M 40 124 H 90", 8, `opacity="0.5"`));
  I("cart1", "Panier", "cart panier achat shopping", stroke("M 16 28 H 44 L 64 128 H 150 L 168 60 H 56", 9) + `<circle cx="72" cy="164" r="14" fill="${C}"/><circle cx="146" cy="164" r="14" fill="${C}"/>`);
  I("wallet1", "Portefeuille", "wallet portefeuille argent", `<rect x="24" y="48" width="152" height="104" rx="16" fill="none" stroke="${C}" stroke-width="9"/>` + fillp("M 132 88 H 184 V 116 H 132 Z") + `<circle cx="150" cy="102" r="7" fill="${C}"/>`);
  I("bell1", "Cloche contour", "bell notification cloche contour", stroke("M 100 30 C 66 30 50 56 50 90 V 128 L 34 150 H 166 L 150 128 V 90 C 150 56 134 30 100 30 Z", 9) + stroke("M 84 162 A 16 16 0 0 0 116 162", 9));
  I("belloff1", "Cloche coupée", "bell off notification coupée", stroke("M 66 60 C 76 42 100 34 122 44 C 142 54 150 74 150 90 V 128 L 166 150 H 70", 8) + stroke("M 84 162 A 16 16 0 0 0 116 162", 8) + stroke("M 40 36 L 164 170", 9));
  I("flame1", "Flamme contour", "flamme feu hot contour", stroke("M 80 16 C 96 52 128 70 128 116 A 48 48 0 0 1 32 116 C 32 92 44 74 56 60 C 56 80 64 88 72 92 C 66 64 70 38 80 16 Z", 9), "#f97316");
  I("stargroup1", "Note 5 étoiles", "rating note étoiles avis", [30, 70, 110, 150, 190].map((cx) => fillp(starPts(cx, 100, 5, 18, 8))).join(""), "#fbbf24");
  I("checkbox1", "Case cochée", "checkbox case cochée validé", `<rect x="28" y="28" width="144" height="144" rx="24" fill="${C}"/>` + stroke("M 62 102 L 90 132 L 142 72", 12, `opacity="0.85"`));
  I("radio1", "Bouton radio", "radio sélection", `<circle cx="100" cy="100" r="80" fill="none" stroke="${C}" stroke-width="10"/><circle cx="100" cy="100" r="40" fill="${C}"/>`);
  I("toggle1", "Interrupteur", "toggle switch bascule", `<rect x="20" y="66" width="160" height="68" rx="34" fill="${C}"/><circle cx="146" cy="100" r="24" fill="${C}" opacity="0.85"/>`);
  I("home1", "Accueil", "home maison accueil", fillp("M 100 24 L 180 92 H 158 V 172 H 118 V 122 H 82 V 172 H 42 V 92 H 20 Z"));
  I("ff1", "Avance rapide", "avance rapide fast forward", fillp("M 24 50 L 96 100 L 24 150 Z M 104 50 L 176 100 L 104 150 Z"));
  I("rw1", "Retour rapide", "retour rapide rewind", fillp("M 176 50 L 104 100 L 176 150 Z M 96 50 L 24 100 L 96 150 Z"));
  I("skipnext1", "Suivant", "suivant next piste", fillp("M 30 50 L 120 100 L 30 150 Z") + fillp("M 140 46 H 168 V 154 H 140 Z"));
  I("skipprev1", "Précédent", "précédent previous piste", fillp("M 170 50 L 80 100 L 170 150 Z") + fillp("M 32 46 H 60 V 154 H 32 Z"));
  I("repeat1", "Répéter", "repeat boucle répétition", stroke("M 46 78 H 138 A 26 26 0 0 1 138 130 H 60", 9) + fillp("M 62 60 L 34 78 L 62 96 Z") + fillp("M 138 112 L 166 130 L 138 148 Z"));
  I("shuffle1", "Aléatoire", "shuffle aléatoire mélange", stroke("M 30 60 H 70 L 130 140 H 170 M 30 140 H 70 L 90 112 M 150 88 L 130 60 H 170", 9) + fillp("M 154 44 L 182 60 L 154 76 Z M 154 124 L 182 140 L 154 156 Z"));
  I("record1", "Enregistrer", "record enregistrement rec", `<circle cx="100" cy="100" r="52" fill="${C}"/>`, "#ef4444");
  I("fullscreen1", "Plein écran", "fullscreen agrandir plein écran", stroke("M 40 72 V 40 H 72 M 128 40 H 160 V 72 M 160 128 V 160 H 128 M 72 160 H 40 V 128", 10));
  I("layers1", "Calques", "layers calques couches", fillp("M 100 24 L 176 64 L 100 104 L 24 64 Z") + stroke("M 24 100 L 100 140 L 176 100 M 24 136 L 100 176 L 176 136", 8, `opacity="0.5"`));
  I("adjust1", "Réglage image", "adjust luminosité contraste réglage", `<circle cx="100" cy="100" r="78" fill="none" stroke="${C}" stroke-width="9"/>` + fillp("M 100 22 A 78 78 0 0 1 100 178 Z"));
  I("brightness1", "Luminosité", "brightness luminosité soleil", `<circle cx="100" cy="100" r="34" fill="${C}"/>` + Array.from({ length: 8 }, (_, k) => { const [x1, y1] = polar(100, 100, 52, k * 45), [x2, y2] = polar(100, 100, 76, k * 45); return stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 9); }).join(""), "#fbbf24");
  I("contrast1", "Contraste", "contrast contraste demi", `<circle cx="100" cy="100" r="80" fill="none" stroke="${C}" stroke-width="9"/>` + fillp("M 100 20 A 80 80 0 0 1 100 180 Z"));
  I("rotate1", "Pivoter", "rotate pivoter rotation", stroke("M 56 74 A 60 60 0 1 1 48 118", 10) + fillp("M 40 50 L 62 82 L 28 88 Z"));
  I("flip1", "Miroir", "flip miroir retourner symétrie", stroke("M 100 24 V 176", 8, `stroke-dasharray="10 10"`) + fillp("M 80 56 L 80 144 L 32 100 Z") + stroke("M 120 56 L 120 144 L 168 100 Z", 8));
  I("qr1", "QR code", "qr code data scan", `<rect x="24" y="24" width="52" height="52" fill="none" stroke="${C}" stroke-width="9"/><rect x="42" y="42" width="16" height="16" fill="${C}"/>` + `<rect x="124" y="24" width="52" height="52" fill="none" stroke="${C}" stroke-width="9"/><rect x="142" y="42" width="16" height="16" fill="${C}"/>` + `<rect x="24" y="124" width="52" height="52" fill="none" stroke="${C}" stroke-width="9"/><rect x="42" y="142" width="16" height="16" fill="${C}"/>` + fillp("M 108 108 H 130 V 130 H 108 Z M 146 108 H 176 V 130 H 146 Z M 108 146 H 130 V 176 H 108 Z M 150 150 H 176 V 176 H 150 Z"));
  I("verified1", "Vérifié", "verified certifié badge coche", fillp(starPts(100, 100, 10, 84, 66)) + stroke("M 62 100 L 90 128 L 140 74", 11, `opacity="0.85"`), "#38bdf8");
  I("fire2", "Feu plein", "feu flamme hot tendance", fillp("M 96 12 C 116 52 150 74 150 122 A 54 54 0 0 1 42 122 C 42 96 56 76 70 62 C 68 84 78 94 88 98 C 80 66 84 40 96 12 Z"), "#f97316");
})();

/* ── 29. Objets : transport, musique, outils, maison, tech, mode ── */
(() => {
  const K = "objet objets";
  const O = (id: string, l: string, kw: string, body: string, w = 200, h = 200, color?: string) => add("objects", id, l, `${K} ${kw}`, w, h, body, color);
  // Transport
  O("bike1", "Vélo", "vélo bicyclette transport", `<circle cx="52" cy="140" r="34" fill="none" stroke="${C}" stroke-width="8"/><circle cx="168" cy="140" r="34" fill="none" stroke="${C}" stroke-width="8"/>` + stroke("M 52 140 L 96 140 L 128 74 L 156 140 M 96 140 L 128 74 M 116 74 H 146 M 88 140 L 78 108 H 104", 7), 230);
  O("moto1", "Moto", "moto motard transport", `<circle cx="48" cy="140" r="30" fill="none" stroke="${C}" stroke-width="9"/><circle cx="164" cy="140" r="30" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 48 140 L 96 100 H 150 L 164 140 M 96 100 L 84 76 H 60 M 150 100 L 176 88", 9), 220);
  O("bus1", "Bus", "bus autobus transport", `<rect x="20" y="40" width="160" height="104" rx="14" fill="none" stroke="${C}" stroke-width="8"/>` + stroke("M 40 66 H 160 M 100 66 V 110", 6, `opacity="0.5"`) + `<rect x="40" y="80" width="120" height="30" fill="${C}" opacity="0.3"/><circle cx="58" cy="160" r="16" fill="${C}"/><circle cx="142" cy="160" r="16" fill="${C}"/>`, 200, 200);
  O("train1", "Train", "train métro transport", `<rect x="34" y="28" width="132" height="120" rx="20" fill="none" stroke="${C}" stroke-width="8"/>` + `<rect x="52" y="52" width="96" height="42" rx="8" fill="${C}" opacity="0.3"/>` + `<circle cx="70" cy="118" r="10" fill="${C}"/><circle cx="130" cy="118" r="10" fill="${C}"/>` + stroke("M 60 148 L 40 176 M 140 148 L 160 176", 8));
  O("car1b", "Voiture", "voiture auto transport", fillp("M 18 108 L 34 72 C 40 58 52 52 66 52 H 134 C 148 52 160 60 168 74 L 184 108 V 128 H 18 Z") + op("M 62 56 L 54 80 H 146 L 138 56 Z", 0.35) + `<circle cx="60" cy="128" r="18" fill="${C}"/><circle cx="140" cy="128" r="18" fill="${C}"/>`, 200, 180);
  O("taxi1", "Taxi", "taxi transport", fillp("M 18 108 L 34 72 C 40 58 52 52 66 52 H 134 C 148 52 160 60 168 74 L 184 108 V 128 H 18 Z") + fillp("M 78 34 H 122 V 52 H 78 Z", `opacity="0.7"`) + `<circle cx="60" cy="128" r="18" fill="${C}"/><circle cx="140" cy="128" r="18" fill="${C}"/>`, 200, 180, "#fbbf24");
  O("scooter1", "Trottinette", "trottinette scooter transport", `<circle cx="44" cy="150" r="24" fill="none" stroke="${C}" stroke-width="8"/><circle cx="160" cy="150" r="24" fill="none" stroke="${C}" stroke-width="8"/>` + stroke("M 44 150 L 150 150 M 150 150 L 150 40 M 150 40 H 184", 9));
  O("ship1", "Navire", "navire bateau cargo transport mer", fillp("M 18 120 H 182 L 160 168 H 40 Z") + `<rect x="60" y="70" width="80" height="50" fill="none" stroke="${C}" stroke-width="7"/>` + fillp("M 74 84 H 90 V 100 H 74 Z M 108 84 H 124 V 100 H 108 Z", `opacity="0.5"`) + stroke("M 100 40 V 70", 8));
  O("plane2", "Avion", "avion vol transport voyage", fillp("M 100 14 C 110 14 116 30 116 56 V 84 L 186 128 V 146 L 116 126 V 164 L 140 182 V 194 L 100 184 L 60 194 V 182 L 84 164 V 126 L 14 146 V 128 L 84 84 V 56 C 84 30 90 14 100 14 Z"));
  O("heli1", "Hélicoptère", "hélicoptère transport", stroke("M 30 52 H 170", 8) + fillp("M 70 80 C 60 80 54 92 54 108 C 54 128 74 140 104 140 H 150 L 176 108 L 150 92 H 104 Z") + stroke("M 100 52 V 80 M 150 140 V 168 M 120 168 H 180", 8) + `<circle cx="82" cy="110" r="12" fill="${C}" opacity="0.4"/>`);
  O("balloon2", "Montgolfière", "montgolfière ballon transport voyage", fillp("M 100 16 C 50 16 30 66 40 108 C 46 132 70 152 76 160 H 124 C 130 152 154 132 160 108 C 170 66 150 16 100 16 Z") + stroke("M 100 20 V 158 M 66 30 C 58 80 62 130 76 158 M 134 30 C 142 80 138 130 124 158", 5, `opacity="0.35"`) + stroke("M 78 160 L 88 184 H 112 L 122 160", 6) + `<rect x="82" y="182" width="36" height="24" rx="4" fill="${C}"/>`);
  O("rocket2", "Fusée", "fusée espace transport", fillp("M 100 12 C 134 44 144 96 134 148 H 66 C 56 96 66 44 100 12 Z") + `<circle cx="100" cy="66" r="16" fill="none" stroke="${C}" stroke-width="8"/>` + fillp("M 66 122 L 34 164 L 68 156 Z M 134 122 L 166 164 L 132 156 Z"));
  O("anchor1", "Ancre", "ancre marine bateau", `<circle cx="100" cy="42" r="18" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 100 60 V 184 M 62 96 H 138 M 100 184 C 54 184 30 148 28 122 M 100 184 C 146 184 170 148 172 122", 9));
  // Musique
  O("piano1", "Piano", "piano clavier musique instrument", `<rect x="24" y="40" width="152" height="120" rx="10" fill="none" stroke="${C}" stroke-width="8"/>` + stroke("M 62 44 V 156 M 100 44 V 156 M 138 44 V 156", 5, `opacity="0.5"`) + fillp("M 48 44 H 72 V 96 H 48 Z M 86 44 H 110 V 96 H 86 Z M 124 44 H 148 V 96 H 124 Z", `opacity="0.6"`));
  O("drum1", "Batterie", "tambour batterie musique instrument", fillp("M 40 74 C 40 58 160 58 160 74 C 160 90 40 90 40 74 Z") + stroke("M 40 74 V 130 C 40 146 160 146 160 130 V 74", 8) + stroke("M 48 88 L 62 128 M 152 88 L 138 128 M 74 96 L 74 136 M 126 96 L 126 136", 5, `opacity="0.5"`) + stroke("M 30 44 L 70 84 M 170 44 L 130 84", 7));
  O("trumpet1", "Trompette", "trompette musique instrument cuivre", stroke("M 20 100 H 120", 12) + fillp("M 120 74 L 180 54 V 146 L 120 126 Z") + `<circle cx="60" cy="76" r="9" fill="${C}"/><circle cx="86" cy="76" r="9" fill="${C}"/><circle cx="112" cy="76" r="9" fill="${C}"/>` + stroke("M 60 88 V 100 M 86 88 V 100 M 112 88 V 100", 6));
  O("sax1", "Saxophone", "saxophone musique instrument", stroke("M 90 24 V 96 C 90 140 120 160 150 160 C 174 160 182 138 168 128", 12) + fillp("M 150 130 C 176 130 190 158 178 178 C 150 182 130 168 132 148 Z") + `<circle cx="90" cy="60" r="6" fill="${C}"/><circle cx="90" cy="84" r="6" fill="${C}"/>`);
  O("violin1", "Violon", "violon musique instrument corde", fillp("M 100 40 C 130 40 140 70 122 92 C 150 100 156 150 120 172 C 100 184 100 184 80 172 C 44 150 50 100 78 92 C 60 70 70 40 100 40 Z") + stroke("M 100 30 V 96", 6) + fillp("M 88 20 H 112 V 34 H 88 Z", `opacity="0.6"`) + stroke("M 84 100 L 90 150 M 116 100 L 110 150", 3, `opacity="0.5"`));
  O("speaker1", "Enceinte", "enceinte haut-parleur son musique", `<rect x="46" y="20" width="108" height="160" rx="14" fill="none" stroke="${C}" stroke-width="8"/>` + `<circle cx="100" cy="128" r="34" fill="none" stroke="${C}" stroke-width="7"/><circle cx="100" cy="128" r="12" fill="${C}"/><circle cx="100" cy="52" r="12" fill="none" stroke="${C}" stroke-width="6"/>`);
  O("vinyl1", "Vinyle", "vinyle disque musique", `<circle cx="100" cy="100" r="84" fill="${C}"/><circle cx="100" cy="100" r="30" fill="${C}" opacity="0.85"/><circle cx="100" cy="100" r="8" fill="${C}"/>` + `<circle cx="100" cy="100" r="60" fill="none" stroke="${C}" stroke-width="3" opacity="0.4"/><circle cx="100" cy="100" r="48" fill="none" stroke="${C}" stroke-width="3" opacity="0.4"/>`);
  O("cassette1", "Cassette", "cassette audio musique rétro", `<rect x="24" y="44" width="152" height="112" rx="12" fill="none" stroke="${C}" stroke-width="8"/>` + `<rect x="44" y="70" width="112" height="44" rx="6" fill="${C}" opacity="0.25"/>` + `<circle cx="74" cy="92" r="12" fill="none" stroke="${C}" stroke-width="6"/><circle cx="126" cy="92" r="12" fill="none" stroke="${C}" stroke-width="6"/>` + stroke("M 60 138 H 140", 6, `opacity="0.5"`));
  O("headset1", "Casque micro", "casque gaming micro audio", stroke("M 36 116 V 96 A 64 64 0 0 1 164 96 V 116", 10) + `<rect x="22" y="112" width="30" height="58" rx="10" fill="${C}"/><rect x="148" y="112" width="30" height="58" rx="10" fill="${C}"/>` + stroke("M 148 150 H 120 A 10 10 0 0 0 110 160", 8));
  // Outils
  O("hammer1", "Marteau", "marteau outil bricolage", fillp("M 40 44 L 96 44 L 108 68 L 76 84 L 62 60 Z") + stroke("M 82 74 L 150 176", 13), 200, 200);
  O("wrench1", "Clé", "clé outil bricolage écrou", stroke("M 150 40 A 34 34 0 1 0 168 84 L 96 156 A 20 20 0 0 1 68 128 L 140 56", 0) + fillp("M 156 34 A 36 36 0 1 0 176 80 L 100 156 L 74 130 L 150 54 A 22 22 0 0 1 156 34 Z"));
  O("screwdriver1", "Tournevis", "tournevis outil bricolage", stroke("M 40 160 L 120 80", 12) + fillp("M 118 78 L 150 46 A 16 16 0 0 1 172 68 L 140 100 Z") + fillp("M 34 154 L 54 174 L 30 178 Z", `opacity="0.6"`));
  O("saw1", "Scie", "scie outil bricolage", fillp("M 24 88 L 168 88 L 176 120 L 24 120 Z") + fillp("M 24 88 L 40 72 L 56 88 L 72 72 L 88 88 L 104 72 L 120 88 L 136 72 L 152 88 Z") + fillp("M 168 100 H 190 V 130 H 168 Z", `opacity="0.6"`));
  O("paintroller1", "Rouleau", "rouleau peinture outil", `<rect x="30" y="40" width="120" height="46" rx="10" fill="${C}"/>` + stroke("M 150 63 H 172 V 96 H 108 V 176", 9));
  O("scissors2", "Ciseaux", "ciseaux outil couper", `<circle cx="46" cy="52" r="22" fill="none" stroke="${C}" stroke-width="8"/><circle cx="46" cy="148" r="22" fill="none" stroke="${C}" stroke-width="8"/>` + stroke("M 64 64 L 172 152 M 64 136 L 172 48", 8));
  O("ruler2", "Règle", "règle mesure outil", fillp("M 30 40 L 160 170 L 130 200 L 0 70 Z", `transform="translate(20 -10)"`) + stroke("M 60 60 L 78 42 M 88 88 L 106 70 M 116 116 L 134 98", 4, `opacity="0.4"`));
  // Maison & divers
  O("chair1", "Chaise", "chaise meuble maison", stroke("M 56 30 V 120 M 144 60 V 120 M 56 120 H 144 M 50 120 L 44 180 M 150 120 L 156 180 M 56 74 H 144", 9));
  O("lamp1", "Lampe", "lampe luminaire maison", fillp("M 60 30 H 140 L 164 96 H 36 Z") + stroke("M 100 96 V 160 M 66 176 H 134", 9) + `<circle cx="100" cy="118" r="8" fill="${C}" opacity="0.5"/>`);
  O("bed1", "Lit", "lit chambre meuble maison", stroke("M 24 100 V 160 M 176 100 V 160 M 24 130 H 176 M 24 100 C 24 84 40 76 60 76 H 140 C 160 76 176 84 176 100", 9) + `<rect x="44" y="86" width="50" height="28" rx="8" fill="${C}" opacity="0.4"/>`);
  O("door1", "Porte", "porte maison entrée", stroke("M 48 24 H 152 V 176 H 48 Z", 9) + `<circle cx="128" cy="104" r="8" fill="${C}"/>`);
  O("mirror1", "Miroir", "miroir maison reflet", `<rect x="56" y="20" width="88" height="150" rx="44" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 82 60 L 72 110 M 100 50 L 84 130", 6, `opacity="0.4"`));
  O("broom1", "Balai", "balai ménage nettoyer maison", stroke("M 140 30 L 70 130", 10) + fillp("M 70 128 L 108 156 C 88 186 52 190 30 172 C 44 152 56 138 70 128 Z") + stroke("M 46 150 L 60 174 M 62 138 L 78 166 M 82 132 L 96 158", 4, `opacity="0.4"`));
  O("plug1", "Prise", "prise électrique branchement", stroke("M 78 20 V 60 M 122 20 V 60", 10) + fillp("M 56 60 H 144 V 100 A 44 44 0 0 1 56 100 Z") + stroke("M 100 144 V 176", 10));
  O("battery1", "Batterie", "batterie énergie charge", `<rect x="24" y="60" width="140" height="80" rx="12" fill="none" stroke="${C}" stroke-width="8"/><rect x="168" y="82" width="14" height="36" rx="4" fill="${C}"/>` + `<rect x="38" y="74" width="80" height="52" rx="4" fill="${C}" opacity="0.6"/>`);
  O("flashlight1", "Lampe torche", "torche lampe flashlight", fillp("M 40 80 H 96 V 120 H 40 Z") + fillp("M 96 68 L 140 52 V 148 L 96 132 Z") + stroke("M 150 76 L 178 66 M 150 100 H 182 M 150 124 L 178 134", 6, `opacity="0.5"`));
  O("trashbin1", "Poubelle", "poubelle déchet corbeille", stroke("M 36 52 H 164 M 78 34 H 122", 9) + fillp("M 52 60 L 62 172 H 138 L 148 60 Z") + stroke("M 84 80 V 152 M 116 80 V 152", 6, `opacity="0.4"`));
  // Stationery
  O("pen1", "Stylo", "stylo écrire bureau", fillp("M 146 24 L 176 54 L 78 152 L 40 160 L 48 122 Z") + stroke("M 128 42 L 158 72", 5, `opacity="0.5"`) + fillp("M 40 160 L 48 122 L 78 152 Z", `opacity="0.55"`));
  O("marker1", "Marqueur", "marqueur feutre surligneur", fillp("M 60 24 H 140 V 70 L 120 90 H 80 L 60 70 Z") + fillp("M 80 90 H 120 V 150 L 100 176 L 80 150 Z", `opacity="0.7"`));
  O("notebook1", "Carnet", "carnet cahier notes bureau", stroke("M 50 24 H 156 V 176 H 50 Z", 9) + stroke("M 50 24 V 176", 14, `opacity="0.5"`) + stroke("M 78 60 H 138 M 78 90 H 138 M 78 120 H 120", 6, `opacity="0.5"`));
  O("calculator1", "Calculatrice", "calculatrice calcul bureau", stroke("M 44 20 H 156 V 180 H 44 Z", 8) + `<rect x="60" y="36" width="80" height="34" rx="6" fill="${C}" opacity="0.3"/>` + [92, 122, 152].flatMap((y) => [66, 100, 134].map((x) => `<circle cx="${x}" cy="${y}" r="9" fill="${C}"/>`)).join(""));
  O("paperclip1", "Trombone", "trombone attache bureau", stroke("M 66 176 V 60 A 34 34 0 0 1 134 60 V 150 A 20 20 0 0 1 94 150 V 78", 10));
  O("stamp1", "Tampon", "tampon cachet bureau", fillp("M 70 26 H 130 L 116 96 H 84 Z") + `<rect x="44" y="96" width="112" height="30" rx="8" fill="${C}"/>` + stroke("M 30 150 H 170 M 40 168 H 160", 9));
  // Tech devices
  O("tablet1", "Tablette", "tablette écran tech", `<rect x="44" y="20" width="112" height="160" rx="14" fill="none" stroke="${C}" stroke-width="8"/><circle cx="100" cy="162" r="7" fill="${C}"/>` + `<rect x="60" y="40" width="80" height="104" rx="4" fill="${C}" opacity="0.25"/>`);
  O("keyboard1", "Clavier", "clavier ordinateur tech", stroke("M 20 56 H 180 V 144 H 20 Z", 8) + [76, 106].flatMap((y) => Array.from({ length: 6 }, (_, i) => `<rect x="${34 + i * 24}" y="${y}" width="16" height="16" rx="3" fill="${C}" opacity="0.5"/>`)).join("") + `<rect x="60" y="120" width="80" height="14" rx="4" fill="${C}" opacity="0.5"/>`);
  O("mouse1", "Souris", "souris ordinateur tech", `<rect x="60" y="24" width="80" height="152" rx="40" fill="none" stroke="${C}" stroke-width="8"/>` + stroke("M 100 30 V 90", 8) + `<rect x="92" y="44" width="16" height="30" rx="6" fill="${C}"/>`);
  O("printer1", "Imprimante", "imprimante bureau tech", `<rect x="52" y="24" width="96" height="44" fill="none" stroke="${C}" stroke-width="7"/>` + fillp("M 30 68 H 170 V 128 H 30 Z") + `<rect x="52" y="120" width="96" height="56" fill="none" stroke="${C}" stroke-width="7"/>` + `<circle cx="150" cy="90" r="7" fill="${C}"/>`);
  O("gamepad1", "Manette", "manette jeu gaming tech", fillp("M 60 66 H 140 C 176 66 190 130 172 158 C 158 178 138 150 128 138 H 72 C 62 150 42 178 28 158 C 10 130 24 66 60 66 Z") + stroke("M 56 96 V 122 M 43 109 H 69", 8, `opacity="0.7"`) + `<circle cx="134" cy="100" r="8" fill="${C}" opacity="0.7"/><circle cx="152" cy="118" r="8" fill="${C}" opacity="0.7"/>`, 200, 200);
  O("watch2", "Montre connectée", "montre connectée smartwatch tech", `<rect x="60" y="52" width="80" height="96" rx="20" fill="none" stroke="${C}" stroke-width="9"/>` + fillp("M 74 24 H 126 L 120 52 H 80 Z M 80 148 H 120 L 126 176 H 74 Z", `opacity="0.6"`) + `<rect x="78" y="70" width="44" height="60" rx="8" fill="${C}" opacity="0.3"/>`);
  O("robot1", "Robot", "robot ia androïde tech", `<rect x="44" y="56" width="112" height="96" rx="18" fill="none" stroke="${C}" stroke-width="8"/>` + `<circle cx="76" cy="98" r="12" fill="${C}"/><circle cx="124" cy="98" r="12" fill="${C}"/>` + stroke("M 80 128 H 120 M 100 34 V 56", 8) + `<circle cx="100" cy="28" r="9" fill="${C}"/>` + stroke("M 44 96 H 26 M 156 96 H 174", 8));
  // Mode / vêtements
  O("pants1", "Pantalon", "pantalon vêtement mode habit", fillp("M 52 24 H 148 V 60 L 130 176 H 108 L 100 80 L 92 176 H 70 L 52 60 Z"));
  O("jacket1", "Veste", "veste manteau vêtement mode", fillp("M 70 24 L 40 44 L 24 110 L 48 122 V 176 H 152 V 122 L 176 110 L 160 44 L 130 24 L 100 52 Z") + stroke("M 100 52 V 176", 5, `opacity="0.4"`));
  O("sock1", "Chaussette", "chaussette vêtement mode", fillp("M 70 20 H 118 V 96 C 118 116 130 122 150 130 L 176 140 C 190 146 186 172 168 170 L 120 150 C 90 138 70 118 70 92 Z"));
  O("boot1", "Botte", "botte chaussure mode", fillp("M 60 20 H 108 V 110 C 108 130 130 140 160 148 L 180 154 V 180 H 60 Z"));
  O("tie1", "Cravate", "cravate vêtement mode", fillp("M 78 24 H 122 L 112 56 L 130 90 L 100 180 L 70 90 L 88 56 Z"));
  O("bag2", "Sac à main", "sac à main sacoche mode", stroke("M 66 66 C 66 40 134 40 134 66", 8) + fillp("M 40 66 H 160 L 150 168 H 50 Z"));
  O("glasses2", "Lunettes", "lunettes vue mode", `<circle cx="60" cy="106" r="34" fill="none" stroke="${C}" stroke-width="9"/><circle cx="140" cy="106" r="34" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 94 100 Q 100 88 106 100 M 26 92 L 12 74 M 174 92 L 188 74", 9));
  O("crown2", "Couronne", "couronne roi reine premium", fillp("M 24 150 L 14 54 L 62 90 L 100 30 L 138 90 L 186 54 L 176 150 Z") + `<circle cx="14" cy="46" r="8" fill="${C}"/><circle cx="100" cy="24" r="8" fill="${C}"/><circle cx="186" cy="46" r="8" fill="${C}"/>`, 200, 180, "#fbbf24");
  O("ring1", "Bague", "bague bijou diamant mode", `<circle cx="100" cy="128" r="52" fill="none" stroke="${C}" stroke-width="12"/>` + fillp("M 100 20 L 132 60 L 100 92 L 68 60 Z") + stroke("M 68 60 H 132 M 84 40 L 100 92 L 116 40", 4, `opacity="0.5"`), 200, 200, "#22d3ee");
})();

/* ── 30. Nourriture (2ᵉ vague) ── */
(() => {
  const K = "nourriture food cuisine repas";
  const F = (id: string, l: string, kw: string, body: string, color?: string, w = 200, h = 200) => add("food", id, l, `${K} ${kw}`, w, h, body, color);
  F("soda1", "Canette", "canette soda boisson", `<rect x="62" y="40" width="76" height="140" rx="14" fill="${C}"/>` + stroke("M 62 70 H 138 M 62 150 H 138", 5, `opacity="0.4"`) + `<ellipse cx="100" cy="40" rx="38" ry="10" fill="${C}" opacity="0.6"/><circle cx="100" cy="40" r="7" fill="${C}"/>`, "#ef4444", 200, 200);
  F("juice1", "Jus", "jus brique boisson", fillp("M 56 40 H 144 V 180 H 56 Z") + fillp("M 56 40 L 100 20 L 144 40 Z", `opacity="0.6"`) + stroke("M 108 60 L 108 30 L 150 30", 7) + `<rect x="72" y="96" width="56" height="44" rx="6" fill="${C}" opacity="0.25"/>`, "#fb923c");
  F("milkshake1", "Milkshake", "milkshake boisson dessert", fillp("M 60 70 H 140 L 128 180 H 72 Z") + `<circle cx="100" cy="58" r="26" fill="${C}"/>` + `<circle cx="82" cy="52" r="12" fill="${C}"/><circle cx="118" cy="54" r="10" fill="${C}"/>` + stroke("M 130 40 V 100", 6) + `<circle cx="100" cy="40" r="7" fill="${C}"/>`, "#f9a8d4");
  F("beer1", "Bière", "bière chope boisson", stroke("M 46 44 H 132 V 168 H 46 Z", 8) + stroke("M 132 66 H 162 A 22 22 0 0 1 162 130 H 132", 8) + fillp("M 46 44 C 46 28 132 28 132 44 C 118 36 106 44 92 40 C 78 36 60 44 46 44 Z", `opacity="0.7"`) + stroke("M 46 100 H 132", 6, `opacity="0.35"`), "#fbbf24");
  F("wine1", "Vin", "vin verre boisson", fillp("M 60 24 H 140 C 140 74 118 100 108 110 V 168 H 132 V 180 H 68 V 168 H 92 V 110 C 82 100 60 74 60 24 Z") + stroke("M 66 40 H 134", 5, `opacity="0.35"`), "#f43f5e", 200, 200);
  F("sushi1", "Sushi", "sushi nigiri japonais", fillp("M 34 116 C 34 96 166 96 166 116 V 140 C 166 160 34 160 34 140 Z") + fillp("M 40 100 C 60 82 140 82 160 100 C 140 92 60 92 40 100 Z", `opacity="0.7"`) + `<rect x="82" y="96" width="36" height="52" rx="4" fill="${C}" opacity="0.5"/>`, "#fb7185");
  F("sushiroll1", "Maki", "maki sushi rouleau japonais", `<circle cx="100" cy="100" r="72" fill="none" stroke="${C}" stroke-width="12"/>` + `<circle cx="100" cy="100" r="52" fill="${C}" opacity="0.3"/><circle cx="100" cy="100" r="22" fill="${C}"/>` + opc(78, 88, 8, 0.6) + opc(120, 110, 8, 0.6), "#22c55e");
  F("ramen1", "Ramen", "ramen soupe nouilles bol japonais", fillp("M 24 96 C 24 150 176 150 176 96 Z") + stroke("M 20 96 H 180", 8) + stroke("M 60 96 C 60 70 80 64 84 84 M 100 96 C 100 66 120 60 122 82 M 130 96 C 132 72 150 68 150 90", 5, `opacity="0.5"`) + stroke("M 150 40 L 90 80", 6) + `<circle cx="76" cy="112" r="10" fill="${C}" opacity="0.5"/>`, "#fbbf24");
  F("taco1", "Taco", "taco mexicain", fillp("M 20 150 A 80 80 0 0 1 180 150 Z") + fillp("M 20 150 A 80 66 0 0 1 180 150 Z", `opacity="0.55"`) + opc(70, 132, 8, 0.7) + opc(100, 126, 7, 0.7) + opc(130, 132, 8, 0.7), "#fbbf24", 200, 180);
  F("sandwich1", "Sandwich", "sandwich fast food", fillp("M 30 70 C 30 50 170 50 170 70 V 82 H 30 Z") + fillp("M 30 90 H 170 V 104 H 30 Z", `opacity="0.55"`) + fillp("M 30 112 L 170 112 L 158 150 H 42 Z") + stroke("M 44 130 H 156", 4, `opacity="0.4"`), "#f59e0b");
  F("hotdog2", "Hot-dog", "hotdog saucisse fast food", fillp("M 20 70 C 20 48 44 44 62 44 H 138 C 156 44 180 48 180 70 C 180 92 156 96 138 96 H 62 C 44 96 20 92 20 70 Z") + fillp("M 40 60 H 160 C 170 60 170 76 160 76 H 40 C 30 76 30 60 40 60 Z", `opacity="0.6"`), "#f59e0b", 200, 140);
  F("bagel1", "Bagel", "bagel pain viennoiserie", eo(`M 20 100 a 80 80 0 1 0 160 0 a 80 80 0 1 0 -160 0 Z` + holeC(100, 100, 30)) + Array.from({ length: 10 }, (_, k) => opc(polar(100, 100, 74, k * 36)[0], polar(100, 100, 74, k * 36)[1], 3, 0.4)).join(""), "#d97706");
  F("croissant2", "Croissant", "croissant viennoiserie", fillp("M 24 120 C 40 78 90 58 130 66 C 116 52 96 50 96 50 C 148 40 192 76 190 118 C 190 134 172 140 166 126 C 158 110 148 108 148 108 C 158 122 156 138 156 138 C 132 120 116 120 116 120 C 126 134 122 148 122 148 C 96 126 80 126 80 126 C 88 140 84 150 84 150 C 56 132 38 130 24 120 Z"), "#f59e0b", 220, 170);
  F("pancake1", "Pancakes", "pancakes crêpes dessert", Array.from({ length: 3 }, (_, k) => `<ellipse cx="100" cy="${146 - k * 26}" rx="${72 - k * 4}" ry="20" fill="${C}"/>`).join("") + fillp("M 100 74 C 90 58 110 50 100 34 C 116 44 108 66 100 74 Z", `opacity="0.7"`) + `<ellipse cx="100" cy="74" rx="20" ry="7" fill="${C}" opacity="0.5"/>`, "#f59e0b");
  F("waffle1", "Gaufre", "gaufre dessert", `<circle cx="100" cy="100" r="80" fill="${C}"/>` + stroke("M 44 60 H 156 M 44 100 H 156 M 44 140 H 156 M 60 44 V 156 M 100 44 V 156 M 140 44 V 156", 6, `opacity="0.35"`), "#fbbf24");
  F("cookie3", "Cookie", "cookie biscuit dessert", `<circle cx="100" cy="100" r="82" fill="${C}"/>` + [[70, 74], [128, 88], [86, 130], [130, 138], [104, 100]].map(([x, y]) => opc(x, y, 8, 0.45)).join(""), "#d97706");
  F("pie1", "Tarte", "tarte pie dessert", fillp("M 20 150 A 80 80 0 0 1 180 150 Z") + stroke("M 20 150 H 180", 8) + stroke("M 56 118 L 90 150 M 100 100 L 100 150 M 144 118 L 110 150 M 40 132 L 60 150 M 160 132 L 140 150", 5, `opacity="0.4"`), "#f59e0b", 200, 180);
  F("candy2", "Sucette plate", "sucette bonbon spirale candy", `<circle cx="100" cy="76" r="58" fill="${C}"/>` + stroke("M 100 76 m 0 -44 a 44 44 0 0 1 0 88 a 30 30 0 0 1 0 -60 a 18 18 0 0 1 0 36", 6, `opacity="0.4"`) + stroke("M 100 134 V 190", 8), "#ec4899");
  F("chocolate2", "Chocolat", "chocolat tablette dessert", fillp("M 34 34 H 166 V 166 H 34 Z") + stroke("M 100 34 V 166 M 34 100 H 166 M 66 34 V 166 M 134 34 V 166 M 34 66 H 166 M 34 134 H 166", 5, `opacity="0.3"`), "#a16207");
  F("cherrypie1", "Part de gâteau", "gâteau part cake dessert", fillp("M 40 60 H 160 V 168 H 40 Z") + stroke("M 40 92 H 160 M 40 128 H 160", 6, `opacity="0.35"`) + fillp("M 40 60 Q 70 42 100 60 T 160 60", `opacity="0.7"`) + `<circle cx="100" cy="44" r="10" fill="${C}"/>`, "#f9a8d4");
  F("honey1", "Miel", "miel pot abeille", fillp("M 56 60 H 144 V 172 A 12 12 0 0 1 132 184 H 68 A 12 12 0 0 1 56 172 Z") + fillp("M 48 40 H 152 V 60 H 48 Z", `opacity="0.7"`) + op("M 100 84 C 90 100 90 116 100 128 C 110 116 110 100 100 84 Z", 0.4), "#f59e0b");
  F("egg2", "Œuf au plat", "oeuf plat fried egg", `<ellipse cx="100" cy="104" rx="78" ry="60" fill="${C}" opacity="0.35"/>` + `<circle cx="104" cy="104" r="30" fill="${C}"/>`, "#facc15");
  F("cheese1", "Fromage", "fromage cheese", eo("M 24 150 L 34 74 L 190 66 L 178 150 Z" + holeC(72, 112, 12) + holeC(128, 98, 15) + holeC(150, 128, 9)), "#facc15", 210, 180);
  F("grapes1b", "Raisin", "raisin grappe fruit", (() => { let g = stroke("M 100 24 C 96 40 100 48 100 56", 6); const rows = [[100], [80, 120], [66, 100, 134], [82, 118], [100]]; let cy = 66; rows.forEach((row) => { row.forEach((cx) => { g += `<circle cx="${cx}" cy="${cy}" r="20" fill="${C}"/>`; g += opc(cx - 6, cy - 6, 5, 0.4); }); cy += 32; }); return g; })(), "#a78bfa", 200, 210);
  F("pineapple1", "Ananas", "ananas fruit tropical", fillp("M 85 66 C 46 66 34 110 40 154 C 46 194 70 210 85 210 C 100 210 124 194 130 154 C 136 110 124 66 85 66 Z") + Array.from({ length: 4 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<path d="M ${54 + c * 22} ${96 + r * 22} l 12 12 M ${66 + c * 22} ${84 + r * 22} l -12 12" stroke="${C}" stroke-width="3" opacity="0.4" fill="none"/>`).join("")).join("") + fillp("M 85 66 C 70 40 60 22 40 12 C 58 14 74 26 85 40 C 96 26 112 14 130 12 C 110 22 100 40 85 66 Z", `opacity="0.8"`), "#facc15", 170, 220);
  F("coconut1", "Noix de coco", "coco noix fruit tropical", fillp("M 100 20 A 80 80 0 1 0 100 180 A 80 80 0 0 1 100 20 Z", `transform="scale(-1 1) translate(-200 0)"`) + fillp("M 100 20 A 80 80 0 0 1 100 180 A 62 62 0 0 0 100 20 Z", `opacity="0.4"`) + opc(78, 78, 8, 0.6) + opc(122, 78, 8, 0.6) + opc(100, 106, 8, 0.6), "#a16207");
  F("watermelon1", "Pastèque", "pastèque melon fruit", fillp("M 12 30 A 96 96 0 0 0 188 30 Z") + fillp("M 24 30 A 84 84 0 0 0 176 30 Z", `opacity="0.4"`) + Array.from({ length: 6 }, (_, k) => opc(44 + k * 22, 60 + (k % 2) * 12, 5, 0.85)).join(""), "#f43f5e", 200, 150);
})();

/* ── 31. Animaux (2ᵉ vague) ── */
(() => {
  const K = "animal animaux";
  const A = (id: string, l: string, kw: string, body: string, color?: string, w = 200, h = 200) => add("animals", id, l, `${K} ${kw}`, w, h, body, color);
  A("koala1", "Koala", "koala", `<circle cx="52" cy="70" r="30" fill="${C}"/><circle cx="148" cy="70" r="30" fill="${C}"/>` + opc(52, 70, 15, 0.4) + opc(148, 70, 15, 0.4) + eo(`M 38 112 a 62 62 0 1 0 124 0 a 62 62 0 1 0 -124 0 Z` + holeC(80, 106, 8) + holeC(120, 106, 8) + holeC(100, 128, 15)), "#94a3b8");
  A("tiger1", "Tigre", "tigre félin chat", fillp("M 44 56 L 40 88 L 66 76 Z M 156 56 L 160 88 L 134 76 Z") + eo(`M 30 106 a 70 70 0 1 0 140 0 a 70 70 0 1 0 -140 0 Z` + holeC(80, 98, 9) + holeC(120, 98, 9) + holeC(100, 122, 10)), "#fb923c");
  A("giraffe1", "Girafe", "girafe", fillp("M 78 176 V 90 C 78 60 122 60 122 90 V 176") + `<circle cx="100" cy="52" r="32" fill="${C}"/>` + stroke("M 84 26 V 12 M 116 26 V 12", 8) + `<circle cx="84" cy="12" r="7" fill="${C}"/><circle cx="116" cy="12" r="7" fill="${C}"/>` + opc(90, 110, 10, 0.4) + opc(112, 140, 10, 0.4) + opc(88, 160, 9, 0.4), "#fbbf24");
  A("deer1", "Cerf", "cerf biche", stroke("M 68 60 C 50 40 44 24 44 12 M 68 44 C 54 40 46 32 42 24 M 132 60 C 150 40 156 24 156 12 M 132 44 C 146 40 154 32 158 24", 8) + eo(`M 58 120 a 42 52 0 1 0 84 0 a 42 52 0 1 0 -84 0 Z` + holeC(86, 108, 7) + holeC(114, 108, 7) + holeC(100, 132, 9)), "#d97706");
  A("hippo1", "Hippo", "hippopotame", `<circle cx="58" cy="70" r="12" fill="${C}"/><circle cx="142" cy="70" r="12" fill="${C}"/>` + eo(`M 24 112 a 76 60 0 1 0 152 0 a 76 60 0 1 0 -152 0 Z` + holeC(76, 92, 8) + holeC(124, 92, 8)) + eo(`M 52 150 a 20 16 0 1 0 40 0 a 20 16 0 1 0 -40 0 Z M 108 150 a 20 16 0 1 0 40 0 a 20 16 0 1 0 -40 0 Z` + holeC(72, 150, 5) + holeC(128, 150, 5)), "#a78bfa");
  A("monkey2", "Singe", "singe primate", `<circle cx="48" cy="90" r="24" fill="${C}"/><circle cx="152" cy="90" r="24" fill="${C}"/>` + opc(48, 90, 12, 0.4) + opc(152, 90, 12, 0.4) + eo(`M 34 104 a 66 66 0 1 0 132 0 a 66 66 0 1 0 -132 0 Z` + holeC(82, 92, 8) + holeC(118, 92, 8)) + `<ellipse cx="100" cy="132" rx="40" ry="30" fill="${C}" opacity="0.32"/>`, "#a16207");
  A("wolf1", "Loup", "loup canin", fillp("M 40 40 L 74 90 L 48 100 Z M 160 40 L 126 90 L 152 100 Z") + eo("M 100 60 C 62 60 46 96 54 128 L 100 178 L 146 128 C 154 96 138 60 100 60 Z" + holeC(80, 104, 8) + holeC(120, 104, 8) + holeC(100, 150, 9)), "#94a3b8");
  A("bearface2", "Ours", "ours nounours", `<circle cx="52" cy="56" r="26" fill="${C}"/><circle cx="148" cy="56" r="26" fill="${C}"/>` + opc(52, 56, 12, 0.4) + opc(148, 56, 12, 0.4) + eo(`M 28 112 a 72 72 0 1 0 144 0 a 72 72 0 1 0 -144 0 Z` + holeC(76, 100, 8) + holeC(124, 100, 8) + holeC(100, 122, 10)) + `<ellipse cx="100" cy="132" rx="26" ry="18" fill="${C}" opacity="0.35"/>`, "#d97706");
  A("lion2", "Lion", "lion félin roi", Array.from({ length: 12 }, (_, k) => { const [x, y] = polar(105, 105, 92, k * 30); return `<circle cx="${N(x)}" cy="${N(y)}" r="20" fill="${C}" opacity="0.55"/>`; }).join("") + `<circle cx="105" cy="105" r="60" fill="${C}"/>` + `<circle cx="86" cy="96" r="7" fill="${C}"/><circle cx="124" cy="96" r="7" fill="${C}"/>` + fillp("M 105 112 L 94 126 H 116 Z"), "#f59e0b", 210, 210);
  A("rooster1", "Coq", "coq poule oiseau ferme", fillp("M 60 120 C 40 100 44 70 70 66 C 90 40 140 44 150 80 C 176 90 176 130 150 140 C 140 168 80 168 66 144 C 58 138 56 130 60 120 Z") + fillp("M 70 60 C 66 44 76 38 84 42 M 90 54 C 88 36 100 30 108 36 M 108 54 C 108 36 122 32 128 40", `opacity="0.7"`) + fillp("M 150 90 L 178 84 L 158 104 Z") + `<circle cx="132" cy="92" r="6" fill="${C}"/>` + stroke("M 80 150 L 74 176 M 100 156 L 100 180 M 120 150 L 126 176", 7), "#ef4444");
  A("flamingo1", "Flamant", "flamant rose oiseau", stroke("M 100 176 V 120 C 100 90 120 88 120 60 C 120 40 100 34 88 44", 10) + `<circle cx="86" cy="42" r="18" fill="${C}"/>` + fillp("M 72 44 L 48 40 L 72 54 Z") + fillp("M 100 120 C 120 108 150 110 160 130 C 150 146 116 144 100 130 Z"), "#f472b6");
  A("parrot1", "Perroquet", "perroquet oiseau tropical", fillp("M 110 30 C 70 30 50 70 56 110 C 60 146 84 176 110 176 C 128 176 138 158 138 140 C 152 138 164 122 160 104 C 172 96 172 74 158 66 C 152 44 132 30 110 30 Z") + fillp("M 138 60 L 168 66 L 148 82 Z") + `<circle cx="120" cy="66" r="7" fill="${C}"/>` + stroke("M 90 90 C 100 130 100 150 96 170", 5, `opacity="0.4"`), "#22c55e");
  A("swan1", "Cygne", "cygne oiseau mer", stroke("M 70 176 C 50 140 60 96 96 88 C 120 82 120 54 104 44", 10) + `<circle cx="102" cy="42" r="12" fill="${C}"/>` + fillp("M 90 44 L 66 40 L 90 52 Z") + fillp("M 40 176 C 40 130 120 120 160 150 C 130 178 70 180 40 176 Z"), "#e2e8f0");
  A("peacock1", "Paon", "paon oiseau plumes", Array.from({ length: 7 }, (_, k) => { const a = -90 + (k - 3) * 22; const [x, y] = polar(100, 150, 96, a); return `<circle cx="${N(x)}" cy="${N(y)}" r="16" fill="${C}" opacity="0.5"/>` + stroke(`M 100 150 L ${N(x)} ${N(y)}`, 4, `opacity="0.4"`); }).join("") + `<ellipse cx="100" cy="150" rx="24" ry="34" fill="${C}"/>` + `<circle cx="100" cy="120" r="16" fill="${C}"/>` + stroke("M 100 104 V 88", 5) + `<circle cx="100" cy="84" r="5" fill="${C}"/>`, "#14b8a6", 200, 200);
  A("frog2", "Grenouille", "grenouille frog", `<circle cx="60" cy="52" r="26" fill="${C}"/><circle cx="140" cy="52" r="26" fill="${C}"/>` + `<circle cx="60" cy="52" r="10" fill="${C}"/><circle cx="140" cy="52" r="10" fill="${C}"/>` + fillp("M 105 60 C 55 60 28 96 34 134 C 40 168 170 168 176 134 C 182 96 155 60 105 60 Z") + stroke("M 70 140 Q 105 162 140 140", 7), "#22c55e", 210, 190);
  A("snake1", "Serpent", "serpent snake reptile", stroke("M 40 40 C 120 40 120 100 60 100 C 20 100 20 160 100 160 C 170 160 180 100 180 100", 14) + `<circle cx="184" cy="98" r="4" fill="${C}"/>` + stroke("M 188 96 L 200 90 M 188 100 L 200 106", 3), "#4ade80", 210, 200);
  A("ladybug1", "Coccinelle", "coccinelle insecte", stroke("M 84 40 C 78 26 70 22 64 24 M 106 40 C 112 26 120 22 126 24", 4) + eo(`M 23 104 a 72 72 0 1 0 144 0 a 72 72 0 1 0 -144 0 Z` + holeC(66, 92, 10) + holeC(124, 92, 10) + holeC(70, 136, 9) + holeC(120, 136, 9) + holeC(95, 148, 8) + " M 91 40 L 99 40 L 99 176 L 91 176 Z"), "#ef4444", 190, 190);
  A("dragonfly1", "Libellule", "libellule insecte", `<ellipse cx="100" cy="120" rx="10" ry="60" fill="${C}"/>` + `<circle cx="100" cy="50" r="18" fill="${C}"/>` + `<ellipse cx="60" cy="86" rx="44" ry="14" fill="${C}" opacity="0.5" transform="rotate(-20 60 86)"/><ellipse cx="140" cy="86" rx="44" ry="14" fill="${C}" opacity="0.5" transform="rotate(20 140 86)"/>` + `<ellipse cx="62" cy="112" rx="38" ry="12" fill="${C}" opacity="0.4" transform="rotate(-14 62 112)"/><ellipse cx="138" cy="112" rx="38" ry="12" fill="${C}" opacity="0.4" transform="rotate(14 138 112)"/>`, "#22d3ee");
  A("spider1", "Araignée", "araignée insecte", `<circle cx="100" cy="112" r="40" fill="${C}"/><circle cx="100" cy="72" r="22" fill="${C}"/>` + stroke("M 72 98 L 24 72 M 72 112 L 20 112 M 72 126 L 24 152 M 128 98 L 176 72 M 128 112 L 180 112 M 128 126 L 176 152", 6) + `<circle cx="92" cy="70" r="4" fill="${C}"/><circle cx="108" cy="70" r="4" fill="${C}"/>`, "#818cf8", 220, 200);
  A("crab1", "Crabe", "crabe crab mer", `<ellipse cx="110" cy="106" rx="66" ry="44" fill="${C}"/>` + `<circle cx="88" cy="96" r="7" fill="${C}"/><circle cx="132" cy="96" r="7" fill="${C}"/>` + stroke("M 44 96 C 20 90 12 70 24 56 M 176 96 C 200 90 208 70 196 56", 8) + fillp("M 24 56 L 8 48 L 20 40 Z M 196 56 L 212 48 L 200 40 Z") + stroke("M 50 132 L 26 152 M 74 144 L 58 168 M 146 144 L 162 168 M 170 132 L 194 152", 6), "#f87171", 220, 180);
  A("octopus1", "Poulpe", "poulpe pieuvre mer", fillp("M 105 30 C 65 30 40 62 40 102 V 120 H 170 V 102 C 170 62 145 30 105 30 Z") + stroke("M 50 120 C 40 160 28 176 20 184 M 74 122 C 70 166 60 184 52 194 M 105 124 V 196 M 136 122 C 140 166 150 184 158 194 M 160 120 C 170 160 182 176 190 184", 10) + `<circle cx="84" cy="86" r="8" fill="${C}"/><circle cx="126" cy="86" r="8" fill="${C}"/>`, "#f472b6", 210, 210);
  A("dolphin1", "Dauphin", "dauphin dolphin mer", fillp("M 20 150 C 40 90 110 60 180 66 C 160 46 150 34 150 34 C 200 40 206 96 200 120 C 196 140 170 148 152 138 C 120 120 70 130 46 168 C 40 176 26 168 20 150 Z") + fillp("M 60 150 L 40 186 L 76 172 Z", `opacity="0.7"`) + `<circle cx="176" cy="92" r="6" fill="${C}"/>`, "#38bdf8", 220, 190);
  A("turtle1", "Tortue", "tortue turtle mer", fillp("M 60 120 A 60 46 0 0 1 180 120 Z") + stroke("M 120 76 V 120 M 82 96 L 100 120 M 158 96 L 140 120", 5, `opacity="0.5"`) + `<circle cx="196" cy="112" r="16" fill="${C}"/><circle cx="200" cy="108" r="3" fill="${C}"/>` + fillp("M 66 118 L 54 148 H 74 L 82 122 Z M 174 118 L 186 148 H 166 L 158 122 Z"), "#22c55e", 220, 170);
  A("butterfly2", "Papillon", "papillon butterfly", fillp("M 104 100 C 60 40 20 44 24 88 C 26 120 66 128 104 108 Z") + fillp("M 104 100 C 148 40 188 44 184 88 C 182 120 142 128 104 108 Z") + fillp("M 104 100 C 66 120 34 140 46 172 C 58 196 96 168 104 120 Z") + fillp("M 104 100 C 142 120 174 140 162 172 C 150 196 112 168 104 120 Z") + stroke("M 104 74 V 150", 8) + stroke("M 104 74 C 92 56 82 50 74 48 M 104 74 C 116 56 126 50 134 48", 5) + opc(56, 82, 8, 0.4) + opc(152, 82, 8, 0.4), "#e879f9", 220, 200);
})();

/* ── 32. Météo (2ᵉ vague : phases de lune, variantes) ── */
(() => {
  const K = "météo ciel weather nuit espace";
  const W = (id: string, l: string, kw: string, body: string, color?: string, w = 200, h = 200) => add("weather", id, l, `${K} ${kw}`, w, h, body, color);
  // Phases de lune.
  W("moonfull", "Pleine lune", "lune pleine full moon", `<circle cx="100" cy="100" r="80" fill="${C}"/>` + opc(72, 76, 12, 0.35) + opc(126, 108, 16, 0.3) + opc(88, 128, 9, 0.35), "#fde68a");
  W("moonnew", "Nouvelle lune", "lune nouvelle new moon", `<circle cx="100" cy="100" r="80" fill="none" stroke="${C}" stroke-width="6"/>`, "#94a3b8");
  W("moonq1", "Premier quartier", "lune quartier moon", fillp("M 100 20 A 80 80 0 0 1 100 180 Z"), "#fde68a");
  W("moonq2", "Dernier quartier", "lune quartier moon", fillp("M 100 20 A 80 80 0 0 0 100 180 Z"), "#fde68a");
  W("mooncw", "Croissant croissant", "lune croissant waxing", fillp("M 120 22 A 80 80 0 1 0 120 178 A 60 60 0 0 1 120 22 Z"), "#fde68a");
  W("mooncd", "Croissant décroissant", "lune croissant waning", fillp("M 80 22 A 80 80 0 1 1 80 178 A 60 60 0 0 0 80 22 Z"), "#fde68a");
  W("moongw", "Gibbeuse croissante", "lune gibbeuse gibbous", eo(`M 100 20 a 80 80 0 1 0 0.1 0 Z` + ` M 140 40 a 46 80 0 1 0 0.1 0 Z`), "#fde68a");
  W("moongd", "Gibbeuse décroissante", "lune gibbeuse gibbous", eo(`M 100 20 a 80 80 0 1 0 0.1 0 Z` + ` M 60 40 a 46 80 0 1 0 0.1 0 Z`), "#fde68a");
  // Soleil variantes.
  W("sunwave", "Soleil ondulé", "soleil sun rayons ondulés", `<circle cx="100" cy="100" r="46" fill="${C}"/>` + Array.from({ length: 12 }, (_, k) => { const a = k * 30; const [x1, y1] = polar(100, 100, 58, a); const [x2, y2] = polar(100, 100, 82, a); return k % 2 ? stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 7) : fillp(`M ${N(polar(100, 100, 58, a - 6)[0])} ${N(polar(100, 100, 58, a - 6)[1])} L ${N(x2)} ${N(y2)} L ${N(polar(100, 100, 58, a + 6)[0])} ${N(polar(100, 100, 58, a + 6)[1])} Z`); }).join(""), "#fbbf24");
  W("sunset1", "Coucher de soleil", "coucher soleil sunset horizon", fillp("M 44 130 A 68 68 0 0 1 180 130 Z") + Array.from({ length: 7 }, (_, k) => { const a = 180 + k * 30; const [x1, y1] = polar(112, 130, 80, a); const [x2, y2] = polar(112, 130, 100, a); return stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 7); }).join("") + stroke("M 12 130 H 200 M 30 150 H 90 M 120 150 H 190", 8, `opacity="0.6"`), "#fb923c", 220, 170);
  // Nuage variantes.
  W("cloudrain2", "Nuage pluie", "nuage pluie averse rain", fillp("M 52 122 A 30 30 0 0 1 46 66 A 40 40 0 0 1 120 46 A 34 34 0 0 1 178 68 A 30 30 0 0 1 172 122 Z") + stroke("M 62 140 L 52 178 M 108 140 L 98 178 M 154 140 L 144 178", 7, `opacity="0.7"`), "#38bdf8", 220, 200);
  W("cloudsnow2", "Nuage neige", "nuage neige snow", fillp("M 52 122 A 30 30 0 0 1 46 66 A 40 40 0 0 1 120 46 A 34 34 0 0 1 178 68 A 30 30 0 0 1 172 122 Z") + [58, 104, 150].map((x) => `<circle cx="${x}" cy="166" r="8" fill="${C}" opacity="0.7"/>`).join(""), "#e2e8f0", 220, 200);
  W("cloudbolt2", "Nuage orage", "nuage orage éclair storm", fillp("M 52 122 A 30 30 0 0 1 46 66 A 40 40 0 0 1 120 46 A 34 34 0 0 1 178 68 A 30 30 0 0 1 172 122 Z") + fillp("M 108 130 L 78 176 H 100 L 88 200 L 132 156 H 108 L 122 130 Z", `opacity="0.9"`), "#facc15", 220, 200);
  W("rainbow2", "Arc-en-ciel", "arc-en-ciel rainbow", [0, 1, 2, 3, 4].map((k) => `<path d="M ${18 + k * 12} 150 A ${100 - k * 12} ${100 - k * 12} 0 0 1 ${182 - k * 12} 150" fill="none" stroke="${C}" stroke-width="9" opacity="${1 - k * 0.16}"/>`).join(""), "#f472b6", 200, 160);
  W("wind2", "Vent", "vent brise wind souffle", stroke("M 20 56 H 130 A 22 22 0 1 0 108 34", 10) + stroke("M 20 100 H 168 A 24 24 0 1 1 144 124", 10, `opacity="0.75"`) + stroke("M 20 142 H 104 A 18 18 0 1 0 86 124", 10, `opacity="0.55"`), "#94a3b8", 200, 180);
  W("star1", "Étoile scintillante", "étoile star nuit ciel scintille", fillp(starPts(100, 100, 4, 84, 26)), "#fde047");
  W("planet1", "Planète", "planète saturne espace", `<circle cx="100" cy="100" r="54" fill="${C}"/>` + `<ellipse cx="100" cy="100" rx="92" ry="30" fill="none" stroke="${C}" stroke-width="8" transform="rotate(-20 100 100)"/>` + opc(84, 84, 10, 0.35), "#a78bfa");
  W("thermohot1", "Chaleur", "thermomètre chaud chaleur température", stroke("M 60 22 V 150", 10) + `<circle cx="60" cy="176" r="26" fill="${C}"/>` + fillp("M 55 90 H 65 V 172 H 55 Z", `opacity="0.6"`) + Array.from({ length: 4 }, (_, k) => { const [x1, y1] = polar(140, 70, 20, k * 45), [x2, y2] = polar(140, 70, 36, k * 45); return stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 6); }).join(""), "#f87171", 200, 210);
  W("umbrellarain1", "Parapluie pluie", "parapluie pluie averse", fillp("M 100 30 C 52 30 24 74 24 96 C 46 84 58 84 62 100 C 76 84 88 84 100 100 C 112 84 124 84 138 100 C 142 84 154 84 176 96 C 176 74 148 30 100 30 Z") + stroke("M 100 30 V 150 C 100 168 82 168 78 154", 8) + stroke("M 40 130 L 34 152 M 150 120 L 156 142", 6, `opacity="0.6"`), "#38bdf8", 200, 200);
})();

/* ── 33. Sport (2ᵉ vague) ── */
(() => {
  const K = "sport loisir jeu";
  const S = (id: string, l: string, kw: string, body: string, color?: string, w = 200, h = 200) => add("sport", id, l, `${K} ${kw}`, w, h, body, color);
  S("golfball1", "Balle de golf", "golf balle", `<circle cx="100" cy="100" r="78" fill="${C}"/>` + Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => opc(56 + c * 30 + (r % 2) * 15, 56 + r * 30, 5, 0.4)).join("")).join(""), "#e2e8f0");
  S("puck1", "Palet hockey", "hockey palet puck", `<ellipse cx="100" cy="112" rx="72" ry="30" fill="${C}"/>` + fillp("M 28 92 A 72 30 0 0 0 172 92 V 112 A 72 30 0 0 1 28 112 Z", `opacity="0.5"`), "#334155");
  S("hockeystick1", "Crosse hockey", "hockey crosse stick", stroke("M 150 24 L 60 150", 12) + fillp("M 60 150 L 40 178 H 88 L 74 156 Z"), "#f59e0b");
  S("racket1", "Raquette", "raquette tennis badminton", `<ellipse cx="100" cy="76" rx="56" ry="66" fill="none" stroke="${C}" stroke-width="10"/>` + stroke("M 58 50 H 142 M 54 76 H 146 M 60 104 H 140 M 100 14 V 138 M 76 18 V 134 M 124 18 V 134", 4, `opacity="0.4"`) + stroke("M 100 142 V 190 M 84 190 H 116", 10), "#22c55e");
  S("shuttle1", "Volant", "badminton volant shuttlecock", fillp("M 78 130 H 122 L 116 156 H 84 Z") + `<circle cx="100" cy="150" r="20" fill="${C}"/>` + Array.from({ length: 5 }, (_, k) => stroke(`M ${88 + k * 6} 130 L ${70 + k * 15} 40`, 6)).join(""), "#e2e8f0");
  S("weights1", "Haltères", "haltère poids musculation fitness", fillp("M 14 50 H 40 V 150 H 14 Z M 46 40 H 72 V 160 H 46 Z") + fillp("M 186 50 H 160 V 150 H 186 Z M 154 40 H 128 V 160 H 154 Z") + fillp("M 72 88 H 128 V 112 H 72 Z"), "#818cf8", 200, 200);
  S("barbell1", "Barre", "barre haltère musculation fitness", fillp("M 20 60 H 40 V 140 H 20 Z M 46 74 H 64 V 126 H 46 Z") + fillp("M 180 60 H 160 V 140 H 180 Z M 154 74 H 136 V 126 H 136 154 74 Z") + fillp("M 64 92 H 136 V 108 H 64 Z"), "#94a3b8");
  S("punchbag1", "Sac de frappe", "boxe sac frappe punching", stroke("M 100 20 V 44 M 80 44 H 120 M 88 44 L 78 60 M 112 44 L 122 60", 7) + fillp("M 74 60 H 126 C 134 60 138 70 136 82 L 128 160 C 126 176 74 176 72 160 L 64 82 C 62 70 66 60 74 60 Z") + stroke("M 68 110 H 132 M 70 136 H 130", 6, `opacity="0.4"`), "#ef4444");
  S("yoga1", "Tapis de yoga", "yoga tapis fitness", `<rect x="30" y="46" width="120" height="108" rx="16" fill="none" stroke="${C}" stroke-width="9"/>` + `<circle cx="160" cy="100" r="26" fill="none" stroke="${C}" stroke-width="9"/>` + stroke("M 30 100 H 150", 5, `opacity="0.4"`), "#14b8a6", 200, 200);
  S("skate2", "Skateboard", "skate skateboard planche", fillp("M 20 60 C 20 44 44 44 60 46 H 170 C 186 44 210 44 210 60 C 210 76 186 76 170 74 H 60 C 44 76 20 76 20 60 Z") + `<circle cx="66" cy="104" r="18" fill="none" stroke="${C}" stroke-width="8"/><circle cx="164" cy="104" r="18" fill="none" stroke="${C}" stroke-width="8"/>`, "#fb923c", 230, 130);
  S("surf2", "Surf", "surf surfboard planche mer", fillp("M 65 10 C 30 60 30 170 65 220 C 100 170 100 60 65 10 Z") + stroke("M 65 30 V 200", 5, `opacity="0.5"`), "#14b8a6", 130, 230);
  S("ski1", "Ski", "ski neige montagne hiver", stroke("M 40 176 L 150 30 M 60 176 L 170 30", 8) + stroke("M 30 176 H 66 M 54 176 H 90", 5, `opacity="0.6"`) + `<circle cx="150" cy="30" r="8" fill="${C}"/><circle cx="170" cy="30" r="8" fill="${C}"/>`, "#38bdf8");
  S("trophy2", "Trophée", "trophée coupe victoire prix", stroke("M 56 26 H 144 V 90 A 44 44 0 0 1 56 90 Z", 9) + stroke("M 56 42 H 24 A 32 32 0 0 0 60 90 M 144 42 H 176 A 32 32 0 0 1 140 90", 8) + stroke("M 100 134 V 160 M 64 184 H 136", 10) + fillp("M 64 160 H 136 V 180 H 64 Z"), "#fbbf24", 200, 210);
  S("dumbbell2", "Haltère", "haltère fitness musculation", fillp("M 14 40 H 40 V 90 H 14 Z M 46 30 H 70 V 100 H 46 Z") + fillp("M 206 40 H 180 V 90 H 206 Z M 174 30 H 150 V 100 H 174 Z") + fillp("M 70 56 H 150 V 74 H 70 Z"), "#818cf8", 220, 130);
})();

/* ── 34. Nature (2ᵉ vague : fleurs, arbres, plantes) ── */
(() => {
  const K = "nature plante";
  const NA = (id: string, l: string, kw: string, body: string, color?: string, w = 200, h = 200) => add("nature", id, l, `${K} ${kw}`, w, h, body, color);
  NA("rose1", "Rose", "rose fleur", fillp("M 100 40 C 130 40 148 66 140 92 C 158 88 172 108 162 128 C 174 140 166 166 144 168 C 148 186 122 194 108 180 C 100 190 80 186 78 172 C 58 174 44 152 56 136 C 40 130 40 104 60 98 C 50 76 68 50 96 54 C 96 46 98 42 100 40 Z") + op("M 100 70 C 116 74 122 94 108 106 C 94 100 90 82 100 70 Z", 0.4), "#f43f5e");
  NA("tulip1", "Tulipe", "tulipe fleur printemps", fillp("M 100 30 C 80 50 76 74 76 100 C 76 60 92 44 100 40 C 108 44 124 60 124 100 C 124 74 120 50 100 30 Z") + fillp("M 76 96 C 62 70 60 50 66 34 C 84 44 96 66 100 96 M 124 96 C 138 70 140 50 134 34 C 116 44 104 66 100 96", `opacity="0.85"`) + stroke("M 100 100 V 180", 8) + fillp("M 100 140 C 70 130 58 108 62 90 C 92 96 104 120 100 140 Z", `opacity="0.6"`), "#ec4899");
  NA("sunflower1", "Tournesol", "tournesol fleur soleil", Array.from({ length: 16 }, (_, k) => `<ellipse cx="100" cy="46" rx="12" ry="30" fill="${C}" transform="rotate(${k * 22.5} 100 100)"/>`).join("") + `<circle cx="100" cy="100" r="34" fill="${C}" opacity="0.5"/>` + `<circle cx="100" cy="100" r="34" fill="none" stroke="${C}" stroke-width="4"/>`, "#fbbf24");
  NA("lotus1", "Lotus", "lotus fleur nénuphar", fillp("M 100 40 C 88 70 88 100 100 130 C 112 100 112 70 100 40 Z") + fillp("M 100 130 C 70 120 54 96 56 72 C 84 82 98 106 100 130 Z M 100 130 C 130 120 146 96 144 72 C 116 82 102 106 100 130 Z", `opacity="0.8"`) + fillp("M 100 130 C 60 128 34 110 30 88 C 66 92 92 108 100 130 Z M 100 130 C 140 128 166 110 170 88 C 134 92 108 108 100 130 Z", `opacity="0.6"`), "#f9a8d4");
  NA("blossom1", "Fleur de cerisier", "cerisier sakura fleur", Array.from({ length: 5 }, (_, k) => fillp(`M 100 56 C 88 56 82 72 88 84 C 78 80 66 90 72 102 L 100 96 Z`, `transform="rotate(${k * 72} 100 100)"`)).join("") + `<circle cx="100" cy="100" r="12" fill="${C}" opacity="0.5"/>`, "#f9a8d4");
  NA("palm1", "Palmier", "palmier arbre tropical", stroke("M 100 180 C 96 130 100 96 104 76", 12) + Array.from({ length: 6 }, (_, k) => { const a = -150 + k * 24; const [ex, ey] = polar(104, 72, 76, a); return fillp(`M 104 72 Q ${N((104 + ex) / 2 + Math.cos((a + 90) * Math.PI / 180) * 20)} ${N((72 + ey) / 2 + Math.sin((a + 90) * Math.PI / 180) * 20)} ${N(ex)} ${N(ey)} Q ${N((104 + ex) / 2)} ${N((72 + ey) / 2)} 104 72 Z`); }).join(""), "#22c55e");
  NA("cactus1", "Cactus", "cactus plante désert", `<rect x="80" y="70" width="40" height="120" rx="20" fill="${C}"/>` + stroke("M 80 130 C 60 130 50 116 50 96 A 12 12 0 0 1 74 96 V 116", 20) + stroke("M 120 116 C 140 116 150 102 150 82 A 12 12 0 0 1 126 82 V 102", 20), "#22c55e", 200, 200);
  NA("bamboo1", "Bambou", "bambou plante zen", stroke("M 80 190 V 20 M 120 190 V 40", 12) + stroke("M 66 70 H 94 M 66 120 H 94 M 66 160 H 94 M 106 90 H 134 M 106 140 H 134", 5, `opacity="0.5"`) + fillp("M 80 40 C 60 30 48 40 50 56 C 70 58 82 50 80 40 Z", `opacity="0.7"`), "#22c55e");
  NA("clover1", "Trèfle", "trèfle chance porte-bonheur", Array.from({ length: 4 }, (_, k) => `<circle cx="100" cy="66" r="26" fill="${C}" transform="rotate(${k * 90} 100 100)"/>`).join("") + stroke("M 100 100 C 104 140 100 160 96 184", 7), "#22c55e");
  NA("acorn1", "Gland", "gland chêne automne", fillp("M 62 84 C 62 130 138 130 138 84 Z") + fillp("M 56 60 C 56 44 144 44 144 60 C 144 84 56 84 56 60 Z") + stroke("M 74 62 H 126 M 68 72 H 132", 4, `opacity="0.4"`) + stroke("M 100 130 V 150", 6), "#a16207");
  NA("mushroom1b", "Champignon", "champignon nature", fillp("M 20 100 C 20 46 170 46 170 100 C 170 108 20 108 20 100 Z") + opc(58, 78, 8, 0.4) + opc(120, 72, 10, 0.4) + fillp("M 74 104 H 116 L 108 186 H 82 Z"), "#ef4444", 190, 200);
  NA("succulent1", "Plante grasse", "succulente plante pot", fillp("M 60 130 H 140 L 128 190 H 72 Z") + Array.from({ length: 8 }, (_, k) => `<ellipse cx="100" cy="98" rx="12" ry="30" fill="${C}" transform="rotate(${k * 45} 100 118)"/>`).join("") + `<circle cx="100" cy="118" r="14" fill="${C}" opacity="0.5"/>`, "#22c55e");
  NA("leafmaple1", "Feuille d'érable", "feuille érable automne maple", fillp("M 100 186 V 140 M 100 150 L 60 160 L 70 138 L 30 120 L 54 110 L 40 82 L 74 90 L 78 60 L 100 84 L 122 60 L 126 90 L 160 82 L 146 110 L 170 120 L 130 138 L 140 160 L 100 150 Z"), "#f97316");
  NA("wheat1", "Blé", "blé épi céréale nature", stroke("M 100 190 V 60", 8) + Array.from({ length: 6 }, (_, k) => { const y = 60 + k * 20; return `<ellipse cx="82" cy="${y}" rx="12" ry="7" fill="${C}" transform="rotate(-35 82 ${y})"/><ellipse cx="118" cy="${y}" rx="12" ry="7" fill="${C}" transform="rotate(35 118 ${y})"/>`; }).join("") + `<ellipse cx="100" cy="46" rx="10" ry="20" fill="${C}"/>`, "#fbbf24");
  NA("waterdrop1", "Goutte", "goutte eau water nature", fillp("M 100 20 C 140 76 166 112 166 142 A 66 66 0 0 1 34 142 C 34 112 60 76 100 20 Z") + stroke("M 122 142 A 24 24 0 0 1 98 166", 5, `opacity="0.4"`), "#38bdf8");
})();

/* ── 35. Fête (2ᵉ vague) ── */
(() => {
  const K = "fête party célébration anniversaire";
  const P = (id: string, l: string, kw: string, body: string, color?: string, w = 200, h = 200) => add("party", id, l, `${K} ${kw}`, w, h, body, color);
  P("partyhat1", "Chapeau fête", "chapeau cône fête anniversaire", fillp("M 100 20 L 150 160 H 50 Z") + stroke("M 78 90 L 122 90 M 68 130 L 132 130", 6, `opacity="0.5"`) + `<circle cx="100" cy="20" r="12" fill="${C}"/>`, "#f472b6");
  P("popper1", "Cotillon", "cotillon party popper confettis", fillp("M 30 170 L 90 110 L 130 150 Z") + Array.from({ length: 8 }, (_, k) => { const [x, y] = polar(110, 130, 50 + (k % 3) * 14, -80 + k * 12); return k % 2 ? `<circle cx="${N(x)}" cy="${N(y)}" r="6" fill="${C}"/>` : `<rect x="${N(x)}" y="${N(y)}" width="10" height="7" fill="${C}" transform="rotate(${k * 20} ${N(x)} ${N(y)})"/>`; }).join(""), "#fb923c");
  P("fireworkx", "Feu d'artifice", "feu artifice firework célébration", Array.from({ length: 12 }, (_, k) => { const a = k * 30; const [x1, y1] = polar(100, 100, 24, a), [x2, y2] = polar(100, 100, 84, a); return stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 5) + `<circle cx="${N(x2)}" cy="${N(y2)}" r="6" fill="${C}"/>`; }).join(""), "#f472b6");
  P("sparkler1", "Cierge magique", "cierge magique étincelle fête", stroke("M 60 176 L 120 90", 8) + Array.from({ length: 14 }, (_, k) => { const r = rng(k * 13 + 3); const [x, y] = polar(124, 84, 20 + r() * 40, r() * 360); return stroke(`M 124 84 L ${N(x)} ${N(y)}`, N(2 + r() * 2), `opacity="${N(0.5 + r() * 0.5)}"`); }).join(""), "#fde047");
  P("buntingx", "Fanions", "guirlande fanions banderole fête", stroke("M 10 30 Q 100 60 190 30", 5) + Array.from({ length: 7 }, (_, k) => { const x = 20 + k * 27; const y = 34 + Math.sin((k / 6) * Math.PI) * 22; return fillp(`M ${x} ${N(y)} L ${x + 20} ${N(y)} L ${x + 10} ${N(y + 30)} Z`); }).join(""), "#f472b6", 200, 120);
  P("discoball1", "Boule disco", "boule disco fête soirée", `<circle cx="100" cy="112" r="66" fill="${C}"/>` + stroke("M 34 112 H 166 M 100 46 V 178 M 52 66 L 148 158 M 148 66 L 52 158 M 44 90 H 156 M 44 134 H 156", 3, `opacity="0.4"`) + stroke("M 100 46 V 24 M 80 24 H 120", 6), "#a78bfa");
  P("champagne1", "Champagne", "champagne trinquer cheers fête", stroke("M 74 30 L 80 90 C 80 110 70 116 70 116 V 170 M 54 176 H 86", 8) + stroke("M 126 30 L 120 90 C 120 110 130 116 130 116 V 170 M 114 176 H 146", 8) + op(starPts(100, 50, 4, 12, 4), 0.6), "#fbbf24");
  P("giftbow1", "Nœud cadeau", "noeud ruban cadeau fête", fillp("M 100 100 C 60 60 24 70 40 104 C 52 128 88 118 100 100 Z") + fillp("M 100 100 C 140 60 176 70 160 104 C 148 128 112 118 100 100 Z") + `<circle cx="100" cy="100" r="16" fill="${C}"/>` + fillp("M 90 112 L 70 170 H 90 L 100 116 Z M 110 112 L 130 170 H 110 L 100 116 Z", `opacity="0.7"`), "#f43f5e");
})();

/* ── 36. Déco / motifs (3ᵉ vague paramétrique) ── */
(() => {
  // Champs de formes (triangles, croix, plus, cœurs, étoiles, hexagones).
  const glyphs: [string, (x: number, y: number, s: number) => string][] = [
    ["triangles", (x, y, s) => fillp(`M ${x} ${y - s} L ${x + s} ${y + s} L ${x - s} ${y + s} Z`)],
    ["plus", (x, y, s) => fillp(`M ${x - s / 3} ${y - s} H ${x + s / 3} V ${y - s / 3} H ${x + s} V ${y + s / 3} H ${x + s / 3} V ${y + s} H ${x - s / 3} V ${y + s / 3} H ${x - s} V ${y - s / 3} H ${x - s / 3} Z`)],
    ["crosses", (x, y, s) => stroke(`M ${x - s} ${y - s} L ${x + s} ${y + s} M ${x + s} ${y - s} L ${x - s} ${y + s}`, 4)],
    ["stars4", (x, y, s) => fillp(starPts(x, y, 4, s, s * 0.36))],
    ["hearts", (x, y, s) => fillp(`M ${x} ${y + s * 0.7} C ${x - s} ${y} ${x - s * 0.6} ${y - s * 0.8} ${x} ${y - s * 0.3} C ${x + s * 0.6} ${y - s * 0.8} ${x + s} ${y} ${x} ${y + s * 0.7} Z`)],
    ["hex", (x, y, s) => fillp(polyPts(x, y, 6, s, -90))],
    ["rings", (x, y, s) => `<circle cx="${x}" cy="${y}" r="${N(s * 0.8)}" fill="none" stroke="${C}" stroke-width="3"/>`],
    ["squares", (x, y, s) => `<rect x="${N(x - s * 0.7)}" y="${N(y - s * 0.7)}" width="${N(s * 1.4)}" height="${N(s * 1.4)}" fill="${C}"/>`],
  ];
  glyphs.forEach(([name, fn]) => {
    for (let s = 0; s < 8; s++) {
      const r = rng(s * 31 + name.length * 7);
      const cols = 5 + Math.floor(r() * 3), rows = 4 + Math.floor(r() * 2), gap = 34, sz = 8 + r() * 6;
      let g = "";
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) g += fn(24 + i * gap + (j % 2) * (gap / 2), 24 + j * gap, sz);
      add("deco", `field_${name}${s}`, "Motif", `motif champ semis pattern ${name}`, 24 + cols * gap + gap / 2, 24 + rows * gap, g);
    }
  });
  // Chevrons / herringbone.
  for (let s = 0; s < 14; s++) { const r = rng(s * 41 + 5); const rows = 3 + Math.floor(r() * 3), amp = 16 + r() * 10; let g = ""; for (let row = 0; row < rows; row++) { let d = `M 10 ${N(40 + row * (amp + 20))} `; for (let k = 0; k < 5; k++) d += `L ${N(34 + k * 48)} ${N(40 + row * (amp + 20) + (k % 2 ? amp : 0))} `; g += stroke(d, N(5 + r() * 3)); } add("deco", `xchevron${s}`, "Chevrons", "motif chevrons zigzag pattern", 260, 40 + rows * (amp + 20), g); }
  // Grilles / quadrillage.
  for (let s = 0; s < 14; s++) { const r = rng(s * 53 + 9); const gap = 24 + Math.floor(r() * 16); let g = ""; for (let x = 10; x <= 250; x += gap) g += stroke(`M ${x} 8 V 152`, N(2 + r() * 3), `opacity="0.6"`); for (let y = 8; y <= 152; y += gap) g += stroke(`M 10 ${y} H 250`, N(2 + r() * 3), `opacity="0.6"`); add("deco", `xgrid${s}`, "Quadrillage", "motif grille quadrillage pattern", 260, 160, g); }
})();

/* ── 37. Cadres (2ᵉ vague) ── */
(() => {
  const K = "cadre bordure frame";
  const F = (id: string, l: string, kw: string, body: string, w = 220, h = 180, color?: string) => add("frames", id, l, `${K} ${kw}`, w, h, body, color);
  // Pellicule ciné.
  F("film0", "Pellicule", "film pellicule ciné vidéo cadre", `<rect x="14" y="20" width="192" height="140" rx="6" fill="none" stroke="${C}" stroke-width="8"/>` + Array.from({ length: 6 }, (_, k) => `<rect x="${28 + k * 30}" y="26" width="16" height="14" rx="2" fill="${C}"/><rect x="${28 + k * 30}" y="140" width="16" height="14" rx="2" fill="${C}"/>`).join(""));
  // Cadre certificat (double + coins).
  F("cert0", "Cadre certificat", "certificat diplôme cadre orné", `<rect x="16" y="16" width="188" height="148" fill="none" stroke="${C}" stroke-width="6"/><rect x="30" y="30" width="160" height="120" fill="none" stroke="${C}" stroke-width="3" opacity="0.6"/>` + [[30, 30], [190, 30], [30, 150], [190, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${C}"/>`).join(""));
  // Arche.
  F("arch0", "Cadre arche", "arche cadre porte", stroke("M 30 164 V 80 A 70 70 0 0 1 190 80 V 164", 9), 220, 190);
  // Hexagone.
  F("hex0", "Cadre hexagone", "hexagone cadre", stroke(polyPts(110, 90, 6, 78, -90), 9), 220, 180);
  // Tag / étiquette.
  F("tag0", "Cadre étiquette", "étiquette tag cadre label", eo(`M 40 30 H 200 V 150 H 40 L 14 90 Z` + holeC(60, 90, 8)), 220, 180);
  // Ruban plié.
  F("ribbon0", "Ruban", "ruban bannière cadre", fillp("M 30 40 H 190 V 100 H 30 Z") + fillp("M 30 40 L 10 70 L 30 100 Z M 190 40 L 210 70 L 190 100 Z", `opacity="0.6"`) + stroke("M 30 70 H 190", 4, `opacity="0.4"`), 220, 140);
  // Bulle-cadre.
  F("speechframe0", "Cadre bulle", "bulle cadre message parole", stroke("M 20 24 H 200 V 128 H 90 L 54 164 L 62 128 H 20 Z", 8), 220, 180);
  // Coins ruban adhésif.
  F("tape0", "Cadre scotch", "scotch adhésif cadre photo", `<rect x="30" y="30" width="160" height="120" fill="none" stroke="${C}" stroke-width="4" opacity="0.5"/>` + fillp("M 14 40 L 60 14 L 74 34 L 30 60 Z", `opacity="0.5"`) + fillp("M 206 40 L 160 14 L 146 34 L 190 60 Z", `opacity="0.5"`), 220, 180);
  // Festonné rond.
  { const bumps = 16, R = 82, r = 9; let d = ""; for (let k = 0; k < bumps * 4; k++) { const a = (k * 360) / (bumps * 4); const rr = k % 2 === 0 ? R : R - r; const [x, y] = polar(100, 100, rr, a); d += (k === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `; } F("scalloprd0", "Cadre festonné rond", "festonné rond cadre", stroke(d + "Z", 6), 200, 200); }
})();

/* ═══════════ Éléments « travaillés » : relief, volume, jeux de couleur ═══════════
   Une seule couleur éditable → variantes claires/sombres/accent dérivées
   automatiquement (jetons __CM__/__CL__/__CLL__/__CD__/__CDD__/__CA__/__CW__),
   plus des dégradés internes pour le volume. Pas du 2D plat. */
(() => {
  const HD = (cat: string, id: string, label: string, kw: string, color: string, body: string, w = 200, h = 200, slots?: { label: string; def?: string }[]) =>
    add(cat, `hd${id}`, label, `${kw} relief volume 3d détaillé travaillé dégradé`, w, h, body, color, slots);
  const orb = (cx: number, cy: number, r: number, gid: string) =>
    `<defs><radialGradient id="${gid}" cx="35%" cy="28%" r="74%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.55" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})"/>`;
  const glint = (cx: number, cy: number, rx: number, ry: number, rot = -30) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="__CW__" opacity="0.6" transform="rotate(${rot} ${cx} ${cy})"/>`;
  // Motif STRICTEMENT contenu dans la sphère : sans découpe, les coutures
  // débordent de la silhouette du ballon.
  const inBall = (cx: number, cy: number, r: number, cid: string, inner: string) =>
    `<defs><clipPath id="${cid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><g clip-path="url(#${cid})">${inner}</g>`;
  const lin = (gid: string, a: string, b: string, x2 = "1", y2 = "1") =>
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;

  /* Nature */
  HD("nature", "leaf", "Feuille", "nature feuille leaf", "#22c55e",
    lin("lf", "__CLL__", "__CD__") + `<path d="M 100 190 C 40 158 26 74 100 14 C 174 74 160 158 100 190 Z" fill="url(#lf)"/>` +
    `<path d="M 100 176 C 92 120 92 70 100 30" fill="none" stroke="__CLL__" stroke-width="5" opacity="0.7"/>` +
    `<path d="M 100 120 L 66 96 M 100 96 L 132 74 M 100 150 L 72 132 M 100 74 L 126 56" stroke="__CD__" stroke-width="3" opacity="0.5" fill="none"/>`);
  HD("nature", "flower", "Fleur", "nature fleur flower", "#ec4899",
    `<defs><radialGradient id="pet" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="__CLL__"/><stop offset="1" stop-color="__CD__"/></radialGradient></defs>` +
    Array.from({ length: 7 }, (_, k) => `<ellipse cx="100" cy="52" rx="20" ry="42" fill="url(#pet)" transform="rotate(${N((k * 360) / 7)} 100 100)"/>`).join("") +
    `<circle cx="100" cy="100" r="24" fill="__C1~__"/>` + `<circle cx="100" cy="100" r="24" fill="none" stroke="__CDD__" stroke-width="3" opacity="0.4"/>` + glint(92, 92, 8, 6, 0), 200, 200, [{ label: "Pétales" }, { label: "Cœur", def: "#facc15" }]);
  HD("nature", "sun", "Soleil", "nature soleil sun", "#fbbf24",
    `<defs><radialGradient id="sg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CD__"/></radialGradient></defs>` +
    Array.from({ length: 12 }, (_, k) => { const a = k * 30; const [x1, y1] = polar(100, 100, 58, a), [x2, y2] = polar(100, 100, 92, a); return `<path d="M ${N(polar(100, 100, 58, a - 5)[0])} ${N(polar(100, 100, 58, a - 5)[1])} L ${N(x2)} ${N(y2)} L ${N(polar(100, 100, 58, a + 5)[0])} ${N(polar(100, 100, 58, a + 5)[1])} Z" fill="__CA2__"/>`; }).join("") +
    `<circle cx="100" cy="100" r="52" fill="url(#sg)"/>` + glint(84, 82, 14, 10));
  HD("nature", "tree", "Arbre", "nature arbre tree", "#16a34a",
    `<rect x="90" y="120" width="20" height="70" rx="8" fill="__CDD__"/>` +
    orb(70, 90, 42, "t1") + orb(130, 90, 42, "t2") + orb(100, 64, 46, "t3"));
  HD("nature", "mountain", "Montagne", "nature montagne mountain", "#64748b",
    lin("mg", "__CL__", "__CDD__", "0.4", "1") + `<path d="M 16 176 L 96 40 L 176 176 Z" fill="url(#mg)"/>` +
    `<path d="M 96 40 L 122 84 L 108 96 L 96 84 L 84 100 L 70 84 Z" fill="__CLL__"/>` +
    `<path d="M 96 40 L 176 176 L 116 176 L 96 120 Z" fill="__CDD__" opacity="0.45"/>`, 200, 200);
  HD("nature", "planet", "Planète", "nature planète espace planet", "#8b5cf6",
    `<ellipse cx="100" cy="106" rx="94" ry="26" fill="__CA2__" opacity="0.9" transform="rotate(-18 100 106)"/>` +
    orb(100, 100, 54, "pl") + `<ellipse cx="100" cy="100" rx="94" ry="26" fill="none" stroke="__CDD__" stroke-width="3" opacity="0.5" transform="rotate(-18 100 100)"/>`);
  HD("nature", "droplet", "Goutte", "nature goutte eau water", "#38bdf8",
    `<defs><radialGradient id="dr" cx="38%" cy="30%" r="70%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 100 14 C 142 74 168 112 168 142 A 68 68 0 0 1 32 142 C 32 112 58 74 100 14 Z" fill="url(#dr)"/>` + glint(78, 120, 12, 20, -20));
  HD("nature", "mushroom", "Champignon", "nature champignon mushroom", "#ef4444",
    `<path d="M 80 100 H 120 L 112 186 H 88 Z" fill="__CL__"/>` +
    `<defs><radialGradient id="mc" cx="42%" cy="24%" r="80%"><stop offset="0" stop-color="__CLL__"/><stop offset="1" stop-color="__CD__"/></radialGradient></defs>` +
    `<path d="M 22 104 C 22 46 178 46 178 104 C 178 116 22 116 22 104 Z" fill="url(#mc)"/>` +
    `<ellipse cx="64" cy="80" rx="10" ry="7" fill="__CLL__"/><ellipse cx="124" cy="74" rx="12" ry="8" fill="__CLL__"/><ellipse cx="98" cy="94" rx="7" ry="5" fill="__CLL__"/>`, 200, 200);
  HD("nature", "cactus", "Cactus", "nature cactus plante", "#22c55e",
    lin("ca", "__CL__", "__CD__", "1", "0") + `<rect x="82" y="60" width="36" height="130" rx="18" fill="url(#ca)"/>` +
    `<path d="M 82 128 C 60 128 50 112 50 92 A 12 12 0 0 1 74 92 V 110" fill="none" stroke="__CM__" stroke-width="22" stroke-linecap="round"/>` +
    `<path d="M 118 112 C 140 112 150 96 150 76 A 12 12 0 0 1 126 76 V 94" fill="none" stroke="__CM__" stroke-width="22" stroke-linecap="round"/>` +
    `<path d="M 100 66 V 180" stroke="__CDD__" stroke-width="3" opacity="0.35" fill="none"/>` + `<circle cx="100" cy="58" r="12" fill="__C1~__"/>`, 200, 200, [{ label: "Cactus" }, { label: "Fleur", def: "#f472b6" }]);
  HD("nature", "wave", "Vague", "nature vague mer eau wave", "#0ea5e9",
    lin("wv", "__CL__", "__CDD__", "0", "1") + `<path d="M 10 120 C 40 60 90 60 118 96 C 138 122 168 120 190 96 V 180 H 10 Z" fill="url(#wv)"/>` +
    `<path d="M 10 120 C 40 60 90 60 118 96 C 138 122 168 120 190 96" fill="none" stroke="__CW__" stroke-width="6" opacity="0.7"/>` +
    `<circle cx="150" cy="88" r="6" fill="__CW__" opacity="0.7"/><circle cx="168" cy="98" r="4" fill="__CW__" opacity="0.6"/>`, 200, 190);

  /* Sport — ballons en relief */
  HD("sport", "soccer", "Ballon foot", "sport football ballon soccer", "#f8fafc",
    orb(100, 100, 84, "sc") +
    inBall(100, 100, 84, "scc", `<path d="${polyPts(100, 100, 5, 30)}" fill="__C1~__"/>` +
      Array.from({ length: 5 }, (_, k) => { const [x, y] = polar(100, 100, 60, -90 + k * 72); return `<path d="M ${N(polar(100, 100, 34, -90 + k * 72)[0])} ${N(polar(100, 100, 34, -90 + k * 72)[1])} L ${N(x)} ${N(y)}" stroke="__C1~__" stroke-width="6" fill="none"/>` + `<circle cx="${N(x)}" cy="${N(y)}" r="9" fill="__C1~__" opacity="0.7"/>`; }).join("")) +
    glint(74, 72, 16, 11), 200, 200, [{ label: "Ballon" }, { label: "Motif", def: "#1f2937" }]);
  HD("sport", "basket", "Ballon basket", "sport basketball ballon", "#f97316",
    orb(100, 100, 84, "bk") +
    inBall(100, 100, 84, "bkc", `<path d="M 16 100 H 184 M 100 16 V 184 M 42 40 C 82 80 82 120 42 160 M 158 40 C 118 80 118 120 158 160" fill="none" stroke="__C1~__" stroke-width="5"/>`) +
    glint(74, 72, 15, 10), 200, 200, [{ label: "Ballon" }, { label: "Lignes", def: "#1f2937" }]);
  HD("sport", "tennis", "Balle tennis", "sport tennis balle", "#a3e635",
    orb(100, 100, 84, "tn") +
    inBall(100, 100, 84, "tnc", `<path d="M 40 26 C 80 68 80 132 40 174 M 160 26 C 120 68 120 132 160 174" fill="none" stroke="__C1~__" stroke-width="6"/>`) +
    glint(74, 72, 15, 10), 200, 200, [{ label: "Balle" }, { label: "Coutures", def: "#f8fafc" }]);
  HD("sport", "baseball", "Balle baseball", "sport baseball balle", "#f8fafc",
    orb(100, 100, 84, "bb") +
    inBall(100, 100, 84, "bbc", `<path d="M 46 30 C 76 70 76 130 46 170 M 154 30 C 124 70 124 130 154 170" fill="none" stroke="__C1~__" stroke-width="4"/>` +
      Array.from({ length: 6 }, (_, k) => `<path d="M 54 ${44 + k * 20} l 11 -7 M 146 ${44 + k * 20} l -11 -7" stroke="__C1~__" stroke-width="3" fill="none"/>`).join("")) +
    glint(74, 72, 14, 10), 200, 200, [{ label: "Balle" }, { label: "Coutures", def: "#e11d48" }]);
  HD("sport", "volley", "Volley", "sport volley volleyball ballon", "#38bdf8",
    orb(100, 100, 84, "vl") +
    inBall(100, 100, 84, "vlc", `<path d="M 100 12 C 58 60 58 140 100 188 M 12 100 C 70 88 152 122 188 88 M 38 36 C 92 100 92 142 58 186" fill="none" stroke="__C1~__" stroke-width="5"/>`) +
    glint(74, 72, 14, 10), 200, 200, [{ label: "Ballon" }, { label: "Lignes", def: "#f8fafc" }]);
  HD("sport", "bowling", "Boule bowling", "sport bowling boule", "#6366f1",
    orb(100, 100, 84, "bw") +
    inBall(100, 100, 84, "bwc", `<circle cx="80" cy="74" r="8" fill="__C1~__"/><circle cx="106" cy="68" r="8" fill="__C1~__"/><circle cx="94" cy="94" r="8" fill="__C1~__"/>`) +
    glint(72, 64, 13, 9), 200, 200, [{ label: "Boule" }, { label: "Trous", def: "#1f2937" }]);
  HD("sport", "trophy", "Trophée", "sport trophée coupe prix", "#f59e0b",
    lin("tr", "__CLL__", "__CD__") + `<path d="M 56 26 H 144 V 88 A 44 44 0 0 1 56 88 Z" fill="url(#tr)"/>` +
    `<path d="M 56 42 H 24 A 32 32 0 0 0 60 88 M 144 42 H 176 A 32 32 0 0 1 140 88" fill="none" stroke="__CD__" stroke-width="8"/>` +
    `<rect x="92" y="132" width="16" height="26" fill="__CD__"/><rect x="64" y="158" width="72" height="20" rx="4" fill="__CDD__"/>` +
    `<path d="M 78 40 V 74 A 22 22 0 0 0 100 84" stroke="__CLL__" stroke-width="6" opacity="0.7" fill="none"/>`, 200, 200);
  HD("sport", "medal", "Médaille", "sport médaille récompense", "#fbbf24",
    `<path d="M 50 12 L 95 90 L 140 12 Z" fill="__C1~__" opacity="0.85"/>` +
    orb(95, 132, 56, "md") + `<circle cx="95" cy="132" r="40" fill="none" stroke="__CDD__" stroke-width="4" opacity="0.5"/>` +
    `<path d="${starPts(95, 132, 5, 28, 12)}" fill="__CLL__"/>`, 190, 200, [{ label: "Médaille" }, { label: "Ruban", def: "#ef4444" }]);
  HD("sport", "dumbbell", "Haltère", "sport haltère musculation fitness", "#818cf8",
    lin("db", "__CLL__", "__CDD__", "0", "1") + `<rect x="14" y="42" width="28" height="96" rx="8" fill="url(#db)"/><rect x="48" y="30" width="26" height="120" rx="8" fill="url(#db)"/>` +
    `<rect x="186" y="42" width="-28" height="96" rx="8" fill="url(#db)" transform="translate(200 0) scale(-1 1)"/>` +
    `<rect x="126" y="30" width="26" height="120" rx="8" fill="url(#db)"/><rect x="158" y="42" width="28" height="96" rx="8" fill="url(#db)"/>` +
    `<rect x="74" y="80" width="52" height="20" fill="__CM__"/>` + `<rect x="74" y="80" width="52" height="6" fill="__CLL__" opacity="0.6"/>`, 200, 180);

  /* Nourriture — volume & brillance */
  HD("food", "apple", "Pomme", "food pomme apple fruit", "#ef4444",
    `<path d="M 100 58 C 102 40 110 30 124 28" fill="none" stroke="__CDD__" stroke-width="7"/>` +
    `<defs><radialGradient id="ap" cx="38%" cy="30%" r="72%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 100 62 C 78 42 46 48 40 84 C 34 124 58 176 84 176 C 92 178 100 172 100 172 C 100 172 108 178 116 176 C 142 176 166 124 160 84 C 154 48 122 42 100 62 Z" fill="url(#ap)"/>` +
    `<path d="M 108 42 C 128 28 150 34 152 54 C 130 60 110 52 108 42 Z" fill="__C1~__"/>` + glint(74, 92, 12, 22, -18), 200, 200, [{ label: "Pomme" }, { label: "Feuille", def: "#22c55e" }]);
  HD("food", "orange", "Orange", "food orange agrume fruit", "#fb923c",
    orb(100, 106, 76, "or") + `<circle cx="100" cy="106" r="76" fill="none" stroke="__CDD__" stroke-width="2" opacity="0.3"/>` +
    `<path d="M 100 30 L 84 12 L 118 12 Z" fill="__C1~__"/>` + glint(76, 84, 14, 10), 200, 200, [{ label: "Orange" }, { label: "Feuille", def: "#22c55e" }]);
  HD("food", "grapes", "Raisin", "food raisin grappe fruit", "#8b5cf6",
    (() => { const rows = [[100], [80, 120], [66, 100, 134], [82, 118], [100]]; let cy = 66, g = `<path d="M 100 30 C 96 44 100 52 100 60" stroke="__CDD__" stroke-width="6" fill="none"/>` + `<path d="M 100 40 C 120 30 138 34 140 50 C 122 56 106 50 100 40 Z" fill="__C1~__"/>`; let i = 0; rows.forEach((row) => { row.forEach((cx) => { g += orb(cx, cy, 19, `gr${i++}`); }); cy += 32; }); return g; })(), 200, 210, [{ label: "Raisin" }, { label: "Feuille", def: "#22c55e" }]);
  HD("food", "icecream", "Glace", "food glace cornet ice cream", "#f9a8d4",
    lin("cn", "__CA2__", "__CD__") + `<path d="M 74 210 L 42 100 H 158 L 126 210 Z" fill="url(#cn)"/>` +
    `<path d="M 58 118 L 74 150 M 100 110 V 158 M 142 118 L 126 150" stroke="__CDD__" stroke-width="3" opacity="0.4" fill="none"/>` +
    orb(70, 76, 40, "sc1") + orb(130, 76, 40, "sc2") + orb(100, 48, 44, "sc3") + glint(84, 34, 10, 7), 200, 220);
  HD("food", "watermelon", "Pastèque", "food pastèque melon fruit", "#f43f5e",
    `<path d="M 12 30 A 96 96 0 0 0 188 30 Z" fill="__CA__"/>` +
    `<path d="M 24 30 A 84 84 0 0 0 176 30 Z" fill="__CLL__" opacity="0.35"/>` +
    `<path d="M 30 30 A 78 78 0 0 0 170 30 Z" fill="__CM__"/>` +
    [46, 68, 90, 112, 134].map((x, k) => `<ellipse cx="${x + (k % 2) * 6}" cy="${52 + (k % 2) * 14}" rx="4" ry="7" fill="__CDD__"/>`).join(""), 200, 140);
  HD("food", "donut", "Donut", "food donut beignet dessert", "#a16207",
    `<defs><radialGradient id="dn" cx="50%" cy="42%" r="60%"><stop offset="0.4" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path fill-rule="evenodd" d="M 12 100 a 88 88 0 1 0 176 0 a 88 88 0 1 0 -176 0 Z${holeC(100, 100, 34)}" fill="url(#dn)"/>` +
    `<path d="M 40 74 A 78 78 0 0 1 160 74 A 40 40 0 0 0 100 62 A 40 40 0 0 0 40 74 Z" fill="__CA__"/>` +
    Array.from({ length: 8 }, (_, k) => { const a = k * 45; const [x, y] = polar(100, 76, 50, a); return `<rect x="${N(x - 5)}" y="${N(y - 2)}" width="12" height="5" rx="2" fill="__CLL__" transform="rotate(${a} ${N(x)} ${N(y)})"/>`; }).join(""));

  /* Objets & divers */
  HD("objects", "balloon", "Ballon", "objet ballon baudruche party", "#fb7185",
    `<defs><radialGradient id="bl" cx="38%" cy="30%" r="72%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 85 16 C 40 16 28 74 50 116 C 62 138 78 148 78 156 H 92 C 92 148 108 138 120 116 C 142 74 130 16 85 16 Z" fill="url(#bl)"/>` +
    `<path d="M 78 156 L 92 156 L 85 168 Z" fill="__CDD__"/>` + `<path d="M 85 168 C 96 184 74 196 85 210" stroke="__CD__" stroke-width="3" fill="none"/>` + glint(64, 56, 12, 20, -22), 170, 220);
  HD("objects", "bulb", "Ampoule", "objet ampoule idée lumière lightbulb", "#fde047",
    `<defs><radialGradient id="bb" cx="42%" cy="34%" r="70%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.7" stop-color="__CM__"/><stop offset="1" stop-color="__CD__"/></radialGradient></defs>` +
    `<path d="M 85 14 A 60 60 0 0 1 115 126 L 110 150 H 60 L 55 126 A 60 60 0 0 1 85 14 Z" fill="url(#bb)"/>` +
    `<path d="M 62 160 H 108 M 68 178 H 102" stroke="__CDD__" stroke-width="8" fill="none"/>` +
    `<path d="M 72 120 L 85 96 L 98 120" stroke="__CD__" stroke-width="4" fill="none" opacity="0.6"/>` + glint(68, 46, 10, 16, -20), 170, 210);
  HD("objects", "gem", "Diamant", "objet diamant gemme gem cristal", "#22d3ee",
    `<path d="M 42 16 H 158 L 190 66 L 100 184 Z" fill="__CM__"/>` +
    `<path d="M 42 16 L 68 66 L 10 66 Z" fill="__CL__"/><path d="M 68 66 L 100 16 L 132 66 Z" fill="__CLL__"/><path d="M 132 66 L 158 16 L 190 66 Z" fill="__CD__"/>` +
    `<path d="M 10 66 L 100 184 L 68 66 Z" fill="__CD__"/><path d="M 68 66 H 132 L 100 184 Z" fill="__CM__"/><path d="M 132 66 H 190 L 100 184 Z" fill="__CDD__"/>` +
    `<path d="M 100 16 V 66" stroke="__CLL__" stroke-width="2" opacity="0.5"/>`, 200, 200);
  HD("objects", "star", "Étoile", "objet étoile star favori", "#fbbf24",
    lin("st", "__CLL__", "__CD__") + `<path d="${starPts(100, 100, 5, 88, 38)}" fill="url(#st)"/>` + glint(80, 72, 14, 9, -20));
  HD("objects", "heart", "Cœur", "objet coeur heart amour love", "#f43f5e",
    `<defs><radialGradient id="ht" cx="40%" cy="30%" r="70%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 100 178 C 34 128 12 88 40 56 C 64 30 94 42 100 66 C 106 42 136 30 160 56 C 188 88 166 128 100 178 Z" fill="url(#ht)"/>` + glint(70, 74, 14, 20, -30), 200, 190);
  HD("objects", "crown", "Couronne", "objet couronne roi premium crown", "#fbbf24",
    lin("cr", "__CLL__", "__CD__") + `<path d="M 24 150 L 14 54 L 62 90 L 100 30 L 138 90 L 186 54 L 176 150 Z" fill="url(#cr)"/>` +
    `<rect x="24" y="150" width="152" height="20" rx="4" fill="__CDD__"/>` +
    `<circle cx="14" cy="48" r="8" fill="__C1~__"/><circle cx="100" cy="24" r="9" fill="__C1~__"/><circle cx="186" cy="48" r="8" fill="__C1~__"/><circle cx="100" cy="120" r="10" fill="__C1~__"/>`, 200, 180, [{ label: "Couronne" }, { label: "Gemmes", def: "#22d3ee" }]);
  HD("objects", "coin", "Pièce", "objet pièce monnaie coin argent", "#fbbf24",
    orb(100, 100, 82, "co") + `<circle cx="100" cy="100" r="62" fill="none" stroke="__CDD__" stroke-width="4" opacity="0.4"/>` +
    `<path d="M 100 58 V 142 M 84 74 H 112 A 14 14 0 0 1 112 102 H 84 H 118" stroke="__CDD__" stroke-width="7" fill="none" opacity="0.55"/>` + glint(76, 76, 14, 10));

  /* Météo */
  HD("weather", "moon", "Lune", "météo lune moon nuit croissant", "#fde68a",
    `<defs><radialGradient id="mn" cx="60%" cy="40%" r="70%"><stop offset="0" stop-color="__CLL__"/><stop offset="1" stop-color="__CD__"/></radialGradient></defs>` +
    `<path d="M 122 20 A 84 84 0 1 0 122 180 A 66 66 0 0 1 122 20 Z" fill="url(#mn)"/>` +
    `<circle cx="86" cy="70" r="9" fill="__CD__" opacity="0.5"/><circle cx="70" cy="112" r="7" fill="__CD__" opacity="0.5"/><circle cx="96" cy="132" r="5" fill="__CD__" opacity="0.5"/>`);
  HD("weather", "cloud", "Nuage", "météo nuage cloud ciel", "#e2e8f0",
    lin("cl", "__CLL__", "__CD__", "0", "1") + `<path d="M 52 130 A 30 30 0 0 1 46 72 A 40 40 0 0 1 120 52 A 34 34 0 0 1 178 74 A 30 30 0 0 1 172 130 Z" fill="url(#cl)"/>` +
    `<path d="M 46 72 A 40 40 0 0 1 120 52 A 34 34 0 0 1 178 74" fill="none" stroke="__CLL__" stroke-width="5" opacity="0.6"/>`, 220, 150);
  HD("weather", "rainbow", "Arc-en-ciel", "météo arc-en-ciel rainbow couleur", "#f43f5e",
    ["__CM__", "__CA2__", "__CLL__", "__CA__", "__CD__"].map((c, k) => `<path d="M ${18 + k * 13} 150 A ${100 - k * 13} ${100 - k * 13} 0 0 1 ${182 - k * 13} 150" fill="none" stroke="${c}" stroke-width="11"/>`).join(""), 200, 160);
  HD("weather", "snowflake", "Flocon", "météo flocon neige snowflake hiver", "#7dd3fc",
    lin("sf", "__CLL__", "__CD__") + Array.from({ length: 6 }, (_, k) => { const a = k * 60; const [x2, y2] = polar(100, 100, 86, a); const [bx, by] = polar(100, 100, 54, a); const [t1x, t1y] = polar(bx, by, 22, a - 40), [t2x, t2y] = polar(bx, by, 22, a + 40); return `<path d="M 100 100 L ${N(x2)} ${N(y2)} M ${N(t1x)} ${N(t1y)} L ${N(bx)} ${N(by)} L ${N(t2x)} ${N(t2y)}" stroke="url(#sf)" stroke-width="6" stroke-linecap="round" fill="none"/>`; }).join("") + `<circle cx="100" cy="100" r="10" fill="__CLL__"/>`);
})();

/* ═══════════ Vague HD 2 : relief & volume à grande échelle ═══════════ */
(() => {
  const HD = (cat: string, id: string, label: string, kw: string, color: string, body: string, w = 200, h = 200, slots?: { label: string; def?: string }[]) =>
    add(cat, `hd${id}`, label, `${kw} relief volume 3d détaillé travaillé dégradé`, w, h, body, color, slots);
  const orb = (cx: number, cy: number, r: number, gid: string) =>
    `<defs><radialGradient id="${gid}" cx="35%" cy="28%" r="74%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.55" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})"/>`;
  const orbE = (cx: number, cy: number, rx: number, ry: number, gid: string) =>
    `<defs><radialGradient id="${gid}" cx="35%" cy="28%" r="74%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.55" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${gid})"/>`;
  const glint = (cx: number, cy: number, rx: number, ry: number, rot = -30, o = 0.6) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="__CW__" opacity="${o}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const lin = (gid: string, a: string, b: string, x2 = "1", y2 = "1") =>
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
  // Motif STRICTEMENT contenu dans la sphère : sans découpe, les coutures
  // débordent de la silhouette du ballon.
  const inBall = (cx: number, cy: number, r: number, cid: string, inner: string) =>
    `<defs><clipPath id="${cid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><g clip-path="url(#${cid})">${inner}</g>`;
  const eyes = (lx: number, rx: number, y: number, r: number) =>
    `<circle cx="${lx}" cy="${y}" r="${r}" fill="__CDD__"/><circle cx="${rx}" cy="${y}" r="${r}" fill="__CDD__"/>` +
    `<circle cx="${N(lx + r * 0.3)}" cy="${N(y - r * 0.35)}" r="${N(r * 0.34)}" fill="__CW__"/><circle cx="${N(rx + r * 0.3)}" cy="${N(y - r * 0.35)}" r="${N(r * 0.34)}" fill="__CW__"/>`;

  /* ── Nature : fruits, plantes, paysage ── */
  HD("nature", "leaf2", "Feuille ronde", "nature feuille leaf", "#16a34a",
    lin("lf2", "__CLL__", "__CDD__") + `<path d="M 100 188 C 22 156 12 66 100 12 C 188 66 178 156 100 188 Z" fill="url(#lf2)"/>` +
    `<path d="M 100 176 V 26" stroke="__CLL__" stroke-width="5" opacity="0.65" fill="none"/>` +
    Array.from({ length: 5 }, (_, k) => `<path d="M 100 ${52 + k * 26} L ${64 - k * 2} ${34 + k * 26} M 100 ${52 + k * 26} L ${136 + k * 2} ${34 + k * 26}" stroke="__CD__" stroke-width="3" opacity="0.45" fill="none"/>`).join(""));
  HD("nature", "clover", "Trèfle", "nature trèfle chance", "#22c55e",
    Array.from({ length: 4 }, (_, k) => `<g transform="rotate(${k * 90} 100 100)">${orbE(100, 64, 28, 30, `cv${k}`)}</g>`).join("") +
    `<path d="M 100 100 C 106 140 100 164 94 186" stroke="__CDD__" stroke-width="8" fill="none"/>`);
  HD("nature", "pine", "Sapin", "nature sapin arbre forêt", "#16a34a",
    `<rect x="90" y="160" width="20" height="34" rx="6" fill="__CDD__"/>` +
    [0, 1, 2].map((k) => { const halfW = 40 + k * 20, topY = 16 + k * 46, botY = topY + 68;
      return lin(`pn${k}`, "__CLL__", "__CD__", "1", "0.6") +
        `<path d="M 100 ${topY} L ${N(100 + halfW)} ${botY} H ${N(100 - halfW)} Z" fill="url(#pn${k})"/>` +
        `<path d="M 100 ${topY} L ${N(100 + halfW)} ${botY} H 100 Z" fill="__CDD__" opacity="0.28"/>`; }).join(""), 200, 210);
  HD("nature", "flower2", "Fleur ronde", "nature fleur flower marguerite", "#a855f7",
    Array.from({ length: 8 }, (_, k) => `<g transform="rotate(${N(k * 45)} 100 100)">${orbE(100, 54, 21, 32, `fp${k}`)}</g>`).join("") +
    orb(100, 100, 26, "fc") + glint(92, 92, 7, 5, 0, 0.5));
  HD("nature", "rose", "Rose", "nature rose fleur", "#f43f5e",
    `<defs><radialGradient id="rs" cx="46%" cy="40%" r="62%"><stop offset="0" stop-color="__CLL__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 100 26 C 142 26 168 60 160 100 C 174 122 158 156 128 158 C 116 178 78 178 66 156 C 34 152 24 116 42 96 C 34 58 60 26 100 26 Z" fill="url(#rs)"/>` +
    `<path d="M 100 52 C 124 56 134 82 118 98 C 98 92 90 68 100 52 Z" fill="__CLL__" opacity="0.55"/>` +
    `<path d="M 108 84 C 122 96 118 116 102 120 C 92 108 96 90 108 84 Z" fill="__CD__" opacity="0.6"/>` +
    `<path d="M 100 158 V 194" stroke="__C1~__" stroke-width="8" fill="none"/>` +
    `<path d="M 100 172 C 70 164 58 146 62 130 C 90 136 102 156 100 172 Z" fill="__C1~__"/>`, 200, 200, [{ label: "Fleur" }, { label: "Tige & feuille", def: "#22c55e" }]);
  HD("nature", "sunflower", "Tournesol", "nature tournesol fleur soleil", "#facc15",
    Array.from({ length: 14 }, (_, k) => `<g transform="rotate(${N(k * (360 / 14))} 100 100)">${orbE(100, 46, 13, 32, `sfp${k}`)}</g>`).join("") +
    `<defs><radialGradient id="sfc" cx="40%" cy="34%" r="70%"><stop offset="0" stop-color="__C1~__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs><circle cx="100" cy="100" r="36" fill="url(#sfc)"/>` +
    Array.from({ length: 9 }, (_, k) => { const [x, y] = polar(100, 100, 20, k * 40); return `<circle cx="${N(x)}" cy="${N(y)}" r="3.5" fill="__CDD__" opacity="0.6"/>`; }).join(""), 200, 200, [{ label: "Pétales" }, { label: "Cœur", def: "#78350f" }]);
  HD("nature", "cloud2", "Nuage volume", "nature nuage cloud ciel", "#e2e8f0",
    orb(58, 106, 34, "cd1") + orb(104, 84, 44, "cd2") + orb(150, 104, 36, "cd3") + `<rect x="24" y="106" width="152" height="34" rx="17" fill="__CD__"/>` + `<rect x="24" y="106" width="152" height="18" rx="9" fill="__CM__" opacity="0.8"/>`, 200, 160);
  HD("nature", "rock", "Rocher", "nature rocher pierre caillou", "#94a3b8",
    lin("rk", "__CLL__", "__CDD__", "0.4", "1") + `<path d="M 20 160 L 48 70 L 96 40 L 156 66 L 184 160 Z" fill="url(#rk)"/>` +
    `<path d="M 96 40 L 156 66 L 120 96 Z" fill="__CLL__" opacity="0.5"/><path d="M 48 70 L 96 40 L 120 96 L 74 110 Z" fill="__CL__" opacity="0.4"/>` +
    `<path d="M 184 160 L 156 66 L 120 96 L 140 160 Z" fill="__CDD__" opacity="0.45"/>`, 200, 180);
  HD("nature", "volcano", "Volcan", "nature volcan montagne", "#78716c",
    lin("vc", "__CL__", "__CDD__", "0.3", "1") + `<path d="M 12 180 L 72 50 H 128 L 188 180 Z" fill="url(#vc)"/>` +
    `<path d="M 72 50 H 128 L 112 66 H 88 Z" fill="__CDD__"/>` +
    `<path d="M 84 50 C 78 30 92 22 90 8 C 104 20 100 36 108 50 Z" fill="__C1~L__"/>` +
    `<path d="M 100 66 C 108 96 96 120 104 148 L 88 148 C 82 116 92 92 88 66 Z" fill="__C1~L__" opacity="0.8"/>`, 200, 200, [{ label: "Volcan" }, { label: "Lave", def: "#f97316" }]);
  HD("nature", "seedling", "Pousse", "nature pousse germe plante", "#22c55e",
    `<path d="M 100 190 V 110" stroke="__CD__" stroke-width="9" fill="none"/>` +
    lin("sd1", "__CLL__", "__CD__") + `<path d="M 100 118 C 58 112 40 78 48 50 C 88 58 106 90 100 118 Z" fill="url(#sd1)"/>` +
    lin("sd2", "__CL__", "__CDD__") + `<path d="M 100 100 C 142 94 160 62 152 36 C 112 44 96 74 100 100 Z" fill="url(#sd2)"/>` +
    `<path d="M 60 172 A 40 18 0 0 1 140 172 Z" fill="__CDD__" opacity="0.35"/>`);
  HD("nature", "island", "Île", "nature île plage tropical", "#22c55e",
    `<ellipse cx="100" cy="158" rx="86" ry="26" fill="__C1~__"/>` + `<ellipse cx="100" cy="152" rx="70" ry="20" fill="__C1~L__"/>` +
    `<path d="M 100 150 C 96 120 100 100 104 84" stroke="__CD__" stroke-width="9" fill="none"/>` +
    Array.from({ length: 5 }, (_, k) => { const a = -160 + k * 30; const [ex, ey] = polar(104, 80, 62, a); return `<path d="M 104 80 Q ${N((104 + ex) / 2 + Math.cos((a + 90) * Math.PI / 180) * 18)} ${N((80 + ey) / 2 + Math.sin((a + 90) * Math.PI / 180) * 18)} ${N(ex)} ${N(ey)} Q ${N((104 + ex) / 2)} ${N((80 + ey) / 2)} 104 80 Z" fill="__CM__"/>`; }).join("") +
    `<circle cx="104" cy="76" r="9" fill="__CDD__"/>`, 200, 190, [{ label: "Palmier" }, { label: "Sable", def: "#fbbf24" }]);

  /* ── Sport ── */
  HD("sport", "football", "Ballon rugby", "sport rugby football américain", "#a16207",
    `<defs><radialGradient id="rb" cx="38%" cy="30%" r="72%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<ellipse cx="110" cy="80" rx="94" ry="52" fill="url(#rb)"/>` +
    `<path d="M 72 80 H 148 M 88 68 V 92 M 108 66 V 94 M 128 68 V 92" stroke="__CW__" stroke-width="5" opacity="0.85" fill="none"/>` +
    `<path d="M 30 62 A 94 52 0 0 1 60 44" stroke="__CLL__" stroke-width="4" opacity="0.5" fill="none"/>`, 220, 160);
  HD("sport", "ping", "Ping-pong", "sport ping pong raquette", "#ef4444",
    orb(90, 76, 62, "pp") + `<circle cx="90" cy="76" r="62" fill="none" stroke="__CDD__" stroke-width="4" opacity="0.4"/>` +
    lin("ph", "__C1~L__", "__CDD__", "0", "1") + `<rect x="74" y="132" width="32" height="78" rx="12" fill="url(#ph)"/>` + glint(66, 54, 14, 10), 180, 220, [{ label: "Raquette" }, { label: "Manche", def: "#a16207" }]);
  HD("sport", "whistle", "Sifflet", "sport sifflet arbitre", "#f59e0b",
    `<path d="M 150 66 A 44 44 0 0 1 196 26" stroke="__CD__" stroke-width="9" fill="none"/>` +
    lin("wh", "__CLL__", "__CDD__", "0.3", "1") +
    `<path d="M 34 58 H 130 A 46 46 0 1 1 84 122 H 34 A 12 12 0 0 1 22 110 V 70 A 12 12 0 0 1 34 58 Z" fill="url(#wh)"/>` +
    `<circle cx="130" cy="94" r="18" fill="__CDD__" opacity="0.5"/>` +
    `<circle cx="30" cy="76" r="7" fill="__CDD__"/>` + glint(70, 74, 26, 8, -4, 0.4), 210, 160);
  HD("sport", "kettle", "Kettlebell", "sport kettlebell fitness musculation", "#6366f1",
    `<path d="M 68 70 V 54 A 27 27 0 0 1 122 54 V 70" fill="none" stroke="__CDD__" stroke-width="13"/>` +
    `<defs><radialGradient id="kb" cx="36%" cy="30%" r="74%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.55" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 95 66 C 145 66 172 110 172 150 C 172 186 140 200 95 200 C 50 200 18 186 18 150 C 18 110 45 66 95 66 Z" fill="url(#kb)"/>` +
    glint(58, 104, 14, 22, -26, 0.4), 190, 210);
  HD("sport", "target", "Cible", "sport cible target fléchette tir", "#ef4444",
    [86, 68, 50, 32].map((r, k) => `<circle cx="100" cy="100" r="${r}" fill="${k % 2 ? "__CW__" : "__CM__"}"/>`).join("") +
    `<circle cx="100" cy="100" r="14" fill="__CA__"/>` +
    `<circle cx="100" cy="100" r="86" fill="none" stroke="__CDD__" stroke-width="3" opacity="0.5"/>` +
    `<path d="M 100 14 A 86 86 0 0 1 186 100 L 100 100 Z" fill="__CW__" opacity="0.12"/>`);
  HD("sport", "stopwatch", "Chrono", "sport chrono chronomètre temps", "#f472b6",
    `<rect x="76" y="10" width="42" height="20" rx="6" fill="__CDD__"/>` +
    orb(97, 122, 78, "sw") + `<circle cx="97" cy="122" r="62" fill="__CW__" opacity="0.16"/>` +
    `<path d="M 97 74 V 124 L 128 140" stroke="__CDD__" stroke-width="8" fill="none" stroke-linecap="round"/>` +
    `<circle cx="97" cy="122" r="7" fill="__CA__"/>` + `<path d="M 150 56 L 166 40" stroke="__CDD__" stroke-width="9" fill="none"/>` + glint(66, 88, 14, 10), 200, 214);
  HD("sport", "flagpole", "Drapeau golf", "sport golf drapeau but", "#ef4444",
    `<ellipse cx="100" cy="190" rx="58" ry="14" fill="__CDD__" opacity="0.35"/>` +
    `<path d="M 52 192 V 18" stroke="__CDD__" stroke-width="8" fill="none"/>` +
    lin("fg", "__CLL__", "__CD__") + `<path d="M 52 22 L 158 52 L 52 82 Z" fill="url(#fg)"/>` + `<circle cx="52" cy="14" r="8" fill="__C1~__"/>`, 180, 210, [{ label: "Drapeau" }, { label: "Mât", def: "#94a3b8" }]);

  /* ── Nourriture ── */
  HD("food", "cherry", "Cerises", "food cerise cherry fruit", "#e11d48",
    `<path d="M 100 30 C 72 56 60 88 62 124 M 100 30 C 128 56 140 88 138 124" stroke="__C1~__" stroke-width="7" fill="none"/>` +
    `<path d="M 100 34 C 118 22 138 26 142 42 C 122 48 106 44 100 34 Z" fill="__C1~__"/>` +
    orb(62, 150, 34, "ch1") + orb(138, 150, 34, "ch2") + glint(50, 138, 8, 6) + glint(126, 138, 8, 6), 200, 200, [{ label: "Cerises" }, { label: "Tige & feuille", def: "#22c55e" }]);
  HD("food", "strawberry", "Fraise", "food fraise strawberry fruit", "#f43f5e",
    `<path d="M 100 30 L 70 50 L 100 46 Z M 100 30 L 130 50 L 100 46 Z M 62 46 L 90 58 L 72 64 Z M 138 46 L 110 58 L 128 64 Z" fill="__C1~__"/>` +
    `<defs><radialGradient id="sb" cx="38%" cy="28%" r="74%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 100 56 C 42 56 30 112 58 156 C 74 182 100 196 100 196 C 100 196 126 182 142 156 C 170 112 158 56 100 56 Z" fill="url(#sb)"/>` +
    [[74, 96], [104, 90], [128, 108], [86, 128], [116, 140], [100, 166]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="__C1~L__" opacity="0.9"/>`).join("") + glint(74, 84, 10, 16, -22, 0.5), 200, 210, [{ label: "Fraise" }, { label: "Feuilles", def: "#22c55e" }]);
  HD("food", "lemon", "Citron", "food citron lemon agrume", "#facc15",
    `<defs><radialGradient id="lm" cx="34%" cy="28%" r="76%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 22 80 C 22 36 92 30 132 44 C 174 58 194 78 194 80 C 194 82 174 102 132 116 C 92 130 22 124 22 80 Z" fill="url(#lm)"/>` +
    `<circle cx="196" cy="80" r="7" fill="__CD__"/><circle cx="20" cy="80" r="6" fill="__CD__"/>` + glint(70, 60, 22, 10, -14, 0.45), 210, 160);
  HD("food", "avocado", "Avocat", "food avocat avocado fruit", "#65a30d",
    lin("av", "__CLL__", "__CD__") + `<path d="M 90 18 C 40 18 28 92 40 142 C 50 184 74 202 90 202 C 106 202 130 184 140 142 C 152 92 140 18 90 18 Z" fill="url(#av)"/>` +
    `<path d="M 90 40 C 54 40 46 96 56 138 C 64 172 78 186 90 186 C 102 186 116 172 124 138 C 134 96 126 40 90 40 Z" fill="__CW__" opacity="0.55"/>` +
    orb(90, 138, 28, "avp"), 180, 220);
  HD("food", "cupcake", "Cupcake", "food cupcake gâteau muffin dessert", "#f472b6",
    lin("cpb", "__C1~L__", "__CDD__", "0.4", "1") + `<path d="M 46 100 L 60 194 H 130 L 144 100 Z" fill="url(#cpb)"/>` +
    `<path d="M 54 122 H 136 M 60 152 H 130" stroke="__CDD__" stroke-width="5" opacity="0.4" fill="none"/>` +
    `<defs><radialGradient id="cpt" cx="38%" cy="26%" r="76%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CD__"/></radialGradient></defs>` +
    `<path d="M 95 26 C 58 26 40 62 60 88 C 44 98 50 120 72 118 C 76 134 110 134 116 118 C 138 120 146 96 128 86 C 148 60 130 26 95 26 Z" fill="url(#cpt)"/>` +
    `<circle cx="95" cy="18" r="10" fill="__C1~__"/>` + glint(70, 52, 10, 7), 190, 210, [{ label: "Glaçage" }, { label: "Caissette", def: "#a16207" }]);
  HD("food", "coffee", "Café", "food café tasse boisson", "#a16207",
    `<path d="M 150 74 H 176 A 26 26 0 0 1 150 120" fill="none" stroke="__CD__" stroke-width="10"/>` +
    lin("cf", "__CLL__", "__CDD__", "1", "0.3") + `<path d="M 30 62 H 150 V 120 A 44 44 0 0 1 30 120 Z" fill="url(#cf)"/>` +
    `<ellipse cx="90" cy="62" rx="60" ry="14" fill="__C1~L__"/><ellipse cx="90" cy="62" rx="48" ry="9" fill="__CDD__" opacity="0.5"/>` +
    `<path d="M 66 24 C 60 38 74 44 68 58 M 100 22 C 94 36 108 42 102 56 M 134 26 C 128 40 142 46 136 60" stroke="__CW__" stroke-width="5" opacity="0.5" fill="none"/>`, 210, 190, [{ label: "Tasse" }, { label: "Café", def: "#78350f" }]);
  HD("food", "cake", "Gâteau", "food gâteau cake anniversaire dessert", "#f9a8d4",
    lin("ck1", "__CLL__", "__CD__", "1", "0.4") + `<path d="M 26 96 H 174 V 178 H 26 Z" fill="url(#ck1)"/>` +
    `<path d="M 26 130 H 174" stroke="__CDD__" stroke-width="5" opacity="0.35" fill="none"/>` +
    `<path d="M 26 96 C 42 78 62 110 78 96 C 94 82 110 110 126 96 C 142 82 158 110 174 96 V 76 H 26 Z" fill="__CW__" opacity="0.75"/>` +
    `<rect x="94" y="30" width="12" height="46" rx="4" fill="__C1~__"/>` + `<path d="M 100 12 C 110 22 110 32 100 32 C 90 32 90 22 100 12 Z" fill="__C1~L__"/>`, 200, 200, [{ label: "Gâteau" }, { label: "Bougie", def: "#f59e0b" }]);
  HD("food", "burger", "Burger", "food burger hamburger fast food", "#f59e0b",
    `<defs><radialGradient id="bnt" cx="40%" cy="20%" r="80%"><stop offset="0" stop-color="__CLL__"/><stop offset="1" stop-color="__CD__"/></radialGradient></defs>` +
    `<path d="M 22 66 C 22 26 178 26 178 66 Z" fill="url(#bnt)"/>` +
    [[64, 48], [100, 40], [136, 48], [82, 58], [118, 58]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="__CW__" opacity="0.7"/>`).join("") +
    `<path d="M 18 74 C 40 62 160 62 182 74 C 160 86 40 86 18 74 Z" fill="__C1~__"/>` +
    `<rect x="26" y="88" width="148" height="24" rx="8" fill="__CDD__"/>` +
    `<path d="M 22 118 C 40 108 160 108 178 118 C 178 158 22 158 22 118 Z" fill="url(#bnt)"/>`, 200, 175, [{ label: "Pain" }, { label: "Garniture", def: "#22c55e" }]);
  HD("food", "pizza", "Pizza", "food pizza part slice", "#f97316",
    lin("pz", "__C1~L__", "__CD__", "0.2", "1") + `<path d="M 100 12 L 178 194 C 128 210 72 210 22 194 Z" fill="url(#pz)"/>` +
    `<path d="M 100 44 L 160 182 C 122 194 78 194 40 182 Z" fill="__CLL__" opacity="0.45"/>` +
    [[86, 100, 12], [126, 128, 11], [72, 152, 10], [120, 176, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="__CM__"/><circle cx="${N(Number(x) - 3)}" cy="${N(Number(y) - 3)}" r="${N(Number(r) * 0.4)}" fill="__CLL__" opacity="0.6"/>`).join(""), 200, 215, [{ label: "Pâte" }, { label: "Garniture", def: "#e11d48" }]);
  HD("food", "egg", "Œuf", "food oeuf egg", "#f8fafc",
    `<defs><radialGradient id="eg" cx="36%" cy="26%" r="76%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 90 14 C 42 14 26 116 44 162 C 58 198 122 198 136 162 C 154 116 138 14 90 14 Z" fill="url(#eg)"/>` + glint(66, 66, 12, 20, -24, 0.55), 180, 210);
  HD("food", "bread", "Pain", "food pain bread boulangerie", "#d97706",
    `<defs><radialGradient id="br" cx="40%" cy="24%" r="78%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.6" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient></defs>` +
    `<path d="M 20 118 C 20 66 66 40 106 40 C 146 40 192 66 192 118 C 192 138 174 148 152 148 H 60 C 38 148 20 138 20 118 Z" fill="url(#br)"/>` +
    `<path d="M 58 72 L 44 100 M 90 62 L 74 92 M 124 62 L 108 92 M 156 72 L 142 100" stroke="__CDD__" stroke-width="6" opacity="0.45" fill="none"/>`, 212, 170);

  /* ── Objets ── */
  HD("objects", "camera", "Appareil photo", "objet caméra photo appareil", "#818cf8",
    lin("cm", "__CL__", "__CDD__", "0.4", "1") + `<path d="M 14 48 H 66 L 82 26 H 138 L 154 48 H 206 V 152 H 14 Z" fill="url(#cm)" stroke="none"/>` +
    `<circle cx="110" cy="100" r="40" fill="__CDD__"/>` + orb(110, 100, 32, "cml") + `<circle cx="110" cy="100" r="14" fill="__CW__" opacity="0.25"/>` + glint(98, 88, 9, 6) +
    `<circle cx="180" cy="66" r="8" fill="__C1~__"/>`, 220, 170, [{ label: "Boîtier" }, { label: "Voyant", def: "#ef4444" }]);
  HD("objects", "gift", "Cadeau", "objet cadeau gift boîte", "#f472b6",
    lin("gf", "__CLL__", "__CD__", "0.6", "1") + `<rect x="30" y="86" width="140" height="106" rx="8" fill="url(#gf)"/>` +
    `<rect x="20" y="66" width="160" height="30" rx="8" fill="__CL__"/>` +
    `<rect x="86" y="66" width="28" height="126" fill="__C1~__"/>` +
    `<path d="M 100 66 C 62 66 44 30 68 20 C 90 12 100 48 100 66 C 100 48 110 12 132 20 C 156 30 138 66 100 66 Z" fill="__C1~__"/>` +
    `<circle cx="100" cy="58" r="10" fill="__C1~L__"/>`, 200, 210, [{ label: "Boîte" }, { label: "Ruban", def: "#facc15" }]);
  HD("objects", "rocket", "Fusée", "objet fusée rocket espace", "#fb7185",
    lin("rk2", "__CLL__", "__CD__", "1", "0.2") + `<path d="M 85 8 C 122 42 132 96 122 150 H 48 C 38 96 48 42 85 8 Z" fill="url(#rk2)"/>` +
    `<circle cx="85" cy="66" r="20" fill="__CDD__"/><circle cx="85" cy="66" r="14" fill="__CW__" opacity="0.5"/>` +
    `<path d="M 48 122 L 14 168 L 52 158 Z M 122 122 L 156 168 L 118 158 Z" fill="__CDD__"/>` +
    `<path d="M 68 150 H 102 L 85 210 Z" fill="__C1~L__"/><path d="M 78 150 H 92 L 85 186 Z" fill="__CW__" opacity="0.7"/>`, 170, 220, [{ label: "Fusée" }, { label: "Flamme", def: "#f59e0b" }]);
  HD("objects", "trophy2", "Coupe", "objet coupe trophée prix", "#eab308",
    lin("tp2", "__CLL__", "__CDD__", "1", "0.3") + `<path d="M 52 24 H 148 V 84 A 48 48 0 0 1 52 84 Z" fill="url(#tp2)"/>` +
    `<path d="M 52 40 H 20 A 34 34 0 0 0 58 88 M 148 40 H 180 A 34 34 0 0 1 142 88" fill="none" stroke="__CD__" stroke-width="9"/>` +
    `<rect x="90" y="130" width="20" height="26" fill="__CD__"/><path d="M 58 156 H 142 L 152 182 H 48 Z" fill="__CDD__"/>` +
    `<path d="M 74 36 V 76 A 26 26 0 0 0 100 96" stroke="__CW__" stroke-width="7" opacity="0.6" fill="none"/>` +
    `<path d="${starPts(100, 62, 5, 20, 9)}" fill="__C1~__" opacity="0.9"/>`, 200, 200, [{ label: "Coupe" }, { label: "Étoile", def: "#fef08a" }]);
  HD("objects", "book", "Livre", "objet livre book lecture", "#38bdf8",
    lin("bk2", "__CLL__", "__CD__", "1", "0.4") + `<path d="M 100 46 C 76 28 34 28 18 38 V 156 C 34 146 76 146 100 164 Z" fill="url(#bk2)"/>` +
    `<path d="M 100 46 C 124 28 166 28 182 38 V 156 C 166 146 124 146 100 164 Z" fill="__CD__"/>` +
    `<path d="M 100 46 V 164" stroke="__CDD__" stroke-width="6" fill="none"/>` +
    `<path d="M 36 62 H 84 M 36 86 H 84 M 36 110 H 76" stroke="__CW__" stroke-width="5" opacity="0.5" fill="none"/>` +
    `<path d="M 116 62 H 164 M 116 86 H 164 M 116 110 H 156" stroke="__CW__" stroke-width="5" opacity="0.32" fill="none"/>`, 200, 190);
  HD("objects", "cup", "Mug", "objet mug tasse boisson", "#f87171",
    `<path d="M 148 76 H 172 A 26 26 0 0 1 148 122" fill="none" stroke="__CD__" stroke-width="11"/>` +
    lin("mg2", "__CLL__", "__CDD__", "1", "0.2") + `<path d="M 32 52 H 148 V 148 A 22 22 0 0 1 126 170 H 54 A 22 22 0 0 1 32 148 Z" fill="url(#mg2)"/>` +
    `<ellipse cx="90" cy="52" rx="58" ry="13" fill="__CL__"/><ellipse cx="90" cy="52" rx="46" ry="8" fill="__CDD__" opacity="0.45"/>` + glint(52, 96, 8, 26, -8, 0.35), 200, 190);
  HD("objects", "clock", "Horloge", "objet horloge heure temps clock", "#60a5fa",
    orb(100, 100, 88, "cl2") + `<circle cx="100" cy="100" r="70" fill="__CW__" opacity="0.18"/>` +
    Array.from({ length: 12 }, (_, k) => { const [x1, y1] = polar(100, 100, 62, k * 30), [x2, y2] = polar(100, 100, 72, k * 30); return `<path d="M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}" stroke="__CDD__" stroke-width="${k % 3 ? 3 : 5}" opacity="0.7" fill="none"/>`; }).join("") +
    `<path d="M 100 100 V 52 M 100 100 L 134 122" stroke="__CDD__" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="100" cy="100" r="8" fill="__C1~__"/>` + glint(72, 68, 16, 11), 200, 200, [{ label: "Cadran" }, { label: "Aiguilles", def: "#ef4444" }]);
  HD("objects", "key", "Clé", "objet clé key serrure", "#fbbf24",
    lin("ky", "__CLL__", "__CDD__", "0.6", "1") + `<circle cx="56" cy="66" r="42" fill="url(#ky)"/><circle cx="56" cy="66" r="17" fill="__CDD__"/>` +
    `<rect x="92" y="54" width="112" height="24" rx="8" fill="url(#ky)"/>` +
    `<rect x="158" y="70" width="14" height="30" rx="4" fill="__CD__"/><rect x="184" y="70" width="14" height="24" rx="4" fill="__CD__"/>` + glint(40, 46, 12, 8), 215, 135);
  HD("objects", "gamepad", "Manette", "objet manette jeu gaming", "#a78bfa",
    lin("gp", "__CLL__", "__CDD__", "0.5", "1") + `<path d="M 62 62 H 138 C 176 62 192 128 174 158 C 158 182 138 150 128 136 H 72 C 62 150 42 182 26 158 C 8 128 24 62 62 62 Z" fill="url(#gp)"/>` +
    `<rect x="42" y="92" width="30" height="10" rx="5" fill="__CDD__"/><rect x="52" y="82" width="10" height="30" rx="5" fill="__CDD__"/>` +
    `<circle cx="136" cy="92" r="9" fill="__C1~__"/><circle cx="156" cy="110" r="9" fill="__C1~L__"/><circle cx="116" cy="110" r="9" fill="__CW__" opacity="0.8"/>`, 200, 200, [{ label: "Manette" }, { label: "Boutons", def: "#f43f5e" }]);
  HD("objects", "paint", "Palette", "objet palette peinture art couleur", "#f472b6",
    `<defs><radialGradient id="pal" cx="40%" cy="30%" r="76%"><stop offset="0" stop-color="__CLL__"/><stop offset="1" stop-color="__CD__"/></radialGradient></defs>` +
    `<path fill-rule="evenodd" d="M 105 16 C 40 16 12 66 20 116 C 26 154 62 172 92 160 C 104 156 100 140 108 134 C 120 126 138 138 156 130 C 186 116 196 60 158 34 C 142 22 124 16 105 16 Z${holeC(70, 130, 15)}" fill="url(#pal)"/>` +
    `<circle cx="54" cy="70" r="13" fill="__C1~__"/><circle cx="100" cy="50" r="13" fill="__C1~L__"/><circle cx="148" cy="72" r="13" fill="__CDD__"/><circle cx="152" cy="110" r="12" fill="__CW__"/>`, 210, 190, [{ label: "Palette" }, { label: "Peintures", def: "#38bdf8" }]);
  HD("objects", "headphones", "Casque", "objet casque audio musique", "#22d3ee",
    `<path d="M 34 118 V 96 A 66 66 0 0 1 166 96 V 118" fill="none" stroke="__CD__" stroke-width="14"/>` +
    lin("hp", "__CLL__", "__CDD__", "0.4", "1") + `<rect x="16" y="110" width="38" height="66" rx="16" fill="url(#hp)"/><rect x="146" y="110" width="38" height="66" rx="16" fill="url(#hp)"/>` +
    `<rect x="26" y="122" width="18" height="42" rx="9" fill="__CW__" opacity="0.3"/>`, 200, 190);
  HD("objects", "wallet", "Portefeuille", "objet portefeuille argent wallet", "#818cf8",
    lin("wl", "__CLL__", "__CD__", "0.5", "1") + `<rect x="18" y="48" width="164" height="110" rx="18" fill="url(#wl)"/>` +
    `<path d="M 18 78 H 182 V 108 H 18 Z" fill="__CDD__" opacity="0.4"/>` +
    `<rect x="120" y="86" width="70" height="40" rx="10" fill="__C1~__"/><circle cx="155" cy="106" r="10" fill="__CDD__"/>`, 200, 190, [{ label: "Portefeuille" }, { label: "Carte", def: "#facc15" }]);

  /* ── Météo ── */
  HD("weather", "sun2", "Soleil radieux", "météo soleil sun rayons", "#f59e0b",
    `<circle cx="100" cy="100" r="88" fill="__CA2__" opacity="0.18"/>` +
    Array.from({ length: 16 }, (_, k) => { const a = k * 22.5; const [x2, y2] = polar(100, 100, 92, a); return `<path d="M ${N(polar(100, 100, 56, a - 4)[0])} ${N(polar(100, 100, 56, a - 4)[1])} L ${N(x2)} ${N(y2)} L ${N(polar(100, 100, 56, a + 4)[0])} ${N(polar(100, 100, 56, a + 4)[1])} Z" fill="__CA2__"/>`; }).join("") +
    orb(100, 100, 54, "sn2") + glint(82, 80, 15, 10));
  HD("weather", "storm", "Orage", "météo orage éclair storm nuage", "#94a3b8",
    orb(58, 92, 32, "sr1") + orb(104, 70, 42, "sr2") + orb(150, 90, 34, "sr3") + `<rect x="26" y="92" width="150" height="32" rx="16" fill="__CD__"/>` +
    `<path d="M 112 128 L 76 182 H 102 L 88 214 L 138 156 H 110 L 126 128 Z" fill="__C1~L__"/>` +
    `<path d="M 112 128 L 92 158 H 106 L 98 186 L 124 152 H 108 Z" fill="__CW__" opacity="0.6"/>`, 200, 220, [{ label: "Nuage" }, { label: "Éclair", def: "#facc15" }]);
  HD("weather", "snowman", "Bonhomme de neige", "météo bonhomme neige hiver snowman", "#e2e8f0",
    orb(95, 158, 54, "sm1") + orb(95, 88, 40, "sm2") +
    eyes(84, 106, 82, 6) + `<path d="M 95 92 L 128 100 L 95 108 Z" fill="__C1~L__"/>` +
    `<circle cx="95" cy="134" r="6" fill="__CDD__"/><circle cx="95" cy="158" r="6" fill="__CDD__"/><circle cx="95" cy="182" r="6" fill="__CDD__"/>` +
    `<path d="M 55 100 L 20 84 M 135 100 L 170 84" stroke="__C1~__" stroke-width="6" fill="none"/>` +
    `<rect x="64" y="48" width="62" height="12" rx="4" fill="__CDD__"/><rect x="76" y="20" width="38" height="30" rx="4" fill="__CDD__"/>`, 190, 220, [{ label: "Neige" }, { label: "Écharpe & carotte", def: "#f97316" }]);
  HD("weather", "thermometer", "Thermomètre", "météo thermomètre température", "#f87171",
    `<rect x="46" y="16" width="28" height="150" rx="14" fill="__CW__" opacity="0.35"/>` +
    `<rect x="46" y="16" width="28" height="150" rx="14" fill="none" stroke="__CD__" stroke-width="5"/>` +
    `<rect x="53" y="86" width="14" height="86" rx="7" fill="__CM__"/>` + orb(60, 178, 28, "th") +
    Array.from({ length: 5 }, (_, k) => `<path d="M 80 ${44 + k * 24} H 96" stroke="__CD__" stroke-width="4" fill="none"/>`).join(""), 140, 215);

  /* ── Fête ── */
  HD("party", "balloons", "Ballons", "fête ballons party anniversaire", "#f472b6",
    `<path d="M 62 108 C 70 148 66 176 60 200 M 100 92 C 100 140 100 172 100 200 M 140 110 C 132 150 136 176 142 200" stroke="__CD__" stroke-width="3" fill="none"/>` +
    orbE(62, 66, 34, 42, "bl1") + orbE(140, 68, 32, 40, "bl2") + orbE(100, 50, 38, 46, "bl3") +
    glint(48, 48, 8, 13, -24) + glint(88, 32, 8, 12, -24), 200, 210);
  HD("party", "cake2", "Gâteau fête", "fête gâteau anniversaire bougies", "#f9a8d4",
    lin("ck2", "__CLL__", "__CD__", "1", "0.4") + `<path d="M 22 108 H 178 V 182 H 22 Z" fill="url(#ck2)"/>` +
    `<path d="M 22 108 C 40 92 58 122 76 108 C 94 94 106 122 124 108 C 142 94 160 122 178 108 V 88 H 22 Z" fill="__CW__" opacity="0.8"/>` +
    [60, 100, 140].map((x, k) => `<rect x="${x - 6}" y="${44 - (k === 1 ? 8 : 0)}" width="12" height="${46 + (k === 1 ? 8 : 0)}" rx="4" fill="__C1~__"/>` + `<path d="M ${x} ${26 - (k === 1 ? 8 : 0)} C ${x + 10} ${36 - (k === 1 ? 8 : 0)} ${x + 10} ${46 - (k === 1 ? 8 : 0)} ${x} ${46 - (k === 1 ? 8 : 0)} C ${x - 10} ${46 - (k === 1 ? 8 : 0)} ${x - 10} ${36 - (k === 1 ? 8 : 0)} ${x} ${26 - (k === 1 ? 8 : 0)} Z" fill="__C1~L__"/>`).join(""), 200, 200, [{ label: "Gâteau" }, { label: "Bougies", def: "#f59e0b" }]);
  HD("party", "confetti", "Confettis", "fête confettis party paillettes", "#a855f7",
    Array.from({ length: 26 }, (_, k) => { const r = rng(k * 37 + 5); const x = 12 + r() * 176, y = 12 + r() * 176, t = Math.floor(r() * 3), c = ["__CM__", "__CA__", "__CA2__", "__CLL__"][Math.floor(r() * 4)];
      return t === 0 ? `<circle cx="${N(x)}" cy="${N(y)}" r="${N(4 + r() * 5)}" fill="${c}"/>` : t === 1 ? `<rect x="${N(x)}" y="${N(y)}" width="${N(8 + r() * 8)}" height="${N(5 + r() * 5)}" rx="2" fill="${c}" transform="rotate(${N(r() * 90)} ${N(x)} ${N(y)})"/>` : `<path d="${starPts(x, y, 4, N(8 + r() * 5), N(3 + r() * 2))}" fill="${c}"/>`; }).join(""));
  HD("party", "star", "Étoile brillante", "fête étoile star brillante", "#fde047",
    `<circle cx="100" cy="100" r="86" fill="__CA2__" opacity="0.14"/>` +
    lin("stb", "__CLL__", "__CD__") + `<path d="${starPts(100, 100, 5, 88, 36)}" fill="url(#stb)"/>` +
    `<path d="M 100 12 L 114 78 L 100 100 Z" fill="__CW__" opacity="0.45"/>` + glint(82, 74, 12, 8, -20));
})();

/* ── Distribution des couleurs : chaque élément SANS teinte explicite reçoit
   une couleur de la palette de sa catégorie (index → couleur), pour un
   catalogue varié et coloré. Déterministe (ordre stable) → aucun décalage
   d'hydratation. Les surcharges sémantiques ci-dessous priment ensuite. ── */
(() => {
  const idx: Record<string, number> = {};
  for (const e of items) {
    if (e.defaultColor) continue;
    const pal = CAT_PALETTE[e.cat] ?? VIBRANT;
    const i = (idx[e.cat] = (idx[e.cat] ?? 0) + 1) - 1;
    e.defaultColor = pal[i % pal.length];
  }
})();

/* ── Couleurs cohérentes : surcharges ponctuelles (les éléments restent
   recolorables ; ceci ne fait qu'ajuster la teinte de départ / vignette). ── */
tint("nature.moon0", "#fde68a"); tint("nature.moon1", "#fde68a"); tint("nature.moon2", "#fde68a"); tint("nature.moon3", "#fde68a");
tint("nature.suno0", "#fbbf24");
["nature.sun0", "nature.sun1", "nature.sun2", "nature.sun3"].forEach((id) => tint(id, "#fbbf24"));
["nature.cloud", "nature.wave", "nature.rain0", "nature.flake", "nature.snow"].forEach((p) => items.forEach((e) => { if (e.id.startsWith(p)) e.defaultColor = e.id.includes("wave") || e.id.includes("rain") ? "#38bdf8" : "#e2e8f0"; }));
items.forEach((e) => { if (e.id.startsWith("nature.flower")) e.defaultColor = "#f472b6"; });
tint("nature.rain0", "#38bdf8");
items.forEach((e) => { if (e.id.startsWith("nature.pine")) e.defaultColor = "#34d399"; });
tint("icons.heart0", "#f43f5e"); tint("icons.hearto0", "#f43f5e");
tint("icons.flame0", "#f97316"); tint("icons.bolt0", "#facc15");
tint("icons.gem0", "#22d3ee"); tint("icons.drop0", "#38bdf8"); tint("icons.moonic0", "#fde68a");
tint("icons.crown0", "#fbbf24"); tint("icons.trophy0", "#fbbf24"); tint("icons.medal0", "#fbbf24");
tint("icons.bulb0", "#fde047"); tint("icons.rocket0", "#fb7185");
tint("food.apple0", "#ef4444"); tint("food.cherry0", "#ef4444"); tint("food.strawberry0", "#f43f5e");
tint("food.banana0", "#facc15"); tint("food.pear0", "#a3e635"); tint("food.carrot0", "#fb923c");
tint("food.grapes0", "#a78bfa"); tint("food.grapes1", "#a78bfa"); tint("food.grapes2", "#a78bfa");
tint("food.avocado0", "#65a30d"); tint("food.watermelon0", "#f43f5e"); tint("food.mushroom0", "#ef4444");
["food.citrus0", "food.citrus1", "food.citrus2"].forEach((id) => tint(id, "#fb923c"));
tint("objects.balloon0", "#fb7185"); tint("objects.gift0", "#f472b6"); tint("objects.flag0", "#f87171");
tint("objects.house0", "#a78bfa"); tint("objects.palette0", "#f472b6");
tint("weather.rainbow0", "#f472b6"); tint("weather.storm0", "#facc15");
["weather.rain0", "weather.snow0", "weather.droplet0", "weather.cloud0"].forEach((id) => tint(id, id.includes("cloud") || id.includes("snow") ? "#e2e8f0" : "#38bdf8"));
tint("weather.cloudsun0", "#fbbf24"); tint("weather.moonstar0", "#fde68a"); tint("weather.thermometer0", "#f87171");
tint("sport.basket0", "#fb923c"); tint("sport.tennis0", "#a3e635"); tint("sport.soccer0", "#e2e8f0");
tint("sport.medal1", "#fbbf24"); tint("sport.flagp0", "#f87171");


/* ── Anti-débordement ──────────────────────────────────────────────────────
   Un tracé qui sort de la boîte déclarée est ROGNÉ au rendu (le viewBox coupe) :
   coutures de ballon qui dépassent, branche de sapin tronquée, bout de
   serpentin coupé… Ces marges ont été MESURÉES dans le navigateur (boîtes
   englobantes réelles, contour compris) : on agrandit la boîte et on recentre
   le dessin, donc plus rien n'est coupé. Les motifs volontairement rognés
   (rayures diagonales en fond) ne sont pas touchés.
   [gauche, haut, droite, bas] */
const OVERFLOW_PAD: Record<string, [number, number, number, number]> = {
  "animals.lion0": [7, 7, 7, 7],
  "animals.lion2": [7, 7, 7, 7],
  "animals.peacock1": [4, 0, 4, 0],
  "arrows.both2": [3, 0, 3, 0],
  "arrows.both3": [5, 0, 5, 0],
  "arrows.dash0": [0, 0, 2, 0],
  "arrows.dash1": [0, 0, 2, 0],
  "arrows.dash2": [0, 0, 2, 0],
  "arrows.dash3": [0, 0, 2, 0],
  "arrows.elbow4": [0, 0, 0, 8],
  "arrows.elbow5": [0, 2, 0, 0],
  "arrows.str1": [0, 0, 2, 0],
  "arrows.str2": [0, 0, 6, 0],
  "arrows.str3": [0, 0, 7, 0],
  "arrows.str4": [0, 0, 11, 0],
  "arrows.zig2_1": [0, 3, 0, 0],
  "blobs.fill11": [0, 0, 0, 4],
  "blobs.fill15": [0, 3, 0, 0],
  "blobs.fill31": [0, 3, 0, 0],
  "blobs.fill43": [0, 0, 5, 0],
  "blobs.fill59": [0, 2, 0, 0],
  "blobs.fill7": [0, 2, 0, 3],
  "blobs.xf104": [4, 0, 0, 0],
  "blobs.xf13": [0, 0, 3, 0],
  "blobs.xf14": [11, 11, 0, 0],
  "blobs.xf18": [0, 0, 4, 0],
  "blobs.xf19": [0, 0, 0, 9],
  "blobs.xf23": [0, 0, 0, 3],
  "blobs.xf28": [0, 9, 4, 0],
  "blobs.xf29": [0, 4, 0, 0],
  "blobs.xf3": [3, 0, 0, 0],
  "blobs.xf34": [0, 7, 1, 0],
  "blobs.xf39": [6, 0, 0, 0],
  "blobs.xf4": [0, 5, 0, 2],
  "blobs.xf44": [0, 0, 7, 0],
  "blobs.xf54": [1, 0, 0, 0],
  "blobs.xf69": [14, 6, 1, 0],
  "blobs.xf79": [0, 0, 6, 3],
  "blobs.xf83": [0, 4, 0, 0],
  "blobs.xf89": [7, 1, 0, 0],
  "blobs.xf9": [0, 7, 7, 13],
  "blobs.xo31": [1, 0, 0, 0],
  "circles.brush0": [0, 0, 4, 0],
  "circles.brush10": [0, 0, 4, 3],
  "circles.brush18": [0, 0, 1, 0],
  "circles.brush23": [0, 0, 18, 0],
  "circles.brush30": [0, 0, 27, 0],
  "circles.brush34": [0, 0, 4, 0],
  "circles.brush35": [0, 0, 0, 2],
  "circles.brush6": [0, 0, 1, 0],
  "deco.semis0": [0, 24, 0, 0],
  "food.grapes0": [0, 0, 0, 13],
  "food.grapes1": [0, 0, 0, 13],
  "food.grapes1b": [0, 0, 0, 4],
  "food.grapes2": [0, 0, 0, 13],
  "food.hdgrapes": [0, 0, 0, 3],
  "icons.stargroup1": [0, 0, 8, 0],
  "nature.hddroplet": [0, 0, 0, 10],
  "nature.mount2": [0, 0, 12, 0],
  "nature.palm1": [0, 3, 0, 0],
  "nature.pine1": [0, 0, 38, 0],
  "nature.waterdrop1": [0, 0, 0, 8],
  "objects.balloon2": [0, 0, 0, 6],
  "ornaments.rosette1": [8, 8, 8, 3],
  "ornaments.rosette11": [1, 0, 1, 0],
  "ornaments.rosette16": [0, 9, 0, 9],
  "ornaments.rosette17": [5, 5, 5, 5],
  "ornaments.rosette2": [11, 11, 11, 6],
  "ornaments.rosette24": [9, 11, 9, 11],
  "ornaments.rosette28": [5, 5, 5, 5],
  "ornaments.rosette37": [5, 6, 5, 0],
  "ornaments.rosette38": [7, 6, 7, 6],
  "ornaments.rosette40": [4, 3, 4, 3],
  "ornaments.rosette43": [4, 4, 4, 4],
  "ornaments.rosette7": [1, 0, 1, 0],
  "party.balloon0": [0, 0, 0, 2],
  "party.balloon3": [0, 0, 0, 10],
  "party.buntingx": [0, 0, 2, 0],
  "party.confetti1": [0, 0, 0, 3],
  "party.confetti15": [0, 2, 0, 0],
  "party.confetti5": [0, 0, 3, 0],
  "party.streamer0": [0, 14, 11, 0],
  "party.streamer1": [0, 22, 9, 0],
  "party.streamer2": [0, 21, 8, 0],
  "party.streamer3": [0, 20, 5, 0],
  "party.streamer4": [0, 8, 1, 0],
  "party.streamer5": [0, 14, 5, 0],
  "party.streamer6": [0, 0, 12, 0],
  "party.streamer7": [0, 19, 2, 0],
  "tech.circuit4": [0, 2, 0, 0]
};
for (const e of items) {
  const p = OVERFLOW_PAD[e.id];
  if (!p) continue;
  const [l, t, r, b] = p;
  e.body = `<g transform="translate(${l} ${t})">${e.body}</g>`;
  e.w += l + r;
  e.h += t + b;
}

export const ELEMENTS: ElementDef[] = items;
export const ELEMENT_INDEX: Map<string, ElementDef> = new Map(items.map((e) => [e.id, e]));

/* ═══════════ Construction du SVG final (couleur / dégradé du calque) ═══════════ */

// Copie locale du tracé de dégradé linéaire CSS (évite un import runtime
// circulaire avec lib/design.ts, qui n'expose ici que des types).
function linPts(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180;
  const vx = Math.sin(rad), vy = -Math.cos(rad);
  const len = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
  return { x1: w / 2 - (vx * len) / 2, y1: h / 2 - (vy * len) / 2, x2: w / 2 + (vx * len) / 2, y2: h / 2 + (vy * len) / 2 };
}

/* ── Dérivation de teintes : à partir de LA couleur choisie, on calcule des
   variantes plus claires / plus sombres / un accent (rotation de teinte). Les
   éléments « travaillés » (relief, dégradés internes, jeux de couleur) les
   utilisent via des jetons (__CM__, __CL__, __CLL__, __CD__, __CDD__, __CA__,
   __CA2__, __CW__) — l'élément garde UNE couleur éditable, mais s'affiche avec
   du volume et des nuances dérivées. Purement déterministe (aucune aléa). ── */
function hexRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2; const d = mx - mn;
  if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  if (!s) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
type Shades = { CM: string; CL: string; CLL: string; CD: string; CDD: string; CA: string; CA2: string; CW: string };
function deriveShades(base: string): Shades {
  const rgb = hexRgb(base);
  if (!rgb) return { CM: base, CL: base, CLL: base, CD: base, CDD: base, CA: base, CA2: base, CW: base };
  const [h, s, l] = rgb2hsl(...rgb);
  const cl = (x: number) => Math.max(0, Math.min(1, x));
  const L = (dl: number, ds = 0) => toHex(...hsl2rgb(h, cl(s + ds), cl(l + dl)));
  const rot = (deg: number, dl = 0) => toHex(...hsl2rgb((h + deg / 360 + 1) % 1, cl(s * 0.96), cl(l + dl)));
  return { CM: toHex(...rgb), CL: L(0.12), CLL: L(0.26, -0.05), CD: L(-0.12), CDD: L(-0.25, 0.04), CA: rot(148), CA2: rot(40, 0.03), CW: L(0.42, -0.25) };
}

/** Jeton de peinture : __C__ (principal), __CL__/__CDD__… (nuances dérivées),
 *  __C1~__ / __C1~L__… (emplacement secondaire n° 1 et ses nuances). */
const TOKEN_RE = /__C(?:(\d+)~)?([A-Z0-9]*)__/g;

export function elementSvg(
  def: ElementDef,
  fill: string,
  gradient: GradientFill | null,
  extraSlots: SlotPaint[] = [],
): string {
  // Peinture de chaque emplacement : 0 = principal, 1.. = secondaires.
  const defaults = elementSlotDefaults(def);
  const paints: SlotPaint[] = [{ fill, gradient }];
  for (let i = 1; i < defaults.length; i++) paints.push(extraSlots[i - 1] ?? defaults[i]);

  let defs = "";
  const slotPaint: string[] = [];
  const slotShades: Shades[] = [];
  paints.forEach((p, i) => {
    const gid = `g${i}`;
    if (p.gradient) {
      slotPaint.push(`url(#${gid})`);
      if (p.gradient.type === "radial") {
        const r = Math.sqrt((def.w / 2) ** 2 + (def.h / 2) ** 2);
        defs += `<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${def.w / 2}" cy="${def.h / 2}" r="${N(r)}"><stop offset="0" stop-color="${p.gradient.from}"/><stop offset="1" stop-color="${p.gradient.to}"/></radialGradient>`;
      } else {
        const q = linPts(p.gradient.angle, def.w, def.h);
        defs += `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${N(q.x1)}" y1="${N(q.y1)}" x2="${N(q.x2)}" y2="${N(q.y2)}"><stop offset="0" stop-color="${p.gradient.from}"/><stop offset="1" stop-color="${p.gradient.to}"/></linearGradient>`;
      }
    } else {
      slotPaint.push(p.fill);
    }
    slotShades.push(deriveShades(p.gradient ? p.gradient.from : p.fill));
  });

  const body = def.body.replace(TOKEN_RE, (_m, slotStr: string | undefined, code: string) => {
    const i = slotStr ? Number(slotStr) : 0;
    const sh = slotShades[i] ?? slotShades[0];
    const paint = slotPaint[i] ?? slotPaint[0];
    switch (code) {
      case "": return paint;      // couleur (ou dégradé) de l'emplacement
      case "M": return sh.CM;
      case "L": return sh.CL;
      case "LL": return sh.CLL;
      case "D": return sh.CD;
      case "DD": return sh.CDD;
      case "W": return sh.CW;
      case "A": return sh.CA;
      case "A2": return sh.CA2;
      default: return paint;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${def.w}" height="${def.h}" viewBox="0 0 ${def.w} ${def.h}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
}

export function elementSvgByRef(ref: string, fill: string, gradient: GradientFill | null, extraSlots: SlotPaint[] = []): string | null {
  const def = ELEMENT_INDEX.get(ref);
  return def ? elementSvg(def, fill, gradient, extraSlots) : null;
}

export function elementDataUri(def: ElementDef, fill: string, gradient: GradientFill | null = null, extraSlots: SlotPaint[] = []): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(elementSvg(def, fill, gradient, extraSlots))}`;
}

/** Vignette du catalogue : couleur cohérente par défaut de l'élément
    (recolorable ensuite dans l'éditeur), lisible sur le panneau sombre. */
export function elementThumbSrc(def: ElementDef): string {
  const d = elementSlotDefaults(def);
  return elementDataUri(def, d[0].fill ?? "#cbd5e1", null, d.slice(1));
}
