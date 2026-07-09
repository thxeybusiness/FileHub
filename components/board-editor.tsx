"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, ChevronRight, Home, KanbanSquare, Plus, X, ChevronLeft, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";
import { useCollab } from "./use-collab";
import { CollabBar } from "./collab-bar";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";
type Card = { id: string; text: string };
type Column = { id: string; title: string; cards: Card[] };
type Board = { columns: Column[] };

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

function parse(content: string): Board {
  try {
    const b = JSON.parse(content) as Board;
    if (Array.isArray(b?.columns)) return b;
  } catch { /* défaut */ }
  return { columns: [{ id: uid(), title: "À faire", cards: [] }, { id: uid(), title: "En cours", cards: [] }, { id: uid(), title: "Terminé", cards: [] }] };
}

export function BoardEditor({
  id, initialName, initialContent, backHref, crumbs, shared = false,
}: {
  id: string; initialName: string; initialContent: string; backHref: string; crumbs: Crumb[]; shared?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [board, setBoard] = useState<Board>(() => parse(initialContent));
  const [save, setSave] = useState<SaveState>("saved");
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  // Récupère la version du document modifiée par un collaborateur.
  const applyRemote = useCallback(async () => {
    if (dirty.current) return;
    try {
      const { content } = await api.getContent(id);
      if (dirty.current) return;
      setBoard(parse(content));
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
    }, 500);
  }, [id, markEditing, syncVersion]);

  const update = (mut: (b: Board) => Board) => {
    setBoard((prev) => {
      const next = mut(structuredClone(prev));
      persist({ content: JSON.stringify(next) });
      return next;
    });
  };
  const onName = (v: string) => { setName(v); persist({ name: v.trim() || "Tableau sans titre" }); };

  const addCard = (colId: string, text: string) => {
    if (!text.trim()) return;
    update((b) => { b.columns.find((c) => c.id === colId)?.cards.push({ id: uid(), text: text.trim() }); return b; });
  };
  const removeCard = (colId: string, cardId: string) =>
    update((b) => { const col = b.columns.find((c) => c.id === colId); if (col) col.cards = col.cards.filter((k) => k.id !== cardId); return b; });
  const editCard = (colId: string, cardId: string, text: string) =>
    update((b) => { const k = b.columns.find((c) => c.id === colId)?.cards.find((x) => x.id === cardId); if (k) k.text = text; return b; });
  const moveCard = (colId: string, cardId: string, dir: -1 | 1) =>
    update((b) => {
      const i = b.columns.findIndex((c) => c.id === colId);
      const j = i + dir;
      if (j < 0 || j >= b.columns.length) return b;
      const card = b.columns[i].cards.find((k) => k.id === cardId);
      if (!card) return b;
      b.columns[i].cards = b.columns[i].cards.filter((k) => k.id !== cardId);
      b.columns[j].cards.push(card);
      return b;
    });
  const addColumn = () => update((b) => { b.columns.push({ id: uid(), title: "Nouvelle colonne", cards: [] }); return b; });
  const renameColumn = (colId: string, title: string) => update((b) => { const c = b.columns.find((x) => x.id === colId); if (c) c.title = title; return b; });
  const removeColumn = (colId: string) => update((b) => { b.columns = b.columns.filter((c) => c.id !== colId); return b; });

  const applyAi = (data: unknown) => {
    const d = data as { columns?: { title: string; cards: string[] }[] };
    if (!d?.columns?.length) return;
    update(() => ({ columns: d.columns!.map((c) => ({ id: uid(), title: c.title, cards: (c.cards ?? []).map((t) => ({ id: uid(), text: t })) })) }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (<span key={c.id} className="flex items-center gap-1 min-w-0"><ChevronRight className="size-3 shrink-0" /><span className="truncate max-w-[140px]">{c.name}</span></span>))}
          </div>
          <div className="flex items-center gap-2">
            <KanbanSquare className="size-4 shrink-0 text-orange-400" />
            <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30" placeholder="Tableau sans titre" />
          </div>
        </div>
        <CollabBar peers={peers} />
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {flash ? (<span className="flex items-center gap-1.5 text-cyan-300"><RefreshCw className="size-3.5" /> Mis à jour</span>) : save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>) : save === "error" ? (<span className="text-red-400">Erreur</span>) : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
        <AiAssistant
          kind="board" title="Assistant tâches" accent="#f97316"
          onApplyData={applyAi}
          placeholder="Ex. « plan de lancement d'un produit »"
          quickActions={[{ action: "generate", label: "Générer des tâches" }]}
        />
      </header>

      <div className="flex-1 min-h-0 overflow-x-auto p-4 sm:p-6">
        <div className="flex h-full items-start gap-4">
          {board.columns.map((col) => (
            <div key={col.id} className="flex max-h-full w-72 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
                <input value={col.title} onChange={(e) => renameColumn(col.id, e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
                <span className="text-xs text-muted">{col.cards.length}</span>
                <button onClick={() => removeColumn(col.id)} className="grid size-6 place-items-center rounded text-muted hover:bg-red-500/10 hover:text-red-400" title="Supprimer la colonne"><X className="size-3.5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {col.cards.map((card) => (
                  <div key={card.id} className="group rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                    <textarea value={card.text} onChange={(e) => editCard(col.id, card.id, e.target.value)} rows={Math.max(1, Math.ceil(card.text.length / 30))} className="w-full resize-none bg-transparent text-sm text-ink/90 outline-none" />
                    <div className="mt-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => moveCard(col.id, card.id, -1)} className="grid size-6 place-items-center rounded text-muted hover:bg-white/10" title="← Colonne précédente"><ChevronLeft className="size-3.5" /></button>
                      <button onClick={() => moveCard(col.id, card.id, 1)} className="grid size-6 place-items-center rounded text-muted hover:bg-white/10" title="Colonne suivante →"><ChevronRight className="size-3.5" /></button>
                      <button onClick={() => removeCard(col.id, card.id)} className="ml-auto grid size-6 place-items-center rounded text-muted hover:bg-red-500/10 hover:text-red-400" title="Supprimer"><X className="size-3.5" /></button>
                    </div>
                  </div>
                ))}
                <AddCard onAdd={(t) => addCard(col.id, t)} />
              </div>
            </div>
          ))}
          <button onClick={addColumn} className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 text-sm text-muted hover:border-white/30 hover:text-white transition">
            <Plus className="size-4" /> Colonne
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCard({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { onAdd(v); setV(""); } }}
        placeholder="+ Ajouter une carte"
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400"
      />
    </div>
  );
}
