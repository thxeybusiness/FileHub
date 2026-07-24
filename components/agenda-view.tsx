"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Menu, CalendarDays, ChevronLeft, ChevronRight, Loader2, CalendarClock, ListChecks,
  Plus, Trash2, Check, Users, ArrowLeft,
} from "lucide-react";
import { api, type AgendaEventDTO } from "@/lib/api";

const ACCENT = "#3b82f6";
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DOW = ["L", "M", "M", "J", "V", "S", "D"];
// Libellés génériques (mêmes valeurs stockées que le coaching : session/action).
const KIND_LABEL: Record<"session" | "action", string> = { session: "Rendez-vous", action: "Tâche" };
const KIND_COLOR: Record<"session" | "action", string> = { session: ACCENT, action: "#f59e0b" };
const KIND_TEXT: Record<"session" | "action", string> = { session: "#93c5fd", action: "#fcd34d" };

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function fmtLong(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// Agenda générique FileHub : personnel (spaceId absent) ou commun à un espace.
export function AgendaView({ spaceId, title, subtitle, shared, backHref }: { spaceId?: string; title: string; subtitle: string; shared?: boolean; backHref?: string }) {
  const [events, setEvents] = useState<AgendaEventDTO[] | null>(null);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const [adding, setAdding] = useState(false);
  const [addKind, setAddKind] = useState<"session" | "action">("session");
  const [addLabel, setAddLabel] = useState("");

  const reload = useCallback(
    () => api.listAgenda(spaceId).then((r) => setEvents(r.events)).catch(() => setEvents([])),
    [spaceId],
  );
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (selected) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [selected]);

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaEventDTO[]>();
    for (const e of events ?? []) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const move = (delta: number) => {
    setSelected(null); setAdding(false);
    setCursor((c) => {
      const m = c.m + delta;
      return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  };
  const goToday = () => { setCursor({ y: now.getFullYear(), m: now.getMonth() }); pickDay(today); };

  const pickDay = (date: string) => { setSelected(date); setAdding(false); setAddLabel(""); };

  const mutate = async (body: Parameters<typeof api.editAgenda>[0]) => {
    setBusy(true);
    try { await api.editAgenda(body, spaceId); await reload(); }
    catch { /* ignore */ } finally { setBusy(false); }
  };

  const submitAdd = async () => {
    if (!selected || !addLabel.trim()) return;
    await mutate({ op: "add", kind: addKind, date: selected, label: addLabel.trim() });
    setAddLabel(""); setAdding(false);
  };

  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <button onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden" title="Menu">
          <Menu className="size-5" />
        </button>
        {backHref && (
          <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour à l'espace">
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#22d3ee] shadow-lg shadow-blue-500/30">
          <CalendarDays className="size-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-base font-semibold leading-tight">
            <span className="truncate">{title}</span>
            {shared && <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-medium text-brand-200"><Users className="size-3" /> Commun</span>}
          </h1>
          <p className="hidden truncate sm:block text-xs text-muted">{subtitle}</p>
        </div>
        {busy && <Loader2 className="size-4 animate-spin text-muted" />}
        <button onClick={goToday} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white">Aujourd'hui</button>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => move(-1)} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5 hover:text-white"><ChevronLeft className="size-4" /></button>
              <button onClick={() => move(1)} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5 hover:text-white"><ChevronRight className="size-4" /></button>
            </div>
            <h2 className="text-base font-semibold capitalize">{MONTHS[cursor.m]} {cursor.y}</h2>
            <div className="ml-auto flex items-center gap-3 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: KIND_COLOR.session }} /> Rendez-vous</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: KIND_COLOR.action }} /> Tâche</span>
            </div>
          </div>

          {events === null ? (
            <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1">
                {DOW.map((d, i) => (<div key={i} className="pb-1 text-center text-[11px] font-medium text-muted">{d}</div>))}
                {cells.map((d, i) => {
                  if (d === null) return <div key={i} className="h-16 sm:h-[68px]" />;
                  const date = iso(cursor.y, cursor.m, d);
                  const evs = byDate.get(date) ?? [];
                  const isToday = date === today;
                  const isSel = date === selected;
                  return (
                    <button key={i} onClick={() => (isSel ? (setSelected(null), setAdding(false)) : pickDay(date))}
                      className={`h-16 sm:h-[68px] rounded-lg border p-1 text-left transition ${isSel ? "border-brand-400/60 bg-brand-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                      <span className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${isToday ? "bg-brand-500 text-black" : "text-white/80"}`}>{d}</span>
                      <div className="mt-0.5 space-y-0.5 overflow-hidden">
                        {evs.slice(0, 2).map((e, j) => (
                          <div key={j} className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px]" style={{ background: KIND_COLOR[e.kind] + "22", color: KIND_TEXT[e.kind] }}>
                            <span className={`truncate ${e.done ? "line-through opacity-60" : ""}`}>{e.label || KIND_LABEL[e.kind]}</span>
                          </div>
                        ))}
                        {evs.length > 2 && <div className="px-1 text-[10px] text-muted">+{evs.length - 2}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div ref={detailRef} className="mt-5 scroll-mt-4 rounded-2xl border border-brand-400/20 bg-white/[0.02] p-4 shadow-lg shadow-blue-500/5">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold capitalize">{fmtLong(selected)}</h3>
                  </div>

                  {adding && (
                    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-lg border border-white/10 p-0.5">
                          {(["session", "action"] as const).map((k) => (
                            <button key={k} onClick={() => setAddKind(k)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${addKind === k ? "text-white" : "text-muted hover:text-white"}`}
                              style={addKind === k ? { background: KIND_COLOR[k] + "26", color: KIND_TEXT[k] } : {}}>
                              {KIND_LABEL[k]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input value={addLabel} onChange={(e) => setAddLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAdd()} autoFocus
                          placeholder={addKind === "session" ? "Intitulé du rendez-vous…" : "Tâche à réaliser…"}
                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-brand-400/50" />
                        <button onClick={submitAdd} disabled={!addLabel.trim() || busy} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: `linear-gradient(90deg, ${ACCENT}, #22d3ee)` }}>Ajouter</button>
                        <button onClick={() => setAdding(false)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-white">Annuler</button>
                      </div>
                    </div>
                  )}

                  {selectedEvents.length === 0 && !adding ? (
                    <p className="py-4 text-center text-sm text-white/40">Rien de prévu ce jour.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {selectedEvents.map((e) => (
                        <li key={e.id} className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2">
                          {e.kind === "action" ? (
                            <button onClick={() => mutate({ op: "update", itemId: e.id, done: !e.done })}
                              className="grid size-8 shrink-0 place-items-center rounded-lg border transition"
                              style={e.done ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#ffffff30" }} title={e.done ? "Terminé" : "Marquer terminé"}>
                              {e.done ? <Check className="size-4 text-black" /> : <ListChecks className="size-4 text-white/60" />}
                            </button>
                          ) : (
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: KIND_COLOR.session + "1f", color: KIND_TEXT.session }}>
                              <CalendarClock className="size-4" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <input
                              key={`${e.id}:${e.label}`}
                              defaultValue={e.label}
                              onBlur={(ev) => { const v = ev.target.value.trim(); if (v && v !== e.label) mutate({ op: "update", itemId: e.id, label: v }); }}
                              onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                              className={`w-full bg-transparent text-sm font-medium outline-none focus:text-white ${e.done ? "text-muted line-through" : ""}`}
                            />
                            <p className="truncate text-xs text-muted">{KIND_LABEL[e.kind]}</p>
                          </div>
                          <input type="date" value={e.date} onChange={(ev) => ev.target.value && mutate({ op: "update", itemId: e.id, date: ev.target.value })}
                            className="hidden shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-muted outline-none sm:block [color-scheme:dark]" title="Déplacer" />
                          <button onClick={() => mutate({ op: "delete", itemId: e.id })} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100" title="Supprimer"><Trash2 className="size-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!adding && (
                    <button onClick={() => setAdding(true)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110" style={{ background: `linear-gradient(90deg, ${ACCENT}, #22d3ee)` }}>
                      <Plus className="size-4" /> Ajouter un rendez-vous ou une tâche
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
