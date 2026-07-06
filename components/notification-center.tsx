"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Users, UserPlus, FolderPlus, Sparkles } from "lucide-react";
import { api, type Notif } from "@/lib/api";
import { cn, formatRelative } from "@/lib/utils";

const ICON: Record<string, typeof Bell> = {
  space_created: FolderPlus,
  space_joined: Sparkles,
  member_joined: UserPlus,
  space_invited: Users,
};
const TINT: Record<string, string> = {
  space_created: "#5b8bff",
  space_joined: "#22d3ee",
  member_joined: "#34d399",
  space_invited: "#a78bff",
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api
      .getNotifications()
      .then((r) => {
        setUnread(r.unread);
        setItems(r.notifications);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 25000);
    window.addEventListener("filehub:refresh", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("filehub:refresh", load);
    };
  }, [load]);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      api.markNotificationsRead().then(() => setUnread(0)).catch(() => {});
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        title="Notifications"
        className={cn(
          "relative grid size-8 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white",
          open && "bg-white/10 text-white",
        )}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 h-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#0b0b12] animate-in">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 left-3 z-50 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl shadow-2xl animate-in">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <Bell className="size-4 text-brand-300" />
            <span className="text-sm font-semibold">Notifications</span>
            {items.length > 0 && (
              <button
                onClick={() => {
                  api.markNotificationsRead().then(() => {
                    setUnread(0);
                    setItems((it) => it.map((n) => ({ ...n, read: true })));
                  });
                }}
                className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-white"
              >
                <Check className="size-3.5" /> Tout lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <div className="grid place-items-center py-10 text-center text-sm text-muted">
                <Bell className="size-6 mb-2 opacity-40" />
                Aucune notification
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.type] ?? Bell;
                const tint = TINT[n.type] ?? "#8eb6ff";
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition",
                      !n.read && "bg-brand-500/[0.07]",
                    )}
                  >
                    <span
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
                      style={{ background: `${tint}22` }}
                    >
                      <Icon className="size-4" style={{ color: tint }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      {n.body && <p className="text-xs text-muted mt-0.5">{n.body}</p>}
                      <p className="text-[11px] text-muted/70 mt-1">{formatRelative(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-400" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
