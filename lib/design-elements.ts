// Bibliothèque d'éléments du studio Design (façon Canva → onglet Éléments).
// TOUT est généré par des moteurs paramétriques (aucune ressource externe) :
// chaque famille est déclinée en couleurs / graines → des centaines d'items
// cohérents. Un élément = un SVG autonome inséré comme calque image
// (data URI), donc ombres, filtres, rotation et export marchent déjà.

export type ElementDef = {
  id: string;
  label: string;
  cat: string;
  svg: string; // document SVG complet
  w: number;   // dimensions naturelles (préservent le ratio à l'insertion)
  h: number;
  keywords: string;
};

export const ELEMENT_CATEGORIES: { id: string; label: string }[] = [
  { id: "circles", label: "Cercles & cadres" },
  { id: "strokes", label: "Traits & surlignage" },
  { id: "arrows", label: "Flèches" },
  { id: "blobs", label: "Formes organiques" },
  { id: "sparkles", label: "Étoiles & éclats" },
  { id: "badges", label: "Badges & rubans" },
  { id: "bubbles", label: "Bulles" },
  { id: "nature", label: "Nature" },
  { id: "deco", label: "Déco & motifs" },
  { id: "gradients", label: "Dégradés & 3D" },
];

/* ═══════════ Outils ═══════════ */

const N = (n: number) => Math.round(n * 10) / 10;

function doc(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

export function elementDataUri(el: ElementDef): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(el.svg)}`;
}

// Générateur pseudo-aléatoire déterministe : mêmes items à chaque chargement.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Assombrit (k>0) ou éclaircit (k<0) un hex — bornes garanties [0,255].
function shade(hex: string, k: number): string {
  const s = hex.replace("#", "");
  const c = (i: number) => Math.max(0, Math.min(255, Math.round(parseInt(s.slice(i, i + 2), 16) * (1 - k))));
  return `#${[c(0), c(2), c(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Courbe fermée lissée (Catmull-Rom → Bézier) passant par des points.
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  let d = `M ${N(pts[0][0])} ${N(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${N(c1[0])} ${N(c1[1])} ${N(c2[0])} ${N(c2[1])} ${N(p2[0])} ${N(p2[1])}`;
  }
  return d + " Z";
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// Tête de flèche (triangle) au point (x,y), orientée selon (dx,dy).
function arrowHead(x: number, y: number, dx: number, dy: number, size: number, color: string): string {
  const a = Math.atan2(dy, dx);
  const p = (da: number, r: number) => `${N(x + r * Math.cos(a + da))} ${N(y + r * Math.sin(a + da))}`;
  return `<path d="M ${p(0, size)} L ${p(2.6, size)} L ${p(-2.6, size)} Z" fill="${color}"/>`;
}

/* ═══════════ Palettes ═══════════ */

const COLORS = ["#ffffff", "#94a3b8", "#111827", "#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const BRIGHTS = ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const SOFTS = ["#fecaca", "#fde68a", "#bbf7d0", "#bfdbfe", "#ddd6fe", "#fbcfe8"];
const GRADS: [string, string][] = [
  ["#667eea", "#764ba2"], ["#f97316", "#ec4899"], ["#22d3ee", "#3b82f6"],
  ["#10b981", "#0ea5e9"], ["#f59e0b", "#ef4444"], ["#a855f7", "#6366f1"],
  ["#fda4af", "#f472b6"], ["#34d399", "#facc15"],
];

/* ═══════════ Fabrique ═══════════ */

/** Minuscules, sans accents ni ligatures : « fleche »→« flèche », « coeur »→« cœur ». */
export function normalizeSearch(s: string): string {
  return s.toLowerCase().replace(/\u0153/g, "oe").replace(/\u00e6/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

let seq = 0;
const items: ElementDef[] = [];
function add(cat: string, label: string, keywords: string, w: number, h: number, body: string) {
  items.push({ id: `el-${++seq}`, label, cat, w, h, keywords: normalizeSearch(`${label} ${keywords}`), svg: doc(w, h, body) });
}

/* ── 1. Cercles & cadres ── */
(() => {
  const K = "cercle rond cadre anneau";
  for (const c of ["#ffffff", "#111827", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]) {
    for (const sw of [4, 10, 20]) {
      add("circles", "Anneau", K, 200, 200, `<circle cx="100" cy="100" r="${92 - sw / 2}" fill="none" stroke="${c}" stroke-width="${sw}"/>`);
    }
  }
  for (const c of ["#ffffff", "#111827", "#3b82f6", "#ec4899"]) {
    add("circles", "Anneau pointillé", `${K} pointillé dashed`, 200, 200, `<circle cx="100" cy="100" r="88" fill="none" stroke="${c}" stroke-width="7" stroke-dasharray="1 22" stroke-linecap="round"/>`);
    add("circles", "Anneau tirets", `${K} tirets`, 200, 200, `<circle cx="100" cy="100" r="88" fill="none" stroke="${c}" stroke-width="6" stroke-dasharray="26 14"/>`);
    add("circles", "Double anneau", K, 200, 200, `<circle cx="100" cy="100" r="90" fill="none" stroke="${c}" stroke-width="4"/><circle cx="100" cy="100" r="74" fill="none" stroke="${c}" stroke-width="4"/>`);
  }
  // Cercles « pinceau » : deux arcs ouverts qui se chevauchent.
  for (const c of ["#ffffff", "#111827", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]) {
    for (const s of [1, 2]) {
      const r = rng(s * 7 + 3);
      const a0 = -110 + r() * 40, sweep = 300 + r() * 40;
      const [x1, y1] = polar(100, 100, 84, a0);
      const [x2, y2] = polar(100, 100, 86, a0 + sweep * 0.94);
      const [x3, y3] = polar(100, 100, 78, a0 + 30);
      const [x4, y4] = polar(100, 100, 80, a0 + sweep * 0.7);
      add("circles", "Cercle pinceau", `${K} pinceau brush dessin main`, 200, 200,
        `<path d="M ${N(x1)} ${N(y1)} A 85 85 0 1 1 ${N(x2)} ${N(y2)}" fill="none" stroke="${c}" stroke-width="13" stroke-linecap="round"/>` +
        `<path d="M ${N(x3)} ${N(y3)} A 79 79 0 1 1 ${N(x4)} ${N(y4)}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`);
    }
  }
  // Cercles gribouillés (spirale irrégulière).
  for (const c of ["#ffffff", "#ef4444", "#3b82f6", "#facc15", "#ec4899", "#22c55e"]) {
    const r = rng(c.charCodeAt(1) * 31);
    let d2 = "";
    const turns = 2.3, steps = 70;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const rad = 68 + t * 22 + (r() - 0.5) * 9;
      const [x, y] = polar(100, 102, rad, -90 + t * 360 * turns);
      d2 += (i === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
    }
    add("circles", "Cercle gribouillé", `${K} gribouillage scribble main`, 200, 200,
      `<path d="${d2}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  // Cadres rectangulaires.
  for (const c of ["#ffffff", "#111827", "#f59e0b", "#8b5cf6"]) {
    add("circles", "Cadre", "cadre rectangle bordure frame", 220, 160, `<rect x="8" y="8" width="204" height="144" rx="10" fill="none" stroke="${c}" stroke-width="6"/>`);
    add("circles", "Cadre coins", "cadre coins photo viseur", 220, 160,
      ["M 8 48 V 20 Q 8 8 20 8 H 48", "M 172 8 H 200 Q 212 8 212 20 V 48", "M 212 112 V 140 Q 212 152 200 152 H 172", "M 48 152 H 20 Q 8 152 8 140 V 112"]
        .map((d) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`).join(""));
  }
})();

/* ── 2. Traits & surlignage ── */
(() => {
  const K = "trait souligné ligne surlignage underline";
  for (const c of ["#ffffff", "#111827", "#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#ec4899"]) {
    add("strokes", "Souligné épais", K, 300, 40, `<path d="M 12 20 H 288" stroke="${c}" stroke-width="14" stroke-linecap="round" fill="none"/>`);
    // Trait pinceau effilé (polygone irrégulier).
    const r = rng(c.charCodeAt(2) * 17 + 5);
    let top = "M 10 16 ", bot = "";
    for (let i = 0; i <= 10; i++) { top += `L ${N(10 + i * 28)} ${N(13 + (r() - 0.5) * 7)} `; }
    for (let i = 10; i >= 0; i--) { bot += `L ${N(10 + i * 28)} ${N(26 + (r() - 0.5) * 8)} `; }
    add("strokes", "Trait pinceau", `${K} pinceau brush`, 300, 40, `<path d="${top}${bot} Z" fill="${c}"/>`);
    // Vague.
    let wave = "M 10 22 ";
    for (let i = 0; i < 7; i++) wave += `q 20 ${i % 2 ? 18 : -18} 40 0 `;
    add("strokes", "Souligné vague", `${K} vague wave`, 300, 44, `<path d="${wave}" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`);
    // Zigzag.
    let zig = "M 10 30 ";
    for (let i = 0; i < 9; i++) zig += `L ${N(25 + i * 30)} ${i % 2 ? 30 : 10} `;
    add("strokes", "Zigzag", `${K} zigzag`, 300, 40, `<path d="${zig}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  for (const c of ["#ffffff", "#111827", "#3b82f6", "#ec4899"]) {
    add("strokes", "Double souligné", K, 300, 44, `<path d="M 12 14 H 288 M 26 32 H 274" stroke="${c}" stroke-width="7" stroke-linecap="round" fill="none"/>`);
    // Gribouillis de rature.
    const r = rng(c.charCodeAt(3) * 13 + 1);
    let sc = "M 14 22 ";
    for (let i = 0; i < 5; i++) sc += `Q ${N(40 + i * 56 + r() * 20)} ${N(i % 2 ? 40 : 4)} ${N(66 + i * 52)} ${N(20 + (r() - 0.5) * 8)} `;
    add("strokes", "Gribouillis", `${K} rature scribble`, 300, 44, `<path d="${sc}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`);
  }
  for (const c of ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"]) {
    add("strokes", "Surligneur", `${K} surligneur marker highlight`, 300, 60, `<rect x="6" y="10" width="288" height="40" rx="8" fill="${c}" opacity="0.75" transform="rotate(-1 150 30)"/>`);
  }
})();

/* ── 3. Flèches ── */
(() => {
  const K = "flèche arrow direction pointeur";
  for (const c of ["#ffffff", "#111827", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899"]) {
    add("arrows", "Flèche droite", K, 240, 80, `<path d="M 14 40 H 200" stroke="${c}" stroke-width="10" stroke-linecap="round" fill="none"/>${arrowHead(216, 40, 1, 0, 26, c)}`);
    add("arrows", "Flèche courbe", `${K} courbe`, 240, 140, `<path d="M 16 118 Q 70 18 196 52" stroke="${c}" stroke-width="9" stroke-linecap="round" fill="none"/>${arrowHead(210, 56, 3.3, 0.9, 24, c)}`);
    add("arrows", "Flèche tirets", `${K} pointillé tirets`, 240, 80, `<path d="M 14 40 H 196" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-dasharray="18 16" fill="none"/>${arrowHead(216, 40, 1, 0, 26, c)}`);
  }
  for (const c of ["#ffffff", "#111827", "#3b82f6", "#ec4899", "#facc15"]) {
    // Boucle.
    add("arrows", "Flèche boucle", `${K} boucle loop retour`, 200, 170,
      `<path d="M 30 150 C -10 60 90 4 132 34 C 174 64 160 118 108 122" stroke="${c}" stroke-width="9" stroke-linecap="round" fill="none"/>${arrowHead(96, 124, -3, 0.6, 24, c)}`);
    // Zigzag flèche.
    add("arrows", "Flèche zigzag", `${K} zigzag`, 240, 110, `<path d="M 14 26 L 80 84 L 130 32 L 186 74" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${arrowHead(202, 86, 1.35, 1, 24, c)}`);
    // Double sens.
    add("arrows", "Double sens", `${K} double aller retour`, 240, 70, `<path d="M 36 35 H 204" stroke="${c}" stroke-width="10" stroke-linecap="round" fill="none"/>${arrowHead(222, 35, 1, 0, 24, c)}${arrowHead(18, 35, -1, 0, 24, c)}`);
  }
  // Grosses flèches pleines.
  for (const c of BRIGHTS.slice(0, 5)) {
    add("arrows", "Flèche pleine", `${K} pleine grosse`, 220, 120, `<path d="M 8 42 H 128 V 14 L 212 60 L 128 106 V 78 H 8 Z" fill="${c}"/>`);
  }
})();

/* ── 4. Formes organiques ── */
(() => {
  const K = "blob forme organique fluide tache";
  const blob = (seed: number): string => {
    const r = rng(seed);
    const pts: [number, number][] = [];
    const n = 8;
    for (let i = 0; i < n; i++) pts.push(polar(100, 100, 62 + r() * 30, (i * 360) / n + r() * 18));
    return smoothClosed(pts);
  };
  let s = 11;
  for (const c of ["#ffffff", ...BRIGHTS, ...SOFTS.slice(0, 3)]) {
    add("blobs", "Blob", K, 200, 200, `<path d="${blob(s++)}" fill="${c}"/>`);
  }
  for (const [g1, g2] of GRADS) {
    const id = `bg${seq}`;
    add("blobs", "Blob dégradé", `${K} dégradé gradient`, 200, 200,
      `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs><path d="${blob(s++)}" fill="url(#${id})"/>`);
  }
  for (const c of ["#ffffff", "#3b82f6", "#ec4899", "#22c55e"]) {
    add("blobs", "Blob contour", `${K} contour outline`, 200, 200, `<path d="${blob(s++)}" fill="none" stroke="${c}" stroke-width="6"/>`);
  }
  // Éclaboussures : blob + gouttes satellites.
  for (const c of ["#facc15", "#3b82f6", "#ec4899", "#22c55e", "#ffffff"]) {
    const r = rng(s++ * 3);
    let drops = "";
    for (let i = 0; i < 6; i++) {
      const [x, y] = polar(100, 100, 78 + r() * 16, r() * 360);
      drops += `<circle cx="${N(x)}" cy="${N(y)}" r="${N(3 + r() * 7)}" fill="${c}"/>`;
    }
    add("blobs", "Éclaboussure", `${K} splash peinture`, 200, 200, `<path d="${blob(s * 7 + 1)}" fill="${c}" transform="translate(100 100) scale(0.72) translate(-100 -100)"/>${drops}`);
  }
})();

/* ── 5. Étoiles & éclats ── */
(() => {
  const K = "étoile éclat brillant sparkle star";
  const sparkle = (cx: number, cy: number, r0: number, slim: number): string => {
    return `M ${N(cx)} ${N(cy - r0)} C ${N(cx + r0 * slim)} ${N(cy - r0 * slim)} ${N(cx + r0 * slim)} ${N(cy - r0 * slim)} ${N(cx + r0)} ${N(cy)} C ${N(cx + r0 * slim)} ${N(cy + r0 * slim)} ${N(cx + r0 * slim)} ${N(cy + r0 * slim)} ${N(cx)} ${N(cy + r0)} C ${N(cx - r0 * slim)} ${N(cy + r0 * slim)} ${N(cx - r0 * slim)} ${N(cy + r0 * slim)} ${N(cx - r0)} ${N(cy)} C ${N(cx - r0 * slim)} ${N(cy - r0 * slim)} ${N(cx - r0 * slim)} ${N(cy - r0 * slim)} ${N(cx)} ${N(cy - r0)} Z`;
  };
  for (const c of ["#ffffff", "#facc15", "#f59e0b", "#8b5cf6", "#ec4899", "#22d3ee"]) {
    add("sparkles", "Éclat", K, 200, 200, `<path d="${sparkle(100, 100, 88, 0.16)}" fill="${c}"/>`);
    add("sparkles", "Trio d'éclats", `${K} trio groupe`, 200, 200,
      `<path d="${sparkle(78, 108, 62, 0.16)}" fill="${c}"/><path d="${sparkle(146, 60, 34, 0.18)}" fill="${c}"/><path d="${sparkle(156, 138, 22, 0.2)}" fill="${c}"/>`);
    // Scintillement (croix fine).
    add("sparkles", "Scintillement", `${K} scintille twinkle`, 200, 200,
      `<path d="M 100 8 V 192 M 8 100 H 192" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M 44 44 L 156 156 M 156 44 L 44 156" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`);
  }
  // Rayons de soleil / burst.
  for (const c of ["#ffffff", "#facc15", "#ef4444", "#3b82f6"]) {
    let rays = "";
    for (let i = 0; i < 18; i++) {
      const [x1, y1] = polar(100, 100, 58, i * 20);
      const [x2, y2] = polar(100, 100, i % 2 ? 82 : 94, i * 20);
      rays += `<path d="M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`;
    }
    add("sparkles", "Rayons", `${K} soleil rayons burst`, 200, 200, rays);
    // Demi-rayons (au-dessus d'un titre).
    let half = "";
    for (let i = 0; i <= 8; i++) {
      const ang = -180 + i * 22.5;
      const [x1, y1] = polar(100, 96, 40, ang);
      const [x2, y2] = polar(100, 96, i % 2 ? 66 : 84, ang);
      half += `<path d="M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`;
    }
    add("sparkles", "Demi-rayons", `${K} idée exclamation`, 200, 100, half);
  }
  // Confettis.
  for (let v = 0; v < 4; v++) {
    const r = rng(100 + v * 17);
    let conf = "";
    for (let i = 0; i < 16; i++) {
      const x = 10 + r() * 180, y = 10 + r() * 180, col = BRIGHTS[Math.floor(r() * BRIGHTS.length)];
      const k = r();
      if (k < 0.34) conf += `<circle cx="${N(x)}" cy="${N(y)}" r="${N(4 + r() * 4)}" fill="${col}"/>`;
      else if (k < 0.67) conf += `<rect x="${N(x)}" y="${N(y)}" width="12" height="7" rx="2" fill="${col}" transform="rotate(${N(r() * 360)} ${N(x)} ${N(y)})"/>`;
      else conf += `<path d="M ${N(x)} ${N(y)} q 6 -10 12 0" stroke="${col}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    }
    add("sparkles", "Confettis", `${K} confetti fête party`, 200, 200, conf);
  }
})();

/* ── 6. Badges & rubans ── */
(() => {
  const K = "badge ruban bannière promo prix étiquette";
  const burst = (points: number, inner: number): string => {
    let d = "";
    for (let i = 0; i < points * 2; i++) {
      const [x, y] = polar(100, 100, i % 2 === 0 ? 94 : 94 * inner, -90 + (i * 180) / points);
      d += (i === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
    }
    return d + "Z";
  };
  for (const c of ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#111827"]) {
    add("badges", "Badge promo", `${K} soldes burst`, 200, 200, `<path d="${burst(14, 0.82)}" fill="${c}"/>`);
    add("badges", "Sceau", `${K} sceau tampon seal`, 200, 200, `<path d="${burst(24, 0.9)}" fill="${c}"/><circle cx="100" cy="100" r="66" fill="none" stroke="${shade(c, c === "#111827" ? -2.2 : 0.28)}" stroke-width="4" stroke-dasharray="3 7"/>`);
  }
  for (const c of ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]) {
    const dk = shade(c, 0.3);
    // Ruban à queues.
    add("badges", "Ruban", `${K} bannière titre`, 260, 90,
      `<path d="M 30 18 H 230 V 72 H 30 Z" fill="${c}"/>` +
      `<path d="M 30 26 L 2 26 L 16 45 L 2 64 L 30 64 Z" fill="${dk}"/>` +
      `<path d="M 230 26 L 258 26 L 244 45 L 258 64 L 230 64 Z" fill="${dk}"/>`);
    // Bannière drapeau ondulée.
    add("badges", "Bannière", `${K} drapeau flag`, 260, 80,
      `<path d="M 14 16 Q 65 4 130 12 Q 195 20 246 10 L 246 60 Q 195 70 130 62 Q 65 54 14 66 Z" fill="${c}"/>`);
    // Fanion.
    add("badges", "Fanion", `${K} fanion pennant`, 200, 120, `<path d="M 10 12 H 190 L 150 60 L 190 108 H 10 Z" fill="${c}"/>`);
  }
  for (const c of ["#f59e0b", "#3b82f6", "#ec4899", "#111827"]) {
    // Étiquette de prix.
    add("badges", "Étiquette", `${K} tag prix`, 220, 120,
      `<path d="M 96 8 H 196 Q 212 8 212 24 V 96 Q 212 112 196 112 H 96 L 30 60 Z" fill="${c}" transform="rotate(-8 120 60)"/><circle cx="72" cy="60" r="10" fill="#ffffff" transform="rotate(-8 120 60)"/>`);
  }
  // Pastilles % / NEW.
  for (const [txt, c] of [["-50%", "#ef4444"], ["-30%", "#f59e0b"], ["NEW", "#22c55e"], ["TOP", "#3b82f6"], ["HOT", "#ec4899"], ["-70%", "#8b5cf6"]] as const) {
    add("badges", `Pastille ${txt}`, `${K} ${txt} réduction`, 200, 200,
      `<circle cx="100" cy="100" r="92" fill="${c}"/><circle cx="100" cy="100" r="78" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.55"/><text x="100" y="122" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="800" fill="#ffffff" text-anchor="middle">${txt}</text>`);
  }
})();

/* ── 7. Bulles ── */
(() => {
  const K = "bulle message dialogue parole speech";
  for (const c of ["#ffffff", "#111827", "#3b82f6", "#22c55e", "#facc15", "#ec4899"]) {
    const stroke = c === "#ffffff" ? `stroke="#111827" stroke-width="5"` : "";
    add("bubbles", "Bulle ronde", K, 220, 180,
      `<ellipse cx="110" cy="80" rx="98" ry="66" fill="${c}" ${stroke}/><path d="M 70 132 L 52 168 L 106 140 Z" fill="${c}" ${stroke}/>`);
    add("bubbles", "Bulle rectangle", K, 220, 170,
      `<rect x="10" y="10" width="200" height="112" rx="24" fill="${c}" ${stroke}/><path d="M 60 118 L 48 158 L 100 122 Z" fill="${c}" ${stroke}/>`);
    add("bubbles", "Pensée", `${K} pensée nuage think`, 220, 180,
      `<ellipse cx="116" cy="72" rx="92" ry="58" fill="${c}" ${stroke}/><circle cx="62" cy="140" r="14" fill="${c}" ${stroke}/><circle cx="38" cy="164" r="8" fill="${c}" ${stroke}/>`);
  }
  for (const c of ["#ef4444", "#facc15", "#3b82f6"]) {
    let d = "";
    const n = 12;
    for (let i = 0; i < n * 2; i++) {
      const [x, y] = polar(110, 85, i % 2 === 0 ? 100 : 70, -90 + (i * 180) / n);
      d += (i === 0 ? "M" : "L") + ` ${N(x)} ${N(y * 0.82 + 15)} `;
    }
    add("bubbles", "Bulle cri", `${K} cri boom exclamation`, 220, 180, `<path d="${d} Z" fill="${c}"/>`);
  }
})();

/* ── 8. Nature ── */
(() => {
  const K = "nature plante feuille fleur";
  const leaf = (c: string) => `<path d="M 100 190 C 30 130 30 60 100 10 C 170 60 170 130 100 190 Z" fill="${c}"/><path d="M 100 180 V 30" stroke="${shade(c, 0.25)}" stroke-width="5" stroke-linecap="round"/>`;
  for (const c of ["#22c55e", "#16a34a", "#84cc16", "#10b981", "#ffffff"]) add("nature", "Feuille", `${K} leaf`, 200, 200, leaf(c));
  for (const c of ["#22c55e", "#16a34a", "#ffffff"]) {
    // Branche à feuilles alternées.
    let leaves = `<path d="M 20 180 Q 100 120 180 20" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    const r = rng(c.charCodeAt(1) * 7);
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const x = 20 + 160 * t * (1 - 0.15 * t), y = 180 - 160 * t + 30 * t * (1 - t);
      const side = i % 2 ? 1 : -1;
      const ang = -45 + side * 40 + r() * 10;
      leaves += `<ellipse cx="${N(x + side * 16)}" cy="${N(y - 10)}" rx="20" ry="9" fill="${c}" transform="rotate(${N(ang)} ${N(x + side * 16)} ${N(y - 10)})"/>`;
    }
    add("nature", "Branche", `${K} branche rameau`, 200, 200, leaves);
  }
  for (const c of ["#ec4899", "#f59e0b", "#8b5cf6", "#ffffff"]) {
    let petals = "";
    for (let i = 0; i < 6; i++) petals += `<ellipse cx="100" cy="58" rx="24" ry="42" fill="${c}" transform="rotate(${i * 60} 100 100)"/>`;
    add("nature", "Fleur", `${K} flower marguerite`, 200, 200, `${petals}<circle cx="100" cy="100" r="22" fill="#facc15"/>`);
  }
  add("nature", "Soleil", `${K} soleil été`, 200, 200, (() => {
    let rays = `<circle cx="100" cy="100" r="46" fill="#facc15"/>`;
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = polar(100, 100, 62, i * 30);
      const [x2, y2] = polar(100, 100, 88, i * 30);
      rays += `<path d="M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}" stroke="#facc15" stroke-width="10" stroke-linecap="round"/>`;
    }
    return rays;
  })());
  // Croissant = intersection de deux cercles de même rayon (arcs toujours
  // valides : la corde 160,8 < diamètre 170). L'ancien tracé était dégénéré
  // (aire nulle → lune invisible).
  add("nature", "Lune", `${K} lune nuit croissant`, 200, 200,
    `<path d="M 122.5 19.6 A 85 85 0 1 0 122.5 180.4 A 85 85 0 0 1 122.5 19.6 Z" fill="#fde68a"/>`);
  for (const c of ["#ffffff", "#bfdbfe", "#94a3b8"]) {
    add("nature", "Nuage", `${K} nuage cloud`, 220, 140,
      `<path d="M 55 115 A 32 32 0 0 1 45 53 A 40 40 0 0 1 118 34 A 34 34 0 0 1 178 56 A 30 30 0 0 1 172 115 Z" fill="${c}"/>`);
  }
  add("nature", "Montagnes", `${K} montagne`, 240, 140,
    `<path d="M 8 130 L 84 30 L 128 88 L 164 44 L 232 130 Z" fill="#64748b"/><path d="M 84 30 L 104 56 L 92 56 L 110 80" fill="none" stroke="#ffffff" stroke-width="0"/><path d="M 70 48 L 84 30 L 98 48 L 90 48 L 84 42 L 78 48 Z" fill="#ffffff"/>`);
  add("nature", "Vague", `${K} mer vague eau`, 240, 120,
    `<path d="M 6 96 Q 36 40 66 76 Q 96 112 126 66 Q 150 30 178 66 Q 202 96 234 60" fill="none" stroke="#38bdf8" stroke-width="10" stroke-linecap="round"/>`);
})();

/* ── 9. Déco & motifs ── */
(() => {
  const K = "déco motif points memphis pattern";
  for (const c of ["#ffffff", "#94a3b8", "#facc15", "#3b82f6", "#ec4899"]) {
    let dots = "";
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) dots += `<circle cx="${20 + i * 40}" cy="${20 + j * 40}" r="7" fill="${c}"/>`;
    add("deco", "Grille de points", `${K} grille dots`, 200, 200, dots);
  }
  for (const c of ["#ffffff", "#8b5cf6", "#22d3ee"]) {
    let ht = "";
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const rr = Math.max(1.6, 9 - (i + j) * 1.15);
      ht += `<circle cx="${18 + i * 33}" cy="${18 + j * 33}" r="${N(rr)}" fill="${c}"/>`;
    }
    add("deco", "Demi-teinte", `${K} halftone fondu`, 200, 200, ht);
  }
  for (const c of ["#ffffff", "#facc15", "#ec4899"]) {
    let lines = "";
    for (let i = 0; i < 4; i++) {
      let w = `M 10 ${20 + i * 18} `;
      for (let k = 0; k < 5; k++) w += `q 20 ${k % 2 ? 14 : -14} 40 0 `;
      lines += `<path d="${w}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`;
    }
    add("deco", "Vagues", `${K} vagues lignes`, 220, 100, lines);
  }
  // Arcs arc-en-ciel.
  for (const set of [["#ef4444", "#f59e0b", "#facc15"], ["#3b82f6", "#8b5cf6", "#ec4899"], ["#ffffff", "#94a3b8", "#475569"]]) {
    add("deco", "Arches", `${K} arc arche rainbow`, 220, 120,
      set.map((c, i) => `<path d="M ${30 + i * 22} 112 A ${80 - i * 22} ${80 - i * 22} 0 0 1 ${190 - i * 22} 112" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round"/>`).join(""));
  }
  // Spirale.
  for (const c of ["#ffffff", "#f59e0b", "#3b82f6"]) {
    let sp = "M 100 100 ";
    for (let i = 0; i <= 130; i++) {
      const t = i / 130;
      const [x, y] = polar(100, 100, 4 + t * 86, t * 360 * 3.2);
      sp += `L ${N(x)} ${N(y)} `;
    }
    add("deco", "Spirale", `${K} spirale`, 200, 200, `<path d="${sp}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`);
  }
  // Plus scatter.
  for (const c of ["#ffffff", "#22c55e", "#ec4899"]) {
    const r = rng(c.charCodeAt(4) * 11 + 2);
    let plus = "";
    for (let i = 0; i < 8; i++) {
      const x = 18 + r() * 164, y = 18 + r() * 164, s2 = 8 + r() * 8;
      plus += `<path d="M ${N(x - s2)} ${N(y)} H ${N(x + s2)} M ${N(x)} ${N(y - s2)} V ${N(y + s2)}" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`;
    }
    add("deco", "Croix éparses", `${K} plus scatter`, 200, 200, plus);
  }
  // Damier.
  for (const c of ["#111827", "#8b5cf6", "#f59e0b"]) {
    let ch = "";
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2 === 0) ch += `<rect x="${10 + i * 30}" y="${10 + j * 30}" width="30" height="30" fill="${c}"/>`;
    add("deco", "Damier", `${K} damier checker`, 200, 200, ch);
  }
})();

/* ── 10. Dégradés & 3D ── */
(() => {
  const K = "dégradé gradient 3d orbe sphère verre";
  for (const [g1, g2] of GRADS) {
    const id1 = `o${seq}`;
    add("gradients", "Orbe", `${K} boule`, 200, 200,
      `<defs><radialGradient id="${id1}" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></radialGradient></defs><circle cx="100" cy="100" r="92" fill="url(#${id1})"/><ellipse cx="72" cy="58" rx="30" ry="18" fill="#ffffff" opacity="0.35" transform="rotate(-24 72 58)"/>`);
  }
  for (const [g1, g2] of GRADS.slice(0, 6)) {
    const id2 = `r${seq}`;
    add("gradients", "Anneau dégradé", `${K} anneau ring`, 200, 200,
      `<defs><linearGradient id="${id2}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs><circle cx="100" cy="100" r="80" fill="none" stroke="url(#${id2})" stroke-width="26"/>`);
  }
  for (const [g1, g2] of GRADS.slice(0, 6)) {
    const id3 = `q${seq}`;
    add("gradients", "Carré dégradé", `${K} carré squircle`, 200, 200,
      `<defs><linearGradient id="${id3}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs><rect x="14" y="14" width="172" height="172" rx="46" fill="url(#${id3})"/>`);
  }
  for (const [g1, g2] of GRADS.slice(0, 4)) {
    const id4 = `d${seq}`;
    add("gradients", "Demi-lune dégradée", `${K} arche demi`, 200, 110,
      `<defs><linearGradient id="${id4}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs><path d="M 8 104 A 92 92 0 0 1 192 104 Z" fill="url(#${id4})"/>`);
  }
  // Bulle de verre.
  for (const c of ["#a5b4fc", "#67e8f9", "#f9a8d4"]) {
    add("gradients", "Bulle de verre", `${K} glass bulle transparent`, 200, 200,
      `<circle cx="100" cy="100" r="90" fill="${c}" opacity="0.25"/><circle cx="100" cy="100" r="90" fill="none" stroke="${c}" stroke-width="3" opacity="0.8"/><path d="M 48 74 A 60 60 0 0 1 78 42" stroke="#ffffff" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.9"/>`);
  }
})();

export const ELEMENTS: ElementDef[] = items;
