"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardDrive,
  Star,
  Clock,
  Activity as ActivityIcon,
  LayoutDashboard,
  Trash2,
  Cloud,
  LogOut,
  ChevronRight,
  Users,
  Plus,
  Sparkles,
  Crown,
  Gem,
  Building2,
  ShieldCheck,
  Settings,
  HeartHandshake,
  ChevronDown,
  X,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { hasAiAccess } from "@/lib/plans";
import { useRouter } from "next/navigation";
import { api, notifyRefresh, type SpaceSummary, type CoachingSummary } from "@/lib/api";
import { NameDialog } from "./name-dialog";
import { NotificationCenter } from "./notification-center";
import { InstallButton } from "./install-button";

type Me = {
  name: string | null;
  email: string;
  storageUsed: number;
  storageLimit: number;
  plan?: string;
};

const NAV = [
  { href: "/drive", label: "Mon Drive", icon: HardDrive, exact: true },
  { href: "/drive/assistant", label: "Assistant IA", icon: Sparkles },
  { href: "/drive/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/drive/recent", label: "Récents", icon: Clock },
  { href: "/drive/starred", label: "Favoris", icon: Star },
  { href: "/drive/activite", label: "Activité", icon: ActivityIcon },
  { href: "/drive/trash", label: "Corbeille", icon: Trash2 },
  { href: "/drive/settings", label: "Paramètres", icon: Settings },
];

// Navigation de l'espace « Accompagnement » (SaaS séparé : aucune option FileHub).
const COACHING_NAV = [
  { href: "/drive/accompagnement", label: "Mes coachés", icon: HeartHandshake, exact: true },
];

// Couleur de la pastille de statut d'un coaché dans la barre latérale.
const COACHEE_STATUS_COLOR: Record<string, string> = {
  prospect: "#a78bff",
  active: "#22c55e",
  paused: "#f59e0b",
  done: "#64748b",
};

export function Sidebar({ initial }: { initial: Me }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(initial);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [coachees, setCoachees] = useState<CoachingSummary[]>([]);
  const [creatingSpace, setCreatingSpace] = useState(false);
  // Tiroir mobile (sans effet sur le rendu ordinateur, géré par breakpoint lg).
  const [mobileOpen, setMobileOpen] = useState(false);
  // Sélecteur d'application (FileHub / extension Accompagnement).
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const inAccompagnement = pathname.startsWith("/drive/accompagnement") || pathname.startsWith("/drive/coaching");
  const goApp = (href: string) => { setSwitcherOpen(false); setMobileOpen(false); router.push(href); };

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

  // Liste des coachés affichée dans la barre latérale de l'espace Coaching.
  const loadCoachees = () => {
    api.listAccompagnement().then((r) => setCoachees(r.items)).catch(() => {});
  };
  useEffect(() => {
    if (!inAccompagnement) return;
    loadCoachees();
    const refresh = () => loadCoachees();
    window.addEventListener("filehub:refresh", refresh);
    return () => window.removeEventListener("filehub:refresh", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inAccompagnement, pathname]);

  async function createCoachee() {
    const { id } = await api.createAccompagnement();
    setMobileOpen(false);
    notifyRefresh();
    router.push(`/drive/coaching/${id}`);
  }

  // Ouverture/fermeture du tiroir mobile via un événement global (bouton menu).
  useEffect(() => {
    const toggle = () => setMobileOpen((v) => !v);
    window.addEventListener("filehub:sidebar", toggle);
    return () => window.removeEventListener("filehub:sidebar", toggle);
  }, []);

  // Referme le tiroir quand on change de page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function createSpace(name: string) {
    const { space } = await api.createSpace(name);
    setCreatingSpace(false);
    loadSpaces();
    notifyRefresh();
    router.push(`/drive/space/${space.id}`);
  }

  const isFounder = me.plan === "founder";
  const pct = isFounder
    ? 3 // barre symbolique : accès illimité
    : me.storageLimit
      ? Math.min(100, (me.storageUsed / me.storageLimit) * 100)
      : 0;
  const nearFull = !isFounder && pct > 90;

  return (
    <>
      {/* Fond sombre derrière le tiroir (mobile uniquement) */}
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 h-screen border-r border-white/10 bg-[#0b0b12] backdrop-blur-xl flex flex-col transition-transform duration-300",
          "lg:relative lg:z-10 lg:translate-x-0 lg:bg-white/[0.03]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className="relative h-16 flex items-center gap-1 px-3 border-b border-white/10">
        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/5"
          title="Changer d'application"
        >
          {inAccompagnement ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] shadow-lg shadow-cyan-500/30">
              <HeartHandshake className="size-5 text-white" />
            </span>
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
              <Cloud className="size-5 text-white" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
            {inAccompagnement ? "Accompagnement" : "FileHub"}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted transition", switcherOpen && "rotate-180")} />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white lg:hidden"
          title="Fermer"
        >
          <X className="size-5" />
        </button>

        {switcherOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
            <div
              className="absolute left-3 right-3 top-[3.75rem] z-50 rounded-2xl border border-white/10 bg-[#0f1017]/97 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-2xl"
              style={{ animation: "revealUp 0.15s both" }}
            >
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Applications</p>
              <button
                onClick={() => goApp("/drive")}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/5",
                  !inAccompagnement && "bg-white/[0.06]",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff]">
                  <Cloud className="size-4 text-white" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">FileHub</span>
                  <span className="block truncate text-xs text-muted">Vos fichiers & documents</span>
                </span>
                {!inAccompagnement && <ChevronRight className="size-4 shrink-0 text-brand-300" />}
              </button>
              <button
                onClick={() => goApp("/drive/accompagnement")}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/5",
                  inAccompagnement && "bg-white/[0.06]",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6]">
                  <HeartHandshake className="size-4 text-white" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Accompagnement</span>
                  <span className="block truncate text-xs text-muted">Suivi de vos coachés</span>
                </span>
                {inAccompagnement && <ChevronRight className="size-4 shrink-0 text-cyan-300" />}
              </button>
            </div>
          </>
        )}
      </div>

      {inAccompagnement ? (
        /* ── Navigation de l'espace Coaching (aucune option FileHub) ── */
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {COACHING_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition overflow-hidden",
                  active ? "bg-gradient-to-r from-cyan-500/25 to-transparent text-white" : "text-ink/70 hover:bg-white/5 hover:text-ink",
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#06b6d4] to-[#3b82f6]" />}
                <item.icon className={cn("size-[18px]", active && "text-cyan-200")} />
                {item.label}
                {active && <ChevronRight className="size-4 ml-auto text-cyan-300" />}
              </Link>
            );
          })}

          {/* Liste des coachés */}
          <div className="pt-5">
            <div className="flex items-center justify-between px-3 pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Coachés</span>
              <button
                onClick={createCoachee}
                title="Nouveau coaché"
                className="grid size-6 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white transition"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {coachees.length === 0 ? (
              <button
                onClick={createCoachee}
                className="flex w-full items-center gap-2 px-3 h-9 rounded-xl text-sm text-muted hover:bg-white/5 hover:text-ink transition"
              >
                <Plus className="size-4" /> Nouveau coaché
              </button>
            ) : (
              coachees.map((c) => {
                const href = `/drive/coaching/${c.id}`;
                const active = pathname === href;
                const title = c.coacheeName || c.name || "Coaché";
                const dot = COACHEE_STATUS_COLOR[c.status] ?? "#06b6d4";
                return (
                  <Link
                    key={c.id}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-medium transition overflow-hidden",
                      active
                        ? "bg-gradient-to-r from-cyan-500/25 to-transparent text-white"
                        : "text-ink/70 hover:bg-white/5 hover:text-ink",
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#06b6d4] to-[#3b82f6]" />}
                    <span className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
                      {title.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate flex-1">{title}</span>
                    {c.shared && <Users className="size-3.5 shrink-0 text-muted" />}
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: dot }} title={c.status} />
                  </Link>
                );
              })
            )}
          </div>
        </nav>
      ) : (
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.filter((item) => item.href !== "/drive/assistant" || hasAiAccess(me.plan ?? "free")).map((item) => {
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
      )}

      {creatingSpace && !inAccompagnement && (
        <NameDialog
          title="Nouvel espace commun"
          label="Nom de l'espace"
          initial="Mon équipe"
          confirmLabel="Créer"
          onCancel={() => setCreatingSpace(false)}
          onConfirm={createSpace}
        />
      )}

      {/* Chrome FileHub : masqué dans l'espace Coaching (SaaS séparé) */}
      {!inAccompagnement && (
        <>
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
                {isFounder
                  ? `${formatBytes(me.storageUsed)} · Illimité`
                  : `${formatBytes(me.storageUsed)} sur ${formatBytes(me.storageLimit)}`}
              </p>
            </div>
          </div>

          {/* Installer l'application (masqué si déjà installé) */}
          <div className="px-4 pb-2">
            <InstallButton variant="ghost" className="w-full py-2.5 text-sm" />
          </div>
        </>
      )}

      {/* User */}
      <div className="px-3 pb-4 pt-1 border-t border-line">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="size-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center text-white text-sm font-semibold">
            {(me.name || me.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{me.name || "Utilisateur"}</p>
              {isFounder ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f472b6] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow shadow-amber-500/30">
                  <Gem className="size-2.5" /> Fondateur
                </span>
              ) : me.plan === "business" ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f472b6] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow shadow-amber-500/30">
                  <Building2 className="size-2.5" /> Business
                </span>
              ) : me.plan === "premium" ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow shadow-blue-500/30">
                  <Crown className="size-2.5" /> Pro
                </span>
              ) : me.plan === "team" ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f472b6] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow shadow-amber-500/30">
                  <Users className="size-2.5" /> Team
                </span>
              ) : (
                <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
                  Basic
                </span>
              )}
            </div>
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

        {/* Abonnement & admin : options FileHub, masquées dans l'espace Coaching */}
        {!inAccompagnement && (
          <>
            {isFounder ? (
              <Link
                href="/drive/abonnement"
                className="mt-1 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-pink-500/10 text-xs font-semibold text-amber-200 transition hover:from-amber-500/20 hover:to-pink-500/20"
              >
                <Gem className="size-3.5" /> Accès illimité à vie
              </Link>
            ) : me.plan === "premium" || me.plan === "business" ? (
              <Link
                href="/drive/abonnement"
                className="mt-1 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 text-xs font-medium text-white/80 hover:bg-white/5 transition"
              >
                <Crown className="size-3.5 text-amber-300" /> Gérer mon abonnement
              </Link>
            ) : (
              <Link
                href="/drive/abonnement"
                className="group relative mt-1 flex h-9 items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40"
              >
                <Sparkles className="size-3.5" /> Passer à Pro
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent" style={{ animation: "shine 3.5s ease-in-out infinite" }} />
              </Link>
            )}
            {isFounder && (
              <Link
                href="/drive/admin"
                className="mt-1 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 text-xs font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <ShieldCheck className="size-3.5 text-amber-300" /> Admin — grades
              </Link>
            )}
          </>
        )}
      </div>
      </aside>
    </>
  );
}
