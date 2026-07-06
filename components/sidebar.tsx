"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardDrive,
  Star,
  Clock,
  Trash2,
  Cloud,
  LogOut,
  ChevronRight,
  Users,
  Plus,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { api, notifyRefresh, type SpaceSummary } from "@/lib/api";
import { NameDialog } from "./name-dialog";
import { NotificationCenter } from "./notification-center";

type Me = { name: string | null; email: string; storageUsed: number; storageLimit: number };

const NAV = [
  { href: "/drive", label: "Mon Drive", icon: HardDrive, exact: true },
  { href: "/drive/recent", label: "Récents", icon: Clock },
  { href: "/drive/starred", label: "Favoris", icon: Star },
  { href: "/drive/trash", label: "Corbeille", icon: Trash2 },
];

export function Sidebar({ initial }: { initial: Me }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(initial);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [creatingSpace, setCreatingSpace] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  const loadSpaces = () => {
    api
      .listSpaces()
      .then((r) => setSpaces(r.spaces))
      .catch(() => {});
  };

  useEffect(() => {
    loadSpaces();
    const refresh = () => {
      fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setMe(d))
        .catch(() => {});
      loadSpaces();
    };
    window.addEventListener("filehub:refresh", refresh);
    return () => window.removeEventListener("filehub:refresh", refresh);
  }, []);

  async function createSpace(name: string) {
    const { space } = await api.createSpace(name);
    setCreatingSpace(false);
    loadSpaces();
    notifyRefresh();
    router.push(`/drive/space/${space.id}`);
  }

  const pct = me.storageLimit
    ? Math.min(100, (me.storageUsed / me.storageLimit) * 100)
    : 0;
  const nearFull = pct > 90;

  return (
    <aside className="relative z-10 w-64 shrink-0 h-screen border-r border-white/10 bg-white/[0.03] backdrop-blur-xl flex flex-col">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
        <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
          <Cloud className="size-5 text-white" />
        </span>
        <span className="text-lg font-bold tracking-tight">
          File<span className="text-white/50">'</span>Hub
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition group overflow-hidden",
                active
                  ? "bg-gradient-to-r from-brand-500/25 to-transparent text-white"
                  : "text-ink/70 hover:bg-white/5 hover:text-ink",
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#5b8bff] to-[#22d3ee]" />}
              <item.icon className={cn("size-[18px]", active && "text-brand-200")} />
              {item.label}
              {active && <ChevronRight className="size-4 ml-auto text-brand-300" />}
            </Link>
          );
        })}

        {/* Espaces communs */}
        <div className="pt-5">
          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Espaces</span>
            <button
              onClick={() => setCreatingSpace(true)}
              title="Créer un espace"
              className="grid size-6 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white transition"
            >
              <Plus className="size-4" />
            </button>
          </div>
          {spaces.length === 0 ? (
            <button
              onClick={() => setCreatingSpace(true)}
              className="flex w-full items-center gap-2 px-3 h-9 rounded-xl text-sm text-muted hover:bg-white/5 hover:text-ink transition"
            >
              <Plus className="size-4" /> Nouvel espace
            </button>
          ) : (
            spaces.map((s) => {
              const href = `/drive/space/${s.id}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={s.id}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition overflow-hidden",
                    active
                      ? "bg-gradient-to-r from-brand-500/25 to-transparent text-white"
                      : "text-ink/70 hover:bg-white/5 hover:text-ink",
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#5b8bff] to-[#22d3ee]" />}
                  <Users className={cn("size-[18px] shrink-0", active && "text-brand-200")} />
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto text-xs text-muted">{s.memberCount}</span>
                </Link>
              );
            })
          )}
        </div>
      </nav>

      {creatingSpace && (
        <NameDialog
          title="Nouvel espace commun"
          label="Nom de l'espace"
          initial="Mon équipe"
          confirmLabel="Créer"
          onCancel={() => setCreatingSpace(false)}
          onConfirm={createSpace}
        />
      )}

      {/* Storage meter */}
      <div className="px-4 pb-3">
        <div className="rounded-2xl border border-white/10 p-4 bg-white/[0.03]">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Cloud className="size-4 text-cyan-300" />
            Stockage
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                nearFull ? "bg-red-500" : "bg-gradient-to-r from-[#3b6dff] to-[#22d3ee]",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {formatBytes(me.storageUsed)} sur {formatBytes(me.storageLimit)}
          </p>
        </div>
      </div>

      {/* User */}
      <div className="px-3 pb-4 pt-1 border-t border-line">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="size-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center text-white text-sm font-semibold">
            {(me.name || me.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{me.name || "Utilisateur"}</p>
            <p className="text-xs text-muted truncate">{me.email}</p>
          </div>
          <NotificationCenter />
          <button
            onClick={logout}
            title="Se déconnecter"
            className="size-8 grid place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-red-600 transition"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
