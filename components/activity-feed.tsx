"use client";

import { useEffect, useState } from "react";
import {
  Menu,
  Activity as ActivityIcon,
  FilePlus2,
  Pencil,
  Trash2,
  RotateCcw,
  XCircle,
  Upload,
  Share2,
  Link2Off,
  FolderInput,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { api, type ActivityItem } from "@/lib/api";

type Meta = { icon: typeof ActivityIcon; verb: string; tint: string };

const ACTIONS: Record<string, Meta> = {
  created: { icon: FilePlus2, verb: "a créé", tint: "text-emerald-300 bg-emerald-500/10" },
  renamed: { icon: Pencil, verb: "a renommé", tint: "text-sky-300 bg-sky-500/10" },
  trashed: { icon: Trash2, verb: "a mis à la corbeille", tint: "text-amber-300 bg-amber-500/10" },
  restored: { icon: RotateCcw, verb: "a restauré", tint: "text-emerald-300 bg-emerald-500/10" },
  deleted: { icon: XCircle, verb: "a supprimé définitivement", tint: "text-red-300 bg-red-500/10" },
  uploaded: { icon: Upload, verb: "a importé", tint: "text-brand-200 bg-brand-500/10" },
  shared: { icon: Share2, verb: "a partagé", tint: "text-violet-300 bg-violet-500/10" },
  unshared: { icon: Link2Off, verb: "a arrêté de partager", tint: "text-white/60 bg-white/5" },
  moved: { icon: FolderInput, verb: "a déplacé", tint: "text-sky-300 bg-sky-500/10" },
  member_added: { icon: UserPlus, verb: "a ajouté", tint: "text-emerald-300 bg-emerald-500/10" },
  member_removed: { icon: UserMinus, verb: "a retiré", tint: "text-red-300 bg-red-500/10" },
  role_changed: { icon: ShieldCheck, verb: "a changé le rôle de", tint: "text-amber-300 bg-amber-500/10" },
};

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function ActivityFeed({ space }: { space?: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getActivity(space ?? null)
      .then((r) => setItems(r.activities))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [space]);

  // Regroupement par jour.
  const groups: { label: string; items: ActivityItem[] }[] = [];
  for (const it of items) {
    const label = dayLabel(it.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(it);
    else groups.push({ label, items: [it] });
  }

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
          <ActivityIcon className="size-5 text-brand-300 shrink-0" />
          <h1 className="text-lg font-semibold truncate">Activité</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="grid h-40 place-items-center text-muted">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5">
              <ActivityIcon className="size-7 text-muted" />
            </div>
            <p className="mt-4 text-sm font-medium">Aucune activité pour le moment</p>
            <p className="mt-1 text-sm text-muted">
              Les créations, imports, partages et changements de membres apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-8">
            {groups.map((g) => (
              <div key={g.label}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted first-letter:uppercase">
                  {g.label}
                </h2>
                <div className="space-y-1.5">
                  {g.items.map((it) => {
                    const meta = ACTIONS[it.action] ?? {
                      icon: ActivityIcon,
                      verb: it.action,
                      tint: "text-white/60 bg-white/5",
                    };
                    const Icon = meta.icon;
                    return (
                      <div
                        key={it.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition hover:bg-white/[0.05]"
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.tint}`}>
                          <Icon className="size-[18px]" />
                        </span>
                        <p className="min-w-0 flex-1 text-sm leading-snug">
                          <span className="font-medium">{it.actorName}</span>{" "}
                          <span className="text-muted">{meta.verb}</span>{" "}
                          <span className="font-medium text-white/90 break-words">{it.targetName}</span>
                        </p>
                        <span className="shrink-0 text-xs text-muted">{timeAgo(it.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
