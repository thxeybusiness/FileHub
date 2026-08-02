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
};

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
function add(cat: string, id: string, label: string, keywords: string, w: number, h: number, body: string, defaultColor?: string) {
  const full = `${cat}.${id}`;
  if (seen.has(full)) throw new Error(`id d'élément dupliqué : ${full}`);
  seen.add(full);
  items.push({ id: full, label, cat, w, h, body, keywords: normalizeSearch(`${label} ${keywords}`), defaultColor });
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

export function elementSvg(def: ElementDef, fill: string, gradient: GradientFill | null): string {
  let defs = "";
  let paint = fill;
  if (gradient) {
    paint = "url(#g)";
    if (gradient.type === "radial") {
      const r = Math.sqrt((def.w / 2) ** 2 + (def.h / 2) ** 2);
      defs = `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${def.w / 2}" cy="${def.h / 2}" r="${N(r)}"><stop offset="0" stop-color="${gradient.from}"/><stop offset="1" stop-color="${gradient.to}"/></radialGradient></defs>`;
    } else {
      const p = linPts(gradient.angle, def.w, def.h);
      defs = `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${N(p.x1)}" y1="${N(p.y1)}" x2="${N(p.x2)}" y2="${N(p.y2)}"><stop offset="0" stop-color="${gradient.from}"/><stop offset="1" stop-color="${gradient.to}"/></linearGradient></defs>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${def.w}" height="${def.h}" viewBox="0 0 ${def.w} ${def.h}">${defs}${def.body.split(C).join(paint)}</svg>`;
}

export function elementSvgByRef(ref: string, fill: string, gradient: GradientFill | null): string | null {
  const def = ELEMENT_INDEX.get(ref);
  return def ? elementSvg(def, fill, gradient) : null;
}

export function elementDataUri(def: ElementDef, fill: string, gradient: GradientFill | null = null): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(elementSvg(def, fill, gradient))}`;
}

/** Vignette du catalogue : couleur cohérente par défaut de l'élément
    (recolorable ensuite dans l'éditeur), lisible sur le panneau sombre. */
export function elementThumbSrc(def: ElementDef): string {
  return elementDataUri(def, def.defaultColor ?? "#cbd5e1");
}
