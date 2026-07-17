"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen, X, Copy, Check, Trash2, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "filehub:scratchpad";

export function ScratchpadWidget({ sideOffset = false }: { sideOffset?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Charge le contenu local au montage (persistance côté navigateur).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved != null) setText(saved);
    } catch {
      /* localStorage indisponible */
    }
    setLoaded(true);
  }, []);

  // Enregistre à chaque modification (une fois le chargement initial fait).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      /* ignore */
    }
  }, [text, loaded]);

  // Un seul widget flottant ouvert à la fois : quand un autre s'ouvre, on ferme.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== "scratch") setOpen(false);
    };
    window.addEventListener("filehub:widget-open", onOther);
    return () => window.removeEventListener("filehub:widget-open", onOther);
  }, []);
  const toggle = () => {
    if (!open) window.dispatchEvent(new CustomEvent("filehub:widget-open", { detail: "scratch" }));
    setOpen((v) => !v);
  };

  // Escape ferme le panneau, focus à l'ouverture.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => taRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard refusé */
    }
  };

  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip) return;
      setText((t) => (t ? t + (t.endsWith("\n") ? "" : "\n") + clip : clip));
      taRef.current?.focus();
    } catch {
      /* lecture refusée : l'utilisateur peut coller avec Ctrl/Cmd+V */
    }
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <>
      {/* Bouton flottant (à gauche de la calculatrice) */}
      <button
        onClick={toggle}
        title="Brouillon"
        className={cn(
          "fixed bottom-6 z-[60] grid size-12 place-items-center rounded-2xl border border-white/10 shadow-xl shadow-black/40 backdrop-blur-xl transition hover:scale-105",
          sideOffset ? "right-[5.25rem] lg:right-[21.25rem]" : "right-[5.25rem]",
          open ? "bg-amber-500 text-white" : "bg-[#0f1017]/85 text-amber-300 hover:text-white",
        )}
      >
        <NotebookPen className="size-5" />
      </button>

      {/* Panneau brouillon */}
      {open && (
        <div className={cn("fixed bottom-24 z-[60] w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl shadow-2xl animate-in", sideOffset ? "right-6 lg:right-[17.5rem]" : "right-6")}>
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <NotebookPen className="size-4 text-amber-300" />
            <span className="text-sm font-semibold">Brouillon</span>
            <span className="ml-1 text-[11px] text-muted">enregistré ici</span>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto grid size-7 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Zone d'écriture */}
          <div className="p-3">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Écrivez ou collez vos infos ici…&#10;Le contenu reste disponible sur cet appareil."
              spellCheck
              className="h-64 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-amber-400/40 placeholder:text-white/25"
            />
          </div>

          {/* Barre d'actions */}
          <div className="flex items-center gap-1.5 border-t border-white/10 px-3 py-2.5">
            <span className="text-[11px] text-muted">
              {text.length} caractère{text.length > 1 ? "s" : ""} · {words} mot{words > 1 ? "s" : ""}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={paste}
                title="Coller depuis le presse-papiers"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.12] active:scale-95"
              >
                <ClipboardPaste className="size-3.5" /> Coller
              </button>
              <button
                onClick={copy}
                disabled={!text}
                title="Copier tout le contenu"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.12] active:scale-95 disabled:opacity-40"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copied ? "Copié" : "Copier"}
              </button>
              <button
                onClick={() => setText("")}
                disabled={!text}
                title="Tout effacer"
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-white/70 transition hover:bg-red-500/15 hover:text-red-300 active:scale-95 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
