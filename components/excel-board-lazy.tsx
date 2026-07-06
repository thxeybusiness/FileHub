"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Univer est un moteur 100 % navigateur : chargement dynamique sans SSR.
export const ExcelBoardLazy = dynamic(
  () => import("@/components/excel-board").then((m) => m.ExcelBoard),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-sm text-muted">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Chargement de la feuille de calcul…
        </span>
      </div>
    ),
  },
);
