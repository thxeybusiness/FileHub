"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, CalendarClock, ListChecks, ClipboardList, ChevronDown } from "lucide-react";
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
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Bandeau de suivi affiché en haut du drive d'un coaché : statut modifiable,
// progression, prochaine séance, actions en attente + accès rapide au CR.
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
    <div className="shrink-0 border-b border-white/10 bg-white/[0.02] px-4 sm:px-6 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Statut (modifiable) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Statut</span>
          {canEdit ? (
            <div className="relative inline-flex items-center">
              <span className="pointer-events-none absolute left-2 size-1.5 rounded-full" style={{ background: m.color }} />
              <select
                value={status}
                onChange={(e) => changeStatus(e.target.value as Status)}
                className="appearance-none rounded-lg border border-white/10 bg-white/[0.04] pl-5 pr-6 py-1 text-xs font-medium outline-none [color-scheme:dark]"
                style={{ color: m.color }}
                title="Changer le statut"
              >
                {STATUSES.map((o) => (<option key={o.k} value={o.k} className="bg-[#0f1017] text-white">{o.label}</option>))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5 text-muted" />
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium" style={{ background: m.color + "22", color: m.color }}>
              <span className="size-1.5 rounded-full" style={{ background: m.color }} />{m.label}
            </span>
          )}
        </div>

        {/* Progression */}
        <div className="flex min-w-[140px] items-center gap-2">
          <TrendingUp className="size-3.5 shrink-0 text-muted" />
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full" style={{ width: `${progress}%`, background: progress >= 100 ? "#22c55e" : ACCENT }} />
          </div>
          <span className="text-xs font-semibold tabular-nums">{progress}%</span>
        </div>

        {/* Prochaine séance */}
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <CalendarClock className="size-3.5" /> Prochaine séance : <span className="font-medium text-white">{fmtDate(nextSession)}</span>
        </div>

        {/* Actions en attente */}
        <div className="flex items-center gap-1.5 text-xs" style={openActions ? { color: "#f59e0b" } : { color: "#94a3b8" }}>
          <ListChecks className="size-3.5" /> {openActions} action{openActions > 1 ? "s" : ""} en attente
        </div>

        {/* Accès rapide */}
        <Link href={`/drive/coaching/${id}/fiche`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white">
          <ClipboardList className="size-3.5" /> Objectifs & séances
        </Link>
      </div>
    </div>
  );
}
