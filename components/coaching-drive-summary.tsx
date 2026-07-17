"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, CalendarClock, ListChecks, ClipboardList, ChevronDown, Activity } from "lucide-react";
import { api } from "@/lib/api";

type Status = "prospect" | "active" | "paused" | "done";
const STATUSES: { k: Status; label: string; color: string }[] = [
  { k: "prospect", label: "Prospect", color: "#a78bff" },
  { k: "active", label: "Actif", color: "#22c55e" },
  { k: "paused", label: "En pause", color: "#f59e0b" },
  { k: "done", label: "Terminé", color: "#64748b" },
];
const meta = (k: string) => STATUSES.find((s) => s.k === k) ?? STATUSES[1];
const ACCENT = "#06b6d4";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// Barre latérale de suivi (à droite du drive d'un coaché) : statut modifiable,
// progression, prochaine séance, actions en attente + accès rapide à la fiche.
export function CoachingDriveSummary({
  id, status: initialStatus, progress, openActions, nextSession, canEdit,
}: {
  id: string;
  status: string;
  progress: number;
  openActions: number;
  nextSession: string | null;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<Status>((["prospect", "active", "paused", "done"].includes(initialStatus) ? initialStatus : "active") as Status);
  const m = meta(status);

  const changeStatus = (s: Status) => {
    setStatus(s);
    api.setCoachingStatus(id, s).catch(() => {});
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <Activity className="size-4" style={{ color: ACCENT }} />
        <h3 className="text-sm font-semibold">Suivi</h3>
      </div>

      {/* Statut */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Statut</p>
        {canEdit ? (
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 size-2 -translate-y-1/2 rounded-full" style={{ background: m.color }} />
            <select
              value={status}
              onChange={(e) => changeStatus(e.target.value as Status)}
              className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.04] pl-6 pr-7 py-2 text-sm font-medium outline-none transition focus:border-white/25 [color-scheme:dark]"
              style={{ color: m.color }}
              title="Changer le statut"
            >
              {STATUSES.map((o) => (<option key={o.k} value={o.k} className="bg-[#0f1017] text-white">{o.label}</option>))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted" />
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium" style={{ background: m.color + "22", color: m.color }}>
            <span className="size-2 rounded-full" style={{ background: m.color }} />{m.label}
          </span>
        )}
      </div>

      {/* Progression */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted"><TrendingUp className="size-3.5" /> Progression</p>
          <span className="text-sm font-semibold tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full" style={{ width: `${progress}%`, background: progress >= 100 ? "#22c55e" : ACCENT }} />
        </div>
      </div>

      {/* Prochaine séance */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted"><CalendarClock className="size-3.5" /> Prochaine séance</p>
        <p className="mt-1 text-sm font-semibold">{fmtDate(nextSession)}</p>
      </div>

      {/* Actions en attente */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted"><ListChecks className="size-3.5" /> Actions en attente</p>
        <p className="mt-1 text-sm font-semibold" style={openActions ? { color: "#f59e0b" } : {}}>{openActions} action{openActions > 1 ? "s" : ""}</p>
      </div>

      {/* Accès rapide */}
      <Link href={`/drive/coaching/${id}/fiche`} className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-white">
        <ClipboardList className="size-4" /> Objectifs &amp; séances
      </Link>
    </aside>
  );
}
