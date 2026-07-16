"use client";

import { usePathname } from "next/navigation";
import { CommandPalette } from "./command-palette";
import { ScratchpadWidget } from "./scratchpad-widget";
import { CalculatorWidget } from "./calculator-widget";

// Widgets propres à FileHub (palette de commandes ⌘K, brouillon, calculatrice).
// Masqués dans l'espace « Accompagnement », qui est un SaaS séparé.
export function FileHubWidgets() {
  const pathname = usePathname();
  const inCoaching = pathname.startsWith("/drive/accompagnement") || pathname.startsWith("/drive/coaching");
  if (inCoaching) return null;
  return (
    <>
      <CommandPalette />
      <ScratchpadWidget />
      <CalculatorWidget />
    </>
  );
}
