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
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";

type Me = { name: string | null; email: string; storageUsed: number; storageLimit: number };

const NAV = [
  { href: "/drive", label: "Mon Drive", icon: HardDrive, exact: true },
  { href: "/drive/recent", label: "Récents", icon: Clock },
  { href: "/drive/starred", label: "Favoris", icon: Star },
  { href: "/drive/trash", label: "Corbeille", icon: Trash2 },
];

export function Sidebar({ initial }: { initial: Me }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(initial);

  useEffect(() => {
    const refresh = () => {
      fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setMe(d))
        .catch(() => {});
    };
    window.addEventListener("filehub:refresh", refresh);
    return () => window.removeEventListener("filehub:refresh", refresh);
  }, []);

  const pct = me.storageLimit
    ? Math.min(100, (me.storageUsed / me.storageLimit) * 100)
    : 0;
  const nearFull = pct > 90;

  return (
    <aside className="w-64 shrink-0 h-screen border-r border-line bg-surface flex flex-col">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-line">
        <div className="size-8 rounded-lg bg-brand-600 grid place-items-center">
          <Cloud className="size-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">FileHub</span>
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
                "flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition group",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink/70 hover:bg-canvas hover:text-ink",
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
              {active && <ChevronRight className="size-4 ml-auto text-brand-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Storage meter */}
      <div className="px-4 pb-3">
        <div className="rounded-2xl border border-line p-4 bg-canvas/50">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Cloud className="size-4 text-brand-500" />
            Stockage
          </div>
          <div className="h-2 rounded-full bg-line overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                nearFull ? "bg-red-500" : "bg-brand-500",
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
          <form action={logoutAction}>
            <button
              type="submit"
              title="Se déconnecter"
              className="size-8 grid place-items-center rounded-lg text-muted hover:bg-canvas hover:text-red-600 transition"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
