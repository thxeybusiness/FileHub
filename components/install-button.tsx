"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, Share, Plus, MoreVertical, Check, Menu, Monitor, Smartphone, Laptop, Sparkles, type LucideIcon } from "lucide-react";

// Événement navigateur (Chrome / Edge / Android) permettant de déclencher
// l'installation. Non standardisé -> typage minimal local.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Bouton « Installer l'application ».
 * - Un clic ouvre toujours une fenêtre qui explique la marche à suivre pour
 *   chaque appareil (iPhone/iPad, Android, Mac, PC).
 * - Si le navigateur le permet (Chrome/Edge/Android), un bouton « Installer
 *   maintenant » lance l'installation native en un clic.
 * - Masqué automatiquement si l'app est déjà installée (mode standalone).
 */
export function InstallButton({
  variant = "solid",
  className = "",
}: {
  variant?: "solid" | "ghost" | "icon";
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isStandalone()) setInstalled(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); setOpen(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  if (!mounted || installed) return null;

  const base = "group inline-flex items-center justify-center gap-2 font-semibold transition";
  const styles =
    variant === "solid"
      ? "rounded-full bg-white/10 border border-white/15 px-7 py-3.5 text-white backdrop-blur hover:bg-white/15 hover:border-white/25"
      : variant === "ghost"
        ? "rounded-full border border-white/15 bg-white/5 px-6 py-3 text-white backdrop-blur hover:bg-white/10"
        : "size-10 rounded-full text-white/80 hover:bg-white/10";

  return (
    <>
      <button onClick={() => setOpen(true)} className={`${base} ${styles} ${className}`} title="Installer FileHub sur votre appareil">
        <Download className="size-4 transition-transform group-hover:translate-y-0.5" />
        {variant !== "icon" && <span>Installer l&apos;application</span>}
      </button>

      {open && typeof document !== "undefined" &&
        createPortal(<InstallModal canInstall={!!deferred} onInstall={install} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

// ── Détection de la plateforme (onglet par défaut) ───────────────────
function defaultTab(): TabKey {
  if (typeof navigator === "undefined") return "pc";
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && (navigator as Navigator).maxTouchPoints > 1);
  if (isIOS) return "iphone";
  if (/android/i.test(ua)) return "android";
  if (/macintosh|mac os x/i.test(ua)) {
    const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edg\/|opr\//i.test(ua);
    return isSafari ? "mac" : "pc";
  }
  return "pc";
}

type TabKey = "iphone" | "android" | "mac" | "pc";
type Tab = { k: TabKey; label: string; short: string; icon: LucideIcon; intro: string; steps: { icon: LucideIcon; text: string }[] };

const TABS: Tab[] = [
  {
    k: "iphone", label: "iPhone / iPad", short: "iPhone", icon: Smartphone,
    intro: "Ajoutez FileHub à votre écran d'accueil, en plein écran comme une vraie app.",
    steps: [
      { icon: Share, text: "Dans Safari, appuyez sur le bouton Partager (le carré avec une flèche vers le haut)." },
      { icon: Plus, text: "Faites défiler et choisissez « Sur l'écran d'accueil »." },
      { icon: Check, text: "Appuyez sur « Ajouter » : l'icône FileHub apparaît sur votre écran." },
    ],
  },
  {
    k: "android", label: "Android", short: "Android", icon: Smartphone,
    intro: "Installez FileHub comme une application depuis Chrome.",
    steps: [
      { icon: MoreVertical, text: "Ouvrez le menu ⋮ en haut à droite du navigateur." },
      { icon: Download, text: "Touchez « Installer l'application » (ou « Ajouter à l'écran d'accueil »)." },
      { icon: Check, text: "Confirmez : FileHub s'installe et s'ouvre comme une vraie app." },
    ],
  },
  {
    k: "mac", label: "Mac · Safari", short: "Mac", icon: Laptop,
    intro: "Sur Mac, ajoutez FileHub au Dock pour l'ouvrir dans sa propre fenêtre.",
    steps: [
      { icon: Share, text: "Dans Safari, cliquez sur le bouton Partager de la barre d'outils." },
      { icon: Plus, text: "Choisissez « Ajouter au Dock… » puis validez." },
      { icon: Check, text: "FileHub apparaît dans le Dock et le Launchpad, comme une app." },
    ],
  },
  {
    k: "pc", label: "PC · Chrome / Edge", short: "PC", icon: Monitor,
    intro: "Installez FileHub sur votre ordinateur : il s'ouvre dans sa propre fenêtre, sans barre du navigateur.",
    steps: [
      { icon: Monitor, text: "Cliquez sur l'icône d'installation (un écran avec ⊕) à droite de la barre d'adresse." },
      { icon: Menu, text: "Ou ouvrez le menu ⋮ → « Installer FileHub… »." },
      { icon: Check, text: "Confirmez : FileHub s'installe et se lance comme une application." },
    ],
  },
];

function InstallModal({ canInstall, onInstall, onClose }: { canInstall: boolean; onInstall: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<TabKey>(defaultTab);
  const active = useMemo(() => TABS.find((t) => t.k === tab) ?? TABS[3], [tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1017]/95 p-6 text-left shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
            <Download className="size-5 text-white" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white">Installer FileHub</h3>
            <p className="text-xs text-white/50">Un accès instantané, en plein écran, sur tous vos appareils.</p>
          </div>
          <button onClick={onClose} className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white" aria-label="Fermer"><X className="size-4" /></button>
        </div>

        {/* Installation native en un clic (si dispo) */}
        {canInstall && (
          <div className="mb-5">
            <button onClick={onInstall} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110">
              <Sparkles className="size-4" /> Installer maintenant · en un clic
            </button>
            <div className="mt-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-white/30">
              <span className="h-px flex-1 bg-white/10" /> ou manuellement <span className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}

        {/* Onglets par appareil */}
        <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition ${tab === t.k ? "bg-brand-500/25 text-white" : "text-white/60 hover:bg-white/5"}`}>
              <t.icon className="size-4" /> {t.short}
            </button>
          ))}
        </div>

        {/* Marche à suivre */}
        <p className="mb-4 text-sm text-white/60">{active.intro}</p>
        <ol className="space-y-3">
          {active.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
                <s.icon className="size-[18px] text-cyan-300" />
              </span>
              <span className="pt-1 text-sm leading-snug text-white/80">
                <span className="mr-1.5 font-mono text-xs text-white/40">{i + 1}.</span>{s.text}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
