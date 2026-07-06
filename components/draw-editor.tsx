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
  Minus,
  Plus,
  Wand2,
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

// Toile logique : ratio fixe pour normaliser les coordonnées.
const CANVAS_W = 1600;
const CANVAS_H = 1000;

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
  const redoRef = useRef<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState(initialName);
  const [save, setSave] = useState<SaveState>("saved");
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(initialDoc?.strokes?.[0]?.color ?? "#5b8bff");
  const [size, setSize] = useState(4);
  const [bg] = useState(initialDoc?.bg ?? "#ffffff");
  const [canUndo, setCanUndo] = useState((initialDoc?.strokes?.length ?? 0) > 0);
  const [canRedo, setCanRedo] = useState(false);
  // Formes parfaites : redresse automatiquement lignes, cercles, rectangles…
  const [magic, setMagic] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("filehub:draw:magic") === "0") setMagic(false);
  }, []);
  useEffect(() => {
    localStorage.setItem("filehub:draw:magic", magic ? "1" : "0");
  }, [magic]);

  // ── Rendu de toute la scène ─────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const all = drawing.current
      ? [...strokesRef.current, drawing.current]
      : strokesRef.current;
    for (const s of all) drawStroke(ctx, s, canvas.width, canvas.height, bg);
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

  const syncHistoryFlags = () => {
    setCanUndo(strokesRef.current.length > 0);
    setCanRedo(redoRef.current.length > 0);
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
    drawing.current = {
      color,
      size,
      eraser: tool === "eraser",
      points: [toNorm(e)],
    };
    render();
  };

  const onPointerMove = (e: React.PointerEvent) => {
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
      strokesRef.current.push(drawing.current);
      redoRef.current = [];
      syncHistoryFlags();
      scheduleSave();
    }
    drawing.current = null;
    render();
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    redoRef.current.push(strokesRef.current.pop()!);
    syncHistoryFlags();
    render();
    scheduleSave();
  };

  const redo = () => {
    if (redoRef.current.length === 0) return;
    strokesRef.current.push(redoRef.current.pop()!);
    syncHistoryFlags();
    render();
    scheduleSave();
  };

  const clearAll = () => {
    if (strokesRef.current.length === 0) return;
    if (!confirm("Effacer tout le dessin ?")) return;
    strokesRef.current = [];
    redoRef.current = [];
    syncHistoryFlags();
    render();
    scheduleSave();
  };

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

  // Ctrl/Cmd+Z / Shift+Z, Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
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

          <span className="my-1 h-px w-8 bg-white/10" />

          <ToolBtn
            active={magic}
            onClick={() => setMagic((v) => !v)}
            title="Formes parfaites : lignes, cercles, rectangles, triangles… corrigés automatiquement (coins arrondis respectés)"
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
          <ToolBtn onClick={clearAll} disabled={!canUndo} title="Tout effacer" danger>
            <Trash2 className="size-5" />
          </ToolBtn>

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
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
              onPointerCancel={endStroke}
              className="absolute inset-0 h-full w-full touch-none"
              style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
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

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
