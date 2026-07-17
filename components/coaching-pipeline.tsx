"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Columns3, Loader2, Plus, HeartHandshake, CalendarClock, ListChecks } from "lucide-react";
import { api, notifyRefresh, type CoachingOverview } from "@/lib/api";

type Card = CoachingOverview["coachees"][number];
type Status = "prospect" | "active" | "paused" | "done";

const COLUMNS: { k: Status; label: string; color: string }[] = [
  { k: "prospect", label: "Prospect", color: "#a78bff" },
  { k: "active", label: "Actif", color: "#22c55e" },
  { k: "paused", label: "En pause", color: "#f59e0b" },
  { k: "done", label: "Terminé", color: "#64748b" },
];
const ACCENT = "#06b6d4";

function fmtDate(d: string | null): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function CoachingPipeline() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  const load = useCallback(() => api.getCoachingOverview().then((o) => setCards(o.coachees)).catch(() => setCards([])), []);
  useEffect(() => {
    load();
    window.addEventListener("filehub:refresh", load);
    return () => window.removeEventListener("filehub:refresh", load);
  }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const { id } = await api.createAccompagnement();
      notifyRefresh();
      router.push(`/drive/coaching/${id}`);
    } catch { setCreating(false); }
  };

  // Change le statut : mise à jour optimiste puis appel API.
  const setStatus = useCallback((id: string, status: Status) => {
    setCards((prev) => (prev ? prev.map((c) => (c.id === id ? { ...c, status } : c)) : prev));
    api.setCoachingStatus(id, status).catch(() => load());
  }, [load]);

  const onDrop = (status: Status) => {
    if (dragId) {
      const card = (cards ?? []).find((c) => c.id === dragId);
      if (card && card.status !== status) setStatus(dragId, status);
    }
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <button onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden" title="Menu"><Menu className="size-5" /></button>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] shadow-lg shadow-cyan-500/30"><Columns3 className="size-5 text-white" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">Pipeline</h1>
          <p className="hidden sm:block text-xs text-muted">Vos coachés par statut — glissez pour déplacer</p>
        </div>
        <button onClick={create} disabled={creating} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white shadow disabled:opacity-60" style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}<span className="hidden sm:inline">Nouveau coaché</span>
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
        {cards === null ? (
          <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const colCards = cards.filter((c) => (c.status || "active") === col.k);
              return (
                <div
                  key={col.k}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(col.k); }}
                  onDragLeave={() => setOverCol((v) => (v === col.k ? null : v))}
                  onDrop={() => onDrop(col.k)}
                  className={`rounded-2xl border p-2.5 transition ${overCol === col.k ? "border-cyan-400/50 bg-cyan-500/[0.06]" : "border-white/10 bg-white/[0.02]"}`}
                >
                  <div className="mb-2.5 flex items-center gap-2 px-1">
                    <span className="size-2 rounded-full" style={{ background: col.color }} />
                    <h2 className="text-sm font-semibold">{col.label}</h2>
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-muted">{colCards.length}</span>
                  </div>

                  <div className="space-y-2 min-h-[60px]">
                    {colCards.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => { setDragId(null); setOverCol(null); }}
                        onClick={() => router.push(`/drive/coaching/${c.id}`)}
                        className={`group cursor-pointer rounded-xl border border-white/10 bg-[#0f1017]/60 p-3 transition hover:border-white/25 hover:bg-white/[0.04] ${dragId === c.id ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white shadow" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}><HeartHandshake className="size-4" /></span>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{c.coacheeName}</p>
                        </div>
                        <div className="mt-2.5">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted"><span>Progression</span><span className="tabular-nums">{c.progress}%</span></div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${c.progress}%`, background: c.progress >= 100 ? "#22c55e" : ACCENT }} /></div>
                        </div>
                        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted">
                          {c.nextSession && <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />{fmtDate(c.nextSession)}</span>}
                          {c.openActions > 0 && <span className="inline-flex items-center gap-1" style={{ color: "#f59e0b" }}><ListChecks className="size-3.5" />{c.openActions}</span>}
                          {/* Sélecteur de statut (mobile / sans glisser). */}
                          <select
                            value={c.status || "active"}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); setStatus(c.id, e.target.value as Status); }}
                            className="ml-auto rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-muted outline-none [color-scheme:dark]"
                            title="Changer le statut"
                          >
                            {COLUMNS.map((o) => (<option key={o.k} value={o.k} className="bg-[#0f1017]">{o.label}</option>))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {colCards.length === 0 && (
                      <p className="rounded-lg border border-dashed border-white/10 px-2 py-4 text-center text-[11px] text-white/30">Déposez un coaché ici</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
