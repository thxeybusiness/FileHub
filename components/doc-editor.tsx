"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Undo2,
  Redo2,
  Eraser,
  Check,
  Loader2,
  Download,
  ChevronRight,
  Home,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle";

export function DocEditor({
  id,
  initialName,
  initialContent,
  backHref,
  crumbs,
}: {
  id: string;
  initialName: string;
  initialContent: string;
  backHref: string;
  crumbs: Crumb[];
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(initialName);
  const [save, setSave] = useState<SaveState>("saved");
  const [words, setWords] = useState(0);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Injecte le contenu initial une seule fois (non contrôlé, pour ne pas
  // casser la position du curseur pendant la frappe).
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent || "";
      countWords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countWords = useCallback(() => {
    const text = editorRef.current?.innerText ?? "";
    const w = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWords(w);
  }, []);

  const persist = useCallback(
    (patch: { content?: string; name?: string }) => {
      setSave("saving");
      api
        .saveDoc(id, patch)
        .then(() => setSave("saved"))
        .catch(() => setSave("idle"));
    },
    [id],
  );

  const scheduleContentSave = useCallback(() => {
    setSave("saving");
    countWords();
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      persist({ content: editorRef.current?.innerHTML ?? "" });
    }, 700);
  }, [persist, countWords]);

  const onNameChange = (v: string) => {
    setName(v);
    setSave("saving");
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => persist({ name: v.trim() || "Document sans titre" }), 600);
  };

  // Ctrl/Cmd+S → sauvegarde immédiate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        persist({ content: editorRef.current?.innerHTML ?? "", name: name.trim() || "Document sans titre" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist, name]);

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    scheduleContentSave();
  };

  const exportHtml = () => {
    const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(name)}</title><body style="font-family:system-ui;max-width:720px;margin:40px auto;line-height:1.6">${editorRef.current?.innerHTML ?? ""}`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name || "document"}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
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
            <FileText className="size-4 shrink-0 text-brand-300" />
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30"
              placeholder="Document sans titre"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? (
            <><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>
          ) : save === "saved" ? (
            <><Check className="size-3.5 text-emerald-400" /> Enregistré</>
          ) : (
            <span className="text-amber-400">Non enregistré</span>
          )}
        </div>

        <button
          onClick={exportHtml}
          className="ml-1 hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/80 hover:bg-white/10 transition"
          title="Exporter en HTML"
        >
          <Download className="size-4" /> Exporter
        </button>
      </header>

      {/* Barre d'outils */}
      <div className="shrink-0 border-b border-white/10 bg-white/[0.02] px-3 sm:px-6 py-2 flex flex-wrap items-center gap-1">
        <ToolBtn onClick={() => exec("undo")} title="Annuler"><Undo2 /></ToolBtn>
        <ToolBtn onClick={() => exec("redo")} title="Rétablir"><Redo2 /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => exec("formatBlock", "H1")} title="Titre 1"><Heading1 /></ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "H2")} title="Titre 2"><Heading2 /></ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "P")} title="Paragraphe" label="P" />
        <Sep />
        <ToolBtn onClick={() => exec("bold")} title="Gras"><Bold /></ToolBtn>
        <ToolBtn onClick={() => exec("italic")} title="Italique"><Italic /></ToolBtn>
        <ToolBtn onClick={() => exec("underline")} title="Souligné"><UnderlineIcon /></ToolBtn>
        <ToolBtn onClick={() => exec("strikeThrough")} title="Barré"><Strikethrough /></ToolBtn>
        <ColorBtn onPick={(c) => exec("foreColor", c)} />
        <Sep />
        <ToolBtn onClick={() => exec("insertUnorderedList")} title="Liste à puces"><List /></ToolBtn>
        <ToolBtn onClick={() => exec("insertOrderedList")} title="Liste numérotée"><ListOrdered /></ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "BLOCKQUOTE")} title="Citation"><Quote /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => exec("justifyLeft")} title="Aligner à gauche"><AlignLeft /></ToolBtn>
        <ToolBtn onClick={() => exec("justifyCenter")} title="Centrer"><AlignCenter /></ToolBtn>
        <ToolBtn onClick={() => exec("justifyRight")} title="Aligner à droite"><AlignRight /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => exec("removeFormat")} title="Effacer la mise en forme"><Eraser /></ToolBtn>
      </div>

      {/* Feuille */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={scheduleContentSave}
            spellCheck
            className="doc-surface min-h-[60vh] px-8 py-10 sm:px-14 sm:py-14 outline-none text-[15px] leading-relaxed text-ink/90"
            data-placeholder="Commencez à écrire…"
          />
        </div>
        <p className="mx-auto mt-4 w-full max-w-3xl text-right text-xs text-muted">{words} mot{words > 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
  label,
}: {
  children?: React.ReactNode;
  onClick: () => void;
  title: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition text-sm font-semibold [&_svg]:size-[17px]"
    >
      {label ?? children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-white/10" />;
}

function ColorBtn({ onPick }: { onPick: (c: string) => void }) {
  const colors = ["#eceef4", "#5b8bff", "#22d3ee", "#a78bff", "#34d399", "#fbbf24", "#fb7185"];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title="Couleur du texte"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 transition"
      >
        <span className="grid size-[17px] place-items-center rounded font-bold" style={{ color: "#5b8bff" }}>A</span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-9 z-20 flex gap-1 rounded-xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl p-2 shadow-2xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                onPick(c);
                setOpen(false);
              }}
              className="size-5 rounded-full ring-1 ring-white/20 transition hover:scale-110"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
