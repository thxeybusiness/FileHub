// Familles génératives du catalogue Design.
//
// POURQUOI : à partir de quelques dizaines de milliers d'éléments, matérialiser
// tout le catalogue en mémoire devient impossible (~1 Ko de SVG par élément, et
// une génération qui fige l'éditeur). Une famille décrit donc un ESPACE DE
// PARAMÈTRES et sait fabriquer l'élément n° i à la demande. On ne construit
// jamais que les ~120 éléments réellement affichés à l'écran : la mémoire et le
// temps de réponse ne dépendent plus de la taille annoncée du catalogue.
//
// Les identifiants sont STABLES (`cat.famille~index`) : un document enregistré
// retrouve exactement le même dessin, puisque l'index détermine les paramètres.

import type { ElementDef } from "./design-elements";
import { normalizeSearch } from "./design-elements";
import {
  C, N, rng, polar, smoothClosed, starPts, polyPts, arrowHead, stroke, fillp, eo, holeC,
  fillWith, strokeWith,
} from "./design-geom";

export type ElementFamily = {
  id: string;
  cat: string;
  label: string;
  kw: string;                      // mots-clés normalisés (recherche)
  count: number;                   // taille de l'espace de paramètres
  slots?: { label: string; def?: string }[];
  /** `slots` est redéfinissable par élément : dans une même famille, le symbole
      d'une icône posée sur un fond plein doit partir d'une couleur contrastée,
      celui d'une icône sans fond non. */
  make: (i: number) => { w: number; h: number; body: string; slots?: { label: string; def?: string }[] };
};

const TWO = [{ label: "Couleur principale" }, { label: "Couleur secondaire" }];
const c1 = (code = "") => `__C1~${code}__`;

/** Décompose un index plat en coordonnées sur chaque axe de paramètres. */
function axes(i: number, dims: number[]): number[] {
  const out = new Array(dims.length);
  for (let k = dims.length - 1; k >= 0; k--) { out[k] = i % dims[k]; i = Math.floor(i / dims[k]); }
  return out;
}
const size = (dims: number[]) => dims.reduce((a, b) => a * b, 1);

const FAMILIES: ElementFamily[] = [];
function fam(
  id: string, cat: string, label: string, kw: string,
  dims: number[],
  make: (a: number[], i: number) => { w: number; h: number; body: string; slots?: { label: string; def?: string }[] },
  slots?: { label: string; def?: string }[],
) {
  FAMILIES.push({ id, cat, label, kw: normalizeSearch(`${label} ${kw}`), count: size(dims), slots, make: (i) => make(axes(i, dims), i) });
}

/* ══════ Motifs semés ══════ */
{
  const G: [string, (x: number, y: number, s: number) => string][] = [
    ["pois", (x, y, s) => `<circle cx="${N(x)}" cy="${N(y)}" r="${N(s)}" fill="${C}"/>`],
    ["anneaux", (x, y, s) => `<circle cx="${N(x)}" cy="${N(y)}" r="${N(s)}" fill="none" stroke="${C}" stroke-width="${N(Math.max(1.4, s * 0.3))}"/>`],
    ["carrés", (x, y, s) => `<rect x="${N(x - s)}" y="${N(y - s)}" width="${N(s * 2)}" height="${N(s * 2)}" fill="${C}"/>`],
    ["carrés arrondis", (x, y, s) => `<rect x="${N(x - s)}" y="${N(y - s)}" width="${N(s * 2)}" height="${N(s * 2)}" rx="${N(s * 0.4)}" fill="${C}"/>`],
    ["losanges", (x, y, s) => fillp(`M ${N(x)} ${N(y - s)} L ${N(x + s)} ${N(y)} L ${N(x)} ${N(y + s)} L ${N(x - s)} ${N(y)} Z`)],
    ["triangles", (x, y, s) => fillp(`M ${N(x)} ${N(y - s)} L ${N(x + s)} ${N(y + s)} L ${N(x - s)} ${N(y + s)} Z`)],
    ["étoiles", (x, y, s) => fillp(starPts(x, y, 5, s, s * 0.42))],
    ["éclats", (x, y, s) => fillp(starPts(x, y, 4, s, s * 0.32))],
    ["étoiles 6", (x, y, s) => fillp(starPts(x, y, 6, s, s * 0.5))],
    ["croix", (x, y, s) => fillp(`M ${N(x - s / 3)} ${N(y - s)} H ${N(x + s / 3)} V ${N(y - s / 3)} H ${N(x + s)} V ${N(y + s / 3)} H ${N(x + s / 3)} V ${N(y + s)} H ${N(x - s / 3)} V ${N(y + s / 3)} H ${N(x - s)} V ${N(y - s / 3)} Z`)],
    ["croisillons", (x, y, s) => stroke(`M ${N(x - s)} ${N(y - s)} L ${N(x + s)} ${N(y + s)} M ${N(x + s)} ${N(y - s)} L ${N(x - s)} ${N(y + s)}`, Math.max(1.4, s * 0.32))],
    ["cœurs", (x, y, s) => fillp(`M ${N(x)} ${N(y + s * 0.72)} C ${N(x - s)} ${N(y)} ${N(x - s * 0.58)} ${N(y - s * 0.82)} ${N(x)} ${N(y - s * 0.3)} C ${N(x + s * 0.58)} ${N(y - s * 0.82)} ${N(x + s)} ${N(y)} ${N(x)} ${N(y + s * 0.72)} Z`)],
    ["hexagones", (x, y, s) => fillp(polyPts(x, y, 6, s, -90))],
    ["pentagones", (x, y, s) => fillp(polyPts(x, y, 5, s, -90))],
    ["feuilles", (x, y, s) => fillp(`M ${N(x)} ${N(y + s)} C ${N(x - s)} ${N(y + s * 0.2)} ${N(x - s * 0.8)} ${N(y - s * 0.8)} ${N(x)} ${N(y - s)} C ${N(x + s * 0.8)} ${N(y - s * 0.8)} ${N(x + s)} ${N(y + s * 0.2)} ${N(x)} ${N(y + s)} Z`)],
    ["gouttes", (x, y, s) => fillp(`M ${N(x)} ${N(y - s)} C ${N(x + s)} ${N(y)} ${N(x + s * 0.8)} ${N(y + s)} ${N(x)} ${N(y + s)} C ${N(x - s * 0.8)} ${N(y + s)} ${N(x - s)} ${N(y)} ${N(x)} ${N(y - s)} Z`)],
    ["barres", (x, y, s) => `<rect x="${N(x - s * 0.35)}" y="${N(y - s)}" width="${N(s * 0.7)}" height="${N(s * 2)}" rx="${N(s * 0.3)}" fill="${C}"/>`],
    ["chevrons", (x, y, s) => stroke(`M ${N(x - s)} ${N(y + s * 0.5)} L ${N(x)} ${N(y - s * 0.5)} L ${N(x + s)} ${N(y + s * 0.5)}`, Math.max(1.4, s * 0.3))],
    ["arcs", (x, y, s) => `<path d="M ${N(x - s)} ${N(y + s * 0.4)} A ${N(s)} ${N(s)} 0 0 1 ${N(x + s)} ${N(y + s * 0.4)}" fill="none" stroke="${C}" stroke-width="${N(Math.max(1.4, s * 0.3))}"/>`],
    ["fleurs", (x, y, s) => Array.from({ length: 5 }, (_, k) => `<ellipse cx="${N(x)}" cy="${N(y - s * 0.55)}" rx="${N(s * 0.28)}" ry="${N(s * 0.5)}" fill="${C}" transform="rotate(${k * 72} ${N(x)} ${N(y)})"/>`).join("")],
    ["spirales", (x, y, s) => { let d = ""; for (let k = 0; k <= 18; k++) { const t = k / 18; const [px, py] = polar(x, y, s * t, t * 540); d += (k ? "L" : "M") + ` ${N(px)} ${N(py)} `; } return stroke(d, Math.max(1.2, s * 0.22)); }],
    ["lunes", (x, y, s) => fillp(`M ${N(x + s * 0.3)} ${N(y - s)} A ${N(s)} ${N(s)} 0 1 0 ${N(x + s * 0.3)} ${N(y + s)} A ${N(s * 0.55)} ${N(s)} 0 0 1 ${N(x + s * 0.3)} ${N(y - s)} Z`)],
  ];
  const GAPS = [20, 26, 32, 40, 50, 62, 76, 92];
  const SIZES = [0.16, 0.22, 0.3, 0.38, 0.46];
  const LAY = ["grille", "quinconce", "libre", "diagonale", "dense", "aérée"];
  const JIT = [0, 0.18, 0.35, 0.55];
  fam("pat", "deco", "Motif", "motif semis pattern fond répétition texture",
    [G.length, GAPS.length, SIZES.length, LAY.length, JIT.length],
    ([gi, gp, si, li, ji], i) => {
      const [, fn] = G[gi];
      let gap = GAPS[gp];
      if (LAY[li] === "dense") gap *= 0.78;
      if (LAY[li] === "aérée") gap *= 1.3;
      const s = gap * SIZES[si];
      const cols = Math.max(3, Math.round(230 / gap)), rows = Math.max(3, Math.round(170 / gap));
      const r = rng(i * 2654435761 % 2147483647);
      let g = "";
      for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
        let x = 24 + a * gap, y = 24 + b * gap;
        if (LAY[li] === "quinconce") x += (b % 2) * (gap / 2);
        if (LAY[li] === "diagonale") { x += b * (gap / 3); if (x > 24 + cols * gap) x -= cols * gap; }
        const j = JIT[ji];
        if (j) { x += (r() - 0.5) * gap * j; y += (r() - 0.5) * gap * j; }
        g += fn(x, y, s);
      }
      const W = 24 + cols * gap + 24, H = 24 + rows * gap + 24;
      return { w: N(W), h: N(H), body: `<defs><clipPath id="pc"><rect x="0" y="0" width="${N(W)}" height="${N(H)}"/></clipPath></defs><g clip-path="url(#pc)">${g}</g>` };
    });
}

/* ══════ Blobs organiques ══════ */
fam("blob", "blobs", "Blob", "blob forme organique fluide tache goutte",
  [8, 8, 300, 3],
  ([ni, ii, seed, st]) => {
    const n = 5 + ni, irr = 10 + ii * 4;
    const r = rng(seed * 7919 + n * 131 + irr * 17 + 3);
    const pts: [number, number][] = [];
    for (let k = 0; k < n; k++) pts.push(polar(100, 100, 52 + r() * irr, (k * 360) / n + (r() - 0.5) * 22));
    const d = smoothClosed(pts);
    // 3ᵉ style : relief. La nuance sombre dérive de la couleur choisie, donc le
    // volume se voit dès la vignette et se recolore avec la forme — un liseré
    // dans un second emplacement restait invisible, les deux emplacements
    // partant de la même teinte.
    if (st !== 2) return { w: 200, h: 200, body: st === 0 ? fillWith(d) : strokeWith(d, 4 + (seed % 5) * 2) };
    // Le relief décale une copie vers le bas-droite : la boîte s'agrandit
    // d'autant, sinon l'ombre sortirait du cadre sur les blobs les plus larges.
    const off = 9 + (seed % 4) * 2;
    const body = `<g transform="translate(${N(off)} ${N(off)})">${fillWith(d, "__CDD__")}</g>${fillWith(d)}`;
    return { w: 200 + off, h: 200 + off, body };
  });

/* ══════ Rosaces & mandalas ══════ */
fam("rose", "ornaments", "Rosace", "rosace mandala ornement symétrie fleur",
  [18, 8, 8, 8, 5],
  ([pi, ri, wi, hi, ci]) => {
    const petals = 4 + pi, pw = 5 + wi * 3;
    // le pétale s'étend de rMid+ph depuis le centre : on borne pour rester dans la boîte
    const ph = 16 + hi * 5;
    const rMid = Math.min(30 + ri * 6, 92 - ph);
    let g = "";
    for (let k = 0; k < petals; k++)
      g += `<ellipse cx="100" cy="${N(100 - rMid)}" rx="${pw}" ry="${ph}" fill="${C}" transform="rotate(${N((k * 360) / petals)} 100 100)"/>`;
    if (ci >= 3) for (let k = 0; k < petals; k++)
      g += `<ellipse cx="100" cy="${N(100 - rMid * 0.6)}" rx="${N(pw * 0.7)}" ry="${N(ph * 0.6)}" fill="${c1()}" transform="rotate(${N((k * 360) / petals + 180 / petals)} 100 100)"/>`;
    g += ci === 0 ? "" : ci === 1 ? `<circle cx="100" cy="100" r="${N(10 + pw * 0.5)}" fill="${c1()}"/>`
      : ci === 2 ? `<circle cx="100" cy="100" r="${N(12 + pw * 0.5)}" fill="none" stroke="${c1()}" stroke-width="5"/>`
      : ci === 3 ? `<circle cx="100" cy="100" r="${N(9 + pw * 0.4)}" fill="${c1()}"/>`
      : `<path d="${starPts(100, 100, 6, 16, 7)}" fill="${c1()}"/>`;
    return { w: 200, h: 200, body: g };
  }, TWO);

/* ══════ Étoiles ══════ */
fam("star", "stars", "Étoile", "étoile star éclat branches pointe",
  [22, 12, 6, 6],
  ([pi, ri, si, roti]) => {
    const pts = 3 + pi, ratio = 0.24 + ri * 0.05, rot = -90 + roti * (60 / 6);
    const d = starPts(100, 100, pts, 86, 86 * ratio, rot);
    const body = si === 0 ? fillp(d) : si === 1 ? stroke(d, 5) : si === 2 ? stroke(d, 9)
      : si === 3 ? fillp(d) + `<circle cx="100" cy="100" r="${N(86 * ratio * 0.6)}" fill="${c1()}"/>`
      : si === 4 ? fillWith(d) + fillWith(starPts(100, 100, pts, 86 * 0.55, 86 * ratio * 0.55, rot), c1())
      : eo(`${d} ${starPts(100, 100, pts, 86 * 0.6, 86 * ratio * 0.6, rot)}`);
    return { w: 200, h: 200, body };
  }, TWO);

/* ══════ Fleurs ══════ */
fam("flower", "nature", "Fleur", "nature fleur flower pétales floral botanique",
  [12, 6, 6, 4, 4, 2],
  ([pi, wi, hi, yi, ci, oi]) => {
    const petals = 4 + pi, pw = 10 + wi * 5, py = 44 + yi * 6;
    const ph = Math.min(26 + hi * 5, 92 - (100 - py));
    let g = "";
    for (let k = 0; k < petals; k++) {
      const rot = (k * 360) / petals;
      g += oi
        ? `<ellipse cx="100" cy="${py}" rx="${pw}" ry="${ph}" fill="none" stroke="${C}" stroke-width="5" transform="rotate(${N(rot)} 100 100)"/>`
        : `<ellipse cx="100" cy="${py}" rx="${pw}" ry="${ph}" fill="${C}" transform="rotate(${N(rot)} 100 100)"/>`;
    }
    g += ci === 0 ? `<circle cx="100" cy="100" r="${N(12 + pw * 0.3)}" fill="${c1()}"/>`
      : ci === 1 ? `<circle cx="100" cy="100" r="${N(14 + pw * 0.3)}" fill="none" stroke="${c1()}" stroke-width="6"/>`
      : ci === 2 ? Array.from({ length: 8 }, (_, k) => { const [x, y] = polar(100, 100, 11, k * 45); return `<circle cx="${N(x)}" cy="${N(y)}" r="4" fill="${c1()}"/>`; }).join("")
      : `<path d="${starPts(100, 100, petals, 18, 8)}" fill="${c1()}"/>`;
    return { w: 200, h: 200, body: g };
  }, TWO);

/* ══════ Feuilles ══════ */
fam("leaf", "nature", "Feuille", "nature feuille leaf plante végétal botanique",
  [8, 8, 5, 5, 6],
  ([fi, bi, ti, si, seed]) => {
    const fat = 0.36 + fi * 0.07, bend = -28 + bi * 8, tip = 0.7 + ti * 0.18;
    const half = 84 * fat, topY = 14 * tip;
    const d = `M 100 184 C ${N(100 - half)} 136 ${N(100 - half - bend)} ${N(56 + seed * 3)} 100 ${N(topY)} C ${N(100 + half - bend)} ${N(56 + seed * 3)} ${N(100 + half)} 136 100 184 Z`;
    const body = si === 0 ? fillp(d) : si === 1 ? stroke(d, 4 + seed)
      : si === 2 ? fillWith(d) + strokeWith(`M 100 174 Q ${N(100 - bend / 2)} 100 100 ${N(topY + 12)}`, 4, c1())
      : si === 3 ? fillWith(d) + fillWith(`M 100 184 C ${N(100 + half - bend)} ${N(56 + seed * 3)} ${N(100 + half)} 136 100 184 Z`, c1())
      : strokeWith(d, 5) + strokeWith(`M 100 174 V ${N(topY + 12)}`, 3, c1());
    return { w: 200, h: 200, body };
  }, TWO);

/* ══════ Icônes : glyphe × conteneur ══════ */
{
  const GL: [string, string][] = [
    ["cœur", "M 100 138 C 66 114 54 96 60 80 C 66 66 82 64 90 73 C 94 78 98 84 100 89 C 102 84 106 78 110 73 C 118 64 134 66 140 80 C 146 96 134 114 100 138 Z"],
    ["étoile", starPts(100, 100, 5, 40, 17)],
    ["coche", "M 74 100 L 92 118 L 128 80 L 138 90 L 92 138 L 64 110 Z"],
    ["croix", "M 100 88 L 128 60 L 140 72 L 112 100 L 140 128 L 128 140 L 100 112 L 72 140 L 60 128 L 88 100 L 60 72 L 72 60 Z"],
    ["plus", "M 90 64 H 110 V 90 H 136 V 110 H 110 V 136 H 90 V 110 H 64 V 90 H 90 Z"],
    ["moins", "M 64 90 H 136 V 110 H 64 Z"],
    ["lecture", "M 84 70 L 138 100 L 84 130 Z"],
    ["pause", "M 78 68 H 92 V 132 H 78 Z M 108 68 H 122 V 132 H 108 Z"],
    ["stop", "M 74 74 H 126 V 126 H 74 Z"],
    ["éclair", "M 112 58 L 78 106 H 98 L 90 142 L 126 96 H 104 Z"],
    ["goutte", "M 100 60 C 116 84 128 96 128 110 A 28 28 0 0 1 72 110 C 72 96 84 84 100 60 Z"],
    ["maison", "M 100 62 L 142 98 H 132 V 138 H 108 V 114 H 92 V 138 H 68 V 98 H 58 Z"],
    ["flamme", "M 100 58 C 108 80 126 90 126 114 A 26 26 0 0 1 74 114 C 74 100 82 90 88 82 C 88 94 92 98 96 100 C 93 84 95 70 100 58 Z"],
    ["lune", "M 118 62 A 40 40 0 1 0 118 138 A 32 32 0 0 1 118 62 Z"],
    ["soleil", ""],
    ["cloche", "M 100 62 C 86 62 78 72 78 86 V 106 L 70 118 H 130 L 122 106 V 86 C 122 72 114 62 100 62 Z M 92 124 A 10 10 0 0 0 108 124 Z"],
    ["marque-page", "M 78 62 H 122 V 140 L 100 122 L 78 140 Z"],
    ["fanion", "M 74 62 V 142 M 74 66 L 132 82 L 74 98"],
    ["losange", "M 100 58 L 138 100 L 100 142 L 62 100 Z"],
    ["hexagone", polyPts(100, 100, 6, 42)],
    ["triangle", polyPts(100, 100, 3, 44)],
    ["carré", "M 62 62 H 138 V 138 H 62 Z"],
    ["cercle", ""],
    ["anneau", ""],
    ["flèche", "M 62 92 H 108 V 74 L 140 100 L 108 126 V 108 H 62 Z"],
    ["chevron", "M 86 66 L 122 100 L 86 134 L 76 124 L 102 100 L 76 76 Z"],
  ];
  const CONT = ["aucun", "cercle", "carré", "arrondi", "badge", "anneau", "losange", "hexagone"];
  fam("icon", "icons", "Icône", "icône symbole pictogramme ui interface bouton",
    [GL.length, CONT.length, 2, 4, 3],
    ([gi, ci, fi, si, ai]) => {
      const [glabel, d] = GL[gi];
      const glyph = glabel === "soleil"
        ? `<circle cx="100" cy="100" r="24" fill="${c1()}"/>` + Array.from({ length: 8 }, (_, k) => { const [x1, y1] = polar(100, 100, 32, k * 45), [x2, y2] = polar(100, 100, 44, k * 45); return `<path d="M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}" stroke="${c1()}" stroke-width="7" stroke-linecap="round" fill="none"/>`; }).join("")
        : glabel === "cercle" ? `<circle cx="100" cy="100" r="40" fill="${c1()}"/>`
        : glabel === "anneau" ? `<circle cx="100" cy="100" r="38" fill="none" stroke="${c1()}" stroke-width="10"/>`
        : glabel === "fanion" ? `<path d="${d}" fill="none" stroke="${c1()}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="${d}" fill="${c1()}"/>`;
      const sc = 0.7 + si * 0.12;
      const inner = `<g transform="translate(${N(100 - 100 * sc)} ${N(100 - 100 * sc)}) scale(${N(sc)})">${glyph}</g>`;
      const filled = fi === 1;
      const sw = 6 + ai * 4;
      const box = CONT[ci] === "aucun" ? ""
        : CONT[ci] === "cercle" ? (filled ? `<circle cx="100" cy="100" r="92" fill="${C}"/>` : `<circle cx="100" cy="100" r="${N(92 - sw / 2)}" fill="none" stroke="${C}" stroke-width="${sw}"/>`)
        : CONT[ci] === "carré" ? (filled ? `<rect x="8" y="8" width="184" height="184" fill="${C}"/>` : `<rect x="${N(8 + sw / 2)}" y="${N(8 + sw / 2)}" width="${N(184 - sw)}" height="${N(184 - sw)}" fill="none" stroke="${C}" stroke-width="${sw}"/>`)
        : CONT[ci] === "arrondi" ? (filled ? `<rect x="8" y="8" width="184" height="184" rx="44" fill="${C}"/>` : `<rect x="${N(8 + sw / 2)}" y="${N(8 + sw / 2)}" width="${N(184 - sw)}" height="${N(184 - sw)}" rx="42" fill="none" stroke="${C}" stroke-width="${sw}"/>`)
        : CONT[ci] === "badge" ? (filled ? fillp(starPts(100, 100, 20, 92, 74)) + `<circle cx="100" cy="100" r="66" fill="__CDD__"/>` : fillp(starPts(100, 100, 14, 92, 78)))
        : CONT[ci] === "anneau" ? (filled ? `<circle cx="100" cy="100" r="${N(92 - sw)}" fill="none" stroke="${C}" stroke-width="${N(sw)}"/><circle cx="100" cy="100" r="${N(70 - sw)}" fill="none" stroke="${C}" stroke-width="${N(sw * 0.7)}"/>` : `<circle cx="100" cy="100" r="${N(92 - sw)}" fill="none" stroke="${C}" stroke-width="${N(sw * 1.6)}"/>`)
        : CONT[ci] === "losange" ? (filled ? fillp("M 100 6 L 194 100 L 100 194 L 6 100 Z") : stroke("M 100 10 L 190 100 L 100 190 L 10 100 Z", sw))
        : (filled ? fillp(polyPts(100, 100, 6, 92)) : stroke(polyPts(100, 100, 6, 90), sw));
      // Sur un fond PLEIN, le symbole doit contraster : son emplacement partant
      // sinon de la teinte du fond, le glyphe disparaissait et toutes les
      // icônes pleines rendaient le même disque uni.
      const solide = CONT[ci] === "badge" || (filled && ["cercle", "carré", "arrondi", "losange", "hexagone"].includes(CONT[ci]));
      return {
        w: 200, h: 200, body: box + inner,
        slots: solide ? [{ label: "Couleur principale" }, { label: "Couleur du symbole", def: "#f8fafc" }] : undefined,
      };
    }, TWO);
}

/* ══════ Cadres ══════ */
fam("frame", "frames", "Cadre", "cadre bordure contour encadrement",
  [6, 6, 6, 8, 4],
  ([ri, wi, radi, di, ii]) => {
    const RATIOS: [number, number][] = [[220, 170], [200, 200], [170, 220], [240, 140], [180, 240], [240, 180]];
    const [w, h] = RATIOS[ri];
    const sw = 3 + wi * 3;
    const DASH = ["", "20 12", "8 8", "34 14", "3 10", "44 16 8 16", "14 6", "2 14"];
    const rad = [0, 8, 18, 32, 54, Math.min(w, h) / 2][radi];
    const inset = sw / 2 + 6 + ii * 6;
    const rr = Math.min(rad, Math.min(w, h) / 2 - inset);
    return { w, h, body: `<rect x="${N(inset)}" y="${N(inset)}" width="${N(w - inset * 2)}" height="${N(h - inset * 2)}" rx="${N(Math.max(0, rr))}" fill="none" stroke="${C}" stroke-width="${sw}"${DASH[di] ? ` stroke-dasharray="${DASH[di]}"` : ""}/>` };
  });

/* ══════ Sceaux & badges ══════ */
fam("seal", "badges", "Sceau", "badge sceau tampon promo étiquette dentelé",
  [20, 6, 6, 4],
  ([ti, ii, si, ri]) => {
    const teeth = 8 + ti * 2, inner = 5 + ii * 4;
    const d = starPts(100, 100, teeth, 90, 90 - inner);
    const body = si === 0 ? fillp(d) : si === 1 ? stroke(d, 4 + ri)
      : si === 2 ? fillp(d) + `<circle cx="100" cy="100" r="${N(90 - inner - 8 - ri * 3)}" fill="${c1()}"/>`
      : si === 3 ? fillp(d) + `<circle cx="100" cy="100" r="${N(90 - inner - 6 - ri * 3)}" fill="none" stroke="${c1()}" stroke-width="5"/>`
      : si === 4 ? eo(`${d}${holeC(100, 100, 90 - inner - 10 - ri * 3)}`)
      : fillp(d) + `<circle cx="100" cy="100" r="${N(8 + ri * 3)}" fill="${c1()}"/>`;
    return { w: 200, h: 200, body };
  }, TWO);

/* ══════ Bulles ══════ */
fam("bubble", "bubbles", "Bulle", "bulle parole message chat dialogue",
  [6, 8, 5, 5, 4],
  ([radi, ti, twi, si, hi]) => {
    const rad = 8 + radi * 10, hh = 80 + hi * 22, bw = 220;
    const tw = 14 + twi * 8, th = 22 + twi * 6;
    const tx = N(26 + (ti / 7) * (bw - 56 - tw));   // réparti, jamais buté
    const by = 12;
    const tail = `M ${N(tx)} ${N(by + hh - 2)} L ${N(tx + tw * 0.4)} ${N(by + hh + th)} L ${N(tx + tw)} ${N(by + hh - 2)} Z`;
    const rectF = `<rect x="10" y="${by}" width="${bw}" height="${N(hh)}" rx="${N(Math.min(rad, hh / 2))}" fill="${C}"/>`;
    const rectO = `<rect x="13.5" y="${by + 3.5}" width="${bw - 7}" height="${N(hh - 7)}" rx="${N(Math.min(rad, hh / 2))}" fill="none" stroke="${C}" stroke-width="7"/>`;
    const body = si === 0 ? rectF + fillp(tail)
      : si === 1 ? rectO + stroke(`M ${N(tx)} ${N(by + hh - 4)} L ${N(tx + tw * 0.4)} ${N(by + hh + th - 4)} L ${N(tx + tw)} ${N(by + hh - 4)}`, 7)
      : si === 2 ? rectF + fillp(tail) + `<rect x="30" y="${N(by + 18)}" width="${bw - 40}" height="${N(hh * 0.26)}" rx="7" fill="${c1()}"/>`
      : si === 3 ? rectF + fillp(tail) + Array.from({ length: 3 }, (_, k) => `<circle cx="${N(60 + k * 50)}" cy="${N(by + hh / 2)}" r="9" fill="${c1()}"/>`).join("")
      : rectO + stroke(`M ${N(tx)} ${N(by + hh - 4)} L ${N(tx + tw * 0.4)} ${N(by + hh + th - 4)} L ${N(tx + tw)} ${N(by + hh - 4)}`, 7) + `<rect x="34" y="${N(by + 22)}" width="${bw - 68}" height="9" rx="4.5" fill="${c1()}"/>`;
    return { w: 240, h: by + hh + th + 14, body };
  }, TWO);

/* ══════ Flèches ══════ */
fam("arrow", "arrows", "Flèche", "flèche arrow direction pointeur",
  [6, 6, 8, 5, 4],
  ([bi, hi, bendi, si, li]) => {
    const body = 4 + bi * 4, head = 16 + hi * 5, bend = -42 + bendi * 12;
    const len = 170 + li * 14, y0 = 74;
    const x0 = 26; // marge de départ : le rond et la tête arrière tiennent dans la boîte
    const d = `M ${x0} ${y0} Q ${N(x0 + len / 2)} ${N(y0 + bend)} ${N(x0 + len - head * 0.6)} ${y0}`;
    const ang = Math.atan2(-bend * 0.25, 60);
    const b = si === 0 ? stroke(d, Math.max(3, body)) + arrowHead(x0 + len - head * 0.5, y0, ang, head)
      : si === 1 ? stroke(d, Math.max(3, body), `stroke-dasharray="${body * 3} ${body * 2}"`) + arrowHead(x0 + len - head * 0.5, y0, ang, head)
      : si === 2 ? stroke(d, Math.max(3, body)) + arrowHead(x0 + len - head * 0.5, y0, ang, head) + arrowHead(x0 + head * 0.6, y0, Math.PI - ang, head)
      : si === 3 ? fillp(`M ${x0} ${N(y0 - body - 2)} H ${N(x0 + len * 0.62)} V ${N(y0 - head)} L ${N(x0 + len)} ${y0} L ${N(x0 + len * 0.62)} ${N(y0 + head)} V ${N(y0 + body + 2)} H ${x0} Z`)
      : stroke(d, Math.max(3, body)) + arrowHead(x0 + len - head * 0.5, y0, ang, head) + `<circle cx="${x0}" cy="${y0}" r="${N(Math.max(4, body))}" fill="${C}"/>`;
    return { w: x0 + len + head + 24, h: 160 + Math.abs(bend), body: b };
  });

/* ══════ Volumes 3D ══════ */
fam("vol", "geo", "Volume", "volume 3d relief sphère cube cylindre cône",
  [8, 5, 6, 30],
  ([ki, si, li, seed], i) => {
    const KINDS = ["sphère", "cube", "cylindre", "cône", "tore", "prisme", "pyramide", "pilule"];
    const k = 0.68 + si * 0.09;
    const r = rng(i * 7919 + 13);
    // L'axe « graine » ne servait qu'au prisme : les 30 valeurs rendaient le
    // même solide. Il pilote maintenant l'élancement et l'épaisseur, donc
    // chaque graine donne un volume réellement différent.
    const el = 0.82 + r() * 0.36;   // élancement (hauteur)
    const ep = 0.88 + r() * 0.26;   // épaisseur (largeur)
    const gx = 24 + li * 5, gy = 18 + li * 4;
    const RG = `<radialGradient id="q0" cx="${gx}%" cy="${gy}%" r="76%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.55" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient>`;
    const LG = `<linearGradient id="q1" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="__CLL__"/><stop offset="1" stop-color="__CDD__"/></linearGradient>`;
    const shine = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${N(cx)}" cy="${N(cy)}" rx="${N(rx)}" ry="${N(ry)}" fill="__CW__" opacity="0.5" transform="rotate(-28 ${N(cx)} ${N(cy)})"/>`;
    const contact = (cy: number, rx: number) => `<ellipse cx="100" cy="${N(cy)}" rx="${N(rx)}" ry="7" fill="__CDD__" opacity="0.22"/>`;
    let body = "";
    if (KINDS[ki] === "sphère") { const R = 74 * k, rx = R * ep, ry = R * (1.9 - ep);
      body = `<defs>${RG}</defs>` + contact(96 + ry + 12, rx * 0.78) + `<ellipse cx="100" cy="96" rx="${N(rx)}" ry="${N(ry)}" fill="url(#q0)"/>` + shine(100 - rx * 0.34, 96 - ry * 0.42, rx * 0.24, ry * 0.16); }
    else if (KINDS[ki] === "cube") { const s = 48 * k * ep, cx = 100, cy = 78; const P = (dx: number, dy: number) => `${N(cx + dx)} ${N(cy + dy * el)}`;
      body = contact(cy + s * 1.2 + 12, s * 1.05) + `<path d="M ${P(0, -s)} L ${P(s * 1.05, -s * 0.42)} L ${P(0, s * 0.18)} L ${P(-s * 1.05, -s * 0.42)} Z" fill="__CLL__"/><path d="M ${P(-s * 1.05, -s * 0.42)} L ${P(0, s * 0.18)} L ${P(0, s * 1.14)} L ${P(-s * 1.05, s * 0.54)} Z" fill="__CM__"/><path d="M ${P(s * 1.05, -s * 0.42)} L ${P(0, s * 0.18)} L ${P(0, s * 1.14)} L ${P(s * 1.05, s * 0.54)} Z" fill="__CDD__"/>`; }
    else if (KINDS[ki] === "cylindre") { const rx = 44 * k * ep, hh = 44 * k * el, ry = rx * 0.34;
      body = `<defs>${LG}</defs>` + contact(100 + hh + ry + 10, rx * 0.95) + `<path d="M ${N(100 - rx)} ${N(100 - hh)} V ${N(100 + hh)} A ${N(rx)} ${N(ry)} 0 0 0 ${N(100 + rx)} ${N(100 + hh)} V ${N(100 - hh)} Z" fill="url(#q1)"/><ellipse cx="100" cy="${N(100 - hh)}" rx="${N(rx)}" ry="${N(ry)}" fill="__CLL__"/>`; }
    else if (KINDS[ki] === "cône") { const rx = 44 * k * ep, hh = Math.min(56 * k * el, 74), ry = rx * 0.32;
      body = `<defs>${LG}</defs>` + contact(Math.min(100 + hh + ry + 8, 186), rx * 0.95) + `<path d="M 100 ${N(100 - hh)} L ${N(100 + rx)} ${N(100 + hh)} A ${N(rx)} ${N(ry)} 0 0 1 ${N(100 - rx)} ${N(100 + hh)} Z" fill="url(#q1)"/>`; }
    else if (KINDS[ki] === "tore") { const t = (14 * k + 6) * ep, R = 60 * k * (1.9 - ep) * 0.52 + 30 * k;
      body = `<defs>${LG}</defs>` + contact(100 + R + 14, R) + `<circle cx="100" cy="96" r="${N(R)}" fill="none" stroke="url(#q1)" stroke-width="${N(t)}"/>`; }
    else if (KINDS[ki] === "pyramide") { const s = 46 * k * ep, hh = Math.min(54 * k * el, 72);
      body = contact(100 + hh + 12, s) + `<path d="M 100 ${N(100 - hh)} L ${N(100 - s)} ${N(100 + hh)} L 100 ${N(100 + hh + s * 0.28)} Z" fill="__CL__"/><path d="M 100 ${N(100 - hh)} L ${N(100 + s)} ${N(100 + hh)} L 100 ${N(100 + hh + s * 0.28)} Z" fill="__CDD__"/>`; }
    else if (KINDS[ki] === "pilule") { const w = Math.min(120 * k * el, 184), h2 = 60 * k * ep;
      body = `<defs>${LG}</defs>` + contact(100 + h2 / 2 + 12, w * 0.44) + `<rect x="${N(100 - w / 2)}" y="${N(100 - h2 / 2)}" width="${N(w)}" height="${N(h2)}" rx="${N(h2 / 2)}" fill="url(#q1)"/>` + `<rect x="${N(100 - w / 2 + 8)}" y="${N(100 - h2 / 2 + 5)}" width="${N(w - 16)}" height="${N(h2 * 0.34)}" rx="${N(h2 * 0.17)}" fill="__CW__" opacity="0.32"/>`; }
    else { const sides = 3 + (seed % 10), R = 80 * k * ep; let g = "";
      for (let a = 0; a < sides; a++) { const a1 = -90 + (a * 360) / sides, a2 = -90 + ((a + 1) * 360) / sides;
        const [x1, y1] = polar(100, 100, R, a1), [x2, y2] = polar(100, 100, R, a2);
        const lit = Math.cos((((a1 + a2) / 2 + 130) * Math.PI) / 180);
        g += `<path d="M 100 100 L ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)} Z" fill="${lit > 0.45 ? "__CLL__" : lit > -0.1 ? "__CM__" : "__CDD__"}"/>`; }
      body = g; }
    void r;
    return { w: 200, h: 200, body };
  });

/* ══════ Vagues ══════ */
fam("wave", "deco", "Vagues", "vague onde water motif séparateur ondulation",
  [5, 8, 6, 6, 3],
  ([ri, ai, si, pi, sti]) => {
    const rows = 1 + ri, amp = 6 + ai * 4, sw = 3 + si * 2, period = 34 + pi * 12;
    const W = 260;
    let g = "";
    for (let r0 = 0; r0 < rows; r0++) {
      const y = 30 + amp + r0 * (amp * 2 + 22);
      let d = `M 8 ${N(y)} `;
      for (let k = 0; k * period < W - 16; k++) d += `q ${N(period / 2)} ${N(k % 2 ? amp : -amp)} ${N(period)} 0 `;
      g += sti === 2 ? `<path d="${d} V ${N(y + amp + 24)} H 8 Z" fill="${C}" opacity="${N(0.9 - r0 * 0.18)}"/>` + stroke(d, sw)
        : stroke(d, sw, sti === 1 ? `opacity="${N(1 - r0 * 0.16)}"` : "");
    }
    const H = 30 + amp + (rows - 1) * (amp * 2 + 22) + amp + 34;
    return { w: W, h: N(H), body: `<defs><clipPath id="wc"><rect x="0" y="0" width="${W}" height="${N(H)}"/></clipPath></defs><g clip-path="url(#wc)">${g}</g>` };
  });

/* ══════ Grilles ══════ */
fam("grid", "deco", "Grille", "grille quadrillage damier motif fond",
  [8, 5, 6, 6, 5],
  ([ci, si, ki, coli, rowi]) => {
    const cell = 14 + ci * 5, sw = 1.2 + si * 1.1, cols = 5 + coli, rows = 3 + rowi;
    const W = cols * cell, H = rows * cell;
    const KIND = ["grille", "damier", "croix", "briques", "diagonale", "points"];
    let g = "";
    if (KIND[ki] === "grille") { for (let a = 0; a <= cols; a++) g += stroke(`M ${N(a * cell)} 0 V ${N(H)}`, sw); for (let b = 0; b <= rows; b++) g += stroke(`M 0 ${N(b * cell)} H ${N(W)}`, sw); }
    else if (KIND[ki] === "damier") { for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) if ((a + b) % 2 === 0) g += `<rect x="${N(a * cell + sw / 2)}" y="${N(b * cell + sw / 2)}" width="${N(cell - sw)}" height="${N(cell - sw)}" fill="${C}"/>`; }
    else if (KIND[ki] === "croix") { for (let a = 0; a <= cols; a++) for (let b = 0; b <= rows; b++) g += stroke(`M ${N(a * cell - 4)} ${N(b * cell)} H ${N(a * cell + 4)} M ${N(a * cell)} ${N(b * cell - 4)} V ${N(b * cell + 4)}`, sw); }
    else if (KIND[ki] === "briques") { for (let b = 0; b < rows; b++) for (let a = 0; a < cols; a++) g += `<rect x="${N(a * cell + (b % 2) * (cell / 2))}" y="${N(b * cell)}" width="${N(cell - 2)}" height="${N(cell - 2)}" rx="1.5" fill="none" stroke="${C}" stroke-width="${sw}"/>`; }
    else if (KIND[ki] === "diagonale") { for (let a = -rows; a <= cols; a++) g += stroke(`M ${N(a * cell)} 0 L ${N((a + rows) * cell)} ${N(H)}`, sw); }
    else { for (let a = 0; a <= cols; a++) for (let b = 0; b <= rows; b++) g += `<circle cx="${N(a * cell)}" cy="${N(b * cell)}" r="${N(sw * 1.3)}" fill="${C}"/>`; }
    return { w: N(W + 4), h: N(H + 4), body: `<defs><clipPath id="gc"><rect x="0" y="0" width="${N(W + 4)}" height="${N(H + 4)}"/></clipPath></defs><g clip-path="url(#gc)"><g transform="translate(2 2)">${g}</g></g>` };
  });

/* ══════ Demi-teintes ══════ */
fam("half", "deco", "Demi-teinte", "demi-teinte halftone dégradé points trame",
  [5, 6, 5, 5, 4],
  ([di, ci, gi, ri, si]) => {
    const DIR = ["horizontal", "vertical", "radial", "diagonal", "inverse"];
    const cols = 7 + ci * 2, gap = 16 + gi * 4, maxR = 3 + ri * 2, rows = Math.max(4, Math.round(cols * 0.65));
    let g = "";
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
      const tx = a / (cols - 1), ty = b / (rows - 1);
      let t = DIR[di] === "horizontal" ? tx : DIR[di] === "vertical" ? ty : DIR[di] === "diagonal" ? (tx + ty) / 2
        : DIR[di] === "radial" ? 1 - Math.hypot(tx - 0.5, ty - 0.5) * 1.7 : Math.hypot(tx - 0.5, ty - 0.5) * 1.7;
      t = Math.max(0, Math.min(1, t));
      const rr = Math.max(0.5, maxR * t), cx = 16 + a * gap, cy = 16 + b * gap;
      g += si === 0 ? `<circle cx="${N(cx)}" cy="${N(cy)}" r="${N(rr)}" fill="${C}"/>`
        : si === 1 ? `<rect x="${N(cx - rr)}" y="${N(cy - rr)}" width="${N(rr * 2)}" height="${N(rr * 2)}" fill="${C}"/>`
        : si === 2 ? `<circle cx="${N(cx)}" cy="${N(cy)}" r="${N(rr)}" fill="none" stroke="${C}" stroke-width="${N(Math.max(0.8, rr * 0.4))}"/>`
        : fillp(`M ${N(cx)} ${N(cy - rr)} L ${N(cx + rr)} ${N(cy)} L ${N(cx)} ${N(cy + rr)} L ${N(cx - rr)} ${N(cy)} Z`);
    }
    return { w: N(16 + cols * gap + 16), h: N(16 + rows * gap + 16), body: g };
  });

/* ══════ Confettis ══════ */
fam("conf", "party", "Confettis", "confettis particules fête paillettes éclats",
  [6, 6, 5, 40],
  ([di, ki, si, seed], i) => {
    const density = 10 + di * 8;
    const KIND = ["mixte", "points", "rectangles", "étoiles", "traits", "cercles"];
    const SPREAD = ["plein", "haut", "coin", "explosion", "bande"];
    const r = rng(i * 65537 + seed * 7 + 3);
    let g = "";
    for (let k = 0; k < density; k++) {
      let x = 12 + r() * 216, y = 12 + r() * 176;
      if (SPREAD[si] === "haut") y = 12 + r() * 90;
      if (SPREAD[si] === "coin") { x = 12 + r() * 130; y = 12 + r() * 110; }
      if (SPREAD[si] === "explosion") { const a = r() * 360, rad = r() * 86; [x, y] = polar(120, 100, rad, a); }
      if (SPREAD[si] === "bande") { y = 70 + r() * 60; }
      const t = KIND[ki] === "mixte" ? Math.floor(r() * 4) : KIND[ki] === "points" ? 0 : KIND[ki] === "rectangles" ? 1 : KIND[ki] === "étoiles" ? 3 : KIND[ki] === "traits" ? 2 : 0;
      const o = N(0.55 + r() * 0.45);
      g += t === 0 ? `<circle cx="${N(x)}" cy="${N(y)}" r="${N(3 + r() * 5)}" fill="${C}" opacity="${o}"/>`
        : t === 1 ? `<rect x="${N(x)}" y="${N(y)}" width="${N(6 + r() * 9)}" height="${N(4 + r() * 5)}" rx="1.5" fill="${C}" opacity="${o}" transform="rotate(${N(r() * 90)} ${N(x)} ${N(y)})"/>`
        : t === 2 ? stroke(`M ${N(x)} ${N(y)} l ${N(7 + r() * 11)} ${N(-5 + r() * 10)}`, N(2 + r() * 3), `opacity="${o}"`)
        : fillp(starPts(x, y, 4, N(4 + r() * 6), N(2 + r() * 2)), `opacity="${o}"`);
    }
    return { w: 240, h: 200, body: `<defs><clipPath id="cc"><rect x="0" y="0" width="240" height="200"/></clipPath></defs><g clip-path="url(#cc)">${g}</g>` };
  });

/* ══════ Spirales ══════ */
fam("spiral", "ornaments", "Spirale", "spirale volute ornement courbe enroulement",
  [8, 6, 5, 2, 12],
  ([ti, si, gi, di, seed]) => {
    const turns = 1.2 + ti * 0.5, sw = 2 + si * 2, grow = 6 + gi * 4, dir = di ? 1 : -1;
    const steps = Math.round(turns * 30);
    let d = "";
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, a = dir * t * turns * 360 - 90;
      const rad = Math.min(5 + t * grow * turns * (1 + seed * 0.03), 88);
      const [x, y] = polar(100, 100, rad, a);
      d += (k === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
    }
    return { w: 200, h: 200, body: stroke(d, sw) };
  });

/* ══════ Explosions comic ══════ */
fam("burst", "stars", "Explosion", "explosion éclat comic bd étoile pointes",
  [8, 6, 4, 30],
  ([si, ji, sti, seed], i) => {
    const spikes = 7 + si * 2, jag = 0.42 + ji * 0.08;
    const r = rng(i * 40503 + seed * 11 + 7);
    let d = "";
    for (let k = 0; k < spikes * 2; k++) {
      const a = (k * 180) / spikes - 90;
      const rad = (k % 2 === 0 ? 88 : 88 * jag) * (0.88 + r() * 0.22);
      const [x, y] = polar(100, 100, rad, a);
      d += (k === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
    }
    d += "Z";
    const body = sti === 0 ? fillp(d) : sti === 1 ? stroke(d, 5)
      : sti === 2 ? fillp(d) + `<circle cx="100" cy="100" r="${N(88 * jag * 0.62)}" fill="${c1()}"/>`
      : eo(`${d}${holeC(100, 100, 88 * jag * 0.6)}`);
    return { w: 200, h: 200, body };
  }, TWO);

/* ══════ Gouttes ══════ */
fam("drop", "nature", "Goutte", "goutte eau liquide larme bulle",
  [6, 6, 4, 20],
  ([si, ri, sti, seed]) => {
    const stretch = 0.7 + si * 0.14, round = 0.55 + ri * 0.1;
    const r = rng(seed * 977 + 5);
    const H = 96 + si * 15, Rw = Math.min(54 * round * (0.9 + r() * 0.2), 92);
    const d = `M 100 ${N(186 - H)} C ${N(100 + Rw)} ${N(186 - H * 0.42)} ${N(100 + Rw * 1.05)} 186 100 186 C ${N(100 - Rw * 1.05)} 186 ${N(100 - Rw)} ${N(186 - H * 0.42)} 100 ${N(186 - H)} Z`;
    const body = sti === 0 ? fillp(d) : sti === 1 ? stroke(d, 5)
      : sti === 2 ? fillp(d) + `<ellipse cx="${N(100 - Rw * 0.34)}" cy="${N(186 - H * 0.42)}" rx="${N(Rw * 0.15)}" ry="${N(H * 0.13)}" fill="${c1()}" transform="rotate(-20 ${N(100 - Rw * 0.34)} ${N(186 - H * 0.42)})"/>`
      : eo(`${d}${holeC(100, 186 - H * 0.34, Rw * 0.3)}`);
    return { w: 200, h: 200, body };
  }, TWO);

/* ══════ Flocons ══════ */
fam("snow", "weather", "Flocon", "météo flocon neige hiver cristal givre",
  [5, 5, 5, 4, 4],
  ([ai, bi, si, li, ti]) => {
    const arms = [6, 8, 12, 5, 10][ai], branches = bi, sw = 2 + si * 1.6;
    const len = Math.min(62 + li * 8, 92 - sw * 2.6);
    const TIP = ["aucun", "point", "barre", "étoile"];
    let g = "";
    for (let k = 0; k < arms; k++) {
      const a = (k * 360) / arms;
      const [x2, y2] = polar(100, 100, len, a);
      g += stroke(`M 100 100 L ${N(x2)} ${N(y2)}`, sw);
      for (let bn = 1; bn <= branches; bn++) {
        const br = (len * bn) / (branches + 1);
        const [bx, by] = polar(100, 100, br, a);
        const [t1x, t1y] = polar(bx, by, len * 0.2, a - 42), [t2x, t2y] = polar(bx, by, len * 0.2, a + 42);
        g += stroke(`M ${N(t1x)} ${N(t1y)} L ${N(bx)} ${N(by)} L ${N(t2x)} ${N(t2y)}`, Math.max(1.5, sw - 0.8));
      }
      if (TIP[ti] === "point") g += `<circle cx="${N(x2)}" cy="${N(y2)}" r="${N(sw)}" fill="${C}"/>`;
      if (TIP[ti] === "barre") { const [p1x, p1y] = polar(x2, y2, sw * 2, a - 90), [p2x, p2y] = polar(x2, y2, sw * 2, a + 90); g += stroke(`M ${N(p1x)} ${N(p1y)} L ${N(p2x)} ${N(p2y)}`, sw); }
      if (TIP[ti] === "étoile") g += fillp(starPts(x2, y2, 4, sw * 2.4, sw));
    }
    return { w: 200, h: 200, body: g };
  });

/* ══════ Soleils / astres ══════ */
fam("sun", "weather", "Soleil", "météo soleil astre rayons lumière",
  [8, 5, 5, 4, 2],
  ([ri, li, ci, sti, ringi]) => {
    const rays = 6 + ri * 2, core = 24 + ci * 8;
    // la goutte en bout de rayon ajoute son propre rayon (~22 % de rlen)
    const rlen = Math.min(14 + li * 7, (92 - core - 7) / 1.25);
    const STY = ["trait", "triangle", "goutte", "aucun"];
    let g = "";
    if (STY[sti] !== "aucun")
      for (let k = 0; k < rays; k++) {
        const a = (k * 360) / rays;
        const [x1, y1] = polar(100, 100, core + 7, a), [x2, y2] = polar(100, 100, core + 7 + rlen, a);
        g += STY[sti] === "trait" ? stroke(`M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`, 6)
          : STY[sti] === "triangle" ? fillp(`M ${N(polar(100, 100, core + 7, a - 5)[0])} ${N(polar(100, 100, core + 7, a - 5)[1])} L ${N(x2)} ${N(y2)} L ${N(polar(100, 100, core + 7, a + 5)[0])} ${N(polar(100, 100, core + 7, a + 5)[1])} Z`)
          : `<circle cx="${N(x2)}" cy="${N(y2)}" r="${N(Math.max(3, rlen * 0.22))}" fill="${C}"/>`;
      }
    g += ringi ? `<circle cx="100" cy="100" r="${N(core)}" fill="none" stroke="${C}" stroke-width="7"/>` : `<circle cx="100" cy="100" r="${N(core)}" fill="${C}"/>`;
    return { w: 200, h: 200, body: g };
  });

/* ══════ Étiquettes ══════ */
fam("tag", "badges", "Étiquette", "étiquette badge prix promo label",
  [6, 5, 5, 5, 3],
  ([shi, wi, hi, sti, seed]) => {
    const SHAPE = ["languette", "pilule", "éclat", "bouclier", "cercle", "rectangle"];
    const cx = 120, cy = 74;
    let w = 100 + wi * 26, hh = (50 + hi * 16) * [0.84, 1, 1.16][seed];
    // l'éclat est circulaire : son rayon doit tenir dans la demi-hauteur
    if (shi === 2) { const rmax = 68; w = Math.min(w, rmax * 2); hh = Math.min(hh, rmax * 2); }
    let d = "";
    if (SHAPE[shi] === "languette") d = `M ${N(cx - w / 2)} ${N(cy - hh / 2)} H ${N(cx + w / 2 - 20)} L ${N(cx + w / 2)} ${N(cy)} L ${N(cx + w / 2 - 20)} ${N(cy + hh / 2)} H ${N(cx - w / 2)} Z`;
    else if (SHAPE[shi] === "pilule") d = `M ${N(cx - w / 2 + hh / 2)} ${N(cy - hh / 2)} H ${N(cx + w / 2 - hh / 2)} A ${N(hh / 2)} ${N(hh / 2)} 0 0 1 ${N(cx + w / 2 - hh / 2)} ${N(cy + hh / 2)} H ${N(cx - w / 2 + hh / 2)} A ${N(hh / 2)} ${N(hh / 2)} 0 0 1 ${N(cx - w / 2 + hh / 2)} ${N(cy - hh / 2)} Z`;
    else if (SHAPE[shi] === "éclat") d = starPts(cx, cy, 12, Math.max(w, hh) / 2, Math.max(w, hh) / 2 - 11);
    else if (SHAPE[shi] === "bouclier") d = `M ${N(cx - w / 2)} ${N(cy - hh / 2)} H ${N(cx + w / 2)} V ${N(cy)} C ${N(cx + w / 2)} ${N(cy + hh / 2)} ${N(cx)} ${N(cy + hh / 2 + 8)} ${N(cx)} ${N(cy + hh / 2 + 8)} C ${N(cx)} ${N(cy + hh / 2 + 8)} ${N(cx - w / 2)} ${N(cy + hh / 2)} ${N(cx - w / 2)} ${N(cy)} Z`;
    else if (SHAPE[shi] === "cercle") { const rx = Math.min(w, 150) / 2; d = `M ${N(cx - rx)} ${N(cy)} a ${N(rx)} ${N(hh / 2)} 0 1 0 ${N(rx * 2)} 0 a ${N(rx)} ${N(hh / 2)} 0 1 0 ${N(-rx * 2)} 0 Z`; }
    else d = `M ${N(cx - w / 2)} ${N(cy - hh / 2)} H ${N(cx + w / 2)} V ${N(cy + hh / 2)} H ${N(cx - w / 2)} Z`;
    const body = sti === 0 ? fillp(d) : sti === 1 ? stroke(d, 6)
      : sti === 2 ? fillp(d) + `<rect x="${N(cx - w / 2)}" y="${N(cy - 7)}" width="${N(w)}" height="14" fill="${c1()}"/>`
      : sti === 3 ? eo(`${d}${holeC(cx - w / 2 + 16, cy, 7)}`)
      : fillp(d) + `<circle cx="${N(cx - w / 2 + 18)}" cy="${N(cy)}" r="7" fill="${c1()}"/>`;
    return { w: 240, h: 160, body };
  }, TWO);

/* ══════ Anneaux & arcs ══════ */
fam("arc", "circles", "Anneau", "cercle anneau arc rond contour portion",
  [6, 6, 8, 2, 3],
  ([si, di, ai, capi, ri]) => {
    const sw = 2 + si * 4;
    const DASH = ["", "2 16", "12 10", "34 12", "1 10", "22 8", "6 6", "48 18"];
    const ARCS = [360, 330, 300, 270, 240, 180, 120, 90];
    const R = 86 - sw / 2 - ri * 6;
    const cap = capi ? "round" : "butt";
    if (ARCS[ai] === 360)
      return { w: 200, h: 200, body: `<circle cx="100" cy="100" r="${N(R)}" fill="none" stroke="${C}" stroke-width="${sw}"${DASH[di] ? ` stroke-dasharray="${DASH[di]}" stroke-linecap="${cap}"` : ""}/>` };
    const a0 = -90, a1 = -90 + ARCS[ai];
    const [x0, y0] = polar(100, 100, R, a0), [x1, y1] = polar(100, 100, R, a1);
    return { w: 200, h: 200, body: `<path d="M ${N(x0)} ${N(y0)} A ${N(R)} ${N(R)} 0 ${ARCS[ai] > 180 ? 1 : 0} 1 ${N(x1)} ${N(y1)}" fill="none" stroke="${C}" stroke-width="${sw}" stroke-linecap="${cap}"${DASH[di] ? ` stroke-dasharray="${DASH[di]}"` : ""}/>` };
  });

/* ══════ Polygones ══════ */
fam("poly", "geo", "Polygone", "forme géométrique polygone côtés régulier",
  [16, 4, 6, 4],
  ([si, roti, sti, ri]) => {
    const sides = 3 + si, R = 86 - ri * 7, rot = -90 + roti * (90 / 4 / (sides / 3));
    const d = polyPts(100, 100, sides, R, rot);
    const body = sti === 0 ? fillp(d) : sti === 1 ? stroke(d, 6 + ri * 2)
      : sti === 2 ? eo(`${d} ${polyPts(100, 100, sides, R * 0.62, rot)}`)
      : sti === 3 ? fillWith(d) + fillWith(polyPts(100, 100, sides, R * 0.55, rot + 180 / sides), c1())
      : sti === 4 ? fillWith(d) + strokeWith(polyPts(100, 100, sides, R * 0.7, rot), 4, c1())
      : stroke(d, 5) + stroke(polyPts(100, 100, sides, R * 0.62, rot), 3);
    return { w: 200, h: 200, body };
  }, TWO);

/* ══════ Rubans ══════ */
fam("ribbon", "badges", "Ruban", "ruban banderole bannière étiquette",
  [6, 6, 5, 5, 3],
  ([wi, hi, ei, di, fi]) => {
    const hh = 20 + hi * 6, cx = 130, cy = 74;
    const w = 108 + wi * 18;                // + embouts de 24 px : reste dans 260
    const END = ["pointe", "plat", "fourche", "arrondi", "aucun"];
    const DECO = ["aucun", "ligne", "bande", "points", "bord"];
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const end = (side: 1 | -1) => {
      const ex = side === 1 ? x1 : x0, dx = side * 24;
      if (END[ei] === "aucun") return "";
      return END[ei] === "pointe" ? fillp(`M ${N(ex)} ${N(cy - hh)} L ${N(ex + dx)} ${N(cy)} L ${N(ex)} ${N(cy + hh)} Z`, `opacity="0.72"`)
        : END[ei] === "plat" ? fillp(`M ${N(ex)} ${N(cy - hh)} L ${N(ex + dx)} ${N(cy - hh)} L ${N(ex + dx)} ${N(cy + hh)} L ${N(ex)} ${N(cy + hh)} Z`, `opacity="0.72"`)
        : END[ei] === "fourche" ? fillp(`M ${N(ex)} ${N(cy - hh)} L ${N(ex + dx)} ${N(cy - hh)} L ${N(ex + dx * 0.5)} ${N(cy)} L ${N(ex + dx)} ${N(cy + hh)} L ${N(ex)} ${N(cy + hh)} Z`, `opacity="0.72"`)
        : `<path d="M ${N(ex)} ${N(cy - hh)} A ${N(Math.abs(dx))} ${N(hh)} 0 0 ${side === 1 ? 1 : 0} ${N(ex)} ${N(cy + hh)} Z" fill="${C}" opacity="0.72"/>`;
    };
    const deco = DECO[di] === "ligne" ? `<rect x="${N(x0 + 8)}" y="${N(cy - 3)}" width="${N(w - 16)}" height="6" fill="${c1()}"/>`
      : DECO[di] === "bande" ? `<rect x="${N(x0)}" y="${N(cy - hh * 0.45)}" width="${N(w)}" height="${N(hh * 0.9)}" fill="${c1()}"/>`
      : DECO[di] === "points" ? Array.from({ length: 5 }, (_, k) => `<circle cx="${N(x0 + 16 + k * ((w - 32) / 4))}" cy="${N(cy)}" r="4.5" fill="${c1()}"/>`).join("")
      : DECO[di] === "bord" ? `<rect x="${N(x0)}" y="${N(cy - hh)}" width="${N(w)}" height="4" fill="${c1()}"/><rect x="${N(x0)}" y="${N(cy + hh - 4)}" width="${N(w)}" height="4" fill="${c1()}"/>` : "";
    const fold = fi === 1 ? fillp(`M ${N(x0)} ${N(cy + hh)} L ${N(x0 - 12)} ${N(cy + hh + 14)} L ${N(x0)} ${N(cy + hh + 14)} Z`, `opacity="0.5"`)
      : fi === 2 ? fillp(`M ${N(x1)} ${N(cy + hh)} L ${N(x1 + 12)} ${N(cy + hh + 14)} L ${N(x1)} ${N(cy + hh + 14)} Z`, `opacity="0.5"`) : "";
    return { w: 260, h: 160, body: end(1) + end(-1) + `<rect x="${N(x0)}" y="${N(cy - hh)}" width="${N(w)}" height="${N(hh * 2)}" rx="3" fill="${C}"/>` + deco + fold };
  }, TWO);

/* ══════ Traits & séparateurs ══════ */
fam("line", "strokes", "Trait", "trait ligne séparateur souligné divider",
  [7, 6, 6, 5],
  ([ti, ai, si, gi]) => {
    const TYPE = ["vague", "zigzag", "ligne", "tirets", "double", "perles", "pointillé"];
    const amp = 4 + ai * 5, sw = 2 + si * 2, seg = 3 + gi;
    const W = 260, y = 60;
    let d = `M 12 ${y} `;
    const step = (W - 24) / seg;
    if (TYPE[ti] === "vague") for (let k = 0; k < seg; k++) d += `q ${N(step / 2)} ${N(k % 2 ? amp : -amp)} ${N(step)} 0 `;
    else if (TYPE[ti] === "zigzag") for (let k = 1; k <= seg; k++) d += `L ${N(12 + k * step)} ${N(k % 2 ? y - amp : y + amp)} `;
    else d = `M 12 ${y} H ${W - 12}`;
    // Sur les types rectilignes, « amplitude » et « segments » ne touchaient pas
    // au dessin : les mêmes traits revenaient trente fois. L'amplitude devient
    // la taille des embouts, les segments la cadence des tirets et des points.
    const cap = (h: number) => stroke(`M 12 ${N(y - h)} V ${N(y + h)} M ${W - 12} ${N(y - h)} V ${N(y + h)}`, Math.max(2, sw * 0.8));
    const dash = (on: number) => { const p = (W - 24) / seg; return `stroke-dasharray="${N(p * on)} ${N(p * (1 - on))}"`; };
    const body = TYPE[ti] === "tirets" ? stroke(d, sw, dash(0.6)) + cap(amp * 0.5)
      : TYPE[ti] === "pointillé" ? stroke(d, sw, `stroke-dasharray="0.1 ${N((W - 24) / (seg * 4))}"`) + cap(amp * 0.4)
      : TYPE[ti] === "double" ? stroke(`M 12 ${N(y - amp / 2)} H ${W - 12}`, sw) + stroke(`M 12 ${N(y + amp / 2)} H ${W - 12}`, sw, dash(0.7))
      : TYPE[ti] === "perles" ? stroke(d, Math.max(1.5, sw / 2)) + Array.from({ length: seg + 1 }, (_, k) => `<circle cx="${N(12 + k * step)}" cy="${y}" r="${N(Math.min(sw * (0.6 + amp / 60), 11))}" fill="${C}"/>`).join("")
      : TYPE[ti] === "ligne" ? stroke(d, sw) + cap(amp * 0.6)
      : stroke(d, sw);
    return { w: W, h: N(y + amp + 40), body };
  });

/* ══════════════════════════════════════════════════════════════════════════
   SUJETS DU QUOTIDIEN — sport, nourriture, animaux, tech, objets, maison.

   Ces catégories ne comptaient que quelques dizaines de dessins fixes face aux
   dizaines de milliers des familles décoratives : on tombait au bout du rayon
   en trois défilements. Chaque SUJET (dessiné à la main, reconnaissable) est
   donc devenu sa propre famille et se décline en relief, détail et taille.

   Un sujet = une famille, pour deux raisons : le libellé et les mots-clés
   restent justes (chercher « tennis » tombe sur la balle de tennis, pas sur un
   générique « Ballon »), et le panneau alternant les familles, une page mêle
   les sujets au lieu d'aligner soixante fois le même.
   ══════════════════════════════════════════════════════════════════════════ */

/** Jeton de nuance : shd("LL") = éclairci de l'emplacement 0, shd("D", 1) = ombré du 1. */
const shd = (code: string, slot = 0) => (slot ? `__C${slot}~${code}__` : `__C${code}__`);
const S1 = shd("", 1);

/* Silhouettes de base, en DONNÉES DE CHEMIN : utilisables aussi bien pour
   peindre que pour découper (clipPath n'accepte pas <circle> mêlé à un <path>
   dans une même forme composée). */
const circD = (cx: number, cy: number, r: number) =>
  `M ${N(cx - r)} ${N(cy)} a ${N(r)} ${N(r)} 0 1 0 ${N(2 * r)} 0 a ${N(r)} ${N(r)} 0 1 0 ${N(-2 * r)} 0 Z`;
const ellD = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${N(cx - rx)} ${N(cy)} a ${N(rx)} ${N(ry)} 0 1 0 ${N(2 * rx)} 0 a ${N(rx)} ${N(ry)} 0 1 0 ${N(-2 * rx)} 0 Z`;
/** Trou : même cercle enroulé À L'ENVERS. Avec le remplissage non-zero, il
    évide la forme sans dépendre de fill-rule — donc sans risque de découper
    par accident les sous-tracés qui se chevauchent (crinière, pattes…). */
const holeR = (cx: number, cy: number, r: number) =>
  ` M ${N(cx - r)} ${N(cy)} a ${N(r)} ${N(r)} 0 1 1 ${N(2 * r)} 0 a ${N(r)} ${N(r)} 0 1 1 ${N(-2 * r)} 0 Z`;
const rectD = (x: number, y: number, w: number, h: number, r = 0) => {
  const q = Math.min(r, w / 2, h / 2);
  return q <= 0
    ? `M ${N(x)} ${N(y)} H ${N(x + w)} V ${N(y + h)} H ${N(x)} Z`
    : `M ${N(x + q)} ${N(y)} H ${N(x + w - q)} A ${N(q)} ${N(q)} 0 0 1 ${N(x + w)} ${N(y + q)} V ${N(y + h - q)} A ${N(q)} ${N(q)} 0 0 1 ${N(x + w - q)} ${N(y + h)} H ${N(x + q)} A ${N(q)} ${N(q)} 0 0 1 ${N(x)} ${N(y + h - q)} V ${N(y + q)} A ${N(q)} ${N(q)} 0 0 1 ${N(x + q)} ${N(y)} Z`;
};

/* Détails. `…1` peint dans l'emplacement secondaire (couleur réglable à part),
   `…0` dans le principal — pour les traits qui appartiennent au corps même. */
const box1 = (x: number, y: number, w: number, h: number, r = 0, code = "") =>
  `<rect x="${N(x)}" y="${N(y)}" width="${N(w)}" height="${N(h)}" rx="${N(r)}" fill="${shd(code, 1)}"/>`;
const dot1 = (cx: number, cy: number, r: number, code = "") =>
  `<circle cx="${N(cx)}" cy="${N(cy)}" r="${N(r)}" fill="${shd(code, 1)}"/>`;
const ln1 = (d: string, sw: number, code = "") =>
  `<path d="${d}" fill="none" stroke="${shd(code, 1)}" stroke-width="${N(sw)}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ln0 = (d: string, sw: number, code = "") =>
  `<path d="${d}" fill="none" stroke="${shd(code)}" stroke-width="${N(sw)}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fil1 = (d: string, code = "") => `<path d="${d}" fill="${shd(code, 1)}"/>`;

/**
 * Volume appliqué à une silhouette : lumière et ombre sont DÉCOUPÉES par la
 * forme elle-même (clip-path) — rien ne peut donc déborder de la boîte — et
 * leurs teintes dérivent de la couleur choisie, si bien que le relief se
 * recolore avec elle. Le clip reste défini même à plat : les familles s'en
 * resservent pour y enfermer leurs détails (coutures, alvéoles, quartiers…).
 */
function volume(d: string, lv: number, cid: string): string {
  const clip = `<clipPath id="${cid}"><path d="${d}"/></clipPath>`;
  const base = `<path d="${d}" fill="${C}"/>`;
  if (lv <= 0) return `<defs>${clip}</defs>${base}`;
  // Dégradés plutôt qu'ellipses posées : une tache d'ombre à position fixe se
  // voit comme une salissure sur une silhouette qui n'est pas ronde, alors
  // qu'un dégradé doux se lit comme de la lumière sur n'importe quelle forme.
  const shade = `<linearGradient id="vs" x1="0.1" y1="0" x2="0.75" y2="1"><stop offset="0.3" stop-color="__CDD__" stop-opacity="0"/><stop offset="1" stop-color="__CDD__" stop-opacity="${lv >= 3 ? "0.44" : "0.3"}"/></linearGradient>`;
  const light = `<radialGradient id="vl" cx="32%" cy="26%" r="72%"><stop offset="0" stop-color="__CLL__" stop-opacity="0.5"/><stop offset="0.55" stop-color="__CLL__" stop-opacity="0"/></radialGradient>`;
  let g = `<rect x="0" y="0" width="200" height="200" fill="url(#vs)"/>`;
  if (lv >= 2) g += `<rect x="0" y="0" width="200" height="200" fill="url(#vl)"/>`;
  if (lv >= 3) g += `<ellipse cx="66" cy="54" rx="17" ry="10" fill="__CW__" opacity="0.42" transform="rotate(-28 66 54)"/>`;
  return `<defs>${clip}${shade}${lv >= 2 ? light : ""}</defs>${base}<g clip-path="url(#${cid})">${g}</g>`;
}

/**
 * Un sujet : identifiant stable, libellé, mots-clés, silhouette, détails.
 * `shape` ne renvoie QUE des sous-tracés fermés (elle est peinte et sert de
 * découpe) ; tout ce qui est trait — antenne, patte, ficelle — passe par
 * `detail`, sinon un sous-tracé ouvert d'aire nulle resterait invisible.
 */
type Subject = [
  slug: string,
  label: string,
  kw: string,
  shape: (v: number) => string,
  detail?: (v: number) => string,
  /** Couleur de départ de l'emplacement secondaire. Sans elle, les deux
      emplacements partiraient de la même teinte et les détails seraient
      invisibles tant que l'utilisateur n'a rien changé. */
  second?: string,
];

const SECOND = "#f1eefe";                 // blanc lavande : lisible sur toute teinte
const DARK = "#2b2440", LEAF = "#4ade80", FLAME = "#fbbf24";

/**
 * Enregistre une famille par sujet. Axes communs : relief (4) × détail (5) ×
 * taille (3), soit 60 déclinaisons. L'identifiant `cat.pfx-slug~i` ne dépend
 * que du slug : ajouter un sujet plus tard ne déplace aucun dessin existant.
 */
/**
 * Liseré INTÉRIEUR, en nuance sombre de la couleur principale. Tracé au double
 * de son épaisseur puis découpé par la silhouette : la moitié extérieure est
 * retirée, donc rien ne sort de la boîte quelle que soit la forme.
 */
function rim(d: string, vi: number): string {
  if (vi === 0) return "";
  const line = (w: number, paint: string, dash = "") =>
    `<path d="${d}" fill="none" stroke="${paint}" stroke-width="${N(w * 2)}"${dash} stroke-linejoin="round"/>`;
  const inner = vi === 1 ? line(3, "__CDD__")
    : vi === 2 ? line(7, "__CDD__")
    // bande claire d'abord, arête sombre par-dessus : l'ordre fait le biseau
    : vi === 3 ? line(9, "__CLL__") + line(3, "__CDD__")
    : line(4, "__CDD__", ` stroke-dasharray="14 12"`);
  return `<g clip-path="url(#sj)">${inner}</g>`;
}

function subjects(cat: string, pfx: string, kwBase: string, list: Subject[]) {
  for (const [slug, label, kw, shape, detail, second] of list) {
    const slots = [{ label: "Couleur principale" }, { label: "Couleur secondaire", def: second ?? SECOND }];
    // Un sujet dont ni la silhouette ni les détails ne dépendent de l'axe
    // « détail » rendrait cinq fois le même dessin. On le repère ici, une fois,
    // et on lui donne à la place une variation de bord — un vrai second axe,
    // toujours enfermé dans la forme.
    const t0 = shape(0) + (detail ? detail(0) : "");
    let vivant = false;
    for (let v = 1; v < 5 && !vivant; v++) vivant = shape(v) + (detail ? detail(v) : "") !== t0;
    fam(`${pfx}-${slug}`, cat, label, `${kw} ${kwBase}`, [4, 5, 3],
      ([lv, vi, si]) => {
        const k = 0.82 + si * 0.09;
        const d = shape(vi);
        const g = volume(d, lv, "sj") + (vivant ? "" : rim(d, vi)) + (detail ? detail(vi) : "");
        return {
          w: 200, h: 200,
          body: si === 2 ? g : `<g transform="translate(${N(100 - 100 * k)} ${N(100 - 100 * k)}) scale(${N(k)})">${g}</g>`,
        };
      }, slots);
  }
}

/* ── Sport · ballons ── */
{
  const spokes = (r0: number, r1: number, n: number, rot: number) =>
    Array.from({ length: n }, (_, k) => {
      const [x1, y1] = polar(100, 100, r0, rot + (k * 360) / n);
      const [x2, y2] = polar(100, 100, r1, rot + (k * 360) / n);
      return `M ${N(x1)} ${N(y1)} L ${N(x2)} ${N(y2)}`;
    }).join(" ");
  const inBall = (m: string) => `<g clip-path="url(#sj)">${m}</g>`;

  subjects("sport", "ball", "sport ballon balle jeu match", [
    ["foot", "Ballon de football", "football foot soccer ballon but",
      () => circD(100, 100, 88),
      (v) => inBall(fil1(polyPts(100, 100, 5, 24 + v * 3))
        + ln1(spokes(24 + v * 3, 100, 5, -90), 4 + v)
        + ln1(spokes(56 + v * 3, 100, 5, -54), 3 + v)), DARK],
    ["basket", "Ballon de basket", "basket basketball panier dribble",
      () => circD(100, 100, 88),
      (v) => inBall(ln1("M 4 100 H 196 M 100 4 V 196", 4 + v)
        + ln1(`M ${N(38 - v * 2)} 28 C ${N(78 + v * 3)} 72 ${N(78 + v * 3)} 128 ${N(38 - v * 2)} 172 M ${N(162 + v * 2)} 28 C ${N(122 - v * 3)} 72 ${N(122 - v * 3)} 128 ${N(162 + v * 2)} 172`, 4 + v)), DARK],
    ["tennis", "Balle de tennis", "tennis balle raquette court service",
      () => circD(100, 100, 86),
      (v) => inBall(ln1(`M ${N(32 - v)} 20 C ${N(76 + v * 4)} 64 ${N(76 + v * 4)} 136 ${N(32 - v)} 180 M ${N(168 + v)} 20 C ${N(124 - v * 4)} 64 ${N(124 - v * 4)} 136 ${N(168 + v)} 180`, 5 + v))],
    ["baseball", "Balle de baseball", "baseball balle batte coutures",
      () => circD(100, 100, 86),
      (v) => inBall(ln1("M 42 24 C 78 66 78 134 42 176 M 158 24 C 122 66 122 134 158 176", 3)
        + ln1(Array.from({ length: 6 + v }, (_, k) => { const y = 42 + (k * 116) / (5 + v); return `M 48 ${N(y)} l 13 -6 M 48 ${N(y + 7)} l 13 6 M 152 ${N(y)} l -13 -6 M 152 ${N(y + 7)} l -13 6`; }).join(" "), 2.5)), "#e05252"],
    ["volley", "Ballon de volley", "volley volleyball plage filet smash",
      () => circD(100, 100, 88),
      (v) => inBall(ln1("M 100 6 C 58 56 54 136 84 194 M 100 6 C 142 56 146 136 116 194 M 8 74 C 62 94 138 94 192 74 M 14 130 C 66 150 134 150 186 130", 4 + v))],
    ["rugby", "Ballon de rugby", "rugby ovalie ovale essai melee",
      (v) => ellD(100, 100, 92, 50 + v * 4),
      (v) => inBall(ln1("M 38 100 H 162", 4 + v)
        + ln1(Array.from({ length: 5 }, (_, k) => `M ${N(56 + k * 22)} ${N(88 - v)} V ${N(112 + v)}`).join(" "), 4 + v))],
    ["golf", "Balle de golf", "golf balle green trou alveoles",
      () => circD(100, 100, 84),
      (v) => inBall(Array.from({ length: 100 }, (_, k) => {
        const col = k % 10, row = Math.floor(k / 10);
        return dot1(14 + col * 20 + (row % 2) * 10, 14 + row * 20, 4 + v * 0.8, "D");
      }).join(""))],
    ["billard", "Boule de billard", "billard boule snooker queue numero",
      () => circD(100, 100, 88),
      (v) => inBall(dot1(100, 100, 32 + v * 4) + `<circle cx="100" cy="100" r="${N(32 + v * 4)}" fill="none" stroke="${shd("DD", 1)}" stroke-width="2.5" opacity="0.55"/>`)],
    ["bowling", "Boule de bowling", "bowling boule quilles piste strike",
      () => circD(100, 100, 88),
      (v) => inBall(dot1(76 - v * 2, 70, 10 + v, "DD") + dot1(122 + v * 2, 70, 10 + v, "DD") + dot1(100, 112 + v * 2, 10 + v, "DD")), DARK],
    ["pingpong", "Balle de ping-pong", "ping pong tennis table raquette",
      () => circD(100, 100, 72),
      (v) => inBall(ln1(`M 30 ${N(94 - v * 3)} C 68 ${N(112 + v * 2)} 132 ${N(112 + v * 2)} 170 ${N(94 - v * 3)}`, 2.5 + v * 0.6))],
    ["hand", "Ballon de handball", "handball ballon but sept",
      () => circD(100, 100, 86),
      (v) => inBall(ln1("M 100 6 V 194 M 8 64 H 192 M 8 136 H 192", 3 + v)
        + ln1("M 48 18 C 68 72 68 128 48 182 M 152 18 C 132 72 132 128 152 182", 3 + v)), DARK],
    ["plage", "Ballon de plage", "plage ballon gonflable ete piscine",
      () => circD(100, 100, 88),
      (v) => inBall(Array.from({ length: 6 }, (_, k) => {
        if (k % 2) return "";
        const [x1, y1] = polar(100, 100, 96, -90 + k * 60), [x2, y2] = polar(100, 100, 96, -90 + (k + 1) * 60);
        return `<path d="M 100 100 L ${N(x1)} ${N(y1)} A 96 96 0 0 1 ${N(x2)} ${N(y2)} Z" fill="${S1}" opacity="${N(0.45 + v * 0.13)}"/>`;
      }).join(""))],
  ]);
}

/* ── Sport · équipement ── */
subjects("sport", "gear", "sport équipement matériel entraînement", [
  ["raquette", "Raquette", "raquette tennis badminton cordage",
    (v) => `${ellD(100, 74, 46 + v * 2, 54 + v * 2)} ${rectD(90, 118, 20, 68, 6)}`,
    (v) => `<g clip-path="url(#sj)">${ln1(
      Array.from({ length: 5 + v }, (_, k) => `M ${N(60 + (k * 80) / (4 + v))} 18 V 126`).join(" ") + " "
      + Array.from({ length: 5 + v }, (_, k) => `M 48 ${N(30 + (k * 84) / (4 + v))} H 152`).join(" "), 2.5)}</g>`],
  ["haltere", "Haltère", "haltere musculation poids gym force",
    (v) => `${rectD(56, 88, 88, 24, 6)} ${rectD(24, 62 - v * 3, 32, 76 + v * 6, 10)} ${rectD(144, 62 - v * 3, 32, 76 + v * 6, 10)}`,
    (v) => box1(10, 76 - v * 2, 16, 48 + v * 4, 7) + box1(174, 76 - v * 2, 16, 48 + v * 4, 7)],
  ["chaussure", "Chaussure de sport", "chaussure basket running course semelle",
    () => `M 24 150 C 24 112 40 92 62 82 L 88 70 C 98 66 104 70 108 78 L 118 98 C 126 112 146 118 166 122 C 180 125 186 132 186 142 V 152 H 24 Z`,
    (v) => box1(18, 150, 172, 18, 9) + ln1(Array.from({ length: 3 + v }, (_, k) => `M ${N(68 + k * 14)} ${N(94 - k * 4)} l 22 12`).join(" "), 4)],
  ["sifflet", "Sifflet", "sifflet arbitre coup match",
    (v) => `${rectD(46, 76, 92, 56, 26)} M 128 92 H 176 C 182 92 184 96 184 100 C 184 106 180 108 174 108 L 128 116 Z`,
    (v) => dot1(74, 104, 12 + v * 2) + ln0("M 46 96 H 22", 9)],
  ["chrono", "Chronomètre", "chronometre temps course depart minuteur",
    () => `${circD(100, 116, 66)} ${rectD(88, 30, 24, 24, 5)}`,
    (v) => `<circle cx="100" cy="116" r="${N(50 - v * 2)}" fill="none" stroke="${S1}" stroke-width="5"/>` + ln1("M 100 116 V 82 M 100 116 L 126 132", 6) + dot1(100, 116, 5)],
  ["casque", "Casque de vélo", "casque velo cycliste protection",
    () => `M 20 122 C 20 66 56 36 100 36 C 144 36 180 66 180 122 V 132 H 150 C 150 96 130 76 100 76 C 70 76 50 96 50 132 H 20 Z`,
    (v) => ln1(Array.from({ length: 2 + v }, (_, k) => `M ${N(72 + k * 24)} 44 C ${N(66 + k * 24)} 74 ${N(64 + k * 24)} 104 ${N(64 + k * 24)} 128`).join(" "), 5)],
  ["gourde", "Gourde", "gourde bouteille eau hydratation",
    () => `${rectD(62, 52, 76, 132, 22)} ${rectD(80, 22, 40, 34, 8)}`,
    (v) => box1(74, 92 + v * 6, 52, 14, 7) + box1(76, 28, 48, 12, 6)],
  ["cone", "Cône d'entraînement", "cone plot entrainement parcours",
    (v) => `M 100 26 L ${N(140 + v * 4)} 154 H ${N(60 - v * 4)} Z ${rectD(28, 154, 144, 20, 9)}`,
    (v) => ln1(`M ${N(84 - v)} 88 H ${N(116 + v)}`, 8)],
  ["panier", "Panier de basket", "panier basket arceau filet anneau",
    () => `${rectD(140, 24, 40, 88, 6)} ${rectD(34, 62, 110, 12, 6)}`,
    (v) => ln1(Array.from({ length: 5 }, (_, k) => `M ${N(38 + k * 24)} 74 L ${N(62 + k * 14)} ${N(136 + v * 6)}`).join(" ")
      + " " + Array.from({ length: 2 + v }, (_, k) => `M ${N(44 - k)} ${N(94 + k * 20)} H ${N(140 + k)}`).join(" "), 4)],
  ["fanion", "Fanion", "fanion drapeau corner equipe supporter",
    (v) => `${rectD(38, 20, 12, 164, 6)} M 50 28 L ${N(158 + v * 6)} ${N(58 + v * 4)} L 50 ${N(96 + v * 6)} Z`,
    () => ""],
  ["gant", "Gant de boxe", "boxe gant combat ring poing",
    () => `M 34 92 C 34 56 62 34 100 34 C 140 34 168 58 168 96 C 168 122 154 140 130 146 V 168 H 60 V 146 C 44 138 34 118 34 92 Z`,
    (v) => ln1(`M 40 ${N(96 + v * 3)} C 76 ${N(112 + v * 3)} 132 ${N(112 + v * 3)} 166 ${N(96 + v * 3)}`, 6) + box1(56, 150, 78, 22, 8)],
  ["skate", "Skateboard", "skate skateboard planche roues rampe",
    () => `M 16 88 C 16 74 26 68 42 68 H 158 C 174 68 184 74 184 88 C 184 100 174 106 158 106 H 42 C 26 106 16 100 16 88 Z`,
    (v) => box1(48, 104, 20, 14, 4) + box1(132, 104, 20, 14, 4) + dot1(58, 132, 16 + v) + dot1(142, 132, 16 + v)],
  ["ski", "Skis", "ski neige montagne piste hiver",
    () => `M 52 40 C 52 26 72 26 72 40 V 178 H 52 Z M 128 40 C 128 26 148 26 148 40 V 178 H 128 Z`,
    (v) => box1(42, 92 - v * 4, 40, 18, 7) + box1(118, 92 - v * 4, 40, 18, 7)],
  ["arc", "Arc", "arc tir fleche cible archer",
    () => `M 148 20 C 96 62 96 138 148 180 L 138 186 C 80 140 80 60 138 14 Z`,
    (v) => ln0("M 150 24 V 176", 4) + ln1(`M ${N(58 - v * 6)} 100 H 148`, 6) + fil1(`M ${N(54 - v * 6)} 100 L ${N(80 - v * 6)} 88 L ${N(80 - v * 6)} 112 Z`)],
  ["corde", "Corde à sauter", "corde sauter cardio saut fitness",
    () => `${rectD(20, 34, 18, 56, 9)} ${rectD(162, 34, 18, 56, 9)}`,
    (v) => ln0(`M 29 90 C 29 ${N(146 + v * 8)} 171 ${N(146 + v * 8)} 171 90`, 7)],
  ["dossard", "Dossard", "dossard numero course marathon coureur",
    () => rectD(34, 40, 132, 120, 12),
    (v) => box1(48, 56, 104, 26, 6) + ln1(Array.from({ length: 2 + v }, (_, k) => `M 56 ${N(102 + k * 18)} H 144`).join(" "), 8) + dot1(46, 52, 5) + dot1(154, 52, 5)],
]);

/* ── Sport · récompenses ── */
subjects("sport", "win", "sport récompense victoire podium champion", [
  ["coupe", "Coupe", "coupe trophee victoire champion vainqueur",
    (v) => `M 62 30 H 138 V ${N(78 + v * 6)} C 138 108 122 124 100 124 C 78 124 62 108 62 ${N(78 + v * 6)} Z ${rectD(92, 124, 16, 28)} ${rectD(60, 152, 80, 22, 4)}`,
    (v) => ln0(`M 62 46 C 34 46 30 ${N(72 + v * 4)} 62 ${N(84 + v * 4)} M 138 46 C 166 46 170 ${N(72 + v * 4)} 138 ${N(84 + v * 4)}`, 8) + fil1(starPts(100, 74, 5, 20 + v * 2, 9))],
  ["medaille", "Médaille", "medaille or podium recompense ruban",
    () => circD(100, 128, 54),
    (v) => fil1("M 66 20 H 92 L 108 84 H 82 Z M 134 20 H 108 L 92 84 H 118 Z") + fil1(starPts(100, 128, 5 + v, 30, 14), "D")],
  ["podium", "Podium", "podium classement premier deuxieme troisieme",
    (v) => `${rectD(70, 62, 60, 112, 4)} ${rectD(14, 96 + v * 4, 56, 78 - v * 4, 4)} ${rectD(130, 112 + v * 4, 56, 62 - v * 4, 4)}`,
    () => ln1("M 82 84 H 118 M 26 118 H 58 M 142 134 H 174", 7)],
  ["laurier", "Couronne de lauriers", "laurier couronne victoire olympique",
    () => `M 100 176 C 46 158 28 108 36 56 C 60 62 84 92 94 140 Z M 100 176 C 154 158 172 108 164 56 C 140 62 116 92 106 140 Z`,
    (v) => ln1("M 46 68 C 64 90 80 118 90 148 M 154 68 C 136 90 120 118 110 148", 3 + v)],
  ["rosette", "Rosette", "rosette badge concours prix ruban",
    (v) => `${starPts(100, 84, 10 + v * 2, 62, 46)} M 78 128 L 62 184 L 88 168 L 100 186 L 112 168 L 138 184 L 122 128 Z`,
    (v) => dot1(100, 84, 28 - v * 2) + dot1(100, 84, 15 - v, "D")],
  ["plaque", "Plaque gravée", "plaque trophee gravure recompense",
    () => `${rectD(30, 34, 140, 96, 8)} ${rectD(70, 130, 60, 12, 4)} ${rectD(48, 142, 104, 24, 6)}`,
    (v) => ln1(Array.from({ length: 2 + v }, (_, k) => `M 52 ${N(66 + k * 20)} H ${N(148 - (k % 2) * 30)}`).join(" "), 7)],
  ["fanionchamp", "Fanion de champion", "fanion champion titre banniere",
    (v) => `M 40 22 H 160 V ${N(138 + v * 8)} L 100 ${N(110 + v * 6)} L 40 ${N(138 + v * 8)} Z`,
    () => fil1(starPts(100, 70, 5, 30, 13)) + ln1("M 62 108 H 138", 7)],
  ["flamme", "Flamme olympique", "flamme torche olympique feu ceremonie",
    () => `M 100 14 C 118 44 142 58 142 92 C 142 122 124 140 100 140 C 76 140 58 122 58 92 C 58 66 74 54 84 42 C 84 62 90 70 96 74 C 90 50 92 32 100 14 Z M 84 140 H 116 L 124 186 H 76 Z`,
    (v) => fil1("M 100 58 C 110 78 120 86 120 102 C 120 118 111 128 100 128 C 89 128 80 118 80 102 C 80 88 90 76 100 58 Z") + ln1(`M 80 ${N(150 + v * 4)} H 120`, 6), FLAME],
]);

/* ── Nourriture · fruits ── */
subjects("food", "fruit", "nourriture fruit frais marché vitamine", [
  ["pomme", "Pomme", "pomme fruit verger croquer",
    () => `M 100 54 C 74 34 30 44 30 100 C 30 146 60 184 84 184 C 92 184 96 178 100 178 C 104 178 108 184 116 184 C 140 184 170 146 170 100 C 170 44 126 34 100 54 Z`,
    (v) => ln0(`M 100 54 V ${N(30 - v * 2)}`, 7) + fil1("M 104 34 C 128 14 152 20 152 20 C 152 44 128 52 104 34 Z"), LEAF],
  ["poire", "Poire", "poire fruit verger douceur",
    (v) => `M 100 46 C 86 62 88 78 92 90 C 60 104 46 130 46 150 C 46 172 70 186 100 186 C 130 186 154 172 154 150 C 154 130 140 104 108 90 C 112 78 114 62 100 46 Z`,
    (v) => ln0(`M 100 48 V ${N(24 - v * 2)}`, 6) + fil1("M 104 30 C 126 12 148 18 148 18 C 148 40 126 48 104 30 Z"), LEAF],
  ["banane", "Banane", "banane fruit tropical potassium",
    () => `M 26 60 C 26 132 76 176 148 176 C 168 176 180 170 180 158 C 180 148 172 144 158 144 C 100 144 58 108 58 58 C 58 44 52 36 42 36 C 32 36 26 44 26 60 Z`,
    (v) => ln1("M 44 62 C 50 118 88 156 148 160", 3 + v)],
  ["orange", "Orange", "orange agrume clementine jus",
    () => circD(100, 106, 76),
    (v) => `<g clip-path="url(#sj)">${ln1(Array.from({ length: 6 + v }, (_, k) => { const [x, y] = polar(100, 106, 82, (k * 360) / (6 + v)); return `M 100 106 L ${N(x)} ${N(y)}`; }).join(" "), 3)}</g>`
      + ln0("M 100 32 V 16", 7) + fil1("M 104 22 C 126 6 146 12 146 12 C 146 32 126 40 104 22 Z")],
  ["citron", "Citron", "citron agrume acide zeste",
    (v) => `${ellD(100, 100, 74, 52 + v * 3)} ${rectD(174, 94, 18, 12, 6)} ${rectD(8, 94, 18, 12, 6)}`,
    () => `<g clip-path="url(#sj)">${ln1(Array.from({ length: 5 }, (_, k) => { const [x, y] = polar(100, 100, 82, k * 72 - 90); return `M 100 100 L ${N(x)} ${N(y)}`; }).join(" "), 3)}</g>`],
  ["fraise", "Fraise", "fraise fruit rouge ete dessert",
    () => `M 100 186 C 52 156 32 118 32 88 C 32 62 54 46 100 46 C 146 46 168 62 168 88 C 168 118 148 156 100 186 Z`,
    (v) => fil1("M 100 20 L 116 44 L 148 38 L 132 60 L 152 76 L 118 76 L 100 52 L 82 76 L 48 76 L 68 60 L 52 38 L 84 44 Z")
      + `<g clip-path="url(#sj)">${Array.from({ length: 14 + v * 4 }, (_, k) => { const r = rng(k * 977 + 31); return dot1(46 + r() * 108, 60 + r() * 106, 3.5, "L"); }).join("")}</g>`, LEAF],
  ["cerise", "Cerises", "cerise fruit rouge queue paire",
    (v) => `${circD(66, 142, 38)} ${circD(140, 152, 30 + v * 2)}`,
    () => ln1("M 66 104 C 74 66 96 40 130 26 M 140 122 C 132 88 130 56 130 26", 6), LEAF],
  ["raisin", "Raisin", "raisin grappe vigne vin",
    (v) => [[70, 74], [130, 74], [100, 74], [76, 112], [124, 112], [100, 112], [86, 148], [114, 148], [100, 174]]
      .map(([x, y]) => circD(x, y, 20 + v)).join(" "),
    () => ln1("M 100 52 V 22 M 100 30 C 122 18 140 20 148 26", 6), LEAF],
  ["ananas", "Ananas", "ananas tropical exotique",
    () => rectD(46, 66, 108, 120, 44),
    (v) => fil1("M 100 12 L 116 46 L 138 30 L 132 62 L 158 58 L 138 78 H 62 L 42 58 L 68 62 L 62 30 L 84 46 Z")
      + `<g clip-path="url(#sj)">${ln1(Array.from({ length: 5 + v }, (_, k) => `M ${N(30 + k * 28)} 60 L ${N(90 + k * 28)} 196 M ${N(170 - k * 28)} 60 L ${N(110 - k * 28)} 196`).join(" "), 3)}</g>`, LEAF],
  ["pasteque", "Pastèque", "pasteque melon ete tranche",
    () => "M 16 156 A 84 84 0 0 1 184 156 Z",
    (v) => fil1("M 30 150 A 70 70 0 0 1 170 150 Z", "L")
      + `<g clip-path="url(#sj)">${Array.from({ length: 6 + v * 2 }, (_, k) => dot1(46 + (k * 108) / (5 + v * 2), 116 + (k % 2) * 20, 5, "DD")).join("")}</g>`, "#f2564f"],
  ["avocat", "Avocat", "avocat fruit vert noyau toast",
    () => "M 100 18 C 138 18 162 54 162 100 C 162 146 136 184 100 184 C 64 184 38 146 38 100 C 38 54 62 18 100 18 Z",
    (v) => `<path d="M 100 34 C 130 34 148 62 148 100 C 148 138 128 168 100 168 C 72 168 52 138 52 100 C 52 62 70 34 100 34 Z" fill="none" stroke="${shd("L", 1)}" stroke-width="6"/>` + dot1(100, 116, 26 + v * 2), "#c8a165"],
  ["kiwi", "Kiwi", "kiwi fruit vert tranche",
    () => circD(100, 100, 80),
    (v) => dot1(100, 100, 66, "L") + dot1(100, 100, 17 - v)
      + Array.from({ length: 12 }, (_, k) => { const [x, y] = polar(100, 100, 42, k * 30); return dot1(x, y, 4, "DD"); }).join(""), "#7ddb92"],
  ["peche", "Pêche", "peche abricot fruit velours",
    (v) => circD(100, 112, 74),
    (v) => `<g clip-path="url(#sj)">${ln1(`M 100 38 C ${N(84 - v * 2)} 78 ${N(84 - v * 2)} 148 100 188`, 4)}</g>` + ln0("M 100 40 V 20", 6) + fil1("M 104 26 C 126 10 146 16 146 16 C 146 36 126 44 104 26 Z")],
  ["myrtille", "Myrtilles", "myrtille baie bleuet fruit rouge",
    (v) => `${circD(66, 118, 36)} ${circD(136, 106, 30 + v * 2)} ${circD(104, 158, 26 + v)}`,
    () => fil1(starPts(66, 96, 5, 12, 5), "L") + fil1(starPts(136, 84, 5, 10, 4), "L")],
  ["mangue", "Mangue", "mangue tropical exotique fruit",
    () => "M 152 46 C 178 74 176 124 148 154 C 118 186 62 186 38 154 C 20 130 34 96 66 72 C 96 50 130 24 152 46 Z",
    (v) => `<g clip-path="url(#sj)">${ln1("M 140 60 C 160 90 152 128 128 148", 5 + v)}</g>` + ln0("M 152 44 L 160 24", 6)],
  ["grenade", "Grenade", "grenade fruit graines rouge",
    () => circD(100, 112, 74),
    (v) => fil1("M 88 42 L 100 16 L 112 42 L 128 30 L 122 50 L 78 50 L 72 30 Z")
      + `<g clip-path="url(#sj)">${Array.from({ length: 9 + v * 2 }, (_, k) => { const r = rng(k * 613 + 7); return dot1(52 + r() * 96, 80 + r() * 90, 7, "L"); }).join("")}</g>`],
]);

/* ── Nourriture · plats ── */
subjects("food", "dish", "nourriture plat repas cuisine restaurant", [
  ["pizza", "Pizza", "pizza part italienne fromage four",
    (v) => `M 100 18 L ${N(182 - v * 4)} 174 H ${N(18 + v * 4)} Z`,
    (v) => fil1(`M 100 38 L ${N(166 - v * 4)} 164 H ${N(34 + v * 4)} Z`, "L")
      + [[100, 80], [78, 124], [124, 122], [92, 150], [136, 150], [64, 150]].slice(0, 3 + v).map(([x, y]) => dot1(x, y, 9, "DD")).join(""), "#f0b45a"],
  ["burger", "Burger", "burger hamburger sandwich fast food",
    () => "M 22 74 C 22 42 56 22 100 22 C 144 22 178 42 178 74 Z M 22 150 H 178 C 178 170 164 180 144 180 H 56 C 36 180 22 170 22 150 Z",
    (v) => box1(20, 78, 160, 18, 9, "L") + box1(16, 100, 168, 22, 11) + box1(20, 126, 160, 18, 9, "L")
      + Array.from({ length: 4 + v }, (_, k) => dot1(46 + (k * 108) / (3 + v), 48 + (k % 2) * 10, 4, "L")).join("")],
  ["hotdog", "Hot-dog", "hotdog saucisse pain moutarde",
    () => "M 16 118 C 16 96 34 84 60 84 H 140 C 166 84 184 96 184 118 C 184 140 166 152 140 152 H 60 C 34 152 16 140 16 118 Z",
    (v) => box1(28, 102, 144, 26, 13) + ln1(Array.from({ length: 3 + v }, (_, k) => `M ${N(40 + (k * 104) / (2 + v))} 108 q 14 16 28 0`).join(" "), 5, "L")],
  ["taco", "Taco", "taco mexicain galette tortilla",
    () => "M 20 160 C 20 96 56 58 100 58 C 144 58 180 96 180 160 Z",
    (v) => fil1("M 34 156 C 34 106 62 76 100 76 C 138 76 166 106 166 156 Z", "L")
      + Array.from({ length: 3 + v }, (_, k) => dot1(58 + (k * 84) / (2 + v), 122 + (k % 2) * 18, 8)).join("")],
  ["sushi", "Sushi", "sushi maki japonais riz algue",
    () => circD(100, 108, 66),
    (v) => dot1(100, 108, 52, "L") + dot1(100, 108, 22 + v * 2) + `<circle cx="100" cy="108" r="60" fill="${shd("DD", 1)}" opacity="0.5"/><circle cx="100" cy="108" r="52" fill="${shd("L", 1)}"/><circle cx="100" cy="108" r="${N(22 + v * 2)}" fill="${S1}"/>`],
  ["nouilles", "Bol de nouilles", "nouilles ramen bol asiatique soupe",
    () => "M 22 96 H 178 C 178 148 146 180 100 180 C 54 180 22 148 22 96 Z",
    (v) => ln1(Array.from({ length: 4 + v }, (_, k) => `M ${N(48 + (k * 84) / (3 + v))} 96 C ${N(44 + (k * 84) / (3 + v))} 68 ${N(64 + (k * 84) / (3 + v))} 56 ${N(58 + (k * 84) / (3 + v))} 40`).join(" "), 6) + ln1("M 120 44 L 176 26 M 128 56 L 184 38", 6)],
  ["salade", "Salade", "salade legumes vert bol sain",
    () => "M 20 92 H 180 C 180 146 148 178 100 178 C 52 178 20 146 20 92 Z",
    (v) => Array.from({ length: 4 + v }, (_, k) => {
      const r = rng(k * 431 + 11), x = 44 + (k * 96) / (3 + v);
      return fil1(`M ${N(x)} 90 C ${N(x - 16)} ${N(66 - r() * 16)} ${N(x + 6)} ${N(48 - r() * 14)} ${N(x + 22)} ${N(66)} C ${N(x + 28)} 80 ${N(x + 18)} 90 ${N(x + 8)} 90 Z`, k % 2 ? "L" : "");
    }).join("")],
  ["oeuf", "Œuf au plat", "oeuf plat petit dejeuner poele",
    () => "M 34 108 C 22 76 46 44 82 44 C 106 44 112 30 138 34 C 172 40 184 78 166 106 C 182 130 162 168 128 164 C 100 178 62 172 48 148 C 24 142 22 122 34 108 Z",
    (v) => dot1(100, 104, 28 + v * 2)],
  ["poisson", "Poisson grillé", "poisson grille mer plat cuisine",
    () => "M 20 106 C 48 66 108 60 148 84 L 184 56 V 156 L 148 128 C 108 152 48 146 20 106 Z",
    (v) => dot1(58, 100, 7) + ln1(Array.from({ length: 3 + v }, (_, k) => `M ${N(80 + (k * 56) / (2 + v))} 84 q 8 22 0 42`).join(" "), 4)],
  ["steak", "Steak", "steak viande grill barbecue",
    () => "M 30 92 C 30 58 66 40 108 44 C 152 48 178 74 176 108 C 174 144 138 164 96 160 C 54 156 30 128 30 92 Z",
    (v) => ln1(Array.from({ length: 2 + v }, (_, k) => `M ${N(52 + k * 22)} ${N(70 + k * 6)} L ${N(140 + k * 4)} ${N(112 + k * 6)}`).join(" "), 7)],
  ["sandwich", "Sandwich", "sandwich pain jambon triangle",
    () => "M 24 152 L 100 40 L 176 152 Z",
    (v) => fil1("M 74 76 L 126 76 L 100 40 Z", "L") + ln1(`M ${N(56 - v * 2)} 112 H ${N(144 + v * 2)} M 42 132 H 158`, 8)],
  ["soupe", "Bol de soupe", "soupe bol chaud cuillere potage",
    () => "M 18 94 H 182 C 182 148 148 180 100 180 C 52 180 18 148 18 94 Z",
    (v) => ln1(`M 66 ${N(50 - v * 4)} c -10 12 10 20 0 32 M 100 ${N(42 - v * 4)} c -10 12 10 20 0 32 M 134 ${N(50 - v * 4)} c -10 12 10 20 0 32`, 6) + box1(10, 86, 180, 14, 7)],
]);

/* ── Nourriture · douceurs ── */
subjects("food", "sweet", "nourriture dessert sucré gourmandise pâtisserie", [
  ["cupcake", "Cupcake", "cupcake muffin gateau creme anniversaire",
    () => "M 44 106 H 156 L 138 180 H 62 Z",
    (v) => fil1(`M 100 ${N(24 + v * 4)} C 138 ${N(24 + v * 4)} 158 54 158 78 C 158 94 142 104 100 104 C 58 104 42 94 42 78 C 42 54 62 ${N(24 + v * 4)} 100 ${N(24 + v * 4)} Z`)
      + ln1(Array.from({ length: 4 }, (_, k) => `M ${N(66 + k * 22)} 112 L ${N(60 + k * 20)} 174`).join(" "), 4, "D")],
  ["donut", "Donut", "donut beignet glacage sucre",
    (v) => `${circD(100, 100, 80)}${holeR(100, 100, 24 + v * 3)}`,
    (v) => `<g clip-path="url(#sj)">${fil1("M 20 100 C 20 56 56 20 100 20 C 144 20 180 56 180 100 C 180 84 160 90 148 100 C 132 114 118 96 100 104 C 82 112 66 94 50 102 C 36 108 24 88 20 100 Z")}${Array.from({ length: 8 + v * 3 }, (_, k) => {
      const r = rng(k * 733 + 5), a = r() * 360, rr = 34 + r() * 42, [x, y] = polar(100, 100, rr, a);
      return `<rect x="${N(x - 6)}" y="${N(y - 2)}" width="12" height="4" rx="2" fill="${shd("D", 1)}" transform="rotate(${N(a)} ${N(x)} ${N(y)})"/>`;
    }).join("")}</g>`],
  ["glace", "Cornet de glace", "glace cornet ete boule vanille",
    () => "M 62 108 H 138 L 100 190 Z",
    (v) => dot1(100, 66, 38 - v * 2) + dot1(72, 92, 26 - v) + dot1(128, 92, 26 - v)
      + `<g clip-path="url(#sj)">${ln1("M 62 118 L 100 176 M 138 118 L 100 176 M 74 108 L 118 152 M 126 108 L 82 152", 3, "D")}</g>`],
  ["gateau", "Gâteau", "gateau anniversaire bougie fete part",
    () => "M 28 96 H 172 V 168 C 172 176 166 180 158 180 H 42 C 34 180 28 176 28 168 Z",
    (v) => fil1("M 28 96 C 28 78 44 68 100 68 C 156 68 172 78 172 96 C 172 108 150 100 138 108 C 124 118 112 100 100 108 C 88 116 74 100 60 108 C 46 116 32 106 28 96 Z")
      + Array.from({ length: 1 + v }, (_, k) => box1(96 - v * 13 + k * 26, 30, 8, 38, 4)).join("")
      + Array.from({ length: 1 + v }, (_, k) => fil1(`M ${N(100 - v * 13 + k * 26)} 12 c 8 8 8 18 0 18 c -8 0 -8 -10 0 -18 Z`, "L")).join("")],
  ["cookie", "Cookie", "cookie biscuit pepites chocolat",
    () => circD(100, 100, 78),
    (v) => Array.from({ length: 5 + v * 2 }, (_, k) => { const r = rng(k * 379 + 17); const [x, y] = polar(100, 100, r() * 54, r() * 360); return dot1(x, y, 7 + r() * 3, "DD"); }).join(""), "#8a5a2b"],
  ["macaron", "Macaron", "macaron patisserie francaise couleur",
    () => "M 20 76 C 20 52 56 38 100 38 C 144 38 180 52 180 76 C 180 90 160 96 100 96 C 40 96 20 90 20 76 Z M 20 124 C 20 110 40 104 100 104 C 160 104 180 110 180 124 C 180 148 144 162 100 162 C 56 162 20 148 20 124 Z",
    (v) => box1(22, 92, 156, 16 + v * 2, 8)],
  ["chocolat", "Tablette de chocolat", "chocolat tablette carres cacao",
    () => rectD(30, 40, 140, 120, 8),
    (v) => Array.from({ length: v }, (_, k) => box1(36 + k * 34, 48, 30, 24, 4, "L")).join("")
      + ln1("M 30 80 H 170 M 30 120 H 170 M 76 40 V 160 M 124 40 V 160", 5)],
  ["sucette", "Sucette", "sucette bonbon spirale sucre",
    () => `${circD(100, 78, 58)} ${rectD(94, 132, 12, 58, 6)}`,
    (v) => `<g clip-path="url(#sj)">${ln1((() => {
      let d = "M 100 78 ";
      for (let k = 0; k <= 60; k++) { const t = k / 60; const [x, y] = polar(100, 78, t * 60, t * (540 + v * 180)); d += `L ${N(x)} ${N(y)} `; }
      return d;
    })(), 9)}</g>`],
  ["crepe", "Crêpe", "crepe pancake sirop petit dejeuner",
    (v) => Array.from({ length: 2 + v }, (_, k) => ellD(100, 152 - k * 24, 76 - k * 2, 18)).join(" "),
    (v) => {
      const ty = 152 - (1 + v) * 24;             // centre de la crêpe du dessus
      return fil1(`M 44 ${N(ty)} C 62 ${N(ty + 20)} 84 ${N(ty + 14)} 100 ${N(ty + 26)} C 118 ${N(ty + 14)} 140 ${N(ty + 22)} 156 ${N(ty)} C 156 ${N(ty - 18)} 44 ${N(ty - 18)} 44 ${N(ty)} Z`);
    }],
  ["croissant", "Croissant", "croissant viennoiserie boulangerie",
    () => "M 24 138 C 24 70 72 30 128 30 C 156 30 178 44 178 62 C 178 78 164 86 148 82 C 120 74 84 96 84 138 C 84 154 72 164 56 164 C 38 164 24 154 24 138 Z",
    (v) => ln1(Array.from({ length: 2 + v }, (_, k) => `M ${N(52 + (k * 70) / (1 + v))} ${N(126 - (k * 66) / (1 + v))} l 20 -12`).join(" "), 5, "D")],
  ["tarte", "Tarte", "tarte fruits patisserie part",
    () => "M 18 118 H 182 C 182 150 152 172 100 172 C 48 172 18 150 18 118 Z",
    (v) => box1(12, 102, 176, 20, 10) + Array.from({ length: 3 + v }, (_, k) => dot1(46 + (k * 106) / (2 + v), 140, 10, "L")).join("")],
  ["bonbon", "Bonbon", "bonbon sucrerie papillote sucre",
    (v) => `${ellD(100, 100, 42 + v * 2, 34)} M 58 100 L 18 66 V 134 Z M 142 100 L 182 66 V 134 Z`,
    () => ln1("M 34 82 V 118 M 166 82 V 118", 5) + ln1("M 84 84 q 16 16 0 32", 6)],
]);

/* ── Nourriture · boissons ── */
subjects("food", "drink", "nourriture boisson verre soif bar", [
  ["cafe", "Tasse de café", "cafe tasse expresso chaud matin",
    () => "M 30 76 H 150 V 138 C 150 162 132 176 108 176 H 72 C 48 176 30 162 30 138 Z",
    (v) => ln0("M 150 96 C 178 96 186 112 186 122 C 186 134 176 148 150 148", 12) + ln1(`M 62 ${N(56 - v * 4)} c -10 -12 10 -20 0 -32 M 100 ${N(56 - v * 4)} c -10 -12 10 -20 0 -32`, 6)],
  ["jus", "Verre de jus", "jus verre orange fruit boisson",
    () => "M 52 40 H 148 L 138 178 H 62 Z",
    (v) => `<g clip-path="url(#sj)">${box1(46, 66 + v * 14, 108, 120, 0)}</g>` + ln1("M 122 36 L 142 8", 8)],
  ["cocktail", "Cocktail", "cocktail verre bar apero tropical",
    () => "M 24 44 H 176 L 108 122 V 168 H 148 V 180 H 52 V 168 H 92 V 122 Z",
    (v) => `<g clip-path="url(#sj)">${box1(30, 60 + v * 8, 140, 62, 0)}</g>` + ln1("M 134 42 L 166 8", 7) + dot1(158, 32, 11 + v)],
  ["canette", "Canette", "canette soda boisson gazeuse",
    () => rectD(56, 30, 88, 148, 18),
    (v) => box1(52, 72 + v * 6, 96, 34, 4) + ln1("M 88 44 H 112", 6)],
  ["bouteille", "Bouteille", "bouteille eau boisson verre",
    () => "M 84 14 H 116 V 46 C 116 60 138 70 138 92 V 172 C 138 180 132 184 124 184 H 76 C 68 184 62 180 62 172 V 92 C 62 70 84 60 84 46 Z",
    (v) => box1(60, 100 + v * 8, 80, 40, 4) + box1(80, 8, 40, 14, 4)],
  ["smoothie", "Smoothie", "smoothie milkshake fruit paille",
    () => "M 56 62 H 144 L 134 180 H 66 Z",
    (v) => ln1("M 118 62 L 150 16", 9) + fil1(`M 58 ${N(74 + v * 10)} H 142 L ${N(138 - v * 2)} ${N(114 + v * 10)} H ${N(62 + v * 2)} Z`) + dot1(84, 44, 14) + dot1(112, 40, 11)],
  ["the", "Théière", "the theiere infusion tisane",
    () => "M 40 96 C 40 72 66 58 100 58 C 134 58 160 72 160 96 V 132 C 160 154 134 168 100 168 C 66 168 40 154 40 132 Z",
    () => ln0("M 160 92 L 188 78 L 184 116", 9) + ln0("M 40 100 C 16 104 16 132 40 136", 10) + box1(84, 44, 32, 14, 6)],
  ["biere", "Chope de bière", "biere chope pinte mousse houblon",
    () => rectD(46, 66, 94, 110, 6),
    (v) => fil1(`M 40 ${N(66 - v * 4)} C 40 ${N(44 - v * 4)} 146 ${N(44 - v * 4)} 146 ${N(66 - v * 4)} C 146 78 40 78 40 ${N(66 - v * 4)} Z`)
      + ln0("M 140 92 C 174 92 178 142 140 142", 14)],
  ["vin", "Verre de vin", "vin verre cave degustation",
    () => "M 58 24 H 142 C 142 76 122 100 106 106 V 164 H 140 V 176 H 60 V 164 H 94 V 106 C 78 100 58 76 58 24 Z",
    (v) => `<g clip-path="url(#sj)">${box1(52, 46 + v * 8, 96, 62, 0)}</g>`],
  ["boba", "Bubble tea", "boba bubble tea perles paille",
    () => "M 54 52 H 146 L 136 180 H 64 Z",
    (v) => box1(44, 40, 112, 16, 6) + ln1("M 116 44 L 140 10", 9)
      + Array.from({ length: 4 + v }, (_, k) => { const r = rng(k * 271 + 3); return dot1(72 + r() * 56, 138 + r() * 30, 9, "D"); }).join("")],
  ["gourdeau", "Bouteille d'eau", "eau bouteille sport hydratation gourde",
    () => "M 74 20 H 126 V 42 C 140 46 148 58 148 74 V 168 C 148 178 142 184 132 184 H 68 C 58 184 52 178 52 168 V 74 C 52 58 60 46 74 42 Z",
    (v) => box1(56, 84 + v * 10, 88, 30, 4) + ln1("M 72 62 H 128", 6)],
  ["glacon", "Verre glacé", "glacon verre froid eau rafraichissant",
    () => "M 48 46 H 152 L 140 180 H 60 Z",
    (v) => `<g clip-path="url(#sj)">${Array.from({ length: 2 + v }, (_, k) => box1(64 + (k % 2) * 40, 68 + k * 28, 34, 30, 6)).join("")}</g>`],
]);

/* ── Animaux · museaux ── */
{
  const eyes = (x1: number, x2: number, y: number, r: number) => dot1(x1, y, r) + dot1(x2, y, r);
  const nose = (x: number, y: number, w: number) =>
    fil1(`M ${N(x - w)} ${N(y - w * 0.5)} Q ${N(x)} ${N(y + w * 0.9)} ${N(x + w)} ${N(y - w * 0.5)} Q ${N(x)} ${N(y - w)} ${N(x - w)} ${N(y - w * 0.5)} Z`);
  const smile = (x: number, y: number, w: number, sw: number) => ln1(`M ${N(x - w)} ${N(y)} q ${N(w)} ${N(w * 0.7)} ${N(w * 2)} 0`, sw);

  subjects("animals", "face", "animal museau tête portrait mignon", [
    ["chat", "Chat", "chat felin minou moustaches",
      (v) => `${circD(100, 108, 66)} M 44 66 L 40 ${N(22 - v * 2)} L 82 52 Z M 156 66 L 160 ${N(22 - v * 2)} L 118 52 Z`,
      (v) => eyes(76, 124, 100, 8 + v) + nose(100, 124, 9) + smile(100, 132, 14, 4) + ln1("M 130 128 H 166 M 130 138 H 164 M 70 128 H 34 M 70 138 H 36", 3), DARK],
    ["chien", "Chien", "chien toutou fidele museau",
      (v) => `${circD(100, 104, 64)} M 34 ${N(60 - v * 2)} C 12 74 14 128 40 140 C 50 118 44 78 52 66 Z M 166 ${N(60 - v * 2)} C 188 74 186 128 160 140 C 150 118 156 78 148 66 Z`,
      (v) => eyes(78, 122, 96, 8 + v) + dot1(100, 128, 14, "L") + nose(100, 122, 11) + smile(100, 140, 16, 4), DARK],
    ["ours", "Ours", "ours brun peluche foret",
      (v) => `${circD(100, 110, 66)} ${circD(48, 54, 24 + v)} ${circD(152, 54, 24 + v)}`,
      (v) => eyes(80, 120, 100, 7 + v) + dot1(100, 132, 22, "L") + nose(100, 126, 10) + smile(100, 140, 12, 4), DARK],
    ["renard", "Renard", "renard roux malin",
      (v) => `M 100 178 C 46 178 30 130 30 92 L 22 ${N(24 - v * 2)} L 70 56 C 88 48 112 48 130 56 L 178 ${N(24 - v * 2)} L 170 92 C 170 130 154 178 100 178 Z`,
      (v) => fil1("M 100 178 C 74 178 60 160 56 138 C 74 148 126 148 144 138 C 140 160 126 178 100 178 Z", "L") + eyes(74, 126, 96, 7 + v) + nose(100, 140, 10), DARK],
    ["lapin", "Lapin", "lapin oreilles carotte",
      (v) => `${circD(100, 124, 56)} ${ellD(74, 54 - v * 2, 17, 44 - v * 2)} ${ellD(126, 54 - v * 2, 17, 44 - v * 2)}`,
      (v) => eyes(80, 120, 118, 7 + v) + nose(100, 138, 8) + ln1("M 100 142 V 152 M 100 152 q -10 8 -18 2 M 100 152 q 10 8 18 2", 3.5), DARK],
    ["panda", "Panda", "panda bambou noir blanc",
      (v) => `${circD(100, 108, 66)} ${circD(44, 52, 24 + v)} ${circD(156, 52, 24 + v)}`,
      () => dot1(76, 102, 18) + dot1(124, 102, 18) + dot1(76, 102, 7, "W") + dot1(124, 102, 7, "W") + nose(100, 128, 10) + smile(100, 142, 12, 4), DARK],
    ["lion", "Lion", "lion criniere roi savane",
      (v) => Array.from({ length: 12 }, (_, k) => { const [x, y] = polar(100, 104, 60, k * 30); return circD(x, y, 22 + v); }).join(" ") + " " + circD(100, 104, 54),
      () => eyes(82, 118, 96, 7) + nose(100, 116, 10) + smile(100, 128, 12, 4) + ln1("M 124 122 H 154 M 76 122 H 46", 3), DARK],
    ["tigre", "Tigre", "tigre rayures jungle",
      (v) => `${circD(100, 106, 66)} ${circD(50, 54, 20)} ${circD(150, 54, 20)}`,
      (v) => ln1(Array.from({ length: 2 + v }, (_, k) => `M ${N(58 + k * 12)} ${N(66 + k * 8)} l -16 -16 M ${N(142 - k * 12)} ${N(66 + k * 8)} l 16 -16`).join(" "), 6)
        + eyes(80, 120, 100, 7) + nose(100, 122, 10) + smile(100, 136, 12, 4), DARK],
    ["souris", "Souris", "souris rongeur fromage",
      (v) => `${circD(100, 116, 52)} ${circD(56, 62, 30 + v)} ${circD(144, 62, 30 + v)}`,
      () => eyes(84, 116, 108, 6) + nose(100, 136, 8) + ln1("M 118 138 H 154 M 82 138 H 46", 3), DARK],
    ["koala", "Koala", "koala eucalyptus australie",
      (v) => `${circD(100, 110, 58)} ${circD(40, 84, 30 + v)} ${circD(160, 84, 30 + v)}`,
      () => eyes(82, 118, 102, 7) + fil1("M 100 118 C 116 118 124 130 124 142 C 124 154 112 160 100 160 C 88 160 76 154 76 142 C 76 130 84 118 100 118 Z"), DARK],
    ["cochon", "Cochon", "cochon rose ferme groin",
      (v) => `${circD(100, 110, 62)} M 46 62 L 40 ${N(28 - v * 2)} L 80 50 Z M 154 62 L 160 ${N(28 - v * 2)} L 120 50 Z`,
      (v) => eyes(78, 122, 98, 7) + `<ellipse cx="100" cy="132" rx="${N(26 + v * 2)}" ry="18" fill="${shd("L", 1)}"/>` + dot1(92, 132, 5, "D") + dot1(108, 132, 5, "D"), DARK],
    ["vache", "Vache", "vache ferme lait meuh",
      () => `${circD(100, 108, 62)} ${ellD(32, 92, 24, 16)} ${ellD(168, 92, 24, 16)} M 62 56 C 48 40 54 26 66 30 C 74 33 78 44 76 54 Z M 138 56 C 152 40 146 26 134 30 C 126 33 122 44 124 54 Z`,
      (v) => eyes(80, 120, 96, 7) + `<ellipse cx="100" cy="140" rx="${N(32 + v * 2)}" ry="22" fill="${shd("L", 1)}"/>` + dot1(90, 136, 5, "D") + dot1(110, 136, 5, "D"), DARK],
    ["grenouille", "Grenouille", "grenouille batracien mare",
      (v) => `${ellD(100, 122, 68, 54)} ${circD(60, 66, 26 + v)} ${circD(140, 66, 26 + v)}`,
      () => dot1(60, 66, 12) + dot1(140, 66, 12) + smile(100, 128, 32, 6), DARK],
    ["singe", "Singe", "singe primate banane",
      (v) => `${circD(100, 108, 58)} ${circD(38, 100, 24 + v)} ${circD(162, 100, 24 + v)}`,
      () => `<ellipse cx="100" cy="124" rx="40" ry="34" fill="${shd("L", 1)}"/>` + eyes(84, 116, 100, 7) + dot1(92, 124, 4, "D") + dot1(108, 124, 4, "D") + smile(100, 134, 14, 4), DARK],
    ["loup", "Loup", "loup sauvage meute",
      (v) => `M 100 180 C 52 180 34 140 34 100 L 28 ${N(26 - v * 2)} L 72 58 C 90 50 110 50 128 58 L 172 ${N(26 - v * 2)} L 166 100 C 166 140 148 180 100 180 Z`,
      () => fil1("M 100 180 C 78 180 64 164 60 144 C 78 154 122 154 140 144 C 136 164 122 180 100 180 Z", "L") + eyes(76, 124, 98, 7) + nose(100, 142, 10), DARK],
    ["hibou", "Hibou", "hibou chouette nuit oiseau",
      (v) => `${ellD(100, 108, 62, 70)} M 46 50 L 58 ${N(20 - v * 2)} L 78 48 Z M 154 50 L 142 ${N(20 - v * 2)} L 122 48 Z`,
      () => dot1(76, 100, 24) + dot1(124, 100, 24) + dot1(76, 100, 10, "D") + dot1(124, 100, 10, "D") + fil1("M 100 122 L 112 138 L 100 152 L 88 138 Z"), DARK],
    ["manchot", "Manchot", "manchot pingouin banquise oiseau",
      () => ellD(100, 110, 58, 72),
      (v) => `<ellipse cx="100" cy="126" rx="${N(38 + v * 2)}" ry="50" fill="${shd("L", 1)}"/>` + eyes(82, 118, 88, 7) + fil1("M 100 104 L 116 116 L 100 128 L 84 116 Z")],
    ["pandaroux", "Panda roux", "panda roux himalaya",
      () => `${circD(100, 112, 58)} M 44 66 C 26 44 40 26 58 34 C 70 40 72 58 66 70 Z M 156 66 C 174 44 160 26 142 34 C 130 40 128 58 134 70 Z`,
      () => `<ellipse cx="100" cy="128" rx="34" ry="26" fill="${shd("L", 1)}"/>` + eyes(80, 120, 104, 7) + nose(100, 126, 9) + ln1("M 122 132 H 156 M 78 132 H 44", 3), DARK],
  ]);
}

/* ── Animaux · silhouettes ── */
subjects("animals", "sil", "animal silhouette profil faune nature", [
  ["chatsil", "Chat assis", "chat assis silhouette queue",
    (v) => `M 74 42 L 84 74 C 108 66 126 78 132 100 C 140 128 138 158 136 176 H 62 C 58 156 56 122 66 96 L 60 42 L 76 62 Z`,
    (v) => ln0(`M 134 172 C 158 170 174 ${N(148 - v * 6)} 166 128 C 160 114 150 116 150 126 C 150 142 150 160 138 168`, 12), DARK],
  ["chiensil", "Chien debout", "chien silhouette compagnon",
    () => "M 26 74 C 26 62 38 56 52 58 L 66 42 L 72 60 C 96 58 130 62 148 76 C 164 88 172 104 172 120 V 158 H 156 V 128 H 66 V 158 H 50 V 118 C 36 110 26 94 26 74 Z",
    (v) => ln0(`M 170 ${N(118 - v * 3)} C 184 ${N(110 - v * 3)} 188 94 184 82`, 10) + dot1(52, 76, 6), DARK],
  ["oiseau", "Oiseau", "oiseau vol plume aile ciel",
    (v) => `M 30 118 C 30 88 56 66 92 66 L 120 40 L 122 68 C 152 74 172 96 172 118 C 172 128 164 134 152 134 H 60 C 44 134 30 130 30 118 Z M 150 132 L ${N(184 + v * 2)} ${N(154 + v * 4)} L 126 140 Z`,
    () => dot1(60, 96, 6), DARK],
  ["poissonsil", "Poisson", "poisson mer nage aquarium",
    () => "M 22 100 C 46 62 96 52 132 74 L 174 46 V 154 L 132 126 C 96 148 46 138 22 100 Z",
    (v) => dot1(60, 92, 6 + v), DARK],
  ["papillon", "Papillon", "papillon aile insecte printemps",
    () => `M 100 62 C 76 26 22 26 22 72 C 22 108 68 116 96 106 Z M 100 62 C 124 26 178 26 178 72 C 178 108 132 116 104 106 Z M 100 108 C 78 104 34 116 34 152 C 34 184 82 178 98 144 Z M 100 108 C 122 104 166 116 166 152 C 166 184 118 178 102 144 Z ${ellD(100, 106, 8, 46)}`,
    () => ln0("M 96 62 L 76 30 M 104 62 L 124 30", 4), DARK],
  ["abeille", "Abeille", "abeille miel insecte ruche",
    () => `${ellD(104, 116, 52, 40)} M 84 78 C 56 40 20 44 24 74 C 27 96 60 100 82 90 Z M 116 78 C 144 40 180 44 176 74 C 173 96 140 100 118 90 Z`,
    (v) => ln1(Array.from({ length: 2 + v }, (_, k) => `M ${N(84 + (k * 56) / (1 + v))} 84 V 150`).join(" "), 9) + ln0("M 66 62 L 48 36 M 82 56 L 74 30", 4)],
  ["cheval", "Cheval", "cheval galop equitation crin",
    () => "M 172 34 L 156 66 C 150 78 136 84 120 84 H 74 C 50 84 34 100 34 122 V 168 H 50 V 128 H 150 V 168 H 166 V 116 C 176 100 182 74 182 52 L 176 30 Z",
    () => dot1(166, 56, 5), DARK],
  ["cerf", "Cerf", "cerf bois foret ramure",
    () => "M 100 78 C 118 78 130 92 130 110 V 176 H 116 V 132 H 84 V 176 H 70 V 110 C 70 92 82 78 100 78 Z",
    (v) => ln0(`M 86 80 L 62 ${N(38 - v * 2)} L 38 46 M 62 ${N(38 - v * 2)} L 56 20 M 114 80 L 138 ${N(38 - v * 2)} L 162 46 M 138 ${N(38 - v * 2)} L 144 20`, 7)],
  ["elephant", "Éléphant", "elephant trompe savane",
    () => "M 44 96 C 44 62 74 42 108 42 C 142 42 168 64 168 98 V 158 H 150 V 122 H 96 V 158 H 78 V 126 C 58 122 44 112 44 96 Z",
    (v) => ln0(`M 96 124 C 96 150 ${N(78 - v * 4)} 158 ${N(72 - v * 4)} 174`, 14) + dot1(128, 84, 6)],
  ["dauphin", "Dauphin", "dauphin mer nage mammifere",
    () => "M 18 128 C 40 82 92 58 138 66 L 122 30 C 158 40 180 74 182 116 L 176 154 L 140 132 C 104 154 52 152 18 128 Z",
    (v) => dot1(152, 96, 5 + v), DARK],
  ["baleine", "Baleine", "baleine ocean geant cetace",
    (v) => `M 20 116 C 20 82 62 60 106 60 C 148 60 176 82 176 112 C 176 140 148 158 106 158 C 62 158 20 148 20 116 Z M 176 112 L 192 ${N(80 - v * 4)} L 186 128 Z`,
    (v) => dot1(58, 104, 6) + ln1(`M 100 60 C 96 ${N(42 - v * 4)} 108 ${N(36 - v * 4)} 112 ${N(24 - v * 4)}`, 6), DARK],
  ["tortue", "Tortue", "tortue carapace lente mer",
    () => "M 36 118 C 36 82 64 58 100 58 C 136 58 164 82 164 118 Z M 164 106 C 178 100 186 108 184 120 C 182 130 172 132 164 126 Z",
    (v) => ln0("M 46 120 L 38 148 M 154 120 L 162 148", 12) + `<g clip-path="url(#sj)">${ln1(`M 100 56 V 120 M ${N(62 - v * 2)} 74 L 88 120 M ${N(138 + v * 2)} 74 L 112 120 M 40 100 H 160`, 5)}</g>`],
  ["escargot", "Escargot", "escargot coquille lent jardin",
    () => `${circD(118, 106, 56)} M 62 138 C 40 138 26 148 26 158 H 90 Z`,
    (v) => ln0("M 40 138 L 30 106 M 56 136 L 52 102", 5)
      + `<g clip-path="url(#sj)">${ln1((() => {
        let d = "M 118 106 ";
        for (let k = 0; k <= 50; k++) { const t = k / 50; const [x, y] = polar(118, 106, t * 56, t * (540 + v * 90)); d += `L ${N(x)} ${N(y)} `; }
        return d;
      })(), 7)}</g>`, DARK],
  ["coccinelle", "Coccinelle", "coccinelle insecte porte bonheur",
    () => `${circD(100, 112, 66)} ${circD(100, 50, 24)}`,
    (v) => ln1("M 100 50 V 176", 6) + Array.from({ length: 3 + v }, (_, k) => dot1(k % 2 ? 132 : 68, 88 + Math.floor(k / 2) * 30, 11)).join(""), DARK],
  ["libellule", "Libellule", "libellule insecte etang aile",
    () => `${ellD(100, 118, 12, 62)} ${circD(100, 44, 20)}`,
    (v) => fil1(`M 92 76 C 50 ${N(52 - v * 4)} 16 66 24 88 C 30 104 68 100 92 92 Z M 108 76 C 150 ${N(52 - v * 4)} 184 66 176 88 C 170 104 132 100 108 92 Z M 92 104 C 56 92 26 108 34 128 C 40 142 72 134 92 120 Z M 108 104 C 144 92 174 108 166 128 C 160 142 128 134 108 120 Z`, "L")],
  ["meduse", "Méduse", "meduse ocean transparent tentacule",
    () => "M 32 106 C 32 66 62 38 100 38 C 138 38 168 66 168 106 C 168 116 158 122 146 118 C 132 114 122 122 108 118 C 96 115 86 122 72 118 C 58 114 46 120 36 116 Z",
    (v) => ln0(Array.from({ length: 4 + v }, (_, k) => `M ${N(52 + (k * 96) / (3 + v))} 118 c ${k % 2 ? 12 : -12} 20 ${k % 2 ? -12 : 12} 38 0 56`).join(" "), 6), DARK],
  ["crabe", "Crabe", "crabe plage pince mer",
    () => `${ellD(100, 108, 62, 42)} M 44 92 C 20 82 12 60 22 44 C 32 58 44 62 52 66 Z M 156 92 C 180 82 188 60 178 44 C 168 58 156 62 148 66 Z`,
    (v) => ln0("M 52 142 L 30 170 M 78 150 L 66 180 M 122 150 L 134 180 M 148 142 L 170 170", 7) + dot1(82, 96, 7 + v) + dot1(118, 96, 7 + v), DARK],
  ["ecureuil", "Écureuil", "ecureuil noisette arbre queue",
    (v) => `M 92 60 C 116 60 130 78 130 100 V 158 H 60 V 108 C 60 80 72 60 92 60 Z M 130 ${N(142 - v * 4)} C 172 138 186 96 168 62 C 156 40 132 46 134 70 C 136 92 142 116 130 128 Z`,
    () => dot1(104, 84, 6), DARK],
]);

/* ── Tech · appareils ── */
subjects("tech", "dev", "tech appareil numérique matériel écran", [
  ["ecran", "Écran", "ecran moniteur bureau affichage pc",
    () => `${rectD(16, 30, 168, 110, 10)} ${rectD(86, 140, 28, 26, 2)} ${rectD(56, 166, 88, 14, 7)}`,
    (v) => box1(28, 42, 144, 86, 4) + ln1(Array.from({ length: 2 + v }, (_, k) => `M 42 ${N(60 + k * 20)} H ${N(150 - (k % 2) * 40)}`).join(" "), 6, "D")],
  ["portable", "Ordinateur portable", "ordinateur portable laptop clavier",
    () => `${rectD(30, 34, 140, 96, 8)} M 10 130 H 190 L 182 158 H 18 Z`,
    (v) => box1(40, 44, 120, 76, 4) + ln1(Array.from({ length: 2 + v }, (_, k) => `M 54 ${N(62 + k * 18)} H ${N(146 - (k % 2) * 36)}`).join(" "), 6, "D") + box1(78, 138, 44, 8, 4, "D")],
  ["smartphone", "Smartphone", "smartphone telephone mobile portable",
    () => rectD(56, 12, 88, 176, 16),
    (v) => box1(64, 30, 72, 136, 5) + ln1("M 88 22 H 112", 5) + dot1(100, 176, 6)
      + Array.from({ length: v }, (_, k) => box1(72, 42 + k * 26, 56, 18, 4, "D")).join("")],
  ["tablette", "Tablette", "tablette ipad ecran tactile",
    () => rectD(34, 20, 132, 160, 12),
    (v) => box1(44, 34, 112, 126, 5) + dot1(100, 170, 6)
      + Array.from({ length: v }, (_, k) => box1(54 + (k % 2) * 56, 46 + Math.floor(k / 2) * 44, 46, 36, 5, "D")).join("")],
  ["clavier", "Clavier", "clavier touches saisie ordinateur",
    () => rectD(12, 56, 176, 88, 10),
    () => Array.from({ length: 40 }, (_, k) => {
      const col = k % 10, row = Math.floor(k / 10);
      return row === 3 && col > 1 && col < 8 ? "" : box1(22 + col * 16.4, 66 + row * 18, 13, 14, 3);
    }).join("") + box1(54, 120, 92, 14, 3)],
  ["souris", "Souris", "souris clic pointeur ordinateur",
    () => "M 100 16 C 138 16 160 46 160 92 V 128 C 160 164 134 184 100 184 C 66 184 40 164 40 128 V 92 C 40 46 62 16 100 16 Z",
    (v) => ln1("M 100 26 V 78", 5) + box1(92, 40, 16, 30, 8) + (v > 2 ? ln1("M 62 96 H 138", 4) : "")],
  ["casqueaudio", "Casque audio", "casque audio musique son ecouteur",
    () => `M 26 122 V 96 C 26 52 60 22 100 22 C 140 22 174 52 174 96 V 122 H 156 V 96 C 156 62 132 40 100 40 C 68 40 44 62 44 96 V 122 Z ${rectD(16, 112, 40, 66, 14)} ${rectD(144, 112, 40, 66, 14)}`,
    () => box1(24, 122, 24, 46, 10) + box1(152, 122, 24, 46, 10)],
  ["enceinte", "Enceinte", "enceinte haut parleur son musique",
    () => rectD(48, 16, 104, 168, 12),
    (v) => dot1(100, 66, 26 - v * 2) + dot1(100, 66, 11 - v, "D") + dot1(100, 134, 18 - v) + dot1(100, 134, 7, "D")],
  ["photo", "Appareil photo", "appareil photo camera objectif cliche",
    () => `${rectD(14, 52, 172, 116, 14)} M 66 52 L 78 30 H 122 L 134 52 Z`,
    (v) => dot1(100, 110, 38 - v * 2) + dot1(100, 110, 24 - v * 2, "D") + dot1(44, 74, 8) + box1(140, 68, 30, 14, 6)],
  ["camera", "Caméra", "camera video film tournage",
    () => `${rectD(16, 62, 116, 88, 12)} M 132 96 L 186 66 V 148 L 132 118 Z`,
    (v) => dot1(48, 106, 20 - v) + dot1(94, 106, 20 - v) + box1(28, 46, 24, 18, 4)],
  ["imprimante", "Imprimante", "imprimante papier bureau impression",
    () => `${rectD(20, 74, 160, 78, 10)} ${rectD(52, 24, 96, 50, 4)} ${rectD(52, 140, 96, 44, 4)}`,
    (v) => ln1(Array.from({ length: 2 + v }, (_, k) => `M 66 ${N(36 + (k * 30) / (1 + v))} H 134`).join(" "), 5) + box1(40, 94, 40, 12, 4) + dot1(158, 100, 7)],
  ["disque", "Disque dur", "disque dur stockage donnees sauvegarde",
    () => rectD(20, 46, 160, 108, 10),
    (v) => dot1(100, 100, 36 - v * 2) + dot1(100, 100, 10, "D") + box1(36, 62, 24, 12, 4) + ln1("M 140 128 H 164", 6)],
  ["routeur", "Routeur", "routeur wifi reseau internet box",
    () => `${rectD(24, 108, 152, 56, 12)} ${rectD(44, 40, 10, 68, 5)} ${rectD(146, 40, 10, 68, 5)}`,
    (v) => Array.from({ length: 3 + v }, (_, k) => dot1(60 + (k * 84) / (2 + v), 136, 7)).join("") + ln1("M 84 60 q 16 -16 32 0 M 74 46 q 26 -24 52 0", 5)],
  ["montre", "Montre connectée", "montre connectee smartwatch bracelet",
    () => `${rectD(56, 46, 88, 108, 22)} ${rectD(72, 6, 56, 44, 10)} ${rectD(72, 150, 56, 44, 10)}`,
    (v) => box1(68, 58, 64, 84, 14) + ln1(Array.from({ length: 1 + v }, (_, k) => `M 82 ${N(76 + (k * 52) / (1 + v))} H ${N(118 - (k % 2) * 14)}`).join(" "), 6, "D")],
  ["manette", "Manette", "manette jeu video console gaming",
    () => "M 44 68 H 156 C 176 68 188 92 184 122 C 180 148 168 160 152 156 L 124 138 H 76 L 48 156 C 32 160 20 148 16 122 C 12 92 24 68 44 68 Z",
    () => ln1("M 58 102 V 126 M 46 114 H 70", 8) + dot1(136, 104, 8) + dot1(152, 118, 8) + dot1(120, 118, 8) + dot1(136, 132, 8)],
  ["drone", "Drone", "drone quadricoptere vol camera",
    () => `${rectD(72, 78, 56, 44, 10)} ${circD(40, 60, 10)} ${circD(160, 60, 10)} ${circD(40, 140, 10)} ${circD(160, 140, 10)}`,
    (v) => ln0("M 44 66 L 76 86 M 156 66 L 124 86 M 44 134 L 76 114 M 156 134 L 124 114", 8)
      + [[40, 60], [160, 60], [40, 140], [160, 140]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="${N(28 + v * 2)}" ry="7" fill="${S1}" opacity="0.6"/>`).join("")
      + dot1(100, 126, 10)],
]);

/* ── Tech · têtes de robot ── */
{
  const EYES = [
    (v: number) => dot1(76, 100, 12 + v) + dot1(124, 100, 12 + v),
    () => box1(60, 88, 80, 24, 12) + dot1(84, 100, 8, "D") + dot1(116, 100, 8, "D"),
    () => box1(64, 90, 28, 20, 6) + box1(108, 90, 28, 20, 6),
    (v: number) => dot1(100, 100, 20 + v) + dot1(100, 100, 9, "D"),
    () => ln1("M 66 94 L 90 104 L 66 114 M 134 94 L 110 104 L 134 114", 7),
  ];
  const MOUTH = [
    () => box1(74, 132, 52, 12, 6),
    (v: number) => ln1(`M 74 134 q 26 ${N(12 + v * 4)} 52 0`, 7),
    () => Array.from({ length: 5 }, (_, k) => box1(72 + k * 12, 130, 8, 14, 2)).join(""),
    () => ln1("M 72 138 H 128", 8),
  ];
  const ANT = [
    () => "",
    (v: number) => ln0(`M 100 ${N(36 - v * 2)} V 14`, 6) + dot1(100, 10, 8),
    (v: number) => ln0(`M 70 ${N(38 - v * 2)} L 56 12 M 130 ${N(38 - v * 2)} L 144 12`, 6) + dot1(54, 10, 7) + dot1(146, 10, 7),
    () => box1(84, 8, 32, 16, 6),
  ];
  const HEADS: [string, string, (v: number) => string][] = [
    ["carre", "Robot carré", (v) => rectD(30, 34, 140, 132, 14 + v * 4)],
    ["rond", "Robot rond", () => circD(100, 104, 72)],
    ["dome", "Robot dôme", (v) => `M 32 166 V ${N(110 - v * 4)} C 32 62 62 32 100 32 C 138 32 168 62 168 ${N(110 - v * 4)} V 166 Z`],
    ["visiere", "Robot à visière", () => rectD(26, 40, 148, 120, 30)],
    ["cube", "Robot cubique", () => "M 100 26 L 174 62 V 142 L 100 178 L 26 142 V 62 Z"],
    ["ovale", "Robot ovale", (v) => ellD(100, 104, 62 + v * 2, 76)],
    ["hexa", "Robot hexagonal", () => polyPts(100, 102, 6, 78)],
    ["ecranrobot", "Robot écran", () => `${rectD(22, 46, 156, 104, 12)} ${rectD(84, 150, 32, 22, 3)} ${rectD(56, 172, 88, 14, 7)}`],
  ];
  for (const [slug, label, shape] of HEADS) {
    fam(`bot-${slug}`, "tech", label, `${label} robot androide tete intelligence artificielle tech`,
      [4, EYES.length, MOUTH.length, ANT.length],
      ([lv, ei, mi, ai]) => ({
        w: 200, h: 200,
        body: volume(shape(lv), lv, "sj") + ANT[ai](lv) + EYES[ei](lv % 3) + MOUTH[mi](lv % 3),
      }), [{ label: "Couleur principale" }, { label: "Couleur secondaire", def: SECOND }]);
  }
}

/* ── Objets du quotidien ── */
subjects("objects", "obj", "objet quotidien accessoire usuel", [
  ["horloge", "Horloge", "horloge pendule heure temps reveil",
    () => circD(100, 104, 78),
    (v) => dot1(100, 104, 62) + ln1("M 100 104 V 62 M 100 104 L 130 120", 7, "D") + dot1(100, 104, 6, "D")
      + Array.from({ length: 4 + v * 2 }, (_, k) => { const [x, y] = polar(100, 104, 52, (k * 360) / (4 + v * 2)); return dot1(x, y, 4, "D"); }).join("")],
  ["livre", "Livre", "livre lecture roman bibliotheque page",
    () => "M 20 40 C 46 28 78 28 100 40 C 122 28 154 28 180 40 V 164 C 154 152 122 152 100 164 C 78 152 46 152 20 164 Z",
    (v) => ln1("M 100 40 V 164", 6) + ln1(Array.from({ length: 2 + v }, (_, k) => `M 36 ${N(62 + (k * 80) / (1 + v))} H 84 M 116 ${N(62 + (k * 80) / (1 + v))} H 164`).join(" "), 5)],
  ["ampoule", "Ampoule", "ampoule lumiere idee electricite",
    () => `M 100 16 C 138 16 164 44 164 78 C 164 106 144 122 138 140 H 62 C 56 122 36 106 36 78 C 36 44 62 16 100 16 Z ${rectD(66, 142, 68, 14, 4)} ${rectD(70, 158, 60, 14, 4)} ${rectD(80, 174, 40, 12, 5)}`,
    (v) => ln1(`M 82 ${N(128 - v * 2)} C 74 96 84 70 100 56 C 116 70 126 96 118 ${N(128 - v * 2)}`, 6)],
  ["cle", "Clé", "cle serrure porte trousseau",
    (v) => `${circD(52, 100, 40)}${holeR(52, 100, 14 + v * 2)} ${rectD(88, 88, 96, 24, 6)} ${rectD(140, 110, 14, 26, 4)} ${rectD(164, 110, 14, 26, 4)}`,
    () => ""],
  ["cadenas", "Cadenas", "cadenas securite verrou protection",
    (v) => `${rectD(34, 88, 132, 96, 14)} M 62 88 V 66 C 62 42 78 26 100 26 C 122 26 138 42 138 66 V 88 H 120 V 66 C 120 52 112 44 100 44 C 88 44 80 52 80 66 V 88 Z`,
    (v) => dot1(100, 126, 13 + v) + box1(94, 132, 12, 30, 6)],
  ["enveloppe", "Enveloppe", "enveloppe courrier lettre mail poste",
    () => rectD(18, 48, 164, 108, 10),
    (v) => ln1(`M 22 ${N(56 + v * 2)} L 100 ${N(110 + v * 2)} L 178 ${N(56 + v * 2)}`, 7) + ln1("M 22 150 L 74 104 M 178 150 L 126 104", 6)],
  ["sac", "Sac", "sac course shopping cabas achat",
    () => "M 30 62 H 170 L 158 180 H 42 Z",
    (v) => ln0(`M 70 62 V ${N(48 - v * 2)} C 70 30 84 20 100 20 C 116 20 130 30 130 ${N(48 - v * 2)} V 62`, 8) + box1(72, 104, 56, 12, 6)],
  ["parapluie", "Parapluie", "parapluie pluie abri meteo",
    () => `M 14 106 C 14 56 52 22 100 22 C 148 22 186 56 186 106 C 172 96 158 96 143 106 C 129 96 114 96 100 106 C 86 96 71 96 57 106 C 42 96 28 96 14 106 Z ${rectD(94, 106, 12, 58)}`,
    (v) => ln0("M 106 164 C 106 182 86 188 74 178", 11) + ln1(`M 57 ${N(104 - v)} C 62 70 76 40 100 24 M 143 ${N(104 - v)} C 138 70 124 40 100 24`, 3)],
  ["lunettes", "Lunettes", "lunettes vue optique verres",
    (v) => `${circD(56, 108, 36)}${holeR(56, 108, 23 + v)} ${circD(144, 108, 36)}${holeR(144, 108, 23 + v)} ${rectD(88, 102, 24, 10, 4)}`,
    () => ln0("M 22 102 L 6 78 M 178 102 L 194 78", 7)],
  ["montrebrac", "Montre", "montre bracelet heure poignet",
    () => `${circD(100, 100, 50)} ${rectD(76, 12, 48, 44, 8)} ${rectD(76, 144, 48, 44, 8)}`,
    () => dot1(100, 100, 38) + ln1("M 100 100 V 76 M 100 100 L 118 112", 5, "D")],
  ["ciseaux", "Ciseaux", "ciseaux couper papier bureau",
    (v) => `M 52 26 L 70 20 L 128 132 L 112 140 Z M 148 26 L 130 20 L 72 132 L 88 140 Z ${circD(66, 160, 26)}${holeR(66, 160, 12 + v)} ${circD(134, 160, 26)}${holeR(134, 160, 12 + v)}`,
    () => dot1(100, 130, 6)],
  ["crayon", "Crayon", "crayon ecrire dessin mine papier",
    () => "M 46 176 L 62 122 L 148 22 L 176 46 L 90 148 Z",
    () => fil1("M 46 176 L 62 122 L 90 148 Z") + fil1("M 148 22 L 176 46 L 160 64 L 132 40 Z", "D")],
  ["pinceau", "Pinceau", "pinceau peinture art atelier",
    () => `${rectD(88, 20, 24, 92, 8)} M 84 112 H 116 L 124 148 C 124 172 76 172 76 148 Z`,
    (v) => box1(80, 104, 40, 14, 6) + fil1(`M 88 166 C 88 ${N(180 + v * 2)} 112 ${N(180 + v * 2)} 112 166 Z`)],
  ["palette", "Palette", "palette peinture couleur artiste",
    (v) => `M 100 24 C 148 24 186 56 186 96 C 186 124 166 136 148 136 C 134 136 128 144 130 154 C 132 168 120 178 100 178 C 54 178 14 146 14 100 C 14 56 52 24 100 24 Z${holeR(134, 90, 14 + v)}`,
    () => dot1(56, 76, 12) + dot1(92, 60, 12) + dot1(48, 118, 12) + dot1(74, 146, 12)],
  ["loupe", "Loupe", "loupe recherche zoom detective",
    (v) => `${circD(88, 84, 58)}${holeR(88, 84, 38 - v * 2)} M 122 126 L 140 108 L 186 154 A 13 13 0 0 1 168 172 Z`,
    () => ""],
  ["boussole", "Boussole", "boussole nord direction orientation",
    () => circD(100, 100, 78),
    () => dot1(100, 100, 62) + fil1("M 100 52 L 116 100 L 100 148 L 84 100 Z", "D") + fil1("M 100 52 L 116 100 L 100 100 Z") + dot1(100, 100, 7)],
  ["valise", "Valise", "valise voyage bagage vacances",
    () => `${rectD(20, 60, 160, 116, 12)} M 74 60 V 42 C 74 32 82 26 92 26 H 108 C 118 26 126 32 126 42 V 60 H 110 V 44 H 90 V 60 Z`,
    (v) => ln1(Array.from({ length: 1 + v }, (_, k) => `M ${N(66 + k * 28)} 62 V 174`).join(" "), 8) + box1(28, 96, 20, 40, 6)],
  ["bougie", "Bougie", "bougie flamme cire lumiere",
    () => `${rectD(66, 70, 68, 114, 10)} ${rectD(52, 174, 96, 16, 7)}`,
    (v) => fil1(`M 100 ${N(18 - v * 2)} C 114 38 124 46 124 60 C 124 74 113 84 100 84 C 87 84 76 74 76 60 C 76 46 86 38 100 ${N(18 - v * 2)} Z`) + ln1("M 100 84 V 72", 4, "D"), FLAME],
  ["cadeau", "Cadeau", "cadeau paquet noel anniversaire",
    () => `${rectD(24, 74, 152, 108, 8)} ${rectD(16, 50, 168, 28, 6)}`,
    (v) => box1(88, 50, 24, 132, 4) + fil1(`M 100 50 C 76 50 56 44 56 ${N(32 - v * 2)} C 56 20 78 22 100 50 Z M 100 50 C 124 50 144 44 144 ${N(32 - v * 2)} C 144 20 122 22 100 50 Z`)],
  ["appareilvintage", "Appareil vintage", "appareil photo vintage retro argentique",
    () => `${rectD(22, 58, 156, 110, 12)} M 72 58 L 82 36 H 118 L 128 58 Z`,
    () => dot1(100, 114, 34) + dot1(100, 114, 20, "D") + dot1(100, 114, 9) + box1(36, 72, 26, 14, 4) + dot1(154, 78, 8)],
]);

/* ── Maison & intérieur ── */
subjects("daily", "home", "maison intérieur meuble déco pièce", [
  ["maison", "Maison", "maison toit foyer habitation logement",
    () => "M 100 18 L 186 92 H 164 V 180 H 36 V 92 H 14 Z",
    (v) => box1(84, 128, 34, 52, 3) + box1(52, 106, 30, 28, 3) + box1(120, 106, 30, 28, 3) + (v > 2 ? box1(138, 42, 18, 30, 3) : "")],
  ["porte", "Porte", "porte entree seuil bois poignee",
    () => rectD(46, 16, 108, 168, 8),
    (v) => box1(58, 30, 84, 140, 5) + dot1(130, 104, 7, "D") + ln1(Array.from({ length: 1 + v }, (_, k) => `M 70 ${N(56 + (k * 100) / (1 + v))} H 130`).join(" "), 5, "D")],
  ["fenetre", "Fenêtre", "fenetre vitre volet lumiere",
    () => rectD(28, 28, 144, 144, 10),
    (v) => box1(40, 40, 120, 120, 5) + ln1("M 100 40 V 160 M 40 100 H 160", 7) + (v > 2 ? ln1("M 30 168 H 170", 8) : "")],
  ["chaise", "Chaise", "chaise siege assise meuble",
    () => `${rectD(50, 20, 22, 108, 8)} ${rectD(128, 20, 22, 108, 8)} ${rectD(40, 108, 120, 20, 8)} ${rectD(44, 128, 16, 56, 6)} ${rectD(140, 128, 16, 56, 6)}`,
    (v) => ln1(Array.from({ length: 2 + v }, (_, k) => `M 74 ${N(40 + (k * 70) / (1 + v))} H 126`).join(" "), 8)],
  ["table", "Table", "table meuble bureau plateau",
    () => `${rectD(14, 66, 172, 22, 8)} ${rectD(30, 88, 18, 96, 6)} ${rectD(152, 88, 18, 96, 6)}`,
    (v) => (v > 1 ? box1(48, 96, 104, 12, 5) : "") + (v > 3 ? box1(84, 30, 32, 36, 6) : "")],
  ["lampe", "Lampe", "lampe lumiere abat jour eclairage",
    () => `M 100 20 L 156 96 H 44 Z ${rectD(94, 96, 12, 70)} ${rectD(60, 166, 80, 16, 8)}`,
    (v) => `<path d="M 52 98 H 148 L ${N(158 + v * 2)} ${N(124 + v * 4)} H ${N(42 - v * 2)} Z" fill="${shd("L", 1)}" opacity="0.5"/>`],
  ["canape", "Canapé", "canape sofa salon assise",
    () => `${rectD(16, 66, 168, 74, 16)} ${rectD(16, 62, 24, 78, 12)} ${rectD(160, 62, 24, 78, 12)} ${rectD(30, 140, 14, 30, 6)} ${rectD(156, 140, 14, 30, 6)}`,
    (v) => box1(48, 78, 46, 34, 8) + box1(106, 78, 46, 34, 8) + (v > 2 ? box1(44, 116, 112, 18, 8) : "")],
  ["lit", "Lit", "lit chambre sommeil dormir matelas",
    () => `${rectD(14, 96, 172, 52, 10)} ${rectD(14, 40, 22, 108, 8)} ${rectD(164, 76, 22, 72, 8)} ${rectD(24, 148, 14, 30, 5)} ${rectD(162, 148, 14, 30, 5)}`,
    () => box1(44, 78, 56, 30, 10) + box1(96, 100, 84, 44, 8)],
  ["plante", "Plante en pot", "plante pot vert interieur deco",
    () => "M 62 122 H 138 L 128 182 H 72 Z",
    (v) => ln0("M 100 122 V 42", 6)
      + fil1(`M 100 ${N(80 - v * 2)} C 72 72 56 48 56 26 C 84 26 100 50 100 ${N(80 - v * 2)} Z`)
      + fil1(`M 100 ${N(98 - v * 2)} C 128 90 144 66 144 44 C 116 44 100 68 100 ${N(98 - v * 2)} Z`), LEAF],
  ["tapis", "Tapis", "tapis sol deco motif salon",
    (v) => ellD(100, 106, 84, 54 + v * 2),
    () => `<g clip-path="url(#sj)">${Array.from({ length: 3 }, (_, k) => `<ellipse cx="100" cy="106" rx="${N(64 - k * 22)}" ry="${N(40 - k * 13)}" fill="none" stroke="${S1}" stroke-width="8"/>`).join("")}</g>`],
  ["miroir", "Miroir", "miroir reflet mural deco",
    () => `${ellD(100, 96, 62, 80)} ${rectD(84, 170, 32, 16, 7)}`,
    () => `<ellipse cx="100" cy="96" rx="50" ry="68" fill="${S1}"/>` + ln1("M 76 62 L 62 108 M 96 58 L 78 114", 7, "L")],
  ["etagere", "Étagère", "etagere rangement livre mur",
    () => `${rectD(22, 26, 156, 14, 5)} ${rectD(22, 92, 156, 14, 5)} ${rectD(22, 158, 156, 14, 5)}`,
    (v) => Array.from({ length: 3 + v }, (_, k) => box1(36 + k * 18, 46 + (k % 2) * 4, 12, 46 - (k % 2) * 6, 3)).join("")
      + Array.from({ length: 2 + v }, (_, k) => box1(106 + (k * 56) / (1 + v), 112, 12, 46, 3)).join("")],
  ["frigo", "Réfrigérateur", "refrigerateur frigo cuisine froid",
    () => rectD(44, 12, 112, 176, 12),
    (v) => ln1("M 44 76 H 156", 6) + box1(132, 40, 10, 26, 5) + box1(132, 88, 10, 26, 5) + (v > 2 ? box1(60, 104, 40, 40, 5) : "")],
  ["machine", "Machine à laver", "machine laver linge lessive",
    () => rectD(30, 20, 140, 168, 12),
    (v) => dot1(100, 118, 44) + dot1(100, 118, 32, "D") + box1(48, 38, 104, 26, 6) + dot1(140, 51, 7) + (v > 2 ? dot1(100, 118, 14, "L") : "")],
  ["baignoire", "Baignoire", "baignoire bain salle de bain",
    () => `M 20 88 H 180 V 130 C 180 156 158 172 128 172 H 72 C 42 172 20 156 20 130 Z ${rectD(28, 46, 12, 42, 5)}`,
    () => ln0("M 34 48 H 62 M 62 48 V 64", 8) + box1(40, 96, 120, 14, 7) + dot1(52, 156, 8)],
  ["cheminee", "Cheminée", "cheminee feu foyer hiver chaleur",
    () => `${rectD(20, 32, 160, 30, 8)} ${rectD(34, 62, 132, 122, 6)}`,
    (v) => box1(60, 92, 80, 92, 8, "D") + fil1(`M 100 ${N(122 - v * 4)} C 112 140 122 148 122 160 C 122 172 112 178 100 178 C 88 178 78 172 78 160 C 78 148 88 140 100 ${N(122 - v * 4)} Z`), FLAME],
]);

// Pictogrammes : des SUJETS dessinés, seul apport réel une fois le catalogue
// déduplicaté par ressemblance — faire varier des paramètres ne produit plus
// que des doublons.
import { PICTO_FAMILIES } from "./design-picto";
import "./design-picto-lot1";
import "./design-picto-lot2";
import "./design-picto-lot3";
import "./design-picto-lot4";
import "./design-picto-lot5";
import "./design-picto-lot6";
import "./design-picto-lot7";
import "./design-picto-lot8";
import "./design-picto-lot9";
import "./design-picto-lot10";
import "./design-picto-lot11";
import "./design-picto-lot12";

export const ELEMENT_FAMILIES: ElementFamily[] = [...FAMILIES, ...(PICTO_FAMILIES as ElementFamily[])];

/** Nombre total d'éléments accessibles via les familles. */
export const FAMILY_TOTAL = FAMILIES.reduce((a, f) => a + f.count, 0);

const FAM_BY_KEY = new Map(FAMILIES.map((f) => [`${f.cat}.${f.id}`, f]));

/* Petit cache : évite de refabriquer un élément à chaque rendu. */
const cache = new Map<string, ElementDef>();
const CACHE_MAX = 4000;

/** Fabrique (ou retrouve) l'élément n° i d'une famille. */
export function familyItem(f: ElementFamily, i: number): ElementDef {
  const id = `${f.cat}.${f.id}~${i}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const { w, h, body, slots } = f.make(i);
  const def: ElementDef = { id, label: f.label, cat: f.cat, w, h, body, keywords: f.kw, slots: slots ?? f.slots };
  if (cache.size > CACHE_MAX) cache.clear();
  cache.set(id, def);
  return def;
}

/** Résout un identifiant `cat.famille~index` (documents enregistrés inclus). */
export function familyElementById(id: string): ElementDef | undefined {
  const at = id.lastIndexOf("~");
  if (at < 0) return undefined;
  const f = FAM_BY_KEY.get(id.slice(0, at));
  if (!f) return undefined;
  const i = Number(id.slice(at + 1));
  if (!Number.isInteger(i) || i < 0 || i >= f.count) return undefined;
  return familyItem(f, i);
}
