// Construction du SVG d'un élément à partir de son id, quelle que soit sa
// provenance (catalogue fixe ou famille générative). Isolé ici pour que le
// rendu et l'export partagent exactement la même résolution.
import type { GradientFill } from "./design";
import { elementSvg, type SlotPaint } from "./design-elements";
import { catalogElementById } from "./design-catalog";

export function elementSvgFor(ref: string, fill: string, gradient: GradientFill | null, extraSlots: SlotPaint[] = []): string | null {
  const def = catalogElementById(ref);
  return def ? elementSvg(def, fill, gradient, extraSlots) : null;
}
