"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Home, ChevronRight, Check, Loader2, Palette, Plus, Trash2, Copy,
  Wand2, X, Lock, Sparkles, Shuffle,
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
  const shufflePalette = (pid: string) =>
    update((d) => ({ ...d, palettes: d.palettes.map((p) => {
      if (p.id !== pid) return p;
      const base = p.colors[Math.floor(p.colors.length / 2)] ?? "#3b82f6";
      const harmony = HARMONIES[Math.floor((p.name.length + p.colors.length) % HARMONIES.length)].id;
      return { ...p, colors: generate(base, harmony, p.colors.length) };
    }) }));

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
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:brightness-110 disabled:opacity-50"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, #8b5cf6)` }}>
                <Wand2 className="size-4" /> Générer une palette
              </button>
              <button type="button" onClick={newPalette} disabled={!canEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-50">
                <Plus className="size-4" /> Palette vide
              </button>
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
                  onAddColor={() => addColor(p.id)} onDelColor={(i) => delColor(p.id, i)} onCopy={copyHex}
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
    </div>
  );
}

/* ─────────────── Carte palette ─────────────── */
function PaletteCard({
  palette, canEdit, brand, copied,
  onRename, onDelete, onDuplicate, onShuffle, onSetColor, onAddColor, onDelColor, onCopy,
}: {
  palette: PaletteT; canEdit: boolean; brand: string; copied: string | null;
  onRename: (v: string) => void; onDelete: () => void; onDuplicate: () => void; onShuffle: () => void;
  onSetColor: (i: number, hex: string) => void; onAddColor: () => void; onDelColor: (i: number) => void; onCopy: (hex: string) => void;
}) {
  const c = palette.colors;
  // Choix d'un rôle de couleur pour l'aperçu marque.
  const bg = c[0] ?? "#0f172a";
  const accent = c[Math.min(1, c.length - 1)] ?? "#3b82f6";
  const light = c[c.length - 1] ?? "#e2e8f0";

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Bandeau de couleurs */}
      <div className="flex h-24 w-full">
        {c.map((col, i) => (
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
          {canEdit && (
            <>
              <button type="button" onClick={onShuffle} title="Régénérer harmonieusement" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"><Shuffle className="size-3.5" /></button>
              <button type="button" onClick={onDuplicate} title="Dupliquer" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"><Copy className="size-3.5" /></button>
              <button type="button" onClick={onDelete} title="Supprimer" className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-red-500/10 hover:text-red-400"><Trash2 className="size-3.5" /></button>
            </>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          {/* Nuances éditables */}
          <div className="flex flex-wrap gap-2">
            {c.map((col, i) => (
              <div key={i} className="group relative w-[104px] rounded-xl border border-white/10 bg-white/[0.02] p-2">
                <label className="block cursor-pointer">
                  <span className="block h-12 w-full rounded-lg ring-1 ring-black/30" style={{ background: col }} />
                  <input type="color" value={col} onChange={(e) => onSetColor(i, e.target.value)} disabled={!canEdit} className="sr-only" />
                </label>
                <input value={col} onChange={(e) => onSetColor(i, e.target.value)} disabled={!canEdit}
                  className="mt-1.5 w-full bg-transparent text-center text-[11px] font-medium uppercase tracking-wide text-white/80 outline-none" />
                {canEdit && c.length > MIN && (
                  <button type="button" onClick={() => onDelColor(i)} title="Retirer" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-white/15 bg-[#12121a] text-muted opacity-0 transition hover:text-red-400 group-hover:opacity-100">
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && c.length < MAX && (
              <button type="button" onClick={onAddColor} className="grid h-[92px] w-[104px] place-items-center rounded-xl border border-dashed border-white/15 text-muted transition hover:border-white/30 hover:text-white" title="Ajouter une nuance">
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
    </section>
  );
}

/* ─────────────── Modale génération ─────────────── */
function GeneratorModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: PaletteT) => void }) {
  const [base, setBase] = useState("#3b82f6");
  const [harmony, setHarmony] = useState<Harmony>("analogue");
  const [count, setCount] = useState(3);
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
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Base</span>
              <span className="relative inline-grid size-8 place-items-center rounded-lg ring-1 ring-white/15" style={{ background: base }}>
                <input type="color" value={base} onChange={(e) => setBase(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
              </span>
            </label>
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
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-pink-400/50 placeholder:text-white/25";
