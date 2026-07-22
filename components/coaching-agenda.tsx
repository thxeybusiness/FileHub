"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, CalendarDays, ChevronLeft, ChevronRight, Loader2, CalendarClock, ListChecks,
  Plus, Trash2, ExternalLink,
} from "lucide-react";
import { api, type CoachingOverview, type CoachingAgendaItem } from "@/lib/api";

const ACCENT = "#06b6d4";
const GENERAL = "__general__"; // valeur sentinelle du bucket « Général »
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DOW = ["L", "M", "M", "J", "V", "S", "D"];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function fmtLong(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function CoachingAgenda() {
  const router = useRouter();
  const [data, setData] = useState<CoachingOverview | null>(null);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  // Fait défiler vers le panneau du jour dès qu'on sélectionne une date.
  useEffect(() => {
    if (selected) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [selected]);

  // Formulaire d'ajout
  const [adding, setAdding] = useState(false);
  const [addKind, setAddKind] = useState<"session" | "action">("session");
  const [addCoaching, setAddCoaching] = useState("");
  const [addLabel, setAddLabel] = useState("");

  const reload = useCallback(() => api.getCoachingOverview().then(setData).catch(() => setData(null)), []);
  useEffect(() => { reload(); }, [reload]);

  const coachees = data?.coachees ?? [];
  const agenda = data?.agenda ?? [];

  const byDate = useMemo(() => {
    const map = new Map<string, CoachingAgendaItem[]>();
    for (const e of agenda) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [agenda]);

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

  const pickDay = (date: string) => {
    setSelected(date);
    setAdding(false);
    setAddLabel("");
    if (!addCoaching) setAddCoaching(coachees[0]?.id ?? GENERAL);
  };

  // ── Mutations ── (coachingId vide ou GENERAL ⇒ agenda « Général »)
  const mutate = async (coachingId: string, body: Parameters<typeof api.editCoachingAgenda>[1]) => {
    setBusy(true);
    try {
      if (!coachingId || coachingId === GENERAL) await api.editGeneralAgenda(body);
      else await api.editCoachingAgenda(coachingId, body);
      await reload();
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const submitAdd = async () => {
    if (!selected || !addCoaching || !addLabel.trim()) return;
    await mutate(addCoaching, { op: "add", kind: addKind, date: selected, label: addLabel.trim() });
    setAddLabel(""); setAdding(false);
  };

  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];
  const openAdd = () => {
    if (!addCoaching) setAddCoaching(coachees[0]?.id ?? GENERAL);
    setAdding(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <button onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden" title="Menu">
          <Menu className="size-5" />
        </button>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] shadow-lg shadow-cyan-500/30">
          <CalendarDays className="size-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">Agenda</h1>
          <p className="hidden sm:block text-xs text-muted">Séances et échéances, tous coachés</p>
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
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: ACCENT }} /> Séance</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "#f59e0b" }} /> Action</span>
            </div>
          </div>

          {data === null ? (
            <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1">
                {DOW.map((d, i) => (<div key={i} className="pb-1 text-center text-[11px] font-medium text-muted">{d}</div>))}
                {cells.map((d, i) => {
                  if (d === null) return <div key={i} className="h-16 sm:h-[68px]" />;
                  const date = iso(cursor.y, cursor.m, d);
                  const events = byDate.get(date) ?? [];
                  const isToday = date === today;
                  const isSel = date === selected;
                  return (
                    <button key={i} onClick={() => (isSel ? (setSelected(null), setAdding(false)) : pickDay(date))}
                      className={`h-16 sm:h-[68px] rounded-lg border p-1 text-left transition ${isSel ? "border-cyan-400/60 bg-cyan-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                      <span className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${isToday ? "bg-cyan-500 text-black" : "text-white/80"}`}>{d}</span>
                      <div className="mt-0.5 space-y-0.5 overflow-hidden">
                        {events.slice(0, 2).map((e, j) => (
                          <div key={j} className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px]" style={{ background: (e.kind === "session" ? ACCENT : "#f59e0b") + "22", color: e.kind === "session" ? "#67e8f9" : "#fcd34d" }}>
                            <span className="truncate">{e.coacheeName}</span>
                          </div>
                        ))}
                        {events.length > 2 && <div className="px-1 text-[10px] text-muted">+{events.length - 2}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div ref={detailRef} className="mt-5 scroll-mt-4 rounded-2xl border border-cyan-400/20 bg-white/[0.02] p-4 shadow-lg shadow-cyan-500/5">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold capitalize">{fmtLong(selected)}</h3>
                  </div>

                  {/* Formulaire d'ajout */}
                  {adding && (
                    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-lg border border-white/10 p-0.5">
                          {(["session", "action"] as const).map((k) => (
                            <button key={k} onClick={() => setAddKind(k)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${addKind === k ? "text-white" : "text-muted hover:text-white"}`}
                              style={addKind === k ? { background: (k === "session" ? ACCENT : "#f59e0b") + "26", color: k === "session" ? "#67e8f9" : "#fcd34d" } : {}}>
                              {k === "session" ? "Séance" : "Action"}
                            </button>
                          ))}
                        </div>
                        <select value={addCoaching} onChange={(e) => setAddCoaching(e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-white outline-none [color-scheme:dark]">
                          <option value={GENERAL} className="bg-[#0f1017]">Général</option>
                          {coachees.map((c) => (<option key={c.id} value={c.id} className="bg-[#0f1017]">{c.coacheeName}</option>))}
                        </select>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input value={addLabel} onChange={(e) => setAddLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAdd()} autoFocus
                          placeholder={addKind === "session" ? "Thème de la séance…" : "Action à réaliser…"}
                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-sky-400/50" />
                        <button onClick={submitAdd} disabled={!addLabel.trim() || busy} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}>Ajouter</button>
                        <button onClick={() => setAdding(false)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-white">Annuler</button>
                      </div>
                    </div>
                  )}

                  {selectedEvents.length === 0 && !adding ? (
                    <p className="py-4 text-center text-sm text-white/40">Rien de prévu ce jour.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {selectedEvents.map((e) => (
                        <li key={`${e.kind}:${e.itemId}`} className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: (e.kind === "session" ? ACCENT : "#f59e0b") + "1f", color: e.kind === "session" ? "#67e8f9" : "#fcd34d" }}>
                            {e.kind === "session" ? <CalendarClock className="size-4" /> : <ListChecks className="size-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            {e.itemId ? (
                              <input
                                key={`${e.itemId}:${e.label}`}
                                defaultValue={e.label}
                                onBlur={(ev) => { const v = ev.target.value.trim(); if (v && v !== e.label) mutate(e.coachingId, { op: "update", kind: e.kind, itemId: e.itemId, label: v }); }}
                                onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                                className="w-full bg-transparent text-sm font-medium outline-none focus:text-white"
                              />
                            ) : (
                              <p className="truncate text-sm font-medium">{e.label}</p>
                            )}
                            <p className="truncate text-xs text-muted">{e.coacheeName}</p>
                          </div>
                          {e.itemId && (
                            <>
                              <input type="date" value={e.date} onChange={(ev) => ev.target.value && mutate(e.coachingId, { op: "update", kind: e.kind, itemId: e.itemId, date: ev.target.value })}
                                className="hidden shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-muted outline-none sm:block [color-scheme:dark]" title="Déplacer" />
                              {!e.general && e.coachingId && (
                                <button onClick={() => router.push(`/drive/coaching/${e.coachingId}/fiche`)} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-white/5 hover:text-white group-hover:opacity-100" title="Ouvrir la fiche"><ExternalLink className="size-3.5" /></button>
                              )}
                              <button onClick={() => mutate(e.coachingId, { op: "delete", kind: e.kind, itemId: e.itemId })} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100" title="Supprimer"><Trash2 className="size-3.5" /></button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Unique bouton d'ajout, bien visible, en bas du panneau. */}
                  {!adding && (
                    <button onClick={openAdd} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110" style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}>
                      <Plus className="size-4" /> Ajouter une séance ou une action
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
