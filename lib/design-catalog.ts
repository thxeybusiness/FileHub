// API unifiée du catalogue Design.
//
// Deux sources cohabitent :
//  · le catalogue FIXE (design-elements) — dessins écrits un par un, construits
//    à la première demande puis conservés ;
//  · les FAMILLES génératives (design-families) — décrites par un espace de
//    paramètres, dont on ne fabrique que les éléments réellement affichés.
//
// Les consommateurs (panneau, rendu, export) passent tous par ici : ils
// manipulent des pages de résultats, jamais le catalogue entier. La mémoire ne
// dépend donc pas de la taille du catalogue.

import { ELEMENT_CATEGORIES, getElements, elementById as fixedById, type ElementDef } from "./design-elements";
import { ELEMENT_FAMILIES, FAMILY_TOTAL, familyItem, familyElementById, type ElementFamily } from "./design-families";

export { ELEMENT_CATEGORIES, FAMILY_TOTAL };
export type { ElementDef, ElementFamily };

/** Résolution d'un id, quelle que soit sa provenance (documents enregistrés). */
export function catalogElementById(id: string): ElementDef | undefined {
  return fixedById(id) ?? familyElementById(id);
}

/* ── Comptages par catégorie (sans rien matérialiser) ── */

let fixedByCat: Map<string, ElementDef[]> | null = null;
function fixedIndex(): Map<string, ElementDef[]> {
  if (!fixedByCat) {
    fixedByCat = new Map();
    for (const e of getElements()) {
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
  const gen = (famByCat.get(cat) ?? []).reduce((a, f) => a + f.count, 0);
  return fixed + gen;
}

/** Taille totale du catalogue (fixe + génératif). */
export function catalogTotal(): number {
  return getElements().length + FAMILY_TOTAL;
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

  // Entrelacement : l'élément n° k va à la famille k % fams.length, à l'indice
  // k / fams.length (borné par la taille de chaque famille).
  const total = fams.reduce((a, f) => a + f.count, 0);
  let k = skip;
  while (out.length < limit && k < total) {
    const fi = k % fams.length;
    const f = fams[fi];
    const idx = Math.floor(k / fams.length);
    if (idx < f.count) out.push(familyItem(f, idx));
    k++;
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
    if (e.keywords.includes(q)) { out.push(e); if (out.length >= limit) return out; }
  }
  const hits = ELEMENT_FAMILIES.filter((f) => f.kw.includes(q));
  if (!hits.length) return out;
  const perFamily = Math.max(6, Math.ceil((limit - out.length) / hits.length));
  for (const f of hits) {
    for (let i = 0; i < perFamily && i < f.count && out.length < limit; i++) out.push(familyItem(f, i));
    if (out.length >= limit) break;
  }
  return out;
}
