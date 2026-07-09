"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import { ArrowLeft, Check, Loader2, ChevronRight, Home, StickyNote, Eye, Pencil, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";
import { useCollab } from "./use-collab";
import { CollabBar } from "./collab-bar";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

export function NoteEditor({
  id, initialName, initialContent, backHref, crumbs, shared = false,
}: {
  id: string;
  initialName: string;
  initialContent: string;
  backHref: string;
  crumbs: Crumb[];
  shared?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState(initialContent);
  const [save, setSave] = useState<SaveState>("saved");
  const [flash, setFlash] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const applyRemote = useCallback(async () => {
    if (dirty.current) return;
    try {
      const { content: remote } = await api.getContent(id);
      if (dirty.current) return;
      setContent(remote);
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
    } catch { /* ignore */ }
  }, [id]);
  const { peers, markEditing, syncVersion } = useCollab(id, shared, applyRemote);

  const persist = useCallback((patch: { content?: string; name?: string }) => {
    setSave("saving");
    dirty.current = true;
    markEditing();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, patch)
        .then((r) => { setSave("saved"); dirty.current = false; if (r?.updatedAt) syncVersion(r.updatedAt); })
        .catch(() => setSave("error"));
    }, 600);
  }, [id, markEditing, syncVersion]);

  const onContent = (v: string) => { setContent(v); persist({ content: v }); };
  const onName = (v: string) => { setName(v); persist({ name: v.trim() || "Note sans titre" }); };

  const html = (() => {
    try { return marked.parse(content || "*Note vide.*", { async: false }) as string; } catch { return ""; }
  })();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (
              <span key={c.id} className="flex items-center gap-1 min-w-0"><ChevronRight className="size-3 shrink-0" /><span className="truncate max-w-[140px]">{c.name}</span></span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <StickyNote className="size-4 shrink-0 text-yellow-400" />
            <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30" placeholder="Note sans titre" />
          </div>
        </div>
        <CollabBar peers={peers} />
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {flash ? (<span className="flex items-center gap-1.5 text-cyan-300"><RefreshCw className="size-3.5" /> Mis à jour</span>) : save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>) : save === "error" ? (<span className="text-red-400">Erreur</span>) : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
        <button onClick={() => setMobilePreview((v) => !v)} className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 sm:hidden" title="Aperçu">
          {mobilePreview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
        </button>
        <AiAssistant
          kind="note" title="Assistant note" accent="#eab308"
          getContext={() => content}
          onApplyText={(t) => onContent((content ? content + "\n\n" : "") + t)}
          applyLabel="Ajouter à la note"
          placeholder="Ex. « rédige une note de réunion sur… »"
          quickActions={[
            { action: "improve", label: "Structurer" },
            { action: "summarize", label: "Résumer" },
            { action: "todo", label: "Tâches" },
            { action: "continue", label: "Continuer" },
          ]}
        />
      </header>

      <div className="flex-1 min-h-0 grid sm:grid-cols-2">
        <textarea
          value={content}
          onChange={(e) => onContent(e.target.value)}
          spellCheck
          placeholder={"# Titre\n\nÉcrivez en **Markdown**…\n\n- point\n- point"}
          className={`h-full w-full resize-none bg-transparent px-5 py-6 font-mono text-sm leading-relaxed text-ink/90 outline-none placeholder:text-white/25 ${mobilePreview ? "hidden sm:block" : "block"}`}
        />
        <div className={`h-full overflow-auto border-l border-white/10 bg-white/[0.015] px-6 py-6 ${mobilePreview ? "block" : "hidden sm:block"}`}>
          <div className="prose-share" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}
