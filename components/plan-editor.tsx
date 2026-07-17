"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, ChevronRight, Home, Target, Plus, X, Calendar,
  ListChecks, ChevronDown, Trash2, Flag,
} from "lucide-react";
import { api } from "@/lib/api";
import { ExportButton } from "./export-button";
import { openPrintWindow, safeFilename } from "@/lib/export-doc";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

type Status = "todo" | "doing" | "done";
type Step = { id: string; text: string; done: boolean };
type Objective = { id: string; title: string; status: Status; due: string; steps: Step[] };
type Plan = { objectives: Objective[] };

const ACCENT = "#06b6d4";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const STATUSES: { k: Status; label: string; color: string }[] = [
  { k: "todo", label: "À faire", color: "#64748b" },
  { k: "doing", label: "En cours", color: "#3b6dff" },
  { k: "done", label: "Atteint", color: "#22c55e" },
];
const sMeta = (k: Status) => STATUSES.find((s) => s.k === k) ?? STATUSES[0];
const asStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

// Progression d'un objectif : depuis les étapes si présentes, sinon depuis le statut.
function objProgress(o: Objective): number {
  if (o.steps.length) return Math.round((o.steps.filter((s) => s.done).length / o.steps.length) * 100);
  return o.status === "done" ? 100 : o.status === "doing" ? 50 : 0;
}

// Lit le nouveau format (objectives) OU l'ancien « projet » (fields/rows) et
// convertit ce dernier en objectifs + étapes — pour migrer les plans existants.
function parsePlan(content: string): Plan {
  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(content || "{}") as Record<string, unknown>; } catch { raw = {}; }

  if (Array.isArray(raw.objectives)) {
    const objectives = (raw.objectives as Record<string, unknown>[]).map((o) => normalize(o));
    return { objectives };
  }

  // Conversion depuis l'ancien éditeur « projet ».
  if (Array.isArray(raw.rows)) {
    const fields = Array.isArray(raw.fields) ? (raw.fields as Record<string, unknown>[]) : [];
    const titleF = fields.find((f) => f.primary) ?? fields.find((f) => f.type === "text");
    const statusF = fields.find((f) => f.type === "status");
    const dueF = fields.find((f) => f.type === "date");
    const opts = Array.isArray(statusF?.options) ? (statusF!.options as { id: string; name: string }[]) : [];
    const mapStatus = (optId: unknown): Status => {
      const n = (opts.find((o) => o.id === optId)?.name || "").toLowerCase();
      if (/atteint|termin|fait|done|réuss/.test(n)) return "done";
      if (/cours|doing|progress|entam/.test(n)) return "doing";
      return "todo";
    };
    const objectives = (raw.rows as Record<string, unknown>[]).map((r) => {
      const cells = (r.cells ?? {}) as Record<string, unknown>;
      const checklist = Array.isArray(r.checklist) ? (r.checklist as Record<string, unknown>[]) : [];
      return {
        id: asStr(r.id) || uid(),
        title: asStr(titleF ? cells[titleF.id as string] : ""),
        status: statusF ? mapStatus(cells[statusF.id as string]) : "todo",
        due: asStr(dueF ? cells[dueF.id as string] : ""),
        steps: checklist.map((c) => ({ id: asStr(c.id) || uid(), text: asStr(c.text), done: c.done === true })),
      } as Objective;
    });
    return { objectives };
  }

  // Nouveau plan vierge.
  return {
    objectives: [
      { id: uid(), title: "", status: "todo", due: "", steps: [] },
    ],
  };
}
function normalize(o: Record<string, unknown>): Objective {
  const steps = Array.isArray(o.steps) ? (o.steps as Record<string, unknown>[]) : [];
  const st = asStr(o.status);
  return {
    id: asStr(o.id) || uid(),
    title: asStr(o.title),
    status: (["todo", "doing", "done"].includes(st) ? st : "todo") as Status,
    due: asStr(o.due),
    steps: steps.map((s) => ({ id: asStr(s.id) || uid(), text: asStr(s.text), done: s.done === true })),
  };
}

export function PlanEditor({
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
  const [plan, setPlan] = useState<Plan>(() => parsePlan(initialContent));
  const [save, setSave] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((patch: { content?: string; name?: string }) => {
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, patch).then(() => setSave("saved")).catch(() => setSave("error"));
    }, 600);
  }, [id]);

  const update = useCallback((fn: (p: Plan) => Plan) => {
    if (!canEdit) return;
    setPlan((prev) => {
      const next = fn(prev);
      persist({ content: JSON.stringify(next) });
      return next;
    });
  }, [canEdit, persist]);

  const onName = (v: string) => { if (!canEdit) return; setName(v); persist({ name: v.trim() || "Plan d'action" }); };

  // ── Objectifs ──
  const addObjective = () => update((p) => ({ objectives: [...p.objectives, { id: uid(), title: "", status: "todo", due: "", steps: [] }] }));
  const patchObjective = (oid: string, patch: Partial<Objective>) =>
    update((p) => ({ objectives: p.objectives.map((o) => (o.id === oid ? { ...o, ...patch } : o)) }));
  const delObjective = (oid: string) => update((p) => ({ objectives: p.objectives.filter((o) => o.id !== oid) }));

  // ── Étapes ──
  const addStep = (oid: string) => update((p) => ({ objectives: p.objectives.map((o) => (o.id === oid ? { ...o, steps: [...o.steps, { id: uid(), text: "", done: false }] } : o)) }));
  const patchStep = (oid: string, sid: string, patch: Partial<Step>) =>
    update((p) => ({ objectives: p.objectives.map((o) => (o.id === oid ? { ...o, steps: o.steps.map((s) => (s.id === sid ? { ...s, ...patch } : s)) } : o)) }));
  const delStep = (oid: string, sid: string) =>
    update((p) => ({ objectives: p.objectives.map((o) => (o.id === oid ? { ...o, steps: o.steps.filter((s) => s.id !== sid) } : o)) }));

  const global = plan.objectives.length ? Math.round(plan.objectives.reduce((s, o) => s + objProgress(o), 0) / plan.objectives.length) : 0;
  const doneCount = plan.objectives.filter((o) => objProgress(o) >= 100).length;
  const printHtml = useMemo(() => buildPrintHtml(name, plan), [name, plan]);

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
            <Target className="size-4 shrink-0" style={{ color: ACCENT }} />
            <input value={name} onChange={(e) => onName(e.target.value)} disabled={!canEdit} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30 disabled:opacity-100" placeholder="Plan d'action" />
          </div>
        </div>
        <ExportButton items={[{ label: "PDF (imprimable)", onClick: () => openPrintWindow(safeFilename(name) || "plan-action", printHtml) }]} />
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>) : save === "error" ? (<span className="text-red-400">Erreur</span>) : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <fieldset disabled={!canEdit} className="mx-auto w-full max-w-3xl px-4 sm:px-8 py-6 space-y-4">
          {/* Progression globale */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/[0.10] to-blue-500/[0.05] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Progression globale</p>
              <span className="text-sm font-semibold tabular-nums">{global}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full transition-all" style={{ width: `${global}%`, background: global >= 100 ? "#22c55e" : `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{doneCount}/{plan.objectives.length} objectif{plan.objectives.length > 1 ? "s" : ""} atteint{doneCount > 1 ? "s" : ""}</p>
          </div>

          {/* Objectifs */}
          {plan.objectives.map((o, idx) => {
            const p = objProgress(o);
            const m = sMeta(o.status);
            const doneSteps = o.steps.filter((s) => s.done).length;
            return (
              <div key={o.id} className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-start gap-2.5">
                  <span className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold" style={{ background: m.color + "26", color: m.color }}>{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={o.title}
                      onChange={(e) => patchObjective(o.id, { title: e.target.value })}
                      placeholder="Décrire l'objectif…"
                      className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-white/25"
                    />
                    {/* Méta : statut + échéance */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="relative inline-flex items-center">
                        <span className="pointer-events-none absolute left-2 size-1.5 rounded-full" style={{ background: m.color }} />
                        <select value={o.status} onChange={(e) => patchObjective(o.id, { status: e.target.value as Status })}
                          className="appearance-none rounded-lg border border-white/10 bg-white/[0.04] pl-5 pr-6 py-1 text-xs font-medium outline-none [color-scheme:dark]" style={{ color: m.color }}>
                          {STATUSES.map((s) => (<option key={s.k} value={s.k} className="bg-[#0f1017] text-white">{s.label}</option>))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5 text-muted" />
                      </div>
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-muted">
                        <Calendar className="size-3.5" />
                        <input type="date" value={o.due} onChange={(e) => patchObjective(o.id, { due: e.target.value })} className="bg-transparent outline-none [color-scheme:dark]" />
                      </label>
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => delObjective(o.id)} className="grid size-7 shrink-0 place-items-center rounded-lg text-white/25 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100" title="Supprimer l'objectif"><Trash2 className="size-4" /></button>
                  )}
                </div>

                {/* Progression (auto depuis les étapes) */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${p}%`, background: p >= 100 ? "#22c55e" : ACCENT }} /></div>
                  <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums">{p}%</span>
                </div>

                {/* Étapes */}
                <div className="mt-3 space-y-1">
                  {o.steps.map((s) => (
                    <div key={s.id} className="group/step flex items-center gap-2">
                      <button onClick={() => patchStep(o.id, s.id, { done: !s.done })} className="grid size-5 shrink-0 place-items-center rounded-md border transition" style={s.done ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#ffffff30" }}>
                        {s.done && <Check className="size-3.5 text-black" />}
                      </button>
                      <input value={s.text} onChange={(e) => patchStep(o.id, s.id, { text: e.target.value })} placeholder="Étape…" className={`min-w-0 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-white/25 ${s.done ? "text-muted line-through" : ""}`} />
                      {canEdit && <button onClick={() => delStep(o.id, s.id)} className="grid size-6 shrink-0 place-items-center rounded text-white/25 opacity-0 transition hover:text-red-400 group-hover/step:opacity-100"><X className="size-3.5" /></button>}
                    </div>
                  ))}
                  {canEdit && (
                    <button onClick={() => addStep(o.id)} className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-muted transition hover:text-white">
                      <Plus className="size-3.5" /> Ajouter une étape {o.steps.length > 0 && <span className="text-white/30">· {doneSteps}/{o.steps.length}</span>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {canEdit && (
            <button onClick={addObjective} className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm font-semibold text-muted transition hover:border-cyan-400/40 hover:bg-white/[0.03] hover:text-white">
              <Plus className="size-4" /> Ajouter un objectif
            </button>
          )}
        </fieldset>
      </div>
    </div>
  );
}

function buildPrintHtml(name: string, plan: Plan): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocks = plan.objectives.map((o) => {
    const p = objProgress(o);
    const st = sMeta(o.status).label;
    const steps = o.steps.filter((s) => s.text.trim()).map((s) => `<li>${s.done ? "☑" : "☐"} ${esc(s.text)}</li>`).join("");
    return `<h2>${esc(o.title || "Objectif")} — ${p}%</h2><p><strong>Statut :</strong> ${st}${o.due ? ` &nbsp; <strong>Échéance :</strong> ${esc(o.due)}` : ""}</p>${steps ? `<ul>${steps}</ul>` : ""}`;
  }).join("");
  return `<h1>${esc(name || "Plan d'action")}</h1>${blocks}`;
}
