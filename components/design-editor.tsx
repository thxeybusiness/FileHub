"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Home, ChevronRight, Check, Loader2, Shapes, Type, Square, Circle,
  Triangle as TriangleIcon, Minus, Image as ImageIcon, Undo2, Redo2, Download,
  ZoomIn, ZoomOut, Maximize2, Trash2, Copy, Eye, EyeOff, Lock, Unlock, X, Plus,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical,
  AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Bold, Italic, Underline, ChevronUp, ChevronDown, Layers as LayersIcon,
  SlidersHorizontal, LayoutGrid, Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAutosave } from "./use-autosave";
import {
  type DesignDoc, type Layer, type TextLayer, type ImageLayer, type Filters,
  parseDesign, makeLayer, filterCss, newId, FONTS, BLEND_MODES, SIZE_PRESETS,
  NEUTRAL_FILTERS, rasterize,
} from "@/lib/design";

type Crumb = { id: string; name: string };
const ACCENT = "#a855f7";
const MIN_SIZE = 8;

/* ───────── couleur : conversions minimales ───────── */
const clampN = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const to2 = (n: number) => clampN(Math.round(n), 0, 255).toString(16).padStart(2, "0");
function normHex(h: string): string {
  let s = (h || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return "#000000";
  return "#" + s.toLowerCase();
}
function hexToRgb(h: string): [number, number, number] {
  const s = normHex(h).slice(1);
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
const rgbToHex = (r: number, g: number, b: number) => "#" + to2(r) + to2(g) + to2(b);
function hexToHsv(hex: string): [number, number, number] {
  let [r, g, b] = hexToRgb(hex); r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, (max === 0 ? 0 : d / max) * 100, max * 100];
}
function hsvToHex(h: number, s: number, v: number): string {
  h = ((h % 360) + 360) % 360; s /= 100; v /= 100;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
const PRESETS = [
  "#000000", "#374151", "#6b7280", "#d1d5db", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
];

type LayerPatch = Partial<{
  name: string; x: number; y: number; w: number; h: number; rotation: number;
  opacity: number; blend: Layer["blend"]; visible: boolean; locked: boolean;
  fill: string; stroke: string; strokeWidth: number; radius: number;
  text: string; color: string; fontFamily: string; fontSize: number; fontWeight: number;
  italic: boolean; underline: boolean; align: "left" | "center" | "right"; lineHeight: number; letterSpacing: number;
  src: string; filters: Filters; naturalW: number; naturalH: number;
}>;

/* ═══════════════════════ Composant principal ═══════════════════════ */
export function DesignEditor({
  id, initialName, initialContent, backHref, crumbs, canEdit = true,
}: {
  id: string;
  initialName: string;
  initialContent: string;
  backHref: string;
  crumbs: Crumb[];
  canEdit?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [doc, setDoc] = useState<DesignDoc>(() => parseDesign(initialContent));
  const [selId, setSelId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const [past, setPast] = useState<DesignDoc[]>([]);
  const [future, setFuture] = useState<DesignDoc[]>([]);
  const [tab, setTab] = useState<"props" | "layers">("layers");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [sizeOpen, setSizeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const docRef = useRef(doc); docRef.current = doc;
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const innerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);

  const doSave = useCallback(
    (p: { content?: string; name?: string }, keepalive: boolean) => api.saveContent(id, p, keepalive),
    [id],
  );
  const { state: save, schedule } = useAutosave(doSave, {});

  const persist = useCallback((next: DesignDoc) => {
    if (!canEdit) return;
    schedule({ content: JSON.stringify(next) });
  }, [canEdit, schedule]);

  /* ── modifications du document ── */
  const setLive = useCallback((updater: (d: DesignDoc) => DesignDoc) => {
    setDoc((prev) => { const next = updater(prev); persist(next); return next; });
  }, [persist]);

  const pushHistory = useCallback((snapshot: DesignDoc) => {
    setPast((p) => [...p, snapshot].slice(-60));
    setFuture([]);
  }, []);

  // Modification atomique (crée un point d'annulation).
  const commit = useCallback((updater: (d: DesignDoc) => DesignDoc) => {
    if (!canEdit) return;
    pushHistory(docRef.current);
    setLive(updater);
  }, [canEdit, pushHistory, setLive]);

  const sel = useMemo(() => doc.layers.find((l) => l.id === selId) ?? null, [doc.layers, selId]);

  const patchLayer = useCallback((lid: string, patch: LayerPatch) => {
    setLive((d) => ({ ...d, layers: d.layers.map((l) => (l.id === lid ? ({ ...l, ...patch } as Layer) : l)) }));
  }, [setLive]);
  const commitPatch = useCallback((lid: string, patch: LayerPatch) => {
    if (!canEdit) return;
    pushHistory(docRef.current);
    patchLayer(lid, patch);
  }, [canEdit, pushHistory, patchLayer]);

  /* ── ajout / suppression / ordre ── */
  const addLayer = useCallback((type: Layer["type"], patch?: Partial<Layer>) => {
    if (!canEdit) return;
    const l = makeLayer(type, docRef.current, patch);
    commit((d) => ({ ...d, layers: [...d.layers, l] }));
    setSelId(l.id);
    setTab("props");
    return l;
  }, [canEdit, commit]);

  const removeLayer = useCallback((lid: string) => {
    commit((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== lid) }));
    setSelId((s) => (s === lid ? null : s));
  }, [commit]);

  const duplicateLayer = useCallback((lid: string) => {
    const src = docRef.current.layers.find((l) => l.id === lid);
    if (!src) return;
    const copy = { ...src, id: newId(), x: src.x + 24, y: src.y + 24, name: `${src.name} copie` } as Layer;
    commit((d) => {
      const i = d.layers.findIndex((l) => l.id === lid);
      const layers = [...d.layers]; layers.splice(i + 1, 0, copy); return { ...d, layers };
    });
    setSelId(copy.id);
  }, [commit]);

  const moveLayerOrder = useCallback((lid: string, dir: -1 | 1) => {
    commit((d) => {
      const i = d.layers.findIndex((l) => l.id === lid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.layers.length) return d;
      const layers = [...d.layers];
      [layers[i], layers[j]] = [layers[j], layers[i]];
      return { ...d, layers };
    });
  }, [commit]);

  const alignSel = useCallback((edge: "l" | "c" | "r" | "t" | "m" | "b") => {
    if (!sel) return;
    const d = docRef.current;
    let patch: LayerPatch = {};
    if (edge === "l") patch = { x: 0 };
    else if (edge === "c") patch = { x: Math.round((d.width - sel.w) / 2) };
    else if (edge === "r") patch = { x: d.width - sel.w };
    else if (edge === "t") patch = { y: 0 };
    else if (edge === "m") patch = { y: Math.round((d.height - sel.h) / 2) };
    else patch = { y: d.height - sel.h };
    commitPatch(sel.id, patch);
  }, [sel, commitPatch]);

  /* ── historique ── */
  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [docRef.current, ...f].slice(0, 60));
      setDoc(prev); persist(prev);
      return p.slice(0, -1);
    });
  }, [persist]);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, docRef.current].slice(-60));
      setDoc(next); persist(next);
      return f.slice(1);
    });
  }, [persist]);

  /* ── nom ── */
  const onName = (v: string) => {
    if (!canEdit) return;
    setName(v);
    schedule({ name: v.trim() || "Création" });
  };

  /* ── conversion pointeur → coordonnées toile ── */
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const el = innerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: (clientX - r.left) / zoomRef.current, y: (clientY - r.top) / zoomRef.current };
  }, []);

  /* ── interactions (déplacer / redimensionner / tourner) ── */
  type Drag =
    | { mode: "move"; id: string; startX: number; startY: number; orig: Layer; pushed: boolean; snap: DesignDoc }
    | { mode: "resize"; id: string; handle: string; orig: Layer; pushed: boolean; snap: DesignDoc }
    | { mode: "rotate"; id: string; cx: number; cy: number; startAngle: number; origRot: number; pushed: boolean; snap: DesignDoc };
  const dragRef = useRef<Drag | null>(null);

  const HANDLES: Record<string, { x: number; y: number }> = {
    nw: { x: -1, y: -1 }, n: { x: 0, y: -1 }, ne: { x: 1, y: -1 }, e: { x: 1, y: 0 },
    se: { x: 1, y: 1 }, s: { x: 0, y: 1 }, sw: { x: -1, y: 1 }, w: { x: -1, y: 0 },
  };
  const rotate = (vx: number, vy: number, ang: number) => ({
    x: vx * Math.cos(ang) - vy * Math.sin(ang),
    y: vx * Math.sin(ang) + vy * Math.cos(ang),
  });

  const ensurePushed = () => {
    const dg = dragRef.current;
    if (dg && !dg.pushed) { pushHistory(dg.snap); dg.pushed = true; }
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    const dg = dragRef.current;
    if (!dg) return;
    const p = toCanvas(e.clientX, e.clientY);

    if (dg.mode === "move") {
      ensurePushed();
      let nx = Math.round(dg.orig.x + (p.x - dg.startX));
      let ny = Math.round(dg.orig.y + (p.y - dg.startY));
      const gx: number[] = []; const gy: number[] = [];
      if (dg.orig.rotation === 0) {
        const d = docRef.current;
        const th = 6 / zoomRef.current;
        const w = dg.orig.w, h = dg.orig.h;
        const targX = [0, (d.width - w) / 2, d.width - w];
        const lineX = [0, d.width / 2, d.width];
        targX.forEach((t, i) => { if (Math.abs(nx - t) < th) { nx = Math.round(t); gx.push(lineX[i]); } });
        const targY = [0, (d.height - h) / 2, d.height - h];
        const lineY = [0, d.height / 2, d.height];
        targY.forEach((t, i) => { if (Math.abs(ny - t) < th) { ny = Math.round(t); gy.push(lineY[i]); } });
      }
      setGuides({ x: gx, y: gy });
      patchLayer(dg.id, { x: nx, y: ny });
      return;
    }

    if (dg.mode === "rotate") {
      ensurePushed();
      let deg = dg.origRot + (Math.atan2(p.y - dg.cy, p.x - dg.cx) - dg.startAngle) * 180 / Math.PI;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      patchLayer(dg.id, { rotation: Math.round(deg) });
      return;
    }

    // resize
    ensurePushed();
    const o = dg.orig;
    const rad = (o.rotation * Math.PI) / 180;
    const a = HANDLES[dg.handle];
    const cxo = o.x + o.w / 2, cyo = o.y + o.h / 2;
    const foff = rotate((-a.x) * o.w / 2, (-a.y) * o.h / 2, rad);
    const fx = cxo + foff.x, fy = cyo + foff.y;
    const local = rotate(p.x - fx, p.y - fy, -rad);
    let nw = a.x !== 0 ? Math.max(MIN_SIZE, local.x * a.x) : o.w;
    let nh = a.y !== 0 ? Math.max(MIN_SIZE, local.y * a.y) : o.h;
    if (e.shiftKey && a.x !== 0 && a.y !== 0) {
      const aspect = o.w / o.h;
      nh = nw / aspect;
    }
    const noff = rotate(a.x * nw / 2, a.y * nh / 2, rad);
    const ncx = fx + noff.x, ncy = fy + noff.y;
    patchLayer(dg.id, {
      x: Math.round(ncx - nw / 2), y: Math.round(ncy - nh / 2),
      w: Math.round(nw), h: Math.round(nh),
    });
  }, [toCanvas, patchLayer, pushHistory]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setGuides({ x: [], y: [] });
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const startDrag = (dg: Drag) => {
    dragRef.current = dg;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const beginMove = (l: Layer, e: React.PointerEvent) => {
    if (!canEdit || l.locked || editingId === l.id) return;
    e.stopPropagation();
    setSelId(l.id); setTab("props");
    const p = toCanvas(e.clientX, e.clientY);
    startDrag({ mode: "move", id: l.id, startX: p.x, startY: p.y, orig: l, pushed: false, snap: docRef.current });
  };
  const beginResize = (l: Layer, handle: string, e: React.PointerEvent) => {
    if (!canEdit || l.locked) return;
    e.stopPropagation();
    startDrag({ mode: "resize", id: l.id, handle, orig: l, pushed: false, snap: docRef.current });
  };
  const beginRotate = (l: Layer, e: React.PointerEvent) => {
    if (!canEdit || l.locked) return;
    e.stopPropagation();
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    const p = toCanvas(e.clientX, e.clientY);
    startDrag({ mode: "rotate", id: l.id, cx, cy, startAngle: Math.atan2(p.y - cy, p.x - cx), origRot: l.rotation, pushed: false, snap: docRef.current });
  };

  /* ── édition texte inline ── */
  useEffect(() => {
    if (editingId && editRef.current) {
      const l = docRef.current.layers.find((x) => x.id === editingId);
      if (l && l.type === "text") {
        editRef.current.textContent = l.text;
        editRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(editRef.current);
        range.collapse(false);
        const s = window.getSelection();
        s?.removeAllRanges(); s?.addRange(range);
      }
    }
  }, [editingId]);

  /* ── raccourcis clavier ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (typing) return;
      if (!selId) return;
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateLayer(selId); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (canEdit) removeLayer(selId); return; }
      if (e.key === "Escape") { setSelId(null); return; }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") { e.preventDefault(); commitPatch(selId, { x: (sel?.x ?? 0) - step }); }
      else if (e.key === "ArrowRight") { e.preventDefault(); commitPatch(selId, { x: (sel?.x ?? 0) + step }); }
      else if (e.key === "ArrowUp") { e.preventDefault(); commitPatch(selId, { y: (sel?.y ?? 0) - step }); }
      else if (e.key === "ArrowDown") { e.preventDefault(); commitPatch(selId, { y: (sel?.y ?? 0) + step }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selId, sel, canEdit, undo, redo, duplicateLayer, removeLayer, commitPatch]);

  /* ── zoom ── */
  const fit = useCallback(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const pad = 64;
    const z = Math.min((el.clientWidth - pad) / doc.width, (el.clientHeight - pad) / doc.height);
    setZoom(clampN(z, 0.05, 3));
  }, [doc.width, doc.height]);
  useEffect(() => { fit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [doc.width, doc.height]);

  /* ── upload image ── */
  const uploadFile = useCallback(async (file: File): Promise<{ url: string; w: number; h: number } | null> => {
    const vector = file.type === "image/svg+xml" || file.type === "image/gif";
    let blob: Blob = file;
    let natural = { w: 0, h: 0 };
    if (!vector) {
      const bmp = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file);
      }).catch(() => null);
      if (bmp) {
        natural = { w: bmp.naturalWidth, h: bmp.naturalHeight };
        const MAXD = 2000;
        const scale = Math.min(1, MAXD / Math.max(bmp.naturalWidth, bmp.naturalHeight));
        if (scale < 1) {
          const c = document.createElement("canvas");
          c.width = Math.round(bmp.naturalWidth * scale);
          c.height = Math.round(bmp.naturalHeight * scale);
          c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
          const isPng = file.type === "image/png" || file.type === "image/webp";
          blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), isPng ? "image/png" : "image/jpeg", 0.9))!;
          natural = { w: c.width, h: c.height };
        }
      }
    }
    const res = await fetch("/api/media/upload", {
      method: "POST", body: blob, headers: { "content-type": blob.type || file.type || "application/octet-stream" },
    });
    if (!res.ok) return null;
    const { url } = await res.json();
    if (natural.w === 0) natural = { w: 800, h: 800 };
    return { url, w: natural.w, h: natural.h };
  }, []);

  const onPickImage = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const up = await uploadFile(file);
      if (!up) return;
      const d = docRef.current;
      const aspect = up.w / up.h;
      let w = Math.min(d.width * 0.72, up.w);
      let h = w / aspect;
      if (h > d.height * 0.8) { h = d.height * 0.8; w = h * aspect; }
      addLayer("image", { src: up.url, w: Math.round(w), h: Math.round(h), x: Math.round((d.width - w) / 2), y: Math.round((d.height - h) / 2), naturalW: up.w, naturalH: up.h } as Partial<ImageLayer>);
    } finally {
      setUploading(false);
    }
  }, [uploadFile, addLayer]);

  const replaceImage = useCallback(async (lid: string, file: File) => {
    setUploading(true);
    try {
      const up = await uploadFile(file);
      if (up) commitPatch(lid, { src: up.url, naturalW: up.w, naturalH: up.h });
    } finally { setUploading(false); }
  }, [uploadFile, commitPatch]);

  /* ── export ── */
  const doExport = useCallback(async (format: "png" | "jpeg", scale: number) => {
    const canvas = await rasterize(docRef.current, scale);
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const url = canvas.toDataURL(mime, 0.95);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "design").replace(/[^\w\-]+/g, "_")}.${format === "jpeg" ? "jpg" : "png"}`;
    a.click();
  }, [name]);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="flex h-full min-h-0 flex-col select-none">
      {/* En-tête */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 sm:px-4 flex items-center gap-2">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex items-center gap-2">
          <Shapes className="size-4 shrink-0" style={{ color: ACCENT }} />
          <input value={name} onChange={(e) => onName(e.target.value)} disabled={!canEdit}
            className="min-w-0 w-40 sm:w-56 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30"
            placeholder="Création sans titre" />
        </div>
        <div className="ml-1 hidden items-center gap-1 sm:flex">
          <button onClick={() => setSizeOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-white/5 hover:text-white transition">
            <LayoutGrid className="size-3.5" /> {doc.width}×{doc.height}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={undo} disabled={!past.length} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white disabled:opacity-30 transition" title="Annuler (⌘Z)"><Undo2 className="size-4" /></button>
          <button onClick={redo} disabled={!future.length} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white disabled:opacity-30 transition" title="Rétablir (⌘⇧Z)"><Redo2 className="size-4" /></button>
          <div className="mx-1 hidden items-center gap-0.5 rounded-lg border border-white/10 px-1 py-0.5 sm:flex">
            <button onClick={() => setZoom((z) => clampN(z - 0.1, 0.05, 3))} className="grid size-6 place-items-center rounded text-muted hover:text-white" title="Dézoomer"><ZoomOut className="size-3.5" /></button>
            <span className="w-10 text-center text-[11px] tabular-nums text-muted">{zoomPct}%</span>
            <button onClick={() => setZoom((z) => clampN(z + 0.1, 0.05, 3))} className="grid size-6 place-items-center rounded text-muted hover:text-white" title="Zoomer"><ZoomIn className="size-3.5" /></button>
            <button onClick={fit} className="grid size-6 place-items-center rounded text-muted hover:text-white" title="Ajuster"><Maximize2 className="size-3.5" /></button>
          </div>
          <button onClick={() => setExportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110">
            <Download className="size-3.5" /> Exporter
          </button>
          <div className="ml-1 hidden items-center gap-1.5 text-xs text-muted lg:flex">
            {save === "saving" ? (<Loader2 className="size-3.5 animate-spin" />)
              : save === "error" ? (<span className="text-red-400">Erreur</span>)
              : (<Check className="size-3.5 text-emerald-400" />)}
          </div>
        </div>
      </header>

      {/* Corps : rail + espace + panneau */}
      <div className="flex min-h-0 flex-1">
        {/* Rail d'outils */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-white/[0.02] py-2">
          <RailBtn icon={Type} label="Texte" onClick={() => addLayer("text")} disabled={!canEdit} />
          <RailBtn icon={Square} label="Rectangle" onClick={() => addLayer("rect")} disabled={!canEdit} />
          <RailBtn icon={Circle} label="Cercle" onClick={() => addLayer("ellipse")} disabled={!canEdit} />
          <RailBtn icon={TriangleIcon} label="Triangle" onClick={() => addLayer("triangle")} disabled={!canEdit} />
          <RailBtn icon={Minus} label="Ligne" onClick={() => addLayer("line")} disabled={!canEdit} />
          <RailBtn icon={uploading ? Loader2 : ImageIcon} label="Image" onClick={() => fileRef.current?.click()} disabled={!canEdit || uploading} spin={uploading} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }} />
        </div>

        {/* Espace de travail */}
        <div
          ref={workspaceRef}
          className="relative min-w-0 flex-1 overflow-auto bg-[#0b0b11] [background-image:radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:22px_22px]"
          onPointerDown={() => { if (!dragRef.current) { setSelId(null); if (editingId) setEditingId(null); } }}
          onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => clampN(z - Math.sign(e.deltaY) * 0.08, 0.05, 3)); } }}
        >
          <div className="min-h-full w-full grid place-items-center p-8">
            <div className="relative" style={{ width: doc.width * zoom, height: doc.height * zoom }}>
              <div
                ref={innerRef}
                className="absolute left-0 top-0 origin-top-left shadow-2xl shadow-black/50 ring-1 ring-black/40"
                style={{
                  width: doc.width, height: doc.height, transform: `scale(${zoom})`,
                  background: doc.background === "transparent"
                    ? "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px"
                    : doc.background,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {doc.layers.map((l) => (
                  <LayerView
                    key={l.id}
                    layer={l}
                    zoom={zoom}
                    selected={selId === l.id}
                    editing={editingId === l.id}
                    canEdit={canEdit}
                    editRef={editingId === l.id ? editRef : undefined}
                    onSelect={() => { setSelId(l.id); setTab("props"); }}
                    onBeginMove={(e) => beginMove(l, e)}
                    onBeginResize={(h, e) => beginResize(l, h, e)}
                    onBeginRotate={(e) => beginRotate(l, e)}
                    onStartEdit={() => { if (l.type === "text" && canEdit && !l.locked) { pushHistory(docRef.current); setEditingId(l.id); setSelId(l.id); } }}
                    onEditInput={(text) => patchLayer(l.id, { text })}
                    onEditBlur={() => setEditingId(null)}
                  />
                ))}

                {/* Repères d'alignement */}
                {guides.x.map((gx, i) => (
                  <div key={`gx${i}`} className="pointer-events-none absolute top-0 bg-fuchsia-400" style={{ left: gx, width: 1 / zoom, height: doc.height }} />
                ))}
                {guides.y.map((gy, i) => (
                  <div key={`gy${i}`} className="pointer-events-none absolute left-0 bg-fuchsia-400" style={{ top: gy, height: 1 / zoom, width: doc.width }} />
                ))}
              </div>
            </div>
          </div>

          {!canEdit && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-muted backdrop-blur">
              <Lock className="mr-1 inline size-3" /> Lecture seule
            </div>
          )}
        </div>

        {/* Panneau droit */}
        <div className="flex w-72 shrink-0 flex-col border-l border-white/10 bg-white/[0.02]">
          <div className="flex shrink-0 border-b border-white/10 text-sm">
            <button onClick={() => setTab("props")} className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 font-medium transition ${tab === "props" ? "text-white border-b-2 border-purple-400" : "text-muted hover:text-white"}`}>
              <SlidersHorizontal className="size-3.5" /> Propriétés
            </button>
            <button onClick={() => setTab("layers")} className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 font-medium transition ${tab === "layers" ? "text-white border-b-2 border-purple-400" : "text-muted hover:text-white"}`}>
              <LayersIcon className="size-3.5" /> Calques
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "props"
              ? <PropsPanel doc={doc} sel={sel} canEdit={canEdit} onPatch={commitPatch} onPatchLive={patchLayer} onAlign={alignSel} onDocPatch={(p) => commit((d) => ({ ...d, ...p }))} onReplaceImage={(f) => sel && replaceImage(sel.id, f)} uploading={uploading} />
              : <LayersPanel layers={doc.layers} selId={selId} canEdit={canEdit} onSelect={(lid) => { setSelId(lid); }} onToggle={(lid, k, v) => commitPatch(lid, k === "visible" ? { visible: v } : { locked: v })} onDelete={removeLayer} onDup={duplicateLayer} onMove={moveLayerOrder} onRename={(lid, n) => patchLayer(lid, { name: n })} />}
          </div>
        </div>
      </div>

      {sizeOpen && (
        <SizeModal doc={doc} onClose={() => setSizeOpen(false)} onApply={(w, h, bg) => { commit((d) => ({ ...d, width: w, height: h, background: bg })); setSizeOpen(false); }} />
      )}
      {exportOpen && (
        <ExportModal onClose={() => setExportOpen(false)} onExport={doExport} doc={doc} />
      )}
    </div>
  );
}

/* ═══════════════════════ Rail button ═══════════════════════ */
function RailBtn({ icon: Icon, label, onClick, disabled, spin }: { icon: typeof Type; label: string; onClick: () => void; disabled?: boolean; spin?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className="group relative grid size-10 place-items-center rounded-xl text-muted transition hover:bg-white/10 hover:text-white disabled:opacity-40">
      <Icon className={`size-[18px] ${spin ? "animate-spin" : ""}`} />
      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white group-hover:block z-20">{label}</span>
    </button>
  );
}

/* ═══════════════════════ Un calque + poignées ═══════════════════════ */
function LayerView({
  layer: l, zoom, selected, editing, canEdit, editRef,
  onSelect, onBeginMove, onBeginResize, onBeginRotate, onStartEdit, onEditInput, onEditBlur,
}: {
  layer: Layer; zoom: number; selected: boolean; editing: boolean; canEdit: boolean;
  editRef?: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onBeginMove: (e: React.PointerEvent) => void;
  onBeginResize: (handle: string, e: React.PointerEvent) => void;
  onBeginRotate: (e: React.PointerEvent) => void;
  onStartEdit: () => void;
  onEditInput: (text: string) => void;
  onEditBlur: () => void;
}) {
  const hz = 1 / zoom; // taille écran constante des poignées
  const common: React.CSSProperties = {
    position: "absolute", left: l.x, top: l.y, width: l.w, height: l.h,
    transform: `rotate(${l.rotation}deg)`, transformOrigin: "center",
    opacity: l.opacity, mixBlendMode: l.blend as React.CSSProperties["mixBlendMode"],
    visibility: l.visible ? "visible" : "hidden",
    pointerEvents: l.locked ? "none" : "auto",
    cursor: canEdit && !l.locked ? "move" : "default",
  };

  let content: React.ReactNode = null;
  if (l.type === "rect") content = <div style={{ width: "100%", height: "100%", background: l.fill, borderRadius: l.radius, border: l.strokeWidth ? `${l.strokeWidth}px solid ${l.stroke}` : undefined, boxSizing: "border-box" }} />;
  else if (l.type === "ellipse") content = <div style={{ width: "100%", height: "100%", background: l.fill, borderRadius: "50%", border: l.strokeWidth ? `${l.strokeWidth}px solid ${l.stroke}` : undefined, boxSizing: "border-box" }} />;
  else if (l.type === "triangle") content = <div style={{ width: "100%", height: "100%", background: l.fill, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />;
  else if (l.type === "line") content = <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: l.strokeWidth, background: l.stroke, borderRadius: 999, transform: "translateY(-50%)" }} />;
  else if (l.type === "image") content = l.src
    ? <img src={l.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: l.radius, filter: filterCss(l.filters), display: "block" }} />
    : <div style={{ width: "100%", height: "100%", background: "rgba(148,163,184,0.15)", display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 14 }}>Image</div>;
  else if (l.type === "text") {
    const ts: React.CSSProperties = {
      width: "100%", height: "100%", color: l.color, fontFamily: l.fontFamily,
      fontSize: l.fontSize, fontWeight: l.fontWeight, fontStyle: l.italic ? "italic" : "normal",
      textDecoration: l.underline ? "underline" : "none", textAlign: l.align,
      lineHeight: l.lineHeight, letterSpacing: l.letterSpacing, whiteSpace: "pre-wrap",
      wordBreak: "break-word", overflow: "hidden", outline: "none",
    };
    content = editing
      ? <div ref={editRef} contentEditable suppressContentEditableWarning style={{ ...ts, cursor: "text" }}
          onInput={(e) => onEditInput((e.currentTarget as HTMLDivElement).innerText)}
          onBlur={onEditBlur} onPointerDown={(e) => e.stopPropagation()} />
      : <div style={ts}>{l.text || " "}</div>;
  }

  return (
    <div
      style={common}
      onPointerDown={(e) => { if (editing) return; onSelect(); onBeginMove(e); }}
      onDoubleClick={(e) => { if (l.type === "text") { e.stopPropagation(); onStartEdit(); } }}
    >
      {content}

      {selected && canEdit && !editing && (
        <>
          <div className="pointer-events-none absolute inset-0" style={{ outline: `${1.5 * hz}px solid ${ACCENT}`, outlineOffset: 0 }} />
          {/* poignée de rotation */}
          <div
            onPointerDown={(e) => onBeginRotate(e)}
            className="absolute rounded-full bg-white ring-2"
            style={{ left: "50%", top: -22 * hz, width: 12 * hz, height: 12 * hz, transform: "translate(-50%,-50%)", cursor: "grab", boxShadow: `0 0 0 ${2 * hz}px ${ACCENT}` }}
          />
          <div className="pointer-events-none absolute bg-fuchsia-400" style={{ left: "50%", top: -22 * hz, width: 1.5 * hz, height: 22 * hz, transform: "translateX(-50%)" }} />
          {/* poignées de redimensionnement */}
          {Object.keys({ nw: 0, n: 0, ne: 0, e: 0, se: 0, s: 0, sw: 0, w: 0 }).map((h) => {
            const pos: Record<string, [string, string, string]> = {
              nw: ["0", "0", "nwse-resize"], n: ["50%", "0", "ns-resize"], ne: ["100%", "0", "nesw-resize"],
              e: ["100%", "50%", "ew-resize"], se: ["100%", "100%", "nwse-resize"], s: ["50%", "100%", "ns-resize"],
              sw: ["0", "100%", "nesw-resize"], w: ["0", "50%", "ew-resize"],
            };
            const [lft, tp, cur] = pos[h];
            return (
              <div key={h}
                onPointerDown={(e) => onBeginResize(h, e)}
                className="absolute rounded-sm bg-white"
                style={{ left: lft, top: tp, width: 10 * hz, height: 10 * hz, transform: "translate(-50%,-50%)", cursor: cur, boxShadow: `0 0 0 ${1.5 * hz}px ${ACCENT}` }}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════ Panneau Calques ═══════════════════════ */
function LayersPanel({ layers, selId, canEdit, onSelect, onToggle, onDelete, onDup, onMove, onRename }: {
  layers: Layer[]; selId: string | null; canEdit: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string, key: "visible" | "locked", v: boolean) => void;
  onDelete: (id: string) => void; onDup: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRename: (id: string, name: string) => void;
}) {
  const kindLabel = (l: Layer) => l.type === "text" ? (l as TextLayer).text.slice(0, 20) || "Texte" : l.name;
  if (!layers.length) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="text-muted">
          <Sparkles className="mx-auto mb-3 size-7 text-purple-300/70" />
          <p className="text-sm font-medium text-white/80">Toile vide</p>
          <p className="mt-1 text-xs">Ajoutez du texte, des formes ou une image depuis la barre d'outils à gauche.</p>
        </div>
      </div>
    );
  }
  // Affichage haut → bas = premier plan → arrière-plan (donc index inversé).
  const ordered = [...layers].reverse();
  return (
    <div className="p-2">
      {ordered.map((l) => {
        const isTop = layers[layers.length - 1].id === l.id;
        const isBottom = layers[0].id === l.id;
        return (
          <div key={l.id}
            onPointerDown={() => onSelect(l.id)}
            className={`group mb-1 flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${selId === l.id ? "border-purple-400/50 bg-purple-500/10" : "border-transparent hover:bg-white/5"}`}>
            <button onClick={(e) => { e.stopPropagation(); onToggle(l.id, "visible", !l.visible); }} disabled={!canEdit} className="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-white disabled:opacity-40" title={l.visible ? "Masquer" : "Afficher"}>
              {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
            <span className="grid size-6 shrink-0 place-items-center rounded bg-white/5 text-[10px] text-muted">{iconFor(l.type)}</span>
            <input
              defaultValue={kindLabel(l)}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => onRename(l.id, e.target.value || l.name)}
              disabled={!canEdit}
              className="min-w-0 flex-1 truncate bg-transparent text-xs text-white/85 outline-none focus:text-white"
            />
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
              <button onClick={(e) => { e.stopPropagation(); onMove(l.id, 1); }} disabled={!canEdit || isTop} className="grid size-5 place-items-center rounded text-muted hover:text-white disabled:opacity-20" title="Avancer"><ChevronUp className="size-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onMove(l.id, -1); }} disabled={!canEdit || isBottom} className="grid size-5 place-items-center rounded text-muted hover:text-white disabled:opacity-20" title="Reculer"><ChevronDown className="size-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onToggle(l.id, "locked", !l.locked); }} disabled={!canEdit} className="grid size-5 place-items-center rounded text-muted hover:text-white disabled:opacity-40" title={l.locked ? "Déverrouiller" : "Verrouiller"}>{l.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}</button>
              <button onClick={(e) => { e.stopPropagation(); onDup(l.id); }} disabled={!canEdit} className="grid size-5 place-items-center rounded text-muted hover:text-white disabled:opacity-40" title="Dupliquer"><Copy className="size-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(l.id); }} disabled={!canEdit} className="grid size-5 place-items-center rounded text-muted hover:text-red-400 disabled:opacity-40" title="Supprimer"><Trash2 className="size-3.5" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function iconFor(t: Layer["type"]): string {
  return t === "text" ? "T" : t === "image" ? "◧" : t === "ellipse" ? "○" : t === "triangle" ? "△" : t === "line" ? "─" : "▢";
}

/* ═══════════════════════ Panneau Propriétés ═══════════════════════ */
function PropsPanel({ doc, sel, canEdit, onPatch, onPatchLive, onAlign, onDocPatch, onReplaceImage, uploading }: {
  doc: DesignDoc; sel: Layer | null; canEdit: boolean;
  onPatch: (id: string, patch: LayerPatch) => void;
  onPatchLive: (id: string, patch: LayerPatch) => void;
  onAlign: (edge: "l" | "c" | "r" | "t" | "m" | "b") => void;
  onDocPatch: (p: Partial<DesignDoc>) => void;
  onReplaceImage: (f: File) => void;
  uploading: boolean;
}) {
  const replaceRef = useRef<HTMLInputElement | null>(null);
  if (!sel) {
    return (
      <div className="space-y-4 p-4">
        <Section title="Fond de la toile">
          <ColorField label="Couleur" value={doc.background === "transparent" ? "#ffffff" : doc.background} allowTransparent isTransparent={doc.background === "transparent"} onChange={(v) => onDocPatch({ background: v })} disabled={!canEdit} />
        </Section>
        <p className="px-1 text-xs text-muted">Sélectionnez un élément pour modifier ses propriétés, ou ajoutez-en un depuis la barre d'outils.</p>
      </div>
    );
  }
  const patch = (p: LayerPatch) => onPatch(sel.id, p);
  const live = (p: LayerPatch) => onPatchLive(sel.id, p);

  return (
    <div className="space-y-4 p-4">
      {/* Position & taille */}
      <Section title="Disposition">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X" value={Math.round(sel.x)} onChange={(v) => patch({ x: v })} disabled={!canEdit} />
          <NumField label="Y" value={Math.round(sel.y)} onChange={(v) => patch({ y: v })} disabled={!canEdit} />
          <NumField label="L" value={Math.round(sel.w)} onChange={(v) => patch({ w: Math.max(MIN_SIZE, v) })} disabled={!canEdit} />
          <NumField label="H" value={Math.round(sel.h)} onChange={(v) => patch({ h: Math.max(MIN_SIZE, v) })} disabled={!canEdit} />
          <NumField label="Rotation°" value={Math.round(sel.rotation)} onChange={(v) => patch({ rotation: v })} disabled={!canEdit} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {([["l", AlignStartVertical], ["c", AlignCenterVertical], ["r", AlignEndVertical], ["t", AlignStartHorizontal], ["m", AlignCenterHorizontal], ["b", AlignEndHorizontal]] as const).map(([e, Ic]) => (
            <button key={e} onClick={() => onAlign(e)} disabled={!canEdit} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5 hover:text-white disabled:opacity-40" title="Aligner">
              <Ic className="size-4" />
            </button>
          ))}
        </div>
      </Section>

      {/* Spécifique au type */}
      {sel.type === "text" && <TextProps l={sel} patch={patch} live={live} disabled={!canEdit} />}
      {(sel.type === "rect" || sel.type === "ellipse") && (
        <Section title="Apparence">
          <ColorField label="Remplissage" value={sel.fill} allowTransparent isTransparent={sel.fill === "transparent"} onChange={(v) => patch({ fill: v })} disabled={!canEdit} />
          <ColorField label="Contour" value={sel.stroke} onChange={(v) => patch({ stroke: v })} disabled={!canEdit} />
          <RangeField label="Épaisseur contour" value={sel.strokeWidth} min={0} max={80} onChange={(v) => live({ strokeWidth: v })} onCommit={(v) => patch({ strokeWidth: v })} disabled={!canEdit} />
          {sel.type === "rect" && <RangeField label="Arrondi" value={sel.radius} min={0} max={Math.round(Math.min(sel.w, sel.h) / 2)} onChange={(v) => live({ radius: v })} onCommit={(v) => patch({ radius: v })} disabled={!canEdit} />}
        </Section>
      )}
      {sel.type === "triangle" && (
        <Section title="Apparence"><ColorField label="Remplissage" value={sel.fill} onChange={(v) => patch({ fill: v })} disabled={!canEdit} /></Section>
      )}
      {sel.type === "line" && (
        <Section title="Apparence">
          <ColorField label="Couleur" value={sel.stroke} onChange={(v) => patch({ stroke: v })} disabled={!canEdit} />
          <RangeField label="Épaisseur" value={sel.strokeWidth} min={1} max={80} onChange={(v) => live({ strokeWidth: v })} onCommit={(v) => patch({ strokeWidth: v })} disabled={!canEdit} />
        </Section>
      )}
      {sel.type === "image" && (
        <>
          <Section title="Image">
            <button onClick={() => replaceRef.current?.click()} disabled={!canEdit || uploading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-medium text-muted hover:bg-white/5 hover:text-white disabled:opacity-40">
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />} Remplacer l'image
            </button>
            <input ref={replaceRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplaceImage(f); e.target.value = ""; }} />
            <RangeField label="Arrondi des coins" value={sel.radius} min={0} max={Math.round(Math.min(sel.w, sel.h) / 2)} onChange={(v) => live({ radius: v })} onCommit={(v) => patch({ radius: v })} disabled={!canEdit} />
          </Section>
          <ImageFilters l={sel} live={live} commit={patch} disabled={!canEdit} />
        </>
      )}

      {/* Commun : opacité + fusion */}
      <Section title="Fusion">
        <RangeField label="Opacité" value={Math.round(sel.opacity * 100)} min={0} max={100} onChange={(v) => live({ opacity: v / 100 })} onCommit={(v) => patch({ opacity: v / 100 })} disabled={!canEdit} />
        <SelectField label="Mode de fusion" value={sel.blend} options={BLEND_MODES.map((b) => ({ value: b.id, label: b.label }))} onChange={(v) => patch({ blend: v as Layer["blend"] })} disabled={!canEdit} />
      </Section>
    </div>
  );
}

function TextProps({ l, patch, live, disabled }: { l: TextLayer; patch: (p: LayerPatch) => void; live: (p: LayerPatch) => void; disabled: boolean }) {
  return (
    <Section title="Texte">
      <textarea value={l.text} onChange={(e) => live({ text: e.target.value })} onBlur={(e) => patch({ text: e.target.value })} disabled={disabled}
        rows={2} className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white outline-none focus:border-purple-400/50" placeholder="Votre texte…" />
      <SelectField label="Police" value={l.fontFamily} options={FONTS.map((f) => ({ value: f.css, label: f.label }))} onChange={(v) => patch({ fontFamily: v })} disabled={disabled} />
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Taille" value={l.fontSize} onChange={(v) => patch({ fontSize: Math.max(4, v) })} disabled={disabled} />
        <SelectField label="Graisse" value={String(l.fontWeight)} options={[["300", "Fin"], ["400", "Normal"], ["500", "Moyen"], ["600", "Semi"], ["700", "Gras"], ["800", "Extra"], ["900", "Noir"]].map(([v, t]) => ({ value: v, label: t }))} onChange={(v) => patch({ fontWeight: Number(v) })} disabled={disabled} />
      </div>
      <ColorField label="Couleur" value={l.color} onChange={(v) => patch({ color: v })} disabled={disabled} />
      <div className="flex items-center gap-1">
        <ToggleBtn active={l.italic} onClick={() => patch({ italic: !l.italic })} disabled={disabled}><Italic className="size-4" /></ToggleBtn>
        <ToggleBtn active={l.underline} onClick={() => patch({ underline: !l.underline })} disabled={disabled}><Underline className="size-4" /></ToggleBtn>
        <ToggleBtn active={l.fontWeight >= 700} onClick={() => patch({ fontWeight: l.fontWeight >= 700 ? 400 : 700 })} disabled={disabled}><Bold className="size-4" /></ToggleBtn>
        <div className="mx-1 h-5 w-px bg-white/10" />
        {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, Ic]) => (
          <ToggleBtn key={a} active={l.align === a} onClick={() => patch({ align: a })} disabled={disabled}><Ic className="size-4" /></ToggleBtn>
        ))}
      </div>
      <RangeField label="Interligne" value={Math.round(l.lineHeight * 100)} min={70} max={250} onChange={(v) => live({ lineHeight: v / 100 })} onCommit={(v) => patch({ lineHeight: v / 100 })} disabled={disabled} />
      <RangeField label="Espacement" value={l.letterSpacing} min={-5} max={30} onChange={(v) => live({ letterSpacing: v })} onCommit={(v) => patch({ letterSpacing: v })} disabled={disabled} />
    </Section>
  );
}

function ImageFilters({ l, live, commit, disabled }: { l: ImageLayer; live: (p: LayerPatch) => void; commit: (p: LayerPatch) => void; disabled: boolean }) {
  const set = (k: keyof Filters, v: number, done: boolean) => {
    const f = { ...l.filters, [k]: v } as Filters;
    if (done) commit({ filters: f }); else live({ filters: f });
  };
  const F = l.filters;
  return (
    <Section title="Filtres">
      <RangeField label="Luminosité" value={F.brightness} min={0} max={200} onChange={(v) => set("brightness", v, false)} onCommit={(v) => set("brightness", v, true)} disabled={disabled} />
      <RangeField label="Contraste" value={F.contrast} min={0} max={200} onChange={(v) => set("contrast", v, false)} onCommit={(v) => set("contrast", v, true)} disabled={disabled} />
      <RangeField label="Saturation" value={F.saturate} min={0} max={200} onChange={(v) => set("saturate", v, false)} onCommit={(v) => set("saturate", v, true)} disabled={disabled} />
      <RangeField label="Flou" value={F.blur} min={0} max={30} onChange={(v) => set("blur", v, false)} onCommit={(v) => set("blur", v, true)} disabled={disabled} />
      <RangeField label="Niveaux de gris" value={F.grayscale} min={0} max={100} onChange={(v) => set("grayscale", v, false)} onCommit={(v) => set("grayscale", v, true)} disabled={disabled} />
      <RangeField label="Sépia" value={F.sepia} min={0} max={100} onChange={(v) => set("sepia", v, false)} onCommit={(v) => set("sepia", v, true)} disabled={disabled} />
      <RangeField label="Teinte°" value={F.hueRotate} min={0} max={360} onChange={(v) => set("hueRotate", v, false)} onCommit={(v) => set("hueRotate", v, true)} disabled={disabled} />
      <button onClick={() => commit({ filters: { ...NEUTRAL_FILTERS } })} disabled={disabled} className="mt-1 w-full rounded-lg border border-white/10 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-white disabled:opacity-40">Réinitialiser les filtres</button>
    </Section>
  );
}

/* ═══════════════════════ Petits contrôles ═══════════════════════ */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}
function NumField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <input type="number" value={value} disabled={disabled} onChange={(e) => onChange(Math.round(Number(e.target.value) || 0))}
        className="min-w-0 flex-1 bg-transparent text-right text-xs tabular-nums text-white outline-none disabled:opacity-60" />
    </label>
  );
}
function RangeField({ label, value, min, max, onChange, onCommit, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; onCommit?: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted"><span>{label}</span><span className="tabular-nums text-white/70">{value}</span></div>
      <input type="range" min={min} max={max} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        className="w-full accent-purple-500 disabled:opacity-40" style={{ height: 4 }} />
    </label>
  );
}
function SelectField({ label, value, options, onChange, disabled }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[#15151d] px-2 py-1.5 text-xs text-white outline-none focus:border-purple-400/50 disabled:opacity-60">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function ToggleBtn({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`grid size-8 place-items-center rounded-lg border transition disabled:opacity-40 ${active ? "border-purple-400/50 bg-purple-500/15 text-white" : "border-white/10 text-muted hover:bg-white/5 hover:text-white"}`}>{children}</button>
  );
}

/* ── Sélecteur de couleur (popover intégré) ── */
function ColorField({ label, value, onChange, disabled, allowTransparent, isTransparent }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; allowTransparent?: boolean; isTransparent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const hex = normHex(value);
  const [h, s, v] = hexToHsv(hex);
  const svRef = useRef<HTMLDivElement | null>(null);

  const pickSV = (e: React.PointerEvent) => {
    const el = svRef.current; if (!el) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const move = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      const ns = clampN((cx - r.left) / r.width, 0, 1) * 100;
      const nv = (1 - clampN((cy - r.top) / r.height, 0, 1)) * 100;
      onChange(hsvToHex(h, ns, nv));
    };
    move(e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[11px] text-muted">{label}</span>
        <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40">
          <span className="size-5 rounded ring-1 ring-black/30" style={{ background: isTransparent ? "repeating-conic-gradient(#cbd5e1 0% 25%, #fff 0% 50%) 50% / 8px 8px" : hex }} />
          <span className="text-[11px] uppercase tabular-nums text-white/80">{isTransparent ? "Aucun" : hex}</span>
        </button>
      </div>
      {open && !disabled && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-white/10 bg-[#15151d] p-3 shadow-2xl shadow-black/60">
          <div ref={svRef} onPointerDown={pickSV} className="relative mb-2 h-28 w-full cursor-crosshair rounded-lg"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h, 100, 100)})` }}>
            <div className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${s}%`, top: `${100 - v}%` }} />
          </div>
          <input type="range" min={0} max={360} value={Math.round(h)} onChange={(e) => onChange(hsvToHex(Number(e.target.value), s || 100, v || 100))}
            className="mb-2 w-full" style={{ height: 10, background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)", borderRadius: 999, appearance: "none" }} />
          <div className="mb-2 flex items-center gap-2">
            <input value={hex} onChange={(e) => onChange(normHex(e.target.value))} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-xs uppercase text-white outline-none" />
            {allowTransparent && <button onClick={() => onChange("transparent")} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-muted hover:text-white">Aucun</button>}
          </div>
          <div className="grid grid-cols-10 gap-1">
            {PRESETS.map((p) => <button key={p} onClick={() => onChange(p)} className="size-4 rounded ring-1 ring-black/30 hover:scale-110 transition" style={{ background: p }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ Modales ═══════════════════════ */
function SizeModal({ doc, onClose, onApply }: { doc: DesignDoc; onClose: () => void; onApply: (w: number, h: number, bg: string) => void }) {
  const [w, setW] = useState(doc.width);
  const [h, setH] = useState(doc.height);
  const [bg, setBg] = useState(doc.background);
  const groups = useMemo(() => {
    const g: Record<string, typeof SIZE_PRESETS> = {};
    for (const p of SIZE_PRESETS) (g[p.group] ??= []).push(p);
    return g;
  }, []);
  return (
    <Modal onClose={onClose} title="Format de la toile" icon={LayoutGrid}>
      <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((p) => (
                <button key={p.id} onClick={() => { setW(p.w); setH(p.h); }}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${w === p.w && h === p.h ? "border-purple-400/50 bg-purple-500/10 text-white" : "border-white/10 text-muted hover:bg-white/5 hover:text-white"}`}>
                  <span className="block font-medium">{p.label}</span>
                  <span className="tabular-nums opacity-70">{p.w}×{p.h}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        <NumField label="Largeur" value={w} onChange={setW} />
        <NumField label="Hauteur" value={h} onChange={setH} />
      </div>
      <div className="mt-2"><ColorField label="Fond" value={bg === "transparent" ? "#ffffff" : bg} allowTransparent isTransparent={bg === "transparent"} onChange={setBg} /></div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-muted hover:text-white">Annuler</button>
        <button onClick={() => onApply(clampN(Math.round(w), 16, 8000), clampN(Math.round(h), 16, 8000), bg)} className="rounded-lg bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-4 py-1.5 text-sm font-semibold text-white">Appliquer</button>
      </div>
    </Modal>
  );
}

function ExportModal({ onClose, onExport, doc }: { onClose: () => void; onExport: (f: "png" | "jpeg", scale: number) => Promise<void>; doc: DesignDoc }) {
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={onClose} title="Exporter" icon={Download}>
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Format</p>
          <div className="grid grid-cols-2 gap-2">
            {(["png", "jpeg"] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${format === f ? "border-purple-400/50 bg-purple-500/10 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}>
                {f === "png" ? "PNG (transparence)" : "JPG (photo)"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Résolution</p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((s) => (
              <button key={s} onClick={() => setScale(s)} className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${scale === s ? "border-purple-400/50 bg-purple-500/10 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}>
                {s}× <span className="block tabular-nums opacity-60">{doc.width * s}×{doc.height * s}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-muted hover:text-white">Fermer</button>
        <button disabled={busy} onClick={async () => { setBusy(true); try { await onExport(format, scale); onClose(); } finally { setBusy(false); } }}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Télécharger
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, icon: Icon, onClose, children }: { title: string; icon: typeof Download; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101018] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Icon className="size-4" style={{ color: ACCENT }} />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="ml-auto grid size-7 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
