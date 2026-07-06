"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, ChevronRight, Home, Table2 } from "lucide-react";
import { api } from "@/lib/api";
import { filehubTheme } from "@/lib/univer-theme";

import "@univerjs/presets/lib/styles/preset-sheets-core.css";
import "@univerjs/presets/lib/styles/preset-sheets-conditional-formatting.css";
import "@univerjs/presets/lib/styles/preset-sheets-data-validation.css";
import "@univerjs/presets/lib/styles/preset-sheets-drawing.css";
import "@univerjs/presets/lib/styles/preset-sheets-filter.css";
import "@univerjs/presets/lib/styles/preset-sheets-find-replace.css";
import "@univerjs/presets/lib/styles/preset-sheets-hyper-link.css";
import "@univerjs/presets/lib/styles/preset-sheets-note.css";
import "@univerjs/presets/lib/styles/preset-sheets-sort.css";
import "@univerjs/presets/lib/styles/preset-sheets-table.css";
import "@univerjs/presets/lib/styles/preset-sheets-thread-comment.css";

type Crumb = { id: string; name: string };
type SaveState = "idle" | "saving" | "saved" | "error";

// Feuille de calcul complète propulsée par Univer (moteur type Excel :
// ~500 formules, poignée de recopie, fusion, filtres, tri, formats, mise en
// forme conditionnelle, undo/redo, multi-feuilles…). Le classeur est
// sauvegardé automatiquement (snapshot JSON débouncé).
export function ExcelBoard({
  sheetId,
  initialName,
  initialData,
  backHref,
  crumbs,
}: {
  sheetId: string;
  initialName: string;
  initialData: unknown | null;
  backHref: string;
  crumbs: Crumb[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(initialName);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [ready, setReady] = useState(false);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;
    let univer: { dispose: () => void } | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let lastSerialized = "";
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    async function boot() {
      const [presets, corePreset, frFR] = await Promise.all([
        import("@univerjs/presets"),
        import("@univerjs/presets/preset-sheets-core"),
        import("@univerjs/presets/preset-sheets-core/locales/fr-FR"),
      ]);
      const [cf, cfFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-conditional-formatting"),
        import("@univerjs/presets/preset-sheets-conditional-formatting/locales/fr-FR"),
      ]);
      const [dv, dvFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-data-validation"),
        import("@univerjs/presets/preset-sheets-data-validation/locales/fr-FR"),
      ]);
      const [drawing, drawingFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-drawing"),
        import("@univerjs/presets/preset-sheets-drawing/locales/fr-FR"),
      ]);
      const [filter, filterFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-filter"),
        import("@univerjs/presets/preset-sheets-filter/locales/fr-FR"),
      ]);
      const [findReplace, findReplaceFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-find-replace"),
        import("@univerjs/presets/preset-sheets-find-replace/locales/fr-FR"),
      ]);
      const [link, linkFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-hyper-link"),
        import("@univerjs/presets/preset-sheets-hyper-link/locales/fr-FR"),
      ]);
      const [note, noteFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-note"),
        import("@univerjs/presets/preset-sheets-note/locales/fr-FR"),
      ]);
      const [sort, sortFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-sort"),
        import("@univerjs/presets/preset-sheets-sort/locales/fr-FR"),
      ]);
      const [table, tableFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-table"),
        import("@univerjs/presets/preset-sheets-table/locales/fr-FR"),
      ]);
      const [comment, commentFr] = await Promise.all([
        import("@univerjs/presets/preset-sheets-thread-comment"),
        import("@univerjs/presets/preset-sheets-thread-comment/locales/fr-FR"),
      ]);

      if (disposed || !containerRef.current) return;

      const { createUniver, LocaleType, mergeLocales } = presets;
      const result = createUniver({
        locale: LocaleType.FR_FR,
        theme: filehubTheme,
        darkMode: true,
        locales: {
          [LocaleType.FR_FR]: mergeLocales(
            frFR.default,
            cfFr.default,
            dvFr.default,
            drawingFr.default,
            filterFr.default,
            findReplaceFr.default,
            linkFr.default,
            noteFr.default,
            sortFr.default,
            tableFr.default,
            commentFr.default,
          ),
        },
        presets: [
          corePreset.UniverSheetsCorePreset({ container: containerRef.current }),
          cf.UniverSheetsConditionalFormattingPreset(),
          dv.UniverSheetsDataValidationPreset(),
          drawing.UniverSheetsDrawingPreset(),
          filter.UniverSheetsFilterPreset(),
          findReplace.UniverSheetsFindReplacePreset(),
          link.UniverSheetsHyperLinkPreset(),
          note.UniverSheetsNotePreset(),
          sort.UniverSheetsSortPreset(),
          table.UniverSheetsTablePreset(),
          comment.UniverSheetsThreadCommentPreset(),
        ],
      });
      univer = result.univer;
      const univerAPI = result.univerAPI;

      const snapshot =
        initialData && typeof initialData === "object"
          ? (initialData as Record<string, unknown>)
          : { name: name || "Feuille de calcul", sheetOrder: [], sheets: {} };
      univerAPI.createWorkbook(snapshot as Parameters<typeof univerAPI.createWorkbook>[0]);
      lastSerialized = JSON.stringify(univerAPI.getActiveWorkbook()?.save() ?? null);
      setReady(true);

      const trySave = () => {
        const wb = univerAPI.getActiveWorkbook();
        if (!wb) return;
        const snap = wb.save();
        const serialized = JSON.stringify(snap);
        if (serialized === lastSerialized) return;
        lastSerialized = serialized;
        setSaveState("saving");
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          try {
            await api.saveSheet(sheetId, { content: snap });
            setSaveState("saved");
          } catch {
            setSaveState("error");
          }
        }, 600);
      };
      timer = setInterval(trySave, 2000);
    }

    boot().catch((e) => {
      console.error("[excel] échec d'initialisation", e);
      setSaveState("error");
    });

    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      if (saveTimeout) clearTimeout(saveTimeout);
      univer?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId]);

  const onNameChange = (v: string) => {
    setName(v);
    setSaveState("saving");
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(async () => {
      try {
        await api.saveSheet(sheetId, { name: v.trim() || "Feuille sans titre" });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 600);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link
          href={backHref}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition"
          title="Retour"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (
              <span key={c.id} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="size-3 shrink-0" />
                <span className="truncate max-w-[140px]">{c.name}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Table2 className="size-4 shrink-0 text-emerald-400" />
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30"
              placeholder="Feuille sans titre"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {saveState === "saving" ? (
            <><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>
          ) : saveState === "error" ? (
            <span className="text-red-400">Erreur d&apos;enregistrement</span>
          ) : (
            <><Check className="size-3.5 text-emerald-400" /> Enregistré</>
          )}
        </div>
      </header>

      {/* Grille Univer */}
      <div className="flex-1 min-h-0 p-3 sm:p-4">
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f1017] shadow-2xl shadow-black/40">
          {!ready && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted">
              <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Chargement de la feuille de calcul…</span>
            </div>
          )}
          <div ref={containerRef} className="univer-container h-full w-full" />
        </div>
      </div>
    </div>
  );
}
