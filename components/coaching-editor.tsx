"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import {
  ArrowLeft, Home, ChevronRight, Check, Loader2, RefreshCw, HeartHandshake,
  Plus, Trash2, Target, CalendarClock, ListChecks, NotebookPen,
  Contact, Smile, Meh, Frown, History, MessageSquare, Eye, Pencil, Users, Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { RealtimeEngine, type Actions } from "./realtime";
import { CollabBar } from "./collab-bar";
import { VersionHistory } from "./version-history";
import { CommentsPanel } from "./comments-panel";
import { CoachingMembersDialog } from "./coaching-members-dialog";
import { ExportButton } from "./export-button";
import { downloadText, safeFilename } from "@/lib/export-doc";
import type { Peer } from "./use-collab";

/* ───────────────────────── Types ───────────────────────── */
type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

type Status = "prospect" | "active" | "paused" | "done";
type Mood = "" | "good" | "neutral" | "low";
type Objective = { id: string; title: string; progress: number; done: boolean };
type Session = { id: string; date: string; title: string; notes: string; mood: Mood; done: boolean };
type Action = { id: string; text: string; due: string; done: boolean };
type Coachee = { name: string; status: Status; startDate: string; contact: string; goal: string };
type Coaching = { coachee: Coachee; objectives: Objective[]; sessions: Session[]; actions: Action[]; notes: string };

/* ───────────────────────── Constants ───────────────────────── */
const ACCENT = "#06b6d4";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const STATUSES: { k: Status; l: string; color: string }[] = [
  { k: "prospect", l: "Prospect", color: "#a78bff" },
  { k: "active", l: "Actif", color: "#22c55e" },
  { k: "paused", l: "En pause", color: "#f59e0b" },
  { k: "done", l: "Terminé", color: "#64748b" },
];
const statusMeta = (k: Status) => STATUSES.find((s) => s.k === k) ?? STATUSES[1];

const MOODS: { k: Mood; l: string; icon: typeof Smile; color: string }[] = [
  { k: "good", l: "Positive", icon: Smile, color: "#22c55e" },
  { k: "neutral", l: "Neutre", icon: Meh, color: "#f59e0b" },
  { k: "low", l: "Difficile", icon: Frown, color: "#ef4444" },
];

/* ───────────────────────── Parse / normalize ───────────────────────── */
const asStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const asNum = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : 0);

function defaultCoaching(): Coaching {
  return {
    coachee: { name: "", status: "active", startDate: "", contact: "", goal: "" },
    objectives: [{ id: uid(), title: "Définir l'objectif principal", progress: 20, done: false }],
    sessions: [],
    actions: [{ id: uid(), text: "Planifier la première séance", due: "", done: false }],
    notes: "",
  };
}
function normObjective(o: unknown): Objective {
  const x = (o ?? {}) as Record<string, unknown>;
  return { id: asStr(x.id) || uid(), title: asStr(x.title), progress: Math.max(0, Math.min(100, asNum(x.progress))), done: !!x.done };
}
function normSession(s: unknown): Session {
  const x = (s ?? {}) as Record<string, unknown>;
  const mood = asStr(x.mood) as Mood;
  return {
    id: asStr(x.id) || uid(),
    date: asStr(x.date),
    title: asStr(x.title),
    notes: asStr(x.notes),
    mood: (["good", "neutral", "low"].includes(mood) ? mood : "") as Mood,
    done: !!x.done,
  };
}
function normAction(a: unknown): Action {
  const x = (a ?? {}) as Record<string, unknown>;
  return { id: asStr(x.id) || uid(), text: asStr(x.text), due: asStr(x.due), done: !!x.done };
}
function parse(content: string): Coaching {
  try {
    const p = JSON.parse(content) as Record<string, unknown>;
    if (p && typeof p === "object" && (p.coachee || p.objectives || p.sessions || p.actions)) {
      const c = (p.coachee ?? {}) as Record<string, unknown>;
      const status = asStr(c.status) as Status;
      // Rétrocompat : anciens suivis avec email/téléphone séparés → un seul « contact ».
      const contact = asStr(c.contact) || [asStr(c.email), asStr(c.phone)].filter(Boolean).join(" · ");
      return {
        coachee: {
          name: asStr(c.name),
          status: (["prospect", "active", "paused", "done"].includes(status) ? status : "active") as Status,
          startDate: asStr(c.startDate),
          contact,
          goal: asStr(c.goal),
        },
        objectives: Array.isArray(p.objectives) ? p.objectives.map(normObjective) : [],
        sessions: Array.isArray(p.sessions) ? p.sessions.map(normSession) : [],
        actions: Array.isArray(p.actions) ? p.actions.map(normAction) : [],
        notes: asStr(p.notes),
      };
    }
  } catch { /* défaut */ }
  return defaultCoaching();
}

/* ───────────────────────── Date helpers ───────────────────────── */
function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDue(s: string): { label: string; tone: string } | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (diff < 0) return { label, tone: "#ef4444" };
  if (diff === 0) return { label: "Aujourd'hui", tone: "#f97316" };
  if (diff === 1) return { label: "Demain", tone: "#eab308" };
  return { label, tone: "#94a3b8" };
}

/* ───────────────────────── Markdown export ───────────────────────── */
function toMarkdown(name: string, c: Coaching): string {
  const sm = statusMeta(c.coachee.status);
  const lines: string[] = [`# ${name || "Accompagnement"}`, ""];
  if (c.coachee.name) lines.push(`**Coaché :** ${c.coachee.name}`);
  lines.push(`**Statut :** ${sm.l}`);
  if (c.coachee.startDate) lines.push(`**Depuis le :** ${fmtDate(c.coachee.startDate)}`);
  if (c.coachee.contact) lines.push(`**Contact :** ${c.coachee.contact}`);
  if (c.coachee.goal) lines.push("", `**Objectif global :** ${c.coachee.goal}`);
  lines.push("", "## Objectifs", "");
  if (!c.objectives.length) lines.push("_Aucun objectif._");
  for (const o of c.objectives) lines.push(`- [${o.done ? "x" : " "}] ${o.title || "Objectif"} — ${o.progress}%`);
  lines.push("", "## Séances", "");
  if (!c.sessions.length) lines.push("_Aucune séance._");
  for (const s of [...c.sessions].sort((a, b) => (b.date || "").localeCompare(a.date || ""))) {
    lines.push(`### ${fmtDate(s.date) || "Séance"} — ${s.title || "Sans titre"}`);
    if (s.notes) lines.push(s.notes);
    lines.push("");
  }
  lines.push("## Actions à faire", "");
  if (!c.actions.length) lines.push("_Aucune action._");
  for (const a of c.actions) lines.push(`- [${a.done ? "x" : " "}] ${a.text || "Action"}${a.due ? ` (échéance : ${fmtDate(a.due)})` : ""}`);
  if (c.notes.trim()) lines.push("", "## Notes", "", c.notes);
  return lines.join("\n");
}

/* ───────────────────────── Main editor ───────────────────────── */
export function CoachingEditor({
  id, initialName, initialContent, backHref, crumbs, shared = false, canEdit = true,
}: {
  id: string; initialName: string; initialContent: string; backHref: string; crumbs: Crumb[]; shared?: boolean; canEdit?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [data, setData] = useState<Coaching>(() => parse(initialContent));
  const [save, setSave] = useState<SaveState>("saved");
  const [flash, setFlash] = useState(false);
  const [notePreview, setNotePreview] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const [peers, setPeers] = useState<Peer[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [comOpen, setComOpen] = useState(false);
  const actions = useRef<Actions>({ markEditing: () => {}, syncVersion: () => {} });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const serialize = useCallback((c: Coaching) => JSON.stringify(c), []);

  const persist = useCallback((next: Coaching, nextName?: string) => {
    if (!canEdit) return; // lecture seule : aucune écriture
    setSave("saving");
    dirty.current = true;
    actions.current.markEditing();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, { content: serialize(next), ...(nextName != null ? { name: nextName } : {}) })
        .then((r) => { setSave("saved"); dirty.current = false; if (r?.updatedAt) actions.current.syncVersion(r.updatedAt); })
        .catch(() => setSave("error"));
    }, 550);
  }, [id, serialize, canEdit]);

  const update = useCallback((fn: (c: Coaching) => Coaching) => {
    setData((prev) => { const next = fn(prev); persist(next); return next; });
  }, [persist]);

  const onName = (v: string) => { setName(v); persist(data, v.trim() || "Accompagnement sans titre"); };

  // Contenu distant (temps réel / heartbeat).
  const applyRemote = useCallback((str: string) => {
    if (dirty.current) return;
    try {
      setData(parse(str));
      setFlash(true); setTimeout(() => setFlash(false), 2200);
    } catch { /* ignore */ }
  }, []);
  const fetchRemote = useCallback(async () => {
    if (dirty.current) return;
    try { const { content } = await api.getContent(id); applyRemote(content); } catch { /* ignore */ }
  }, [id, applyRemote]);

  /* ── Mutations : coaché ── */
  const patchCoachee = (patch: Partial<Coachee>) => update((c) => ({ ...c, coachee: { ...c.coachee, ...patch } }));

  /* ── Mutations : objectifs ── */
  const addObjective = () => update((c) => ({ ...c, objectives: [...c.objectives, { id: uid(), title: "", progress: 0, done: false }] }));
  const patchObjective = (oid: string, patch: Partial<Objective>) =>
    update((c) => ({ ...c, objectives: c.objectives.map((o) => (o.id === oid ? { ...o, ...patch } : o)) }));
  const deleteObjective = (oid: string) => update((c) => ({ ...c, objectives: c.objectives.filter((o) => o.id !== oid) }));

  /* ── Mutations : séances ── */
  const addSession = () => {
    const today = new Date().toISOString().slice(0, 10);
    update((c) => ({ ...c, sessions: [{ id: uid(), date: today, title: "", notes: "", mood: "", done: false }, ...c.sessions] }));
  };
  const patchSession = (sid: string, patch: Partial<Session>) =>
    update((c) => ({ ...c, sessions: c.sessions.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }));
  const deleteSession = (sid: string) => update((c) => ({ ...c, sessions: c.sessions.filter((s) => s.id !== sid) }));

  /* ── Mutations : actions ── */
  const addAction = () => update((c) => ({ ...c, actions: [...c.actions, { id: uid(), text: "", due: "", done: false }] }));
  const patchAction = (aid: string, patch: Partial<Action>) =>
    update((c) => ({ ...c, actions: c.actions.map((a) => (a.id === aid ? { ...a, ...patch } : a)) }));
  const deleteAction = (aid: string) => update((c) => ({ ...c, actions: c.actions.filter((a) => a.id !== aid) }));

  /* ── Dérivés ── */
  const overall = useMemo(() => {
    if (!data.objectives.length) return 0;
    return Math.round(data.objectives.reduce((s, o) => s + (o.done ? 100 : o.progress), 0) / data.objectives.length);
  }, [data.objectives]);
  const openActions = data.actions.filter((a) => !a.done).length;
  const sortedSessions = useMemo(() => [...data.sessions].sort((a, b) => (b.date || "").localeCompare(a.date || "")), [data.sessions]);
  const notesHtml = useMemo(() => {
    try { return sanitizeRichHtml(marked.parse(data.notes || "*Aucune note.*", { async: false }) as string); } catch { return ""; }
  }, [data.notes]);

  const sm = statusMeta(data.coachee.status);

  /* ───────────────────────── Render ───────────────────────── */
  return (
    <div className="flex h-full min-h-0 flex-col">
      <RealtimeEngine id={id} shared={shared} mode="blob" content={serialize(data)} onRemote={applyRemote} fetchRemote={fetchRemote} setPeers={setPeers} actions={actions} />
      <VersionHistory id={id} open={histOpen} onClose={() => setHistOpen(false)} onRestore={applyRemote} />
      <CommentsPanel id={id} open={comOpen} onClose={() => setComOpen(false)} />
      {membersOpen && <CoachingMembersDialog id={id} onClose={() => setMembersOpen(false)} />}

      {/* Header */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (<span key={c.id} className="flex items-center gap-1 min-w-0"><ChevronRight className="size-3 shrink-0" /><span className="truncate max-w-[140px]">{c.name}</span></span>))}
          </div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="size-4 shrink-0" style={{ color: ACCENT }} />
            <input value={name} onChange={(e) => onName(e.target.value)} readOnly={!canEdit} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30" placeholder="Accompagnement sans titre" />
          </div>
        </div>
        {!canEdit && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-muted" title="Vous consultez ce suivi en lecture seule">
            <Lock className="size-3.5" /> Lecture seule
          </span>
        )}
        <ExportButton items={[
          { label: "Résumé (.md)", onClick: () => downloadText(safeFilename(name) + ".md", toMarkdown(name, data), "text/markdown") },
          { label: "Données (.json)", onClick: () => downloadText(safeFilename(name) + ".json", serialize(data), "application/json") },
        ]} />
        <button onClick={() => setMembersOpen(true)} title="Membres du suivi" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
          <Users className="size-5" />
        </button>
        <button onClick={() => setComOpen(true)} title="Commentaires" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
          <MessageSquare className="size-5" />
        </button>
        <button onClick={() => setHistOpen(true)} title="Historique des versions" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
          <History className="size-5" />
        </button>
        <CollabBar peers={peers} />
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
          {flash ? (<span className="flex items-center gap-1.5 text-cyan-300"><RefreshCw className="size-3.5" /> Mis à jour</span>) : save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> …</>) : save === "error" ? (<span className="text-red-400">Erreur</span>) : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
      </header>

      {/* Body — fieldset désactivé = lecture seule pour les membres « lecteur » */}
      <fieldset disabled={!canEdit} className="flex-1 min-h-0 overflow-auto border-0 p-0 m-0 min-w-0 disabled:opacity-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-6">

          {/* Carte coaché */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}>
                <HeartHandshake className="size-7" />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  value={data.coachee.name}
                  onChange={(e) => patchCoachee({ name: e.target.value })}
                  className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-white/25"
                  placeholder="Nom du coaché"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {STATUSES.map((s) => {
                    const on = s.k === data.coachee.status;
                    return (
                      <button key={s.k} onClick={() => patchCoachee({ status: s.k })}
                        className="rounded-full px-2.5 py-1 text-xs font-medium transition"
                        style={on ? { background: s.color + "26", color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}66` } : { background: "rgba(255,255,255,0.04)", color: "#94a3b8" }}>
                        {s.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Coordonnées + date */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Labeled icon={CalendarClock} label="Depuis le">
                <input type="date" value={data.coachee.startDate} onChange={(e) => patchCoachee({ startDate: e.target.value })} className="w-full bg-transparent text-sm outline-none [color-scheme:dark]" />
              </Labeled>
              <div className="sm:col-span-2">
                <Labeled icon={Contact} label="Contact">
                  <input value={data.coachee.contact} onChange={(e) => patchCoachee({ contact: e.target.value })} placeholder="Email, téléphone…" className="w-full bg-transparent text-sm outline-none placeholder:text-white/20" />
                </Labeled>
              </div>
            </div>

            {/* Objectif global */}
            <div className="mt-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"><Target className="size-3.5" /> Objectif global</p>
              <textarea
                value={data.coachee.goal}
                onChange={(e) => patchCoachee({ goal: e.target.value })}
                rows={2}
                placeholder="Que cherche à accomplir cette personne ?"
                className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm outline-none placeholder:text-white/20 focus:border-white/20"
              />
            </div>

            {/* Résumé chiffré */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Progression" value={`${overall}%`} tone={ACCENT}>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full" style={{ width: `${overall}%`, background: overall >= 100 ? "#22c55e" : ACCENT }} />
                </div>
              </Stat>
              <Stat label="Séances" value={String(data.sessions.length)} tone="#a78bff" />
              <Stat label="Actions à faire" value={String(openActions)} tone={openActions ? "#f59e0b" : "#22c55e"} />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: sm.color }}>
              <span className="size-1.5 rounded-full" style={{ background: sm.color }} />
              {sm.l}{data.coachee.startDate ? ` · depuis le ${fmtDate(data.coachee.startDate)}` : ""}
            </div>
          </section>

          {/* Objectifs */}
          <Section icon={Target} title="Objectifs" count={data.objectives.length} onAdd={addObjective} addLabel="Objectif">
            {data.objectives.length === 0 ? (
              <Empty>Aucun objectif. Ajoutez ce que vous visez ensemble.</Empty>
            ) : (
              <div className="space-y-2">
                {data.objectives.map((o) => (
                  <div key={o.id} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                    <button onClick={() => patchObjective(o.id, { done: !o.done, progress: o.done ? o.progress : 100 })}
                      className={`grid size-5 shrink-0 place-items-center rounded-md ${o.done ? "" : "border border-white/25"}`}
                      style={o.done ? { background: "#22c55e" } : {}} title={o.done ? "Marquer comme non atteint" : "Marquer comme atteint"}>
                      {o.done && <Check className="size-3.5 text-white" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <input value={o.title} onChange={(e) => patchObjective(o.id, { title: e.target.value })}
                        placeholder="Objectif…"
                        className={`w-full bg-transparent text-sm outline-none placeholder:text-white/20 ${o.done ? "text-muted line-through" : ""}`} />
                      <div className="mt-1.5 flex items-center gap-2">
                        <input type="range" min={0} max={100} step={5} value={o.done ? 100 : o.progress}
                          onChange={(e) => patchObjective(o.id, { progress: Number(e.target.value), done: Number(e.target.value) >= 100 })}
                          className="h-1 flex-1 accent-[var(--a)]" style={{ ["--a" as string]: ACCENT }} />
                        <span className="w-9 text-right text-[11px] tabular-nums text-muted">{o.done ? 100 : o.progress}%</span>
                      </div>
                    </div>
                    <button onClick={() => deleteObjective(o.id)} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-white/5 hover:text-red-400 group-hover:opacity-100" title="Supprimer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Séances */}
          <Section icon={CalendarClock} title="Séances" count={data.sessions.length} onAdd={addSession} addLabel="Séance">
            {sortedSessions.length === 0 ? (
              <Empty>Aucune séance enregistrée. Ajoutez votre première séance.</Empty>
            ) : (
              <div className="space-y-3">
                {sortedSessions.map((s) => (
                  <div key={s.id} className="group rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="date" value={s.date} onChange={(e) => patchSession(s.id, { date: e.target.value })}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs outline-none [color-scheme:dark]" />
                      <input value={s.title} onChange={(e) => patchSession(s.id, { title: e.target.value })}
                        placeholder="Thème de la séance…" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/25" />
                      <div className="flex items-center gap-0.5">
                        {MOODS.map((m) => {
                          const on = s.mood === m.k;
                          return (
                            <button key={m.k} onClick={() => patchSession(s.id, { mood: on ? "" : m.k })} title={m.l}
                              className="grid size-7 place-items-center rounded-lg transition hover:bg-white/5"
                              style={{ color: on ? m.color : "#4b5563" }}>
                              <m.icon className="size-4" />
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={() => deleteSession(s.id)} className="grid size-7 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-white/5 hover:text-red-400 group-hover:opacity-100" title="Supprimer la séance">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <textarea value={s.notes} onChange={(e) => patchSession(s.id, { notes: e.target.value })}
                      rows={3} placeholder="Notes de séance : ce qui a été abordé, décisions, ressenti…"
                      className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm outline-none placeholder:text-white/20 focus:border-white/20" />
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Actions à faire */}
          <Section icon={ListChecks} title="Actions à faire" count={openActions} onAdd={addAction} addLabel="Action">
            {data.actions.length === 0 ? (
              <Empty>Aucune action. Notez les engagements pris entre deux séances.</Empty>
            ) : (
              <div className="space-y-1.5">
                {data.actions.map((a) => {
                  const due = fmtDue(a.due);
                  return (
                    <div key={a.id} className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                      <button onClick={() => patchAction(a.id, { done: !a.done })}
                        className={`grid size-5 shrink-0 place-items-center rounded-md ${a.done ? "" : "border border-white/25"}`}
                        style={a.done ? { background: "#22c55e" } : {}}>
                        {a.done && <Check className="size-3.5 text-white" />}
                      </button>
                      <input value={a.text} onChange={(e) => patchAction(a.id, { text: e.target.value })}
                        placeholder="Action à réaliser…"
                        className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/20 ${a.done ? "text-muted line-through" : ""}`} />
                      {due && !a.done && <span className="hidden shrink-0 items-center gap-1 text-[11px] sm:inline-flex" style={{ color: due.tone }}><CalendarClock className="size-3" />{due.label}</span>}
                      <input type="date" value={a.due} onChange={(e) => patchAction(a.id, { due: e.target.value })}
                        className="w-[7.5rem] shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-muted outline-none [color-scheme:dark]" />
                      <button onClick={() => deleteAction(a.id)} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-white/5 hover:text-red-400 group-hover:opacity-100" title="Supprimer">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Notes */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center gap-2">
              <NotebookPen className="size-4" style={{ color: ACCENT }} />
              <h2 className="flex-1 text-sm font-semibold">Notes</h2>
              <button onClick={() => setNotePreview((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-muted transition hover:bg-white/5 hover:text-white">
                {notePreview ? <><Pencil className="size-3.5" /> Éditer</> : <><Eye className="size-3.5" /> Aperçu</>}
              </button>
            </div>
            {notePreview ? (
              <div className="prose-share min-h-[6rem] text-sm" dangerouslySetInnerHTML={{ __html: notesHtml }} />
            ) : (
              <textarea value={data.notes} onChange={(e) => update((c) => ({ ...c, notes: e.target.value }))}
                rows={6} placeholder="Notes libres (Markdown pris en charge) : contexte, historique, points d'attention…"
                className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm outline-none placeholder:text-white/20 focus:border-white/20" />
            )}
          </section>

        </div>
      </fieldset>
    </div>
  );
}

/* ───────────────────────── Small UI atoms ───────────────────────── */
function Section({ icon: Icon, title, count, onAdd, addLabel, children }: {
  icon: typeof Target; title: string; count: number; onAdd: () => void; addLabel: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4" style={{ color: ACCENT }} />
        <h2 className="flex-1 text-sm font-semibold">{title} {count > 0 && <span className="ml-1 text-xs font-normal text-muted">· {count}</span>}</h2>
        <button onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white shadow" style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}>
          <Plus className="size-3.5" /> {addLabel}
        </button>
      </div>
      {children}
    </section>
  );
}
function Labeled({ icon: Icon, label, children }: { icon: typeof Target; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted"><Icon className="size-3.5" /> {label}</p>
      {children}
    </div>
  );
}
function Stat({ label, value, tone, children }: { label: string; value: string; tone: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: tone }}>{value}</p>
      {children}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted">{children}</p>;
}
