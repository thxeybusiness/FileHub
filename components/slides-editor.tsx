"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, ChevronRight, Home, Presentation, Plus, Trash2, Play, X, ChevronUp, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";
type Slide = { title: string; bullets: string[] };
type Deck = { slides: Slide[] };

function parse(content: string): Deck {
  try {
    const d = JSON.parse(content) as Deck;
    if (Array.isArray(d?.slides) && d.slides.length) return d;
  } catch { /* défaut */ }
  return { slides: [{ title: "Titre de la présentation", bullets: ["Premier point", "Deuxième point"] }] };
}

export function SlidesEditor({
  id, initialName, initialContent, backHref, crumbs,
}: {
  id: string; initialName: string; initialContent: string; backHref: string; crumbs: Crumb[];
}) {
  const [name, setName] = useState(initialName);
  const [deck, setDeck] = useState<Deck>(() => parse(initialContent));
  const [cur, setCur] = useState(0);
  const [save, setSave] = useState<SaveState>("saved");
  const [present, setPresent] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((patch: { content?: string; name?: string }) => {
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, patch).then(() => setSave("saved")).catch(() => setSave("error"));
    }, 500);
  }, [id]);

  const update = (mut: (d: Deck) => Deck) => {
    setDeck((prev) => { const next = mut(structuredClone(prev)); persist({ content: JSON.stringify(next) }); return next; });
  };
  const onName = (v: string) => { setName(v); persist({ name: v.trim() || "Présentation sans titre" }); };

  const slide = deck.slides[Math.min(cur, deck.slides.length - 1)] ?? deck.slides[0];

  const setTitle = (t: string) => update((d) => { d.slides[cur].title = t; return d; });
  const setBullets = (raw: string) => update((d) => { d.slides[cur].bullets = raw.split("\n").map((x) => x.replace(/^[-•\s]+/, "").trimEnd()).filter((x, i, a) => x || i < a.length - 1); return d; });
  const addSlide = () => update((d) => { d.slides.splice(cur + 1, 0, { title: "Nouvelle diapo", bullets: [""] }); return d; });
  const delSlide = () => update((d) => { if (d.slides.length > 1) d.slides.splice(cur, 1); return d; });
  const move = (dir: -1 | 1) => update((d) => { const j = cur + dir; if (j < 0 || j >= d.slides.length) return d; [d.slides[cur], d.slides[j]] = [d.slides[j], d.slides[cur]]; return d; });

  useEffect(() => { if (cur >= deck.slides.length) setCur(deck.slides.length - 1); }, [deck.slides.length, cur]);
  useEffect(() => { if (cur > deck.slides.length - 1) setCur(0); }, [cur, deck.slides.length]);
  useEffect(() => { const mv = () => setCur((c) => Math.max(0, Math.min(c, deck.slides.length - 1))); mv(); }, [deck.slides.length]);

  const applyAi = (data: unknown) => {
    const d = data as { slides?: Slide[] };
    if (!d?.slides?.length) return;
    update(() => ({ slides: d.slides!.map((s) => ({ title: s.title, bullets: s.bullets ?? [] })) }));
    setCur(0);
  };

  // Mode présentation (plein écran).
  useEffect(() => {
    if (present == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setPresent((p) => (p == null ? p : Math.min(p + 1, deck.slides.length - 1)));
      else if (e.key === "ArrowLeft") setPresent((p) => (p == null ? p : Math.max(p - 1, 0)));
      else if (e.key === "Escape") setPresent(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, deck.slides.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (<span key={c.id} className="flex items-center gap-1 min-w-0"><ChevronRight className="size-3 shrink-0" /><span className="truncate max-w-[140px]">{c.name}</span></span>))}
          </div>
          <div className="flex items-center gap-2">
            <Presentation className="size-4 shrink-0 text-rose-400" />
            <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30" placeholder="Présentation sans titre" />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>) : save === "error" ? (<span className="text-red-400">Erreur</span>) : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
        <button onClick={() => setPresent(cur)} className="flex h-9 items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/15" title="Présenter"><Play className="size-4" /> Présenter</button>
        <AiAssistant
          kind="slides" title="Assistant présentation" accent="#fb7185"
          onApplyData={applyAi}
          placeholder="Ex. « présentation de notre offre en 8 diapos »"
          quickActions={[{ action: "generate", label: "Générer la présentation" }]}
        />
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* Rail des diapos */}
        <div className="w-40 sm:w-52 shrink-0 overflow-y-auto border-r border-white/10 bg-white/[0.015] p-2 space-y-2">
          {deck.slides.map((s, i) => (
            <button key={i} onClick={() => setCur(i)} className={`w-full rounded-lg border p-2 text-left transition ${i === cur ? "border-brand-400 bg-brand-500/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted">{i + 1}</span>
                <span className="truncate text-xs font-medium">{s.title || "Sans titre"}</span>
              </div>
              <div className="mt-1 rounded bg-black/30 px-1.5 py-1 text-[9px] leading-tight text-white/50 line-clamp-2">{s.bullets.filter(Boolean).slice(0, 2).join(" · ")}</div>
            </button>
          ))}
          <button onClick={addSlide} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 py-2 text-xs text-muted hover:border-white/30 hover:text-white"><Plus className="size-3.5" /> Diapo</button>
        </div>

        {/* Édition de la diapo courante */}
        <div className="flex-1 min-h-0 overflow-auto p-5 sm:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-muted">Diapo {cur + 1} / {deck.slides.length}</span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => move(-1)} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5" title="Monter"><ChevronUp className="size-4" /></button>
                <button onClick={() => move(1)} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5" title="Descendre"><ChevronDown className="size-4" /></button>
                <button onClick={delSlide} disabled={deck.slides.length <= 1} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40" title="Supprimer"><Trash2 className="size-4" /></button>
              </div>
            </div>
            {/* Aperçu façon slide */}
            <div className="aspect-video w-full rounded-2xl border border-white/10 bg-gradient-to-br from-[#12131c] to-[#0b0c14] p-8 shadow-2xl shadow-black/40">
              <input value={slide.title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la diapo" className="w-full bg-transparent text-2xl sm:text-3xl font-bold outline-none placeholder:text-white/25" />
              <div className="mt-4 h-px w-16 bg-gradient-to-r from-brand-400 to-transparent" />
              <ul className="mt-4 space-y-2 text-lg text-ink/85">
                {slide.bullets.filter(Boolean).map((b, i) => (<li key={i} className="flex gap-2"><span className="text-brand-300">•</span>{b}</li>))}
              </ul>
            </div>
            <label className="mt-4 block text-xs font-medium text-muted">Contenu (une puce par ligne)</label>
            <textarea
              value={slide.bullets.join("\n")}
              onChange={(e) => setBullets(e.target.value)}
              rows={6}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400"
              placeholder={"Premier point\nDeuxième point"}
            />
          </div>
        </div>
      </div>

      {/* Plein écran */}
      {present != null && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#07070c]" onClick={() => setPresent((p) => (p == null ? p : Math.min(p + 1, deck.slides.length - 1)))}>
          <button onClick={(e) => { e.stopPropagation(); setPresent(null); }} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="size-5" /></button>
          <div className="flex flex-1 items-center justify-center p-8 sm:p-16">
            <div className="w-full max-w-5xl">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">{deck.slides[present]?.title}</h1>
              <div className="mt-6 h-1 w-24 rounded bg-gradient-to-r from-[#3b6dff] to-[#7b3bff]" />
              <ul className="mt-8 space-y-4 text-2xl sm:text-3xl text-white/85">
                {(deck.slides[present]?.bullets ?? []).filter(Boolean).map((b, i) => (<li key={i} className="flex gap-3"><span className="text-brand-300">•</span>{b}</li>))}
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 pb-6 text-sm text-white/50">
            <span>{present + 1} / {deck.slides.length}</span>
            <span className="hidden sm:inline">← → pour naviguer · Échap pour quitter</span>
          </div>
        </div>
      )}
    </div>
  );
}
