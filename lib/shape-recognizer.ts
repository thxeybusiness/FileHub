// Reconnaissance de formes pour l'éditeur de dessin ("Formes parfaites").
// Transforme un trait dessiné à main levée en forme géométrique parfaite :
// ligne droite (avec accroche 0/45/90°), polyligne, triangle, rectangle
// (redressé), polygone, cercle, ellipse — et si les coins du tracé sont
// arrondis, ils sont reproduits par des arrondis parfaits.
//
// Entrée/sortie : tableau de points [x, y, pression] normalisés (0..1),
// donc le format de stockage reste inchangé.

export type Pt = [number, number, number];

type V = { x: number; y: number };

const PRESS = 0.5; // pression constante pour les formes corrigées
const DEG = Math.PI / 180;

/** Tente de reconnaître une forme. Renvoie les points corrigés, ou null
 * si le trait ne ressemble à aucune forme (il reste alors à main levée).
 * `aspect` = largeur/hauteur réelle de la toile, pour que les distances
 * soient mesurées dans l'espace visible (un cercle à l'écran reste un cercle). */
export function beautifyStroke(points: Pt[], aspect: number): Pt[] | null {
  if (points.length < 6 || !isFinite(aspect) || aspect <= 0) return null;
  const pts: V[] = points.map(([x, y]) => ({ x: x * aspect, y }));
  const len = pathLength(pts);
  const bb = bounds(pts);
  const diag = Math.hypot(bb.w, bb.h);
  if (len < 0.04 || diag < 0.015) return null;

  const gap = dist(pts[0], pts[pts.length - 1]);
  const closed = gap < 0.22 * len && len > 1.25 * diag;

  // 1. Forme géométrique entière (ligne, polygone, cercle, ellipse…)
  let out = closed ? recognizeClosed(pts, diag) : recognizeOpen(pts, len, diag);
  // 2. Sinon : perfection du trait libre — découpage aux coins, chaque
  // morceau devient une droite pure, un arc de cercle parfait ou une
  // courbe lissée. Aucune imperfection ne passe.
  if (!out) out = perfectFreeform(pts, closed, diag);
  if (!out || out.length < 2) return null;
  return out.map((p) => [clamp01(p.x / aspect), clamp01(p.y), PRESS] as Pt);
}

// ── Tracés ouverts : ligne droite ou polyligne ─────────────────────────────

function recognizeOpen(pts: V[], len: number, diag: number): V[] | null {
  const a = pts[0];
  const b = pts[pts.length - 1];

  // Ligne droite : tous les points restent proches du segment.
  let maxDev = 0;
  for (const p of pts) maxDev = Math.max(maxDev, distToSegment(p, a, b));
  if (maxDev < Math.max(0.035 * len, 0.006)) {
    return [a, snapAngle(a, b)];
  }

  // Polyligne : quelques sommets nets reliés par des segments droits.
  const simp = rdp(pts, Math.max(0.025 * diag, 0.006));
  if (simp.length >= 3 && simp.length <= 6) {
    // Chaque sommet doit être un vrai coin — sinon c'est une courbe,
    // et on ne veut pas transformer une courbe en segments.
    for (let i = 1; i < simp.length - 1; i++) {
      const u = norm(sub(simp[i - 1], simp[i]));
      const w = norm(sub(simp[i + 1], simp[i]));
      if (Math.acos(clampN(dot(u, w), -1, 1)) > 145 * DEG) return null;
    }
    let minSeg = Infinity;
    for (let i = 1; i < simp.length; i++) minSeg = Math.min(minSeg, dist(simp[i - 1], simp[i]));
    if (minSeg < 0.08 * len) return null;
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
  // coins (un "D" par ex.) doit passer par la perfection segment par segment.
  if (corners.length === 0) {
    // Cercle : rayon quasi constant autour du centre de gravité.
    const c = centroid(rs);
    const radii = rs.map((p) => dist(p, c));
    const mr = mean(radii);
    if (mr > 0.005) {
      const sd = Math.sqrt(mean(radii.map((r) => (r - mr) ** 2)));
      if (sd / mr < 0.12) return sampleEllipse(c, mr, mr);
    }
    // Ellipse alignée sur la boîte englobante.
    const bb = bounds(rs);
    const cx = bb.x + bb.w / 2;
    const cy = bb.y + bb.h / 2;
    const a = bb.w / 2;
    const b = bb.h / 2;
    if (a > 0.005 && b > 0.005) {
      const errs = rs.map((p) => Math.abs(Math.hypot((p.x - cx) / a, (p.y - cy) / b) - 1));
      if (mean(errs) < 0.13) return sampleEllipse({ x: cx, y: cy }, a, b);
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
  const TH = 52 * DEG; // au-dessus du "virage de fond" d'un cercle
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

  // Droite ajustée sur le cœur de chaque côté (on fuit les coins arrondis).
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

  // Sommets nets = intersections des droites adjacentes.
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
  let radius = nR > 0 && rSum / nR > (0.018 * diag * 2.4) ? rSum / nR : 0;

  // Rectangle : 4 coins à ~90° → parfaitement redressé.
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
  // Conserve le sens de parcours et le sommet de départ d'origine
  // (important pour la direction des arrondis).
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
// Découpe le tracé aux coins, puis rend chaque morceau parfait :
// droite pure, arc de cercle parfait (moindres carrés) ou courbe lissée.
// Les jonctions sont exactement conservées → un "D" devient un dos
// parfaitement droit + un arrondi parfaitement circulaire.

function perfectFreeform(pts: V[], closed: boolean, diag: number): V[] | null {
  const total = pathLength(pts) + (closed ? dist(pts[pts.length - 1], pts[0]) : 0);
  if (total < 0.02) return null;
  const N = Math.max(48, Math.min(220, Math.round(total / 0.006)));
  const rs = closed ? resampleLoop(pts, N) : resampleOpen(pts, N);
  const corners = strokeCorners(rs, closed);

  const segs: V[][] = [];
  if (closed) {
    if (corners.length === 0) return smoothLoop(rs);
    for (let s = 0; s < corners.length; s++) {
      const i0 = corners[s];
      const span = (corners[(s + 1) % corners.length] - i0 + N) % N || N;
      const seg: V[] = [];
      for (let j = 0; j <= span; j++) seg.push(rs[(i0 + j) % N]);
      segs.push(seg);
    }
  } else {
    const cuts = [0, ...corners.filter((c) => c > 2 && c < N - 3), N - 1];
    for (let s = 0; s < cuts.length - 1; s++) {
      const seg = rs.slice(cuts[s], cuts[s + 1] + 1);
      if (seg.length >= 2) segs.push(seg);
    }
  }

  const out: V[] = [];
  for (const seg of segs) {
    const fitted = fitSegment(seg, diag);
    if (out.length > 0) fitted.shift(); // pas de doublon à la jonction
    out.push(...fitted);
  }
  if (closed && out.length > 1 && dist(out[0], out[out.length - 1]) > 1e-9) {
    out.push(out[0]);
  }
  return out.length >= 2 ? out : null;
}

/** Coins d'un trait (ouvert ou fermé) : pics de l'angle de virage. */
function strokeCorners(rs: V[], closed: boolean): number[] {
  const N = rs.length;
  const k = Math.max(3, Math.round(N * 0.04));
  // Seuil au-dessus du "virage de fond" d'un cercle échantillonné.
  const TH = Math.max(48 * DEG, (4 * Math.PI * k) / N + 18 * DEG);
  const turn = new Array<number>(N).fill(0);
  for (let i = 0; i < N; i++) {
    if (!closed && (i < k || i >= N - k)) continue;
    const a = rs[(i - k + N) % N];
    const c = rs[(i + k) % N];
    turn[i] = angleBetween(sub(rs[i], a), sub(c, rs[i]));
  }
  const win = Math.max(2, Math.round(N * 0.05));
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
  return corners.sort((a, b) => a - b);
}

/** Rend un morceau parfait : droite, arc de cercle, ou courbe lissée.
 * Les extrémités du morceau sont exactement conservées. */
function fitSegment(seg: V[], diag: number): V[] {
  const A = seg[0];
  const B = seg[seg.length - 1];
  const slen = pathLength(seg);
  if (slen < 1e-6 || seg.length < 3) return [A, B];

  // Droite pure ?
  let maxDev = 0;
  for (const p of seg) maxDev = Math.max(maxDev, distToSegment(p, A, B));
  if (maxDev < Math.max(0.03 * slen, 0.005)) return [A, B];

  // Arc de cercle parfait ?
  const fit = fitCircle(seg);
  if (fit && fit.r < 4 * Math.max(diag, 0.05)) {
    let err = 0;
    for (const p of seg) err += (dist(p, fit.c) - fit.r) ** 2;
    err = Math.sqrt(err / seg.length);
    const sweep = sweepAngle(seg, fit.c);
    if (err < Math.max(0.03 * fit.r, 0.0045) && Math.abs(sweep) > 0.3) {
      return sampleArcPinned(fit, sweep, A, B);
    }
  }

  // Sinon : courbe librement dessinée → lissage fort (zéro tremblement).
  return smoothOpen(seg);
}

/** Ajustement de cercle par moindres carrés (méthode de Kåsa). */
function fitCircle(seg: V[]): { c: V; r: number } | null {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  const n = seg.length;
  for (const p of seg) {
    const z = p.x * p.x + p.y * p.y;
    sx += p.x; sy += p.y; sz += z;
    sxx += p.x * p.x; syy += p.y * p.y; sxy += p.x * p.y;
    sxz += p.x * z; syz += p.y * z;
  }
  // Système normal pour x²+y² + D·x + E·y + F = 0
  const a11 = sxx, a12 = sxy, a13 = sx;
  const a22 = syy, a23 = sy, a33 = n;
  const b1 = -sxz, b2 = -syz, b3 = -sz;
  const det =
    a11 * (a22 * a33 - a23 * a23) -
    a12 * (a12 * a33 - a23 * a13) +
    a13 * (a12 * a23 - a22 * a13);
  if (Math.abs(det) < 1e-12) return null;
  const D =
    (b1 * (a22 * a33 - a23 * a23) -
      a12 * (b2 * a33 - a23 * b3) +
      a13 * (b2 * a23 - a22 * b3)) / det;
  const E =
    (a11 * (b2 * a33 - a23 * b3) -
      b1 * (a12 * a33 - a23 * a13) +
      a13 * (a12 * b3 - b2 * a13)) / det;
  const F =
    (a11 * (a22 * b3 - b2 * a23) -
      a12 * (a12 * b3 - b2 * a13) +
      b1 * (a12 * a23 - a22 * a13)) / det;
  const cx = -D / 2;
  const cy = -E / 2;
  const r2 = cx * cx + cy * cy - F;
  if (!isFinite(r2) || r2 <= 0) return null;
  return { c: { x: cx, y: cy }, r: Math.sqrt(r2) };
}

/** Rotation totale signée du morceau autour d'un centre (gère > 180°). */
function sweepAngle(seg: V[], c: V): number {
  let total = 0;
  let prev = Math.atan2(seg[0].y - c.y, seg[0].x - c.x);
  for (let i = 1; i < seg.length; i++) {
    const a = Math.atan2(seg[i].y - c.y, seg[i].x - c.x);
    let d = a - prev;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    total += d;
    prev = a;
  }
  return total;
}

/** Échantillonne l'arc parfait, épinglé exactement aux extrémités A/B. */
function sampleArcPinned(fit: { c: V; r: number }, sweep: number, A: V, B: V): V[] {
  const a0 = Math.atan2(A.y - fit.c.y, A.x - fit.c.x);
  const steps = Math.max(8, Math.min(64, Math.round((Math.abs(sweep) * fit.r) / 0.008)));
  const raw: V[] = [];
  for (let j = 0; j <= steps; j++) {
    const a = a0 + (sweep * j) / steps;
    raw.push({ x: fit.c.x + Math.cos(a) * fit.r, y: fit.c.y + Math.sin(a) * fit.r });
  }
  // Petite correction répartie pour que l'arc parte de A et finisse à B.
  const d0 = sub(A, raw[0]);
  const d1 = sub(B, raw[raw.length - 1]);
  return raw.map((p, j) => {
    const t = j / steps;
    return { x: p.x + d0.x * (1 - t) + d1.x * t, y: p.y + d0.y * (1 - t) + d1.y * t };
  });
}

/** Lissage fort d'un morceau ouvert (extrémités figées). */
function smoothOpen(seg: V[]): V[] {
  const p = seg.map((q) => ({ ...q }));
  const n = p.length;
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < n - 1; i++) {
      p[i] = {
        x: (p[i - 1].x + 2 * p[i].x + p[i + 1].x) / 4,
        y: (p[i - 1].y + 2 * p[i].y + p[i + 1].y) / 4,
      };
    }
  }
  return p;
}

/** Lissage fort d'une boucle fermée. */
function smoothLoop(rs: V[]): V[] {
  const n = rs.length;
  let p = rs.map((q) => ({ ...q }));
  for (let pass = 0; pass < 4; pass++) {
    const np: V[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = p[(i - 1 + n) % n];
      const b = p[i];
      const c = p[(i + 1) % n];
      np[i] = { x: (a.x + 2 * b.x + c.x) / 4, y: (a.y + 2 * b.y + c.y) / 4 };
    }
    p = np;
  }
  p.push({ ...p[0] });
  return p;
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
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y;
const norm = (v: V): V => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};
const clampN = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);
const clamp01 = (n: number) => clampN(n, 0, 1);
