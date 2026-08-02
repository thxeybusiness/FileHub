"use client";

// Studio Design — cœur de l'éditeur : état du document, historique,
// interactions toile (déplacer/redimensionner/pivoter/lasso/pan/zoom),
// raccourcis, presse-papiers, upload d'images et export.
// L'UI (barre contextuelle, dock, panneaux, modales) vit dans design-editor-ui.tsx.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, Shapes, Undo2, Redo2, Download, ZoomIn, ZoomOut,
  Maximize2, Lock, LayoutGrid, Keyboard, Copy, Trash2, ClipboardPaste, Scissors,
  BringToFront, SendToBack, ArrowUp, ArrowDown, Lock as LockIcon, Unlock, MousePointerSquareDashed,
} from "lucide-react";
import { api, notifyRefresh } from "@/lib/api";
import { useAutosave } from "./use-autosave";
import {
  type DesignDoc, type Layer, type TextLayer, type ImageLayer, type ShapeKind, type LineDash,
  parseDesign, makeShape, makeLine, makeText, makeImage, cloneLayer, rasterize,
} from "@/lib/design";
import { type TextPreset } from "@/lib/design-presets";
import { LayerVisual, layerBoxStyle, textStyle } from "./design-render";
import {
  type EditorCtl, type LayerPatch, type DockTab, type CtxMenuItem,
  ContextBar, LeftDock, RightPanel, SizeModal, ExportModal, ShortcutsModal, ContextMenu, ACCENT,
} from "./design-editor-ui";

type Crumb = { id: string; name: string };
const MIN_SIZE = 8;
const clampN = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/* ── Filtrage des patches par type (évite de polluer les calques) ── */
const BASE_KEYS = new Set(["name", "x", "y", "w", "h", "rotation", "opacity", "blend", "visible", "locked", "flipX", "flipY", "shadow"]);
const TYPE_KEYS: Record<Layer["type"], Set<string>> = {
  shape: new Set(["shape", "fill", "gradient", "stroke", "strokeWidth", "radius"]),
  line: new Set(["stroke", "strokeWidth", "dash"]),
  text: new Set(["text", "color", "fontFamily", "fontSize", "fontWeight", "italic", "underline", "uppercase", "align", "lineHeight", "letterSpacing", "strokeColor", "strokeWidth"]),
  image: new Set(["src", "filters", "radius", "naturalW", "naturalH"]),
};
function applyPatch(l: Layer, patch: LayerPatch): Layer {
  const out: Record<string, unknown> = { ...l };
  for (const [k, v] of Object.entries(patch)) {
    if (BASE_KEYS.has(k) || TYPE_KEYS[l.type].has(k)) out[k] = v;
  }
  return out as unknown as Layer;
}

function bboxOf(layers: Layer[]) {
  const x1 = Math.min(...layers.map((l) => l.x));
  const y1 = Math.min(...layers.map((l) => l.y));
  const x2 = Math.max(...layers.map((l) => l.x + l.w));
  const y2 = Math.max(...layers.map((l) => l.y + l.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/* ═══════════════ Composant principal ═══════════════ */

export function DesignEditor({
  id, initialName, initialContent, backHref, crumbs: _crumbs, canEdit = true,
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
  const [selIds, setSelIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(0.4);
  const [past, setPast] = useState<DesignDoc[]>([]);
  const [future, setFuture] = useState<DesignDoc[]>([]);
  const [dockTab, setDockTab] = useState<DockTab | null>("elements");
  const [rightTab, setRightTab] = useState<"props" | "layers">("layers");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; onCanvas: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);

  const docRef = useRef(doc); docRef.current = doc;
  const selRef = useRef(selIds); selRef.current = selIds;
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const innerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);
  const clipboardRef = useRef<Layer[]>([]);
  const liveBaseRef = useRef<DesignDoc | null>(null);

  /* ── Sauvegarde ── */
  const doSave = useCallback(
    (p: { content?: string; name?: string }, keepalive: boolean) => api.saveContent(id, p, keepalive),
    [id],
  );
  const { state: save, schedule } = useAutosave(doSave, {});

  const persist = useCallback((next: DesignDoc) => {
    if (!canEdit) return;
    schedule({ content: JSON.stringify(next) });
  }, [canEdit, schedule]);

  /* ── Historique ── */
  const pushHistory = useCallback((snapshot: DesignDoc) => {
    setPast((p) => [...p, snapshot].slice(-80));
    setFuture([]);
  }, []);

  const setLive = useCallback((updater: (d: DesignDoc) => DesignDoc) => {
    setDoc((prev) => { const next = updater(prev); persist(next); return next; });
  }, [persist]);

  /** Mutation avec point d'annulation (prend en compte les live-patches précédents). */
  const commit = useCallback((updater: (d: DesignDoc) => DesignDoc) => {
    if (!canEdit) return;
    const base = liveBaseRef.current ?? docRef.current;
    liveBaseRef.current = null;
    pushHistory(base);
    setLive(updater);
  }, [canEdit, pushHistory, setLive]);

  /** Mutation sans historique (aperçu pendant un glissement de curseur). */
  const live = useCallback((updater: (d: DesignDoc) => DesignDoc) => {
    if (!canEdit) return;
    if (!liveBaseRef.current) liveBaseRef.current = docRef.current;
    setLive(updater);
  }, [canEdit, setLive]);

  const undo = useCallback(() => {
    liveBaseRef.current = null;
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [docRef.current, ...f].slice(0, 80));
      setDoc(prev); persist(prev);
      return p.slice(0, -1);
    });
  }, [persist]);
  const redo = useCallback(() => {
    liveBaseRef.current = null;
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p, docRef.current].slice(-80));
      setDoc(next); persist(next);
      return f.slice(1);
    });
  }, [persist]);

  /* ── Sélection ── */
  const selLayers = useMemo(() => doc.layers.filter((l) => selIds.includes(l.id)), [doc.layers, selIds]);

  const select = useCallback((lid: string, additive = false) => {
    setSelIds((prev) => {
      if (additive) return prev.includes(lid) ? prev.filter((i) => i !== lid) : [...prev, lid];
      return prev.includes(lid) ? prev : [lid];
    });
  }, []);

  /* ── Patches ── */
  const patchLayers = useCallback((ids: string[], patch: LayerPatch, withCommit?: boolean) => {
    const fn = (d: DesignDoc): DesignDoc => ({
      ...d,
      layers: d.layers.map((l) => (ids.includes(l.id) ? applyPatch(l, patch) : l)),
    });
    if (withCommit) commit(fn); else live(fn);
  }, [commit, live]);

  const patchSel = useCallback((patch: LayerPatch, withCommit?: boolean) => {
    patchLayers(selRef.current, patch, withCommit);
  }, [patchLayers]);

  const patchLayer = useCallback((lid: string, patch: LayerPatch, withCommit?: boolean) => {
    patchLayers([lid], patch, withCommit);
  }, [patchLayers]);

  const commitDoc = useCallback((patch: Partial<DesignDoc>) => {
    commit((d) => ({ ...d, ...patch }));
  }, [commit]);

  /* ── Ajout de calques ── */
  const addAndSelect = useCallback((l: Layer) => {
    commit((d) => ({ ...d, layers: [...d.layers, l] }));
    setSelIds([l.id]);
    setRightTab("props");
    return l;
  }, [commit]);

  const addShape = useCallback((k: ShapeKind) => { if (canEdit) addAndSelect(makeShape(k, docRef.current)); }, [canEdit, addAndSelect]);
  const addLine = useCallback((dash: LineDash) => { if (canEdit) addAndSelect(makeLine(docRef.current, { dash })); }, [canEdit, addAndSelect]);
  const addText = useCallback((preset?: TextPreset) => {
    if (!canEdit) return;
    const d = docRef.current;
    const l = preset
      ? makeText(d, { text: preset.sample, fontSize: preset.fontSize(d.width), fontWeight: preset.fontWeight, name: preset.label })
      : makeText(d);
    addAndSelect(l);
    requestAnimationFrame(() => setEditingId(l.id));
  }, [canEdit, addAndSelect]);
  const addEmoji = useCallback((emoji: string) => {
    if (!canEdit) return;
    const d = docRef.current;
    const size = Math.round(d.width * 0.2);
    addAndSelect(makeText(d, {
      text: emoji, name: emoji, fontSize: size, fontWeight: 400,
      w: Math.round(size * 1.35), h: Math.round(size * 1.35),
      x: Math.round(d.width / 2 - size * 0.675), y: Math.round(d.height / 2 - size * 0.675),
      color: "#000000",
    }));
  }, [canEdit, addAndSelect]);

  const applyTemplate = useCallback((tpl: DesignDoc) => {
    if (!canEdit) return;
    if (docRef.current.layers.length > 0 && !window.confirm("Appliquer ce modèle remplace le contenu actuel de la toile (annulable avec ⌘Z). Continuer ?")) return;
    commit(() => tpl);
    setSelIds([]);
  }, [canEdit, commit]);

  /* ── Suppression / duplication / ordre ── */
  const removeIds = useCallback((ids: string[]) => {
    if (!ids.length) return;
    commit((d) => ({ ...d, layers: d.layers.filter((l) => !ids.includes(l.id)) }));
    setSelIds((prev) => prev.filter((i) => !ids.includes(i)));
  }, [commit]);
  const removeSel = useCallback(() => removeIds(selRef.current), [removeIds]);
  const removeLayer = useCallback((lid: string) => removeIds([lid]), [removeIds]);

  const duplicateIds = useCallback((ids: string[]) => {
    const src = docRef.current.layers.filter((l) => ids.includes(l.id));
    if (!src.length) return;
    const copies = src.map((l) => ({ ...cloneLayer(l, 24, 24), name: `${l.name} copie` }));
    commit((d) => ({ ...d, layers: [...d.layers, ...copies] }));
    setSelIds(copies.map((c) => c.id));
  }, [commit]);
  const duplicateSel = useCallback(() => duplicateIds(selRef.current), [duplicateIds]);
  const duplicateLayer = useCallback((lid: string) => duplicateIds([lid]), [duplicateIds]);

  const reorderLayer = useCallback((lid: string, dir: 1 | -1) => {
    commit((d) => {
      const i = d.layers.findIndex((l) => l.id === lid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.layers.length) return d;
      const layers = [...d.layers];
      [layers[i], layers[j]] = [layers[j], layers[i]];
      return { ...d, layers };
    });
  }, [commit]);

  const order = useCallback((op: "front" | "back" | "forward" | "backward") => {
    const ids = selRef.current;
    if (!ids.length) return;
    commit((d) => {
      const inSel = d.layers.filter((l) => ids.includes(l.id));
      const rest = d.layers.filter((l) => !ids.includes(l.id));
      if (op === "front") return { ...d, layers: [...rest, ...inSel] };
      if (op === "back") return { ...d, layers: [...inSel, ...rest] };
      const layers = [...d.layers];
      const idxs = inSel.map((l) => layers.indexOf(l)).sort((a, b) => (op === "forward" ? b - a : a - b));
      for (const i of idxs) {
        const j = op === "forward" ? i + 1 : i - 1;
        if (j < 0 || j >= layers.length || ids.includes(layers[j].id)) continue;
        [layers[i], layers[j]] = [layers[j], layers[i]];
      }
      return { ...d, layers };
    });
  }, [commit]);

  /* ── Alignement / répartition / miroir ── */
  const align = useCallback((edge: "l" | "c" | "r" | "t" | "m" | "b") => {
    const ls = docRef.current.layers.filter((l) => selRef.current.includes(l.id));
    if (!ls.length) return;
    const d = docRef.current;
    const box = ls.length > 1 ? bboxOf(ls) : { x: 0, y: 0, w: d.width, h: d.height };
    commit((dd) => ({
      ...dd,
      layers: dd.layers.map((l) => {
        if (!selRef.current.includes(l.id)) return l;
        if (edge === "l") return { ...l, x: box.x };
        if (edge === "c") return { ...l, x: Math.round(box.x + (box.w - l.w) / 2) };
        if (edge === "r") return { ...l, x: box.x + box.w - l.w };
        if (edge === "t") return { ...l, y: box.y };
        if (edge === "m") return { ...l, y: Math.round(box.y + (box.h - l.h) / 2) };
        return { ...l, y: box.y + box.h - l.h };
      }),
    }));
  }, [commit]);

  const distribute = useCallback((axis: "h" | "v") => {
    const ls = docRef.current.layers.filter((l) => selRef.current.includes(l.id));
    if (ls.length < 3) return;
    const sorted = [...ls].sort((a, b) => (axis === "h" ? a.x - b.x : a.y - b.y));
    const first = sorted[0], last = sorted[sorted.length - 1];
    const span = axis === "h" ? last.x + last.w - first.x : last.y + last.h - first.y;
    const total = sorted.reduce((s, l) => s + (axis === "h" ? l.w : l.h), 0);
    const gap = (span - total) / (sorted.length - 1);
    let cursor = axis === "h" ? first.x : first.y;
    const pos = new Map<string, number>();
    for (const l of sorted) {
      pos.set(l.id, Math.round(cursor));
      cursor += (axis === "h" ? l.w : l.h) + gap;
    }
    commit((d) => ({
      ...d,
      layers: d.layers.map((l) => (pos.has(l.id) ? (axis === "h" ? { ...l, x: pos.get(l.id)! } : { ...l, y: pos.get(l.id)! }) : l)),
    }));
  }, [commit]);

  const flipSel = useCallback((axis: "x" | "y") => {
    commit((d) => ({
      ...d,
      layers: d.layers.map((l) => (selRef.current.includes(l.id) ? (axis === "x" ? { ...l, flipX: !l.flipX } : { ...l, flipY: !l.flipY }) : l)),
    }));
  }, [commit]);

  /* ── Presse-papiers interne ── */
  const copySel = useCallback(() => {
    const ls = docRef.current.layers.filter((l) => selRef.current.includes(l.id));
    if (ls.length) clipboardRef.current = ls.map((l) => cloneLayer(l));
  }, []);
  const cutSel = useCallback(() => { copySel(); removeSel(); }, [copySel, removeSel]);
  const pasteInternal = useCallback(() => {
    if (!clipboardRef.current.length || !canEdit) return;
    const copies = clipboardRef.current.map((l) => cloneLayer(l, 32, 32));
    clipboardRef.current = copies.map((l) => cloneLayer(l)); // le prochain collage se décale encore
    commit((d) => ({ ...d, layers: [...d.layers, ...copies] }));
    setSelIds(copies.map((c) => c.id));
  }, [canEdit, commit]);

  /* ── Nom du document ── */
  const onName = (v: string) => {
    if (!canEdit) return;
    setName(v);
    schedule({ name: v.trim() || "Création" });
  };

  /* ── Coordonnées toile ── */
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const el = innerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: (clientX - r.left) / zoomRef.current, y: (clientY - r.top) / zoomRef.current };
  }, []);

  /* ── Interactions pointeur ── */
  const HANDLES: Record<string, { x: number; y: number }> = {
    nw: { x: -1, y: -1 }, n: { x: 0, y: -1 }, ne: { x: 1, y: -1 }, e: { x: 1, y: 0 },
    se: { x: 1, y: 1 }, s: { x: 0, y: 1 }, sw: { x: -1, y: 1 }, w: { x: -1, y: 0 },
  };
  const rot2 = (vx: number, vy: number, ang: number) => ({
    x: vx * Math.cos(ang) - vy * Math.sin(ang),
    y: vx * Math.sin(ang) + vy * Math.cos(ang),
  });

  type Drag =
    | { mode: "move"; startX: number; startY: number; origs: Map<string, Layer>; bbox: { x: number; y: number; w: number; h: number }; pushed: boolean; snap: DesignDoc }
    | { mode: "resize"; id: string; handle: string; orig: Layer; pushed: boolean; snap: DesignDoc }
    | { mode: "rotate"; id: string; cx: number; cy: number; startAngle: number; origRot: number; pushed: boolean; snap: DesignDoc }
    | { mode: "marquee"; startX: number; startY: number; additive: boolean; moved: boolean }
    | { mode: "pan"; startClientX: number; startClientY: number; startL: number; startT: number };
  const dragRef = useRef<Drag | null>(null);

  const ensurePushed = useCallback(() => {
    const dg = dragRef.current;
    if (dg && "pushed" in dg && !dg.pushed) { pushHistory(dg.snap); dg.pushed = true; }
  }, [pushHistory]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const dg = dragRef.current;
    if (!dg) return;

    if (dg.mode === "pan") {
      const el = scrollRef.current;
      if (el) {
        el.scrollLeft = dg.startL - (e.clientX - dg.startClientX);
        el.scrollTop = dg.startT - (e.clientY - dg.startClientY);
      }
      return;
    }

    const p = toCanvas(e.clientX, e.clientY);

    if (dg.mode === "marquee") {
      dg.moved = true;
      const x = Math.min(dg.startX, p.x), y = Math.min(dg.startY, p.y);
      setMarquee({ x, y, w: Math.abs(p.x - dg.startX), h: Math.abs(p.y - dg.startY) });
      return;
    }

    if (dg.mode === "move") {
      ensurePushed();
      const dx0 = p.x - dg.startX;
      const dy0 = p.y - dg.startY;
      // Aimantation : bords/centres de la toile + des autres calques.
      const d = docRef.current;
      const th = 6 / zoomRef.current;
      const bb = { x: dg.bbox.x + dx0, y: dg.bbox.y + dy0, w: dg.bbox.w, h: dg.bbox.h };
      const candX = [bb.x, bb.x + bb.w / 2, bb.x + bb.w];
      const candY = [bb.y, bb.y + bb.h / 2, bb.y + bb.h];
      const targX: number[] = [0, d.width / 2, d.width];
      const targY: number[] = [0, d.height / 2, d.height];
      for (const o of d.layers) {
        if (dg.origs.has(o.id) || !o.visible) continue;
        targX.push(o.x, o.x + o.w / 2, o.x + o.w);
        targY.push(o.y, o.y + o.h / 2, o.y + o.h);
      }
      let sx = 0, sy = 0, bestX = th, bestY = th;
      const gx: number[] = [], gy: number[] = [];
      for (const c of candX) for (const t of targX) {
        const diff = Math.abs(c - t);
        if (diff < bestX) { bestX = diff; sx = t - c; gx.length = 0; gx.push(t); }
      }
      for (const c of candY) for (const t of targY) {
        const diff = Math.abs(c - t);
        if (diff < bestY) { bestY = diff; sy = t - c; gy.length = 0; gy.push(t); }
      }
      setGuides({ x: gx, y: gy });
      const dx = Math.round(dx0 + sx), dy = Math.round(dy0 + sy);
      live((dd) => ({
        ...dd,
        layers: dd.layers.map((l) => {
          const o = dg.origs.get(l.id);
          return o ? { ...l, x: o.x + dx, y: o.y + dy } : l;
        }),
      }));
      return;
    }

    if (dg.mode === "rotate") {
      ensurePushed();
      let deg = dg.origRot + ((Math.atan2(p.y - dg.cy, p.x - dg.cx) - dg.startAngle) * 180) / Math.PI;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      for (const snap of [-360, -270, -180, -90, 0, 90, 180, 270, 360]) {
        if (Math.abs(deg - snap) < 3) { deg = snap; break; }
      }
      deg = Math.round(deg);
      setBadge(`${((deg % 360) + 360) % 360}°`);
      patchLayer(dg.id, { rotation: deg });
      return;
    }

    // resize — le repère local intègre rotation ET miroirs (transform DOM :
    // rotate ∘ flip), sinon les poignées d'un calque en miroir agissent à l'envers.
    ensurePushed();
    const o = dg.orig;
    const rad = (o.rotation * Math.PI) / 180;
    const fxs = o.flipX ? -1 : 1, fys = o.flipY ? -1 : 1;
    const fwd = (vx: number, vy: number) => rot2(vx * fxs, vy * fys, rad);
    const inv = (vx: number, vy: number) => { const r = rot2(vx, vy, -rad); return { x: r.x * fxs, y: r.y * fys }; };
    const a = HANDLES[dg.handle];
    const isCorner = a.x !== 0 && a.y !== 0;
    const cxo = o.x + o.w / 2, cyo = o.y + o.h / 2;
    const qFix = { x: (-a.x * o.w) / 2, y: (-a.y * o.h) / 2 }; // coin opposé (repère modèle)
    const fixOff = fwd(qFix.x, qFix.y);
    const fx = cxo + fixOff.x, fy = cyo + fixOff.y; // position toile du coin fixe
    const qp = inv(p.x - cxo, p.y - cyo);
    const local = { x: qp.x - qFix.x, y: qp.y - qFix.y };
    let nw = a.x !== 0 ? Math.max(MIN_SIZE, local.x * a.x) : o.w;
    let nh = a.y !== 0 ? Math.max(MIN_SIZE, local.y * a.y) : o.h;
    const aspect = o.w / Math.max(1, o.h);
    const keepAspect = isCorner && (o.type === "text" || (o.type === "image" ? !e.shiftKey : e.shiftKey));
    if (keepAspect) {
      if (nw / aspect > nh) nh = nw / aspect; else nw = nh * aspect;
    }
    const noff = fwd((a.x * nw) / 2, (a.y * nh) / 2);
    const ncx = fx + noff.x, ncy = fy + noff.y;
    const patch: LayerPatch = {
      x: Math.round(ncx - nw / 2), y: Math.round(ncy - nh / 2),
      w: Math.round(nw), h: Math.round(nh),
    };
    // Texte : le redimensionnement au coin met la police à l'échelle (façon Canva).
    if (o.type === "text" && isCorner) {
      const ratio = nw / o.w;
      patch.fontSize = Math.max(4, Math.round((o as TextLayer).fontSize * ratio));
      patch.letterSpacing = Math.round((o as TextLayer).letterSpacing * ratio * 10) / 10;
    }
    setBadge(`${Math.round(nw)} × ${Math.round(nh)}`);
    patchLayer(dg.id, patch);
  }, [toCanvas, live, patchLayer, ensurePushed]);

  const onPointerUp = useCallback(() => {
    const dg = dragRef.current;
    dragRef.current = null;
    setGuides({ x: [], y: [] });
    setBadge(null);
    // Le point d'annulation du geste a déjà été posé (ensurePushed) : on libère
    // la base « live » pour que le prochain commit reparte du document actuel.
    liveBaseRef.current = null;
    if (dg?.mode === "marquee") {
      if (dg.moved && marqueeRefState.current) {
        const m = marqueeRefState.current;
        const hits = docRef.current.layers
          .filter((l) => l.visible && !l.locked)
          .filter((l) => l.x < m.x + m.w && l.x + l.w > m.x && l.y < m.y + m.h && l.y + l.h > m.y)
          .map((l) => l.id);
        setSelIds((prev) => (dg.additive ? Array.from(new Set([...prev, ...hits])) : hits));
      } else if (!dg.additive) {
        setSelIds([]);
        setEditingId(null);
      }
      setMarquee(null);
    }
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  // Le rectangle de lasso vit dans un state ; on garde un miroir en ref pour le pointerup.
  const marqueeRefState = useRef<typeof marquee>(null);
  marqueeRefState.current = marquee;

  const startDrag = useCallback((dg: Drag) => {
    dragRef.current = dg;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, [onPointerMove, onPointerUp]);

  const beginMove = useCallback((l: Layer, e: React.PointerEvent) => {
    // Clic principal uniquement ; en mode « espace » ou clic molette, l'événement
    // remonte à l'espace de travail (déplacement de la vue).
    if (e.button !== 0 || spaceDown) return;
    if (!canEdit || l.locked || editingId === l.id) return;
    e.stopPropagation();
    const additive = e.shiftKey;
    let ids = selRef.current;
    if (!ids.includes(l.id)) {
      ids = additive ? [...ids, l.id] : [l.id];
      setSelIds(ids);
    } else if (additive) {
      setSelIds(ids.filter((i) => i !== l.id));
      return;
    }
    const layers = docRef.current.layers.filter((x) => ids.includes(x.id) && !x.locked);
    if (!layers.length) return;
    const p = toCanvas(e.clientX, e.clientY);
    startDrag({
      mode: "move", startX: p.x, startY: p.y,
      origs: new Map(layers.map((x) => [x.id, x])),
      bbox: bboxOf(layers),
      pushed: false, snap: docRef.current,
    });
  }, [canEdit, editingId, spaceDown, toCanvas, startDrag]);

  const beginResize = useCallback((l: Layer, handle: string, e: React.PointerEvent) => {
    if (!canEdit || l.locked) return;
    e.stopPropagation();
    startDrag({ mode: "resize", id: l.id, handle, orig: l, pushed: false, snap: docRef.current });
  }, [canEdit, startDrag]);

  const beginRotate = useCallback((l: Layer, e: React.PointerEvent) => {
    if (!canEdit || l.locked) return;
    e.stopPropagation();
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    const p = toCanvas(e.clientX, e.clientY);
    startDrag({ mode: "rotate", id: l.id, cx, cy, startAngle: Math.atan2(p.y - cy, p.x - cx), origRot: l.rotation, pushed: false, snap: docRef.current });
  }, [canEdit, toCanvas, startDrag]);

  const onWorkspaceDown = useCallback((e: React.PointerEvent) => {
    setCtxMenu(null);
    const el = scrollRef.current;
    if (e.button === 1 || spaceDown) {
      if (el) startDrag({ mode: "pan", startClientX: e.clientX, startClientY: e.clientY, startL: el.scrollLeft, startT: el.scrollTop });
      return;
    }
    if (e.button !== 0) return;
    if (editingId) setEditingId(null);
    const p = toCanvas(e.clientX, e.clientY);
    startDrag({ mode: "marquee", startX: p.x, startY: p.y, additive: e.shiftKey, moved: false });
  }, [spaceDown, editingId, toCanvas, startDrag]);

  /* ── Édition de texte en place ── */
  useEffect(() => {
    if (editingId && editRef.current) {
      const l = docRef.current.layers.find((x) => x.id === editingId);
      if (l && l.type === "text") {
        editRef.current.textContent = l.text;
        editRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(editRef.current);
        const s = window.getSelection();
        s?.removeAllRanges(); s?.addRange(range);
      }
    }
  }, [editingId]);

  const startEdit = useCallback((l: Layer) => {
    if (l.type !== "text" || !canEdit || l.locked) return;
    pushHistory(docRef.current);
    setEditingId(l.id);
    setSelIds([l.id]);
  }, [canEdit, pushHistory]);

  /* ── Raccourcis clavier & espace (pan) ── */
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const typing = isTyping(e.target);
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === "Space" && !typing) { setSpaceDown(true); }
      // Pendant la saisie (nom, textarea, texte en place), on laisse faire le
      // navigateur — y compris son propre annuler/rétablir de texte.
      if (typing) return;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); setSelIds(docRef.current.layers.filter((l) => l.visible && !l.locked).map((l) => l.id)); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSel(); return; }
      if (mod && e.key.toLowerCase() === "c") { copySel(); return; }
      if (mod && e.key.toLowerCase() === "x") { e.preventDefault(); cutSel(); return; }
      if (mod) return; // ⌘/Ctrl+0, ⌘+-, etc. : zoom du navigateur, pas le nôtre
      if (e.key === "Escape") { setSelIds([]); setEditingId(null); setCtxMenu(null); return; }
      if (e.key === "+" || e.key === "=") { setZoom((z) => clampN(z + 0.1, 0.03, 4)); return; }
      if (e.key === "-") { setZoom((z) => clampN(z - 0.1, 0.03, 4)); return; }
      if (e.key === "0") { fit(); return; }
      if (e.key === "1") { setZoom(1); return; }
      if (e.key === "?") { setShortcutsOpen(true); return; }
      if (!selRef.current.length) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (canEdit) removeSel(); return; }
      if (e.key === "[") { order("backward"); return; }
      if (e.key === "]") { order("forward"); return; }
      const step = e.shiftKey ? 10 : 1;
      const move = (dx: number, dy: number) => {
        e.preventDefault();
        patchLayers(selRef.current, {}, false); // s'assure d'un liveBase cohérent
        commit((d) => ({
          ...d,
          layers: d.layers.map((l) => (selRef.current.includes(l.id) && !l.locked ? { ...l, x: l.x + dx, y: l.y + dy } : l)),
        }));
      };
      if (e.key === "ArrowLeft") move(-step, 0);
      else if (e.key === "ArrowRight") move(step, 0);
      else if (e.key === "ArrowUp") move(0, -step);
      else if (e.key === "ArrowDown") move(0, step);
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(false); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, duplicateSel, copySel, cutSel, removeSel, order, canEdit, commit, patchLayers]);

  /* ── Collage (⌘V) : fichiers image du presse-papiers OU calques internes ── */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        files.forEach((f) => onPickImage(f));
        return;
      }
      if (clipboardRef.current.length) { e.preventDefault(); pasteInternal(); }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteInternal]);

  /* ── Zoom ── */
  const fit = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pad = 96;
    const d = docRef.current;
    const z = Math.min((el.clientWidth - pad) / d.width, (el.clientHeight - pad) / d.height);
    setZoom(clampN(z, 0.03, 4));
  }, []);
  useEffect(() => { fit(); }, [doc.width, doc.height, dockTab, fit]);

  const zoomAt = useCallback((clientX: number, clientY: number, dz: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const old = zoomRef.current;
    const next = clampN(old * (1 + dz), 0.03, 4);
    if (next === old) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left + el.scrollLeft;
    const py = clientY - rect.top + el.scrollTop;
    const k = next / old;
    setZoom(next);
    requestAnimationFrame(() => {
      el.scrollLeft = px * k - (clientX - rect.left);
      el.scrollTop = py * k - (clientY - rect.top);
    });
  }, []);

  // ⌘/Ctrl + molette (et pincement trackpad) : zoom vers le curseur.
  // Écouteur NATIF non-passif — React attache wheel en passif, où
  // preventDefault est ignoré et le navigateur zoomerait la page entière.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, -Math.sign(e.deltaY) * 0.12);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /* ── Upload d'images ── */
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
        const MAXD = 2200;
        const k = Math.min(1, MAXD / Math.max(bmp.naturalWidth, bmp.naturalHeight));
        if (k < 1) {
          const c = document.createElement("canvas");
          c.width = Math.round(bmp.naturalWidth * k);
          c.height = Math.round(bmp.naturalHeight * k);
          c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
          const isPng = file.type === "image/png" || file.type === "image/webp";
          blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), isPng ? "image/png" : "image/jpeg", 0.92));
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

  const onPickImage = useCallback(async (file: File, at?: { x: number; y: number }) => {
    if (!canEdit) return;
    setUploading(true);
    try {
      const up = await uploadFile(file);
      if (!up) { window.alert("L'image n'a pas pu être envoyée (format non pris en charge ou fichier trop lourd — 12 Mo max)."); return; }
      const d = docRef.current;
      const aspect = up.w / up.h;
      let w = Math.min(d.width * 0.72, up.w);
      let h = w / aspect;
      if (h > d.height * 0.85) { h = d.height * 0.85; w = h * aspect; }
      const x = at ? Math.round(at.x - w / 2) : Math.round((d.width - w) / 2);
      const y = at ? Math.round(at.y - h / 2) : Math.round((d.height - h) / 2);
      addAndSelect(makeImage(d, { src: up.url, w: Math.round(w), h: Math.round(h), x, y, naturalW: up.w, naturalH: up.h } as Partial<ImageLayer>));
    } finally {
      setUploading(false);
    }
  }, [canEdit, uploadFile, addAndSelect]);

  const replaceImage = useCallback(async (file: File) => {
    const target = docRef.current.layers.find((l) => selRef.current.includes(l.id) && l.type === "image");
    if (!target) return;
    setUploading(true);
    try {
      const up = await uploadFile(file);
      if (!up) { window.alert("L'image n'a pas pu être envoyée (format non pris en charge ou fichier trop lourd — 12 Mo max)."); return; }
      patchLayer(target.id, { src: up.url, naturalW: up.w, naturalH: up.h }, true);
    } finally { setUploading(false); }
  }, [uploadFile, patchLayer]);

  /* ── Export ── */
  const doExport = useCallback(async (format: "png" | "jpeg", scale: number, transparent: boolean) => {
    // JPEG ne gère pas la transparence : base blanche pour éviter un fond noir.
    const canvas = await rasterize(docRef.current, scale, { transparent, flatten: format === "jpeg" ? "#ffffff" : undefined });
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const url = canvas.toDataURL(mime, 0.95);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "design").replace(/[^\w-]+/g, "_")}.${format === "jpeg" ? "jpg" : "png"}`;
    a.click();
  }, [name]);

  const doCopy = useCallback(async (scale: number, transparent: boolean): Promise<boolean> => {
    try {
      const canvas = await rasterize(docRef.current, scale, { transparent });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return false;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return true;
    } catch { return false; }
  }, []);

  /* ── Contrôleur passé à l'UI ── */
  const ctl: EditorCtl = {
    doc, selLayers, selIds, canEdit, uploading,
    patchSel, patchLayer, commitDoc, select,
    addShape, addLine, addText, addEmoji, applyTemplate,
    uploadClick: () => fileRef.current?.click(),
    replaceImageClick: () => replaceRef.current?.click(),
    align, distribute, order, duplicateSel, removeSel, flipSel,
    reorderLayer, removeLayer, duplicateLayer,
  };

  /* ── Menu contextuel ── */
  const ctxItems: CtxMenuItem[] = ctxMenu?.onCanvas
    ? [
        { label: "Coller", icon: ClipboardPaste, onClick: pasteInternal, kbd: "⌘V" },
        { label: "Tout sélectionner", icon: MousePointerSquareDashed, onClick: () => setSelIds(docRef.current.layers.filter((l) => l.visible && !l.locked).map((l) => l.id)), kbd: "⌘A" },
      ]
    : [
        { label: "Copier", icon: Copy, onClick: copySel, kbd: "⌘C" },
        { label: "Couper", icon: Scissors, onClick: cutSel, kbd: "⌘X" },
        { label: "Coller", icon: ClipboardPaste, onClick: pasteInternal, kbd: "⌘V" },
        { label: "Dupliquer", icon: Copy, onClick: duplicateSel, kbd: "⌘D" },
        { label: "Avancer", icon: ArrowUp, onClick: () => order("forward"), kbd: "]", divider: true },
        { label: "Reculer", icon: ArrowDown, onClick: () => order("backward"), kbd: "[" },
        { label: "Premier plan", icon: BringToFront, onClick: () => order("front") },
        { label: "Arrière-plan", icon: SendToBack, onClick: () => order("back") },
        selLayers[0]?.locked
          ? { label: "Déverrouiller", icon: Unlock, onClick: () => patchSel({ locked: false }, true), divider: true }
          : { label: "Verrouiller", icon: LockIcon, onClick: () => patchSel({ locked: true }, true), divider: true },
        { label: "Supprimer", icon: Trash2, onClick: removeSel, danger: true, kbd: "⌫" },
      ];

  const zoomPct = Math.round(zoom * 100);
  const transparentBg = !doc.backgroundGradient && doc.background === "transparent";

  return (
    <div className="flex h-full min-h-0 select-none flex-col">
      {/* ── Barre supérieure ── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 backdrop-blur-xl">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white" title="Retour au studio">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#a855f7] to-[#6366f1] shadow-lg shadow-purple-500/25">
          <Shapes className="size-4 text-white" />
        </span>
        <input
          value={name} onChange={(e) => onName(e.target.value)} onBlur={() => notifyRefresh()} disabled={!canEdit}
          className="w-40 min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30 sm:w-60"
          placeholder="Création sans titre"
        />
        <button onClick={() => setSizeOpen(true)} disabled={!canEdit}
          className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-40 sm:inline-flex">
          <LayoutGrid className="size-3.5" /> {doc.width}×{doc.height}
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={undo} disabled={!past.length} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-30" title="Annuler (⌘Z)"><Undo2 className="size-4" /></button>
          <button onClick={redo} disabled={!future.length} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-30" title="Rétablir (⌘⇧Z)"><Redo2 className="size-4" /></button>
          <button onClick={() => setShortcutsOpen(true)} className="hidden size-8 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white sm:grid" title="Raccourcis clavier (?)"><Keyboard className="size-4" /></button>
          <div className="mx-1 hidden items-center gap-1.5 text-xs text-muted lg:flex">
            {save === "saving" ? <Loader2 className="size-3.5 animate-spin" />
              : save === "error" ? <span className="text-red-400">Erreur</span>
              : <Check className="size-3.5 text-emerald-400" />}
          </div>
          <button onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110">
            <Download className="size-3.5" /> Exporter
          </button>
        </div>
      </header>

      {/* ── Corps ── */}
      <div className="flex min-h-0 flex-1">
        <LeftDock tab={canEdit ? dockTab : null} setTab={setDockTab} ctl={ctl} />
        <input ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => onPickImage(f)); e.target.value = ""; }} />
        <input ref={replaceRef} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceImage(f); e.target.value = ""; }} />

        <div className="flex min-w-0 flex-1 flex-col">
          <ContextBar ctl={ctl} />

          {/* Espace de travail */}
          <div
            ref={scrollRef}
            className="relative min-h-0 flex-1 overflow-auto bg-[#0a0a10] [background-image:radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:22px_22px]"
            style={{ cursor: spaceDown ? "grab" : undefined }}
            onPointerDown={onWorkspaceDown}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
              const p = toCanvas(e.clientX, e.clientY);
              files.forEach((f, i) => onPickImage(f, { x: p.x + i * 30, y: p.y + i * 30 }));
            }}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, onCanvas: true }); }}
          >
            <div className="grid min-h-full w-max min-w-full place-items-center p-12">
              <div className="relative" style={{ width: doc.width * zoom, height: doc.height * zoom }}>
                <div
                  ref={innerRef}
                  className="absolute left-0 top-0 origin-top-left shadow-2xl shadow-black/60 ring-1 ring-black/40"
                  style={{
                    width: doc.width, height: doc.height, transform: `scale(${zoom})`,
                    background: transparentBg
                      ? "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 24px 24px"
                      : doc.backgroundGradient
                        ? undefined
                        : doc.background,
                    backgroundImage: doc.backgroundGradient
                      ? doc.backgroundGradient.type === "linear"
                        ? `linear-gradient(${doc.backgroundGradient.angle}deg, ${doc.backgroundGradient.from}, ${doc.backgroundGradient.to})`
                        : `radial-gradient(circle, ${doc.backgroundGradient.from}, ${doc.backgroundGradient.to})`
                      : undefined,
                  }}
                >
                  {doc.layers.map((l) => (
                    <InteractiveLayer
                      key={l.id}
                      layer={l}
                      zoom={zoom}
                      selected={selIds.includes(l.id)}
                      soloSelected={selIds.length === 1 && selIds[0] === l.id}
                      editing={editingId === l.id}
                      canEdit={canEdit}
                      editRef={editingId === l.id ? editRef : undefined}
                      onBeginMove={(e) => beginMove(l, e)}
                      onBeginResize={(h, e) => beginResize(l, h, e)}
                      onBeginRotate={(e) => beginRotate(l, e)}
                      onStartEdit={() => startEdit(l)}
                      onEditInput={(text) => patchLayer(l.id, { text })}
                      onEditBlur={() => { setEditingId(null); liveBaseRef.current = null; /* point déjà posé par startEdit */ }}
                      onContext={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (!selRef.current.includes(l.id)) setSelIds([l.id]);
                        setCtxMenu({ x: e.clientX, y: e.clientY, onCanvas: false });
                      }}
                    />
                  ))}

                  {/* Repères d'aimantation */}
                  {guides.x.map((gx, i) => (
                    <div key={`gx${i}`} className="pointer-events-none absolute top-0 bg-fuchsia-400" style={{ left: gx, width: Math.max(1, 1 / zoom), height: doc.height }} />
                  ))}
                  {guides.y.map((gy, i) => (
                    <div key={`gy${i}`} className="pointer-events-none absolute left-0 bg-fuchsia-400" style={{ top: gy, height: Math.max(1, 1 / zoom), width: doc.width }} />
                  ))}

                  {/* Lasso */}
                  {marquee && (
                    <div className="pointer-events-none absolute border border-purple-400/70 bg-purple-400/10"
                      style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, borderWidth: Math.max(1, 1 / zoom) }} />
                  )}
                </div>
              </div>
            </div>

            {/* Badge dimensions / angle */}
            {badge && (
              <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/75 px-3 py-1 text-xs font-medium tabular-nums text-white backdrop-blur">
                {badge}
              </div>
            )}

            {/* Lecture seule */}
            {!canEdit && (
              <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-muted backdrop-blur">
                <Lock className="mr-1 inline size-3" /> Lecture seule
              </div>
            )}

            {/* Zoom flottant */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-black/70 px-1.5 py-1 shadow-xl backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={() => setZoom((z) => clampN(z - 0.1, 0.03, 4))} className="grid size-7 place-items-center rounded-full text-muted hover:text-white" title="Zoom arrière (−)"><ZoomOut className="size-3.5" /></button>
              <span className="w-12 text-center text-[11px] font-medium tabular-nums text-white/85">{zoomPct}%</span>
              <button onClick={() => setZoom((z) => clampN(z + 0.1, 0.03, 4))} className="grid size-7 place-items-center rounded-full text-muted hover:text-white" title="Zoom avant (+)"><ZoomIn className="size-3.5" /></button>
              <div className="mx-0.5 h-4 w-px bg-white/15" />
              <button onClick={fit} className="grid size-7 place-items-center rounded-full text-muted hover:text-white" title="Ajuster (0)"><Maximize2 className="size-3.5" /></button>
              <button onClick={() => setZoom(1)} className="rounded-full px-1.5 text-[11px] font-medium text-muted hover:text-white" title="Taille réelle (1)">1:1</button>
            </div>
          </div>
        </div>

        <RightPanel ctl={ctl} tab={rightTab} setTab={setRightTab} />
      </div>

      {/* ── Modales & menu contextuel ── */}
      {sizeOpen && <SizeModal doc={doc} onClose={() => setSizeOpen(false)} onApply={(w, h) => { commitDoc({ width: w, height: h }); setSizeOpen(false); }} />}
      {exportOpen && <ExportModal doc={doc} onClose={() => setExportOpen(false)} onExport={doExport} onCopy={doCopy} />}
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxItems} onClose={() => setCtxMenu(null)} />}
    </div>
  );
}

/* ═══════════════ Calque interactif (visuel partagé + poignées) ═══════════════ */

function InteractiveLayer({
  layer: l, zoom, selected, soloSelected, editing, canEdit, editRef,
  onBeginMove, onBeginResize, onBeginRotate, onStartEdit, onEditInput, onEditBlur, onContext,
}: {
  layer: Layer; zoom: number; selected: boolean; soloSelected: boolean; editing: boolean; canEdit: boolean;
  editRef?: React.RefObject<HTMLDivElement | null>;
  onBeginMove: (e: React.PointerEvent) => void;
  onBeginResize: (handle: string, e: React.PointerEvent) => void;
  onBeginRotate: (e: React.PointerEvent) => void;
  onStartEdit: () => void;
  onEditInput: (text: string) => void;
  onEditBlur: () => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const hz = 1 / zoom;
  const style: React.CSSProperties = {
    ...layerBoxStyle(l),
    pointerEvents: l.locked ? "none" : "auto",
    cursor: canEdit && !l.locked ? "move" : "default",
  };

  const content = editing && l.type === "text" ? (
    <div
      ref={editRef}
      contentEditable
      suppressContentEditableWarning
      style={{ ...textStyle(l), cursor: "text" }}
      onInput={(e) => onEditInput((e.currentTarget as HTMLDivElement).innerText)}
      onBlur={onEditBlur}
      onPointerDown={(e) => e.stopPropagation()}
    />
  ) : (
    <LayerVisual layer={l} />
  );

  return (
    <div
      style={style}
      onPointerDown={(e) => { if (!editing) onBeginMove(e); }}
      onDoubleClick={(e) => { if (l.type === "text") { e.stopPropagation(); onStartEdit(); } }}
      onContextMenu={onContext}
    >
      {content}

      {selected && canEdit && !editing && (
        <>
          <div className="pointer-events-none absolute inset-0" style={{ outline: `${1.6 * hz}px solid ${ACCENT}` }} />
          {soloSelected && (
            <>
              {/* Poignée de rotation */}
              <div
                onPointerDown={onBeginRotate}
                className="absolute rounded-full bg-white"
                style={{ left: "50%", top: -24 * hz, width: 13 * hz, height: 13 * hz, transform: "translate(-50%,-50%)", cursor: "grab", boxShadow: `0 0 0 ${2 * hz}px ${ACCENT}` }}
              />
              <div className="pointer-events-none absolute bg-fuchsia-400" style={{ left: "50%", top: -24 * hz, width: Math.max(1, 1.5 * hz), height: 24 * hz, transform: "translateX(-50%)" }} />
              {/* Poignées de redimensionnement */}
              {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((h) => {
                const pos: Record<string, [string, string, string]> = {
                  nw: ["0%", "0%", "nwse-resize"], n: ["50%", "0%", "ns-resize"], ne: ["100%", "0%", "nesw-resize"],
                  e: ["100%", "50%", "ew-resize"], se: ["100%", "100%", "nwse-resize"], s: ["50%", "100%", "ns-resize"],
                  sw: ["0%", "100%", "nesw-resize"], w: ["0%", "50%", "ew-resize"],
                };
                const [lft, tp, cur] = pos[h];
                const corner = h.length === 2;
                return (
                  <div
                    key={h}
                    onPointerDown={(e) => onBeginResize(h, e)}
                    className={`absolute bg-white ${corner ? "rounded-[3px]" : "rounded-full"}`}
                    style={{
                      left: lft, top: tp,
                      width: (corner ? 11 : 9) * hz, height: (corner ? 11 : 9) * hz,
                      transform: "translate(-50%,-50%)", cursor: cur,
                      boxShadow: `0 0 0 ${1.6 * hz}px ${ACCENT}`,
                    }}
                  />
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
