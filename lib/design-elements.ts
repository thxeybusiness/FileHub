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
];

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

/** Vignette du catalogue (gris clair neutre, lisible sur le panneau sombre). */
export function elementThumbSrc(def: ElementDef): string {
  return elementDataUri(def, "#cbd5e1");
}
