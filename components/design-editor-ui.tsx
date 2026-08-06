"use client";

// UI du studio Design : contrôles, sélecteur de couleur (uni + dégradé +
// pipette), barre contextuelle, dock gauche (éléments/texte/emoji/fond/
// modèles/import), panneau droit (réglages + calques) et modales.
// La logique d'état vit dans design-editor.tsx et arrive via `EditorCtl`.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Type, Minus, Image as ImageIcon, Download, X, Plus, Copy, Eye, EyeOff,
  Lock, Unlock, Trash2, ChevronUp, ChevronDown, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical,
  AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  FlipHorizontal2, FlipVertical2, BringToFront, SendToBack, ArrowUp, ArrowDown,
  Shapes, Smile, PaintBucket, LayoutTemplate, Upload, Droplet, Pipette,
  CaseUpper, Layers as LayersIcon, SlidersHorizontal, Sparkles, LayoutGrid,
  Keyboard, ClipboardCopy, Columns3, Rows3, Search, Crop, Check, RotateCcw, Frame,
} from "lucide-react";
import {
  type DesignDoc, type Layer, type ShapeKind, type LineDash, type GradientFill,
  type Filters, type Shadow, type TextLayer, type ImageLayer, type ShapeLayer, type LineLayer, type ElementLayer,
  SHAPE_KINDS, FONTS, BLEND_MODES, SIZE_PRESETS, NEUTRAL_FILTERS, DEFAULT_SHADOW,
  shapePath, backgroundCss, contentBox, hasCrop,
} from "@/lib/design";
import {
  EMOJI_GROUPS, BG_SOLIDS, GRADIENT_PRESETS, FILTER_PRESETS, TEXT_PRESETS,
  TEMPLATES, templateDoc, type TextPreset,
} from "@/lib/design-presets";
import { elementSlotDefaults, elementThumbSrc, normalizeSearch, type ElementDef } from "@/lib/design-elements";
import { ELEMENT_CATEGORIES, catalogElementById, categoryCount, categoryPage, searchElements, catalogTotal } from "@/lib/design-catalog";
import { PHOTO_CATEGORIES, loadPhotos, photoSrc, type StockPhoto } from "@/lib/design-photos";
import { DocPreview } from "./design-render";

export const ACCENT = "#a855f7";

/* ═══════════════ Contrat éditeur ⇄ UI ═══════════════ */

export type LayerPatch = Record<string, unknown>;

export type EditorCtl = {
  doc: DesignDoc;
  selLayers: Layer[];
  selIds: string[];
  canEdit: boolean;
  uploading: boolean;
  /** Patch tous les calques sélectionnés. commit=true crée un point d'annulation. */
  patchSel: (patch: LayerPatch, commit?: boolean) => void;
  patchLayer: (id: string, patch: LayerPatch, commit?: boolean) => void;
  commitDoc: (patch: Partial<DesignDoc>) => void;
  select: (id: string, additive?: boolean) => void;
  addShape: (k: ShapeKind) => void;
  addLine: (dash: LineDash) => void;
  addText: (preset?: TextPreset) => void;
  addEmoji: (emoji: string) => void;
  addElement: (el: ElementDef) => void;
  addPhoto: (p: StockPhoto) => void;
  applyTemplate: (doc: DesignDoc) => void;
  uploadClick: () => void;
  replaceImageClick: () => void;
  align: (edge: "l" | "c" | "r" | "t" | "m" | "b") => void;
  distribute: (axis: "h" | "v") => void;
  order: (op: "front" | "back" | "forward" | "backward") => void;
  duplicateSel: () => void;
  removeSel: () => void;
  flipSel: (axis: "x" | "y") => void;
  reorderLayer: (id: string, dir: 1 | -1) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  /* Rognage */
  cropId: string | null;
  beginCrop: (id: string) => void;
  endCrop: () => void;
  resetCrop: (id: string) => void;
  cropRatio: (id: string, ratio: number | null) => void;
  cropZoom: (id: string, pct: number, done: boolean) => void;
  setMask: (id: string, mask: ShapeKind | null) => void;
  docCropActive: boolean;
  beginDocCrop: () => void;
  cropToSelection: () => void;
};

/** Contrat réduit de la barre de rognage (un seul calque en jeu). */
export type CropCtl = {
  layer: Layer;
  endCrop: () => void;
  resetCrop: (id: string) => void;
  cropRatio: (id: string, ratio: number | null) => void;
  cropZoom: (id: string, pct: number, done: boolean) => void;
  setMask: (id: string, mask: ShapeKind | null) => void;
};

/* ═══════════════ Petits contrôles ═══════════════ */

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
        {action}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

export function NumField({ label, value, onChange, disabled, min }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; min?: number }) {
  return (
    <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = Math.round(Number(e.target.value) || 0);
          onChange(min !== undefined ? Math.max(min, v) : v);
        }}
        className="min-w-0 flex-1 bg-transparent text-right text-xs tabular-nums text-white outline-none disabled:opacity-60"
      />
    </label>
  );
}

export function RangeField({ label, value, min, max, step = 1, onChange, onCommit, disabled }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; onCommit?: (v: number) => void; disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-white/70">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        className="w-full accent-purple-500 disabled:opacity-40"
        style={{ height: 4 }}
      />
    </label>
  );
}

export function SelectField({ label, value, options, onChange, disabled }: {
  label?: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-[11px] text-muted">{label}</span>}
      <select
        value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[#15151d] px-2 py-1.5 text-xs text-white outline-none focus:border-purple-400/50 disabled:opacity-60"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function ToggleBtn({ active, onClick, disabled, title, children }: {
  active: boolean; onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={title}
      className={`grid size-8 shrink-0 place-items-center rounded-lg border transition disabled:opacity-40 ${active ? "border-purple-400/50 bg-purple-500/15 text-white" : "border-white/10 text-muted hover:bg-white/5 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

export function IconBtn({ onClick, disabled, title, children, danger }: {
  onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={title}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/5 disabled:opacity-30 ${danger ? "hover:text-red-400" : "hover:text-white"}`}
    >
      {children}
    </button>
  );
}

/* ═══════════════ Couleur : conversions ═══════════════ */

const clampN = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const to2 = (n: number) => clampN(Math.round(n), 0, 255).toString(16).padStart(2, "0");
export function normHex(h: string): string {
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

const COLOR_PRESETS = [
  "#000000", "#374151", "#6b7280", "#d1d5db", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
];

/* ═══════════════ Sélecteur de couleur (popover) ═══════════════ */

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

function SolidPicker({ value, onChange, allowTransparent }: {
  value: string; onChange: (v: string) => void; allowTransparent?: boolean;
}) {
  const hex = value === "transparent" ? "#ffffff" : normHex(value);
  const [h, s, v] = hexToHsv(hex);
  const svRef = useRef<HTMLDivElement | null>(null);
  const hasDropper = typeof window !== "undefined" && "EyeDropper" in window;

  const pickSV = (e: React.PointerEvent) => {
    const el = svRef.current;
    if (!el) return;
    const move = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      const ns = clampN((cx - r.left) / r.width, 0, 1) * 100;
      const nv = (1 - clampN((cy - r.top) / r.height, 0, 1)) * 100;
      onChange(hsvToHex(h, ns, nv));
    };
    move(e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const eyedrop = async () => {
    try {
      const Ctor = (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper;
      const res = await new Ctor().open();
      onChange(normHex(res.sRGBHex));
    } catch { /* annulé */ }
  };

  return (
    <div>
      <div
        ref={svRef} onPointerDown={pickSV}
        className="relative mb-2 h-28 w-full cursor-crosshair rounded-lg"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h, 100, 100)})` }}
      >
        <div className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${s}%`, top: `${100 - v}%` }} />
      </div>
      <input
        type="range" min={0} max={360} value={Math.round(h)}
        onChange={(e) => onChange(hsvToHex(Number(e.target.value), s || 100, v || 100))}
        className="mb-2 w-full appearance-none rounded-full"
        style={{ height: 10, background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
      />
      <div className="mb-2 flex items-center gap-1.5">
        <input
          value={value === "transparent" ? "transparent" : hex}
          onChange={(e) => onChange(e.target.value === "transparent" ? "transparent" : normHex(e.target.value))}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-xs uppercase text-white outline-none"
        />
        {hasDropper && (
          <button onClick={eyedrop} title="Pipette (prélever une couleur à l'écran)" className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5 hover:text-white">
            <Pipette className="size-3.5" />
          </button>
        )}
        {allowTransparent && (
          <button onClick={() => onChange("transparent")} className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] ${value === "transparent" ? "border-purple-400/50 bg-purple-500/10 text-white" : "border-white/10 text-muted hover:text-white"}`}>
            Aucun
          </button>
        )}
      </div>
      <div className="grid grid-cols-10 gap-1">
        {COLOR_PRESETS.map((p) => (
          <button key={p} onClick={() => onChange(p)} className="size-4 rounded ring-1 ring-black/30 transition hover:scale-110" style={{ background: p }} />
        ))}
      </div>
    </div>
  );
}

export function ColorPopover({ label, value, onChange, onClose, gradient, onGradient, allowTransparent, anchor = "right" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  /** Si fourni, un onglet Dégradé est proposé. */
  gradient?: GradientFill | null;
  onGradient?: (g: GradientFill | null) => void;
  allowTransparent?: boolean;
  anchor?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<"solid" | "gradient">(gradient ? "gradient" : "solid");
  const [stop, setStop] = useState<"from" | "to">("from");

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const hasGradientTab = onGradient !== undefined;
  const g: GradientFill = gradient ?? { type: "linear", angle: 135, from: normHex(value), to: "#6366f1" };

  return (
    <div ref={ref} className={`absolute ${anchor === "right" ? "right-0" : "left-0"} top-full z-50 mt-2 w-60 rounded-xl border border-white/10 bg-[#15151d] p-3 shadow-2xl shadow-black/60`} onPointerDown={(e) => e.stopPropagation()}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        {hasGradientTab && (
          <div className="flex rounded-lg border border-white/10 p-0.5 text-[11px]">
            <button onClick={() => { setTab("solid"); onGradient?.(null); }} className={`rounded-md px-2 py-0.5 ${tab === "solid" ? "bg-white/10 text-white" : "text-muted"}`}>Uni</button>
            <button onClick={() => { setTab("gradient"); onGradient?.(g); }} className={`rounded-md px-2 py-0.5 ${tab === "gradient" ? "bg-white/10 text-white" : "text-muted"}`}>Dégradé</button>
          </div>
        )}
      </div>

      {tab === "solid" || !hasGradientTab ? (
        <SolidPicker value={value} onChange={onChange} allowTransparent={allowTransparent} />
      ) : (
        <div>
          <div className="mb-2 h-8 w-full rounded-lg ring-1 ring-black/30" style={{ background: backgroundCss("#fff", g) }} />
          <div className="mb-2 flex items-center gap-1.5">
            {(["from", "to"] as const).map((k) => (
              <button
                key={k} onClick={() => setStop(k)}
                className={`flex flex-1 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${stop === k ? "border-purple-400/60 text-white" : "border-white/10 text-muted"}`}
              >
                <span className="size-4 rounded ring-1 ring-black/30" style={{ background: k === "from" ? g.from : g.to }} />
                {k === "from" ? "Début" : "Fin"}
              </button>
            ))}
            <button
              onClick={() => onGradient?.({ ...g, type: g.type === "linear" ? "radial" : "linear" })}
              className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-muted hover:text-white"
              title="Type de dégradé"
            >
              {g.type === "linear" ? "Linéaire" : "Radial"}
            </button>
          </div>
          <SolidPicker
            value={stop === "from" ? g.from : g.to}
            onChange={(v) => onGradient?.({ ...g, [stop]: normHex(v) })}
          />
          {g.type === "linear" && (
            <div className="mt-2">
              <RangeField label="Angle" value={Math.round(g.angle)} min={0} max={360} onChange={(v) => onGradient?.({ ...g, angle: v })} />
            </div>
          )}
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {GRADIENT_PRESETS.map((p) => (
              <button key={p.label} title={p.label} onClick={() => onGradient?.({ ...p.g })} className="h-6 rounded-md ring-1 ring-black/30 transition hover:scale-105" style={{ background: backgroundCss("#fff", p.g) }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pastille + popover couleur, prête à poser dans une barre ou un panneau. */
/* ── Couleurs d'un élément : une pastille ÉDITABLE par emplacement ──
   Un élément multicolore (ballon + coutures, pomme + feuille…) expose une
   couleur par emplacement : chacune se change indépendamment, en teinte unie
   ou en dégradé. Les éléments monochromes n'en exposent qu'une. */
export function elementSlotLabels(l: ElementLayer): string[] {
  const def = catalogElementById(l.ref);
  if (!def?.slots?.length) return ["Couleur"];
  return def.slots.map((s) => s.label);
}

export function ElementColorChips({ l, ctl, disabled, compact }: { l: ElementLayer; ctl: EditorCtl; disabled?: boolean; compact?: boolean }) {
  const def = catalogElementById(l.ref);
  const labels = elementSlotLabels(l);
  const defaults = def ? elementSlotDefaults(def) : [{ fill: l.fill, gradient: null }];
  // Emplacements secondaires : valeur du calque, sinon couleur de départ.
  const slotAt = (i: number) => l.slots?.[i - 1] ?? defaults[i] ?? { fill: l.fill, gradient: null };

  const patchSlot = (i: number, next: { fill: string; gradient: GradientFill | null }) => {
    const cur = Array.from({ length: Math.max(0, labels.length - 1) }, (_, k) => slotAt(k + 1));
    cur[i - 1] = next;
    ctl.patchSel({ slots: cur }, true);
  };

  return (
    <>
      {labels.map((label, i) => {
        const v = i === 0 ? { fill: l.fill, gradient: l.gradient } : slotAt(i);
        return (
          <ColorChip
            key={i}
            compact={compact}
            label={compact ? label : label}
            value={v.fill}
            gradient={v.gradient}
            onChange={(c) => (i === 0 ? ctl.patchSel({ fill: c, gradient: null }, true) : patchSlot(i, { fill: c, gradient: null }))}
            onGradient={(g) => (i === 0 ? ctl.patchSel({ gradient: g }, true) : patchSlot(i, { fill: v.fill, gradient: g }))}
            disabled={disabled}
            anchor={compact ? "left" : undefined}
          />
        );
      })}
    </>
  );
}

export function ColorChip({ label, value, gradient, onChange, onGradient, allowTransparent, disabled, compact, anchor }: {
  label: string;
  value: string;
  gradient?: GradientFill | null;
  onChange: (v: string) => void;
  onGradient?: (g: GradientFill | null) => void;
  allowTransparent?: boolean;
  disabled?: boolean;
  compact?: boolean;
  anchor?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const bg = gradient
    ? backgroundCss("#fff", gradient)
    : value === "transparent"
      ? "repeating-conic-gradient(#cbd5e1 0% 25%, #fff 0% 50%) 50% / 8px 8px"
      : value;
  return (
    <div className="relative">
      {compact ? (
        <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} title={label}
          className="grid size-8 place-items-center rounded-lg border border-white/10 transition hover:bg-white/5 disabled:opacity-40">
          <span className="size-5 rounded-md ring-1 ring-black/40" style={{ background: bg }} />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[11px] text-muted">{label}</span>
          <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 disabled:opacity-40">
            <span className="size-5 rounded ring-1 ring-black/30" style={{ background: bg }} />
            <span className="text-[11px] uppercase tabular-nums text-white/80">
              {gradient ? "Dégradé" : value === "transparent" ? "Aucun" : normHex(value)}
            </span>
          </button>
        </div>
      )}
      {open && !disabled && (
        <ColorPopover label={label} value={value} onChange={onChange} onClose={() => setOpen(false)}
          gradient={gradient} onGradient={onGradient} allowTransparent={allowTransparent} anchor={anchor} />
      )}
    </div>
  );
}

/* ═══════════════ Barre contextuelle (au-dessus de la toile) ═══════════════ */

export function ContextBar({ ctl }: { ctl: EditorCtl }) {
  const ls = ctl.selLayers;
  if (!ls.length || !ctl.canEdit) return null;
  const one = ls.length === 1 ? ls[0] : null;
  const sameType = ls.every((l) => l.type === ls[0].type) ? ls[0].type : null;

  return (
    // flex-wrap plutôt qu'overflow-x-auto : un conteneur défilant rognerait les
    // popovers ouverts depuis la barre. relative z-30 : le backdrop-blur crée un
    // contexte d'empilement — sans z explicite, l'espace de travail (frère
    // suivant dans le DOM) peindrait PAR-DESSUS les popovers.
    <div className="relative z-30 flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-b border-white/10 bg-white/[0.03] px-2 py-1 backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
      {/* Contrôles spécifiques au type */}
      {sameType === "text" && one && <TextQuick l={one as TextLayer} ctl={ctl} />}
      {sameType === "shape" && <ShapeQuick l={ls[0] as ShapeLayer} ctl={ctl} />}
      {sameType === "line" && <LineQuick l={ls[0] as LineLayer} ctl={ctl} />}
      {sameType === "image" && one && <ImageQuick l={one as ImageLayer} ctl={ctl} />}
      {sameType === "element" && <ElementColorChips l={ls[0] as ElementLayer} ctl={ctl} compact />}

      {one && (
        <>
          <Divider />
          <button
            onClick={() => ctl.beginCrop(one.id)}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition hover:bg-white/5 hover:text-white ${hasCrop(one.crop) ? "border-purple-400/50 bg-purple-500/15 text-white" : "border-white/10 text-muted"}`}
            title="Rogner (C)"
          >
            <Crop className="size-3.5" /> Rogner
          </button>
          <MaskPicker value={one.mask ?? null} onChange={(m) => ctl.setMask(one.id, m)} compact />
        </>
      )}

      {ls.length > 1 && (
        <>
          <span className="px-1 text-[11px] font-medium text-muted">{ls.length} éléments</span>
          <button onClick={ctl.cropToSelection} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-muted transition hover:bg-white/5 hover:text-white" title="Rogner la toile sur la sélection">
            <Frame className="size-3.5" /> Toile ici
          </button>
          <Divider />
          {([["l", AlignStartVertical], ["c", AlignCenterVertical], ["r", AlignEndVertical], ["t", AlignStartHorizontal], ["m", AlignCenterHorizontal], ["b", AlignEndHorizontal]] as const).map(([e, Ic]) => (
            <IconBtn key={e} onClick={() => ctl.align(e)} title="Aligner"><Ic className="size-4" /></IconBtn>
          ))}
          {ls.length > 2 && (
            <>
              <IconBtn onClick={() => ctl.distribute("h")} title="Répartir horizontalement"><Columns3 className="size-4" /></IconBtn>
              <IconBtn onClick={() => ctl.distribute("v")} title="Répartir verticalement"><Rows3 className="size-4" /></IconBtn>
            </>
          )}
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <OpacityQuick ctl={ctl} />
        <ShadowQuickToggle ctl={ctl} />
        <IconBtn onClick={() => ctl.flipSel("x")} title="Miroir horizontal"><FlipHorizontal2 className="size-4" /></IconBtn>
        <IconBtn onClick={() => ctl.flipSel("y")} title="Miroir vertical"><FlipVertical2 className="size-4" /></IconBtn>
        <Divider />
        <IconBtn onClick={() => ctl.order("forward")} title="Avancer"><ArrowUp className="size-4" /></IconBtn>
        <IconBtn onClick={() => ctl.order("backward")} title="Reculer"><ArrowDown className="size-4" /></IconBtn>
        <IconBtn onClick={() => ctl.order("front")} title="Premier plan"><BringToFront className="size-4" /></IconBtn>
        <IconBtn onClick={() => ctl.order("back")} title="Arrière-plan"><SendToBack className="size-4" /></IconBtn>
        <Divider />
        <IconBtn onClick={ctl.duplicateSel} title="Dupliquer (⌘D)"><Copy className="size-4" /></IconBtn>
        <IconBtn onClick={() => ctl.patchSel({ locked: !ls[0].locked }, true)} title={ls[0].locked ? "Déverrouiller" : "Verrouiller"}>
          {ls[0].locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
        </IconBtn>
        <IconBtn onClick={ctl.removeSel} title="Supprimer (Suppr)" danger><Trash2 className="size-4" /></IconBtn>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-white/10" />;
}

/* ═══════════════ Rognage ═══════════════ */

const CROP_RATIOS: { label: string; r: number | null }[] = [
  { label: "Libre", r: null },
  { label: "1:1", r: 1 },
  { label: "4:5", r: 4 / 5 },
  { label: "3:4", r: 3 / 4 },
  { label: "2:3", r: 2 / 3 },
  { label: "4:3", r: 4 / 3 },
  { label: "3:2", r: 3 / 2 },
  { label: "16:9", r: 16 / 9 },
  { label: "9:16", r: 9 / 16 },
];

/** Barre active pendant le recadrage d'un calque. */
export function CropBar({ ctl }: { ctl: CropCtl }) {
  const l = ctl.layer;
  const cb = contentBox(l);
  // 100 % = le contenu remplit tout juste le cadre ; au-delà, il déborde.
  const fit = Math.max(l.w / cb.cw, l.h / cb.ch);
  const zoom = Math.round(100 / Math.max(0.01, fit));
  return (
    <div className="relative z-30 flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-b border-purple-400/30 bg-purple-500/[0.07] px-2 py-1 backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
      <span className="flex items-center gap-1.5 px-1 text-xs font-semibold text-white">
        <Crop className="size-3.5 text-purple-300" /> Rognage
      </span>
      <span className="hidden px-1 text-[11px] text-muted sm:inline">
        Tirez les bords du cadre ; glissez à l&apos;intérieur pour déplacer le contenu.
      </span>
      <Divider />
      <div className="flex flex-wrap items-center gap-1">
        {CROP_RATIOS.map((p) => (
          <button
            key={p.label}
            onClick={() => ctl.cropRatio(l.id, p.r)}
            className="h-8 shrink-0 rounded-lg border border-white/10 px-2 text-[11px] font-medium text-muted transition hover:bg-white/5 hover:text-white"
          >
            {p.label}
          </button>
        ))}
      </div>
      <Divider />
      <div className="flex h-8 w-40 shrink-0 items-center gap-2 rounded-lg border border-white/10 px-2">
        <span className="text-[10px] text-muted">Zoom</span>
        <input
          type="range" min={100} max={400} value={Math.min(400, Math.max(100, zoom))}
          onChange={(e) => ctl.cropZoom(l.id, Number(e.target.value), false)}
          onPointerUp={(e) => ctl.cropZoom(l.id, Number((e.target as HTMLInputElement).value), true)}
          className="w-full accent-purple-500"
        />
        <span className="w-9 text-right text-[10px] tabular-nums text-white/70">{zoom}%</span>
      </div>
      <MaskPicker value={l.mask ?? null} onChange={(m) => ctl.setMask(l.id, m)} />

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => ctl.resetCrop(l.id)}
          disabled={!hasCrop(l.crop)}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <RotateCcw className="size-3.5" /> Réinitialiser
        </button>
        <button
          onClick={ctl.endCrop}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3 text-xs font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110"
        >
          <Check className="size-3.5" /> Terminé
        </button>
      </div>
    </div>
  );
}

/** Barre active pendant le rognage de la toile. */
export function DocCropBar({ rect, doc, onChange, onApply, onCancel }: {
  rect: { x: number; y: number; w: number; h: number };
  doc: DesignDoc;
  onChange: (r: { x: number; y: number; w: number; h: number }) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const set = (p: Partial<typeof rect>) => onChange({ ...rect, ...p });
  return (
    <div className="relative z-30 flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-b border-purple-400/30 bg-purple-500/[0.07] px-2 py-1 backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
      <span className="flex items-center gap-1.5 px-1 text-xs font-semibold text-white">
        <Frame className="size-3.5 text-purple-300" /> Rogner la toile
      </span>
      <Divider />
      <div className="flex flex-wrap items-center gap-1.5">
        <NumField label="X" value={rect.x} onChange={(v) => set({ x: v })} />
        <NumField label="Y" value={rect.y} onChange={(v) => set({ y: v })} />
        <NumField label="L" value={rect.w} min={16} onChange={(v) => set({ w: v })} />
        <NumField label="H" value={rect.h} min={16} onChange={(v) => set({ h: v })} />
      </div>
      <Divider />
      <button
        onClick={() => onChange({ x: 0, y: 0, w: doc.width, h: doc.height })}
        className="h-8 shrink-0 rounded-lg border border-white/10 px-2.5 text-[11px] font-medium text-muted transition hover:bg-white/5 hover:text-white"
      >
        Toute la toile
      </button>
      <span className="hidden px-1 text-[11px] text-muted lg:inline">
        Ce qui sort du cadre est retiré du format ; les calques suivent.
      </span>

      <div className="ml-auto flex items-center gap-1">
        <button onClick={onCancel} className="h-8 rounded-lg border border-white/10 px-2.5 text-xs text-muted transition hover:bg-white/5 hover:text-white">
          Annuler
        </button>
        <button
          onClick={onApply}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3 text-xs font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110"
        >
          <Check className="size-3.5" /> Rogner
        </button>
      </div>
    </div>
  );
}

/** Choix de la forme de découpe (rognage à une forme). */
function MaskPicker({ value, onChange, compact }: { value: ShapeKind | null; onChange: (m: ShapeKind | null) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition hover:bg-white/5 hover:text-white ${value ? "border-purple-400/50 bg-purple-500/15 text-white" : "border-white/10 text-muted"}`}
        title="Rogner à une forme"
      >
        {value ? <ShapeGlyph kind={value} size={14} /> : <Frame className="size-3.5" />}
        {!compact && "Forme"}
        <ChevronDown className="size-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#15151d] p-2 shadow-2xl">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`mb-1 w-full rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-white/10 ${value ? "text-muted" : "bg-purple-500/20 text-white"}`}
          >
            Aucune — cadre rectangulaire
          </button>
          <div className="grid grid-cols-7 gap-1">
            {SHAPE_KINDS.map((s) => (
              <button
                key={s.id} title={s.label}
                onClick={() => { onChange(s.id); setOpen(false); }}
                className={`grid aspect-square place-items-center rounded-lg transition hover:bg-white/10 ${s.id === value ? "bg-purple-500/20" : ""}`}
              >
                <ShapeGlyph kind={s.id} size={20} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TextQuick({ l, ctl }: { l: TextLayer; ctl: EditorCtl }) {
  return (
    <>
      <select
        value={l.fontFamily}
        onChange={(e) => ctl.patchSel({ fontFamily: e.target.value }, true)}
        className="h-8 w-36 shrink-0 rounded-lg border border-white/10 bg-[#15151d] px-2 text-xs text-white outline-none"
        style={{ fontFamily: l.fontFamily }}
      >
        {FONTS.map((f) => <option key={f.label} value={f.css} style={{ fontFamily: f.css }}>{f.label}</option>)}
      </select>
      <div className="flex h-8 shrink-0 items-center rounded-lg border border-white/10">
        <button className="grid size-8 place-items-center text-muted hover:text-white" onClick={() => ctl.patchSel({ fontSize: Math.max(6, l.fontSize - 4) }, true)}>−</button>
        <input
          type="number" value={l.fontSize}
          onChange={(e) => ctl.patchSel({ fontSize: Math.max(4, Math.round(Number(e.target.value) || 12)) }, true)}
          className="w-11 bg-transparent text-center text-xs tabular-nums text-white outline-none"
        />
        <button className="grid size-8 place-items-center text-muted hover:text-white" onClick={() => ctl.patchSel({ fontSize: l.fontSize + 4 }, true)}>+</button>
      </div>
      <ColorChip compact label="Couleur du texte" value={l.color} onChange={(v) => ctl.patchSel({ color: v }, true)} anchor="left" />
      <Divider />
      <ToggleBtn active={l.fontWeight >= 700} onClick={() => ctl.patchSel({ fontWeight: l.fontWeight >= 700 ? 400 : 700 }, true)} title="Gras"><Bold className="size-4" /></ToggleBtn>
      <ToggleBtn active={l.italic} onClick={() => ctl.patchSel({ italic: !l.italic }, true)} title="Italique"><Italic className="size-4" /></ToggleBtn>
      <ToggleBtn active={l.underline} onClick={() => ctl.patchSel({ underline: !l.underline }, true)} title="Souligné"><Underline className="size-4" /></ToggleBtn>
      <ToggleBtn active={l.uppercase} onClick={() => ctl.patchSel({ uppercase: !l.uppercase }, true)} title="MAJUSCULES"><CaseUpper className="size-4" /></ToggleBtn>
      <Divider />
      {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, Ic]) => (
        <ToggleBtn key={a} active={l.align === a} onClick={() => ctl.patchSel({ align: a }, true)} title="Alignement"><Ic className="size-4" /></ToggleBtn>
      ))}
    </>
  );
}

function ShapeQuick({ l, ctl }: { l: ShapeLayer; ctl: EditorCtl }) {
  return (
    <>
      <ColorChip compact label="Remplissage" value={l.fill} gradient={l.gradient}
        onChange={(v) => ctl.patchSel({ fill: v, gradient: null }, true)}
        onGradient={(g) => ctl.patchSel({ gradient: g }, true)}
        allowTransparent anchor="left" />
      <ColorChip compact label="Contour" value={l.strokeWidth > 0 ? l.stroke : "transparent"}
        onChange={(v) => ctl.patchSel(v === "transparent" ? { strokeWidth: 0 } : { stroke: v, strokeWidth: l.strokeWidth || 4 }, true)}
        allowTransparent anchor="left" />
      <div className="flex h-8 w-28 shrink-0 items-center gap-2 rounded-lg border border-white/10 px-2">
        <span className="text-[10px] text-muted">Bord</span>
        <input type="range" min={0} max={60} value={l.strokeWidth} onChange={(e) => ctl.patchSel({ strokeWidth: Number(e.target.value) })} onPointerUp={(e) => ctl.patchSel({ strokeWidth: Number((e.target as HTMLInputElement).value) }, true)} className="w-full accent-purple-500" />
      </div>
      {l.shape === "rect" && (
        <div className="flex h-8 w-28 shrink-0 items-center gap-2 rounded-lg border border-white/10 px-2">
          <span className="text-[10px] text-muted">Arrondi</span>
          <input type="range" min={0} max={Math.round(Math.min(l.w, l.h) / 2)} value={l.radius} onChange={(e) => ctl.patchSel({ radius: Number(e.target.value) })} onPointerUp={(e) => ctl.patchSel({ radius: Number((e.target as HTMLInputElement).value) }, true)} className="w-full accent-purple-500" />
        </div>
      )}
      <ShapeSwap current={l.shape} onSwap={(k) => ctl.patchSel({ shape: k }, true)} />
    </>
  );
}

function ShapeSwap({ current, onSwap }: { current: ShapeKind; onSwap: (k: ShapeKind) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2 text-xs text-muted hover:bg-white/5 hover:text-white" title="Changer de forme">
        <ShapeGlyph kind={current} size={16} />
        <ChevronDown className="size-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 grid w-52 grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#15151d] p-2 shadow-2xl">
          {SHAPE_KINDS.map((s) => (
            <button key={s.id} title={s.label} onClick={() => { onSwap(s.id); setOpen(false); }}
              className={`grid aspect-square place-items-center rounded-lg transition hover:bg-white/10 ${s.id === current ? "bg-purple-500/20" : ""}`}>
              <ShapeGlyph kind={s.id} size={22} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShapeGlyph({ kind, size = 22, color = "#d4d4d8" }: { kind: ShapeKind; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path d={shapePath(kind, 32, 32, kind === "rect" ? 4 : 0)} fill={color} fillRule="evenodd" />
    </svg>
  );
}

function LineQuick({ l, ctl }: { l: LineLayer; ctl: EditorCtl }) {
  return (
    <>
      <ColorChip compact label="Couleur" value={l.stroke} onChange={(v) => ctl.patchSel({ stroke: v }, true)} anchor="left" />
      <div className="flex h-8 w-28 shrink-0 items-center gap-2 rounded-lg border border-white/10 px-2">
        <span className="text-[10px] text-muted">Épais.</span>
        <input type="range" min={1} max={60} value={l.strokeWidth} onChange={(e) => ctl.patchSel({ strokeWidth: Number(e.target.value) })} onPointerUp={(e) => ctl.patchSel({ strokeWidth: Number((e.target as HTMLInputElement).value) }, true)} className="w-full accent-purple-500" />
      </div>
      <select value={l.dash} onChange={(e) => ctl.patchSel({ dash: e.target.value as LineDash }, true)} className="h-8 shrink-0 rounded-lg border border-white/10 bg-[#15151d] px-2 text-xs text-white outline-none">
        <option value="solid">Continue</option>
        <option value="dashed">Tirets</option>
        <option value="dotted">Points</option>
      </select>
    </>
  );
}

function ImageQuick({ l, ctl }: { l: ImageLayer; ctl: EditorCtl }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <>
      <button onClick={ctl.replaceImageClick} disabled={ctl.uploading} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-muted hover:bg-white/5 hover:text-white disabled:opacity-40">
        {ctl.uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />} Remplacer
      </button>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((o) => !o)} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-muted hover:bg-white/5 hover:text-white">
          <Sparkles className="size-3.5" /> Filtres <ChevronDown className="size-3" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 grid w-64 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#15151d] p-2 shadow-2xl">
            {FILTER_PRESETS.map((p) => (
              <button key={p.label} onClick={() => ctl.patchSel({ filters: { ...p.f } }, true)}
                className="rounded-lg border border-white/10 px-2 py-1.5 text-left text-xs text-muted transition hover:bg-white/5 hover:text-white">
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex h-8 w-32 shrink-0 items-center gap-2 rounded-lg border border-white/10 px-2">
        <span className="text-[10px] text-muted">Arrondi</span>
        <input type="range" min={0} max={Math.round(Math.min(l.w, l.h) / 2)} value={l.radius} onChange={(e) => ctl.patchSel({ radius: Number(e.target.value) })} onPointerUp={(e) => ctl.patchSel({ radius: Number((e.target as HTMLInputElement).value) }, true)} className="w-full accent-purple-500" />
      </div>
    </>
  );
}

function OpacityQuick({ ctl }: { ctl: EditorCtl }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const val = Math.round((ctl.selLayers[0]?.opacity ?? 1) * 100);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <IconBtn onClick={() => setOpen((o) => !o)} title="Opacité"><Droplet className="size-4" /></IconBtn>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#15151d] p-3 shadow-2xl">
          <RangeField label="Opacité" value={val} min={0} max={100}
            onChange={(v) => ctl.patchSel({ opacity: v / 100 })}
            onCommit={(v) => ctl.patchSel({ opacity: v / 100 }, true)} />
        </div>
      )}
    </div>
  );
}

function ShadowQuickToggle({ ctl }: { ctl: EditorCtl }) {
  const s = ctl.selLayers[0]?.shadow;
  const on = s?.enabled === true;
  return (
    <ToggleBtn active={on} title="Ombre portée"
      onClick={() => ctl.patchSel({ shadow: { ...(s ?? DEFAULT_SHADOW), enabled: !on } }, true)}>
      <span className="text-[13px] font-bold" style={{ textShadow: on ? "2px 2px 3px rgba(0,0,0,0.8)" : "none" }}>S</span>
    </ToggleBtn>
  );
}

/* ═══════════════ Dock gauche ═══════════════ */

export type DockTab = "elements" | "photos" | "text" | "emoji" | "bg" | "templates" | "upload";

const DOCK_TABS: { id: DockTab; label: string; icon: typeof Shapes }[] = [
  { id: "elements", label: "Éléments", icon: Shapes },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "text", label: "Texte", icon: Type },
  { id: "emoji", label: "Emoji", icon: Smile },
  { id: "bg", label: "Fond", icon: PaintBucket },
  { id: "templates", label: "Modèles", icon: LayoutTemplate },
  { id: "upload", label: "Importer", icon: Upload },
];

export function LeftDock({ tab, setTab, ctl }: { tab: DockTab | null; setTab: (t: DockTab | null) => void; ctl: EditorCtl }) {
  return (
    // relative z-30 : les popovers du dock (fond personnalisé…) doivent peindre
    // au-dessus de l'espace de travail, frère suivant dans le DOM.
    <div className="relative z-30 flex shrink-0" onPointerDown={(e) => e.stopPropagation()}>
      {/* Rail d'onglets */}
      <div className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-white/[0.02] py-2">
        {DOCK_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(active ? null : t.id)}
              disabled={!ctl.canEdit}
              className={`flex w-[60px] flex-col items-center gap-1 rounded-xl py-2 transition disabled:opacity-40 ${active ? "bg-purple-500/15 text-purple-200" : "text-muted hover:bg-white/5 hover:text-white"}`}
            >
              <t.icon className="size-[18px]" />
              <span className="text-[9.5px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panneau du dock */}
      {tab && (
        <div className="w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-[#0d0d14]/80 backdrop-blur">
          <div className="flex items-center justify-between px-3 pt-3">
            <span className="text-xs font-semibold text-white/80">{DOCK_TABS.find((t) => t.id === tab)?.label}</span>
            <button onClick={() => setTab(null)} className="grid size-6 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white"><X className="size-3.5" /></button>
          </div>
          <div className="p-3">
            {tab === "elements" && <ElementsDock ctl={ctl} />}
            {tab === "photos" && <PhotosDock ctl={ctl} />}
            {tab === "text" && <TextDock ctl={ctl} />}
            {tab === "emoji" && <EmojiDock ctl={ctl} />}
            {tab === "bg" && <BgDock ctl={ctl} />}
            {tab === "templates" && <TemplatesDock ctl={ctl} />}
            {tab === "upload" && <UploadDock ctl={ctl} />}
          </div>
        </div>
      )}
    </div>
  );
}


/* ── Banque de photos (CC0) ──────────────────────────────────────────────────
   Photos réelles, servies en même origine depuis /stock. Non recolorables :
   elles s'insèrent en calque image (filtres, rognage, ombre et export inclus). */
function PhotosDock({ ctl }: { ctl: EditorCtl }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("nature");
  const [all, setAll] = useState<StockPhoto[] | null>(null);
  const q = normalizeSearch(query.trim());

  // Catalogue chargé à la demande (JSON statique), pas empaqueté dans le bundle.
  useEffect(() => { let ok = true; loadPhotos().then((r) => { if (ok) setAll(r); }); return () => { ok = false; }; }, []);

  const items = useMemo(() => {
    const src = all ?? [];
    return q ? src.filter((p) => p.kw.includes(q) || normalizeSearch(p.label).includes(q)).slice(0, 180) : src.filter((p) => p.cat === cat);
  }, [all, q, cat]);

  return (
    <div>
      <div className="relative mb-2.5">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (montagne, café, chien…)"
          className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-7 text-xs text-white outline-none placeholder:text-white/30 focus:border-purple-400/50"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted hover:text-white">
            <X className="size-3" />
          </button>
        )}
      </div>

      {!q && (
        <div className="no-scrollbar mb-2.5 flex gap-1 overflow-x-auto pb-0.5">
          {PHOTO_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition ${cat === c.id ? "bg-purple-500/25 text-purple-100" : "bg-white/5 text-muted hover:bg-white/10 hover:text-white"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {all === null ? (
        <p className="flex items-center justify-center gap-2 px-1 py-6 text-[11px] text-muted"><Loader2 className="size-3.5 animate-spin" /> Chargement des photos…</p>
      ) : items.length === 0 ? (
        <p className="px-1 py-4 text-center text-[11px] text-muted">Aucune photo pour « {query} ».</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((p) => (
            <button
              key={p.id}
              onClick={() => ctl.addPhoto(p)}
              disabled={!ctl.canEdit}
              title={p.label}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-white/5 transition hover:border-purple-400/50 disabled:opacity-40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoSrc(p)} alt={p.label} loading="lazy" draggable={false}
                className="size-full object-cover transition group-hover:scale-[1.04]" />
            </button>
          ))}
        </div>
      )}

      <p className="mt-2.5 px-0.5 text-[10px] leading-relaxed text-muted">
        {all ? `${all.length} photos` : "Photos"} libres de droits (CC0 — domaine public) :
        utilisables librement, y compris commercialement, sans attribution.
      </p>
    </div>
  );
}

const PAGE = 120; // vignettes rendues par page dans le panneau Éléments

function ElementsDock({ ctl }: { ctl: EditorCtl }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("shapes");
  const [shown, setShown] = useState(PAGE);
  const q = normalizeSearch(query.trim());

  // Le catalogue compte des milliers d'éléments : il est construit à la
  // PREMIÈRE ouverture du panneau (pas au chargement de l'éditeur), puis
  // conservé. On garde l'état null le temps de la construction pour ne pas
  // bloquer l'affichage du panneau.
  // Le catalogue compte des centaines de milliers d'éléments : on ne le
  // matérialise JAMAIS. On demande seulement la page affichée, et le compte
  // total est calculé (pas énuméré). `ready` déclenche la première demande hors
  // du rendu, pour ne pas bloquer l'ouverture du panneau.
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 0); return () => clearTimeout(t); }, []);

  const results = useMemo(() => {
    if (!q || !ready) return null;
    return { shapes: SHAPE_KINDS.filter((s) => normalizeSearch(s.label).includes(q)), els: searchElements(q, 180) };
  }, [q, ready]);

  const catTotal = useMemo(() => (q || !ready ? 0 : categoryCount(cat)), [q, cat, ready]);
  const catItems = useMemo(() => (q || !ready ? [] : categoryPage(cat, 0, shown)), [q, cat, shown, ready]);
  useEffect(() => { setShown(PAGE); }, [cat, q]);

  return (
    <div>
      {/* Recherche */}
      <div className="relative mb-2.5">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (flèche, blob, badge…)"
          className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-7 text-xs text-white outline-none placeholder:text-white/30 focus:border-purple-400/50"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted hover:text-white">
            <X className="size-3" />
          </button>
        )}
      </div>

      {results ? (
        <div className="space-y-3">
          {results.shapes.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Formes</p>
              <div className="grid grid-cols-4 gap-1.5">
                {results.shapes.map((s) => (
                  <button key={s.id} title={s.label} onClick={() => ctl.addShape(s.id)}
                    className="grid aspect-square place-items-center rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-purple-400/40 hover:bg-white/5">
                    <ShapeGlyph kind={s.id} size={24} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {results.els.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Éléments</p>
              <ElementGrid els={results.els} onPick={ctl.addElement} />
            </div>
          )}
          {results.shapes.length === 0 && results.els.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-muted">Aucun résultat pour « {query} ».</p>
          )}
        </div>
      ) : (
        <>
          {/* Catégories */}
          <div className="no-scrollbar -mx-1 mb-2.5 flex gap-1 overflow-x-auto px-1 pb-0.5">
            <CatChip label="Formes" active={cat === "shapes"} onClick={() => setCat("shapes")} />
            {ELEMENT_CATEGORIES.map((c) => (
              <CatChip key={c.id} label={c.label} active={cat === c.id} onClick={() => setCat(c.id)} />
            ))}
          </div>

          {cat === "shapes" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-1.5">
                {SHAPE_KINDS.map((s) => (
                  <button key={s.id} title={s.label} onClick={() => ctl.addShape(s.id)}
                    className="grid aspect-square place-items-center rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-purple-400/40 hover:bg-white/5">
                    <ShapeGlyph kind={s.id} size={24} />
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Lignes</p>
                <div className="space-y-1.5">
                  {([["solid", "Ligne continue"], ["dashed", "Ligne en tirets"], ["dotted", "Ligne pointillée"]] as const).map(([d, label]) => (
                    <button key={d} onClick={() => ctl.addLine(d)} title={label}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-purple-400/40 hover:bg-white/5">
                      <svg width="90" height="8" viewBox="0 0 90 8">
                        <line x1="2" y1="4" x2="88" y2="4" stroke="#d4d4d8" strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={d === "dashed" ? "12 8" : d === "dotted" ? "0.1 9" : undefined} />
                      </svg>
                      <span className="sr-only">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10.5px] leading-relaxed text-muted">Ces formes sont recolorables (remplissage, dégradé, contour) après insertion.</p>
            </div>
          ) : !ready ? (
            <p className="flex items-center justify-center gap-2 py-6 text-[11px] text-muted"><Loader2 className="size-3.5 animate-spin" /> Chargement des éléments…</p>
          ) : (
            <>
              <ElementGrid els={catItems} onPick={ctl.addElement} />
              {catTotal > catItems.length && (
                <button
                  onClick={() => setShown((n) => n + PAGE)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-medium text-white/80 transition hover:border-purple-400/40 hover:bg-white/10"
                >
                  Afficher plus ({catItems.length.toLocaleString("fr-FR")} sur {catTotal.toLocaleString("fr-FR")})
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function CatChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition ${active ? "border-purple-400/50 bg-purple-500/15 text-white" : "border-white/10 text-muted hover:bg-white/5 hover:text-white"}`}>
      {label}
    </button>
  );
}

function ElementGrid({ els, onPick }: { els: ElementDef[]; onPick: (el: ElementDef) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {els.map((el) => (
        <button key={el.id} title={`${el.label} — recolorable`} onClick={() => onPick(el)}
          className="group grid aspect-square place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#262a36] p-1.5 transition hover:border-purple-400/40 hover:bg-[#2d3140]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={elementThumbSrc(el)} alt={el.label} loading="lazy" draggable={false}
            className="max-h-full max-w-full transition group-hover:scale-105" />
        </button>
      ))}
    </div>
  );
}

function TextDock({ ctl }: { ctl: EditorCtl }) {
  return (
    <div className="space-y-2">
      {TEXT_PRESETS.map((p) => (
        <button key={p.id} onClick={() => ctl.addText(p)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-left text-white transition hover:border-purple-400/40 hover:bg-white/5">
          <span style={{ fontSize: p.id === "h1" ? 22 : p.id === "h2" ? 16 : 12.5, fontWeight: p.fontWeight, lineHeight: 1.2 }}>
            {p.sample}
          </span>
        </button>
      ))}
      <p className="pt-1 text-[11px] leading-relaxed text-muted">Astuce : double-cliquez sur un texte de la toile pour l'éditer directement.</p>
    </div>
  );
}

function EmojiDock({ ctl }: { ctl: EditorCtl }) {
  const [group, setGroup] = useState(0);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {EMOJI_GROUPS.map((g, i) => (
          <button key={g.label} onClick={() => setGroup(i)}
            className={`rounded-lg px-2 py-1 text-[10.5px] font-medium transition ${i === group ? "bg-purple-500/20 text-purple-200" : "text-muted hover:bg-white/5 hover:text-white"}`}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-0.5">
        {EMOJI_GROUPS[group].emojis.map((e) => (
          <button key={e} onClick={() => ctl.addEmoji(e)} className="grid aspect-square place-items-center rounded-lg text-[22px] transition hover:bg-white/10">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function BgDock({ ctl }: { ctl: EditorCtl }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Couleurs unies</p>
        <div className="grid grid-cols-6 gap-1.5">
          <button title="Transparent" onClick={() => ctl.commitDoc({ background: "transparent", backgroundGradient: null })}
            className="aspect-square rounded-lg ring-1 ring-white/20" style={{ background: "repeating-conic-gradient(#cbd5e1 0% 25%, #fff 0% 50%) 50% / 10px 10px" }} />
          {BG_SOLIDS.map((c) => (
            <button key={c} onClick={() => ctl.commitDoc({ background: c, backgroundGradient: null })}
              className="aspect-square rounded-lg ring-1 ring-black/30 transition hover:scale-105" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Dégradés</p>
        <div className="grid grid-cols-3 gap-1.5">
          {GRADIENT_PRESETS.map((p) => (
            <button key={p.label} title={p.label} onClick={() => ctl.commitDoc({ backgroundGradient: { ...p.g } })}
              className="h-12 rounded-lg ring-1 ring-black/30 transition hover:scale-105" style={{ background: backgroundCss("#fff", p.g) }} />
          ))}
        </div>
      </div>
      <div className="relative">
        <ColorChip label="Couleur personnalisée"
          value={ctl.doc.background === "transparent" ? "#ffffff" : ctl.doc.background}
          gradient={ctl.doc.backgroundGradient}
          onChange={(v) => ctl.commitDoc({ background: v, backgroundGradient: null })}
          onGradient={(g) => ctl.commitDoc({ backgroundGradient: g })}
          allowTransparent anchor="left" />
      </div>
    </div>
  );
}

function TemplatesDock({ ctl }: { ctl: EditorCtl }) {
  return (
    <div className="space-y-3">
      {TEMPLATES.map((t) => (
        <button key={t.id} onClick={() => ctl.applyTemplate(templateDoc(t))} className="group flex w-full flex-col text-left">
          <DocPreview doc={t.doc} className="ring-1 ring-white/10 transition group-hover:ring-purple-400/50" />
          <p className="mt-1 text-[11px] text-muted">{t.label} <span className="opacity-60">· {t.group}</span></p>
        </button>
      ))}
      <p className="text-[10.5px] leading-relaxed text-muted">Appliquer un modèle remplace le contenu actuel de la toile (annulable avec ⌘Z).</p>
    </div>
  );
}

function UploadDock({ ctl }: { ctl: EditorCtl }) {
  return (
    <div className="space-y-3">
      <button onClick={ctl.uploadClick} disabled={ctl.uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 disabled:opacity-60">
        {ctl.uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Importer une image
      </button>
      <div className="rounded-xl border border-dashed border-white/15 p-4 text-center text-[11px] leading-relaxed text-muted">
        Vous pouvez aussi <b className="text-white/80">glisser-déposer</b> une image sur la toile, ou la <b className="text-white/80">coller</b> (⌘V).
        <br /><br />PNG · JPG · WebP · GIF · SVG — max 12 Mo. Stockée en sécurité sur votre espace.
      </div>
    </div>
  );
}

/* ═══════════════ Panneau droit : Réglages + Calques ═══════════════ */

export function RightPanel({ ctl, tab, setTab }: { ctl: EditorCtl; tab: "props" | "layers"; setTab: (t: "props" | "layers") => void }) {
  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-white/10 bg-white/[0.02]" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex shrink-0 border-b border-white/10 text-sm">
        <button onClick={() => setTab("props")} className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 font-medium transition ${tab === "props" ? "border-b-2 border-purple-400 text-white" : "text-muted hover:text-white"}`}>
          <SlidersHorizontal className="size-3.5" /> Réglages
        </button>
        <button onClick={() => setTab("layers")} className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 font-medium transition ${tab === "layers" ? "border-b-2 border-purple-400 text-white" : "text-muted hover:text-white"}`}>
          <LayersIcon className="size-3.5" /> Calques
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "props" ? <PropsPanel ctl={ctl} /> : <LayersPanel ctl={ctl} />}
      </div>
    </div>
  );
}

function PropsPanel({ ctl }: { ctl: EditorCtl }) {
  const ls = ctl.selLayers;
  const one = ls.length === 1 ? ls[0] : null;
  const dis = !ctl.canEdit;

  if (!ls.length) {
    return (
      <div className="space-y-4 p-4">
        <Section title="Toile">
          <div className="grid grid-cols-2 gap-2">
            <NumField label="L" value={ctl.doc.width} min={16} onChange={(v) => ctl.commitDoc({ width: Math.min(8000, v) })} disabled={dis} />
            <NumField label="H" value={ctl.doc.height} min={16} onChange={(v) => ctl.commitDoc({ height: Math.min(8000, v) })} disabled={dis} />
          </div>
          <ColorChip label="Fond"
            value={ctl.doc.background === "transparent" ? "#ffffff" : ctl.doc.background}
            gradient={ctl.doc.backgroundGradient}
            onChange={(v) => ctl.commitDoc({ background: v, backgroundGradient: null })}
            onGradient={(g) => ctl.commitDoc({ backgroundGradient: g })}
            allowTransparent disabled={dis} />
          <button
            onClick={ctl.beginDocCrop} disabled={dis}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <Crop className="size-3.5" /> Rogner la toile
          </button>
        </Section>
        <p className="px-1 text-xs leading-relaxed text-muted">Sélectionnez un élément sur la toile pour afficher ses réglages détaillés — ou ajoutez-en un depuis le dock à gauche.</p>
      </div>
    );
  }

  if (!one) {
    return (
      <div className="space-y-4 p-4">
        <Section title={`Sélection (${ls.length})`}>
          <div className="flex flex-wrap gap-1">
            {([["l", AlignStartVertical], ["c", AlignCenterVertical], ["r", AlignEndVertical], ["t", AlignStartHorizontal], ["m", AlignCenterHorizontal], ["b", AlignEndHorizontal]] as const).map(([e, Ic]) => (
              <IconBtn key={e} onClick={() => ctl.align(e)} title="Aligner"><Ic className="size-4" /></IconBtn>
            ))}
            {ls.length > 2 && (
              <>
                <IconBtn onClick={() => ctl.distribute("h")} title="Répartir horizontalement"><Columns3 className="size-4" /></IconBtn>
                <IconBtn onClick={() => ctl.distribute("v")} title="Répartir verticalement"><Rows3 className="size-4" /></IconBtn>
              </>
            )}
          </div>
          <RangeField label="Opacité" value={Math.round(ls[0].opacity * 100)} min={0} max={100}
            onChange={(v) => ctl.patchSel({ opacity: v / 100 })} onCommit={(v) => ctl.patchSel({ opacity: v / 100 }, true)} disabled={dis} />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <Section title="Disposition">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X" value={Math.round(one.x)} onChange={(v) => ctl.patchSel({ x: v }, true)} disabled={dis} />
          <NumField label="Y" value={Math.round(one.y)} onChange={(v) => ctl.patchSel({ y: v }, true)} disabled={dis} />
          <NumField label="L" value={Math.round(one.w)} min={4} onChange={(v) => ctl.patchSel({ w: v }, true)} disabled={dis} />
          <NumField label="H" value={Math.round(one.h)} min={4} onChange={(v) => ctl.patchSel({ h: v }, true)} disabled={dis} />
          <NumField label="Rot°" value={Math.round(one.rotation)} onChange={(v) => ctl.patchSel({ rotation: v }, true)} disabled={dis} />
        </div>
        <div className="flex flex-wrap gap-1">
          {([["l", AlignStartVertical], ["c", AlignCenterVertical], ["r", AlignEndVertical], ["t", AlignStartHorizontal], ["m", AlignCenterHorizontal], ["b", AlignEndHorizontal]] as const).map(([e, Ic]) => (
            <IconBtn key={e} onClick={() => ctl.align(e)} title="Aligner sur la toile"><Ic className="size-4" /></IconBtn>
          ))}
          <IconBtn onClick={() => ctl.flipSel("x")} title="Miroir horizontal"><FlipHorizontal2 className="size-4" /></IconBtn>
          <IconBtn onClick={() => ctl.flipSel("y")} title="Miroir vertical"><FlipVertical2 className="size-4" /></IconBtn>
        </div>
      </Section>

      <CropProps l={one} ctl={ctl} dis={dis} />

      {one.type === "text" && <TextProps l={one} ctl={ctl} dis={dis} />}
      {one.type === "shape" && (
        <Section title="Apparence">
          <ColorChip label="Remplissage" value={one.fill} gradient={one.gradient}
            onChange={(v) => ctl.patchSel({ fill: v, gradient: null }, true)}
            onGradient={(g) => ctl.patchSel({ gradient: g }, true)}
            allowTransparent disabled={dis} />
          <ColorChip label="Contour" value={one.stroke} onChange={(v) => ctl.patchSel({ stroke: v }, true)} disabled={dis} />
          <RangeField label="Épaisseur du contour" value={one.strokeWidth} min={0} max={80}
            onChange={(v) => ctl.patchSel({ strokeWidth: v })} onCommit={(v) => ctl.patchSel({ strokeWidth: v }, true)} disabled={dis} />
          {one.shape === "rect" && (
            <RangeField label="Arrondi" value={one.radius} min={0} max={Math.round(Math.min(one.w, one.h) / 2)}
              onChange={(v) => ctl.patchSel({ radius: v })} onCommit={(v) => ctl.patchSel({ radius: v }, true)} disabled={dis} />
          )}
        </Section>
      )}
      {one.type === "line" && (
        <Section title="Apparence">
          <ColorChip label="Couleur" value={one.stroke} onChange={(v) => ctl.patchSel({ stroke: v }, true)} disabled={dis} />
          <RangeField label="Épaisseur" value={one.strokeWidth} min={1} max={80}
            onChange={(v) => ctl.patchSel({ strokeWidth: v })} onCommit={(v) => ctl.patchSel({ strokeWidth: v }, true)} disabled={dis} />
          <SelectField label="Style" value={one.dash} options={[{ value: "solid", label: "Continue" }, { value: "dashed", label: "Tirets" }, { value: "dotted", label: "Points" }]}
            onChange={(v) => ctl.patchSel({ dash: v }, true)} disabled={dis} />
        </Section>
      )}
      {one.type === "image" && <ImageProps l={one} ctl={ctl} dis={dis} />}
      {one.type === "element" && (
        <Section title={elementSlotLabels(one).length > 1 ? "Couleurs de l'élément" : "Couleur de l'élément"}>
          <ElementColorChips l={one} ctl={ctl} disabled={dis} />
          <p className="text-[10.5px] leading-relaxed text-muted">
            {elementSlotLabels(one).length > 1
              ? "Élément multicolore : chaque couleur se modifie séparément — teinte unie ou dégradé."
              : "Élément monochrome : une seule couleur, remplaçable par n'importe quelle teinte ou un dégradé."}
          </p>
        </Section>
      )}

      <ShadowProps l={one} ctl={ctl} dis={dis} />

      <Section title="Fusion">
        <RangeField label="Opacité" value={Math.round(one.opacity * 100)} min={0} max={100}
          onChange={(v) => ctl.patchSel({ opacity: v / 100 })} onCommit={(v) => ctl.patchSel({ opacity: v / 100 }, true)} disabled={dis} />
        <SelectField label="Mode de fusion" value={one.blend}
          options={BLEND_MODES.map((b) => ({ value: b.id, label: b.label }))}
          onChange={(v) => ctl.patchSel({ blend: v }, true)} disabled={dis} />
      </Section>
    </div>
  );
}

function CropProps({ l, ctl, dis }: { l: Layer; ctl: EditorCtl; dis: boolean }) {
  const cropped = hasCrop(l.crop);
  const cb = contentBox(l);
  return (
    <Section title="Rognage">
      <div className="flex gap-2">
        <button
          onClick={() => ctl.beginCrop(l.id)} disabled={dis || l.locked}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          <Crop className="size-3.5" /> Recadrer
        </button>
        <button
          onClick={() => ctl.resetCrop(l.id)} disabled={dis || !cropped}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-30"
          title="Rendre au cadre la taille du contenu"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">Forme de découpe</span>
        <MaskPicker value={l.mask ?? null} onChange={(m) => ctl.setMask(l.id, m)} compact />
      </div>
      <p className="text-[10.5px] leading-relaxed text-muted">
        {cropped
          ? `Cadre ${Math.round(l.w)} × ${Math.round(l.h)} sur un contenu de ${Math.round(cb.cw)} × ${Math.round(cb.ch)} — rien n'est perdu, la partie masquée revient à tout moment.`
          : "Le cadre découpe le contenu sans le déformer : le texte garde sa composition, l'image son cadrage. Raccourci : C."}
      </p>
    </Section>
  );
}

function TextProps({ l, ctl, dis }: { l: TextLayer; ctl: EditorCtl; dis: boolean }) {
  return (
    <Section title="Texte">
      <textarea
        value={l.text}
        onChange={(e) => ctl.patchSel({ text: e.target.value })}
        onBlur={(e) => ctl.patchSel({ text: e.target.value }, true)}
        disabled={dis} rows={2}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white outline-none focus:border-purple-400/50"
        placeholder="Votre texte…"
      />
      <SelectField label="Police" value={l.fontFamily} options={FONTS.map((f) => ({ value: f.css, label: f.label }))}
        onChange={(v) => ctl.patchSel({ fontFamily: v }, true)} disabled={dis} />
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Taille" value={l.fontSize} min={4} onChange={(v) => ctl.patchSel({ fontSize: v }, true)} disabled={dis} />
        <SelectField label="Graisse" value={String(l.fontWeight)}
          options={[["300", "Fin"], ["400", "Normal"], ["500", "Moyen"], ["600", "Semi-gras"], ["700", "Gras"], ["800", "Extra"], ["900", "Noir"]].map(([v, t]) => ({ value: v, label: t }))}
          onChange={(v) => ctl.patchSel({ fontWeight: Number(v) }, true)} disabled={dis} />
      </div>
      <ColorChip label="Couleur" value={l.color} onChange={(v) => ctl.patchSel({ color: v }, true)} disabled={dis} />
      <RangeField label="Interligne" value={Math.round(l.lineHeight * 100)} min={70} max={250}
        onChange={(v) => ctl.patchSel({ lineHeight: v / 100 })} onCommit={(v) => ctl.patchSel({ lineHeight: v / 100 }, true)} disabled={dis} />
      <RangeField label="Espacement des lettres" value={l.letterSpacing} min={-5} max={40}
        onChange={(v) => ctl.patchSel({ letterSpacing: v })} onCommit={(v) => ctl.patchSel({ letterSpacing: v }, true)} disabled={dis} />
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">Contour du texte</span>
          <ColorChip compact label="Couleur du contour" value={l.strokeColor} onChange={(v) => ctl.patchSel({ strokeColor: v }, true)} disabled={dis} />
        </div>
        <RangeField label="Épaisseur" value={l.strokeWidth} min={0} max={20}
          onChange={(v) => ctl.patchSel({ strokeWidth: v })} onCommit={(v) => ctl.patchSel({ strokeWidth: v }, true)} disabled={dis} />
      </div>
    </Section>
  );
}

function ImageProps({ l, ctl, dis }: { l: ImageLayer; ctl: EditorCtl; dis: boolean }) {
  const set = (k: keyof Filters, v: number, done: boolean) => {
    ctl.patchSel({ filters: { ...l.filters, [k]: v } }, done);
  };
  return (
    <>
      <Section title="Image">
        <button onClick={ctl.replaceImageClick} disabled={dis || ctl.uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-40">
          {ctl.uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />} Remplacer l'image
        </button>
        <RangeField label="Arrondi des coins" value={l.radius} min={0} max={Math.round(Math.min(l.w, l.h) / 2)}
          onChange={(v) => ctl.patchSel({ radius: v })} onCommit={(v) => ctl.patchSel({ radius: v }, true)} disabled={dis} />
      </Section>
      <Section title="Filtres" action={
        <div className="flex flex-wrap justify-end gap-1">
          {FILTER_PRESETS.slice(0, 4).map((p) => (
            <button key={p.label} onClick={() => ctl.patchSel({ filters: { ...p.f } }, true)} disabled={dis}
              className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-muted hover:text-white disabled:opacity-40">{p.label}</button>
          ))}
        </div>
      }>
        <RangeField label="Luminosité" value={l.filters.brightness} min={0} max={200} onChange={(v) => set("brightness", v, false)} onCommit={(v) => set("brightness", v, true)} disabled={dis} />
        <RangeField label="Contraste" value={l.filters.contrast} min={0} max={200} onChange={(v) => set("contrast", v, false)} onCommit={(v) => set("contrast", v, true)} disabled={dis} />
        <RangeField label="Saturation" value={l.filters.saturate} min={0} max={200} onChange={(v) => set("saturate", v, false)} onCommit={(v) => set("saturate", v, true)} disabled={dis} />
        <RangeField label="Flou" value={l.filters.blur} min={0} max={30} onChange={(v) => set("blur", v, false)} onCommit={(v) => set("blur", v, true)} disabled={dis} />
        <RangeField label="Niveaux de gris" value={l.filters.grayscale} min={0} max={100} onChange={(v) => set("grayscale", v, false)} onCommit={(v) => set("grayscale", v, true)} disabled={dis} />
        <RangeField label="Sépia" value={l.filters.sepia} min={0} max={100} onChange={(v) => set("sepia", v, false)} onCommit={(v) => set("sepia", v, true)} disabled={dis} />
        <RangeField label="Teinte°" value={l.filters.hueRotate} min={0} max={360} onChange={(v) => set("hueRotate", v, false)} onCommit={(v) => set("hueRotate", v, true)} disabled={dis} />
        <button onClick={() => ctl.patchSel({ filters: { ...NEUTRAL_FILTERS } }, true)} disabled={dis}
          className="w-full rounded-lg border border-white/10 py-1.5 text-xs text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-40">
          Réinitialiser les filtres
        </button>
      </Section>
    </>
  );
}

function ShadowProps({ l, ctl, dis }: { l: Layer; ctl: EditorCtl; dis: boolean }) {
  const s: Shadow = l.shadow ?? { ...DEFAULT_SHADOW };
  const set = (patch: Partial<Shadow>, done = true) => ctl.patchSel({ shadow: { ...s, ...patch } }, done);
  return (
    <Section title="Ombre portée" action={
      <button onClick={() => set({ enabled: !s.enabled })} disabled={dis}
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:opacity-40 ${s.enabled ? "bg-purple-500/20 text-purple-200" : "bg-white/5 text-muted hover:text-white"}`}>
        {s.enabled ? "Activée" : "Désactivée"}
      </button>
    }>
      {s.enabled && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={s.x} onChange={(v) => set({ x: v })} disabled={dis} />
            <NumField label="Y" value={s.y} onChange={(v) => set({ y: v })} disabled={dis} />
          </div>
          <RangeField label="Flou" value={s.blur} min={0} max={120} onChange={(v) => set({ blur: v }, false)} onCommit={(v) => set({ blur: v })} disabled={dis} />
          <RangeField label="Intensité" value={Math.round(s.opacity * 100)} min={0} max={100}
            onChange={(v) => set({ opacity: v / 100 }, false)} onCommit={(v) => set({ opacity: v / 100 })} disabled={dis} />
          <ColorChip label="Couleur" value={s.color} onChange={(v) => set({ color: v })} disabled={dis} />
        </>
      )}
    </Section>
  );
}

/* ═══════════════ Panneau Calques ═══════════════ */

function LayersPanel({ ctl }: { ctl: EditorCtl }) {
  const { doc, selIds, canEdit } = ctl;
  if (!doc.layers.length) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="text-muted">
          <Sparkles className="mx-auto mb-3 size-7 text-purple-300/70" />
          <p className="text-sm font-medium text-white/80">Toile vide</p>
          <p className="mt-1 text-xs leading-relaxed">Ajoutez du texte, des formes, des emojis ou une image depuis le dock à gauche.</p>
        </div>
      </div>
    );
  }
  const ordered = [...doc.layers].reverse(); // haut de liste = premier plan
  const label = (l: Layer) => (l.type === "text" ? (l.text.trim().slice(0, 24) || "Texte") : l.name);
  return (
    <div className="p-2">
      {ordered.map((l) => {
        const isTop = doc.layers[doc.layers.length - 1].id === l.id;
        const isBottom = doc.layers[0].id === l.id;
        const selected = selIds.includes(l.id);
        return (
          <div
            key={l.id}
            onPointerDown={(e) => ctl.select(l.id, e.shiftKey)}
            className={`group mb-1 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition ${selected ? "border-purple-400/50 bg-purple-500/10" : "border-transparent hover:bg-white/5"}`}
          >
            <button onClick={(e) => { e.stopPropagation(); ctl.patchLayer(l.id, { visible: !l.visible }, true); }} disabled={!canEdit}
              className="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-white disabled:opacity-40" title={l.visible ? "Masquer" : "Afficher"}>
              {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
            <span className="grid size-6 shrink-0 place-items-center rounded bg-white/5">
              {l.type === "shape" ? <ShapeGlyph kind={l.shape} size={13} />
                : l.type === "text" ? <Type className="size-3 text-muted" />
                : l.type === "image" ? <ImageIcon className="size-3 text-muted" />
                : l.type === "element" ? <Sparkles className="size-3 text-muted" />
                : <Minus className="size-3 text-muted" />}
            </span>
            <input
              defaultValue={label(l)}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => ctl.patchLayer(l.id, { name: e.target.value || l.name }, true)}
              disabled={!canEdit}
              className="min-w-0 flex-1 truncate bg-transparent text-xs text-white/85 outline-none focus:text-white"
            />
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
              <button onClick={(e) => { e.stopPropagation(); ctl.reorderLayer(l.id, 1); }} disabled={!canEdit || isTop} className="grid size-5 place-items-center rounded text-muted hover:text-white disabled:opacity-20" title="Avancer"><ChevronUp className="size-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); ctl.reorderLayer(l.id, -1); }} disabled={!canEdit || isBottom} className="grid size-5 place-items-center rounded text-muted hover:text-white disabled:opacity-20" title="Reculer"><ChevronDown className="size-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); ctl.patchLayer(l.id, { locked: !l.locked }, true); }} disabled={!canEdit} className="grid size-5 place-items-center rounded text-muted hover:text-white disabled:opacity-40" title={l.locked ? "Déverrouiller" : "Verrouiller"}>
                {l.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); ctl.duplicateLayer(l.id); }} disabled={!canEdit} className="grid size-5 place-items-center rounded text-muted hover:text-white disabled:opacity-40" title="Dupliquer"><Copy className="size-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); ctl.removeLayer(l.id); }} disabled={!canEdit} className="grid size-5 place-items-center rounded text-muted hover:text-red-400 disabled:opacity-40" title="Supprimer"><Trash2 className="size-3.5" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════ Menu contextuel ═══════════════ */

export type CtxMenuItem = { label: string; icon?: typeof Copy; onClick: () => void; danger?: boolean; divider?: boolean; kbd?: string };

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: CtxMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  // Reste dans la fenêtre.
  const style: React.CSSProperties = {
    left: Math.min(x, typeof window !== "undefined" ? window.innerWidth - 230 : x),
    top: Math.min(y, typeof window !== "undefined" ? window.innerHeight - items.length * 34 - 20 : y),
  };
  return (
    <div ref={ref} className="fixed z-[70] w-52 rounded-xl border border-white/10 bg-[#15151d]/98 p-1.5 shadow-2xl shadow-black/60 backdrop-blur" style={style} onPointerDown={(e) => e.stopPropagation()}>
      {items.map((it, i) => (
        <div key={i}>
          {it.divider && <div className="my-1 h-px bg-white/10" />}
          <button
            onClick={() => { it.onClick(); onClose(); }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-white/5 ${it.danger ? "text-red-300 hover:text-red-200" : "text-white/85 hover:text-white"}`}
          >
            {it.icon && <it.icon className="size-3.5 opacity-70" />}
            <span className="flex-1">{it.label}</span>
            {it.kbd && <span className="text-[10px] text-muted">{it.kbd}</span>}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ Modales ═══════════════ */

export function Modal({ title, icon: Icon, onClose, children, wide }: {
  title: string; icon: typeof Download; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-white/10 bg-[#101018] p-5 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
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

export function SizeModal({ doc, onClose, onApply }: { doc: DesignDoc; onClose: () => void; onApply: (w: number, h: number) => void }) {
  const [w, setW] = useState(doc.width);
  const [h, setH] = useState(doc.height);
  const groups = useMemo(() => {
    const g: Record<string, typeof SIZE_PRESETS> = {};
    for (const p of SIZE_PRESETS) (g[p.group] ??= []).push(p);
    return g;
  }, []);
  return (
    <Modal onClose={onClose} title="Format de la toile" icon={LayoutGrid}>
      <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
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
        <NumField label="Largeur" value={w} min={16} onChange={setW} />
        <NumField label="Hauteur" value={h} min={16} onChange={setH} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-muted hover:text-white">Annuler</button>
        <button onClick={() => onApply(clampN(Math.round(w), 16, 8000), clampN(Math.round(h), 16, 8000))}
          className="rounded-lg bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-4 py-1.5 text-sm font-semibold text-white">Appliquer</button>
      </div>
    </Modal>
  );
}

export function ExportModal({ doc, onClose, onExport, onCopy }: {
  doc: DesignDoc; onClose: () => void;
  onExport: (format: "png" | "jpeg", scale: number, transparent: boolean) => Promise<void>;
  onCopy: (scale: number, transparent: boolean) => Promise<boolean>;
}) {
  // Les navigateurs plafonnent la taille d'un canvas : au-delà, l'export
  // renverrait une image vide. On n'offre que les résolutions réellement
  // exportables (les grands formats — fonds d'écran 5K — sont concernés).
  const MAX_DIM = 12000;
  const MAX_AREA = 40_000_000; // marge prise pour Safari, plus strict que Chrome
  const allowed = (s: number) =>
    doc.width * s <= MAX_DIM && doc.height * s <= MAX_DIM && doc.width * s * doc.height * s <= MAX_AREA;

  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [scale, setScale] = useState(() => (allowed(2) ? 2 : 1));
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard && typeof ClipboardItem !== "undefined";

  return (
    <Modal onClose={onClose} title="Exporter" icon={Download}>
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Format</p>
          <div className="grid grid-cols-2 gap-2">
            {(["png", "jpeg"] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${format === f ? "border-purple-400/50 bg-purple-500/10 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}>
                {f === "png" ? "PNG (qualité)" : "JPG (léger)"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Résolution</p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((s) => {
              const ok = allowed(s);
              return (
                <button key={s} onClick={() => ok && setScale(s)} disabled={!ok}
                  title={ok ? undefined : "Trop grand pour être exporté par le navigateur"}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${scale === s ? "border-purple-400/50 bg-purple-500/10 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}>
                  {s}× <span className="block tabular-nums opacity-60">{doc.width * s}×{doc.height * s}</span>
                </button>
              );
            })}
          </div>
          {!allowed(3) && (
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
              Cette toile est déjà en très haute définition : les multiplicateurs grisés dépassent la taille d'image maximale du navigateur.
            </p>
          )}
        </div>
        {format === "png" && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="accent-purple-500" />
            Fond transparent (ignorer la couleur de fond)
          </label>
        )}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        {canCopy && (
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); try { const ok = await onCopy(scale, transparent && format === "png"); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1600); } } finally { setBusy(false); } }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-50">
            <ClipboardCopy className="size-4" /> {copied ? "Copié !" : "Copier"}
          </button>
        )}
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onExport(format, scale, transparent && format === "png"); onClose(); } finally { setBusy(false); } }}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Télécharger
        </button>
      </div>
    </Modal>
  );
}

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["⌘/Ctrl + Z", "Annuler"],
    ["⌘/Ctrl + ⇧ + Z", "Rétablir"],
    ["⌘/Ctrl + C / X / V", "Copier / Couper / Coller"],
    ["⌘/Ctrl + D", "Dupliquer"],
    ["⌘/Ctrl + A", "Tout sélectionner"],
    ["Suppr / ⌫", "Supprimer la sélection"],
    ["Flèches (+ ⇧)", "Déplacer de 1 px (10 px)"],
    ["⇧ + clic", "Sélection multiple"],
    ["Glisser sur la toile", "Sélection au lasso"],
    ["Double-clic sur un texte", "Éditer le texte"],
    ["C / double-clic", "Rogner l'élément sélectionné"],
    ["Entrée / Échap (rognage)", "Terminer le rognage"],
    ["Espace + glisser", "Déplacer la vue"],
    ["⌘/Ctrl + molette", "Zoomer vers le curseur"],
    ["[ / ]", "Reculer / Avancer le calque"],
    ["+ / − / 0 / 1", "Zoom avant / arrière / ajuster / 100 %"],
    ["⇧ pendant rotation", "Rotation par crans de 15°"],
    ["⇧ pendant redimension", "Conserver les proportions"],
    ["Échap", "Désélectionner"],
  ];
  return (
    <Modal onClose={onClose} title="Raccourcis clavier" icon={Keyboard}>
      <div className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs odd:bg-white/[0.03]">
            <span className="text-muted">{v}</span>
            <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-medium text-white/85">{k}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export { Plus, Minus };
