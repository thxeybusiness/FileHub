"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, HeartHandshake, Plus, Loader2, Users, CalendarClock, ListChecks,
  Trash2, Search,
} from "lucide-react";
import { api, type CoachingSummary } from "@/lib/api";

const STATUSES: Record<string, { l: string; color: string }> = {
  prospect: { l: "Prospect", color: "#a78bff" },
  active: { l: "Actif", color: "#22c55e" },
  paused: { l: "En pause", color: "#f59e0b" },
  done: { l: "Terminé", color: "#64748b" },
};
const statusMeta = (k: string) => STATUSES[k] ?? STATUSES.active;
const ACCENT = "#06b6d4";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function AccompagnementHome() {
  const router = useRouter();
  const [items, setItems] = useState<CoachingSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    api.listAccompagnement().then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const { id } = await api.createAccompagnement();
      router.push(`/drive/coaching/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    await api.update(id, { trashed: true }).catch(() => load());
  };

  const filtered = (items ?? []).filter((it) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return it.name.toLowerCase().includes(q) || it.coacheeName.toLowerCase().includes(q);
  });

  const activeCount = (items ?? []).filter((i) => i.status === "active").length;

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
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          {items === null ? (
            <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <EmptyState onCreate={create} creating={creating} />
          ) : (
            <>
              {/* Résumé */}
              <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                  <Users className="size-3.5" /> {items.length} coaché{items.length > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                  <span className="size-1.5 rounded-full" style={{ background: "#22c55e" }} /> {activeCount} actif{activeCount > 1 ? "s" : ""}
                </span>
              </div>

              {filtered.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted">Aucun coaché ne correspond à « {query} ».</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((it) => {
                    const sm = statusMeta(it.status);
                    const title = it.coacheeName || it.name || "Coaché";
                    return (
                      <button
                        key={it.id}
                        onClick={() => router.push(`/drive/coaching/${it.id}`)}
                        className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white shadow" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}>
                            <HeartHandshake className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{title}</p>
                            <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: sm.color + "26", color: sm.color }}>
                              <span className="size-1.5 rounded-full" style={{ background: sm.color }} />{sm.l}
                            </span>
                          </div>
                          <span
                            onClick={(e) => remove(e, it.id)}
                            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-white/5 hover:text-red-400 group-hover:opacity-100"
                            title="Mettre à la corbeille"
                          >
                            <Trash2 className="size-4" />
                          </span>
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

                        {/* Méta */}
                        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
                          <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" /> {it.sessions} séance{it.sessions > 1 ? "s" : ""}</span>
                          <span className="inline-flex items-center gap-1" style={it.openActions ? { color: "#f59e0b" } : {}}><ListChecks className="size-3.5" /> {it.openActions} action{it.openActions > 1 ? "s" : ""}</span>
                          <span className="ml-auto truncate">{fmtWhen(it.updatedAt)}</span>
                        </div>
                      </button>
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
