"use client";

import type { Peer } from "./use-collab";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Pastilles des collaborateurs présents dans le document (temps réel).
 * Un point vert clignote sur ceux qui sont en train de modifier.
 */
export function CollabBar({ peers }: { peers: Peer[] }) {
  if (!peers.length) return null;
  const shown = peers.slice(0, 4);
  const extra = peers.length - shown.length;
  const editing = peers.filter((p) => p.editing).length;
  return (
    <div className="flex items-center gap-2" title={peers.map((p) => p.name + (p.editing ? " (modifie…)" : "")).join(", ")}>
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <span
            key={p.userId}
            className="relative grid size-7 place-items-center rounded-full border-2 border-[#0b0d14] text-[10px] font-bold text-white shadow"
            style={{ background: p.color }}
          >
            {initials(p.name)}
            {p.editing && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-[#0b0d14]" />}
          </span>
        ))}
        {extra > 0 && (
          <span className="grid size-7 place-items-center rounded-full border-2 border-[#0b0d14] bg-white/10 text-[10px] font-bold text-white/80">+{extra}</span>
        )}
      </div>
      <span className="hidden text-xs text-muted sm:inline">
        {peers.length === 1 ? "1 personne" : `${peers.length} personnes`}{editing > 0 ? " · en train d'éditer" : ""}
      </span>
    </div>
  );
}
