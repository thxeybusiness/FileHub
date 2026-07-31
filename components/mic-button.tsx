"use client";

import { Mic, MicOff } from "lucide-react";
import { useDictation } from "./use-dictation";
import { cn } from "@/lib/utils";

/**
 * Bouton de dictée vocale.
 *
 * Ne s'affiche QUE là où la dictée fonctionne réellement (voir
 * `dictationSupported`) : rien sur Firefox, rien en application installée sur
 * iPhone/iPad — où le micro du clavier système fait déjà le travail. Mieux
 * vaut aucun bouton qu'un bouton qui ne répond pas.
 */
export function MicButton({
  onText,
  className,
  title = "Dicter",
}: {
  /** Reçoit le texte validé, à insérer dans le document. */
  onText: (text: string) => void;
  className?: string;
  title?: string;
}) {
  const { supported, active, status, interim, toggle } = useDictation({ onFinal: onText });

  if (!supported) return null;

  const denied = status === "denied";
  const label = denied
    ? "Micro refusé — autorisez l'accès dans les réglages du navigateur"
    : active
      ? "Arrêter la dictée"
      : title;

  return (
    <>
      <button
        type="button"
        // Empêche le clic de voler le focus : le curseur reste dans le
        // document, donc le texte dicté s'insère à l'endroit voulu et non
        // à la fin.
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
        title={label}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "relative grid size-9 shrink-0 place-items-center rounded-lg transition",
          active
            ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
            : denied
              ? "text-red-400/70 hover:bg-white/5"
              : "text-muted hover:bg-white/5 hover:text-white",
          className,
        )}
      >
        {denied ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        {active && (
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-400 animate-pulse" />
        )}
      </button>

      {/* Texte provisoire : affiché en surimpression, JAMAIS écrit dans le
          document. Le moteur le corrige en continu ; l'enregistrer ferait
          partir en base — et chez les collaborateurs — un texte destiné à
          être réécrit. */}
      {active && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="max-w-xl rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm text-white/80 shadow-xl backdrop-blur">
            <span className="mr-2 inline-block size-2 rounded-full bg-red-400 align-middle animate-pulse" />
            {interim ? (
              <span className="align-middle italic text-white/60">{interim}</span>
            ) : (
              <span className="align-middle text-white/50">Parlez…</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
