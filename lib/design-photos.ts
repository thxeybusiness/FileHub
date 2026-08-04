// Banque de photos du studio Design — images RÉELLES sous licence CC0
// (domaine public : usage commercial libre, sans attribution, sans restriction
// de redistribution). Récupérées via Openverse, redimensionnées et servies
// depuis /public/stock — donc en même origine, compatible avec la CSP stricte.
//
// Ces photos ne sont PAS recolorables : on les insère telles quelles, comme une
// image importée (filtres, rognage, ombre et export passent par le calque image).

export type StockPhoto = {
  id: string;
  cat: string;
  label: string;
  w: number;
  h: number;
  kw: string; // mots-clés normalisés (sans accents) pour la recherche
};

export const PHOTO_CATEGORIES: { id: string; label: string }[] = [
  { id: "nature", label: "Nature" },
  { id: "food", label: "Nourriture" },
  { id: "animals", label: "Animaux" },
  { id: "sport", label: "Sport" },
  { id: "city", label: "Ville & voyage" },
  { id: "objects", label: "Objets" },
  { id: "tech", label: "Tech" },
  { id: "weather", label: "Météo & ciel" },
  { id: "texture", label: "Textures & fonds" },
  { id: "business", label: "Bureau & travail" },
  { id: "people", label: "Personnes" },
  { id: "interior", label: "Intérieur & déco" },
  { id: "travel", label: "Voyage & monuments" },
  { id: "abstract", label: "Abstrait & fonds" },
  { id: "art", label: "Musique & art" },
  { id: "school", label: "École & étude" },
  { id: "health", label: "Bien-être & santé" },
  { id: "daily", label: "Objets du quotidien" },
];

/* Le catalogue lui-même (plusieurs milliers d'entrées) N'EST PAS empaqueté dans
   le bundle : il est servi en JSON statique et chargé à la première ouverture
   de l'onglet Photos, puis gardé en mémoire. */
let cache: StockPhoto[] | null = null;
let inflight: Promise<StockPhoto[]> | null = null;

export function loadPhotos(): Promise<StockPhoto[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/stock/photos.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((rows: StockPhoto[]) => { cache = rows; return rows; })
    .catch(() => { inflight = null; return []; });
  return inflight;
}

/** Catalogue déjà chargé (vide tant que loadPhotos() n'a pas abouti). */
export function photosNow(): StockPhoto[] {
  return cache ?? [];
}

/** URL de la photo (même origine — pas de ressource externe). */
export function photoSrc(p: StockPhoto): string {
  return `/stock/${p.id}.webp`;
}
