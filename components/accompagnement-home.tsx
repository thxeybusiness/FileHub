"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, HeartHandshake, Plus, Loader2, Users, CalendarClock, ListChecks,
  Trash2, Search, Target, TrendingUp, CalendarDays, Sparkles, ChevronRight,
} from "lucide-react";
import { api, notifyRefresh, type CoachingSummary } from "@/lib/api";

// Statuts d'un coaché, dans l'ordre du cycle de vie (prospect → actif → …).
const STATUS_ORDER = ["prospect", "active", "paused", "done"] as const;
type StatusKey = (typeof STATUS_ORDER)[number];
const STATUSES: Record<StatusKey, { l: string; plural: string; color: string; hint: string }> = {
  prospect: { l: "Prospect", plural: "Prospects", color: "#a78bff", hint: "À convertir" },
  active: { l: "Actif", plural: "Actifs", color: "#22c55e", hint: "Accompagnement en cours" },
  paused: { l: "En pause", plural: "En pause", color: "#f59e0b", hint: "En attente / suspendu" },
  done: { l: "Terminé", plural: "Terminés", color: "#64748b", hint: "Accompagnement clôturé" },
};
const statusMeta = (k: string) => STATUSES[(k as StatusKey)] ?? STATUSES.active;
const normStatus = (k: string): StatusKey => (STATUS_ORDER.includes(k as StatusKey) ? (k as StatusKey) : "active");
const ACCENT = "#06b6d4";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDay(day: string | null): string {
  if (!day) return "";
  const d = new Date(day + "T00:00:00");
  if (isNaN(d.getTime())) return day;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function AccompagnementHome() {
  const router = useRouter();
  const [items, setItems] = useState<CoachingSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | StatusKey>("all");

  const load = useCallback(() => {
    api.listAccompagnement().then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const { id } = await api.createAccompagnement();
      notifyRefresh();
      router.push(`/drive/coaching/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    await api.update(id, { trashed: true }).catch(() => load());
    notifyRefresh();
  };

  const all = items ?? [];

  // Recherche (nom / coaché).
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((it) => it.name.toLowerCase().includes(q) || it.coacheeName.toLowerCase().includes(q));
  }, [all, query]);

  // Comptes par statut (sur l'ensemble, indépendamment de la recherche).
  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { prospect: 0, active: 0, paused: 0, done: 0 };
    for (const it of all) c[normStatus(it.status)]++;
    return c;
  }, [all]);

  // Statistiques globales.
  const stats = useMemo(() => {
    const withObj = all.filter((i) => i.objectives > 0);
    const avgProgress = withObj.length
      ? Math.round(withObj.reduce((s, i) => s + i.progress, 0) / withObj.length)
      : 0;
    const openActions = all.reduce((s, i) => s + i.openActions, 0);
    const upcoming = all.filter((i) => i.nextSession).length;
    return { total: all.length, avgProgress, openActions, upcoming };
  }, [all]);

  // Regroupement par statut, dans l'ordre du cycle de vie, après recherche + filtre.
  const groups = useMemo(() => {
    const base = filter === "all" ? searched : searched.filter((it) => normStatus(it.status) === filter);
    return STATUS_ORDER
      .map((key) => ({ key, items: base.filter((it) => normStatus(it.status) === key) }))
      .filter((g) => g.items.length > 0);
  }, [searched, filter]);

  const TABS: { key: "all" | StatusKey; label: string; count: number; color?: string }[] = [
    { key: "all", label: "Tous", count: all.length },
    ...STATUS_ORDER.filter((k) => counts[k] > 0).map((k) => ({
      key: k, label: STATUSES[k].plural, count: counts[k], color: STATUSES[k].color,
    })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden"
          title="Menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] shadow-lg shadow-cyan-500/30">
          <HeartHandshake className="size-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">Accompagnement</h1>
          <p className="hidden sm:block text-xs text-muted">Suivi de vos coachés</p>
        </div>
        <div className="relative hidden sm:flex items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 w-44 rounded-lg border border-white/10 bg-white/5 pl-8 pr-2 text-sm outline-none focus:border-white/20"
          />
        </div>
        <button
          onClick={create}
          disabled={creating}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white shadow disabled:opacity-60"
          style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <span className="hidden sm:inline">Nouveau coaché</span>
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          {items === null ? (
            <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          ) : all.length === 0 ? (
            <EmptyState onCreate={create} creating={creating} />
          ) : (
            <>
              {/* KPI */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Kpi icon={Users} label="Coachés" value={stats.total} tint="#06b6d4" />
                <Kpi icon={Sparkles} label="Actifs" value={counts.active} tint="#22c55e" />
                <Kpi icon={Target} label="Prospects" value={counts.prospect} tint="#a78bff" />
                <Kpi icon={TrendingUp} label="Progression moy." value={`${stats.avgProgress}%`} tint="#3b82f6" />
                <Kpi icon={CalendarDays} label="Séances à venir" value={stats.upcoming} tint="#f59e0b" />
              </div>

              {/* Onglets de filtre par statut */}
              <div className="mt-5 flex flex-wrap items-center gap-1.5">
                {TABS.map((t) => {
                  const on = filter === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setFilter(t.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        on ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-muted hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {t.color && <span className="size-1.5 rounded-full" style={{ background: t.color }} />}
                      {t.label}
                      <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${on ? "bg-white/15 text-white" : "bg-white/5 text-muted"}`}>{t.count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Groupes par statut */}
              {groups.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted">
                  {query.trim() ? `Aucun coaché ne correspond à « ${query} ».` : "Aucun coaché dans cette catégorie."}
                </p>
              ) : (
                <div className="mt-6 space-y-8">
                  {groups.map((g) => {
                    const sm = STATUSES[g.key];
                    return (
                      <section key={g.key}>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: sm.color }} />
                          <h2 className="text-sm font-semibold text-white">{sm.plural}</h2>
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted tabular-nums">{g.items.length}</span>
                          <span className="hidden text-xs text-muted sm:inline">· {sm.hint}</span>
                          <span className="ml-2 h-px flex-1 bg-white/5" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {g.items.map((it) => (
                            <CoacheeCard key={it.id} it={it} onOpen={() => router.push(`/drive/coaching/${it.id}`)} onRemove={(e) => remove(e, it.id)} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tint }: { icon: typeof Users; label: string; value: string | number; tint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: tint + "22", color: tint }}>
          <Icon className="size-4" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function CoacheeCard({ it, onOpen, onRemove }: { it: CoachingSummary; onOpen: () => void; onRemove: (e: React.MouseEvent) => void }) {
  const sm = statusMeta(it.status);
  const title = it.coacheeName || it.name || "Coaché";
  return (
    <button
      onClick={onOpen}
      className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div className="flex items-start gap-3">
        <span className="relative grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}>
          {title.charAt(0).toUpperCase()}
          <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[#0b0b12]" style={{ background: sm.color }} title={sm.l} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: sm.color + "26", color: sm.color }}>
              {sm.l}
            </span>
            {it.shared && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted">
                <Users className="size-3" /> Partagé
              </span>
            )}
          </div>
        </div>
        {!it.shared && (
          <span
            onClick={onRemove}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-white/5 hover:text-red-400 group-hover:opacity-100"
            title="Mettre à la corbeille"
          >
            <Trash2 className="size-4" />
          </span>
        )}
      </div>

      {/* Progression */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
          <span>Progression</span><span className="tabular-nums">{it.progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full" style={{ width: `${it.progress}%`, background: it.progress >= 100 ? "#22c55e" : ACCENT }} />
        </div>
      </div>

      {/* Compteurs */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1"><Target className="size-3.5" /> {it.objectives} objectif{it.objectives > 1 ? "s" : ""}</span>
        <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" /> {it.sessions} séance{it.sessions > 1 ? "s" : ""}</span>
        <span className="inline-flex items-center gap-1" style={it.openActions ? { color: "#f59e0b" } : {}}><ListChecks className="size-3.5" /> {it.openActions} action{it.openActions > 1 ? "s" : ""}</span>
      </div>

      {/* Prochaine séance / dernière activité */}
      <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/5 pt-2.5 text-[11px]">
        {it.nextSession ? (
          <span className="inline-flex items-center gap-1 font-medium text-cyan-300">
            <CalendarDays className="size-3.5" /> Prochaine séance · {fmtDay(it.nextSession)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted">
            <CalendarDays className="size-3.5" /> Aucune séance planifiée
          </span>
        )}
        <span className="ml-auto inline-flex items-center text-muted/70">
          {fmtWhen(it.updatedAt)}<ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="grid size-16 place-items-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}>
        <HeartHandshake className="size-8" />
      </span>
      <h2 className="mt-5 text-lg font-semibold">Votre espace d'accompagnement</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted">
        Suivez chaque personne que vous accompagnez : objectifs, séances, actions et notes, au même endroit.
      </p>
      <button
        onClick={onCreate}
        disabled={creating}
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow disabled:opacity-60"
        style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}
      >
        {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Ajouter un premier coaché
      </button>
    </div>
  );
}
