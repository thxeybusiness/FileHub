"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, LayoutDashboard, Users, TrendingUp, ListChecks, CalendarClock,
  Loader2, Plus, ChevronRight, CalendarDays, HeartHandshake,
} from "lucide-react";
import { api, notifyRefresh, type CoachingOverview } from "@/lib/api";

const ACCENT = "#06b6d4";
const STATUSES: Record<string, { l: string; color: string }> = {
  prospect: { l: "Prospect", color: "#a78bff" },
  active: { l: "Actif", color: "#22c55e" },
  paused: { l: "En pause", color: "#f59e0b" },
  done: { l: "Terminé", color: "#64748b" },
};
const statusMeta = (k: string) => STATUSES[k] ?? STATUSES.active;

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function relDays(d: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt = new Date(d + "T00:00:00");
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "demain";
  if (diff < 0) return `il y a ${-diff} j`;
  return `dans ${diff} j`;
}

export function CoachingDashboard() {
  const router = useRouter();
  const [data, setData] = useState<CoachingOverview | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = () => api.getCoachingOverview().then(setData).catch(() => setData(null));
    load();
    window.addEventListener("filehub:refresh", load);
    return () => window.removeEventListener("filehub:refresh", load);
  }, []);

  const create = async () => {
    setCreating(true);
    try {
      const { id } = await api.createAccompagnement();
      notifyRefresh();
      router.push(`/drive/coaching/${id}`);
    } catch { setCreating(false); }
  };

  const s = data?.stats;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <button onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden" title="Menu">
          <Menu className="size-5" />
        </button>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] shadow-lg shadow-cyan-500/30">
          <LayoutDashboard className="size-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">Tableau de bord</h1>
          <p className="hidden sm:block text-xs text-muted">Vue d'ensemble de vos accompagnements</p>
        </div>
        <button onClick={create} disabled={creating} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white shadow disabled:opacity-60" style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <span className="hidden sm:inline">Nouveau coaché</span>
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          {data === null ? (
            <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          ) : s && s.total === 0 ? (
            <Empty onCreate={create} creating={creating} />
          ) : s ? (
            <>
              {/* Tuiles de stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon={Users} tint="#06b6d4" label="Coachés" value={s.total} sub={`${s.active} actif${s.active > 1 ? "s" : ""}`} />
                <Stat icon={TrendingUp} tint="#22c55e" label="Progression moy." value={`${s.avgProgress}%`} />
                <Stat icon={CalendarClock} tint="#3b82f6" label="Séances à venir" value={s.upcoming} />
                <Stat icon={ListChecks} tint={s.openActions ? "#f59e0b" : "#64748b"} label="Actions en attente" value={s.openActions} />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {/* Prochaines séances */}
                <Panel icon={CalendarClock} title="Prochaines séances" onSeeAll={() => router.push("/drive/accompagnement/agenda")}>
                  {data.upcoming.length === 0 ? (
                    <EmptyLine text="Aucune séance planifiée." />
                  ) : (
                    <ul className="space-y-1">
                      {data.upcoming.slice(0, 6).map((u, i) => (
                        <li key={i}>
                          <button onClick={() => router.push(`/drive/coaching/${u.coachingId}/fiche`)} className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-300">
                              <CalendarDays className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{u.coacheeName}</p>
                              <p className="truncate text-xs text-muted">{u.label}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold tabular-nums">{fmtDate(u.date)}</p>
                              <p className="text-[11px] text-muted">{relDays(u.date)}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                {/* Actions en attente */}
                <Panel icon={ListChecks} title="Actions en attente">
                  {data.pendingActions.length === 0 ? (
                    <EmptyLine text="Rien à faire, tout est à jour ✨" />
                  ) : (
                    <ul className="space-y-1">
                      {data.pendingActions.slice(0, 6).map((a, i) => {
                        const overdue = a.due && a.due < new Date().toISOString().slice(0, 10);
                        return (
                          <li key={i}>
                            <button onClick={() => router.push(`/drive/coaching/${a.coachingId}/fiche`)} className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5">
                              <span className="mt-0.5 size-2 shrink-0 rounded-full" style={{ background: overdue ? "#ef4444" : "#f59e0b" }} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm">{a.text}</p>
                                <p className="truncate text-xs text-muted">{a.coacheeName}</p>
                              </div>
                              {a.due && (
                                <span className="shrink-0 text-xs tabular-nums" style={overdue ? { color: "#ef4444" } : { color: "#94a3b8" }}>{fmtDate(a.due)}</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              </div>

              {/* Coachés (aperçu progression) */}
              <Panel icon={Users} title="Coachés" className="mt-4" onSeeAll={() => router.push("/drive/accompagnement/coaches")}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.coachees.map((c) => {
                    const sm = statusMeta(c.status);
                    return (
                      <button key={c.id} onClick={() => router.push(`/drive/coaching/${c.id}`)} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.04]">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg text-white shadow" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}>
                          <HeartHandshake className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{c.coacheeName}</p>
                            <span className="size-1.5 shrink-0 rounded-full" style={{ background: sm.color }} title={sm.l} />
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <span className="block h-full rounded-full" style={{ width: `${c.progress}%`, background: c.progress >= 100 ? "#22c55e" : ACCENT }} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">{c.progress}%</p>
                          {c.nextSession ? (
                            <p className="text-[11px] text-cyan-300">{fmtDate(c.nextSession)}</p>
                          ) : c.openActions ? (
                            <p className="text-[11px] text-amber-400">{c.openActions} action{c.openActions > 1 ? "s" : ""}</p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, tint, label, value, sub }: { icon: typeof Users; tint: string; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg" style={{ background: tint + "1f", color: tint }}><Icon className="size-4" /></span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}{sub ? ` · ${sub}` : ""}</p>
    </div>
  );
}

function Panel({ icon: Icon, title, children, onSeeAll, className = "" }: { icon: typeof Users; title: string; children: React.ReactNode; onSeeAll?: () => void; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.02] p-4 ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4" style={{ color: ACCENT }} />
        <h2 className="text-sm font-semibold">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted transition hover:text-white">
            Tout voir <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="px-2 py-6 text-center text-sm text-white/40">{text}</p>;
}

function Empty({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="grid size-16 place-items-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}>
        <LayoutDashboard className="size-8" />
      </span>
      <h2 className="mt-5 text-lg font-semibold">Votre cockpit d'accompagnement</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted">Ajoutez un premier coaché pour voir ici vos séances à venir, vos actions et la progression de chacun.</p>
      <button onClick={onCreate} disabled={creating} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow disabled:opacity-60" style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}>
        {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Ajouter un coaché
      </button>
    </div>
  );
}
