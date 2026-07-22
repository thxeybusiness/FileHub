"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, ChevronRight, Home, ClipboardList,
  Plus, X, Star, CalendarDays, Clock, CalendarPlus, Target, MessageSquareText,
  ListChecks, Lock, GripVertical, NotebookPen, ExternalLink, StickyNote, Unlink,
} from "lucide-react";
import { api } from "@/lib/api";
import { ExportButton } from "./export-button";
import { openPrintWindow, safeFilename } from "@/lib/export-doc";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

type Topic = { id: string; text: string };
type ActionItem = { id: string; text: string; done: boolean };
// Carnet du coaché : une note partagée du drive du coaché, où le coaché note
// lui-même ses séances (rattachée au compte-rendu par son id).
type Notebook = { id: string; name: string };
type Seance = {
  date: string;
  duration: string;
  nextDate: string;
  objective: string;
  mood: number | null;
  rating: number | null;
  topics: Topic[];
  observations: string;
  actions: ActionItem[];
  privateNotes: string;
  notebook: Notebook | null;
};

const ACCENT = "#0ea5e9";
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

// États du coaché (humeur / ressenti global) — du plus difficile au meilleur.
const MOODS: { v: number; label: string; color: string }[] = [
  { v: 1, label: "Difficile", color: "#ef4444" },
  { v: 2, label: "Mitigé", color: "#f97316" },
  { v: 3, label: "Neutre", color: "#eab308" },
  { v: 4, label: "Bien", color: "#22c55e" },
  { v: 5, label: "Excellent", color: "#06b6d4" },
];

function parse(content: string): Seance {
  const base: Seance = {
    date: "", duration: "", nextDate: "", objective: "",
    mood: null, rating: null, topics: [], observations: "",
    actions: [], privateNotes: "", notebook: null,
  };
  try {
    const raw = JSON.parse(content || "{}") as Partial<Seance>;
    const nb = raw.notebook;
    return {
      ...base,
      ...raw,
      topics: Array.isArray(raw.topics) ? raw.topics.filter((t) => t && typeof t.text === "string") : [],
      actions: Array.isArray(raw.actions) ? raw.actions.filter((a) => a && typeof a.text === "string") : [],
      mood: typeof raw.mood === "number" ? raw.mood : null,
      rating: typeof raw.rating === "number" ? raw.rating : null,
      notebook: nb && typeof nb.id === "string" && nb.id ? { id: nb.id, name: typeof nb.name === "string" ? nb.name : "Carnet du coaché" } : null,
    };
  } catch {
    return base;
  }
}

export function SeanceEditor({
  id, coachingId, initialName, initialContent, backHref, crumbs, canEdit = true,
}: {
  id: string;
  coachingId?: string;
  initialName: string;
  initialContent: string;
  backHref: string;
  crumbs: Crumb[];
  canEdit?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [doc, setDoc] = useState<Seance>(() => parse(initialContent));
  const [save, setSave] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nbBusy, setNbBusy] = useState(false);
  const [nbPicker, setNbPicker] = useState(false);

  const persist = useCallback((patch: { content?: string; name?: string }) => {
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, patch)
        .then(() => setSave("saved"))
        .catch(() => setSave("error"));
    }, 600);
  }, [id]);

  // Applique une modification du contenu structuré + déclenche la sauvegarde.
  const update = useCallback((fn: (d: Seance) => Seance) => {
    if (!canEdit) return;
    setDoc((prev) => {
      const next = fn(prev);
      persist({ content: JSON.stringify(next) });
      return next;
    });
  }, [canEdit, persist]);

  const onName = (v: string) => {
    if (!canEdit) return;
    setName(v);
    persist({ name: v.trim() || "Compte-rendu de séance" });
  };

  // ── Points abordés ──
  const addTopic = () => update((d) => ({ ...d, topics: [...d.topics, { id: uid(), text: "" }] }));
  const setTopic = (tid: string, text: string) =>
    update((d) => ({ ...d, topics: d.topics.map((t) => (t.id === tid ? { ...t, text } : t)) }));
  const delTopic = (tid: string) => update((d) => ({ ...d, topics: d.topics.filter((t) => t.id !== tid) }));

  // ── Actions prochaine séance ──
  const addAction = () => update((d) => ({ ...d, actions: [...d.actions, { id: uid(), text: "", done: false }] }));
  const setAction = (aid: string, text: string) =>
    update((d) => ({ ...d, actions: d.actions.map((a) => (a.id === aid ? { ...a, text } : a)) }));
  const toggleAction = (aid: string) =>
    update((d) => ({ ...d, actions: d.actions.map((a) => (a.id === aid ? { ...a, done: !a.done } : a)) }));
  const delAction = (aid: string) => update((d) => ({ ...d, actions: d.actions.filter((a) => a.id !== aid) }));

  // ── Carnet du coaché (note partagée du drive) ──
  const setNotebook = (nb: Notebook | null) => update((d) => ({ ...d, notebook: nb }));
  const createNotebook = () => {
    if (!coachingId || nbBusy) return;
    setNbBusy(true);
    const label = name.trim() ? `Carnet — ${name.trim()}` : "Carnet du coaché";
    api.createCoachingNote(coachingId, label)
      .then((r) => setNotebook({ id: r.note.id, name: r.note.name }))
      .catch(() => setSave("error"))
      .finally(() => setNbBusy(false));
  };

  const doneCount = doc.actions.filter((a) => a.done).length;

  const printHtml = useMemo(() => buildPrintHtml(name, doc), [name, doc]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête (identique aux autres éditeurs FileHub) */}
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
            <ClipboardList className="size-4 shrink-0" style={{ color: ACCENT }} />
            <input
              value={name}
              onChange={(e) => onName(e.target.value)}
              disabled={!canEdit}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30 disabled:opacity-100"
              placeholder="Compte-rendu de séance"
            />
          </div>
        </div>
        <ExportButton items={[{ label: "PDF (imprimable)", onClick: () => openPrintWindow(safeFilename(name) || "seance", printHtml) }]} />
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>)
            : save === "error" ? (<span className="text-red-400">Erreur</span>)
            : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
      </header>

      {/* Corps : formulaire structuré */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <fieldset disabled={!canEdit} className="mx-auto w-full max-w-3xl px-4 sm:px-8 py-8 space-y-7">
          {!canEdit && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted">
              <Lock className="size-3.5" /> Lecture seule — vous n'avez pas les droits d'édition sur ce coaché.
            </div>
          )}

          {/* Métadonnées : date, durée, prochaine séance */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field icon={CalendarDays} label="Date de la séance">
              <input type="date" value={doc.date} onChange={(e) => update((d) => ({ ...d, date: e.target.value }))} className={inputCls} />
            </Field>
            <Field icon={Clock} label="Durée">
              <input type="text" value={doc.duration} onChange={(e) => update((d) => ({ ...d, duration: e.target.value }))} placeholder="ex. 45 min" className={inputCls} />
            </Field>
            <Field icon={CalendarPlus} label="Prochaine séance">
              <input type="date" value={doc.nextDate} onChange={(e) => update((d) => ({ ...d, nextDate: e.target.value }))} className={inputCls} />
            </Field>
          </div>

          {/* Objectif */}
          <Block icon={Target} title="Objectif de la séance">
            <textarea
              value={doc.objective}
              onChange={(e) => update((d) => ({ ...d, objective: e.target.value }))}
              placeholder="Quel était le but de cette séance ?"
              rows={2}
              className={areaCls}
            />
          </Block>

          {/* Ressenti global + évaluation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">État du coaché</p>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => {
                  const on = doc.mood === m.v;
                  return (
                    <button
                      key={m.v}
                      type="button"
                      onClick={() => update((d) => ({ ...d, mood: on ? null : m.v }))}
                      className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition"
                      style={on ? { background: m.color + "22", color: m.color } : { color: "#94a3b8" }}
                      title={m.label}
                    >
                      <span className="grid size-6 place-items-center rounded-full text-xs" style={{ background: on ? m.color : "#ffffff10", color: on ? "#0b0b12" : "#94a3b8" }}>{m.v}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Évaluation de la séance</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update((d) => ({ ...d, rating: d.rating === n ? null : n }))}
                    className="rounded p-0.5 transition hover:scale-110"
                    title={`${n} / 5`}
                  >
                    <Star className="size-6" style={{ color: (doc.rating ?? 0) >= n ? "#f59e0b" : "#3a3a44" }} fill={(doc.rating ?? 0) >= n ? "#f59e0b" : "none"} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Points abordés */}
          <Block icon={ListChecks} title="Points abordés" action={canEdit ? { label: "Ajouter un point", fn: addTopic } : undefined}>
            {doc.topics.length === 0 && <Empty text="Aucun point pour l'instant." />}
            <div className="space-y-1.5">
              {doc.topics.map((t) => (
                <div key={t.id} className="group flex items-center gap-2">
                  <GripVertical className="size-3.5 shrink-0 text-white/15" />
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
                  <input
                    value={t.text}
                    onChange={(e) => setTopic(t.id, e.target.value)}
                    placeholder="Décrire un point abordé…"
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-white/25"
                  />
                  {canEdit && (
                    <button type="button" onClick={() => delTopic(t.id)} className="grid size-6 shrink-0 place-items-center rounded text-white/25 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Block>

          {/* Ressenti & observations */}
          <Block icon={MessageSquareText} title="Ressenti & observations">
            <textarea
              value={doc.observations}
              onChange={(e) => update((d) => ({ ...d, observations: e.target.value }))}
              placeholder="Ce que tu as observé, le ressenti du coaché, les points de blocage ou d'avancée…"
              rows={4}
              className={areaCls}
            />
          </Block>

          {/* Actions pour la prochaine séance */}
          <Block
            icon={Check}
            title="Actions pour la prochaine séance"
            badge={doc.actions.length ? `${doneCount}/${doc.actions.length}` : undefined}
            action={canEdit ? { label: "Ajouter une action", fn: addAction } : undefined}
          >
            {doc.actions.length === 0 && <Empty text="Aucune action définie." />}
            <div className="space-y-1.5">
              {doc.actions.map((a) => (
                <div key={a.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAction(a.id)}
                    className="grid size-5 shrink-0 place-items-center rounded-md border transition"
                    style={a.done ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#ffffff30" }}
                  >
                    {a.done && <Check className="size-3.5 text-black" />}
                  </button>
                  <input
                    value={a.text}
                    onChange={(e) => setAction(a.id, e.target.value)}
                    placeholder="Tâche à réaliser d'ici la prochaine séance…"
                    className={`min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-white/25 ${a.done ? "text-muted line-through" : ""}`}
                  />
                  {canEdit && (
                    <button type="button" onClick={() => delAction(a.id)} className="grid size-6 shrink-0 place-items-center rounded text-white/25 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Block>

          {/* Carnet du coaché : note partagée que le coaché remplit lui-même */}
          {coachingId && (
            <Block
              icon={NotebookPen}
              title="Carnet du coaché"
              hint="Une note partagée où le coaché note lui-même ses séances. Il la retrouve dans son drive et son portail."
            >
              {doc.notebook ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: ACCENT + "1f", color: ACCENT }}>
                    <StickyNote className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.notebook.name}</p>
                    <p className="text-xs text-muted">Note partagée du coaché</p>
                  </div>
                  <Link
                    href={`/drive/coaching/${coachingId}/n/${doc.notebook.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white"
                  >
                    <ExternalLink className="size-3.5" /> Ouvrir
                  </Link>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setNotebook(null)}
                      title="Détacher (la note reste dans le drive)"
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Unlink className="size-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
                  <p className="mb-3 text-sm text-white/40">Aucun carnet rattaché.</p>
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={createNotebook}
                        disabled={nbBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
                        style={{ background: ACCENT }}
                      >
                        {nbBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Créer le carnet
                      </button>
                      <button
                        type="button"
                        onClick={() => setNbPicker(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white"
                      >
                        <StickyNote className="size-3.5" /> Choisir une note existante
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Block>
          )}

          {/* Notes privées du coach */}
          <Block icon={Lock} title="Notes privées" hint="Réservé au coach — pratique pour tes remarques internes.">
            <textarea
              value={doc.privateNotes}
              onChange={(e) => update((d) => ({ ...d, privateNotes: e.target.value }))}
              placeholder="Notes confidentielles…"
              rows={3}
              className={areaCls}
            />
          </Block>
        </fieldset>
      </div>

      {nbPicker && coachingId && (
        <NotePicker
          coachingId={coachingId}
          currentId={doc.notebook?.id ?? null}
          onClose={() => setNbPicker(false)}
          onPick={(nb) => { setNotebook(nb); setNbPicker(false); }}
        />
      )}
    </div>
  );
}

// Sélecteur de note existante du drive du coaché (pour rattacher un carnet déjà
// créé plutôt que d'en créer un nouveau).
function NotePicker({
  coachingId, currentId, onClose, onPick,
}: {
  coachingId: string;
  currentId: string | null;
  onClose: () => void;
  onPick: (nb: Notebook) => void;
}) {
  const [notes, setNotes] = useState<Notebook[] | null>(null);

  useEffect(() => {
    let alive = true;
    api.getCoachingFiles(coachingId)
      .then((r) => { if (alive) setNotes(r.files.filter((f) => f.type === "note").map((f) => ({ id: f.id, name: f.name }))); })
      .catch(() => { if (alive) setNotes([]); });
    return () => { alive = false; };
  }, [coachingId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <StickyNote className="size-4" style={{ color: ACCENT }} />
          <h3 className="text-sm font-semibold">Choisir une note</h3>
          <button type="button" onClick={onClose} className="ml-auto grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {notes === null ? (
            <div className="flex justify-center py-8 text-muted"><Loader2 className="size-5 animate-spin" /></div>
          ) : notes.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">Aucune note dans le drive du coaché. Créez-en une avec « Créer le carnet ».</p>
          ) : (
            <div className="space-y-1">
              {notes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onPick(n)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/5"
                >
                  <StickyNote className="size-4 shrink-0 text-white/40" />
                  <span className="min-w-0 flex-1 truncate text-sm">{n.name}</span>
                  {n.id === currentId && <Check className="size-4 shrink-0 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 placeholder:text-white/25 [color-scheme:dark]";
const areaCls =
  "w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm leading-relaxed text-white outline-none transition focus:border-sky-400/50 placeholder:text-white/25";

function Field({ icon: Icon, label, children }: { icon: typeof CalendarDays; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted"><Icon className="size-3.5" /> {label}</span>
      {children}
    </label>
  );
}

function Block({
  icon: Icon, title, children, action, badge, hint,
}: {
  icon: typeof Target;
  title: string;
  children: React.ReactNode;
  action?: { label: string; fn: () => void };
  badge?: string;
  hint?: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4" style={{ color: ACCENT }} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {badge && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-muted">{badge}</span>}
        {action && (
          <button type="button" onClick={action.fn} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white">
            <Plus className="size-3.5" /> {action.label}
          </button>
        )}
      </div>
      {hint && <p className="mb-2 text-xs text-muted">{hint}</p>}
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-1 text-sm text-white/30">{text}</p>;
}

// Rendu imprimable / PDF du compte-rendu.
function buildPrintHtml(name: string, d: Seance): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const mood = MOODS.find((m) => m.v === d.mood);
  const stars = d.rating ? "★".repeat(d.rating) + "☆".repeat(5 - d.rating) : "—";
  const topics = d.topics.filter((t) => t.text.trim()).map((t) => `<li>${esc(t.text)}</li>`).join("");
  const actions = d.actions
    .filter((a) => a.text.trim())
    .map((a) => `<li>${a.done ? "☑" : "☐"} ${esc(a.text)}</li>`)
    .join("");
  const row = (label: string, val: string) =>
    val ? `<p><strong>${label} :</strong> ${esc(val)}</p>` : "";
  return `
    <h1>${esc(name || "Compte-rendu de séance")}</h1>
    ${row("Date", d.date)}
    ${row("Durée", d.duration)}
    ${row("Prochaine séance", d.nextDate)}
    ${d.objective.trim() ? `<h2>Objectif</h2><p>${esc(d.objective)}</p>` : ""}
    <p><strong>État du coaché :</strong> ${mood ? esc(mood.label) : "—"} &nbsp; | &nbsp; <strong>Évaluation :</strong> ${stars}</p>
    ${topics ? `<h2>Points abordés</h2><ul>${topics}</ul>` : ""}
    ${d.observations.trim() ? `<h2>Ressenti & observations</h2><p>${esc(d.observations).replace(/\n/g, "<br>")}</p>` : ""}
    ${actions ? `<h2>Actions pour la prochaine séance</h2><ul>${actions}</ul>` : ""}
    ${d.notebook ? `<p><strong>Carnet du coaché :</strong> ${esc(d.notebook.name)}</p>` : ""}
    ${d.privateNotes.trim() ? `<h2>Notes privées</h2><p>${esc(d.privateNotes).replace(/\n/g, "<br>")}</p>` : ""}
  `;
}
