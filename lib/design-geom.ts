// Primitives géométriques partagées par le catalogue fixe (design-elements)
// et les familles génératives (design-families). Pures et déterministes.

export const C = "__C__";
export const N = (n: number) => Math.round(n * 10) / 10;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  let d = `M ${N(pts[0][0])} ${N(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C ${N(p1[0] + (p2[0] - p0[0]) / 6)} ${N(p1[1] + (p2[1] - p0[1]) / 6)} ${N(p2[0] - (p3[0] - p1[0]) / 6)} ${N(p2[1] - (p3[1] - p1[1]) / 6)} ${N(p2[0])} ${N(p2[1])}`;
  }
  return d + " Z";
}

export function starPts(cx: number, cy: number, points: number, rOut: number, rIn: number, rot = -90): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const [x, y] = polar(cx, cy, i % 2 === 0 ? rOut : rIn, rot + (i * 180) / points);
    d += (i === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
  }
  return d + "Z";
}

export function polyPts(cx: number, cy: number, sides: number, r: number, rot = -90): string {
  let d = "";
  for (let i = 0; i < sides; i++) {
    const [x, y] = polar(cx, cy, r, rot + (i * 360) / sides);
    d += (i === 0 ? "M" : "L") + ` ${N(x)} ${N(y)} `;
  }
  return d + "Z";
}

export function arrowHead(x: number, y: number, angRad: number, size: number): string {
  const p = (da: number) => `${N(x + size * Math.cos(angRad + da))} ${N(y + size * Math.sin(angRad + da))}`;
  return `<path d="M ${p(0)} L ${p(2.6)} L ${p(-2.6)} Z" fill="${C}"/>`;
}

export const stroke = (d: string, sw: number, extra = "") =>
  `<path d="${d}" fill="none" stroke="${C}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
export const fillp = (d: string, extra = "") => `<path d="${d}" fill="${C}" ${extra}/>`;
// Tracé plein avec « trou » (évidement) : même couleur, découpe transparente
// via fill-rule evenodd — respecte la règle d'or (une seule couleur).
export const eo = (d: string, extra = "") => `<path fill-rule="evenodd" d="${d}" fill="${C}" ${extra}/>`;
// Sous-tracé circulaire inverse pour créer un trou dans un eo(...).
export const holeC = (cx: number, cy: number, r: number) => ` M ${N(cx - r)} ${N(cy)} a ${r} ${r} 0 1 0 ${N(2 * r)} 0 a ${r} ${r} 0 1 0 ${N(-2 * r)} 0 Z`;
// Nuance interne : même couleur en opacité réduite.
export const op = (d: string, o: number, extra = "") => `<path d="${d}" fill="${C}" opacity="${o}" ${extra}/>`;
export const opc = (cx: number, cy: number, r: number, o: number) => `<circle cx="${N(cx)}" cy="${N(cy)}" r="${N(r)}" fill="${C}" opacity="${o}"/>`;


/* Peinture EXPLICITE : à utiliser dès qu'une partie doit prendre une couleur
   autre que le jeton principal. Évite l'attribut `fill`/`stroke` en double
   qu'on obtient en passant une peinture via `extra` (SVG alors invalide). */
export const fillWith = (d: string, paint: string = C, extra = "") => `<path d="${d}" fill="${paint}" ${extra}/>`;
export const strokeWith = (d: string, sw: number, paint: string = C, extra = "") =>
  `<path d="${d}" fill="none" stroke="${paint}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
