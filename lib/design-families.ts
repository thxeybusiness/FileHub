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
  make: (i: number) => { w: number; h: number; body: string };
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
  make: (a: number[], i: number) => { w: number; h: number; body: string },
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
    ["lunes", (x, y, s) => fillp(`M ${N(x + s * 0.3)} ${N(y - s)} A ${N(s)} ${N(s)} 0 1 0 ${N(x + s * 0.3)} ${N(y + s)} A ${N(s * 0.78)} ${N(s * 0.78)} 0 0 1 ${N(x + s * 0.3)} ${N(y - s)} Z`)],
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
    return { w: 200, h: 200, body: st === 0 ? fillWith(d) : st === 1 ? strokeWith(d, 4 + (seed % 5) * 2) : fillp(d) + strokeWith(d, 3, c1()) };
  }, TWO);

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
        : CONT[ci] === "badge" ? fillp(starPts(100, 100, 14, 92, 78))
        : CONT[ci] === "anneau" ? `<circle cx="100" cy="100" r="${N(92 - sw)}" fill="none" stroke="${C}" stroke-width="${N(sw * 1.6)}"/>`
        : CONT[ci] === "losange" ? (filled ? fillp("M 100 6 L 194 100 L 100 194 L 6 100 Z") : stroke("M 100 10 L 190 100 L 100 190 L 10 100 Z", sw))
        : (filled ? fillp(polyPts(100, 100, 6, 92)) : stroke(polyPts(100, 100, 6, 90), sw));
      return { w: 200, h: 200, body: box + inner };
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
    const tx = Math.min(Math.max(24 + ti * 24, 26), bw - 30 - tw);
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
    const gx = 24 + li * 5, gy = 18 + li * 4;
    const RG = `<radialGradient id="q0" cx="${gx}%" cy="${gy}%" r="76%"><stop offset="0" stop-color="__CLL__"/><stop offset="0.55" stop-color="__CM__"/><stop offset="1" stop-color="__CDD__"/></radialGradient>`;
    const LG = `<linearGradient id="q1" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="__CLL__"/><stop offset="1" stop-color="__CDD__"/></linearGradient>`;
    const shine = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${N(cx)}" cy="${N(cy)}" rx="${N(rx)}" ry="${N(ry)}" fill="__CW__" opacity="0.5" transform="rotate(-28 ${N(cx)} ${N(cy)})"/>`;
    const contact = (cy: number, rx: number) => `<ellipse cx="100" cy="${N(cy)}" rx="${N(rx)}" ry="7" fill="__CDD__" opacity="0.22"/>`;
    let body = "";
    if (KINDS[ki] === "sphère") { const R = 74 * k; body = `<defs>${RG}</defs>` + contact(100 + R + 12, R * 0.78) + `<circle cx="100" cy="96" r="${N(R)}" fill="url(#q0)"/>` + shine(100 - R * 0.34, 96 - R * 0.42, R * 0.24, R * 0.16); }
    else if (KINDS[ki] === "cube") { const s = 48 * k, cx = 100, cy = 78; const P = (dx: number, dy: number) => `${N(cx + dx)} ${N(cy + dy)}`;
      body = contact(cy + s * 1.2 + 12, s * 1.05) + `<path d="M ${P(0, -s)} L ${P(s * 1.05, -s * 0.42)} L ${P(0, s * 0.18)} L ${P(-s * 1.05, -s * 0.42)} Z" fill="__CLL__"/><path d="M ${P(-s * 1.05, -s * 0.42)} L ${P(0, s * 0.18)} L ${P(0, s * 1.14)} L ${P(-s * 1.05, s * 0.54)} Z" fill="__CM__"/><path d="M ${P(s * 1.05, -s * 0.42)} L ${P(0, s * 0.18)} L ${P(0, s * 1.14)} L ${P(s * 1.05, s * 0.54)} Z" fill="__CDD__"/>`; }
    else if (KINDS[ki] === "cylindre") { const rx = 44 * k, hh = 44 * k, ry = rx * 0.34;
      body = `<defs>${LG}</defs>` + contact(100 + hh + ry + 10, rx * 0.95) + `<path d="M ${N(100 - rx)} ${N(100 - hh)} V ${N(100 + hh)} A ${N(rx)} ${N(ry)} 0 0 0 ${N(100 + rx)} ${N(100 + hh)} V ${N(100 - hh)} Z" fill="url(#q1)"/><ellipse cx="100" cy="${N(100 - hh)}" rx="${N(rx)}" ry="${N(ry)}" fill="__CLL__"/>`; }
    else if (KINDS[ki] === "cône") { const rx = 44 * k, hh = 56 * k, ry = rx * 0.32;
      body = `<defs>${LG}</defs>` + contact(Math.min(100 + hh + ry + 8, 186), rx * 0.95) + `<path d="M 100 ${N(100 - hh)} L ${N(100 + rx)} ${N(100 + hh)} A ${N(rx)} ${N(ry)} 0 0 1 ${N(100 - rx)} ${N(100 + hh)} Z" fill="url(#q1)"/>`; }
    else if (KINDS[ki] === "tore") { const t = 14 * k + 6, R = 60 * k;
      body = `<defs>${LG}</defs>` + contact(100 + R + 14, R) + `<circle cx="100" cy="96" r="${N(R)}" fill="none" stroke="url(#q1)" stroke-width="${N(t)}"/>`; }
    else if (KINDS[ki] === "pyramide") { const s = 46 * k, hh = 54 * k;
      body = contact(100 + hh + 12, s) + `<path d="M 100 ${N(100 - hh)} L ${N(100 - s)} ${N(100 + hh)} L 100 ${N(100 + hh + s * 0.28)} Z" fill="__CL__"/><path d="M 100 ${N(100 - hh)} L ${N(100 + s)} ${N(100 + hh)} L 100 ${N(100 + hh + s * 0.28)} Z" fill="__CDD__"/>`; }
    else if (KINDS[ki] === "pilule") { const w = 120 * k, h2 = 60 * k;
      body = `<defs>${LG}</defs>` + contact(100 + h2 / 2 + 12, w * 0.44) + `<rect x="${N(100 - w / 2)}" y="${N(100 - h2 / 2)}" width="${N(w)}" height="${N(h2)}" rx="${N(h2 / 2)}" fill="url(#q1)"/>` + `<rect x="${N(100 - w / 2 + 8)}" y="${N(100 - h2 / 2 + 5)}" width="${N(w - 16)}" height="${N(h2 * 0.34)}" rx="${N(h2 * 0.17)}" fill="__CW__" opacity="0.32"/>`; }
    else { const sides = 5 + (seed % 5), R = 80 * k; let g = "";
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
      g += sti === 2 ? `<path d="${d} V ${N(y + amp + 24)} H 8 Z" fill="${C}" opacity="${N(0.9 - r0 * 0.18)}"/>`
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
    else if (KIND[ki] === "damier") { for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) if ((a + b) % 2 === 0) g += `<rect x="${N(a * cell)}" y="${N(b * cell)}" width="${N(cell)}" height="${N(cell)}" fill="${C}"/>`; }
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
    const H = Math.min(140 * stretch, 172), Rw = Math.min(54 * round * (0.9 + r() * 0.2), 92);
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
    let w = 100 + wi * 26, hh = 50 + hi * 16;
    // l'éclat est circulaire : son rayon doit tenir dans la demi-hauteur
    if (shi === 2) { const rmax = 68; w = Math.min(w, rmax * 2); hh = Math.min(hh, rmax * 2); }
    let d = "";
    if (SHAPE[shi] === "languette") d = `M ${N(cx - w / 2)} ${N(cy - hh / 2)} H ${N(cx + w / 2 - 20)} L ${N(cx + w / 2)} ${N(cy)} L ${N(cx + w / 2 - 20)} ${N(cy + hh / 2)} H ${N(cx - w / 2)} Z`;
    else if (SHAPE[shi] === "pilule") d = `M ${N(cx - w / 2 + hh / 2)} ${N(cy - hh / 2)} H ${N(cx + w / 2 - hh / 2)} A ${N(hh / 2)} ${N(hh / 2)} 0 0 1 ${N(cx + w / 2 - hh / 2)} ${N(cy + hh / 2)} H ${N(cx - w / 2 + hh / 2)} A ${N(hh / 2)} ${N(hh / 2)} 0 0 1 ${N(cx - w / 2 + hh / 2)} ${N(cy - hh / 2)} Z`;
    else if (SHAPE[shi] === "éclat") d = starPts(cx, cy, 12, Math.max(w, hh) / 2, Math.max(w, hh) / 2 - 11);
    else if (SHAPE[shi] === "bouclier") d = `M ${N(cx - w / 2)} ${N(cy - hh / 2)} H ${N(cx + w / 2)} V ${N(cy)} C ${N(cx + w / 2)} ${N(cy + hh / 2)} ${N(cx)} ${N(cy + hh / 2 + 8)} ${N(cx)} ${N(cy + hh / 2 + 8)} C ${N(cx)} ${N(cy + hh / 2 + 8)} ${N(cx - w / 2)} ${N(cy + hh / 2)} ${N(cx - w / 2)} ${N(cy)} Z`;
    else if (SHAPE[shi] === "cercle") d = `M ${N(cx - hh / 2)} ${N(cy)} a ${N(hh / 2)} ${N(hh / 2)} 0 1 0 ${N(hh)} 0 a ${N(hh / 2)} ${N(hh / 2)} 0 1 0 ${N(-hh)} 0 Z`;
    else d = `M ${N(cx - w / 2)} ${N(cy - hh / 2)} H ${N(cx + w / 2)} V ${N(cy + hh / 2)} H ${N(cx - w / 2)} Z`;
    const body = sti === 0 ? fillp(d) : sti === 1 ? stroke(d, 6)
      : sti === 2 ? fillp(d) + `<rect x="${N(cx - w / 2)}" y="${N(cy - 7)}" width="${N(w)}" height="14" fill="${c1()}"/>`
      : sti === 3 ? eo(`${d}${holeC(cx - w / 2 + 16, cy, 7)}`)
      : fillp(d) + `<circle cx="${N(cx - w / 2 + 18)}" cy="${N(cy)}" r="7" fill="${c1()}"/>`;
    void seed;
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
    const w = Math.min(120 + wi * 22, 200); // + embouts de 24 px : reste dans 260
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
    const body = TYPE[ti] === "tirets" ? stroke(d, sw, `stroke-dasharray="${N(sw * 3)} ${N(sw * 2)}"`)
      : TYPE[ti] === "pointillé" ? stroke(d, sw, `stroke-dasharray="0.1 ${N(sw * 2.4)}"`)
      : TYPE[ti] === "double" ? stroke(`M 12 ${N(y - amp / 2)} H ${W - 12}`, sw) + stroke(`M 12 ${N(y + amp / 2)} H ${W - 12}`, sw)
      : TYPE[ti] === "perles" ? stroke(d, Math.max(1.5, sw / 2)) + Array.from({ length: seg + 1 }, (_, k) => `<circle cx="${N(12 + k * step)}" cy="${y}" r="${N(sw)}" fill="${C}"/>`).join("")
      : stroke(d, sw);
    return { w: W, h: N(y + amp + 40), body };
  });

export const ELEMENT_FAMILIES: ElementFamily[] = FAMILIES;

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
  const { w, h, body } = f.make(i);
  const def: ElementDef = { id, label: f.label, cat: f.cat, w, h, body, keywords: f.kw, slots: f.slots };
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
