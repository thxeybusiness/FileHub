// API unifiée du catalogue Design.
//
// Deux sources cohabitent :
//  · le catalogue FIXE (design-elements) — dessins écrits un par un, construits
//    à la première demande puis conservés ;
//  · les FAMILLES génératives (design-families) — décrites par un espace de
//    paramètres, dont on ne fabrique que les éléments réellement affichés.
//
// Une troisième pièce s'y ajoute : la table des DOUBLONS DE FORME
// (design-dupes, générée). Un espace de paramètres finit forcément par répéter
// des dessins ; les proposer deux fois n'apporte rien, on croit simplement
// choisir deux fois la même chose. Les doublons sont donc écartés du panneau,
// des comptes et de la recherche — mais restent résolvables par identifiant,
// sinon une création enregistrée perdrait son dessin.
//
// Les consommateurs (panneau, rendu, export) passent tous par ici : ils
// manipulent des pages de résultats, jamais le catalogue entier. La mémoire ne
// dépend donc pas de la taille du catalogue.

import { ELEMENT_CATEGORIES, getElements, elementById as fixedById, type ElementDef } from "./design-elements";
import { ELEMENT_FAMILIES, FAMILY_TOTAL, familyItem, familyElementById, type ElementFamily } from "./design-families";
import { FIXED_DUP, FAMILY_DUP } from "./design-dupes";

export { ELEMENT_CATEGORIES, FAMILY_TOTAL };
export type { ElementDef, ElementFamily };

/** Résolution d'un id, quelle que soit sa provenance (documents enregistrés). */
export function catalogElementById(id: string): ElementDef | undefined {
  return fixedById(id) ?? familyElementById(id);
}

/* ── Doublons de forme ── */

const fixedDupSet = new Set<string>(FIXED_DUP);

/**
 * Plages d'indices masqués d'une famille, avec le cumul de masqués situé avant
 * chaque plage : de quoi passer d'un rang « visible » à l'indice réel sans
 * parcourir l'espace de paramètres.
 */
type DupRanges = { start: number[]; len: number[]; before: number[]; total: number };
const rangeCache = new Map<string, DupRanges | null>();

function ranges(key: string): DupRanges | null {
  const hit = rangeCache.get(key);
  if (hit !== undefined) return hit;
  const spec = FAMILY_DUP[key];
  if (!spec) { rangeCache.set(key, null); return null; }
  const start: number[] = [], len: number[] = [], before: number[] = [];
  let acc = 0;
  for (const part of spec.split(",")) {
    const dash = part.indexOf("-", 1);
    const a = dash < 0 ? Number(part) : Number(part.slice(0, dash));
    const b = dash < 0 ? a : Number(part.slice(dash + 1));
    start.push(a); len.push(b - a + 1); before.push(acc);
    acc += b - a + 1;
  }
  const out = { start, len, before, total: acc };
  rangeCache.set(key, out);
  return out;
}

const famKey = (f: ElementFamily) => `${f.cat}.${f.id}`;
const liveCount = (f: ElementFamily) => f.count - (ranges(famKey(f))?.total ?? 0);

/** Indice réel du n-ième élément NON masqué d'une famille. */
function nthLive(f: ElementFamily, k: number): number {
  const r = ranges(famKey(f));
  if (!r) return k;
  // Dernière plage entièrement située avant le rang visible demandé.
  let lo = 0, hi = r.start.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (r.start[mid] - r.before[mid] <= k) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found < 0 ? k : k + r.before[found] + r.len[found];
}

/* ── Comptages par catégorie (sans rien matérialiser) ── */

let fixedByCat: Map<string, ElementDef[]> | null = null;
function fixedIndex(): Map<string, ElementDef[]> {
  if (!fixedByCat) {
    fixedByCat = new Map();
    for (const e of getElements()) {
      if (fixedDupSet.has(e.id)) continue;          // même dessin déjà proposé
      const arr = fixedByCat.get(e.cat);
      if (arr) arr.push(e); else fixedByCat.set(e.cat, [e]);
    }
  }
  return fixedByCat;
}

const famByCat = new Map<string, ElementFamily[]>();
for (const f of ELEMENT_FAMILIES) {
  const arr = famByCat.get(f.cat);
  if (arr) arr.push(f); else famByCat.set(f.cat, [f]);
}

/** Nombre d'éléments d'une catégorie — calculé, jamais énuméré. */
export function categoryCount(cat: string): number {
  const fixed = fixedIndex().get(cat)?.length ?? 0;
  const gen = (famByCat.get(cat) ?? []).reduce((a, f) => a + liveCount(f), 0);
  return fixed + gen;
}

/** Taille totale du catalogue, doublons écartés. */
export function catalogTotal(): number {
  let n = getElements().length - FIXED_DUP.length;
  for (const f of ELEMENT_FAMILIES) n += liveCount(f);
  return n;
}

/**
 * Page d'éléments d'une catégorie. On sert d'abord le catalogue fixe (dessins
 * soignés), puis les familles — en entrelaçant les familles pour que la page
 * reste variée plutôt que d'aligner 500 variantes de la même chose.
 */
export function categoryPage(cat: string, offset: number, limit: number): ElementDef[] {
  const out: ElementDef[] = [];
  const fixed = fixedIndex().get(cat) ?? [];
  let skip = offset;

  if (skip < fixed.length) {
    for (let i = skip; i < fixed.length && out.length < limit; i++) out.push(fixed[i]);
    skip = 0;
  } else {
    skip -= fixed.length;
  }
  if (out.length >= limit) return out;

  const fams = famByCat.get(cat) ?? [];
  if (!fams.length) return out;

  // Entrelacement : on distribue à tour de rôle, la case n° k allant à la
  // famille k % fams.length. Une famille épuisée ne consomme PAS de rang —
  // sinon les pages se décaleraient et un même élément reparaîtrait sur la
  // suivante. On compte donc les rangs réellement servis, et on ne fabrique
  // le dessin qu'une fois la page atteinte.
  const live = fams.map(liveCount);
  const total = live.reduce((a, b) => a + b, 0);
  const slots = fams.length * Math.max(...live);
  const need = limit - out.length;          // ce qui reste à servir après le fixe
  let served = 0;
  for (let k = 0; k < slots && served < skip + need && served < total; k++) {
    const fi = k % fams.length;
    const rank = (k / fams.length) | 0;
    if (rank >= live[fi]) continue;
    if (served >= skip) out.push(familyItem(fams[fi], nthLive(fams[fi], rank)));
    served++;
  }
  return out;
}

/**
 * Recherche : d'abord dans le catalogue fixe (mots-clés par élément), puis dans
 * les familles dont les mots-clés correspondent — on en déroule alors les
 * premiers éléments, sans jamais parcourir l'espace complet.
 */
export function searchElements(q: string, limit = 180): ElementDef[] {
  if (!q) return [];
  const out: ElementDef[] = [];
  for (const e of getElements()) {
    if (fixedDupSet.has(e.id)) continue;
    if (e.keywords.includes(q)) { out.push(e); if (out.length >= limit) return out; }
  }
  const hits = ELEMENT_FAMILIES.filter((f) => f.kw.includes(q));
  if (!hits.length) return out;
  const perFamily = Math.max(6, Math.ceil((limit - out.length) / hits.length));
  for (const f of hits) {
    const live = liveCount(f);
    for (let i = 0; i < perFamily && i < live && out.length < limit; i++) out.push(familyItem(f, nthLive(f, i)));
    if (out.length >= limit) break;
  }
  return out;
}
