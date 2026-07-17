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
  return (
    <>
      {!inCoaching && <CommandPalette />}
      <ScratchpadWidget />
      <CalculatorWidget />
    </>
  );
}
