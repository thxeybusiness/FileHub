"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Menu,
  LayoutDashboard,
  Folder,
  File as FileIcon,
  FileText,
  Sheet,
  BarChart3,
  Pencil,
  Presentation,
  KanbanSquare,
  FolderKanban,
  StickyNote,
  Workflow,
  Share2,
  Users,
  Trash2,
  Cloud,
  Crown,
  Gem,
  Loader2,
} from "lucide-react";
import { api, type DashboardStats } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; icon: typeof FileIcon; tint: string }> = {
  folder: { label: "Dossiers", icon: Folder, tint: "text-amber-300 bg-amber-500/10" },
  file: { label: "Fichiers", icon: FileIcon, tint: "text-sky-300 bg-sky-500/10" },
  doc: { label: "Documents", icon: FileText, tint: "text-blue-300 bg-blue-500/10" },
  sheet: { label: "Feuilles", icon: Sheet, tint: "text-emerald-300 bg-emerald-500/10" },
  chart: { label: "Graphiques", icon: BarChart3, tint: "text-violet-300 bg-violet-500/10" },
  draw: { label: "Dessins", icon: Pencil, tint: "text-pink-300 bg-pink-500/10" },
  slides: { label: "Présentations", icon: Presentation, tint: "text-rose-300 bg-rose-500/10" },
  board: { label: "Kanban", icon: KanbanSquare, tint: "text-orange-300 bg-orange-500/10" },
  project: { label: "Tableaux", icon: FolderKanban, tint: "text-violet-300 bg-violet-500/10" },
  note: { label: "Notes", icon: StickyNote, tint: "text-yellow-300 bg-yellow-500/10" },
  diagram: { label: "Diagrammes", icon: Workflow, tint: "text-teal-300 bg-teal-500/10" },
};

const TYPE_ORDER = ["folder", "file", "doc", "sheet", "chart", "draw", "slides", "board", "project", "note", "diagram"];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboard()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const founder = stats?.plan === "founder";
  const pct =
    stats && stats.storageLimit && !founder
      ? Math.min(100, (stats.storageUsed / stats.storageLimit) * 100)
      : founder
        ? 3
        : 0;

  return (
    <div className="flex h-full flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 px-4 sm:px-6 flex items-center gap-2 sm:gap-4 bg-white/[0.03] backdrop-blur-xl">
        <button
          onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden"
          title="Menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <LayoutDashboard className="size-5 text-brand-300 shrink-0" />
          <h1 className="text-lg font-semibold truncate">Tableau de bord</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="grid h-40 place-items-center text-muted">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !stats ? (
          <p className="text-sm text-muted">Impossible de charger les statistiques.</p>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Stockage */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Cloud className="size-4 text-cyan-300" /> Stockage
                {founder && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                    <Gem className="size-3" /> Illimité
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="text-2xl font-bold">
                  {formatBytes(stats.storageUsed)}
                  {!founder && (
                    <span className="text-base font-normal text-muted">
                      {" "}
                      / {formatBytes(stats.storageLimit)}
                    </span>
                  )}
                </p>
                {!founder && stats.plan !== "premium" && stats.plan !== "business" && (
                  <Link
                    href="/drive/abonnement"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25"
                  >
                    <Crown className="size-3.5" /> Passer à Pro
                  </Link>
                )}
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${pct > 90 && !founder ? "bg-red-500" : "bg-gradient-to-r from-[#3b6dff] to-[#22d3ee]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </section>

            {/* Compteurs clés */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={FileIcon} label="Éléments" value={stats.totalCount} tint="text-sky-300 bg-sky-500/10" />
              <StatCard icon={Share2} label="Partages" value={stats.sharesCount} tint="text-violet-300 bg-violet-500/10" />
              <StatCard icon={Users} label="Espaces" value={stats.spacesCount} tint="text-emerald-300 bg-emerald-500/10" />
              <StatCard icon={Trash2} label="Corbeille" value={stats.trashedCount} tint="text-amber-300 bg-amber-500/10" />
            </section>

            {/* Répartition par type */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="mb-4 text-sm font-semibold">Répartition</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TYPE_ORDER.map((t) => {
                  const meta = TYPE_META[t];
                  const d = stats.byType[t];
                  const count = d?.count ?? 0;
                  const Icon = meta.icon;
                  return (
                    <div key={t} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.tint}`}>
                        <Icon className="size-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{count}</p>
                        <p className="truncate text-xs text-muted">{meta.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Plus gros fichiers */}
            {stats.biggest.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <h2 className="mb-4 text-sm font-semibold">Fichiers les plus volumineux</h2>
                <div className="space-y-1.5">
                  {stats.biggest.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-muted">
                        <FileIcon className="size-4" />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm">{f.name}</p>
                      <span className="shrink-0 text-xs font-medium text-muted">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof FileIcon;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className={`grid size-9 place-items-center rounded-xl ${tint}`}>
        <Icon className="size-[18px]" />
      </span>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
