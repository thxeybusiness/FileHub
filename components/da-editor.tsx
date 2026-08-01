"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Home, ChevronRight, Check, Loader2, Palette, Plus, Trash2, Copy,
  Wand2, X, Lock, Sparkles, Shuffle, Undo2, Redo2, Share2, Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAutosave } from "./use-autosave";

/* ─────────────── Types ─────────────── */
type Crumb = { id: string; name: string };
type Swatch = string; // hex #rrggbb
type PaletteT = { id: string; name: string; colors: Swatch[] };
type DA = { brand: string; brief: string; palettes: PaletteT[] };

const ACCENT = "#ec4899";
const MIN = 2;
const MAX = 5;
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

/* ─────────────── Couleur : conversions & harmonies ─────────────── */
const clamp = (n: number, a = 0, b = 255) => Math.max(a, Math.min(b, n));
const to2 = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, "0");

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
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + to2(r) + to2(g) + to2(b);
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// ── HSV (pour le sélecteur : carré saturation/valeur + curseur de teinte) ──
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
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Couleurs rapides du sélecteur.
const PRESETS = ["#000000", "#ffffff", "#0f172a", "#64748b", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e"];

// Contraste : renvoie une couleur de texte lisible sur un fond donné.
function readableOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  // luminance perçue (sRGB)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0b0b12" : "#ffffff";
}

type Harmony = "mono" | "analogue" | "complementaire" | "triade";
const HARMONIES: { id: Harmony; label: string }[] = [
  { id: "analogue", label: "Analogue" },
  { id: "mono", label: "Monochrome" },
  { id: "complementaire", label: "Complémentaire" },
  { id: "triade", label: "Triade" },
];

// Génère `count` nuances (2..5) harmonieuses à partir d'une couleur de base.
function generate(base: string, harmony: Harmony, count: number): string[] {
  const [h, s, l] = rgbToHsl(...hexToRgb(base));
  const n = Math.max(MIN, Math.min(MAX, count));
  const out: string[] = [];
  if (harmony === "mono") {
    // même teinte, luminosités étalées
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      out.push(hslToHex(h, Math.max(12, s * 0.9), 88 - t * 68));
    }
  } else if (harmony === "analogue") {
    const spread = 30; // degrés
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1 || 1) - 0.5;
      out.push(hslToHex(h + t * spread * 2, s, clamp(l + t * 18, 24, 80)));
    }
  } else if (harmony === "complementaire") {
    // alterne base / complémentaire avec variations de luminosité
    for (let i = 0; i < n; i++) {
      const comp = i % 2 === 1;
      const t = Math.floor(i / 2) / Math.ceil(n / 2);
      out.push(hslToHex(h + (comp ? 180 : 0), s, clamp((comp ? 55 : 40) + t * 18, 20, 82)));
    }
  } else {
    // triade : 3 teintes à 120°, complétées par des variations claires
    const hues = [h, h + 120, h + 240];
    for (let i = 0; i < n; i++) {
      const hue = hues[i % 3];
      const light = 40 + Math.floor(i / 3) * 22;
      out.push(hslToHex(hue, s, clamp(light, 22, 82)));
    }
  }
  return out.slice(0, n);
}

// Ambiances prêtes à l'emploi : accélère la recherche de DA.
const MOODS: { name: string; colors: string[] }[] = [
  { name: "Moderne", colors: ["#0f172a", "#3b82f6", "#e2e8f0"] },
  { name: "Luxe", colors: ["#111111", "#c9a227", "#f5f5f0"] },
  { name: "Nature", colors: ["#1b3a2b", "#4c9a5b", "#a7d3a0", "#eef4e6"] },
  { name: "Tech", colors: ["#0b1020", "#6d28d9", "#22d3ee", "#e5e7eb"] },
  { name: "Chaleureux", colors: ["#3b1f12", "#e07a3f", "#f2c078", "#fff4e6"] },
  { name: "Pastel", colors: ["#ffd6e0", "#c1e7e3", "#ffeaa7", "#dcd6f7"] },
  { name: "Corporate", colors: ["#0a2540", "#2d6cdf", "#f4f6fb"] },
  { name: "Audacieux", colors: ["#0d0d0d", "#ff2d55", "#ffd400", "#00e5ff"] },
  { name: "Minéral", colors: ["#2b2b28", "#8d7b68", "#c8b6a6", "#f1ede9"] },
  { name: "Océan", colors: ["#012a4a", "#2a6f97", "#61a5c2", "#a9d6e5"] },
];

/* ─────────────── Parse ─────────────── */
function parse(content: string): DA {
  const base: DA = { brand: "", brief: "", palettes: [] };
  try {
    const raw = JSON.parse(content || "{}") as Partial<DA>;
    const palettes = Array.isArray(raw.palettes)
      ? raw.palettes
          .filter((p): p is PaletteT => !!p && Array.isArray(p.colors))
          .map((p) => ({
            id: typeof p.id === "string" ? p.id : uid(),
            name: typeof p.name === "string" ? p.name : "Palette",
            colors: p.colors.map(normHex).slice(0, MAX),
          }))
          .filter((p) => p.colors.length >= 1)
      : [];
    return {
      brand: typeof raw.brand === "string" ? raw.brand : "",
      brief: typeof raw.brief === "string" ? raw.brief : "",
      palettes,
    };
  } catch {
    return base;
  }
}

/* ─────────────── Sélecteur de couleur intégré (remplace le natif) ───────────────
   Ancré à la pastille cliquée, dimensions maîtrisées : plus de panneau macOS
   flottant en bas à gauche. */
function ColorPopover({
  value, anchor, onChange, onClose,
}: {
  value: string;
  anchor: { x: number; y: number };
  onChange: (hex: string) => void;
  onClose: () => void;
}) {
  const [h, s, v] = hexToHsv(value);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setSV = (cx: number, cy: number) => {
    const el = svRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    onChange(hsvToHex(h, clamp01((cx - r.left) / r.width) * 100, (1 - clamp01((cy - r.top) / r.height)) * 100));
  };
  const setHue = (cx: number) => {
    const el = hueRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    onChange(hsvToHex(clamp01((cx - r.left) / r.width) * 360, s, v));
  };
  // Démarre un glisser : met à jour immédiatement puis suit le pointeur.
  const drag = (move: (cx: number, cy: number) => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    move(e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const W = 240, H = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.max(8, Math.min(anchor.x, vw - W - 8));
  const top = Math.max(8, Math.min(anchor.y, vh - H - 8));

  return (
    <>
      <div className="fixed inset-0 z-[55]" onClick={onClose} />
      <div className="fixed z-[60] w-60 rounded-2xl border border-white/10 bg-[#12121a] p-3 shadow-2xl shadow-black/50" style={{ left, top }} onClick={(e) => e.stopPropagation()}>
        {/* Carré saturation / valeur */}
        <div
          ref={svRef}
          onPointerDown={drag((cx, cy) => setSV(cx, cy))}
          className="relative h-40 w-full cursor-crosshair rounded-xl ring-1 ring-white/10"
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h, 100, 100)})` }}
        >
          <span className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${s}%`, top: `${100 - v}%`, background: normHex(value) }} />
        </div>

        {/* Teinte */}
        <div
          ref={hueRef}
          onPointerDown={drag((cx) => setHue(cx))}
          className="relative mt-3 h-4 w-full cursor-pointer rounded-full ring-1 ring-white/10"
          style={{ background: "linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)" }}
        >
          <span className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${(h / 360) * 100}%` }} />
        </div>

        {/* Hex + aperçu */}
        <div className="mt-3 flex items-center gap-2">
          <span className="size-8 shrink-0 rounded-lg ring-1 ring-white/15" style={{ background: normHex(value) }} />
          <input
            value={normHex(value)}
            onChange={(e) => onChange(normHex(e.target.value))}
            className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 text-center text-xs font-medium uppercase tracking-wide outline-none focus:border-pink-400/40"
          />
        </div>

        {/* Presets */}
        <div className="mt-2.5 grid grid-cols-8 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => onChange(p)} title={p} className="size-5 rounded-md ring-1 ring-black/40 transition hover:scale-110" style={{ background: p }} />
          ))}
        </div>
      </div>
    </>
  );
}

/* ─────────────── Export / copie d'une palette ─────────────── */
const ROLE = ["Principale", "Secondaire", "Tertiaire", "Accent", "Claire"];
const slug = (s: string) => (s || "palette").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "palette";

type Fmt = { key: string; label: string; content: string };

const roleOf = (i: number) => ROLE[i] ?? `Couleur ${i + 1}`;
const rgbStr = (hex: string) => { const [r, g, b] = hexToRgb(hex); return `${r}, ${g}, ${b}`; };
const hslStr = (hex: string) => { const [h, s, l] = rgbToHsl(...hexToRgb(hex)); return `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%`; };
const colorSpec = (hex: string) => ({
  hex: hex.toUpperCase(),
  rgb: hexToRgb(hex),
  hsl: (() => { const [h, s, l] = rgbToHsl(...hexToRgb(hex)); return [Math.round(h), Math.round(s), Math.round(l)]; })(),
});
// Fiche détaillée d'une couleur (rôle + HEX + RGB + HSL).
const detailLines = (cols: string[]) =>
  cols.map((c, i) => `${roleOf(i)}\n  HEX  ${c.toUpperCase()}\n  RGB  ${rgbStr(c)}\n  HSL  ${hslStr(c)}`).join("\n\n");

function paletteFormats(brand: string, p: PaletteT): Fmt[] {
  const cols = p.colors;
  const base = slug(p.name);
  const title = `${brand.trim() ? brand.trim() + " — " : ""}${p.name}`;
  return [
    { key: "details", label: "Détails", content: `${title}\n\n${detailLines(cols)}` },
    { key: "hex", label: "Hex", content: cols.map((c) => c.toUpperCase()).join("\n") },
    { key: "css", label: "CSS", content: `:root {\n${cols.map((c, i) => `  --${base}-${i + 1}: ${c}; /* ${roleOf(i)} — rgb(${rgbStr(c)}) */`).join("\n")}\n}` },
    { key: "tw", label: "Tailwind", content: `// ${title}\ncolors: {\n${cols.map((c, i) => `  "${base}-${i + 1}": "${c}", // ${roleOf(i)}`).join("\n")}\n}` },
    { key: "json", label: "JSON", content: JSON.stringify({ name: p.name, brand: brand.trim() || undefined, colors: cols.map((c, i) => ({ role: roleOf(i), ...colorSpec(c) })) }, null, 2) },
    { key: "brief", label: "Brief", content: `Palette « ${p.name} »${brand.trim() ? ` — ${brand.trim()}` : ""}\n` + cols.map((c, i) => `• ${roleOf(i)} : ${c.toUpperCase()}  (rgb ${rgbStr(c)})`).join("\n") },
  ];
}

function projectFormats(name: string, doc: DA): Fmt[] {
  const project = doc.brand.trim() || name;
  const details =
    `Direction artistique — ${project}\n` +
    (doc.brief.trim() ? `Ambiance / secteur : ${doc.brief.trim()}\n` : "") +
    `\n` + doc.palettes.map((p) => `━━ ${p.name} ━━\n${detailLines(p.colors)}`).join("\n\n\n");
  const hex = doc.palettes.map((p) => `# ${p.name}\n${p.colors.map((c) => c.toUpperCase()).join("\n")}`).join("\n\n");
  const css = `:root {\n${doc.palettes.map((p) => `  /* ${p.name} */\n` + p.colors.map((c, i) => `  --${slug(p.name)}-${i + 1}: ${c}; /* ${roleOf(i)} */`).join("\n")).join("\n\n")}\n}`;
  const json = JSON.stringify({ project, brief: doc.brief || undefined, palettes: doc.palettes.map((p) => ({ name: p.name, colors: p.colors.map((c, i) => ({ role: roleOf(i), ...colorSpec(c) })) })) }, null, 2);
  const brief =
    `Direction artistique — ${project}\n` +
    (doc.brief.trim() ? `Ambiance / secteur : ${doc.brief.trim()}\n` : "") +
    `\n` + doc.palettes.map((p) => `Palette « ${p.name} »\n` + p.colors.map((c, i) => `  • ${roleOf(i)} : ${c.toUpperCase()}`).join("\n")).join("\n\n");
  return [
    { key: "details", label: "Détails", content: details },
    { key: "brief", label: "Brief", content: brief },
    { key: "hex", label: "Hex", content: hex },
    { key: "css", label: "CSS", content: css },
    { key: "json", label: "JSON", content: json },
  ];
}

// Planche de couleurs (image) à télécharger — PNG/SVG, pour un graphiste ou un site.
function buildSheet(title: string, rows: { name: string; colors: string[] }[]) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const PAD = 36, SW = 168, SH = 150, TITLE = 52, ROWLBL = 30, ROWGAP = 28;
  const maxCols = Math.max(1, ...rows.map((r) => r.colors.length));
  const w = PAD * 2 + maxCols * SW;
  const F = "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif";
  const M = "ui-monospace,SFMono-Regular,Menlo,monospace";
  const parts: string[] = [];
  parts.push(`<text x="${PAD}" y="${PAD + 30}" fill="#ffffff" font-family="${F}" font-size="25" font-weight="700">${esc(title)}</text>`);
  let y = PAD + TITLE;
  for (const r of rows) {
    parts.push(`<text x="${PAD}" y="${y + 20}" fill="#9aa0ad" font-family="${F}" font-size="15" font-weight="600">${esc(r.name)}</text>`);
    y += ROWLBL;
    r.colors.forEach((c, i) => {
      const x = PAD + i * SW, tc = readableOn(c);
      parts.push(`<rect x="${x}" y="${y}" width="${SW - 8}" height="${SH}" rx="12" fill="${c}"/>`);
      parts.push(`<text x="${x + (SW - 8) / 2}" y="${y + 26}" fill="${tc}" text-anchor="middle" font-family="${F}" font-size="12" opacity="0.85">${esc(roleOf(i))}</text>`);
      parts.push(`<text x="${x + (SW - 8) / 2}" y="${y + SH - 16}" fill="${tc}" text-anchor="middle" font-family="${M}" font-size="15" font-weight="600">${c.toUpperCase()}</text>`);
    });
    y += SH + ROWGAP;
  }
  const h = y - ROWGAP + PAD;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="22" fill="#0b0b12"/>${parts.join("")}</svg>`;
  return { svg, w, h };
}

function ExportModal({ title, subtitle, formats, sheet, filename, onClose }: { title: string; subtitle: string; formats: Fmt[]; sheet: { svg: string; w: number; h: number }; filename: string; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const cur = formats[tab] ?? formats[0];
  const copy = () => {
    navigator.clipboard?.writeText(cur.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };
  const dl = (href: string, name: string) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  const downloadSvg = () => { const u = URL.createObjectURL(new Blob([sheet.svg], { type: "image/svg+xml" })); dl(u, `${filename}.svg`); setTimeout(() => URL.revokeObjectURL(u), 1000); };
  const downloadPng = () => {
    const url = URL.createObjectURL(new Blob([sheet.svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const s = 2, cv = document.createElement("canvas"); cv.width = sheet.w * s; cv.height = sheet.h * s;
      const ctx = cv.getContext("2d"); if (!ctx) return;
      ctx.scale(s, s); ctx.drawImage(img, 0, 0);
      cv.toBlob((bl) => { if (!bl) return; const u = URL.createObjectURL(bl); dl(u, `${filename}.png`); setTimeout(() => { URL.revokeObjectURL(u); URL.revokeObjectURL(url); }, 1000); }, "image/png");
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };
  const preview = `data:image/svg+xml;utf8,${encodeURIComponent(sheet.svg)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Share2 className="size-4" style={{ color: ACCENT }} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            <p className="truncate text-[11px] text-muted">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {/* Aperçu de la planche + téléchargement image */}
          <div className="mb-4 rounded-xl border border-white/10 bg-black/30 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Aperçu de la palette" className="mx-auto max-h-44 w-auto rounded-lg" />
            <div className="mt-3 flex items-center justify-center gap-2">
              <button type="button" onClick={downloadPng} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"><Download className="size-3.5" /> PNG</button>
              <button type="button" onClick={downloadSvg} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"><Download className="size-3.5" /> SVG</button>
            </div>
          </div>

          {/* Formats texte */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {formats.map((f, i) => (
              <button key={f.key} type="button" onClick={() => setTab(i)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${tab === i ? "bg-white/10 text-white" : "text-muted hover:bg-white/5 hover:text-white"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <textarea readOnly value={cur.content}
            onFocus={(e) => e.currentTarget.select()}
            className="h-56 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs leading-relaxed text-white/90 outline-none" />
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <p className="flex-1 text-[11px] text-muted">Image, codes détaillés (HEX · RGB · HSL), CSS, JSON… à envoyer à un graphiste ou coller dans un site / une IA.</p>
          <button type="button" onClick={copy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15">
            {copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />} {copied ? "Copié !" : "Copier"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Composant principal ─────────────── */
export function DAEditor({
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
  const [doc, setDoc] = useState<DA>(() => parse(initialContent));
  const [genOpen, setGenOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [exportPalette, setExportPalette] = useState<PaletteT | null>(null);
  const [exportProject, setExportProject] = useState(false);

  const doSave = useCallback(
    (p: { content?: string; name?: string }, keepalive: boolean) => api.saveContent(id, p, keepalive),
    [id],
  );
  const { state: save, schedule } = useAutosave(doSave, {});

  const persist = useCallback((patch: { content?: string; name?: string }) => {
    if (!canEdit) return;
    schedule(patch);
  }, [canEdit, schedule]);

  const update = useCallback((fn: (d: DA) => DA) => {
    if (!canEdit) return;
    setDoc((prev) => { const next = fn(prev); persist({ content: JSON.stringify(next) }); return next; });
  }, [canEdit, persist]);

  const onName = (v: string) => { if (!canEdit) return; setName(v); persist({ name: v.trim() || "Direction artistique" }); };

  /* ── Mutations palettes ── */
  const addPalette = (p: PaletteT) => update((d) => ({ ...d, palettes: [...d.palettes, p] }));
  const newPalette = () => addPalette({ id: uid(), name: `Palette ${doc.palettes.length + 1}`, colors: ["#1e293b", "#38bdf8", "#f1f5f9"] });
  const addMood = (m: { name: string; colors: string[] }) => addPalette({ id: uid(), name: m.name, colors: m.colors.map(normHex).slice(0, MAX) });
  const delPalette = (pid: string) => update((d) => ({ ...d, palettes: d.palettes.filter((p) => p.id !== pid) }));
  const dupPalette = (pid: string) => update((d) => {
    const p = d.palettes.find((x) => x.id === pid);
    if (!p) return d;
    const i = d.palettes.findIndex((x) => x.id === pid);
    const copy = { id: uid(), name: `${p.name} (copie)`, colors: [...p.colors] };
    const next = [...d.palettes]; next.splice(i + 1, 0, copy); return { ...d, palettes: next };
  });
  const renamePalette = (pid: string, v: string) => update((d) => ({ ...d, palettes: d.palettes.map((p) => p.id === pid ? { ...p, name: v } : p) }));
  const setColor = (pid: string, idx: number, hex: string) =>
    update((d) => ({ ...d, palettes: d.palettes.map((p) => p.id === pid ? { ...p, colors: p.colors.map((c, i) => i === idx ? normHex(hex) : c) } : p) }));
  const addColor = (pid: string) =>
    update((d) => ({ ...d, palettes: d.palettes.map((p) => p.id === pid && p.colors.length < MAX ? { ...p, colors: [...p.colors, "#94a3b8"] } : p) }));
  const delColor = (pid: string, idx: number) =>
    update((d) => ({ ...d, palettes: d.palettes.map((p) => p.id === pid && p.colors.length > MIN ? { ...p, colors: p.colors.filter((_, i) => i !== idx) } : p) }));
  // Régénère une palette DIFFÉRENTE à chaque fois (nouvelle teinte + harmonie
  // au hasard) : de quoi explorer et comparer des directions.
  const shufflePalette = (pid: string) =>
    update((d) => ({ ...d, palettes: d.palettes.map((p) => {
      if (p.id !== pid) return p;
      const base = hsvToHex(Math.random() * 360, 55 + Math.random() * 30, 60 + Math.random() * 30);
      const harmony = HARMONIES[Math.floor(Math.random() * HARMONIES.length)].id;
      return { ...p, colors: generate(base, harmony, p.colors.length) };
    }) }));
  // Remplace toutes les couleurs d'une palette (utilisé par l'historique).
  const setColors = (pid: string, colors: string[]) =>
    update((d) => ({ ...d, palettes: d.palettes.map((p) => p.id === pid ? { ...p, colors } : p) }));

  const copyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex).then(() => { setCopied(hex); setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1200); }).catch(() => {});
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (
              <span key={c.id} className="flex items-center gap-1 min-w-0"><ChevronRight className="size-3 shrink-0" /><span className="truncate max-w-[140px]">{c.name}</span></span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Palette className="size-4 shrink-0" style={{ color: ACCENT }} />
            <input value={name} onChange={(e) => onName(e.target.value)} disabled={!canEdit}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30 disabled:opacity-100"
              placeholder="Direction artistique" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>)
            : save === "error" ? (<span className="text-red-400">Erreur</span>)
            : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
      </header>

      {/* Corps */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <fieldset disabled={!canEdit} className="mx-auto w-full max-w-4xl px-4 sm:px-8 py-8 space-y-7 disabled:opacity-100">
          {!canEdit && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted">
              <Lock className="size-3.5" /> Lecture seule.
            </div>
          )}

          {/* Marque / brief */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Projet / entreprise</span>
              <input value={doc.brand} onChange={(e) => update((d) => ({ ...d, brand: e.target.value }))} placeholder="Nom de la marque" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Ambiance / secteur</span>
              <input value={doc.brief} onChange={(e) => update((d) => ({ ...d, brief: e.target.value }))} placeholder="ex. tech, épuré, chaleureux…" className={inputCls} />
            </label>
          </div>

          {/* Barre d'actions : générer + ambiances */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setGenOpen(true)} disabled={!canEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50">
                <Wand2 className="size-4" /> Générer une palette
              </button>
              <button type="button" onClick={newPalette} disabled={!canEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-50">
                <Plus className="size-4" /> Palette vide
              </button>
              {doc.palettes.length > 0 && (
                <button type="button" onClick={() => setExportProject(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-white">
                  <Share2 className="size-4" /> Exporter le projet
                </button>
              )}
            </div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"><Sparkles className="size-3" /> Ambiances</p>
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <button key={m.name} type="button" onClick={() => addMood(m)} disabled={!canEdit}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1.5 pr-2.5 text-xs font-medium text-white/85 transition hover:border-white/25 hover:bg-white/[0.06] disabled:opacity-50">
                  <span className="flex -space-x-1">
                    {m.colors.slice(0, 4).map((c, i) => (
                      <span key={i} className="size-3.5 rounded-full ring-1 ring-black/40" style={{ background: c }} />
                    ))}
                  </span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Palettes */}
          {doc.palettes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center">
              <Palette className="mx-auto size-8 text-white/25" />
              <p className="mt-3 text-sm text-muted">Aucune palette. Choisissez une ambiance ou générez-en une.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {doc.palettes.map((p) => (
                <PaletteCard
                  key={p.id} palette={p} canEdit={canEdit} brand={doc.brand} copied={copied}
                  onRename={(v) => renamePalette(p.id, v)} onDelete={() => delPalette(p.id)} onDuplicate={() => dupPalette(p.id)}
                  onShuffle={() => shufflePalette(p.id)} onSetColor={(i, hex) => setColor(p.id, i, hex)}
                  onSetColors={(cols) => setColors(p.id, cols)}
                  onAddColor={() => addColor(p.id)} onDelColor={(i) => delColor(p.id, i)} onCopy={copyHex}
                  onExport={() => setExportPalette(p)}
                />
              ))}
            </div>
          )}
        </fieldset>
      </div>

      {genOpen && canEdit && (
        <GeneratorModal
          onClose={() => setGenOpen(false)}
          onCreate={(pal) => { addPalette(pal); setGenOpen(false); }}
        />
      )}

      {exportPalette && (
        <ExportModal
          title={`Exporter « ${exportPalette.name} »`}
          subtitle="Image, codes couleur (HEX · RGB · HSL), CSS…"
          formats={paletteFormats(doc.brand, exportPalette)}
          sheet={buildSheet(doc.brand.trim() || name, [{ name: exportPalette.name, colors: exportPalette.colors }])}
          filename={slug(exportPalette.name)}
          onClose={() => setExportPalette(null)}
        />
      )}
      {exportProject && (
        <ExportModal
          title="Exporter le projet"
          subtitle={`${doc.palettes.length} palette${doc.palettes.length > 1 ? "s" : ""} · ${doc.brand.trim() || name}`}
          formats={projectFormats(name, doc)}
          sheet={buildSheet(doc.brand.trim() || name, doc.palettes.map((p) => ({ name: p.name, colors: p.colors })))}
          filename={`${slug(doc.brand.trim() || name)}-palettes`}
          onClose={() => setExportProject(false)}
        />
      )}
    </div>
  );
}

/* ─────────────── Carte palette ─────────────── */
function PaletteCard({
  palette, canEdit, brand, copied,
  onRename, onDelete, onDuplicate, onShuffle, onSetColor, onSetColors, onAddColor, onDelColor, onCopy, onExport,
}: {
  palette: PaletteT; canEdit: boolean; brand: string; copied: string | null;
  onRename: (v: string) => void; onDelete: () => void; onDuplicate: () => void; onShuffle: () => void;
  onSetColor: (i: number, hex: string) => void; onSetColors: (colors: string[]) => void;
  onAddColor: () => void; onDelColor: (i: number) => void; onCopy: (hex: string) => void; onExport: () => void;
}) {
  const c = palette.colors;
  // Ordre local pendant le glisser (aperçu live) ; sinon l'ordre réel.
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragPos, setDragPos] = useState<number | null>(null);
  const displayColors = order ?? c;

  // Choix d'un rôle de couleur pour l'aperçu marque (suit l'ordre affiché).
  const bg = displayColors[0] ?? "#0f172a";
  const accent = displayColors[Math.min(1, displayColors.length - 1)] ?? "#3b82f6";
  const light = displayColors[displayColors.length - 1] ?? "#e2e8f0";

  // Sélecteur intégré : quelle nuance édite-t-on, et où l'ancrer.
  const [pick, setPick] = useState<{ i: number; x: number; y: number } | null>(null);
  const openPickerEl = (i: number, el: HTMLElement) => {
    if (!canEdit) return;
    const r = el.getBoundingClientRect();
    setPick({ i, x: r.left, y: r.bottom + 6 });
  };

  // Réordonnancement fluide au pointeur : réordonne en direct sous le curseur,
  // sans image fantôme (source de latence du drag HTML5) et sans écrire dans
  // le document tant qu'on n'a pas relâché (une seule sauvegarde à la fin).
  const workRef = useRef<{ cols: string[]; pos: number; moved: boolean; sx: number; sy: number; el: HTMLElement; i: number } | null>(null);

  const beginPointer = (i: number, e: React.PointerEvent) => {
    if (!canEdit || e.button !== 0) return;
    const st = { cols: [...c], pos: i, moved: false, sx: e.clientX, sy: e.clientY, el: e.currentTarget as HTMLElement, i };
    workRef.current = st;
    const move = (ev: PointerEvent) => {
      const s = workRef.current; if (!s) return;
      if (!s.moved) {
        if (Math.abs(ev.clientX - s.sx) < 5 && Math.abs(ev.clientY - s.sy) < 5) return;
        s.moved = true;
        setOrder(s.cols); setDragPos(s.pos);
        document.body.style.userSelect = "none";
      }
      const under = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const card = under?.closest("[data-swatch]") as HTMLElement | null;
      if (card) {
        const target = Number(card.getAttribute("data-swatch"));
        if (!Number.isNaN(target) && target !== s.pos) {
          const [m] = s.cols.splice(s.pos, 1);
          s.cols.splice(target, 0, m);
          s.pos = target;
          setOrder([...s.cols]); setDragPos(target);
        }
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.userSelect = "";
      const s = workRef.current; workRef.current = null;
      setOrder(null); setDragPos(null);
      if (!s) return;
      if (s.moved) { if (s.cols.join() !== c.join()) onSetColors(s.cols); }
      else openPickerEl(s.i, s.el); // simple clic → sélecteur
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Historique des régénérations : permet de revenir en arrière (et re-avancer)
  // pour comparer les palettes générées.
  const [hist, setHist] = useState<string[][]>([]);
  const [fut, setFut] = useState<string[][]>([]);
  const doShuffle = () => { setHist((h) => [...h, c]); setFut([]); onShuffle(); };
  const undo = () => {
    if (!hist.length) return;
    const prev = hist[hist.length - 1];
    setHist((h) => h.slice(0, -1));
    setFut((f) => [c, ...f]);
    onSetColors(prev);
  };
  const redo = () => {
    if (!fut.length) return;
    const next = fut[0];
    setFut((f) => f.slice(1));
    setHist((h) => [...h, c]);
    onSetColors(next);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Bandeau de couleurs */}
      <div className="flex h-24 w-full">
        {displayColors.map((col, i) => (
          <button key={i} type="button" onClick={() => onCopy(col)} className="group relative flex-1 transition-[flex] hover:flex-[1.4]" style={{ background: col }} title="Copier">
            <span className="absolute inset-x-0 bottom-1 text-center text-[10px] font-semibold uppercase tracking-wide opacity-0 transition group-hover:opacity-100" style={{ color: readableOn(col) }}>
              {copied === col ? "Copié !" : col}
            </span>
          </button>
        ))}
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <input value={palette.name} onChange={(e) => onRename(e.target.value)} disabled={!canEdit}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30 disabled:opacity-100" placeholder="Nom de la palette" />
          <button type="button" onClick={onExport} title="Exporter / copier cette palette" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"><Share2 className="size-3.5" /></button>
          {canEdit && (
            <>
              <span className="mx-0.5 h-4 w-px bg-white/10" />
              <button type="button" onClick={undo} disabled={!hist.length} title="Palette précédente" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"><Undo2 className="size-3.5" /></button>
              <button type="button" onClick={redo} disabled={!fut.length} title="Palette suivante" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"><Redo2 className="size-3.5" /></button>
              <span className="mx-0.5 h-4 w-px bg-white/10" />
              <button type="button" onClick={doShuffle} title="Régénérer une nouvelle palette" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"><Shuffle className="size-3.5" /></button>
              <button type="button" onClick={onDuplicate} title="Dupliquer" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"><Copy className="size-3.5" /></button>
              <button type="button" onClick={onDelete} title="Supprimer" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-red-500/10 hover:text-red-400"><Trash2 className="size-3.5" /></button>
            </>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          {/* Nuances éditables — toutes sur une seule ligne (colonnes flexibles).
              Glisser une pastille pour réordonner (rôles). */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${displayColors.length + (canEdit && c.length < MAX ? 1 : 0)}, minmax(0, 1fr))` }}>
            {displayColors.map((col, i) => (
              <div key={i} data-swatch={i}
                className={`group relative min-w-0 rounded-xl border bg-white/[0.02] p-2 transition ${
                  dragPos === i ? "border-pink-400/60 ring-2 ring-pink-400/50 scale-[1.04] shadow-lg shadow-black/40" : "border-white/10"
                }`}>
                {/* Glisser la pastille pour déplacer ; simple clic = sélecteur. */}
                <button type="button"
                  onPointerDown={(e) => beginPointer(i, e)} disabled={!canEdit}
                  aria-label="Modifier la couleur (glisser pour déplacer)"
                  style={{ background: col, touchAction: "none" }}
                  className="block h-12 w-full rounded-lg ring-1 ring-black/30 transition disabled:cursor-default enabled:cursor-grab enabled:active:cursor-grabbing enabled:hover:ring-2 enabled:hover:ring-white/40" />
                <input value={col} onChange={(e) => onSetColor(i, e.target.value)} disabled={!canEdit}
                  className="mt-1.5 w-full min-w-0 bg-transparent text-center text-[11px] font-medium uppercase tracking-wide text-white/80 outline-none" />
                {canEdit && c.length > MIN && (
                  <button type="button" onClick={() => onDelColor(i)} title="Retirer" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-white/15 bg-[#12121a] text-muted opacity-0 transition hover:text-red-400 group-hover:opacity-100">
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && c.length < MAX && (
              <button type="button" onClick={onAddColor} className="grid min-h-[92px] w-full place-items-center rounded-xl border border-dashed border-white/15 text-muted transition hover:border-white/30 hover:text-white" title="Ajouter une nuance">
                <Plus className="size-5" />
              </button>
            )}
          </div>

          {/* Aperçu marque */}
          <div className="rounded-xl p-4" style={{ background: bg }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accent }}>Aperçu</p>
            <p className="mt-1 text-lg font-bold leading-tight" style={{ color: readableOn(bg) }}>{brand.trim() || "Votre marque"}</p>
            <p className="mt-1 text-xs" style={{ color: readableOn(bg), opacity: 0.7 }}>Une identité qui vous ressemble.</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: accent, color: readableOn(accent) }}>Action</span>
              <span className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: light, color: readableOn(light) }}>Secondaire</span>
            </div>
          </div>
        </div>
      </div>

      {pick && c[pick.i] != null && (
        <ColorPopover
          value={c[pick.i]}
          anchor={{ x: pick.x, y: pick.y }}
          onChange={(hex) => onSetColor(pick.i, hex)}
          onClose={() => setPick(null)}
        />
      )}
    </section>
  );
}

/* ─────────────── Modale génération ─────────────── */
function GeneratorModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: PaletteT) => void }) {
  const [base, setBase] = useState("#3b82f6");
  const [harmony, setHarmony] = useState<Harmony>("analogue");
  const [count, setCount] = useState(3);
  const [basePick, setBasePick] = useState<{ x: number; y: number } | null>(null);
  const colors = useMemo(() => generate(base, harmony, count), [base, harmony, count]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Wand2 className="size-4" style={{ color: ACCENT }} />
          <h3 className="text-sm font-semibold">Générer une palette</h3>
          <button type="button" onClick={onClose} className="ml-auto grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="p-4">
          {/* aperçu */}
          <div className="mb-4 flex h-16 overflow-hidden rounded-xl ring-1 ring-white/10">
            {colors.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">Base</span>
            <button type="button" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setBasePick({ x: r.left, y: r.bottom + 6 }); }}
              aria-label="Choisir la couleur de base"
              className="size-8 shrink-0 rounded-lg ring-1 ring-white/15 transition hover:ring-2 hover:ring-white/40" style={{ background: base }} />
            <input value={base} onChange={(e) => setBase(normHex(e.target.value))} className="h-9 w-28 rounded-lg border border-white/10 bg-white/5 px-2 text-center text-xs uppercase outline-none focus:border-pink-400/40" />
          </div>

          <p className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Harmonie</p>
          <div className="grid grid-cols-2 gap-2">
            {HARMONIES.map((h) => (
              <button key={h.id} type="button" onClick={() => setHarmony(h.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${harmony === h.id ? "border-pink-400/50 bg-pink-500/10 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}>
                {h.label}
              </button>
            ))}
          </div>

          <p className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Nombre de nuances</p>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setCount(n)}
                className={`size-9 rounded-lg border text-sm font-semibold transition ${count === n ? "border-pink-400/50 bg-pink-500/10 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}>
                {n}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => onCreate({ id: uid(), name: `${HARMONIES.find((h) => h.id === harmony)?.label ?? "Palette"}`, colors })}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110"
            style={{ background: `linear-gradient(90deg, ${ACCENT}, #8b5cf6)` }}>
            <Plus className="size-4" /> Ajouter cette palette
          </button>
        </div>
      </div>

      {basePick && (
        <ColorPopover value={base} anchor={basePick} onChange={(hex) => setBase(hex)} onClose={() => setBasePick(null)} />
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-pink-400/50 placeholder:text-white/25";
