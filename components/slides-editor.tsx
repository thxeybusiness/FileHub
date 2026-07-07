"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, ChevronRight, Home, Presentation, Plus, Trash2, Play, X,
  Type, Square, Circle, Minus, MoveUpRight, ImageIcon, Copy, ChevronUp, ChevronDown,
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  Palette, LayoutTemplate, Undo2, Redo2, BringToFront, SendToBack, Sparkles as SparkleIcon,
  PaintBucket, Blend, Droplets, Frame,
} from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

const W = 1280;
const H = 720;
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

type ElType = "text" | "rect" | "ellipse" | "line" | "arrow" | "image";
type El = {
  id: string; type: ElType; x: number; y: number; w: number; h: number; rot: number;
  text?: string; size?: number; font?: string; weight?: number; italic?: boolean; underline?: boolean;
  align?: "left" | "center" | "right"; color?: string; lineHeight?: number;
  fill?: string; stroke?: string; strokeW?: number; radius?: number; opacity?: number; src?: string;
};
type Slide = { id: string; bg: string; els: El[] };
type Deck = { theme: string; slides: Slide[] };

// ── Polices & thèmes (façon Canva) ───────────────────────────────────
const FONTS: { key: string; label: string; css: string }[] = [
  { key: "sans", label: "Sans", css: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif' },
  { key: "serif", label: "Serif", css: 'Georgia, "Times New Roman", serif' },
  { key: "round", label: "Arrondi", css: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
  { key: "condensed", label: "Condensé", css: '"Arial Narrow", "Helvetica Neue", sans-serif' },
  { key: "mono", label: "Mono", css: 'ui-monospace, "SF Mono", Menlo, monospace' },
];
const fontCss = (k?: string) => FONTS.find((f) => f.key === k)?.css ?? FONTS[0].css;

type Theme = { name: string; label: string; bg: string; text: string; accent: string; head: string; body: string };
const THEMES: Theme[] = [
  { name: "aurore", label: "Aurore", bg: "linear-gradient(135deg,#0b1020,#1a1140 55%,#241247)", text: "#eef1ff", accent: "#5b8bff", head: "sans", body: "sans" },
  { name: "minuit", label: "Minuit", bg: "#0a0e1a", text: "#e8ecf7", accent: "#22d3ee", head: "sans", body: "sans" },
  { name: "ardoise", label: "Ardoise", bg: "linear-gradient(135deg,#1e293b,#0f172a)", text: "#e2e8f0", accent: "#38bdf8", head: "condensed", body: "sans" },
  { name: "ivoire", label: "Ivoire", bg: "#f5f1e8", text: "#241f17", accent: "#c2410c", head: "serif", body: "serif" },
  { name: "menthe", label: "Menthe", bg: "linear-gradient(135deg,#0f766e,#10b981)", text: "#f0fdf4", accent: "#ffffff", head: "round", body: "round" },
  { name: "corail", label: "Corail", bg: "linear-gradient(135deg,#ff6b6b,#ff9e7d)", text: "#3a0d0d", accent: "#ffffff", head: "round", body: "sans" },
  { name: "contraste", label: "Contraste", bg: "#0a0a0a", text: "#ffffff", accent: "#facc15", head: "condensed", body: "sans" },
  { name: "or", label: "Nuit dorée", bg: "linear-gradient(135deg,#1c1917,#292524)", text: "#faf7f0", accent: "#eab308", head: "serif", body: "sans" },
];
const themeOf = (name: string) => THEMES.find((t) => t.name === name) ?? THEMES[0];

const SWATCHES = ["#ffffff", "#0a0a0a", "#5b8bff", "#7b3bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff", "#94a3b8"];

// ── Fond personnalisable (uni / dégradé linéaire ou radial) ──────────
type BgKind = "solid" | "linear" | "radial";
type BgModel = { kind: BgKind; angle: number; colors: string[] };

// Palette de dégradés « inspiration » (appliqués tels quels ou point de départ).
const GRADIENTS: string[][] = [
  ["#3b6dff", "#7b3bff"], ["#0f766e", "#10b981"], ["#ff6b6b", "#ff9e7d"],
  ["#0b1020", "#241247"], ["#f5576c", "#f093fb"], ["#4facfe", "#00f2fe"],
  ["#fa709a", "#fee140"], ["#30cfd0", "#330867"], ["#a8edea", "#fed6e3"],
  ["#232526", "#414345"], ["#c2410c", "#fbbf24"], ["#06b6d4", "#3b82f6", "#8b5cf6"],
];

function extractColors(s: string): string[] {
  return s.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g) ?? [];
}
function parseBg(bg: string): BgModel {
  const s = (bg || "").trim();
  const lin = s.match(/^linear-gradient\((.*)\)$/i);
  if (lin) {
    const a = lin[1].match(/(-?\d+(?:\.\d+)?)deg/);
    const cols = extractColors(lin[1]);
    return { kind: "linear", angle: a ? Number(a[1]) : 135, colors: cols.length >= 2 ? cols : ["#3b6dff", "#7b3bff"] };
  }
  const rad = s.match(/^radial-gradient\((.*)\)$/i);
  if (rad) {
    const cols = extractColors(rad[1]);
    return { kind: "radial", angle: 0, colors: cols.length >= 2 ? cols : ["#3b6dff", "#7b3bff"] };
  }
  return { kind: "solid", angle: 135, colors: [s || "#0a0e1a"] };
}
function buildBg(m: BgModel): string {
  if (m.kind === "solid") return m.colors[0] || "#0a0e1a";
  const cols = m.colors.join(",");
  if (m.kind === "radial") return `radial-gradient(circle at 50% 45%,${cols})`;
  return `linear-gradient(${m.angle}deg,${cols})`;
}

// Éléments décoratifs prêts à l'emploi (posés en arrière-plan, éditables).
function decorEls(kind: string, accent: string): El[] {
  const bubble = (x: number, y: number, d: number, fill: string, opacity: number): El =>
    ({ id: uid(), type: "ellipse", x, y, w: d, h: d, rot: 0, fill, opacity });
  switch (kind) {
    case "bulle":
      return [bubble(870, -150, 540, accent, 0.16)];
    case "bulles":
      return [
        bubble(-110, 420, 320, accent, 0.13),
        bubble(150, -90, 190, "#ffffff", 0.10),
        bubble(1010, 90, 260, accent, 0.17),
        bubble(780, 540, 150, "#ffffff", 0.10),
      ];
    case "trait":
      return [{ id: uid(), type: "rect", x: -80, y: 300, w: 1440, h: 12, rot: -16, fill: accent, radius: 6, opacity: 0.55 }];
    case "cadre":
      return [{ id: uid(), type: "rect", x: 44, y: 44, w: W - 88, h: H - 88, rot: 0, fill: "transparent", stroke: accent, strokeW: 3, radius: 18, opacity: 1 }];
    default:
      return [];
  }
}

const mkText = (p: Partial<El>): El => ({
  id: uid(), type: "text", x: 120, y: 120, w: 400, h: 100, rot: 0,
  text: "Texte", size: 40, font: "sans", weight: 400, align: "left", color: "#ffffff", lineHeight: 1.25, ...p,
});

// ── Mises en page ────────────────────────────────────────────────────
function layoutEls(kind: string, t: Theme): El[] {
  const head = { color: t.text, font: t.head };
  const body = { color: t.text, font: t.body };
  switch (kind) {
    case "title":
      return [
        mkText({ ...head, text: "Titre de la présentation", x: 160, y: 225, w: 960, h: 200, size: 76, weight: 800, align: "center" }),
        mkText({ ...body, text: "Sous-titre ou intervenant", x: 160, y: 400, w: 960, h: 60, size: 30, align: "center", color: t.accent }),
      ];
    case "section":
      return [
        { id: uid(), type: "rect", x: 0, y: 300, w: 20, h: 120, rot: 0, fill: t.accent, radius: 0, opacity: 1 },
        mkText({ ...head, text: "Nouvelle section", x: 90, y: 300, w: 1000, h: 120, size: 64, weight: 800, align: "left" }),
      ];
    case "content":
      return [
        mkText({ ...head, text: "Titre de la diapo", x: 90, y: 70, w: 1100, h: 90, size: 48, weight: 800 }),
        { id: uid(), type: "rect", x: 90, y: 168, w: 90, h: 6, rot: 0, fill: t.accent, radius: 3, opacity: 1 },
        mkText({ ...body, text: "• Premier point\n• Deuxième point\n• Troisième point", x: 90, y: 210, w: 1100, h: 420, size: 32, lineHeight: 1.5 }),
      ];
    case "two":
      return [
        mkText({ ...head, text: "Titre de la diapo", x: 90, y: 70, w: 1100, h: 90, size: 48, weight: 800 }),
        mkText({ ...body, text: "• Colonne A\n• Point\n• Point", x: 90, y: 210, w: 520, h: 420, size: 30, lineHeight: 1.5 }),
        mkText({ ...body, text: "• Colonne B\n• Point\n• Point", x: 660, y: 210, w: 520, h: 420, size: 30, lineHeight: 1.5 }),
      ];
    case "image":
      return [
        { id: uid(), type: "rect", x: 90, y: 90, w: 520, h: 540, rot: 0, fill: "rgba(255,255,255,0.08)", stroke: t.accent, strokeW: 2, radius: 18, opacity: 1 },
        mkText({ color: t.text, font: t.body, text: "Ajoutez une image\n(bouton Image)", x: 90, y: 320, w: 520, h: 80, size: 22, align: "center" }),
        mkText({ ...head, text: "Titre", x: 660, y: 150, w: 530, h: 90, size: 44, weight: 800 }),
        mkText({ ...body, text: "• Point clé\n• Point clé\n• Point clé", x: 660, y: 260, w: 530, h: 360, size: 30, lineHeight: 1.5 }),
      ];
    default:
      return [];
  }
}

function migrate(content: string): Deck {
  try {
    const d = JSON.parse(content) as Deck & { slides?: unknown };
    if (Array.isArray(d?.slides) && d.slides.length && (d.slides[0] as Slide).els) return d as Deck;
    // Ancien format { slides: [{ title, bullets[] }] } -> conversion en diapos riches.
    const old = d as unknown as { slides?: { title?: string; bullets?: string[] }[] };
    if (Array.isArray(old?.slides)) {
      const t = themeOf("aurore");
      return {
        theme: "aurore",
        slides: old.slides.map((s, i) => {
          const els = i === 0
            ? [mkText({ color: t.text, font: t.head, text: s.title || "Titre", x: 160, y: 225, w: 960, h: 190, size: 72, weight: 800, align: "center" }),
               mkText({ color: t.accent, font: t.body, text: (s.bullets ?? []).join("  ·  "), x: 160, y: 410, w: 960, h: 60, size: 28, align: "center" })]
            : [mkText({ color: t.text, font: t.head, text: s.title || "Titre", x: 90, y: 70, w: 1100, h: 90, size: 48, weight: 800 }),
               { id: uid(), type: "rect" as ElType, x: 90, y: 168, w: 90, h: 6, rot: 0, fill: t.accent, radius: 3, opacity: 1 },
               mkText({ color: t.text, font: t.body, text: (s.bullets ?? []).map((b) => `• ${b}`).join("\n"), x: 90, y: 210, w: 1100, h: 420, size: 32, lineHeight: 1.5 })];
          return { id: uid(), bg: t.bg, els };
        }),
      };
    }
  } catch { /* défaut ci-dessous */ }
  const t = themeOf("aurore");
  return { theme: "aurore", slides: [{ id: uid(), bg: t.bg, els: layoutEls("title", t) }] };
}

const HANDLES: { k: string; dir: [number, number]; cx: number; cy: number; cursor: string }[] = [
  { k: "nw", dir: [-1, -1], cx: 0, cy: 0, cursor: "nwse-resize" },
  { k: "n", dir: [0, -1], cx: 0.5, cy: 0, cursor: "ns-resize" },
  { k: "ne", dir: [1, -1], cx: 1, cy: 0, cursor: "nesw-resize" },
  { k: "e", dir: [1, 0], cx: 1, cy: 0.5, cursor: "ew-resize" },
  { k: "se", dir: [1, 1], cx: 1, cy: 1, cursor: "nwse-resize" },
  { k: "s", dir: [0, 1], cx: 0.5, cy: 1, cursor: "ns-resize" },
  { k: "sw", dir: [-1, 1], cx: 0, cy: 1, cursor: "nesw-resize" },
  { k: "w", dir: [-1, 0], cx: 0, cy: 0.5, cursor: "ew-resize" },
];

async function resizeImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = dataUrl;
  });
  const max = 1400;
  let { width, height } = img;
  if (width > max || height > max) {
    const r = Math.min(max / width, max / height);
    width = Math.round(width * r); height = Math.round(height * r);
  }
  const c = document.createElement("canvas");
  c.width = width; c.height = height;
  c.getContext("2d")!.drawImage(img, 0, 0, width, height);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return c.toDataURL(type, 0.85);
}

export function SlidesEditor({
  id, initialName, initialContent, backHref, crumbs,
}: {
  id: string; initialName: string; initialContent: string; backHref: string; crumbs: Crumb[];
}) {
  const [name, setName] = useState(initialName);
  const [deck, setDeck] = useState<Deck>(() => migrate(initialContent));
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [present, setPresent] = useState<number | null>(null);
  const [save, setSave] = useState<SaveState>("saved");
  const [scale, setScale] = useState(0.6);
  const [shapeMenu, setShapeMenu] = useState(false);

  const deckRef = useRef(deck);
  useEffect(() => { deckRef.current = deck; }, [deck]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gesture = useRef<{ kind: string; elId: string; handle?: string; sx: number; sy: number; orig: El; cx?: number; cy?: number } | null>(null);
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);

  const t = themeOf(deck.theme);
  const slide = deck.slides[Math.min(cur, deck.slides.length - 1)] ?? deck.slides[0];
  const selEl = slide?.els.find((e) => e.id === sel) ?? null;

  const persist = useCallback((content: string, patch?: { name?: string }) => {
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, { content, ...patch }).then(() => setSave("saved")).catch(() => setSave("error"));
    }, 500);
  }, [id]);

  const commit = useCallback(() => { persist(JSON.stringify(deckRef.current)); }, [persist]);
  const pushHistory = () => { past.current.push(JSON.stringify(deckRef.current)); if (past.current.length > 60) past.current.shift(); future.current = []; };

  // Applique une mutation immédiate ; `record` gère l'historique + la sauvegarde.
  const mutate = (fn: (d: Deck) => void, record = true) => {
    if (record) pushHistory();
    setDeck((prev) => { const n = structuredClone(prev); fn(n); return n; });
    if (record) setTimeout(commit, 0);
  };
  const setEl = (elId: string, patch: Partial<El>, record = false) => {
    mutate((d) => { const s = d.slides[cur]; const e = s?.els.find((x) => x.id === elId); if (e) Object.assign(e, patch); }, record);
  };

  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(JSON.stringify(deckRef.current)); setDeck(JSON.parse(p)); setSel(null); setTimeout(commit, 0); };
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push(JSON.stringify(deckRef.current)); setDeck(JSON.parse(f)); setSel(null); setTimeout(commit, 0); };

  const onName = (v: string) => { setName(v); persist(JSON.stringify(deckRef.current), { name: v.trim() || "Présentation sans titre" }); };

  // ── Scale du canvas ────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = 48;
      const s = Math.min((el.clientWidth - pad) / W, (el.clientHeight - pad) / H);
      setScale(Math.max(0.15, Math.min(s, 1)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Éléments ───────────────────────────────────────────────────────
  const addEl = (el: El) => { mutate((d) => d.slides[cur].els.push(el)); setSel(el.id); };
  const addText = () => addEl(mkText({ color: t.text, font: t.body, text: "Nouveau texte", x: 480, y: 300, w: 340, h: 90, size: 40 }));
  const addShape = (type: ElType) => {
    setShapeMenu(false);
    if (type === "line" || type === "arrow")
      return addEl({ id: uid(), type, x: 440, y: 340, w: 400, h: 40, rot: 0, stroke: t.accent, strokeW: 5 });
    addEl({ id: uid(), type, x: 470, y: 270, w: 340, h: 200, rot: 0, fill: t.accent, radius: type === "rect" ? 16 : 0, opacity: 1 });
  };
  const onImageFile = async (f: File | undefined) => {
    if (!f) return;
    const src = await resizeImage(f);
    const im = new Image(); im.src = src;
    await new Promise((r) => { im.onload = r; });
    const ratio = im.width / im.height || 1.5;
    const w = Math.min(560, ratio >= 1 ? 560 : 560 * ratio);
    addEl({ id: uid(), type: "image", x: 360, y: 160, w, h: w / ratio, rot: 0, src, radius: 8, opacity: 1 });
  };
  const deleteEl = (elId: string) => { mutate((d) => { d.slides[cur].els = d.slides[cur].els.filter((e) => e.id !== elId); }); setSel(null); setEditing(null); };
  const dupEl = (elId: string) => { const e = slide.els.find((x) => x.id === elId); if (!e) return; const c = { ...structuredClone(e), id: uid(), x: e.x + 24, y: e.y + 24 }; addEl(c); };
  const layer = (elId: string, dir: 1 | -1 | "front" | "back") =>
    mutate((d) => {
      const s = d.slides[cur]; const i = s.els.findIndex((e) => e.id === elId); if (i < 0) return;
      const [e] = s.els.splice(i, 1);
      if (dir === "front") s.els.push(e);
      else if (dir === "back") s.els.unshift(e);
      else s.els.splice(Math.max(0, Math.min(s.els.length, i + dir)), 0, e);
    });

  // ── Slides ─────────────────────────────────────────────────────────
  const addSlide = (kind = "content") => { const s: Slide = { id: uid(), bg: t.bg, els: layoutEls(kind, t) }; mutate((d) => d.slides.splice(cur + 1, 0, s)); setCur(cur + 1); setSel(null); };
  const dupSlide = () => { const s = structuredClone(slide); s.id = uid(); s.els = s.els.map((e) => ({ ...e, id: uid() })); mutate((d) => d.slides.splice(cur + 1, 0, s)); setCur(cur + 1); };
  const delSlide = () => { if (deck.slides.length <= 1) return; mutate((d) => d.slides.splice(cur, 1)); setCur(Math.max(0, cur - 1)); setSel(null); };
  const moveSlide = (dir: -1 | 1) => { const j = cur + dir; if (j < 0 || j >= deck.slides.length) return; mutate((d) => { [d.slides[cur], d.slides[j]] = [d.slides[j], d.slides[cur]]; }); setCur(j); };
  const setSlideBg = (bg: string) => mutate((d) => { d.slides[cur].bg = bg; });
  // Ajoute un décor en arrière-plan (déplaçable / modifiable comme tout élément).
  const addDecor = (kind: string) => {
    const els = decorEls(kind, t.accent);
    if (!els.length) return;
    mutate((d) => { d.slides[cur].els.unshift(...els); });
    setSel(els[els.length - 1].id);
  };

  const applyTheme = (name: string) => {
    const th = themeOf(name);
    mutate((d) => {
      d.theme = name;
      for (const s of d.slides) {
        s.bg = th.bg;
        for (const e of s.els) if (e.type === "text") e.color = th.text;
      }
    });
  };

  // ── Gestes (déplacer / redimensionner / pivoter) ───────────────────
  const stageScale = () => (stageRef.current ? stageRef.current.getBoundingClientRect().width / W : scale);
  const startMove = (e: React.PointerEvent, elId: string) => {
    if (editing) return;
    e.stopPropagation();
    setSel(elId);
    if (e.button !== 0) return;
    const orig = slide.els.find((x) => x.id === elId); if (!orig) return;
    pushHistory();
    gesture.current = { kind: "move", elId, sx: e.clientX, sy: e.clientY, orig: { ...orig } };
    addListeners();
  };
  const startResize = (e: React.PointerEvent, elId: string, handle: string) => {
    e.stopPropagation();
    const orig = slide.els.find((x) => x.id === elId); if (!orig) return;
    pushHistory();
    gesture.current = { kind: "resize", elId, handle, sx: e.clientX, sy: e.clientY, orig: { ...orig } };
    addListeners();
  };
  const startRotate = (e: React.PointerEvent, elId: string) => {
    e.stopPropagation();
    const orig = slide.els.find((x) => x.id === elId); if (!orig || !stageRef.current) return;
    pushHistory();
    const r = stageRef.current.getBoundingClientRect(); const s = r.width / W;
    gesture.current = { kind: "rotate", elId, sx: e.clientX, sy: e.clientY, orig: { ...orig }, cx: r.left + (orig.x + orig.w / 2) * s, cy: r.top + (orig.y + orig.h / 2) * s };
    addListeners();
  };
  const onMove = (e: PointerEvent) => {
    const g = gesture.current; if (!g) return;
    const s = stageScale();
    if (g.kind === "move") {
      setEl(g.elId, { x: g.orig.x + (e.clientX - g.sx) / s, y: g.orig.y + (e.clientY - g.sy) / s });
    } else if (g.kind === "resize") {
      const hd = HANDLES.find((h) => h.k === g.handle)!; const [dx, dy] = hd.dir;
      const l0x = (e.clientX - g.sx) / s, l0y = (e.clientY - g.sy) / s;
      const a = -g.orig.rot * Math.PI / 180;
      const lx = l0x * Math.cos(a) - l0y * Math.sin(a);
      const ly = l0x * Math.sin(a) + l0y * Math.cos(a);
      const newW = Math.max(24, g.orig.w + dx * lx);
      const newH = Math.max(24, g.orig.h + dy * ly);
      const adw = newW - g.orig.w, adh = newH - g.orig.h;
      const slx = dx * adw / 2, sly = dy * adh / 2;
      const ca = Math.cos(g.orig.rot * Math.PI / 180), sa = Math.sin(g.orig.rot * Math.PI / 180);
      const cx0 = g.orig.x + g.orig.w / 2, cy0 = g.orig.y + g.orig.h / 2;
      const ncx = cx0 + (slx * ca - sly * sa), ncy = cy0 + (slx * sa + sly * ca);
      setEl(g.elId, { w: newW, h: newH, x: ncx - newW / 2, y: ncy - newH / 2 });
    } else if (g.kind === "rotate") {
      let deg = Math.atan2(e.clientY - (g.cy ?? 0), e.clientX - (g.cx ?? 0)) * 180 / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      setEl(g.elId, { rot: Math.round(deg) });
    }
  };
  const onUp = () => { gesture.current = null; removeListeners(); commit(); };
  const addListeners = () => { window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp, { once: true }); };
  const removeListeners = () => { window.removeEventListener("pointermove", onMove); };

  // ── Clavier ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (present != null) {
        if (e.key === "ArrowRight" || e.key === " ") setPresent((p) => (p == null ? p : Math.min(p + 1, deck.slides.length - 1)));
        else if (e.key === "ArrowLeft") setPresent((p) => (p == null ? p : Math.max(p - 1, 0)));
        else if (e.key === "Escape") setPresent(null);
        return;
      }
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && sel) { e.preventDefault(); dupEl(sel); return; }
      if (typing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); deleteEl(sel); }
      else if (e.key === "Escape") { setSel(null); setEditing(null); }
      else if (sel && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 20 : 2;
        const p: Partial<El> = {};
        if (e.key === "ArrowLeft") p.x = (selEl?.x ?? 0) - d;
        if (e.key === "ArrowRight") p.x = (selEl?.x ?? 0) + d;
        if (e.key === "ArrowUp") p.y = (selEl?.y ?? 0) - d;
        if (e.key === "ArrowDown") p.y = (selEl?.y ?? 0) + d;
        setEl(sel, p, true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, sel, selEl, deck.slides.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyAi = (data: unknown) => {
    const d = data as { slides?: { title: string; bullets: string[] }[] };
    if (!d?.slides?.length) return;
    mutate((dk) => {
      dk.slides = d.slides!.map((s, i) => {
        const th = themeOf(dk.theme);
        const els = i === 0
          ? [mkText({ color: th.text, font: th.head, text: s.title, x: 160, y: 225, w: 960, h: 190, size: 72, weight: 800, align: "center" }),
             mkText({ color: th.accent, font: th.body, text: (s.bullets ?? []).join("  ·  "), x: 160, y: 415, w: 960, h: 60, size: 28, align: "center" })]
          : [mkText({ color: th.text, font: th.head, text: s.title, x: 90, y: 70, w: 1100, h: 90, size: 48, weight: 800 }),
             { id: uid(), type: "rect" as ElType, x: 90, y: 168, w: 90, h: 6, rot: 0, fill: th.accent, radius: 3, opacity: 1 },
             mkText({ color: th.text, font: th.body, text: (s.bullets ?? []).map((b) => `• ${b}`).join("\n"), x: 90, y: 210, w: 1100, h: 430, size: 32, lineHeight: 1.5 })];
        return { id: uid(), bg: th.bg, els };
      });
    });
    setCur(0); setSel(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 sm:px-5 flex items-center gap-2 sm:gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour"><ArrowLeft className="size-5" /></Link>
        <Presentation className="size-4 shrink-0 text-rose-400" />
        <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 w-40 sm:w-64 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" placeholder="Présentation sans titre" />
        <div className="hidden sm:flex items-center gap-0.5 ml-1">
          <button onClick={undo} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white" title="Annuler (⌘Z)"><Undo2 className="size-4" /></button>
          <button onClick={redo} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white" title="Rétablir (⌘⇧Z)"><Redo2 className="size-4" /></button>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : save === "error" ? <span className="text-red-400">Erreur</span> : <Check className="size-3.5 text-emerald-400" />}
        </div>
        <button onClick={() => setPresent(cur)} className="flex h-9 items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/15"><Play className="size-4" /> <span className="hidden sm:inline">Présenter</span></button>
        <AiAssistant
          kind="slides" title="Assistant présentation" accent="#fb7185"
          onApplyData={applyAi}
          placeholder="Ex. « présentation de notre offre en 8 diapos »"
          quickActions={[{ action: "generate", label: "Générer la présentation", icon: SparkleIcon }]}
        />
      </header>

      {/* Barre d'outils insertion */}
      <div className="h-11 shrink-0 border-b border-white/10 bg-white/[0.02] px-3 sm:px-5 flex items-center gap-1.5">
        <ToolBtn onClick={addText} icon={Type} label="Texte" />
        <div className="relative">
          <ToolBtn onClick={() => setShapeMenu((v) => !v)} icon={Square} label="Forme" caret />
          {shapeMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShapeMenu(false)} />
              <div className="absolute left-0 top-10 z-40 w-44 rounded-xl border border-white/10 bg-[#0f1017]/97 p-1.5 shadow-2xl backdrop-blur-xl">
                {[{ t: "rect", i: Square, l: "Rectangle" }, { t: "ellipse", i: Circle, l: "Ellipse" }, { t: "line", i: Minus, l: "Ligne" }, { t: "arrow", i: MoveUpRight, l: "Flèche" }].map((o) => (
                  <button key={o.t} onClick={() => addShape(o.t as ElType)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/5"><o.i className="size-4 text-brand-200" /> {o.l}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <ToolBtn onClick={() => fileRef.current?.click()} icon={ImageIcon} label="Image" />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onImageFile(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn onClick={() => addSlide("content")} icon={Plus} label="Diapo" />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Rail des diapos */}
        <div className="w-36 sm:w-48 shrink-0 overflow-y-auto border-r border-white/10 bg-white/[0.015] p-2 space-y-2">
          {deck.slides.map((s, i) => (
            <div key={s.id} className="group relative">
              <button onClick={() => { setCur(i); setSel(null); }} className={`block w-full overflow-hidden rounded-lg border-2 transition ${i === cur ? "border-brand-400" : "border-white/10 hover:border-white/25"}`}>
                <Stage slide={s} scale={(144 / W)} />
              </button>
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white/80">{i + 1}</span>
            </div>
          ))}
          <button onClick={() => addSlide("content")} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 py-2 text-xs text-muted hover:border-white/30 hover:text-white"><Plus className="size-3.5" /> Diapo</button>
        </div>

        {/* Canvas */}
        <div ref={wrapRef} className="relative flex-1 min-h-0 grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_70%)] p-6" onPointerDown={() => setSel(null)}>
          <div className="shadow-2xl shadow-black/50" onPointerDown={(e) => e.stopPropagation()}>
            <Stage
              ref={stageRef}
              slide={slide}
              scale={scale}
              editable
              sel={sel}
              editing={editing}
              onSelect={setSel}
              onStartMove={startMove}
              onStartResize={startResize}
              onStartRotate={startRotate}
              onEdit={setEditing}
              onText={(elId, text) => setEl(elId, { text }, true)}
            />
          </div>
          {/* Barre de diapos */}
          <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#0f1017]/90 px-2 py-1 text-xs text-muted backdrop-blur">
            <button onClick={() => moveSlide(-1)} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Diapo précédente"><ChevronUp className="size-4" /></button>
            <span className="px-1 tabular-nums">{cur + 1} / {deck.slides.length}</span>
            <button onClick={() => moveSlide(1)} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Diapo suivante"><ChevronDown className="size-4" /></button>
            <div className="mx-1 h-4 w-px bg-white/10" />
            <button onClick={dupSlide} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Dupliquer"><Copy className="size-4" /></button>
            <button onClick={delSlide} className="grid size-7 place-items-center rounded-full hover:bg-red-500/10 hover:text-red-400" title="Supprimer"><Trash2 className="size-4" /></button>
          </div>
        </div>

        {/* Panneau de format */}
        <div className="hidden md:block w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-white/[0.02] p-4">
          {selEl ? (
            <ElementPanel el={selEl} onChange={(p, rec) => setEl(selEl.id, p, rec)} onDup={() => dupEl(selEl.id)} onDelete={() => deleteEl(selEl.id)} onLayer={(d) => layer(selEl.id, d)} onReplaceImage={() => fileRef.current?.click()} />
          ) : (
            <SlidePanel theme={deck.theme} slideBg={slide.bg} onTheme={applyTheme} onBg={setSlideBg} onDecor={addDecor} onLayout={(k) => mutate((d) => { d.slides[cur].els = layoutEls(k, themeOf(d.theme)); })} onAddSlide={addSlide} />
          )}
        </div>
      </div>

      {/* Mode présentation */}
      {present != null && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black" onClick={() => setPresent((p) => (p == null ? p : Math.min(p + 1, deck.slides.length - 1)))}>
          <button onClick={(e) => { e.stopPropagation(); setPresent(null); }} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="size-5" /></button>
          <div className="flex flex-1 items-center justify-center">
            <PresentStage slide={deck.slides[present]} />
          </div>
          <div className="flex items-center justify-center gap-4 pb-5 text-sm text-white/50">
            <span className="tabular-nums">{present + 1} / {deck.slides.length}</span>
            <span className="hidden sm:inline">← → naviguer · Échap quitter</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Le plateau (rend une diapo, éditable ou non) ─────────────────────
type StageProps = {
  slide: Slide; scale: number; editable?: boolean; sel?: string | null; editing?: string | null;
  onSelect?: (id: string) => void;
  onStartMove?: (e: React.PointerEvent, id: string) => void;
  onStartResize?: (e: React.PointerEvent, id: string, handle: string) => void;
  onStartRotate?: (e: React.PointerEvent, id: string) => void;
  onEdit?: (id: string | null) => void;
  onText?: (id: string, text: string) => void;
};
const Stage = forwardRef<HTMLDivElement, StageProps>(function Stage(
  { slide, scale, editable, sel, editing, onSelect, onStartMove, onStartResize, onStartRotate, onEdit, onText }, ref,
) {
  return (
    <div style={{ width: W * scale, height: H * scale, position: "relative" }}>
      <div ref={ref} style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", overflow: "hidden", background: slide.bg }}>
        {slide.els.map((el) => (
          <ElementView key={el.id} el={el} scale={scale} editable={editable} selected={sel === el.id} editing={editing === el.id}
            onSelect={onSelect} onStartMove={onStartMove} onStartResize={onStartResize} onStartRotate={onStartRotate} onEdit={onEdit} onText={onText} />
        ))}
      </div>
    </div>
  );
});

function ElementView({ el, scale, editable, selected, editing, onSelect, onStartMove, onStartResize, onStartRotate, onEdit, onText }: {
  el: El; scale: number; editable?: boolean; selected?: boolean; editing?: boolean;
  onSelect?: (id: string) => void;
  onStartMove?: (e: React.PointerEvent, id: string) => void;
  onStartResize?: (e: React.PointerEvent, id: string, handle: string) => void;
  onStartRotate?: (e: React.PointerEvent, id: string) => void;
  onEdit?: (id: string | null) => void;
  onText?: (id: string, text: string) => void;
}) {
  const hs = 11 / scale; // taille d'un handle en unités logiques (≈ constante à l'écran)
  const wrap: React.CSSProperties = {
    position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h,
    transform: `rotate(${el.rot}deg)`, transformOrigin: "center", boxSizing: "border-box",
  };
  let inner: React.ReactNode = null;
  if (el.type === "text") {
    const style: React.CSSProperties = {
      width: "100%", height: "100%", fontFamily: fontCss(el.font), fontSize: el.size, fontWeight: el.weight,
      fontStyle: el.italic ? "italic" : "normal", textDecoration: el.underline ? "underline" : "none",
      textAlign: el.align, color: el.color, lineHeight: el.lineHeight ?? 1.25, whiteSpace: "pre-wrap",
      wordBreak: "break-word", outline: "none", padding: 4, overflow: "hidden",
    };
    inner = editing ? (
      <div contentEditable suppressContentEditableWarning autoFocus
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={(e) => { onText?.(el.id, e.currentTarget.innerText); onEdit?.(null); }}
        style={style}>{el.text}</div>
    ) : (<div style={{ ...style, cursor: editable ? "move" : "default" }}>{el.text}</div>);
  } else if (el.type === "rect" || el.type === "ellipse") {
    inner = <div style={{ width: "100%", height: "100%", background: el.fill, opacity: el.opacity, borderRadius: el.type === "ellipse" ? "50%" : el.radius, border: el.stroke ? `${el.strokeW ?? 2}px solid ${el.stroke}` : undefined, boxSizing: "border-box" }} />;
  } else if (el.type === "line" || el.type === "arrow") {
    inner = (
      <svg width="100%" height="100%" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
        {el.type === "arrow" && (
          <defs><marker id={`ah-${el.id}`} markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill={el.stroke} /></marker></defs>
        )}
        <line x1={0} y1={el.h / 2} x2={el.w} y2={el.h / 2} stroke={el.stroke} strokeWidth={el.strokeW} strokeLinecap="round" markerEnd={el.type === "arrow" ? `url(#ah-${el.id})` : undefined} />
      </svg>
    );
  } else if (el.type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    inner = <img src={el.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: el.opacity, borderRadius: el.radius, pointerEvents: "none" }} />;
  }

  return (
    <div
      style={wrap}
      onPointerDown={(e) => editable && onStartMove?.(e, el.id)}
      onClick={(e) => { e.stopPropagation(); onSelect?.(el.id); }}
      onDoubleClick={(e) => { if (el.type === "text" && editable) { e.stopPropagation(); onEdit?.(el.id); } }}
    >
      {inner}
      {editable && selected && !editing && (
        <>
          <div style={{ position: "absolute", inset: 0, border: `${1.5 / scale}px solid #5b8bff`, pointerEvents: "none" }} />
          {/* poignée de rotation */}
          <div onPointerDown={(e) => onStartRotate?.(e, el.id)}
            style={{ position: "absolute", left: "50%", top: -28 / scale, width: hs, height: hs, marginLeft: -hs / 2, borderRadius: "50%", background: "#5b8bff", border: `${1.5 / scale}px solid #fff`, cursor: "grab" }} />
          <div style={{ position: "absolute", left: "50%", top: -28 / scale + hs, width: 1.5 / scale, height: 28 / scale - hs, background: "#5b8bff", marginLeft: -0.75 / scale, pointerEvents: "none" }} />
          {HANDLES.map((h) => (
            <div key={h.k} onPointerDown={(e) => onStartResize?.(e, el.id, h.k)}
              style={{ position: "absolute", left: `${h.cx * 100}%`, top: `${h.cy * 100}%`, width: hs, height: hs, marginLeft: -hs / 2, marginTop: -hs / 2, background: "#fff", border: `${1.5 / scale}px solid #5b8bff`, borderRadius: 2 / scale, cursor: h.cursor }} />
          ))}
        </>
      )}
    </div>
  );
}

// Rend une diapo en plein écran (mode présentation), ajustée à l'écran.
function PresentStage({ slide }: { slide: Slide }) {
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, (window.innerHeight - 60) / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: "none" }}><Stage slide={slide} scale={scale} /></div>;
}

// ── Panneaux ─────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>{children}</label>;
}
function ColorRow({ value, onChange }: { value?: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SWATCHES.map((c) => (
        <button key={c} onClick={() => onChange(c)} className={`size-6 rounded-md border ${value === c ? "border-brand-400 ring-2 ring-brand-400/40" : "border-white/15"}`} style={{ background: c }} />
      ))}
      <input type="color" value={value?.startsWith("#") ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="size-6 cursor-pointer rounded-md border border-white/15 bg-transparent p-0" />
    </div>
  );
}
function Stepper({ value, onChange, min = 1, max = 400, step = 1 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - step))} className="grid size-7 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5">−</button>
      <input type="number" value={Math.round(value)} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className="h-7 w-14 rounded-lg border border-white/10 bg-white/5 text-center text-sm text-white outline-none" />
      <button onClick={() => onChange(Math.min(max, value + step))} className="grid size-7 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5">+</button>
    </div>
  );
}

function ElementPanel({ el, onChange, onDup, onDelete, onLayer, onReplaceImage }: {
  el: El; onChange: (p: Partial<El>, record?: boolean) => void; onDup: () => void; onDelete: () => void;
  onLayer: (d: 1 | -1 | "front" | "back") => void; onReplaceImage: () => void;
}) {
  const set = (p: Partial<El>) => onChange(p, true);
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{{ text: "Texte", rect: "Rectangle", ellipse: "Ellipse", line: "Ligne", arrow: "Flèche", image: "Image" }[el.type]}</p>

      {el.type === "text" && (
        <>
          <Field label="Police">
            <select value={el.font} onChange={(e) => set({ font: e.target.value })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none">
              {FONTS.map((f) => <option key={f.key} value={f.key} className="bg-[#0f1017]">{f.label}</option>)}
            </select>
          </Field>
          <div className="flex items-end justify-between gap-2">
            <Field label="Taille"><Stepper value={el.size ?? 40} onChange={(n) => set({ size: n })} min={8} max={300} step={2} /></Field>
            <div className="flex items-center gap-1">
              <IconToggle on={(el.weight ?? 400) >= 600} onClick={() => set({ weight: (el.weight ?? 400) >= 600 ? 400 : 700 })} icon={Bold} />
              <IconToggle on={!!el.italic} onClick={() => set({ italic: !el.italic })} icon={Italic} />
              <IconToggle on={!!el.underline} onClick={() => set({ underline: !el.underline })} icon={UnderlineIcon} />
            </div>
          </div>
          <Field label="Alignement">
            <div className="flex gap-1">
              {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, I]) => (
                <IconToggle key={a} on={el.align === a} onClick={() => set({ align: a })} icon={I} />
              ))}
            </div>
          </Field>
          <Field label="Couleur du texte"><ColorRow value={el.color} onChange={(c) => set({ color: c })} /></Field>
        </>
      )}

      {(el.type === "rect" || el.type === "ellipse") && (
        <>
          <Field label="Remplissage"><ColorRow value={el.fill} onChange={(c) => set({ fill: c })} /></Field>
          <Field label="Bordure"><ColorRow value={el.stroke ?? "#ffffff"} onChange={(c) => set({ stroke: c })} /></Field>
          <div className="flex items-end gap-3">
            <Field label="Épaisseur"><Stepper value={el.strokeW ?? 0} onChange={(n) => set({ strokeW: n })} min={0} max={40} /></Field>
            {el.type === "rect" && <Field label="Arrondi"><Stepper value={el.radius ?? 0} onChange={(n) => set({ radius: n })} min={0} max={200} step={2} /></Field>}
          </div>
          <Field label={`Opacité ${Math.round((el.opacity ?? 1) * 100)}%`}><input type="range" min={10} max={100} value={(el.opacity ?? 1) * 100} onChange={(e) => set({ opacity: Number(e.target.value) / 100 })} className="w-full accent-brand-500" /></Field>
        </>
      )}

      {(el.type === "line" || el.type === "arrow") && (
        <>
          <Field label="Couleur"><ColorRow value={el.stroke} onChange={(c) => set({ stroke: c })} /></Field>
          <Field label="Épaisseur"><Stepper value={el.strokeW ?? 4} onChange={(n) => set({ strokeW: n })} min={1} max={40} /></Field>
        </>
      )}

      {el.type === "image" && (
        <>
          <button onClick={onReplaceImage} className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-white/85 hover:bg-white/10">Remplacer l'image</button>
          <Field label="Arrondi"><Stepper value={el.radius ?? 0} onChange={(n) => set({ radius: n })} min={0} max={300} step={4} /></Field>
          <Field label={`Opacité ${Math.round((el.opacity ?? 1) * 100)}%`}><input type="range" min={10} max={100} value={(el.opacity ?? 1) * 100} onChange={(e) => set({ opacity: Number(e.target.value) / 100 })} className="w-full accent-brand-500" /></Field>
        </>
      )}

      <div className="border-t border-white/10 pt-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Disposition</p>
        <div className="grid grid-cols-4 gap-1.5">
          <PanelBtn onClick={() => onLayer("front")} icon={BringToFront} title="Premier plan" />
          <PanelBtn onClick={() => onLayer("back")} icon={SendToBack} title="Arrière-plan" />
          <PanelBtn onClick={onDup} icon={Copy} title="Dupliquer" />
          <PanelBtn onClick={onDelete} icon={Trash2} title="Supprimer" danger />
        </div>
      </div>
    </div>
  );
}

function SlidePanel({ theme, slideBg, onTheme, onBg, onDecor, onLayout, onAddSlide }: {
  theme: string; slideBg: string; onTheme: (n: string) => void; onBg: (bg: string) => void; onDecor: (k: string) => void; onLayout: (k: string) => void; onAddSlide: (k: string) => void;
}) {
  const layouts = [{ k: "title", l: "Titre" }, { k: "content", l: "Titre + contenu" }, { k: "two", l: "Deux colonnes" }, { k: "section", l: "Section" }, { k: "image", l: "Image + texte" }];
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Palette className="size-3.5" /> Thème</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((th) => (
            <button key={th.name} onClick={() => onTheme(th.name)} className={`overflow-hidden rounded-xl border text-left transition ${theme === th.name ? "border-brand-400 ring-2 ring-brand-400/30" : "border-white/10 hover:border-white/25"}`}>
              <div className="h-10" style={{ background: th.bg }} />
              <div className="flex items-center gap-1 px-2 py-1.5"><span className="size-2.5 rounded-full" style={{ background: th.accent }} /><span className="text-xs">{th.label}</span></div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><LayoutTemplate className="size-3.5" /> Mise en page</p>
        <div className="grid grid-cols-1 gap-1.5">
          {layouts.map((l) => (
            <div key={l.k} className="flex items-center gap-1.5">
              <button onClick={() => onLayout(l.k)} className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-white/85 hover:bg-white/[0.07]">{l.l}</button>
              <button onClick={() => onAddSlide(l.k)} title="Ajouter en nouvelle diapo" className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5 hover:text-white"><Plus className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>
      <BackgroundPanel slideBg={slideBg} onBg={onBg} onDecor={onDecor} />
    </div>
  );
}

function BackgroundPanel({ slideBg, onBg, onDecor }: { slideBg: string; onBg: (bg: string) => void; onDecor: (k: string) => void }) {
  const [m, setM] = useState<BgModel>(() => parseBg(slideBg));
  const emitted = useRef(slideBg);
  useEffect(() => {
    if (slideBg !== emitted.current) { setM(parseBg(slideBg)); emitted.current = slideBg; }
  }, [slideBg]);
  const apply = (next: BgModel) => { setM(next); const s = buildBg(next); emitted.current = s; onBg(s); };

  const setKind = (kind: BgKind) => {
    if (kind === m.kind) return;
    if (kind === "solid") apply({ kind, angle: m.angle, colors: [m.colors[0] ?? "#0a0e1a"] });
    else apply({ kind, angle: m.angle, colors: m.colors.length >= 2 ? m.colors : [m.colors[0] ?? "#3b6dff", "#7b3bff"] });
  };
  const setColor = (i: number, c: string) => { const colors = m.colors.slice(); colors[i] = c; apply({ ...m, colors }); };
  const addStop = () => { if (m.colors.length < 5) apply({ ...m, colors: [...m.colors, "#ffffff"] }); };
  const removeStop = (i: number) => { if (m.colors.length > 2) apply({ ...m, colors: m.colors.filter((_, j) => j !== i) }); };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Fond de la diapo</p>
      {/* Aperçu du fond courant */}
      <div className="mb-2.5 h-16 rounded-xl border border-white/10" style={{ background: buildBg(m) }} />
      {/* Type de fond */}
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
        {([["solid", "Uni", PaintBucket], ["linear", "Dégradé", Blend], ["radial", "Radial", Circle]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setKind(k)} className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs transition ${m.kind === k ? "bg-brand-500/25 text-white" : "text-muted hover:bg-white/5"}`}>
            <I className="size-3.5" /> {l}
          </button>
        ))}
      </div>

      {m.kind === "solid" ? (
        <ColorRow value={m.colors[0]} onChange={(c) => setColor(0, c)} />
      ) : (
        <div className="space-y-2">
          {m.colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={c.startsWith("#") ? c : "#ffffff"} onChange={(e) => setColor(i, e.target.value)} className="size-7 shrink-0 cursor-pointer rounded-md border border-white/15 bg-transparent p-0" />
              <span className="flex-1 truncate font-mono text-[11px] text-muted">{c}</span>
              {m.colors.length > 2 && (
                <button onClick={() => removeStop(i)} className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-red-400" title="Retirer"><X className="size-3.5" /></button>
              )}
            </div>
          ))}
          {m.colors.length < 5 && (
            <button onClick={addStop} className="flex items-center gap-1 text-xs text-brand-200 hover:text-white"><Plus className="size-3.5" /> Ajouter une couleur</button>
          )}
          {m.kind === "linear" && (
            <label className="block pt-1">
              <span className="mb-1 flex justify-between text-[11px] uppercase tracking-wide text-muted"><span>Angle</span><span className="tabular-nums">{m.angle}°</span></span>
              <input type="range" min={0} max={360} value={m.angle} onChange={(e) => apply({ ...m, angle: Number(e.target.value) })} className="w-full accent-brand-500" />
            </label>
          )}
          <div className="pt-1">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">Inspirations</p>
            <div className="grid grid-cols-6 gap-1.5">
              {GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => apply({ kind: m.kind, angle: m.angle, colors: g })} title="Appliquer" className="h-7 rounded-md border border-white/10 hover:border-white/30" style={{ background: `linear-gradient(135deg,${g.join(",")})` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Décor : éléments ajoutés en arrière-plan */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Décor</p>
        <div className="grid grid-cols-2 gap-1.5">
          {([["bulle", "Bulle", Circle], ["bulles", "Bulles", Droplets], ["trait", "Trait", Minus], ["cadre", "Cadre", Frame]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => onDecor(k)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85 hover:bg-white/[0.07]">
              <I className="size-4 text-brand-200" /> {l}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted">Ajoutés en arrière-plan — déplaçables, redimensionnables et personnalisables comme n'importe quel élément.</p>
      </div>
    </div>
  );
}

function ToolBtn({ onClick, icon: I, label, caret }: { onClick: () => void; icon: typeof Type; label: string; caret?: boolean }) {
  return (
    <button onClick={onClick} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/85 hover:bg-white/10">
      <I className="size-4" /> <span className="hidden sm:inline">{label}</span>{caret && <ChevronDown className="size-3" />}
    </button>
  );
}
function IconToggle({ on, onClick, icon: I }: { on?: boolean; onClick: () => void; icon: typeof Bold }) {
  return <button onClick={onClick} className={`grid size-8 place-items-center rounded-lg border transition ${on ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}><I className="size-4" /></button>;
}
function PanelBtn({ onClick, icon: I, title, danger }: { onClick: () => void; icon: typeof Copy; title: string; danger?: boolean }) {
  return <button onClick={onClick} title={title} className={`grid h-9 place-items-center rounded-lg border border-white/10 transition ${danger ? "text-muted hover:bg-red-500/10 hover:text-red-400" : "text-white/80 hover:bg-white/5"}`}><I className="size-4" /></button>;
}
