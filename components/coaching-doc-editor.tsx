"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import {
  ArrowLeft, Check, Loader2, Eye, Pencil, Lock,
  CalendarClock, BookOpen, FileText, Briefcase,
} from "lucide-react";
import { api } from "@/lib/api";

type SaveState = "saved" | "saving" | "error";

const CAT_META: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  seances: { label: "Séances", icon: CalendarClock, color: "#06b6d4" },
  ressources: { label: "Ressources", icon: BookOpen, color: "#a78bff" },
  documents: { label: "Documents", icon: FileText, color: "#3b82f6" },
  admin: { label: "Administratif", icon: Briefcase, color: "#f59e0b" },
};

export function CoachingDocEditor({
  coachingId, docId, initialTitle, initialContent, category, backHref, canEdit = true,
}: {
  coachingId: string; docId: string; initialTitle: string; initialContent: string;
  category: string; backHref: string; canEdit?: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [save, setSave] = useState<SaveState>("saved");
  const [preview, setPreview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cat = CAT_META[category] ?? CAT_META.documents;

  const persist = useCallback((patch: { title?: string; content?: string }) => {
    if (!canEdit) return;
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveCoachingDoc(coachingId, docId, patch)
        .then(() => setSave("saved"))
        .catch(() => setSave("error"));
    }, 550);
  }, [coachingId, docId, canEdit]);

  const onTitle = (v: string) => { setTitle(v); persist({ title: v.trim() || "Sans titre" }); };
  const onContent = (v: string) => { setContent(v); persist({ content: v }); };

  const html = useMemo(() => {
    try { return sanitizeRichHtml(marked.parse(content || "*Document vide.*", { async: false }) as string); }
    catch { return ""; }
  }, [content]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: cat.color + "22", color: cat.color }} title={cat.label}>
          <cat.icon className="size-4" />
        </span>
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          readOnly={!canEdit}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30"
          placeholder="Titre du document"
        />
        {!canEdit && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-muted">
            <Lock className="size-3.5" /> Lecture seule
          </span>
        )}
        <button
          onClick={() => setPreview((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted transition hover:bg-white/5 hover:text-white"
        >
          {preview ? <><Pencil className="size-3.5" /> Éditer</> : <><Eye className="size-3.5" /> Aperçu</>}
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted w-24 justify-end">
          {save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> …</>) : save === "error" ? (<span className="text-red-400">Erreur</span>) : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
          {preview || !canEdit ? (
            <article className="prose-share text-sm" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <textarea
              value={content}
              onChange={(e) => onContent(e.target.value)}
              placeholder="Rédigez ce document (Markdown pris en charge)…"
              className="min-h-[60vh] w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-white/20 focus:border-white/20"
            />
          )}
        </div>
      </div>
    </div>
  );
}
