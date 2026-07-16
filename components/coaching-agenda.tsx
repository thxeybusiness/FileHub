"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, CalendarDays, ChevronLeft, ChevronRight, Loader2, CalendarClock, ListChecks,
} from "lucide-react";
import { api, type CoachingAgendaItem } from "@/lib/api";

const ACCENT = "#06b6d4";
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
  const [agenda, setAgenda] = useState<CoachingAgendaItem[] | null>(null);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    api.getCoachingOverview().then((o) => setAgenda(o.agenda)).catch(() => setAgenda([]));
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, CoachingAgendaItem[]>();
    for (const e of agenda ?? []) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [agenda]);

  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  // Construction de la grille du mois (semaines commençant le lundi).
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDow = (first.getDay() + 6) % 7; // 0 = lundi
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const move = (delta: number) => {
    setSelected(null);
    setCursor((c) => {
      const m = c.m + delta;
      return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  };
  const goToday = () => { setCursor({ y: now.getFullYear(), m: now.getMonth() }); setSelected(today); };

  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];

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
        <button onClick={goToday} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white">Aujourd'hui</button>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
          {/* Légende + navigation mois */}
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

          {agenda === null ? (
            <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            <>
              {/* Grille */}
              <div className="grid grid-cols-7 gap-1">
                {DOW.map((d, i) => (
                  <div key={i} className="pb-1 text-center text-[11px] font-medium text-muted">{d}</div>
                ))}
                {cells.map((d, i) => {
                  if (d === null) return <div key={i} className="aspect-square" />;
                  const date = iso(cursor.y, cursor.m, d);
                  const events = byDate.get(date) ?? [];
                  const isToday = date === today;
                  const isSel = date === selected;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(isSel ? null : date)}
                      className={`aspect-square rounded-lg border p-1 text-left transition ${isSel ? "border-cyan-400/60 bg-cyan-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}
                    >
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

              {/* Détail du jour sélectionné */}
              {selected && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="mb-2 text-sm font-semibold capitalize">{fmtLong(selected)}</h3>
                  {selectedEvents.length === 0 ? (
                    <p className="py-4 text-center text-sm text-white/40">Rien de prévu ce jour.</p>
                  ) : (
                    <ul className="space-y-1">
                      {selectedEvents.map((e, i) => (
                        <li key={i}>
                          <button onClick={() => router.push(`/drive/coaching/${e.coachingId}/fiche`)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: (e.kind === "session" ? ACCENT : "#f59e0b") + "1f", color: e.kind === "session" ? "#67e8f9" : "#fcd34d" }}>
                              {e.kind === "session" ? <CalendarClock className="size-4" /> : <ListChecks className="size-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{e.coacheeName}</p>
                              <p className="truncate text-xs text-muted">{e.label}</p>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted">{e.kind === "session" ? "Séance" : "Action"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
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
