"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Star, ChevronRight, Loader2 } from "lucide-react";
import { api, type CoachingSessionDoc } from "@/lib/api";

const ACCENT = "#0ea5e9";

function fmtDate(d: string | null): string {
  if (!d) return "Sans date";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// Fiche enrichie : liste les comptes-rendus de séance (documents « seance »)
// du drive du coaché, avec accès direct. Lecture seule (des liens) → OK même
// dans le <fieldset disabled> pour un membre lecteur.
export function CoachingReports({ id }: { id: string }) {
  const [items, setItems] = useState<CoachingSessionDoc[] | null>(null);

  useEffect(() => {
    let alive = true;
    api.getCoachingSessions(id).then((r) => { if (alive) setItems(r.sessions); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [id]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="size-4" style={{ color: ACCENT }} />
        <h2 className="flex-1 text-sm font-semibold">Comptes-rendus de séance</h2>
        {items && items.length > 0 && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-muted">{items.length}</span>
        )}
      </div>

      {items === null ? (
        <div className="flex items-center justify-center py-6 text-muted"><Loader2 className="size-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted">
          Aucun compte-rendu. Créez-en un depuis le drive du coaché (bouton « Nouveau » → Compte-rendu de séance).
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/drive/coaching/${id}/n/${s.id}`}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: ACCENT + "1f", color: ACCENT }}>
                <ClipboardList className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted">{fmtDate(s.date)}</p>
              </div>
              {s.rating ? (
                <span className="hidden shrink-0 items-center gap-0.5 sm:flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="size-3.5" style={{ color: n <= (s.rating ?? 0) ? "#f59e0b" : "#3a3a44" }} fill={n <= (s.rating ?? 0) ? "#f59e0b" : "none"} />
                  ))}
                </span>
              ) : null}
              <ChevronRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
