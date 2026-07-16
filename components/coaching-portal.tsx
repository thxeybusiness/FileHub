"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Target, ListChecks, ClipboardList, FolderOpen, Sparkles,
  Check, Loader2, ChevronRight, Star, CalendarClock, Folder as FolderIcon, FileText,
} from "lucide-react";
import { api, type CoachingSessionDoc } from "@/lib/api";
import { NodeIcon } from "./file-icon";

export type PortalObjective = { id: string; title: string; progress: number; done: boolean };
export type PortalAction = { id: string; text: string; due: string | null; done: boolean };
export type PortalResource = { id: string; name: string; type: string };

const ACCENT = "#06b6d4";

function fmtDate(d: string | null): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// Portail du coaché : vue simplifiée et accueillante, pensée pour la personne
// accompagnée (ses objectifs, ses actions, ses comptes-rendus, ses ressources).
export function CoachingPortal({
  id, coacheeName, canEdit, objectives, actions, resources,
}: {
  id: string;
  coacheeName: string;
  canEdit: boolean;
  objectives: PortalObjective[];
  actions: PortalAction[];
  resources: PortalResource[];
}) {
  const [reports, setReports] = useState<CoachingSessionDoc[] | null>(null);
  const firstName = (coacheeName || "").trim().split(/\s+/)[0] || coacheeName;

  useEffect(() => {
    api.getCoachingSessions(id).then((r) => setReports(r.sessions)).catch(() => setReports([]));
  }, [id]);

  const globalProgress = objectives.length
    ? Math.round(objectives.reduce((s, o) => s + (o.done ? 100 : o.progress), 0) / objectives.length)
    : 0;
  const todo = actions.filter((a) => !a.done);

  const resourceHref = (r: PortalResource) =>
    r.type === "folder" ? `/drive/coaching/${id}/folder/${r.id}` : `/drive/coaching/${id}/n/${r.id}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-14 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={`/drive/coaching/${id}`} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour au drive">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Portail</p>
        </div>
        {canEdit && (
          <Link href={`/drive/coaching/${id}/fiche`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white">
            Fiche complète
          </Link>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
          {/* Bandeau d'accueil */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/[0.12] to-blue-500/[0.06] p-6">
            <div className="flex items-center gap-2 text-sm text-cyan-200"><Sparkles className="size-4" /> Ton accompagnement</div>
            <h1 className="mt-1 text-2xl font-bold">Bonjour {firstName} 👋</h1>
            <p className="mt-1 text-sm text-muted">Retrouve ici tes objectifs, tes actions et tes comptes-rendus.</p>
            {objectives.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-muted"><span>Progression globale</span><span className="tabular-nums">{globalProgress}%</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full" style={{ width: `${globalProgress}%`, background: globalProgress >= 100 ? "#22c55e" : ACCENT }} />
                </div>
              </div>
            )}
          </div>

          {/* Objectifs */}
          {objectives.length > 0 && (
            <Block icon={Target} title="Tes objectifs">
              <div className="space-y-3">
                {objectives.map((o) => (
                  <div key={o.id}>
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      {o.done && <Check className="size-4 shrink-0 text-emerald-400" />}
                      <span className={o.done ? "text-muted line-through" : ""}>{o.title}</span>
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">{o.done ? 100 : o.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full" style={{ width: `${o.done ? 100 : o.progress}%`, background: o.done ? "#22c55e" : ACCENT }} />
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* Actions */}
          <Block icon={ListChecks} title="Tes actions" badge={todo.length ? `${todo.length} à faire` : undefined}>
            {actions.length === 0 ? (
              <Empty text="Aucune action pour le moment." />
            ) : (
              <ul className="space-y-1.5">
                {actions.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-md border" style={a.done ? { background: "#22c55e", borderColor: "#22c55e" } : { borderColor: "#ffffff30" }}>
                      {a.done && <Check className="size-3.5 text-black" />}
                    </span>
                    <span className={`min-w-0 flex-1 text-sm ${a.done ? "text-muted line-through" : ""}`}>{a.text}</span>
                    {a.due && !a.done && <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-amber-400"><CalendarClock className="size-3" />{fmtDate(a.due)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {/* Comptes-rendus */}
          <Block icon={ClipboardList} title="Tes comptes-rendus">
            {reports === null ? (
              <div className="flex justify-center py-4 text-muted"><Loader2 className="size-5 animate-spin" /></div>
            ) : reports.length === 0 ? (
              <Empty text="Aucun compte-rendu partagé pour l'instant." />
            ) : (
              <div className="space-y-1.5">
                {reports.map((s) => (
                  <Link key={s.id} href={`/drive/coaching/${id}/n/${s.id}`} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.05]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: "#0ea5e91f", color: "#0ea5e9" }}><ClipboardList className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted">{fmtDate(s.date) || "Sans date"}</p>
                    </div>
                    {s.rating ? (
                      <span className="hidden shrink-0 items-center gap-0.5 sm:flex">
                        {[1, 2, 3, 4, 5].map((n) => (<Star key={n} className="size-3.5" style={{ color: n <= (s.rating ?? 0) ? "#f59e0b" : "#3a3a44" }} fill={n <= (s.rating ?? 0) ? "#f59e0b" : "none"} />))}
                      </span>
                    ) : null}
                    <ChevronRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            )}
          </Block>

          {/* Ressources */}
          {resources.length > 0 && (
            <Block icon={FolderOpen} title="Ressources">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {resources.map((r) => (
                  <Link key={r.id} href={resourceHref(r)} className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.05]">
                    <NodeIcon type={r.type as "file"} name={r.name} size={18} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            </Block>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ icon: Icon, title, children, badge }: { icon: typeof Target; title: string; children: React.ReactNode; badge?: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4" style={{ color: ACCENT }} />
        <h2 className="text-sm font-semibold">{title}</h2>
        {badge && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-muted">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted">{text}</p>;
}
