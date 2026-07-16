"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

// Filet de sécurité pour toutes les pages de l'espace Coaching : en cas
// d'erreur serveur (base momentanément indisponible…), on affiche un message
// clair avec « Réessayer » plutôt qu'un écran d'erreur brut.
export default function CoachingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-red-500/10 text-red-400">
        <AlertTriangle className="size-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Impossible d'afficher cet espace</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Une erreur est survenue. C'est souvent temporaire — réessayez dans un instant.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow"
          style={{ background: "linear-gradient(90deg, #06b6d4, #3b82f6)" }}
        >
          <RotateCcw className="size-4" /> Réessayer
        </button>
        <Link
          href="/drive/accompagnement"
          className="inline-flex h-10 items-center rounded-xl border border-white/10 px-4 text-sm text-muted transition hover:bg-white/5 hover:text-white"
        >
          Retour à mes coachés
        </Link>
      </div>
    </div>
  );
}
