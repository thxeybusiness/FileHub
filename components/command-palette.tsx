"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search, HardDrive, Sparkles, LayoutDashboard, Clock, Star, Trash2, Crown,
  FileText, Table2, BarChart3, Brush, FolderPlus, CornerDownLeft, ArrowUp, ArrowDown,
  Presentation, FolderKanban, StickyNote, Workflow,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { hasAiAccess } from "@/lib/plans";
import type { SerializedNode } from "@/lib/nodes";
import { NodeIcon } from "./file-icon";

type Cmd = { id: string; label: string; hint?: string; icon: LucideIcon; run: () => void };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SerializedNode[]>([]);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [aiAllowed, setAiAllowed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    let live = true;
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => { if (live) setAiAllowed(hasAiAccess(d?.plan ?? "free")); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // Raccourci ⌘K / Ctrl+K (et ouverture via un événement global).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("filehub:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("filehub:command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Recherche de fichiers (débouncée).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .list({ q })
        .then((r) => setResults(r.nodes.slice(0, 6)))
        .catch(() => setResults([]));
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function create(type: "doc" | "sheet" | "chart" | "draw" | "folder" | "note" | "diagram" | "board" | "slides" | "project") {
    setOpen(false);
    if (type === "folder") {
      const { node } = await api.createFolder("Nouveau dossier", null, null);
      router.push(`/drive/folder/${node.id}`);
      return;
    }
    const labels: Record<string, string> = {
      doc: "Document sans titre", sheet: "Feuille sans titre", chart: "Graphique sans titre", draw: "Dessin sans titre",
      note: "Note sans titre", diagram: "Diagramme sans titre", board: "Tableau kanban", slides: "Présentation sans titre", project: "Tableau sans titre",
    };
    if (type === "note" || type === "diagram" || type === "board" || type === "slides" || type === "project") {
      const { node } = await api.createNode(type, labels[type], null, null);
      router.push(`/drive/${type}/${node.id}`);
      return;
    }
    const creators = { doc: api.createDoc, sheet: api.createSheet, chart: api.createChart, draw: api.createDraw };
    const { node } = await creators[type](labels[type], null, null);
    router.push(`/drive/${type}/${node.id}`);
  }

  const commands = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = [
      { id: "nav-drive", label: "Mon Drive", icon: HardDrive, run: () => go("/drive") },
      ...(aiAllowed ? [{ id: "nav-assistant", label: "Assistant IA", hint: "Discuter avec mes fichiers", icon: Sparkles, run: () => go("/drive/assistant") }] : []),
      { id: "nav-dash", label: "Tableau de bord", icon: LayoutDashboard, run: () => go("/drive/tableau-de-bord") },
      { id: "nav-recent", label: "Récents", icon: Clock, run: () => go("/drive/recent") },
      { id: "nav-star", label: "Favoris", icon: Star, run: () => go("/drive/starred") },
      { id: "nav-trash", label: "Corbeille", icon: Trash2, run: () => go("/drive/trash") },
      { id: "nav-sub", label: "Abonnement", icon: Crown, run: () => go("/drive/abonnement") },
    ];
    const actions: Cmd[] = [
      { id: "new-doc", label: "Nouveau document", icon: FileText, run: () => create("doc") },
      { id: "new-sheet", label: "Nouvelle feuille de calcul", icon: Table2, run: () => create("sheet") },
      { id: "new-chart", label: "Nouveau graphique", icon: BarChart3, run: () => create("chart") },
      { id: "new-draw", label: "Nouveau dessin", icon: Brush, run: () => create("draw") },
      { id: "new-slides", label: "Nouvelle présentation", icon: Presentation, run: () => create("slides") },
      { id: "new-project", label: "Nouveau tableau", icon: FolderKanban, run: () => create("project") },
      { id: "new-note", label: "Nouvelle note", icon: StickyNote, run: () => create("note") },
      { id: "new-diagram", label: "Nouveau diagramme", icon: Workflow, run: () => create("diagram") },
      { id: "new-folder", label: "Nouveau dossier", icon: FolderPlus, run: () => create("folder") },
    ];
    const q = query.trim().toLowerCase();
    const filter = (c: Cmd) => !q || c.label.toLowerCase().includes(q);
    return [...nav.filter(filter), ...actions.filter(filter)];
  }, [query, aiAllowed]);

  // Fusionne commandes + fichiers en une liste plate pour la navigation clavier.
  const items = useMemo(() => {
    const fileItems = results.map((n) => ({ type: "file" as const, node: n }));
    const cmdItems = commands.map((c) => ({ type: "cmd" as const, cmd: c }));
    return [...cmdItems, ...fileItems];
  }, [commands, results]);

  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [items.length, active]);

  function runItem(i: number) {
    const it = items[i];
    if (!it) return;
    if (it.type === "cmd") it.cmd.run();
    else openNode(it.node);
  }

  function openNode(n: SerializedNode) {
    setOpen(false);
    if (n.type === "folder") router.push(`/drive/folder/${n.id}`);
    else if (["doc", "sheet", "chart", "draw", "note", "diagram", "board", "slides", "project", "coaching"].includes(n.type))
      router.push(`/drive/${n.type}/${n.id}`);
    else router.push(n.parentId ? `/drive/folder/${n.parentId}` : "/drive");
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0f1017]/97 shadow-2xl shadow-black/60 backdrop-blur-2xl"
        style={{ animation: "revealUp 0.2s ease both" }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); runItem(active); }
            }}
            placeholder="Rechercher un fichier, une action…"
            className="h-14 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
          />
          <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-muted sm:block">Échap</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">Aucun résultat.</p>
          ) : (
            <>
              {items.some((it) => it.type === "cmd") && (
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Actions</p>
              )}
              {items.map((it, i) => {
                const isActive = i === active;
                if (it.type === "cmd") {
                  const C = it.cmd;
                  return (
                    <button
                      key={C.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => runItem(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${isActive ? "bg-brand-500/20 text-white" : "text-white/80 hover:bg-white/5"}`}
                    >
                      <C.icon className="size-4 shrink-0 text-brand-200" />
                      <span className="flex-1">{C.label}</span>
                      {C.hint && <span className="text-xs text-muted">{C.hint}</span>}
                      {isActive && <CornerDownLeft className="size-3.5 text-muted" />}
                    </button>
                  );
                }
                const first = i > 0 && items[i - 1].type === "cmd";
                return (
                  <div key={it.node.id}>
                    {first && <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Fichiers</p>}
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => runItem(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${isActive ? "bg-brand-500/20 text-white" : "text-white/80 hover:bg-white/5"}`}
                    >
                      <NodeIcon type={it.node.type} mimeType={it.node.mimeType} name={it.node.name} color={it.node.color} size={18} />
                      <span className="flex-1 truncate">{it.node.name}</span>
                      {isActive && <CornerDownLeft className="size-3.5 text-muted" />}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1"><ArrowUp className="size-3" /><ArrowDown className="size-3" /> naviguer</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="size-3" /> ouvrir</span>
          <span className="ml-auto flex items-center gap-1"><kbd className="rounded border border-white/15 px-1 py-0.5 text-[10px]">⌘</kbd><kbd className="rounded border border-white/15 px-1 py-0.5 text-[10px]">K</kbd></span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
