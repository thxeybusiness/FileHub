"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, Share, Plus, MoreVertical, Check } from "lucide-react";

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
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Bouton « Installer l'application » visible sur la page d'accueil.
 * - Chrome/Edge/Android : déclenche l'invite d'installation native.
 * - iOS/Safari & navigateurs sans invite : ouvre une aide pas-à-pas.
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
  const [showHelp, setShowHelp] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isStandalone()) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else {
      // Pas d'invite native disponible (iOS, Firefox…) -> aide manuelle.
      setShowHelp(true);
    }
  }

  // Rendu différé côté client + masqué si déjà installé.
  if (!mounted || installed) return null;

  const base =
    "group inline-flex items-center justify-center gap-2 font-semibold transition";
  const styles =
    variant === "solid"
      ? "rounded-full bg-white/10 border border-white/15 px-7 py-3.5 text-white backdrop-blur hover:bg-white/15 hover:border-white/25"
      : variant === "ghost"
        ? "rounded-full border border-white/15 bg-white/5 px-6 py-3 text-white backdrop-blur hover:bg-white/10"
        : "size-10 rounded-full text-white/80 hover:bg-white/10";

  return (
    <>
      <button
        onClick={handleClick}
        className={`${base} ${styles} ${className}`}
        title="Installer FileHub sur votre appareil"
      >
        <Download className="size-4 transition-transform group-hover:translate-y-0.5" />
        {variant !== "icon" && <span>Installer l'application</span>}
      </button>

      {/* Portail vers <body> : indispensable pour que la modale plein écran
          échappe aux ancêtres animés en `transform` (le hero), qui sinon
          piègent tout `position: fixed`. */}
      {showHelp &&
        typeof document !== "undefined" &&
        createPortal(<InstallHelp onClose={() => setShowHelp(false)} />, document.body)}
    </>
  );
}

// Aide pas-à-pas quand l'invite native n'existe pas (surtout iOS Safari).
function InstallHelp({ onClose }: { onClose: () => void }) {
  const isIOS =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const steps = isIOS
    ? [
        { icon: Share, text: "Appuyez sur le bouton Partager dans la barre de Safari." },
        { icon: Plus, text: "Choisissez « Sur l'écran d'accueil »." },
        { icon: Check, text: "Validez : l'icône FileHub apparaît sur votre écran." },
      ]
    : [
        { icon: MoreVertical, text: "Ouvrez le menu ⋮ de votre navigateur." },
        { icon: Download, text: "Choisissez « Installer FileHub » ou « Installer l'application »." },
        { icon: Check, text: "Confirmez : FileHub s'ouvre comme une vraie app." },
      ];

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1017]/95 p-6 text-left shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
            <Download className="size-5 text-white" />
          </span>
          <h3 className="text-lg font-semibold text-white">Installer FileHub</h3>
          <button
            onClick={onClose}
            className="ml-auto grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-5 text-sm text-white/60">
          En quelques secondes, ajoutez FileHub à votre écran d'accueil pour un accès
          instantané, en plein écran.
        </p>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-200">
                <s.icon className="size-[18px] text-cyan-300" />
              </span>
              <span className="text-sm text-white/80">
                <span className="mr-1.5 font-mono text-xs text-white/40">{i + 1}.</span>
                {s.text}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
