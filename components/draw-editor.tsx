"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Check,
  Loader2,
  ChevronRight,
  Home,
  Plus,
  Wand2,
  MousePointer2,
} from "lucide-react";
import { api } from "@/lib/api";
import { beautifyStroke } from "@/lib/shape-recognizer";
import { cn } from "@/lib/utils";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle";

// Un point : x, y normalisés (0..1) + pression (0..1).
type Pt = [number, number, number];
type Stroke = { color: string; size: number; eraser: boolean; points: Pt[] };
export type DrawDoc = { version: 1; bg: string; strokes: Stroke[] };

type Tool = "pen" | "eraser" | "select";

// Coin de la boîte de sélection, en coordonnées normalisées.
type Corner = [number, number];

// Geste en cours avec l'outil Sélection. Les gestes de transformation
// mémorisent la géométrie d'origine (traits + boîte) et l'appliquent en
// absolu : la boîte reste ainsi parfaitement rigide, sans dérive.
type Gesture =
  | { mode: "move"; lastX: number; lastY: number; started: boolean }
  | {
      mode: "rotate";
      cx: number;
      cy: number;
      startAng: number;
      angle: number;
      origPts: Map<number, Pt[]>;
      origBox: Corner[];
      started: boolean;
    }
  | {
      mode: "scale";
      ax: number;
      ay: number;
      grab0: number;
      origPts: Map<number, Pt[]>;
      origBox: Corner[];
      started: boolean;
      factor: number;
    }
  | { mode: "band"; x0: number; y0: number; x1: number; y1: number };

// Toile logique : ratio fixe pour normaliser les coordonnées.
const CANVAS_W = 1600;
const CANVAS_H = 1000;

const ACCENT = "#5b8bff";
const ROT_OFFSET = 8; // distance (px CSS) du centre de la poignée au bord haut
const ROT_R = 4.5; // rayon de la poignée de rotation (≈ carrés des coins, 10 px)
const ROT_HIT = 12; // rayon de capture de la poignée de rotation (px CSS)
const CORNER_HIT = 14; // rayon de capture des poignées de coin (px CSS)

const PALETTE = [
  "#f8fafc",
  "#0b0b12",
  "#5b8bff",
  "#22d3ee",
  "#a78bff",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f97316",
  "#ec4899",
];
const SIZES = [2, 4, 8, 16, 28];

const cloneStrokes = (s: Stroke[]): Stroke[] =>
  s.map((st) => ({ ...st, points: st.points.map((p) => [...p] as Pt) }));

export function DrawEditor({
  id,
  initialName,
  initialDoc,
  backHref,
  crumbs,
}: {
  id: string;
  initialName: string;
  initialDoc: DrawDoc | null;
  backHref: string;
  crumbs: Crumb[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>(initialDoc?.strokes ?? []);
  // Historique par instantanés : couvre traits, déplacements, rotations,
  // redimensionnements, suppressions et « tout effacer ».
  const historyRef = useRef<Stroke[][]>([]);
  const redoStackRef = useRef<Stroke[][]>([]);
  const drawing = useRef<Stroke | null>(null);
  const selRef = useRef<number[]>([]);
  // Boîte de sélection : 4 coins [TL, TR, BR, BL] normalisés. Elle subit
  // exactement les mêmes transformations que les traits sélectionnés →
  // rigide (taille constante) et solidaire de la rotation.
  const boxRef = useRef<Corner[] | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState(initialName);
  const [save, setSave] = useState<SaveState>("saved");
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(initialDoc?.strokes?.[0]?.color ?? "#5b8bff");
  const [size, setSize] = useState(4);
  const [bg] = useState(initialDoc?.bg ?? "#ffffff");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selCount, setSelCount] = useState(0);
  // Formes parfaites : redresse automatiquement lignes, cercles, rectangles…
  const [magic, setMagic] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("filehub:draw:magic") === "0") setMagic(false);
  }, []);
  useEffect(() => {
    localStorage.setItem("filehub:draw:magic", magic ? "1" : "0");
  }, [magic]);

  // ── Rendu de toute la scène (+ surcouche de sélection) ─────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const all = drawing.current
      ? [...strokesRef.current, drawing.current]
      : strokesRef.current;
    for (const s of all) drawStroke(ctx, s, w, h, bg);

    const rect = canvas.getBoundingClientRect();
    const dpr = rect.width > 0 ? w / rect.width : 1;

    // Cadre de sélection rigide + poignées.
    const box = boxRef.current;
    if (box && selRef.current.length > 0) {
      const c = box.map(([nx, ny]) => ({ x: nx * w, y: ny * h }));
      ctx.save();
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1.5 * dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(c[0].x, c[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(c[i].x, c[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Poignées de redimensionnement aux 4 coins.
      ctx.fillStyle = "#ffffff";
      for (const p of c) {
        ctx.beginPath();
        ctx.rect(p.x - 5 * dpr, p.y - 5 * dpr, 10 * dpr, 10 * dpr);
        ctx.fill();
        ctx.stroke();
      }

      // Poignée de rotation, collée au milieu du bord haut, représentée
      // par une flèche circulaire.
      const cen = { x: (c[0].x + c[2].x) / 2, y: (c[0].y + c[2].y) / 2 };
      const topMid = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
      const out = normPx(topMid.x - cen.x, topMid.y - cen.y);
      const hx = topMid.x + out.x * ROT_OFFSET * dpr;
      const hy = topMid.y + out.y * ROT_OFFSET * dpr;
      drawRotateIcon(ctx, hx, hy, ROT_R * dpr, dpr);

      const g = gestureRef.current;
      if (g && g.mode === "rotate") {
        const deg = (((Math.round((g.angle * 180) / Math.PI)) % 360) + 360) % 360;
        ctx.fillStyle = ACCENT;
        ctx.font = `${12 * dpr}px system-ui, sans-serif`;
        ctx.fillText(`${deg}°`, hx + 14 * dpr, hy + 4 * dpr);
      }
      ctx.restore();
    }

    // Rectangle de sélection élastique.
    const g = gestureRef.current;
    if (g && g.mode === "band") {
      ctx.save();
      ctx.strokeStyle = ACCENT;
      ctx.fillStyle = "rgba(91,139,255,0.08)";
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([5 * dpr, 4 * dpr]);
      const bx = Math.min(g.x0, g.x1) * dpr;
      const by = Math.min(g.y0, g.y1) * dpr;
      const bw = Math.abs(g.x1 - g.x0) * dpr;
      const bh = Math.abs(g.y1 - g.y0) * dpr;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    }
    ctx.restore();
  }, [bg]);

  // Dimensionne la toile à la taille réelle (net sur écrans HiDPI).
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const r = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    render();
  }, [render]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  // ── Persistance ─────────────────────────────────────────────────────────
  const persist = useCallback(
    (patch: { content?: DrawDoc; name?: string }) => {
      setSave("saving");
      api
        .saveDraw(id, patch)
        .then(() => setSave("saved"))
        .catch(() => setSave("idle"));
    },
    [id],
  );

  const scheduleSave = useCallback(() => {
    setSave("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist({ content: { version: 1, bg, strokes: strokesRef.current } });
    }, 700);
  }, [persist, bg]);

  const onNameChange = (v: string) => {
    setName(v);
    setSave("saving");
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => persist({ name: v.trim() || "Dessin sans titre" }), 600);
  };

  // ── Historique (instantanés) ─────────────────────────────────────────────
  const syncHistoryFlags = () => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const snapshot = () => {
    historyRef.current.push(cloneStrokes(strokesRef.current));
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoStackRef.current = [];
    syncHistoryFlags();
  };

  /** Boîte de sélection (4 coins normalisés) englobant les traits donnés. */
  const computeBox = (ids: number[]): Corner[] | null => {
    const canvas = canvasRef.current;
    if (!canvas || ids.length === 0) return null;
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const i of ids) {
      const s = strokesRef.current[i];
      if (!s) continue;
      for (const [nx, ny] of s.points) {
        x0 = Math.min(x0, nx);
        y0 = Math.min(y0, ny);
        x1 = Math.max(x1, nx);
        y1 = Math.max(y1, ny);
      }
    }
    if (!isFinite(x0)) return null;
    const px = 10 / r.width;
    const py = 10 / r.height;
    x0 -= px; y0 -= py; x1 += px; y1 += py;
    return [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
  };

  const setSelection = (ids: number[]) => {
    selRef.current = ids;
    boxRef.current = computeBox(ids);
    setSelCount(ids.length);
    render();
  };

  const clearSelection = () => {
    selRef.current = [];
    boxRef.current = null;
    setSelCount(0);
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(cloneStrokes(strokesRef.current));
    strokesRef.current = prev;
    clearSelection();
    syncHistoryFlags();
    render();
    scheduleSave();
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    historyRef.current.push(cloneStrokes(strokesRef.current));
    strokesRef.current = next;
    clearSelection();
    syncHistoryFlags();
    render();
    scheduleSave();
  };

  const clearAll = () => {
    if (strokesRef.current.length === 0) return;
    if (!confirm("Effacer tout le dessin ?")) return;
    snapshot();
    strokesRef.current = [];
    clearSelection();
    render();
    scheduleSave();
  };

  const deleteSelection = () => {
    if (selRef.current.length === 0) return;
    snapshot();
    const dead = new Set(selRef.current);
    strokesRef.current = strokesRef.current.filter((_, i) => !dead.has(i));
    clearSelection();
    render();
    scheduleSave();
  };

  // ── Outil Sélection : déplacer / pivoter / redimensionner ───────────────
  const cssPos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, r };
  };

  /** Coins de la boîte en pixels CSS. */
  const boxCssCorners = (rw: number, rh: number) =>
    boxRef.current?.map(([nx, ny]) => ({ x: nx * rw, y: ny * rh })) ?? null;

  /** Applique une transformation (px CSS → px CSS) aux traits d'origine et
   * à la boîte d'origine. Garantit une boîte rigide et solidaire. */
  const applyTransform = (
    origPts: Map<number, Pt[]>,
    origBox: Corner[],
    rw: number,
    rh: number,
    fn: (x: number, y: number) => [number, number],
  ) => {
    for (const [i, pts] of origPts) {
      const s = strokesRef.current[i];
      if (!s) continue;
      s.points = pts.map(([nx, ny, p]) => {
        const [x, y] = fn(nx * rw, ny * rh);
        return [x / rw, y / rh, p] as Pt;
      });
    }
    boxRef.current = origBox.map(([nx, ny]) => {
      const [x, y] = fn(nx * rw, ny * rh);
      return [x / rw, y / rh] as Corner;
    });
  };

  const snapshotOrig = () => {
    const origPts = new Map<number, Pt[]>();
    for (const i of selRef.current) {
      if (strokesRef.current[i]) {
        origPts.set(i, strokesRef.current[i].points.map((p) => [...p] as Pt));
      }
    }
    return { origPts, origBox: (boxRef.current ?? []).map((c) => [...c] as Corner) };
  };

  const selectDown = (e: React.PointerEvent) => {
    const { x, y, r } = cssPos(e);
    const corners = boxCssCorners(r.width, r.height);
    if (corners) {
      const cen = {
        x: (corners[0].x + corners[2].x) / 2,
        y: (corners[0].y + corners[2].y) / 2,
      };
      // Poignée de rotation ?
      const topMid = {
        x: (corners[0].x + corners[1].x) / 2,
        y: (corners[0].y + corners[1].y) / 2,
      };
      const out = normPx(topMid.x - cen.x, topMid.y - cen.y);
      const hx = topMid.x + out.x * ROT_OFFSET;
      const hy = topMid.y + out.y * ROT_OFFSET;
      if (Math.hypot(x - hx, y - hy) < ROT_HIT) {
        const { origPts, origBox } = snapshotOrig();
        gestureRef.current = {
          mode: "rotate",
          cx: cen.x,
          cy: cen.y,
          startAng: Math.atan2(y - cen.y, x - cen.x),
          angle: 0,
          origPts,
          origBox,
          started: false,
        };
        return;
      }
      // Poignée de coin → redimensionnement (ancre = coin opposé).
      for (let ci = 0; ci < 4; ci++) {
        if (Math.hypot(x - corners[ci].x, y - corners[ci].y) < CORNER_HIT) {
          const anchor = corners[(ci + 2) % 4];
          const grab0 = Math.hypot(corners[ci].x - anchor.x, corners[ci].y - anchor.y);
          if (grab0 < 1) break;
          const { origPts, origBox } = snapshotOrig();
          gestureRef.current = {
            mode: "scale",
            ax: anchor.x,
            ay: anchor.y,
            grab0,
            origPts,
            origBox,
            started: false,
            factor: 1,
          };
          return;
        }
      }
      // À l'intérieur du cadre (éventuellement pivoté) → déplacement.
      if (pointInQuad(x, y, corners)) {
        gestureRef.current = { mode: "move", lastX: x, lastY: y, started: false };
        return;
      }
    }
    // Clic sur un trait → le sélectionner puis le déplacer.
    const hit = hitStroke(x, y, r.width, r.height);
    if (hit >= 0) {
      setSelection([hit]);
      gestureRef.current = { mode: "move", lastX: x, lastY: y, started: false };
      return;
    }
    // Sinon : rectangle élastique.
    setSelection([]);
    gestureRef.current = { mode: "band", x0: x, y0: y, x1: x, y1: y };
    render();
  };

  /** Trait visible le plus proche du point (pixels CSS), ou -1. */
  const hitStroke = (px: number, py: number, rw: number, rh: number): number => {
    const scale = rw / CANVAS_W;
    let best = -1;
    let bestD = Infinity;
    for (let i = strokesRef.current.length - 1; i >= 0; i--) {
      const s = strokesRef.current[i];
      if (s.eraser) continue;
      const th = Math.max(10, s.size * scale * 0.75 + 4);
      const pts = s.points;
      for (let j = 0; j < pts.length; j++) {
        const x1 = pts[j][0] * rw;
        const y1 = pts[j][1] * rh;
        let d: number;
        if (j === 0) {
          d = Math.hypot(px - x1, py - y1);
        } else {
          const x0 = pts[j - 1][0] * rw;
          const y0 = pts[j - 1][1] * rh;
          d = distToSegmentPx(px, py, x0, y0, x1, y1);
        }
        if (d < th && d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    return best;
  };

  const selectMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g) return;
    const { x, y, r } = cssPos(e);
    if (g.mode === "move") {
      const dx = x - g.lastX;
      const dy = y - g.lastY;
      if (!g.started && Math.hypot(dx, dy) < 2) return;
      if (!g.started) {
        snapshot();
        g.started = true;
      }
      g.lastX = x;
      g.lastY = y;
      const ndx = dx / r.width;
      const ndy = dy / r.height;
      for (const i of selRef.current) {
        const s = strokesRef.current[i];
        if (!s) continue;
        s.points = s.points.map(([nx, ny, p]) => [nx + ndx, ny + ndy, p] as Pt);
      }
      if (boxRef.current) {
        boxRef.current = boxRef.current.map(([nx, ny]) => [nx + ndx, ny + ndy] as Corner);
      }
      render();
    } else if (g.mode === "rotate") {
      const ang = Math.atan2(y - g.cy, x - g.cx) - g.startAng;
      if (!g.started && Math.abs(ang) < 0.01) return;
      if (!g.started) {
        snapshot();
        g.started = true;
      }
      g.angle = ang;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      applyTransform(g.origPts, g.origBox, r.width, r.height, (px, py) => {
        const dx = px - g.cx;
        const dy = py - g.cy;
        return [g.cx + dx * cos - dy * sin, g.cy + dx * sin + dy * cos];
      });
      render();
    } else if (g.mode === "scale") {
      const d = Math.hypot(x - g.ax, y - g.ay);
      const f = clampN(d / g.grab0, 0.05, 30);
      if (!g.started && Math.abs(f - 1) < 0.01) return;
      if (!g.started) {
        snapshot();
        g.started = true;
      }
      g.factor = f;
      applyTransform(g.origPts, g.origBox, r.width, r.height, (px, py) => [
        g.ax + (px - g.ax) * f,
        g.ay + (py - g.ay) * f,
      ]);
      render();
    } else {
      g.x1 = x;
      g.y1 = y;
      render();
    }
  };

  const selectUp = () => {
    const g = gestureRef.current;
    if (!g) return;
    if (g.mode === "band") {
      const r = canvasRef.current!.getBoundingClientRect();
      const nx0 = Math.min(g.x0, g.x1) / r.width;
      const ny0 = Math.min(g.y0, g.y1) / r.height;
      const nx1 = Math.max(g.x0, g.x1) / r.width;
      const ny1 = Math.max(g.y0, g.y1) / r.height;
      if (nx1 - nx0 > 0.005 || ny1 - ny0 > 0.005) {
        const ids: number[] = [];
        strokesRef.current.forEach((s, i) => {
          if (s.points.some(([px, py]) => px >= nx0 && px <= nx1 && py >= ny0 && py <= ny1)) {
            ids.push(i);
          }
        });
        setSelection(ids);
      }
    } else if (g.started) {
      scheduleSave();
    }
    gestureRef.current = null;
    render();
  };

  // ── Entrée pointeur (souris / tablette / doigt) ─────────────────────────
  const toNorm = (e: React.PointerEvent): Pt => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    // La pression est 0 pour la souris : on retombe sur 0.5.
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    return [clamp01(x), clamp01(y), pressure];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === "select") {
      selectDown(e);
      return;
    }
    drawing.current = {
      color,
      size,
      eraser: tool === "eraser",
      points: [toNorm(e)],
    };
    render();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (tool === "select") {
      selectMove(e);
      return;
    }
    if (!drawing.current) return;
    e.preventDefault();
    // getCoalescedEvents : trait fluide même à vitesse élevée.
    const events =
      typeof e.nativeEvent.getCoalescedEvents === "function"
        ? e.nativeEvent.getCoalescedEvents()
        : [e.nativeEvent];
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    for (const ev of events) {
      const x = clamp01((ev.clientX - r.left) / r.width);
      const y = clamp01((ev.clientY - r.top) / r.height);
      const pressure = ev.pressure && ev.pressure > 0 ? ev.pressure : 0.5;
      drawing.current.points.push([x, y, pressure]);
    }
    render();
  };

  const onPointerUp = () => {
    if (tool === "select") {
      selectUp();
      return;
    }
    endStroke();
  };

  const endStroke = () => {
    if (!drawing.current) return;
    if (drawing.current.points.length > 0) {
      // Formes parfaites : remplace le trait par la forme reconnue.
      if (magic && !drawing.current.eraser && drawing.current.points.length >= 6) {
        const r = canvasRef.current?.getBoundingClientRect();
        const aspect = r && r.height > 0 ? r.width / r.height : CANVAS_W / CANVAS_H;
        const fixed = beautifyStroke(drawing.current.points, aspect);
        if (fixed) drawing.current.points = fixed;
      }
      snapshot();
      strokesRef.current.push(drawing.current);
    }
    drawing.current = null;
    render();
    scheduleSave();
  };

  // Changer d'outil désélectionne.
  useEffect(() => {
    if (tool !== "select" && selRef.current.length > 0) {
      clearSelection();
      render();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const exportPng = () => {
    // Rendu haute résolution sur la toile logique fixe.
    const off = document.createElement("canvas");
    off.width = CANVAS_W;
    off.height = CANVAS_H;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, off.width, off.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokesRef.current) drawStroke(ctx, s, off.width, off.height, bg);
    const a = document.createElement("a");
    a.href = off.toDataURL("image/png");
    a.download = `${name || "dessin"}.png`;
    a.click();
  };

  // Raccourcis : Ctrl/Cmd+Z/Y/S, Suppr (sélection), Échap (désélection).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) {
        if (typing) return;
        if (e.key === "Escape") {
          clearSelection();
          render();
        } else if ((e.key === "Delete" || e.key === "Backspace") && selRef.current.length > 0) {
          e.preventDefault();
          deleteSelection();
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (k === "y") {
        e.preventDefault();
        redo();
      } else if (k === "s") {
        e.preventDefault();
        persist({ content: { version: 1, bg, strokes: strokesRef.current } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg, persist]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link
          href={backHref}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition"
          title="Retour"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (
              <span key={c.id} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="size-3 shrink-0" />
                <span className="truncate max-w-[140px]">{c.name}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Pencil className="size-4 shrink-0 text-pink-400" />
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30"
              placeholder="Dessin sans titre"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? (
            <><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>
          ) : save === "saved" ? (
            <><Check className="size-3.5 text-emerald-400" /> Enregistré</>
          ) : (
            <span className="text-amber-400">Non enregistré</span>
          )}
        </div>

        <button
          onClick={exportPng}
          className="ml-1 hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/80 hover:bg-white/10 transition"
          title="Exporter en PNG"
        >
          <Download className="size-4" /> Exporter
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Barre d'outils verticale */}
        <aside className="w-16 shrink-0 border-r border-white/10 bg-white/[0.02] flex flex-col items-center gap-1 py-3 overflow-y-auto">
          <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} title="Crayon">
            <Pencil className="size-5" />
          </ToolBtn>
          <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Gomme">
            <Eraser className="size-5" />
          </ToolBtn>
          <ToolBtn
            active={tool === "select"}
            onClick={() => setTool("select")}
            title="Sélectionner : cliquez un trait (ou entourez-en plusieurs), glissez pour déplacer, coins pour agrandir/rétrécir, poignée du haut pour pivoter à 360°, Suppr pour supprimer"
          >
            <MousePointer2 className="size-5" />
          </ToolBtn>

          <span className="my-1 h-px w-8 bg-white/10" />

          <ToolBtn
            active={magic}
            onClick={() => setMagic((v) => !v)}
            title="Perfection du trait : chaque tracé est corrigé — droites pures, arcs et arrondis parfaits, courbes lissées sans tremblement"
          >
            <Wand2 className="size-5" />
          </ToolBtn>

          <span className="my-1 h-px w-8 bg-white/10" />

          <ToolBtn onClick={undo} disabled={!canUndo} title="Annuler">
            <Undo2 className="size-5" />
          </ToolBtn>
          <ToolBtn onClick={redo} disabled={!canRedo} title="Rétablir">
            <Redo2 className="size-5" />
          </ToolBtn>
          {selCount > 0 ? (
            <ToolBtn onClick={deleteSelection} title={`Supprimer la sélection (${selCount})`} danger>
              <Trash2 className="size-5" />
            </ToolBtn>
          ) : (
            <ToolBtn
              onClick={clearAll}
              disabled={strokesRef.current.length === 0 && !canUndo}
              title="Tout effacer"
              danger
            >
              <Trash2 className="size-5" />
            </ToolBtn>
          )}

          <span className="my-1 h-px w-8 bg-white/10" />

          {/* Épaisseur */}
          <div className="flex flex-col items-center gap-1.5 py-1">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                title={`Épaisseur ${s}`}
                className={cn(
                  "grid size-9 place-items-center rounded-lg transition hover:bg-white/10",
                  size === s && "bg-white/10 ring-1 ring-brand-400/60",
                )}
              >
                <span
                  className="rounded-full bg-white"
                  style={{ width: Math.min(s, 22), height: Math.min(s, 22) }}
                />
              </button>
            ))}
          </div>
        </aside>

        {/* Palette de couleurs */}
        <aside className="w-14 shrink-0 border-r border-white/10 bg-white/[0.02] flex flex-col items-center gap-2 py-3 overflow-y-auto">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              title={c}
              className={cn(
                "size-8 rounded-full ring-1 ring-white/20 transition hover:scale-110",
                color === c && tool === "pen" && "ring-2 ring-white scale-110",
              )}
              style={{ background: c }}
            />
          ))}
          <label
            className="mt-1 grid size-8 cursor-pointer place-items-center rounded-full ring-1 ring-white/20 transition hover:scale-110"
            style={{
              background:
                "conic-gradient(#fb7185,#fbbf24,#34d399,#22d3ee,#5b8bff,#a78bff,#fb7185)",
            }}
            title="Couleur personnalisée"
          >
            <Plus className="size-4 text-black/70" />
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setTool("pen");
              }}
              className="sr-only"
            />
          </label>
        </aside>

        {/* Toile */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-hidden">
          <div
            ref={wrapRef}
            className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onPointerCancel={onPointerUp}
              className="absolute inset-0 h-full w-full touch-none"
              style={{
                cursor:
                  tool === "select" ? "default" : tool === "eraser" ? "cell" : "crosshair",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
  active,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-10 place-items-center rounded-xl transition",
        disabled
          ? "text-white/20"
          : active
            ? "bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/50"
            : danger
              ? "text-white/70 hover:bg-red-500/15 hover:text-red-300"
              : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

// Dessine un trait (crayon ou gomme) avec largeur variable selon la pression.
function drawStroke(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  w: number,
  h: number,
  bg: string,
) {
  const pts = s.points;
  if (pts.length === 0) return;
  ctx.strokeStyle = s.eraser ? bg : s.color;
  ctx.fillStyle = s.eraser ? bg : s.color;
  // Échelle de l'épaisseur : la toile logique fait CANVAS_W de large.
  const scale = w / CANVAS_W;

  if (pts.length === 1) {
    const [x, y, p] = pts[0];
    ctx.beginPath();
    ctx.arc(x * w, y * h, (s.size * scale * (0.5 + p)) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  for (let i = 1; i < pts.length; i++) {
    const [x0, y0, p0] = pts[i - 1];
    const [x1, y1, p1] = pts[i];
    ctx.beginPath();
    ctx.lineWidth = s.size * scale * (0.5 + (p0 + p1) / 2);
    ctx.moveTo(x0 * w, y0 * h);
    ctx.lineTo(x1 * w, y1 * h);
    ctx.stroke();
  }
}

/** Poignée de rotation : disque blanc + flèche circulaire (icône « pivoter »). */
function drawRotateIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  dpr: number,
) {
  ctx.save();
  // Disque de fond bleu (contraste net avec les carrés blancs des coins).
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.lineWidth = Math.max(1, R * 0.18) * dpr;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // Arc de la flèche blanche (presque un tour complet, avec une ouverture).
  const ar = R * 0.52;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, R * 0.26) * dpr;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const a0 = -Math.PI * 0.72;
  const a1 = Math.PI * 0.92;
  ctx.beginPath();
  ctx.arc(cx, cy, ar, a0, a1, false);
  ctx.stroke();

  // Pointe de flèche à l'extrémité de l'arc, orientée selon la tangente.
  const ex = cx + Math.cos(a1) * ar;
  const ey = cy + Math.sin(a1) * ar;
  const tx = -Math.sin(a1); // tangente (sens anti-horaire)
  const ty = Math.cos(a1);
  const nx = Math.cos(a1); // normale sortante
  const ny = Math.sin(a1);
  const s = R * 0.55;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - tx * s + nx * s * 0.6, ey - ty * s + ny * s * 0.6);
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - tx * s - nx * s * 0.6, ey - ty * s - ny * s * 0.6);
  ctx.stroke();
  ctx.restore();
}

function distToSegmentPx(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x0, py - y0);
  let t = ((px - x0) * dx + (py - y0) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

/** Point dans un quadrilatère convexe (coins en ordre cyclique). */
function pointInQuad(px: number, py: number, q: { x: number; y: number }[]): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
  }
  return true;
}

function normPx(x: number, y: number): { x: number; y: number } {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

function clampN(n: number, lo: number, hi: number) {
  return n < lo ? lo : n > hi ? hi : n;
}

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
