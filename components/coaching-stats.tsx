"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, BarChart3, Loader2, Users, CalendarClock, ListChecks, TrendingUp, Target, HeartHandshake,
} from "lucide-react";
import { api, type CoachingOverview } from "@/lib/api";

const ACCENT = "#06b6d4";
const STATUSES: Record<string, { l: string; color: string }> = {
  prospect: { l: "Prospect", color: "#a78bff" },
  active: { l: "Actif", color: "#22c55e" },
  paused: { l: "En pause", color: "#f59e0b" },
  done: { l: "Terminé", color: "#64748b" },
};
const statusMeta = (k: string) => STATUSES[k] ?? STATUSES.active;

export function CoachingStats() {
  const router = useRouter();
  const [data, setData] = useState<CoachingOverview | null>(null);

  useEffect(() => {
    const load = () => api.getCoachingOverview().then(setData).catch(() => setData(null));
    load();
    window.addEventListener("filehub:refresh", load);
    return () => window.removeEventListener("filehub:refresh", load);
  }, []);

  const s = data?.stats;
  const completion = s && s.totalActions ? Math.round((s.doneActions / s.totalActions) * 100) : 0;
  const coachees = data?.coachees ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <button onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden" title="Menu"><Menu className="size-5" /></button>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] shadow-lg shadow-cyan-500/30"><BarChart3 className="size-5 text-white" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">Statistiques</h1>
          <p className="hidden sm:block text-xs text-muted">Vue analytique de vos accompagnements</p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          {data === null ? (
            <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          ) : s && s.total === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-16 text-center text-sm text-muted">Ajoutez des coachés pour voir vos statistiques.</p>
          ) : s ? (
            <>
              {/* Tuiles globales */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat icon={Users} tint="#06b6d4" value={s.total} label="Coachés" />
                <Stat icon={HeartHandshake} tint="#22c55e" value={s.active} label="Actifs" />
                <Stat icon={CalendarClock} tint="#3b82f6" value={s.totalSessions} label="Séances" />
                <Stat icon={Target} tint="#8b5cf6" value={s.totalObjectives} label="Objectifs" />
                <Stat icon={TrendingUp} tint="#22c55e" value={`${s.avgProgress}%`} label="Progression" />
                <Stat icon={ListChecks} tint="#f59e0b" value={`${completion}%`} label="Actions faites" />
              </div>

              {/* Taux de complétion des actions */}
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="mb-2 flex items-center gap-2">
                  <ListChecks className="size-4" style={{ color: ACCENT }} />
                  <h2 className="text-sm font-semibold">Actions réalisées</h2>
                  <span className="ml-auto text-sm font-semibold tabular-nums">{s.doneActions}/{s.totalActions}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full transition-all" style={{ width: `${completion}%`, background: `linear-gradient(90deg, ${ACCENT}, #22c55e)` }} />
                </div>
              </section>

              {/* Par coaché */}
              <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="size-4" style={{ color: ACCENT }} />
                  <h2 className="text-sm font-semibold">Détail par coaché</h2>
                </div>
                <div className="space-y-2">
                  {coachees.map((c) => {
                    const sm = statusMeta(c.status);
                    const comp = c.totalActions ? Math.round((c.doneActions / c.totalActions) * 100) : 0;
                    return (
                      <button key={c.id} onClick={() => router.push(`/drive/coaching/${c.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.04]">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg text-white shadow" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}><HeartHandshake className="size-4" /></span>
                        <div className="min-w-0 flex-[2]">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{c.coacheeName}</p>
                            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: sm.color + "26", color: sm.color }}>{sm.l}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${c.progress}%`, background: c.progress >= 100 ? "#22c55e" : ACCENT }} /></div>
                        </div>
                        <div className="hidden shrink-0 items-center gap-4 text-xs text-muted sm:flex">
                          <span className="inline-flex items-center gap-1" title="Séances"><CalendarClock className="size-3.5" />{c.sessions}</span>
                          <span className="inline-flex items-center gap-1" title="Actions faites / total"><ListChecks className="size-3.5" />{c.doneActions}/{c.totalActions}</span>
                          <span className="w-10 text-right font-semibold tabular-nums" style={{ color: comp >= 100 ? "#22c55e" : undefined }}>{comp}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, tint, value, label }: { icon: typeof Users; tint: string; value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="grid size-8 place-items-center rounded-lg" style={{ background: tint + "1f", color: tint }}><Icon className="size-4" /></span>
      <p className="mt-3 text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
