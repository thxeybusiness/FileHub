"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, ChevronRight, Home, Workflow, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

export function DiagramEditor({
  id, initialName, initialContent, backHref, crumbs,
}: {
  id: string;
  initialName: string;
  initialContent: string;
  backHref: string;
  crumbs: Crumb[];
}) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(initialContent);
  const [save, setSave] = useState<SaveState>("saved");
  const [svg, setSvg] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mermaidRef = useRef<typeof import("mermaid").default | null>(null);
  const seq = useRef(0);

  const persist = useCallback((patch: { content?: string; name?: string }) => {
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, patch).then(() => setSave("saved")).catch(() => setSave("error"));
    }, 600);
  }, [id]);

  // Rendu Mermaid débouncé.
  useEffect(() => {
    const t = setTimeout(async () => {
      const src = code.trim();
      if (!src) { setSvg(""); setRenderError(null); return; }
      try {
        if (!mermaidRef.current) {
          const m = (await import("mermaid")).default;
          m.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict", fontFamily: "inherit" });
          mermaidRef.current = m;
        }
        const n = ++seq.current;
        const { svg: out } = await mermaidRef.current.render(`mmd-${id}-${n}`, src);
        if (n === seq.current) { setSvg(out); setRenderError(null); }
      } catch (e) {
        setRenderError(e instanceof Error ? e.message.split("\n")[0] : "Syntaxe invalide");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [code, id]);

  const onCode = (v: string) => { setCode(v); persist({ content: v }); };
  const onName = (v: string) => { setName(v); persist({ name: v.trim() || "Diagramme sans titre" }); };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (<span key={c.id} className="flex items-center gap-1 min-w-0"><ChevronRight className="size-3 shrink-0" /><span className="truncate max-w-[140px]">{c.name}</span></span>))}
          </div>
          <div className="flex items-center gap-2">
            <Workflow className="size-4 shrink-0 text-teal-400" />
            <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30" placeholder="Diagramme sans titre" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>) : save === "error" ? (<span className="text-red-400">Erreur</span>) : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
        <AiAssistant
          kind="diagram" title="Assistant diagramme" accent="#14b8a6"
          getContext={() => code}
          onApplyText={(t) => onCode(t)}
          applyLabel="Remplacer le diagramme"
          placeholder="Ex. « flux d'une commande e-commerce »"
          quickActions={[{ action: "generate", label: "Générer" }, { action: "fix", label: "Corriger la syntaxe" }]}
        />
      </header>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(280px,40%)_1fr]">
        <textarea
          value={code}
          onChange={(e) => onCode(e.target.value)}
          spellCheck={false}
          placeholder={"graph TD\n  A[Début] --> B{Test}\n  B -->|oui| C[OK]\n  B -->|non| D[Fin]"}
          className="h-full w-full resize-none bg-transparent px-5 py-6 font-mono text-[13px] leading-relaxed text-ink/90 outline-none placeholder:text-white/25"
        />
        <div className="relative min-h-0 overflow-auto border-l border-white/10 bg-white/[0.015] p-6">
          {renderError && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300">
              <AlertTriangle className="size-3.5" /> {renderError}
            </div>
          )}
          {svg ? (
            <div className="grid min-h-full place-items-center [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted">Le diagramme s'affichera ici.</div>
          )}
        </div>
      </div>
    </div>
  );
}
