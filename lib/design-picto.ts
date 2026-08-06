// Pictogrammes : un SUJET dessiné, décliné en traitements graphiques.
//
// Pourquoi ce module existe. Le catalogue a été déduplicaté par ressemblance
// visuelle : deux dessins dont moins de 7 cellules sur 64 divergent en vignette
// n'en font qu'un, rotations et miroirs confondus. Faire varier des paramètres
// ne produit donc plus rien — c'est exactement ce qui avait fabriqué des
// dizaines de milliers de doublons. Le seul apport réel, ce sont des SUJETS
// différents : des dessins de choses.
//
// Chaque sujet est décliné en traitements choisis pour être franchement
// distincts les uns des autres (masse pleine, contours, relief, pastilles,
// découpes en négatif, répétitions). Mesuré sur échantillon : 23 des 24
// traitements survivent au filtre, soit ~23 éléments distincts par sujet.
//
// Règles respectées :
//  · une seule couleur à régler, les nuances dérivent d'elle (__CLL__/__CDD__/
//    __CW__) et se recolorent donc avec ;
//  · quand un symbole se pose sur un fond plein, il part d'une couleur
//    CONTRASTÉE dans un second emplacement — sinon il serait invisible tant
//    qu'on n'y touche pas ;
//  · tout tient dans la boîte déclarée, chaque traitement ayant sa propre
//    marge de sécurité selon qu'il épaissit, décale ou déborde le tracé.

import { normalizeSearch, type ElementDef } from "./design-elements";

const C = "__C__";
const N = (n: number) => Math.round(n * 10) / 10;

/* ── Formes de conteneur ── */
const boxD = (x: number, y: number, w: number, h: number, r = 0) =>
  `M ${N(x + r)} ${N(y)} H ${N(x + w - r)} A ${r} ${r} 0 0 1 ${N(x + w)} ${N(y + r)} V ${N(y + h - r)} A ${r} ${r} 0 0 1 ${N(x + w - r)} ${N(y + h)} H ${N(x + r)} A ${r} ${r} 0 0 1 ${N(x)} ${N(y + h - r)} V ${N(y + r)} A ${r} ${r} 0 0 1 ${N(x + r)} ${N(y)} Z`;
const discD = (cx: number, cy: number, r: number) =>
  `M ${N(cx - r)} ${N(cy)} a ${r} ${r} 0 1 0 ${N(2 * r)} 0 a ${r} ${r} 0 1 0 ${N(-2 * r)} 0 Z`;
/** Cercle enroulé À L'ENVERS : évide la forme sans dépendre de fill-rule. */
const holeD = (cx: number, cy: number, r: number) =>
  ` M ${N(cx - r)} ${N(cy)} a ${r} ${r} 0 1 1 ${N(2 * r)} 0 a ${r} ${r} 0 1 1 ${N(-2 * r)} 0 Z`;
const polyD = (cx: number, cy: number, n: number, r: number, rot = -90) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180;
    d += (i ? "L" : "M") + ` ${N(cx + r * Math.cos(a))} ${N(cy + r * Math.sin(a))} `;
  }
  return d + "Z";
};
const starD = (cx: number, cy: number, n: number, ro: number, ri: number) => {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const a = ((-90 + (i * 180) / n) * Math.PI) / 180, r = i % 2 ? ri : ro;
    d += (i ? "L" : "M") + ` ${N(cx + r * Math.cos(a))} ${N(cy + r * Math.sin(a))} `;
  }
  return d + "Z";
};

/* ── Placement ──
   Les sujets sont dessinés dans une boîte 200×200. Chaque traitement replace le
   dessin avec sa propre réduction : un contour épais déborde de la moitié de son
   épaisseur, une ombre portée décale, une répétition démultiplie. Sans ça le
   tracé sortirait du cadre. */
/* Recadrage du sujet.
   Quelques dessins débordent de leur boîte de 200 : le viseur les rognerait.
   Plutôt que de réécrire les coordonnées — ce qui casserait les drapeaux des
   arcs elliptiques — on ajoute une transformation SVG intérieure, mesurée au
   rendu (voir SUJET_CADRE). Vide pour l'immense majorité des sujets. */
let FIT = "";
const fitted = (k: number) => `scale(${N(k)})${FIT ? " " + FIT : ""}`;

const put = (d: string, k: number, dx = 0, dy = 0, paint = C, extra = "") =>
  `<g transform="translate(${N(dx + 100 - 100 * k)} ${N(dy + 100 - 100 * k)}) ${fitted(k)}"><path d="${d}" fill="${paint}"${extra}/></g>`;
const putStroke = (d: string, k: number, sw: number, paint = C, dash = "") =>
  `<g transform="translate(${N(100 - 100 * k)} ${N(100 - 100 * k)}) ${fitted(k)}"><path d="${d}" fill="none" stroke="${paint}" stroke-width="${N(sw / k)}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/></g>`;
const tile = (d: string, x: number, y: number, k: number) =>
  `<g transform="translate(${N(x)} ${N(y)}) ${fitted(k)}"><path d="${d}" fill="${C}"/></g>`;

/** Symbole posé sur un fond plein : il part d'une couleur contrastée. */
const S1 = "__C1~__";
const onBox = (bg: string, d: string, k: number) => `<path d="${bg}" fill="${C}"/>${put(d, k, 0, 0, S1)}`;

/** Signes d'état apposés en pastille : besoins courants d'interface. */
const MARQUES: [string, string, string][] = [
  ["pl", "plus", "M 84 20 H 116 V 84 H 180 V 116 H 116 V 180 H 84 V 116 H 20 V 84 H 84 Z"],
  ["mo", "moins", "M 20 84 H 180 V 116 H 20 Z"],
  ["ok", "coche", "M 24 100 L 44 80 L 82 118 L 156 44 L 176 64 L 82 158 Z"],
  ["kx", "croix", "M 44 24 L 100 80 L 156 24 L 176 44 L 120 100 L 176 156 L 156 176 L 100 120 L 44 176 L 24 156 L 80 100 L 24 44 Z"],
  ["ec", "éclair", "M 118 12 L 62 108 H 96 L 82 188 L 142 88 H 106 Z"],
  ["co", "cœur", "M 100 174 C 40 128 16 92 22 62 C 27 34 54 18 80 28 C 90 33 96 42 100 50 C 104 42 110 33 120 28 C 146 18 173 34 178 62 C 184 92 160 128 100 174 Z"],
  ["et", "étoile", "M 100 12 L 124 76 L 192 76 L 138 116 L 158 182 L 100 142 L 42 182 L 62 116 L 8 76 L 76 76 Z"],
  ["ve", "verrou", "M 44 88 H 156 V 184 H 44 Z M 68 88 V 60 C 68 34 82 18 100 18 C 118 18 132 34 132 60 V 88 H 110 V 60 C 110 46 106 40 100 40 C 94 40 90 46 90 60 V 88 Z"],
  ["ho", "horloge", "M 100 12 a 88 88 0 1 1 0.1 0 Z M 92 44 H 108 V 104 L 152 128 L 144 142 L 92 112 Z"],
  ["in", "interdiction", "M 100 12 a 88 88 0 1 1 0.1 0 Z M 40 40 L 160 160"],
];

type Traitement = { id: string; nom: string; deux: boolean; body: (d: string) => string };

/**
 * Vingt-quatre traitements. `deux` indique qu'un second emplacement de couleur
 * est utilisé (symbole sur fond plein) : il reçoit alors un défaut contrasté.
 */
export const TRAITEMENTS: Traitement[] = [
  { id: "f", nom: "plein", deux: false, body: (d) => put(d, 0.94) },
  { id: "o", nom: "contour", deux: false, body: (d) => putStroke(d, 0.9, 5) },
  { id: "ob", nom: "contour épais", deux: false, body: (d) => putStroke(d, 0.86, 14) },
  { id: "od", nom: "contour pointillé", deux: false, body: (d) => putStroke(d, 0.88, 9, C, "16 12") },
  {
    id: "r", nom: "relief", deux: false,
    body: (d) => `<defs><linearGradient id="pg" x1="0.1" y1="0" x2="0.8" y2="1"><stop offset="0.25" stop-color="__CLL__"/><stop offset="1" stop-color="__CDD__"/></linearGradient></defs>${put(d, 0.94, 0, 0, "url(#pg)")}`,
  },
  { id: "s", nom: "ombre portée", deux: false, body: (d) => put(d, 0.88, 12, 12, "__CDD__") + put(d, 0.88) },
  { id: "sl", nom: "ombre longue", deux: false, body: (d) => put(d, 0.8, 22, 22, "__CDD__") + put(d, 0.8) },
  { id: "cf", nom: "pastille", deux: true, body: (d) => onBox(discD(100, 100, 96), d, 0.62) },
  { id: "co", nom: "pastille contour", deux: false, body: (d) => `<path d="${discD(100, 100, 91)}" fill="none" stroke="${C}" stroke-width="9"/>${put(d, 0.6)}` },
  { id: "qf", nom: "carré", deux: true, body: (d) => onBox(boxD(6, 6, 188, 188, 40), d, 0.6) },
  { id: "qo", nom: "carré contour", deux: false, body: (d) => `<path d="${boxD(11, 11, 178, 178, 36)}" fill="none" stroke="${C}" stroke-width="9"/>${put(d, 0.58)}` },
  { id: "hf", nom: "hexagone", deux: true, body: (d) => onBox(polyD(100, 100, 6, 96), d, 0.56) },
  { id: "lf", nom: "losange", deux: true, body: (d) => onBox(polyD(100, 100, 4, 98), d, 0.5) },
  { id: "bf", nom: "badge", deux: true, body: (d) => onBox(starD(100, 100, 14, 96, 78), d, 0.54) },
  // Découpes : un MASQUE, pas une mise à l'échelle des coordonnées — remettre à
  // l'échelle un tracé nombre par nombre corromprait les arcs, dont les
  // drapeaux (0/1) seraient multipliés eux aussi.
  { id: "nr", nom: "découpe ronde", deux: false, body: (d) => cut(discD(100, 100, 96), d, 0.6, "pmr") },
  { id: "nq", nom: "découpe carrée", deux: false, body: (d) => cut(boxD(6, 6, 188, 188, 40), d, 0.58, "pmq") },
  { id: "nh", nom: "découpe hexagonale", deux: false, body: (d) => cut(polyD(100, 100, 6, 96), d, 0.54, "pmh") },
  { id: "p2", nom: "paire", deux: false, body: (d) => tile(d, 4, 52, 0.46) + tile(d, 100, 52, 0.46) },
  { id: "p3", nom: "trio", deux: false, body: (d) => tile(d, 4, 10, 0.4) + tile(d, 112, 10, 0.4) + tile(d, 58, 104, 0.4) },
  { id: "p4", nom: "quatuor", deux: false, body: (d) => tile(d, 8, 8, 0.42) + tile(d, 108, 8, 0.42) + tile(d, 8, 108, 0.42) + tile(d, 108, 108, 0.42) },
  { id: "sm", nom: "petit", deux: false, body: (d) => put(d, 0.42) },
  { id: "bd", nom: "sur bande", deux: true, body: (d) => `<path d="${boxD(0, 62, 200, 76, 16)}" fill="${C}"/>${put(d, 0.48, 0, 0, S1)}` },
  { id: "ci", nom: "cerclé", deux: false, body: (d) => `<path d="${discD(100, 100, 94)}" fill="none" stroke="${C}" stroke-width="4"/>${put(d, 0.76)}` },
  { id: "pt", nom: "pastille percée", deux: false, body: (d) => `<path fill-rule="evenodd" d="${discD(100, 100, 96)}${holeD(100, 100, 40)}" fill="${C}"/>${put(d, 0.34)}` },

  /* Structures : la disposition change beaucoup de cellules, donc chacune reste
     franchement distincte des autres à la vignette. */
  { id: "tf", nom: "triangle", deux: true, body: (d) => `<path d="${polyD(100, 112, 3, 100)}" fill="${C}"/>${put(d, 0.42, 0, 16, S1)}` },
  { id: "ec", nom: "écusson", deux: true, body: (d) => `<path d="${boxD(28, 8, 144, 120, 12)} M 28 128 L 100 192 L 172 128 Z" fill="${C}"/>${put(d, 0.46, 0, -14, S1)}` },
  { id: "vb", nom: "bandeau vertical", deux: true, body: (d) => `<path d="${boxD(62, 0, 76, 200, 16)}" fill="${C}"/>${put(d, 0.48, 0, 0, S1)}` },
  { id: "d2", nom: "double contour", deux: false, body: (d) => putStroke(d, 0.92, 4) + putStroke(d, 0.7, 4) },
  { id: "g9", nom: "grille de neuf", deux: false, body: (d) => [0, 1, 2].flatMap((r0) => [0, 1, 2].map((c0) => tile(d, 6 + c0 * 64, 6 + r0 * 64, 0.29))).join("") },
  { id: "g6", nom: "grille de six", deux: false, body: (d) => [0, 1].flatMap((r0) => [0, 1, 2].map((c0) => tile(d, 6 + c0 * 64, 30 + r0 * 76, 0.31))).join("") },
  { id: "l3", nom: "rangée de trois", deux: false, body: (d) => [0, 1, 2].map((c0) => tile(d, 4 + c0 * 64, 68, 0.31)).join("") },
  { id: "v2", nom: "empilé", deux: false, body: (d) => tile(d, 52, 4, 0.46) + tile(d, 52, 100, 0.46) },
  { id: "gp", nom: "grand et petit", deux: false, body: (d) => put(d, 0.74, -18, -14) + tile(d, 128, 122, 0.34) },
  { id: "ro", nom: "sur anneau épais", deux: false, body: (d) => `<path d="${discD(100, 100, 82)}" fill="none" stroke="${C}" stroke-width="26"/>${put(d, 0.5)}` },

  /* Pastilles d'état : un pictogramme marqué d'un signe est un besoin réel en
     interface (ajouter, valider, verrouiller…), et le signe occupe assez de
     place pour rester distinct du sujet nu. */
  ...MARQUES.map(([mid, mnom, md]) => ({
    id: `m${mid}`, nom: `avec ${mnom}`, deux: true,
    body: (d: string) => put(d, 0.72, -14, -14) + `<path d="${discD(150, 150, 46)}" fill="${C}"/>` +
      `<g transform="translate(${N(150 - 30)} ${N(150 - 30)}) scale(0.3)"><path d="${md}" fill="${S1}"/></g>`,
  })),
];

/** Conteneur plein dont le sujet est ÉVIDÉ (masque de luminance). */
function cut(bg: string, d: string, k: number, mid: string): string {
  return `<defs><mask id="${mid}"><rect x="0" y="0" width="200" height="200" fill="#fff"/>` +
    `<g transform="translate(${N(100 - 100 * k)} ${N(100 - 100 * k)}) ${fitted(k)}"><path d="${d}" fill="#000"/></g>` +
    `</mask></defs><path d="${bg}" fill="${C}" mask="url(#${mid})"/>`;
}

export type Picto = [slug: string, label: string, kw: string, d: string];

type PictoFamily = {
  id: string; cat: string; label: string; kw: string; count: number;
  slots?: { label: string; def?: string }[];
  make: (i: number) => { w: number; h: number; body: string; slots?: { label: string; def?: string }[] };
};

const DEUX = [{ label: "Couleur principale" }, { label: "Couleur du symbole", def: "#f8fafc" }];
export const PICTO_FAMILIES: PictoFamily[] = [];

/** Inventaire des sujets (slug, tracé) — sert au contrôle de débordement. */
export const PICTO_SUBJECTS: [string, string][] = [];

/** Sujets dont le tracé sort de la boîte : transformation SVG de recadrage,
    mesurée au rendu réel (arcs compris). */
export const SUJET_CADRE: Record<string, string> = {
  accessible: "translate(5.66 5.66) scale(0.9434) translate(3.0 -12.9) scale(0.995)",
  aiguille2: "translate(5.66 5.66) scale(0.9434) translate(2.4 19.9) scale(0.9479)",
  ambulance2: "translate(2.5 -24.5)",
  ancre: "translate(5.66 5.66) scale(0.9434) translate(6.6 27.2) scale(0.939)",
  antennerelais: "translate(0.5 7.5)",
  antennewifi: "translate(0.5 14.5)",
  arbrevie: "translate(5.66 5.66) scale(0.9434) translate(22.3 -15.6) scale(0.7812)",
  assiette: "translate(18.03 18.03) scale(0.8197) translate(0.5 117.0)",
  astronaute: "translate(2.91 2.91) scale(0.9709) translate(23.5 56.2) scale(0.7692)",
  atome: "translate(5.66 5.66) scale(0.9434) translate(33.4 33.4) scale(0.6689)",
  autobus: "translate(0.5 -17.5)",
  balance: "translate(2.91 2.91) scale(0.9709)",
  balance2: "translate(2.91 2.91) scale(0.9709)",
  balancesymbole: "translate(2.91 2.91) scale(0.9709) translate(0.5 -15.5)",
  balayeuse: "translate(7.41 7.41) scale(0.9259)",
  ballonfoot: "translate(18.03 18.03) scale(0.8197) translate(21.0 63.5) scale(0.7937)",
  banjo: "translate(5.66 5.66) scale(0.9434) translate(16.9 -9.3) scale(0.8439)",
  betonniere: "translate(-5.0 -22.5)",
  bijou: "translate(0.5 -40.0)",
  bille: "translate(4.5 -34.5)",
  biodiversite: "translate(5.66 5.66) scale(0.9434) translate(13.5 -33.0) scale(0.8696)",
  camembert: "translate(5.66 5.66) scale(0.9434) translate(24.2 -8.3) scale(0.7547)",
  camionbenne: "translate(-1.5 -32.5)",
  camionlivraison: "translate(2.5 -30.5)",
  cerfvolant2: "translate(5.66 5.66) scale(0.9434)",
  chaine: "translate(13.5 56.5)",
  chariot: "translate(7.41 7.41) scale(0.9259)",
  chasse: "translate(5.66 5.66) scale(0.9434)",
  chenille: "translate(2.91 2.91) scale(0.9709)",
  chrono2: "translate(0.5 50.5)",
  cible: "translate(18.03 18.03) scale(0.8197) translate(0.5 104.0)",
  cisaillescoiffure: "translate(0.5 -16.5)",
  ciseauxcoiffeur: "translate(5.66 5.66) scale(0.9434) translate(5.2 -19.1) scale(0.9524)",
  ciseauxcouture: "translate(2.91 2.91) scale(0.9709) translate(0.5 -15.5)",
  ciseauxpapier: "translate(5.66 5.66) scale(0.9434) translate(1.0 -12.9) scale(0.995)",
  citerne: "translate(2.91 2.91) scale(0.9709)",
  clefmecano: "translate(4.76 4.76) scale(0.9524) translate(-4.0 -10.0)",
  coccinelle: "translate(2.91 2.91) scale(0.9709) translate(0.5 23.0)",
  comete: "translate(0.5 23.5)",
  consommationlocale: "translate(4.76 4.76) scale(0.9524)",
  cor: "translate(5.66 5.66) scale(0.9434) translate(19.9 -17.5) scale(0.9479)",
  cricket: "translate(-1.5 -12.0)",
  depanneuse: "translate(12.5 -22.5)",
  disque2: "translate(0.5 -26.5)",
  empreintecarbone: "translate(2.91 2.91) scale(0.9709)",
  enceinte2: "translate(2.91 2.91) scale(0.9709) translate(0.5 -9.5)",
  engrenagepaire: "translate(2.91 2.91) scale(0.9709)",
  escargot: "translate(0.5 24.5)",
  escargotcoquille: "translate(1.0 -42.5)",
  escrime: "translate(5.66 5.66) scale(0.9434) translate(10.9 -10.9) scale(0.995)",
  fauteuil: "translate(5.66 5.66) scale(0.9434) translate(-21.4 22.9) scale(0.995)",
  fauteuilroulant: "translate(5.66 5.66) scale(0.9434) translate(9.2 -10.1) scale(0.9217)",
  fourgon: "translate(1.5 -35.5)",
  fourgonpompier: "translate(0.5 -22.5)",
  fuseauhorlogedouble: "translate(0.5 -53.0)",
  glace: "translate(4.76 4.76) scale(0.9524) translate(3.4 14.6) scale(0.9709)",
  globe: "translate(21.3 53.0) scale(0.7905)",
  grele: "translate(1.0 21.5)",
  grue2: "translate(5.66 5.66) scale(0.9434)",
  hibou: "translate(0.5 40.0)",
  lapin: "translate(0.5 47.5)",
  livraisonrapide: "translate(7.41 7.41) scale(0.9259)",
  loupe: "translate(2.91 2.91) scale(0.9709) translate(7.2 35.3) scale(0.905)",
  machinelaver: "translate(5.66 5.66) scale(0.9434) translate(4.8 -12.4) scale(0.9569)",
  main: "translate(2.91 2.91) scale(0.9709) translate(-11.0 10.5)",
  manchot: "translate(0.5 53.5)",
  medaille2: "translate(5.66 5.66) scale(0.9434) translate(10.8 -9.9) scale(0.8969)",
  metre: "translate(-12.5 -47.5)",
  microbe: "translate(2.91 2.91) scale(0.9709) translate(23.2 61.8) scale(0.7722)",
  minibus: "translate(2.91 2.91) scale(0.9709)",
  minuteur: "translate(13.04 13.04) scale(0.8696) translate(6.1 75.5) scale(0.9434)",
  moissonneuse: "translate(10.5 -32.5)",
  molecule2: "translate(7.41 7.41) scale(0.9259)",
  montre2: "translate(5.66 5.66) scale(0.9434) translate(0.5 -8.5)",
  moulinhollande: "translate(4.76 4.76) scale(0.9524) translate(0.5 12.5)",
  nacelle: "translate(5.66 5.66) scale(0.9434) translate(-4.5 -18.5)",
  neige2: "translate(5.66 5.66) scale(0.9434) translate(3.4 14.6) scale(0.9756)",
  noeudreseau: "translate(4.76 4.76) scale(0.9524) translate(0.5 -22.5)",
  orage: "translate(5.66 5.66) scale(0.9434) translate(5.3 14.4) scale(0.9569)",
  orbite: "translate(7.41 7.41) scale(0.9259)",
  ours: "translate(0.5 41.5)",
  panierachat: "translate(7.41 7.41) scale(0.9259)",
  partage: "translate(0.5 28.5)",
  partageui: "translate(0.5 -14.5)",
  passagepieton: "translate(2.91 2.91) scale(0.9709)",
  passeport2: "translate(3.85 3.85) scale(0.9615) translate(0.5 11.5)",
  passoire: "translate(3.85 3.85) scale(0.9615)",
  patinsroulettes: "translate(0.5 -17.5)",
  pelleteuse: "translate(-5.0 -25.5)",
  pilule: "translate(-21.5 22.5)",
  planete: "translate(0.5 40.5)",
  pluie: "translate(1.0 17.5)",
  pompier: "translate(4.76 4.76) scale(0.9524) translate(0.5 8.5)",
  pontreseau: "translate(0.5 -40.5)",
  porteengins: "translate(7.41 7.41) scale(0.9259)",
  poussette: "translate(-5.0 -16.5)",
  prise: "translate(18.03 18.03) scale(0.8197) translate(24.9 60.4) scale(0.7547)",
  proxy: "translate(5.66 5.66) scale(0.9434) translate(6.6 -13.1) scale(0.939)",
  raquettetennis: "translate(5.66 5.66) scale(0.9434) translate(10.0 31.7) scale(0.905)",
  remorque: "translate(2.91 2.91) scale(0.9709)",
  repartiteur: "translate(5.66 5.66) scale(0.9434) translate(4.8 5.7) scale(0.9569)",
  rouleaucompresseur: "translate(7.41 7.41) scale(0.9259)",
  saisons: "translate(5.66 5.66) scale(0.9434) translate(17.1 -16.7) scale(0.8333)",
  scanner: "translate(5.66 5.66) scale(0.9434)",
  secheline: "translate(5.66 5.66) scale(0.9434) translate(4.8 -12.4) scale(0.9569)",
  sechesse: "translate(0.5 20.0)",
  semiremorque: "translate(7.41 7.41) scale(0.9259)",
  soleilnuage: "translate(-5.0 19.0)",
  stade: "translate(5.66 5.66) scale(0.9434) translate(18.8 51.4) scale(0.8163)",
  stethometier: "translate(5.66 5.66) scale(0.9434) translate(-8.5 -17.8) scale(0.939)",
  sushi: "translate(0.5 99.0)",
  tapisyoga: "translate(-2.5 40.5)",
  taureau: "translate(2.91 2.91) scale(0.9709) translate(0.5 -13.5)",
  tensiometre: "translate(8.26 8.26) scale(0.9174) translate(25.2 60.1) scale(0.7519)",
  tensiometrebras: "translate(4.76 4.76) scale(0.9524)",
  thermostat: "translate(18.03 18.03) scale(0.8197) translate(26.0 59.5) scale(0.7435)",
  tomate2: "translate(4.76 4.76) scale(0.9524)",
  tracteur2: "translate(5.66 5.66) scale(0.9434)",
  velovert: "translate(5.66 5.66) scale(0.9434) translate(1.0 -18.9) scale(0.995)",
  vigne: "translate(9.09 9.09) scale(0.9091)",
  vinyle: "translate(5.66 5.66) scale(0.9434) translate(18.8 46.5) scale(0.8163)",
  voiturepolice: "translate(9.09 9.09) scale(0.9091)",
  vpn: "translate(5.66 5.66) scale(0.9434) translate(10.0 37.1) scale(0.905)",
  yoga: "translate(0.5 23.5)",
};

/** Enregistre un lot de sujets d'une même catégorie. */
export function pictos(cat: string, kwBase: string, list: Picto[]) {
  for (const [slug, label, kw, d] of list) {
    PICTO_SUBJECTS.push([slug, d]);
    PICTO_FAMILIES.push({
      id: `pic-${slug}`,
      cat,
      label,
      kw: normalizeSearch(`${label} ${kw} ${kwBase}`),
      count: TRAITEMENTS.length,
      make: (i) => {
        const t = TRAITEMENTS[i] ?? TRAITEMENTS[0];
        FIT = SUJET_CADRE[slug] ?? "";
        const body = t.body(d);
        FIT = "";
        return { w: 200, h: 200, body, slots: t.deux ? DEUX : undefined };
      },
    });
  }
}

export type { ElementDef };
