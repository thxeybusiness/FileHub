// Perfection du trait pour l'éditeur de dessin ("Formes parfaites").
//
// Pipeline :
//  1. Pré-traitement : rééchantillonnage régulier, lissage léger,
//     suppression des crochets de début/fin de trait.
//  2. Reconnaissance de forme entière : ligne (accroche 0/45/90°),
//     polyligne, triangle, rectangle (redressé, coins arrondis), polygone,
//     cercle, ellipse — avec un contrôle de fidélité : si la forme
//     reconnue s'éloigne trop du tracé, elle est rejetée.
//  3. Sinon, perfection segment par segment : le tracé est découpé à ses
//     vrais coins (détection stricte, insensible au tremblement), puis
//     chaque morceau devient une droite pure, un arc de cercle EXACT
//     passant par les jonctions, ou une courbe de Bézier lissée
//     (algorithme de Schneider, comme Illustrator) — tangentes continues,
//     zéro tremblement, zéro raccord visible.
//
// Entrée/sortie : points [x, y, pression] normalisés (0..1) ; le format
// de stockage reste inchangé.

export type Pt = [number, number, number];

type V = { x: number; y: number };

const PRESS = 0.5; // pression constante pour les traits corrigés
const DEG = Math.PI / 180;

export function beautifyStroke(points: Pt[], aspect: number): Pt[] | null {
  if (points.length < 4 || !isFinite(aspect) || aspect <= 0) return null;

  // Espace corrigé (x·aspect) : les distances correspondent à l'écran.
  let pts: V[] = [];
  for (const [x, y] of points) {
    const p = { x: x * aspect, y };
    if (pts.length === 0 || dist(p, pts[pts.length - 1]) > 1e-6) pts.push(p);
  }
  if (pts.length < 4) return null;

  const rawLen = pathLength(pts);
  const bb = bounds(pts);
  const diag = Math.hypot(bb.w, bb.h);
  if (rawLen < 0.03 || diag < 0.012) return null;

  // Fermé seulement si le début et la fin se rejoignent VRAIMENT :
  // petit écart à la fois par rapport au trait ET à la taille de la forme
  // (sinon un U/C/V serait refermé de force → traits qui traversent tout).
  const gap = dist(pts[0], pts[pts.length - 1]);
  const closed = gap < 0.15 * rawLen && gap < 0.22 * diag && rawLen > 1.2 * diag;

  // 1. Pré-traitement : rééchantillonnage + lissage léger + dé-crochetage.
  const N = Math.max(24, Math.min(300, Math.round(rawLen / 0.004)));
  let sm = closed ? resampleLoop(pts, N) : resampleOpen(pts, N);
  sm = presmooth(sm, closed);
  if (!closed) sm = dehook(sm);
  const len = pathLength(sm) + (closed ? dist(sm[sm.length - 1], sm[0]) : 0);

  // 2. Forme géométrique entière, validée par un contrôle de fidélité.
  let out = closed ? recognizeClosed(sm, diag) : recognizeOpen(sm, len, diag);
  if (out && out.length > 2 && !faithful(sm, out, diag)) out = null;

  // 3. Perfection du trait libre, segment par segment.
  if (!out) out = perfectFreeform(sm, closed, diag);
  if (!out || out.length < 2) return null;

  const res: Pt[] = [];
  for (const p of out) {
    const q: Pt = [clamp01(p.x / aspect), clamp01(p.y), PRESS];
    const last = res[res.length - 1];
    if (!last || Math.abs(last[0] - q[0]) > 1e-7 || Math.abs(last[1] - q[1]) > 1e-7) {
      res.push(q);
    }
  }
  return res.length >= 2 ? res : null;
}

// ── Pré-traitement ─────────────────────────────────────────────────────────

/** Lissage léger (noyau binomial), assez doux pour préserver les coins. */
function presmooth(sm: V[], closed: boolean, passes = 3): V[] {
  const n = sm.length;
  let p = sm.map((q) => ({ ...q }));
  for (let pass = 0; pass < passes; pass++) {
    const np: V[] = new Array(n);
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) {
        np[i] = p[i];
        continue;
      }
      const a = p[(i - 1 + n) % n];
      const b = p[i];
      const c = p[(i + 1) % n];
      np[i] = { x: (a.x + 2 * b.x + c.x) / 4, y: (a.y + 2 * b.y + c.y) / 4 };
    }
    p = np;
  }
  return p;
}

/** Supprime les petits crochets parasites en début/fin de trait
 * (retournements brefs dus à la pose/levée du stylet). */
function dehook(sm: V[]): V[] {
  const N = sm.length;
  if (N < 24) return sm;
  const total = pathLength(sm);
  const k = Math.max(3, Math.round(N * 0.03));
  const trimStart = (arr: V[]): V[] => {
    if (arr.length < 3 * k) return arr;
    const d1 = sub(arr[k], arr[0]);
    const d2 = sub(arr[2 * k], arr[k]);
    if (
      angleBetween(d1, d2) > 75 * DEG &&
      pathLength(arr.slice(0, k + 1)) < 0.05 * total
    ) {
      return arr.slice(k);
    }
    return arr;
  };
  let a = trimStart(sm);
  a = trimStart(a.slice().reverse()).reverse();
  return a.length >= 8 ? a : sm;
}

/** Fidélité : distance moyenne du tracé à la forme proposée. Rejette les
 * reconnaissances aberrantes (l'accroche d'angle/redressement reste permis). */
function faithful(sm: V[], out: V[], diag: number): boolean {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < sm.length; i += 2) {
    sum += distToPolyline(sm[i], out);
    n++;
  }
  return n > 0 && sum / n < 0.05 * diag;
}

function distToPolyline(p: V, line: V[]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    best = Math.min(best, distToSegment(p, line[i - 1], line[i]));
  }
  return best;
}

// ── Tracés ouverts : ligne droite ou polyligne ─────────────────────────────

function recognizeOpen(pts: V[], len: number, diag: number): V[] | null {
  const a = pts[0];
  const b = pts[pts.length - 1];

  // Ligne droite : tous les points restent proches du segment.
  let maxDev = 0;
  for (const p of pts) maxDev = Math.max(maxDev, distToSegment(p, a, b));
  if (maxDev < Math.max(0.038 * len, 0.009)) {
    return [a, snapAngle(a, b)];
  }

  // Polyligne : quelques sommets nets reliés par des segments droits.
  const simp = rdp(pts, Math.max(0.025 * diag, 0.006));
  if (simp.length >= 3 && simp.length <= 6) {
    // Chaque sommet doit être un vrai coin — sinon c'est une courbe.
    for (let i = 1; i < simp.length - 1; i++) {
      const u = norm(sub(simp[i - 1], simp[i]));
      const w = norm(sub(simp[i + 1], simp[i]));
      if (Math.acos(clampN(dot(u, w), -1, 1)) > 138 * DEG) return null;
    }
    let minSeg = Infinity;
    for (let i = 1; i < simp.length; i++) minSeg = Math.min(minSeg, dist(simp[i - 1], simp[i]));
    if (minSeg < 0.09 * len) return null;
    return simp;
  }
  return null;
}

// ── Tracés fermés : polygone (coins arrondis ?), cercle, ellipse ───────────

function recognizeClosed(pts: V[], diag: number): V[] | null {
  const N = 96;
  const rs = resampleLoop(pts, N);
  const corners = findCorners(rs, N);

  if (corners.length >= 3 && corners.length <= 6) {
    const poly = buildPolygon(rs, corners, diag);
    if (poly) return poly;
  }

  // Cercle/ellipse uniquement s'il n'y a AUCUN coin : une forme avec des
  // coins (un "D" par ex.) passe par la perfection segment par segment.
  if (corners.length === 0) {
    // Cercle : rayon quasi constant autour du centre de gravité.
    const c = centroid(rs);
    const radii = rs.map((p) => dist(p, c));
    const mr = mean(radii);
    if (mr > 0.005) {
      const sd = Math.sqrt(mean(radii.map((r) => (r - mr) ** 2)));
      if (sd / mr < 0.1) return sampleEllipse(c, mr, mr);
    }
    // Ellipse alignée sur la boîte englobante.
    const bb = bounds(rs);
    const cx = bb.x + bb.w / 2;
    const cy = bb.y + bb.h / 2;
    const a = bb.w / 2;
    const b = bb.h / 2;
    if (a > 0.005 && b > 0.005) {
      const errs = rs.map((p) => Math.abs(Math.hypot((p.x - cx) / a, (p.y - cy) / b) - 1));
      if (mean(errs) < 0.1) return sampleEllipse({ x: cx, y: cy }, a, b);
    }
  }
  return null;
}

/** Détecte les coins d'une boucle rééchantillonnée : pics d'angle de virage. */
function findCorners(rs: V[], N: number): number[] {
  const k = 5;
  const turn = new Array<number>(N).fill(0);
  for (let i = 0; i < N; i++) {
    const a = rs[(i - k + N) % N];
    const b = rs[i];
    const c = rs[(i + k) % N];
    turn[i] = angleBetween(sub(b, a), sub(c, b));
  }
  const TH = 52 * DEG;
  const win = Math.round(N / 10);
  const corners: number[] = [];
  for (let i = 0; i < N; i++) {
    if (turn[i] < TH) continue;
    let isMax = true;
    for (let j = 1; j <= win; j++) {
      if (turn[(i + j) % N] > turn[i] || turn[(i - j + N) % N] >= turn[i]) {
        isMax = false;
        break;
      }
    }
    if (isMax) corners.push(i);
  }
  return corners.sort((x, y) => x - y);
}

/** Reconstruit un polygone parfait : côtés = droites ajustées, sommets =
 * intersections. Rectangle redressé si 4 coins ~90°. Coins arrondis si le
 * tracé coupait les angles. */
function buildPolygon(rs: V[], cornerIdx: number[], diag: number): V[] | null {
  const n = cornerIdx.length;
  const N = rs.length;

  const lines: { p: V; d: V }[] = [];
  for (let s = 0; s < n; s++) {
    const i0 = cornerIdx[s];
    const span = (cornerIdx[(s + 1) % n] - i0 + N) % N;
    if (span < 5) return null;
    const seg: V[] = [];
    const from = i0 + Math.round(span * 0.3);
    const to = i0 + Math.round(span * 0.7);
    for (let i = from; i <= to; i++) seg.push(rs[i % N]);
    lines.push(fitLine(seg));
  }

  let verts: V[] = [];
  for (let s = 0; s < n; s++) {
    const X = intersect(lines[(s - 1 + n) % n], lines[s]);
    if (!X || dist(X, rs[cornerIdx[s]]) > 0.25 * diag) return null;
    verts.push(X);
  }

  // Rayon d'arrondi : profondeur de coupe du tracé réel à chaque coin.
  let rSum = 0;
  let nR = 0;
  for (let s = 0; s < n; s++) {
    let cut = Infinity;
    for (let j = -7; j <= 7; j++) {
      cut = Math.min(cut, dist(verts[s], rs[(cornerIdx[s] + j + N) % N]));
    }
    const theta = interiorAngle(verts, s);
    const sh = Math.sin(theta / 2);
    if (sh > 0.15 && sh < 0.999) {
      rSum += (cut * sh) / (1 - sh);
      nR++;
    }
  }
  let radius = nR > 0 && rSum / nR > 0.018 * diag * 2.4 ? rSum / nR : 0;

  if (n === 4 && isRectangle(verts)) verts = perfectRect(verts);

  let minEdge = Infinity;
  for (let s = 0; s < n; s++) minEdge = Math.min(minEdge, dist(verts[s], verts[(s + 1) % n]));
  radius = Math.min(radius, 0.45 * minEdge);

  if (radius > 0.006) return roundedPolygon(verts, radius);
  return [...verts, verts[0]];
}

function interiorAngle(verts: V[], s: number): number {
  const n = verts.length;
  const u = norm(sub(verts[(s - 1 + n) % n], verts[s]));
  const w = norm(sub(verts[(s + 1) % n], verts[s]));
  return Math.acos(clampN(dot(u, w), -1, 1));
}

function isRectangle(verts: V[]): boolean {
  for (let s = 0; s < 4; s++) {
    const a = interiorAngle(verts, s);
    if (a < 72 * DEG || a > 108 * DEG) return false;
  }
  return true;
}

/** Rectangle parfait : orientation dominante des côtés (accrochée à
 * l'horizontale si presque droite), boîte dans le repère tourné. */
function perfectRect(verts: V[]): V[] {
  let sx = 0;
  let sy = 0;
  for (let s = 0; s < 4; s++) {
    const e = sub(verts[(s + 1) % 4], verts[s]);
    const a = Math.atan2(e.y, e.x) * 4;
    const w = Math.hypot(e.x, e.y);
    sx += Math.cos(a) * w;
    sy += Math.sin(a) * w;
  }
  let phi = Math.atan2(sy, sx) / 4;
  if (Math.abs(phi) < 8 * DEG) phi = 0;

  const rot = verts.map((p) => rotate(p, -phi));
  const bb = bounds(rot);
  const rc: V[] = [
    { x: bb.x, y: bb.y },
    { x: bb.x + bb.w, y: bb.y },
    { x: bb.x + bb.w, y: bb.y + bb.h },
    { x: bb.x, y: bb.y + bb.h },
  ];
  let out = rc.map((p) => rotate(p, phi));
  if (polygonArea(verts) < 0) out = [out[0], out[3], out[2], out[1]];
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < 4; i++) {
    const d = dist(out[i], verts[0]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return [...out.slice(best), ...out.slice(0, best)];
}

/** Contour d'un polygone à coins arrondis (arcs échantillonnés). */
function roundedPolygon(verts: V[], r: number): V[] {
  const n = verts.length;
  const out: V[] = [];
  for (let s = 0; s < n; s++) {
    const v = verts[s];
    const vp = verts[(s - 1 + n) % n];
    const vn = verts[(s + 1) % n];
    const din = norm(sub(v, vp));
    const dout = norm(sub(vn, v));
    const theta = Math.acos(clampN(dot({ x: -din.x, y: -din.y }, dout), -1, 1));
    if (theta > 160 * DEG || theta < 15 * DEG) {
      out.push(v);
      continue;
    }
    let t = r / Math.tan(theta / 2);
    const tMax = 0.45 * Math.min(dist(v, vp), dist(vn, v));
    t = Math.min(t, tMax);
    const rr = t * Math.tan(theta / 2);
    const pA = { x: v.x - din.x * t, y: v.y - din.y * t };
    const pB = { x: v.x + dout.x * t, y: v.y + dout.y * t };
    const bis = norm({ x: -din.x + dout.x, y: -din.y + dout.y });
    const center = {
      x: v.x + bis.x * (rr / Math.sin(theta / 2)),
      y: v.y + bis.y * (rr / Math.sin(theta / 2)),
    };
    const a0 = Math.atan2(pA.y - center.y, pA.x - center.x);
    const a1 = Math.atan2(pB.y - center.y, pB.x - center.x);
    const ccw = din.x * dout.y - din.y * dout.x > 0;
    let d = a1 - a0;
    if (ccw && d < 0) d += Math.PI * 2;
    if (!ccw && d > 0) d -= Math.PI * 2;
    const steps = 10;
    for (let j = 0; j <= steps; j++) {
      const ang = a0 + (d * j) / steps;
      out.push({ x: center.x + Math.cos(ang) * rr, y: center.y + Math.sin(ang) * rr });
    }
  }
  out.push(out[0]);
  return out;
}

// ── Perfection du trait libre (segment par segment) ────────────────────────

function perfectFreeform(sm: V[], closed: boolean, diag: number): V[] | null {
  const N = sm.length;
  const corners = strokeCorners(sm, closed);

  const sections: V[][] = [];
  if (closed) {
    if (corners.length === 0) return smoothLoopStrong(sm);
    for (let s = 0; s < corners.length; s++) {
      const i0 = corners[s];
      const span = (corners[(s + 1) % corners.length] - i0 + N) % N || N;
      const sec: V[] = [];
      for (let j = 0; j <= span; j++) sec.push(sm[(i0 + j) % N]);
      sections.push(sec);
    }
  } else {
    const cuts = [0, ...corners.filter((c) => c > 3 && c < N - 4), N - 1];
    for (let s = 0; s < cuts.length - 1; s++) {
      const sec = sm.slice(cuts[s], cuts[s + 1] + 1);
      if (sec.length >= 2) sections.push(sec);
    }
  }

  const out: V[] = [];
  for (const sec of sections) {
    const fitted = fitSection(sec, diag);
    if (out.length > 0) fitted.shift(); // pas de doublon à la jonction
    out.push(...fitted);
  }
  if (closed && out.length > 1 && dist(out[0], out[out.length - 1]) > 1e-9) {
    out.push(out[0]);
  }
  return out.length >= 2 ? out : null;
}

/** Coins d'un trait : stricts et persistants (deux échelles), détectés sur
 * une copie très lissée pour ne JAMAIS se déclencher sur le tremblement. */
function strokeCorners(sm: V[], closed: boolean): number[] {
  const N = sm.length;
  // Copie extra-lissée : les vrais coins (90°) survivent, le bruit non.
  const an = presmooth(sm, closed, 5);
  const k1 = Math.max(2, Math.round(N * 0.03));
  const k2 = 2 * k1;
  const turn1 = new Array<number>(N).fill(0);
  const turn2 = new Array<number>(N).fill(0);
  for (let i = 0; i < N; i++) {
    if (!closed && (i < k2 || i >= N - k2)) continue;
    turn1[i] = angleBetween(
      sub(an[i], an[(i - k1 + N) % N]),
      sub(an[(i + k1) % N], an[i]),
    );
    turn2[i] = angleBetween(
      sub(an[i], an[(i - k2 + N) % N]),
      sub(an[(i + k2) % N], an[i]),
    );
  }
  const win = Math.max(3, Math.round(N * 0.05));
  const cand: number[] = [];
  for (let i = 0; i < N; i++) {
    // Un vrai coin garde un angle fort à TOUTES les échelles :
    // - virage doux qui accumule → extrapolation 2·t1−t2 ≈ 0 (rejeté)
    // - épingle fluide → les sondes larges l'enjambent et t2 retombe
    //   sous ~55° (rejeté) ; aux vrais coins t2 reste ≥ ~77°.
    if (turn1[i] < 55 * DEG || turn2[i] < 60 * DEG) continue;
    if (2 * turn1[i] - turn2[i] < 37 * DEG) continue;
    let isMax = true;
    for (let j = 1; j <= win; j++) {
      if (turn1[(i + j) % N] > turn1[i] || turn1[(i - j + N) % N] >= turn1[i]) {
        isMax = false;
        break;
      }
    }
    if (isMax) cand.push(i);
  }
  // Fusionne les coins trop proches (garde le plus net).
  const minSep = Math.round(N * 0.07);
  const merged: number[] = [];
  for (const c of cand.sort((a, b) => a - b)) {
    const last = merged[merged.length - 1];
    if (last !== undefined && (c - last + N) % N < minSep) {
      if (turn1[c] > turn1[last]) merged[merged.length - 1] = c;
    } else {
      merged.push(c);
    }
  }
  return merged;
}

/** Rend un morceau parfait : droite pure, arc de cercle exact passant par
 * les extrémités, ou courbe de Bézier lissée. Les extrémités sont
 * exactement conservées → aucun raccord visible entre morceaux. */
function fitSection(sec: V[], diag: number): V[] {
  const A = sec[0];
  const B = sec[sec.length - 1];
  const slen = pathLength(sec);
  if (slen < 1e-6 || sec.length < 4 || slen < 0.014) return [A, B];

  // Droite pure ? Tolérance cohérente avec le seuil d'arc (17° de balayage) :
  // toute flèche < 4% de la longueur est un trait voulu droit.
  let maxDev = 0;
  for (const p of sec) maxDev = Math.max(maxDev, distToSegment(p, A, B));
  if (maxDev < Math.max(0.04 * slen, 0.01)) return [A, B];

  // Arc de cercle EXACT par les deux extrémités ? Accepté seulement si ses
  // directions de départ/arrivée collent au tracé réel (sinon l'arc crée un
  // angle à la jonction avec le morceau voisin → Bézier à la place).
  const arc = fitArcThrough(sec);
  if (
    arc &&
    arc.err < Math.max(0.005, 0.012 * slen) &&
    Math.abs(arc.sweep) > 0.3 &&
    Math.abs(arc.sweep) < Math.PI * 1.95 &&
    arc.r < 3 * Math.max(diag, 0.05) &&
    arcEndsMatch(arc, sec)
  ) {
    return sampleArcExact(arc.c, arc.r, A, B, arc.sweep);
  }

  // Courbe lissée : ajustement de Béziers cubiques (Schneider).
  return fitSmoothCurve(sec, slen);
}

/** Les directions de l'arc à ses extrémités collent-elles au tracé ? */
function arcEndsMatch(arc: { c: V; r: number; sweep: number }, sec: V[]): boolean {
  const m = Math.min(5, sec.length - 1);
  const sgn = arc.sweep >= 0 ? 1 : -1;
  const tangentAt = (p: V): V => {
    const rad = norm(sub(p, arc.c));
    return { x: -rad.y * sgn, y: rad.x * sgn };
  };
  const dataStart = norm(sub(sec[m], sec[0]));
  const dataEnd = norm(sub(sec[sec.length - 1], sec[sec.length - 1 - m]));
  const devA = angleBetween(tangentAt(sec[0]), dataStart);
  const devB = angleBetween(tangentAt(sec[sec.length - 1]), dataEnd);
  return devA < 25 * DEG && devB < 25 * DEG;
}

/** Arc passant EXACTEMENT par A et B : centre sur la médiatrice, choisi
 * pour minimiser l'erreur radiale sur tous les points. */
function fitArcThrough(sec: V[]): { c: V; r: number; sweep: number; err: number } | null {
  const A = sec[0];
  const B = sec[sec.length - 1];
  const chord = dist(A, B);
  const slen = pathLength(sec);
  if (chord < 0.25 * slen || chord < 1e-6) return null; // quasi fermé → Bézier

  const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const nHat = norm({ x: -(B.y - A.y), y: B.x - A.x });
  const L = 4 * Math.max(slen, chord);

  const cost = (t: number): number => {
    const c = { x: M.x + nHat.x * t, y: M.y + nHat.y * t };
    const r = dist(c, A);
    let s = 0;
    for (const p of sec) s += (dist(p, c) - r) ** 2;
    return s;
  };

  // Balayage grossier puis affinage par section dorée.
  let bestT = 0;
  let bestF = Infinity;
  for (let i = 0; i <= 40; i++) {
    const t = -L + (2 * L * i) / 40;
    const f = cost(t);
    if (f < bestF) {
      bestF = f;
      bestT = t;
    }
  }
  let lo = bestT - L / 20;
  let hi = bestT + L / 20;
  const GR = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - GR * (hi - lo);
  let x2 = lo + GR * (hi - lo);
  let f1 = cost(x1);
  let f2 = cost(x2);
  for (let i = 0; i < 50; i++) {
    if (f1 < f2) {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - GR * (hi - lo);
      f1 = cost(x1);
    } else {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + GR * (hi - lo);
      f2 = cost(x2);
    }
  }
  const t = (lo + hi) / 2;
  const c = { x: M.x + nHat.x * t, y: M.y + nHat.y * t };
  const r = dist(c, A);
  if (!isFinite(r) || r < 1e-6) return null;
  const err = Math.sqrt(cost(t) / sec.length);
  const sweep = sweepAngle(sec, c);
  return { c, r, sweep, err };
}

/** Rotation totale signée du morceau autour d'un centre (gère > 180°). */
function sweepAngle(sec: V[], c: V): number {
  let total = 0;
  let prev = Math.atan2(sec[0].y - c.y, sec[0].x - c.x);
  for (let i = 1; i < sec.length; i++) {
    const a = Math.atan2(sec[i].y - c.y, sec[i].x - c.x);
    let d = a - prev;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    total += d;
    prev = a;
  }
  return total;
}

/** Échantillonne l'arc de A à B (exactement, A et B sont sur le cercle). */
function sampleArcExact(c: V, r: number, A: V, B: V, dataSweep: number): V[] {
  const a0 = Math.atan2(A.y - c.y, A.x - c.x);
  const aB = Math.atan2(B.y - c.y, B.x - c.x);
  let sweep = aB - a0;
  // Choisit le tour cohérent avec le sens et l'amplitude du tracé.
  const k = Math.round((dataSweep - sweep) / (Math.PI * 2));
  sweep += k * Math.PI * 2;
  const steps = Math.max(8, Math.min(80, Math.round((Math.abs(sweep) * r) / 0.006)));
  const out: V[] = [];
  for (let j = 0; j <= steps; j++) {
    const a = a0 + (sweep * j) / steps;
    out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  out[0] = { ...A };
  out[out.length - 1] = { ...B };
  return out;
}

// ── Courbes de Bézier lissées (algorithme de Schneider) ────────────────────

type Bez = [V, V, V, V];

/** Ajuste une chaîne de Béziers cubiques à tangentes continues sur le
 * morceau, puis l'échantillonne : courbe propre, zéro tremblement. */
function fitSmoothCurve(sec: V[], slen: number): V[] {
  const tol = Math.max(0.0065, Math.min(0.02, 0.015 * slen));
  // Tangentes moyennées sur quelques points : stables face au bruit.
  const m = Math.min(5, sec.length - 1);
  const tHat1 = norm(sub(sec[m], sec[0]));
  const tHat2 = norm(sub(sec[sec.length - 1 - m], sec[sec.length - 1]));
  const bezs: Bez[] = [];
  fitCubic(sec, 0, sec.length - 1, tHat1, tHat2, tol, bezs, 0);
  if (bezs.length === 0) return [sec[0], sec[sec.length - 1]];

  const out: V[] = [];
  for (const bz of bezs) {
    const approxLen =
      dist(bz[0], bz[1]) + dist(bz[1], bz[2]) + dist(bz[2], bz[3]);
    const steps = Math.max(6, Math.min(48, Math.round(approxLen / 0.006)));
    const start = out.length === 0 ? 0 : 1;
    for (let j = start; j <= steps; j++) {
      out.push(bezPoint(bz, j / steps));
    }
  }
  out[0] = { ...sec[0] };
  out[out.length - 1] = { ...sec[sec.length - 1] };
  return out;
}

function fitCubic(
  pts: V[],
  first: number,
  last: number,
  tHat1: V,
  tHat2: V,
  error: number,
  out: Bez[],
  depth: number,
): void {
  if (last - first + 1 === 2 || depth > 24) {
    const d = dist(pts[first], pts[last]) / 3;
    out.push([
      pts[first],
      add(pts[first], mul(tHat1, d)),
      add(pts[last], mul(tHat2, d)),
      pts[last],
    ]);
    return;
  }

  let u = chordParam(pts, first, last);
  let bez = generateBezier(pts, first, last, u, tHat1, tHat2);
  let [maxErr, splitIdx] = computeMaxError(pts, first, last, bez, u);
  if (maxErr < error) {
    out.push(bez);
    return;
  }

  // Re-paramétrage de Newton-Raphson si l'erreur est raisonnable.
  if (maxErr < error * 16) {
    for (let it = 0; it < 5; it++) {
      u = reparameterize(pts, first, last, u, bez);
      bez = generateBezier(pts, first, last, u, tHat1, tHat2);
      [maxErr, splitIdx] = computeMaxError(pts, first, last, bez, u);
      if (maxErr < error) {
        out.push(bez);
        return;
      }
    }
  }

  // Découpe au point d'erreur max, tangente centrale partagée (continuité),
  // estimée sur une fenêtre large pour être insensible au bruit.
  splitIdx = Math.max(first + 1, Math.min(last - 1, splitIdx));
  const wA = Math.max(first, splitIdx - 3);
  const wB = Math.min(last, splitIdx + 3);
  let tC = norm(sub(pts[wA], pts[wB]));
  if (Math.hypot(sub(pts[wA], pts[wB]).x, sub(pts[wA], pts[wB]).y) < 1e-9) {
    tC = norm(sub(pts[splitIdx - 1], pts[splitIdx + 1]));
  }
  fitCubic(pts, first, splitIdx, tHat1, tC, error, out, depth + 1);
  fitCubic(pts, splitIdx, last, { x: -tC.x, y: -tC.y }, tHat2, error, out, depth + 1);
}

/** Moindres carrés pour les deux poignées (Graphics Gems). */
function generateBezier(
  pts: V[],
  first: number,
  last: number,
  u: number[],
  tHat1: V,
  tHat2: V,
): Bez {
  const p0 = pts[first];
  const p3 = pts[last];
  let C00 = 0;
  let C01 = 0;
  let C11 = 0;
  let X0 = 0;
  let X1 = 0;
  for (let i = 0; i < u.length; i++) {
    const t = u[i];
    const omt = 1 - t;
    const b0 = omt * omt * omt;
    const b1 = 3 * t * omt * omt;
    const b2 = 3 * t * t * omt;
    const b3 = t * t * t;
    const a0 = mul(tHat1, b1);
    const a1 = mul(tHat2, b2);
    C00 += dot(a0, a0);
    C01 += dot(a0, a1);
    C11 += dot(a1, a1);
    const tmp = sub(pts[first + i], add(mul(p0, b0 + b1), mul(p3, b2 + b3)));
    X0 += dot(a0, tmp);
    X1 += dot(a1, tmp);
  }
  const det = C00 * C11 - C01 * C01;
  let alphaL = 0;
  let alphaR = 0;
  if (Math.abs(det) > 1e-12) {
    alphaL = (X0 * C11 - X1 * C01) / det;
    alphaR = (C00 * X1 - C01 * X0) / det;
  }
  // Garde-fou : poignées ni négatives/nulles, ni démesurées (système mal
  // conditionné → Bézier "en fuite" qui traverse le dessin).
  const segLen = dist(p0, p3);
  if (
    !isFinite(alphaL) ||
    !isFinite(alphaR) ||
    alphaL < 1e-6 * segLen ||
    alphaR < 1e-6 * segLen ||
    alphaL > 3 * segLen ||
    alphaR > 3 * segLen
  ) {
    alphaL = segLen / 3;
    alphaR = segLen / 3;
  }
  return [p0, add(p0, mul(tHat1, alphaL)), add(p3, mul(tHat2, alphaR)), p3];
}

function chordParam(pts: V[], first: number, last: number): number[] {
  const u = [0];
  for (let i = first + 1; i <= last; i++) {
    u.push(u[u.length - 1] + dist(pts[i], pts[i - 1]));
  }
  const total = u[u.length - 1];
  if (total <= 0) return u.map((_, i) => i / (u.length - 1));
  return u.map((v) => v / total);
}

function computeMaxError(
  pts: V[],
  first: number,
  last: number,
  bez: Bez,
  u: number[],
): [number, number] {
  let maxErr = 0;
  let split = Math.floor((first + last) / 2);
  for (let i = 1; i < u.length - 1; i++) {
    const p = bezPoint(bez, u[i]);
    const d = dist(p, pts[first + i]);
    if (d > maxErr) {
      maxErr = d;
      split = first + i;
    }
  }
  return [maxErr, split];
}

function reparameterize(
  pts: V[],
  first: number,
  last: number,
  u: number[],
  bez: Bez,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < u.length; i++) {
    out.push(newtonRaphson(bez, pts[first + i], u[i]));
  }
  return out;
}

function newtonRaphson(bez: Bez, p: V, t: number): number {
  const q = bezPoint(bez, t);
  const q1 = bezDeriv1(bez, t);
  const q2 = bezDeriv2(bez, t);
  const num = (q.x - p.x) * q1.x + (q.y - p.y) * q1.y;
  const den = q1.x * q1.x + q1.y * q1.y + (q.x - p.x) * q2.x + (q.y - p.y) * q2.y;
  if (Math.abs(den) < 1e-12) return t;
  return clampN(t - num / den, 0, 1);
}

function bezPoint(b: Bez, t: number): V {
  const omt = 1 - t;
  const b0 = omt * omt * omt;
  const b1 = 3 * t * omt * omt;
  const b2 = 3 * t * t * omt;
  const b3 = t * t * t;
  return {
    x: b0 * b[0].x + b1 * b[1].x + b2 * b[2].x + b3 * b[3].x,
    y: b0 * b[0].y + b1 * b[1].y + b2 * b[2].y + b3 * b[3].y,
  };
}

function bezDeriv1(b: Bez, t: number): V {
  const omt = 1 - t;
  return {
    x: 3 * omt * omt * (b[1].x - b[0].x) + 6 * omt * t * (b[2].x - b[1].x) + 3 * t * t * (b[3].x - b[2].x),
    y: 3 * omt * omt * (b[1].y - b[0].y) + 6 * omt * t * (b[2].y - b[1].y) + 3 * t * t * (b[3].y - b[2].y),
  };
}

function bezDeriv2(b: Bez, t: number): V {
  const omt = 1 - t;
  return {
    x: 6 * omt * (b[2].x - 2 * b[1].x + b[0].x) + 6 * t * (b[3].x - 2 * b[2].x + b[1].x),
    y: 6 * omt * (b[2].y - 2 * b[1].y + b[0].y) + 6 * t * (b[3].y - 2 * b[2].y + b[1].y),
  };
}

/** Boucle fermée sans coins : lissage circulaire fort. */
function smoothLoopStrong(sm: V[]): V[] {
  const n = sm.length;
  let p = sm.map((q) => ({ ...q }));
  for (let pass = 0; pass < 6; pass++) {
    const np: V[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = p[(i - 2 + n) % n];
      const b = p[(i - 1 + n) % n];
      const c = p[i];
      const d = p[(i + 1) % n];
      const e = p[(i + 2) % n];
      np[i] = {
        x: (a.x + 4 * b.x + 6 * c.x + 4 * d.x + e.x) / 16,
        y: (a.y + 4 * b.y + 6 * c.y + 4 * d.y + e.y) / 16,
      };
    }
    p = np;
  }
  p.push({ ...p[0] });
  return p;
}

// ── Primitives géométriques ────────────────────────────────────────────────

function sampleEllipse(c: V, a: number, b: number): V[] {
  const out: V[] = [];
  const S = 72;
  for (let i = 0; i <= S; i++) {
    const t = (i / S) * Math.PI * 2;
    out.push({ x: c.x + Math.cos(t) * a, y: c.y + Math.sin(t) * b });
  }
  return out;
}

/** Accroche l'angle d'une ligne à 0/45/90/135° si on en est proche. */
function snapAngle(a: V, b: V): V {
  const d = dist(a, b);
  let ang = Math.atan2(b.y - a.y, b.x - a.x);
  const step = Math.PI / 4;
  const near = Math.round(ang / step) * step;
  if (Math.abs(ang - near) < 7 * DEG) ang = near;
  return { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d };
}

/** Simplification de Ramer–Douglas–Peucker. */
function rdp(pts: V[], eps: number): V[] {
  if (pts.length < 3) return pts.slice();
  const a = pts[0];
  const b = pts[pts.length - 1];
  let iMax = 0;
  let dMax = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distToSegment(pts[i], a, b);
    if (d > dMax) {
      dMax = d;
      iMax = i;
    }
  }
  if (dMax <= eps) return [a, b];
  const left = rdp(pts.slice(0, iMax + 1), eps);
  const right = rdp(pts.slice(iMax), eps);
  return [...left.slice(0, -1), ...right];
}

/** Droite ajustée par moindres carrés (direction principale). */
function fitLine(seg: V[]): { p: V; d: V } {
  const c = centroid(seg);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of seg) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { p: c, d: { x: Math.cos(ang), y: Math.sin(ang) } };
}

function intersect(A: { p: V; d: V }, B: { p: V; d: V }): V | null {
  const den = A.d.x * B.d.y - A.d.y * B.d.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((B.p.x - A.p.x) * B.d.y - (B.p.y - A.p.y) * B.d.x) / den;
  return { x: A.p.x + A.d.x * t, y: A.p.y + A.d.y * t };
}

/** Rééchantillonne une boucle fermée en n points équidistants. */
function resampleLoop(pts: V[], n: number): V[] {
  const loop = [...pts, pts[0]];
  const total = pathLength(loop);
  if (total <= 0) return new Array<V>(n).fill(pts[0]);
  const step = total / n;
  const out: V[] = [pts[0]];
  let acc = 0;
  let i = 1;
  let prev = loop[0];
  while (out.length < n && i < loop.length) {
    const d = dist(prev, loop[i]);
    if (acc + d >= step && d > 0) {
      const t = (step - acc) / d;
      const np = { x: prev.x + (loop[i].x - prev.x) * t, y: prev.y + (loop[i].y - prev.y) * t };
      out.push(np);
      prev = np;
      acc = 0;
    } else {
      acc += d;
      prev = loop[i];
      i++;
    }
  }
  while (out.length < n) out.push(pts[0]);
  return out;
}

/** Rééchantillonne un trait ouvert en n points équidistants. */
function resampleOpen(pts: V[], n: number): V[] {
  const total = pathLength(pts);
  if (total <= 0) return new Array<V>(n).fill(pts[0]);
  const step = total / (n - 1);
  const out: V[] = [pts[0]];
  let acc = 0;
  let i = 1;
  let prev = pts[0];
  while (out.length < n - 1 && i < pts.length) {
    const d = dist(prev, pts[i]);
    if (acc + d >= step && d > 0) {
      const t = (step - acc) / d;
      const np = { x: prev.x + (pts[i].x - prev.x) * t, y: prev.y + (pts[i].y - prev.y) * t };
      out.push(np);
      prev = np;
      acc = 0;
    } else {
      acc += d;
      prev = pts[i];
      i++;
    }
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out;
}

function distToSegment(p: V, a: V, b: V): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  const t = clampN(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function polygonArea(v: V[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const a = v[i];
    const b = v[(i + 1) % v.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

function angleBetween(u: V, w: V): number {
  const lu = Math.hypot(u.x, u.y);
  const lw = Math.hypot(w.x, w.y);
  if (lu === 0 || lw === 0) return 0;
  return Math.acos(clampN((u.x * w.x + u.y * w.y) / (lu * lw), -1, 1));
}

function rotate(p: V, ang: number): V {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function pathLength(p: V[]): number {
  let l = 0;
  for (let i = 1; i < p.length; i++) l += dist(p[i - 1], p[i]);
  return l;
}

function bounds(p: V[]): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const q of p) {
    x0 = Math.min(x0, q.x);
    y0 = Math.min(y0, q.y);
    x1 = Math.max(x1, q.x);
    y1 = Math.max(y1, q.y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function centroid(p: V[]): V {
  let x = 0;
  let y = 0;
  for (const q of p) {
    x += q.x;
    y += q.y;
  }
  return { x: x / p.length, y: y / p.length };
}

function mean(a: number[]): number {
  return a.reduce((s, v) => s + v, 0) / a.length;
}

const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (v: V, s: number): V => ({ x: v.x * s, y: v.y * s });
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y;
const norm = (v: V): V => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};
const clampN = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);
const clamp01 = (n: number) => clampN(n, 0, 1);
