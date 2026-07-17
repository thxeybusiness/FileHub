"use client";

import { usePathname } from "next/navigation";
import { CommandPalette } from "./command-palette";
import { ScratchpadWidget } from "./scratchpad-widget";
import { CalculatorWidget } from "./calculator-widget";

// Widgets utilitaires. Dans l'espace « Accompagnement » on garde la note
// (brouillon) et la calculatrice — pratiques pour un coach — mais on masque la
// palette de commandes ⌘K, propre à la navigation FileHub.
export function FileHubWidgets() {
  const pathname = usePathname();
  const inCoaching = pathname.startsWith("/drive/accompagnement") || pathname.startsWith("/drive/coaching");
  // Le drive d'un coaché (racine) affiche une barre latérale de suivi à droite :
  // on décale les widgets flottants pour éviter la superposition.
  const onCoacheeDrive = /^\/drive\/coaching\/[^/]+$/.test(pathname);
  return (
    <>
      {!inCoaching && <CommandPalette />}
      <ScratchpadWidget sideOffset={onCoacheeDrive} />
      <CalculatorWidget sideOffset={onCoacheeDrive} />
    </>
  );
}
