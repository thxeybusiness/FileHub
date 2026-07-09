"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, KanbanSquare, Plus, X, RefreshCw, Search, Filter, Tag,
  Trash2, Calendar, Flag, GripVertical, MoreHorizontal, Copy, ListChecks, ChevronDown,
  Palette, AlignLeft, CircleDot, CalendarClock, Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";
import { RealtimeEngine, type Actions } from "./realtime";
import { CollabBar } from "./collab-bar";
import type { Peer } from "./use-collab";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";
type Priority = "none" | "low" | "medium" | "high" | "urgent";
type Check = { id: string; text: string; done: boolean };
type Label = { id: string; name: string; color: string };
type Card = {
  id: string; title: string; desc?: string; labels?: string[]; priority?: Priority;
  due?: string | null; checklist?: Check[]; cover?: string | null; assignee?: string;
};
type Column = { id: string; title: string; color?: string | null; wip?: number | null; collapsed?: boolean; cards: Card[] };
type Board = { columns: Column[]; labels: Label[] };

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const PRIORITIES: { k: Priority; l: string; color: string }[] = [
  { k: "none", l: "Aucune", color: "#64748b" },
  { k: "low", l: "Basse", color: "#22c55e" },
  { k: "medium", l: "Moyenne", color: "#eab308" },
  { k: "high", l: "Haute", color: "#f97316" },
  { k: "urgent", l: "Urgente", color: "#ef4444" },
];
const prio = (k?: Priority) => PRIORITIES.find((p) => p.k === (k ?? "none")) ?? PRIORITIES[0];
const LABEL_COLORS = ["#5b8bff", "#7b3bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff", "#94a3b8"];
const COLUMN_COLORS = ["#5b8bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff"];

function normalizeCard(k: unknown): Card {
  if (typeof k === "string") return { id: uid(), title: k, priority: "none", labels: [], checklist: [] };
  const c = (k ?? {}) as Record<string, unknown>;
  return {
    id: (c.id as string) || uid(),
    title: (c.title as string) ?? (c.text as string) ?? "",
    desc: (c.desc as string) ?? "",
    labels: Array.isArray(c.labels) ? (c.labels as string[]) : [],
    priority: (c.priority as Priority) ?? "none",
    due: (c.due as string) ?? null,
    checklist: Array.isArray(c.checklist) ? (c.checklist as Check[]).map((x) => ({ id: x.id || uid(), text: x.text || "", done: !!x.done })) : [],
    cover: (c.cover as string) ?? null,
    assignee: (c.assignee as string) ?? "",
  };
}
function defaultBoard(): Board {
  return {
    columns: [
      { id: uid(), title: "À faire", cards: [], color: "#5b8bff" },
      { id: uid(), title: "En cours", cards: [], color: "#eab308" },
      { id: uid(), title: "Terminé", cards: [], color: "#34d399" },
    ],
    labels: [
      { id: uid(), name: "Prioritaire", color: "#ef4444" },
      { id: uid(), name: "Idée", color: "#a78bff" },
      { id: uid(), name: "Bug", color: "#f97316" },
      { id: uid(), name: "Amélioration", color: "#22d3ee" },
    ],
  };
}
function parse(content: string): Board {
  try {
    const b = JSON.parse(content) as { columns?: unknown[]; labels?: unknown[] };
    if (Array.isArray(b?.columns)) {
      return {
        columns: b.columns.map((cc) => {
          const c = cc as Record<string, unknown>;
          return {
            id: (c.id as string) || uid(),
            title: (c.title as string) ?? "Colonne",
            color: (c.color as string) ?? null,
            wip: typeof c.wip === "number" ? (c.wip as number) : null,
            collapsed: !!c.collapsed,
            cards: Array.isArray(c.cards) ? c.cards.map(normalizeCard) : [],
          };
        }),
        labels: Array.isArray(b.labels)
          ? b.labels.map((ll) => { const l = ll as Record<string, unknown>; return { id: (l.id as string) || uid(), name: (l.name as string) || "", color: (l.color as string) || LABEL_COLORS[0] }; })
          : [],
      };
    }
  } catch { /* défaut */ }
  return defaultBoard();
}

// Formatage d'échéance : renvoie un libellé court + une tonalité (couleur).
function fmtDue(due?: string | null): { label: string; tone: string } | null {
  if (!due) return null;
  const d = new Date(due + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (diff < 0) return { label, tone: "#ef4444" };
  if (diff === 0) return { label: "Aujourd'hui", tone: "#f97316" };
  if (diff === 1) return { label: "Demain", tone: "#eab308" };
  return { label, tone: "#94a3b8" };
}
const initials = (s: string) => { const p = s.trim().split(/\s+/).filter(Boolean); return !p.length ? "?" : p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase(); };
const avatarColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return `hsl(${h} 60% 55%)`; };

type Drag = { kind: "card" | "col"; id: string; w: number } | null;
type DropCard = { col: string; index: number } | null;

export function BoardEditor({
  id, initialName, initialContent, backHref, crumbs, shared = false,
}: {
  id: string; initialName: string; initialContent: string; backHref: string; crumbs: Crumb[]; shared?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [board, setBoard] = useState<Board>(() => parse(initialContent));
  const [save, setSave] = useState<SaveState>("saved");
  const [flash, setFlash] = useState(false);
  const [openCard, setOpenCard] = useState<{ col: string; card: string } | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fLabels, setFLabels] = useState<Set<string>>(new Set());
  const [fPrios, setFPrios] = useState<Set<Priority>>(new Set());
  const [colMenu, setColMenu] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [dropCard, setDropCard] = useState<DropCard>(null);
  const [dropCol, setDropCol] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag>(null);
  const dropCardRef = useRef<DropCard>(null);
  const dropColRef = useRef<number | null>(null);
  const moved = useRef(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const actions = useRef<Actions>({ markEditing: () => {}, syncVersion: () => {} });

  const applyRemoteString = useCallback((str: string) => {
    if (dirty.current) return;
    setBoard(parse(str));
    setFlash(true);
    setTimeout(() => setFlash(false), 2500);
  }, []);
  const fetchRemote = useCallback(async () => {
    if (dirty.current) return;
    try { const { content } = await api.getContent(id); applyRemoteString(content); } catch { /* ignore */ }
  }, [id, applyRemoteString]);

  const persist = useCallback((content: string) => {
    setSave("saving");
    dirty.current = true;
    actions.current.markEditing();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, { content })
        .then((r) => { setSave("saved"); dirty.current = false; if (r?.updatedAt) actions.current.syncVersion(r.updatedAt); })
        .catch(() => setSave("error"));
    }, 500);
  }, [id]);

  const update = useCallback((mut: (b: Board) => void) => {
    setBoard((prev) => { const next = structuredClone(prev); mut(next); persist(JSON.stringify(next)); return next; });
  }, [persist]);
  const onName = (v: string) => { setName(v); dirty.current = true; actions.current.markEditing(); api.saveContent(id, { name: v.trim() || "Tableau sans titre" }).then((r) => { dirty.current = false; if (r?.updatedAt) actions.current.syncVersion(r.updatedAt); }).catch(() => {}); };
  const serialized = useMemo(() => JSON.stringify(board), [board]);

  // ── Opérations cartes ──────────────────────────────────────────────
  const addCard = (colId: string, title: string) => {
    const t = title.trim(); if (!t) return;
    update((b) => { b.columns.find((c) => c.id === colId)?.cards.push({ id: uid(), title: t, priority: "none", labels: [], checklist: [] }); });
  };
  const patchCard = (colId: string, cardId: string, patch: Partial<Card>) =>
    update((b) => { const k = b.columns.find((c) => c.id === colId)?.cards.find((x) => x.id === cardId); if (k) Object.assign(k, patch); });
  const deleteCard = (colId: string, cardId: string) =>
    update((b) => { const col = b.columns.find((c) => c.id === colId); if (col) col.cards = col.cards.filter((k) => k.id !== cardId); });
  const dupCard = (colId: string, cardId: string) =>
    update((b) => { const col = b.columns.find((c) => c.id === colId); const k = col?.cards.find((x) => x.id === cardId); if (col && k) { const i = col.cards.indexOf(k); col.cards.splice(i + 1, 0, { ...structuredClone(k), id: uid() }); } });

  // ── Opérations colonnes ────────────────────────────────────────────
  const addColumn = () => update((b) => { b.columns.push({ id: uid(), title: "Nouvelle colonne", cards: [], color: COLUMN_COLORS[b.columns.length % COLUMN_COLORS.length] }); });
  const patchColumn = (colId: string, patch: Partial<Column>) => update((b) => { const c = b.columns.find((x) => x.id === colId); if (c) Object.assign(c, patch); });
  const deleteColumn = (colId: string) => update((b) => { b.columns = b.columns.filter((c) => c.id !== colId); });
  const clearColumn = (colId: string) => update((b) => { const c = b.columns.find((x) => x.id === colId); if (c) c.cards = []; });

  // ── Étiquettes ─────────────────────────────────────────────────────
  const addLabel = () => update((b) => { b.labels.push({ id: uid(), name: "Nouvelle étiquette", color: LABEL_COLORS[b.labels.length % LABEL_COLORS.length] }); });
  const patchLabel = (lid: string, patch: Partial<Label>) => update((b) => { const l = b.labels.find((x) => x.id === lid); if (l) Object.assign(l, patch); });
  const deleteLabel = (lid: string) => update((b) => { b.labels = b.labels.filter((l) => l.id !== lid); for (const c of b.columns) for (const k of c.cards) k.labels = (k.labels ?? []).filter((x) => x !== lid); });

  const applyAi = (data: unknown) => {
    const d = data as { columns?: { title: string; cards: string[] }[] };
    if (!d?.columns?.length) return;
    update((b) => { b.columns = d.columns!.map((c, i) => ({ id: uid(), title: c.title, color: COLUMN_COLORS[i % COLUMN_COLORS.length], cards: (c.cards ?? []).map((t) => ({ id: uid(), title: t, priority: "none", labels: [], checklist: [] })) })); });
  };

  // ── Filtres ────────────────────────────────────────────────────────
  const activeFilters = search.trim() !== "" || fLabels.size > 0 || fPrios.size > 0;
  const matches = (k: Card) => {
    if (search.trim() && !((k.title + " " + (k.desc ?? "")).toLowerCase().includes(search.trim().toLowerCase()))) return false;
    if (fLabels.size && !(k.labels ?? []).some((l) => fLabels.has(l))) return false;
    if (fPrios.size && !fPrios.has(k.priority ?? "none")) return false;
    return true;
  };
  const resetFilters = () => { setSearch(""); setFLabels(new Set()); setFPrios(new Set()); };

  // ── Glisser-déposer (pointer) ──────────────────────────────────────
  const computeCardDrop = (x: number, y: number): DropCard => {
    const root = boardRef.current; if (!root) return null;
    const cols = Array.from(root.querySelectorAll<HTMLElement>("[data-col-id]"));
    for (const colEl of cols) {
      const r = colEl.getBoundingClientRect();
      if (x >= r.left && x <= r.right) {
        const colId = colEl.getAttribute("data-col-id")!;
        const cardEls = Array.from(colEl.querySelectorAll<HTMLElement>("[data-card-id]")).filter((el) => el.getAttribute("data-card-id") !== dragRef.current?.id);
        let index = cardEls.length;
        for (let i = 0; i < cardEls.length; i++) {
          const cr = cardEls[i].getBoundingClientRect();
          if (y < cr.top + cr.height / 2) { index = i; break; }
        }
        return { col: colId, index };
      }
    }
    return null;
  };
  const computeColDrop = (x: number): number | null => {
    const root = boardRef.current; if (!root) return null;
    const cols = Array.from(root.querySelectorAll<HTMLElement>("[data-col-id]"));
    let index = cols.length;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].getAttribute("data-col-id") === dragRef.current?.id) continue;
      const r = cols[i].getBoundingClientRect();
      if (x < r.left + r.width / 2) { index = i; break; }
    }
    return index;
  };
  const startDrag = (e: React.PointerEvent, kind: "card" | "col", id: string, w: number) => {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { kind, id, w }; moved.current = false;
    setPos({ x: e.clientX, y: e.clientY });
    const onMove = (ev: PointerEvent) => {
      moved.current = true;
      setDrag(dragRef.current);
      setPos({ x: ev.clientX, y: ev.clientY });
      if (dragRef.current?.kind === "card") { const d = computeCardDrop(ev.clientX, ev.clientY); dropCardRef.current = d; setDropCard(d); }
      else { const d = computeColDrop(ev.clientX); dropColRef.current = d; setDropCol(d); }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const g = dragRef.current;
      if (g && moved.current) {
        if (g.kind === "card" && dropCardRef.current) {
          const target = dropCardRef.current;
          update((b) => {
            let card: Card | undefined;
            for (const c of b.columns) { const i = c.cards.findIndex((k) => k.id === g.id); if (i >= 0) { card = c.cards.splice(i, 1)[0]; break; } }
            const col = b.columns.find((c) => c.id === target.col);
            if (card && col) col.cards.splice(Math.min(target.index, col.cards.length), 0, card);
          });
        } else if (g.kind === "col" && dropColRef.current != null) {
          const target = dropColRef.current;
          update((b) => { const i = b.columns.findIndex((c) => c.id === g.id); if (i < 0) return; const [c] = b.columns.splice(i, 1); b.columns.splice(Math.min(target, b.columns.length), 0, c); });
        }
      }
      dragRef.current = null; dropCardRef.current = null; dropColRef.current = null;
      setDrag(null); setDropCard(null); setDropCol(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const labelById = useMemo(() => { const m = new Map<string, Label>(); for (const l of board.labels) m.set(l.id, l); return m; }, [board.labels]);
  const totalCards = board.columns.reduce((n, c) => n + c.cards.length, 0);
  const activeCard = openCard ? board.columns.find((c) => c.id === openCard.col)?.cards.find((k) => k.id === openCard.card) : null;
  const dragCard = drag?.kind === "card" ? board.columns.flatMap((c) => c.cards).find((k) => k.id === drag.id) : null;
  const dragColData = drag?.kind === "col" ? board.columns.find((c) => c.id === drag.id) : null;

  return (
    <div className="flex h-full min-h-0 flex-col select-none">
      <RealtimeEngine id={id} shared={shared} mode="blob" content={serialized} onRemote={applyRemoteString} fetchRemote={fetchRemote} setPeers={setPeers} actions={actions} />

      {/* En-tête */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 sm:px-5 flex items-center gap-2 sm:gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour"><ArrowLeft className="size-5" /></Link>
        <KanbanSquare className="size-4 shrink-0 text-orange-400" />
        <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 w-40 sm:w-64 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" placeholder="Tableau sans titre" />
        <div className="ml-auto"><CollabBar peers={peers} /></div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {flash ? <span className="flex items-center gap-1 text-cyan-300"><RefreshCw className="size-3.5" /> <span className="hidden sm:inline">Mis à jour</span></span> : save === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : save === "error" ? <span className="text-red-400">Erreur</span> : <Check className="size-3.5 text-emerald-400" />}
        </div>
        <AiAssistant kind="board" title="Assistant tâches" accent="#f97316" onApplyData={applyAi} placeholder="Ex. « plan de lancement d'un produit »" quickActions={[{ action: "generate", label: "Générer des tâches" }]} />
      </header>

      {/* Barre d'outils */}
      <div className="h-11 shrink-0 border-b border-white/10 bg-white/[0.02] px-3 sm:px-5 flex items-center gap-2 overflow-x-auto">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="h-8 w-40 sm:w-56 rounded-lg border border-white/10 bg-white/5 pl-8 pr-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400" />
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setFilterOpen((v) => !v)} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition ${fLabels.size || fPrios.size ? "border-brand-400/50 bg-brand-500/15 text-white" : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"}`}>
            <Filter className="size-4" /> <span className="hidden sm:inline">Filtres</span>{(fLabels.size + fPrios.size) > 0 && <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold">{fLabels.size + fPrios.size}</span>}
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
              <div className="absolute left-0 top-10 z-40 w-64 rounded-xl border border-white/10 bg-[#0f1017]/97 p-3 shadow-2xl backdrop-blur-xl">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Priorité</p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {PRIORITIES.filter((p) => p.k !== "none").map((p) => (
                    <button key={p.k} onClick={() => setFPrios((s) => { const n = new Set(s); n.has(p.k) ? n.delete(p.k) : n.add(p.k); return n; })} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${fPrios.has(p.k) ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}>
                      <span className="size-2 rounded-full" style={{ background: p.color }} /> {p.l}
                    </button>
                  ))}
                </div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Étiquettes</p>
                <div className="flex flex-wrap gap-1.5">
                  {board.labels.length === 0 && <span className="text-xs text-muted">Aucune étiquette.</span>}
                  {board.labels.map((l) => (
                    <button key={l.id} onClick={() => setFLabels((s) => { const n = new Set(s); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; })} className={`rounded-full px-2.5 py-1 text-xs font-medium ${fLabels.has(l.id) ? "text-white ring-2 ring-white/40" : "text-white/90"}`} style={{ background: l.color + "cc" }}>{l.name || "Sans nom"}</button>
                  ))}
                </div>
                {activeFilters && <button onClick={resetFilters} className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-xs text-muted hover:bg-white/5">Réinitialiser les filtres</button>}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setLabelsOpen(true)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/85 hover:bg-white/10"><Tag className="size-4" /> <span className="hidden sm:inline">Étiquettes</span></button>
        <div className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted">{totalCards} carte{totalCards > 1 ? "s" : ""} · {board.columns.length} colonne{board.columns.length > 1 ? "s" : ""}</div>
      </div>

      {/* Colonnes */}
      <div ref={boardRef} className="flex-1 min-h-0 overflow-x-auto p-3 sm:p-4">
        <div className="flex h-full items-start gap-3">
          {board.columns.map((col, ci) => {
            const shown = col.cards.filter(matches);
            const over = col.wip != null && col.cards.length > col.wip;
            const isDragCol = drag?.kind === "col" && drag.id === col.id;
            return (
              <div key={col.id} className="flex h-full flex-col">
                {dropCol === ci && drag?.kind === "col" && <div className="mx-1 mb-1 h-1 w-72 rounded-full bg-brand-400" />}
                <div data-col-id={col.id} className={`flex max-h-full w-72 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] transition ${isDragCol ? "opacity-30" : ""}`}>
                  {/* En-tête de colonne */}
                  <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-2">
                    <button onPointerDown={(e) => startDrag(e, "col", col.id, 288)} className="cursor-grab touch-none text-muted hover:text-white" title="Déplacer la colonne"><GripVertical className="size-4" /></button>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: col.color ?? "#64748b" }} />
                    <input value={col.title} onChange={(e) => patchColumn(col.id, { title: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
                    <span className={`shrink-0 rounded px-1.5 text-xs ${over ? "bg-red-500/20 text-red-300" : "text-muted"}`}>{col.cards.length}{col.wip != null ? `/${col.wip}` : ""}</span>
                    <div className="relative shrink-0">
                      <button onClick={() => setColMenu(colMenu === col.id ? null : col.id)} className="grid size-6 place-items-center rounded text-muted hover:bg-white/10 hover:text-white"><MoreHorizontal className="size-4" /></button>
                      {colMenu === col.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setColMenu(null)} />
                          <div className="absolute right-0 top-7 z-40 w-52 rounded-xl border border-white/10 bg-[#0f1017]/97 p-2 shadow-2xl backdrop-blur-xl">
                            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Couleur</p>
                            <div className="mb-2 flex flex-wrap gap-1.5 px-1">
                              {COLUMN_COLORS.map((c) => <button key={c} onClick={() => patchColumn(col.id, { color: c })} className={`size-5 rounded-md border ${col.color === c ? "border-white ring-2 ring-white/30" : "border-white/15"}`} style={{ background: c }} />)}
                            </div>
                            <label className="flex items-center gap-2 px-1 py-1.5 text-sm text-white/85">
                              <span className="text-muted">Limite (WIP)</span>
                              <input type="number" min={0} value={col.wip ?? ""} onChange={(e) => patchColumn(col.id, { wip: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} placeholder="—" className="ml-auto h-7 w-16 rounded-lg border border-white/10 bg-white/5 px-2 text-center text-sm outline-none" />
                            </label>
                            <button onClick={() => { clearColumn(col.id); setColMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/5"><Layers className="size-4 text-muted" /> Vider la colonne</button>
                            <button onClick={() => { deleteColumn(col.id); setColMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="size-4" /> Supprimer la colonne</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Cartes */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {shown.map((card, idx) => (
                      <div key={card.id}>
                        {dropCard && dropCard.col === col.id && dropCard.index === idx && drag?.kind === "card" && <div className="mb-2 h-1 rounded-full bg-brand-400" />}
                        <CardFace card={card} labels={labelById} hidden={drag?.kind === "card" && drag.id === card.id} onOpen={() => setOpenCard({ col: col.id, card: card.id })} onDrag={(e) => startDrag(e, "card", card.id, 260)} />
                      </div>
                    ))}
                    {dropCard && dropCard.col === col.id && dropCard.index >= shown.length && drag?.kind === "card" && <div className="mb-2 h-1 rounded-full bg-brand-400" />}
                    {shown.length === 0 && col.cards.length > 0 && <p className="px-1 py-2 text-center text-xs text-muted">Aucune carte ne correspond au filtre.</p>}
                    <AddCard onAdd={(t) => addCard(col.id, t)} />
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={addColumn} className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 text-sm text-muted hover:border-white/30 hover:text-white transition"><Plus className="size-4" /> Colonne</button>
        </div>
      </div>

      {/* Fantôme de glissement */}
      {drag && typeof document !== "undefined" && createPortal(
        <div className="pointer-events-none fixed z-[90] -rotate-2 opacity-90" style={{ left: pos.x + 8, top: pos.y + 8, width: drag.w }}>
          {dragCard ? <CardFace card={dragCard} labels={labelById} onOpen={() => {}} onDrag={() => {}} /> : dragColData ? (
            <div className="rounded-2xl border border-white/15 bg-[#12141f] px-3 py-2 text-sm font-semibold shadow-2xl"><span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: dragColData.color ?? "#64748b" }} />{dragColData.title}</div>
          ) : null}
        </div>, document.body,
      )}

      {/* Fiche détaillée */}
      {activeCard && openCard && typeof document !== "undefined" && createPortal(
        <CardModal card={activeCard} labels={board.labels} onClose={() => setOpenCard(null)}
          onPatch={(p) => patchCard(openCard.col, openCard.card, p)}
          onDelete={() => { deleteCard(openCard.col, openCard.card); setOpenCard(null); }}
          onDup={() => { dupCard(openCard.col, openCard.card); setOpenCard(null); }} />, document.body,
      )}

      {/* Gestionnaire d'étiquettes */}
      {labelsOpen && typeof document !== "undefined" && createPortal(
        <LabelsManager labels={board.labels} onClose={() => setLabelsOpen(false)} onAdd={addLabel} onPatch={patchLabel} onDelete={deleteLabel} />, document.body,
      )}
    </div>
  );
}

// ── Face d'une carte ─────────────────────────────────────────────────
function CardFace({ card, labels, hidden, onOpen, onDrag }: {
  card: Card; labels: Map<string, Label>; hidden?: boolean; onOpen: () => void; onDrag: (e: React.PointerEvent) => void;
}) {
  const due = fmtDue(card.due);
  const p = prio(card.priority);
  const done = (card.checklist ?? []).filter((c) => c.done).length;
  const total = (card.checklist ?? []).length;
  const cardLabels = (card.labels ?? []).map((id) => labels.get(id)).filter(Boolean) as Label[];
  return (
    <div data-card-id={card.id} onClick={onOpen} className={`group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-sm transition hover:border-white/25 hover:bg-white/[0.06] ${hidden ? "opacity-30" : ""}`}>
      {card.cover && <div className="h-1.5" style={{ background: card.cover }} />}
      <div className="p-2.5">
        {cardLabels.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {cardLabels.map((l) => <span key={l.id} className="h-1.5 w-8 rounded-full" style={{ background: l.color }} title={l.name} />)}
          </div>
        )}
        <div className="flex items-start gap-1.5">
          <p className="min-w-0 flex-1 text-sm text-ink/90">{card.title || <span className="text-white/30">Sans titre</span>}</p>
          <button onPointerDown={onDrag} onClick={(e) => e.stopPropagation()} className="shrink-0 cursor-grab touch-none text-white/20 opacity-0 transition group-hover:opacity-100 hover:text-white/60" title="Déplacer"><GripVertical className="size-4" /></button>
        </div>
        {(card.priority && card.priority !== "none") || due || total > 0 || card.desc || card.assignee ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            {card.priority && card.priority !== "none" && <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: p.color + "22", color: p.color }}><Flag className="size-3" />{p.l}</span>}
            {due && <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: due.tone + "22", color: due.tone }}><Calendar className="size-3" />{due.label}</span>}
            {total > 0 && <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${done === total ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-muted"}`}><ListChecks className="size-3" />{done}/{total}</span>}
            {card.desc && <AlignLeft className="size-3.5 text-muted" />}
            {card.assignee && <span className="ml-auto grid size-5 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: avatarColor(card.assignee) }} title={card.assignee}>{initials(card.assignee)}</span>}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Ajout rapide d'une carte ─────────────────────────────────────────
function AddCard({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-white/5 hover:text-white"><Plus className="size-4" /> Ajouter une carte</button>;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
      <textarea autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (v.trim()) { onAdd(v); setV(""); } } if (e.key === "Escape") { setOpen(false); setV(""); } }} placeholder="Titre de la carte…" rows={2} className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
      <div className="mt-1 flex items-center gap-1.5">
        <button onClick={() => { if (v.trim()) { onAdd(v); setV(""); } }} className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:brightness-110">Ajouter</button>
        <button onClick={() => { setOpen(false); setV(""); }} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-white/5"><X className="size-4" /></button>
      </div>
    </div>
  );
}

// ── Fiche détaillée (modale) ─────────────────────────────────────────
function CardModal({ card, labels, onClose, onPatch, onDelete, onDup }: {
  card: Card; labels: Label[]; onClose: () => void; onPatch: (p: Partial<Card>) => void; onDelete: () => void; onDup: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const done = (card.checklist ?? []).filter((c) => c.done).length;
  const total = (card.checklist ?? []).length;
  const toggleLabel = (lid: string) => { const set = new Set(card.labels ?? []); set.has(lid) ? set.delete(lid) : set.add(lid); onPatch({ labels: [...set] }); };
  const addCheck = (text: string) => { const t = text.trim(); if (!t) return; onPatch({ checklist: [...(card.checklist ?? []), { id: uid(), text: t, done: false }] }); };
  const patchCheck = (cid: string, patch: Partial<Check>) => onPatch({ checklist: (card.checklist ?? []).map((c) => c.id === cid ? { ...c, ...patch } : c) });
  const delCheck = (cid: string) => onPatch({ checklist: (card.checklist ?? []).filter((c) => c.id !== cid) });

  return (
    <div className="fixed inset-0 z-[80] grid place-items-start justify-center overflow-y-auto bg-black/60 p-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f1017]/97 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        {card.cover && <div className="h-3 rounded-t-2xl" style={{ background: card.cover }} />}
        <div className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <CircleDot className="mt-1 size-5 shrink-0 text-orange-400" />
            <textarea value={card.title} onChange={(e) => onPatch({ title: e.target.value })} rows={1} className="min-w-0 flex-1 resize-none bg-transparent text-lg font-semibold text-white outline-none" placeholder="Titre de la carte" />
            <button onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
          </div>

          {/* Priorité + échéance + responsable */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field icon={Flag} label="Priorité">
              <select value={card.priority ?? "none"} onChange={(e) => onPatch({ priority: e.target.value as Priority })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none">
                {PRIORITIES.map((p) => <option key={p.k} value={p.k} className="bg-[#0f1017]">{p.l}</option>)}
              </select>
            </Field>
            <Field icon={CalendarClock} label="Échéance">
              <input type="date" value={card.due ?? ""} onChange={(e) => onPatch({ due: e.target.value || null })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none [color-scheme:dark]" />
            </Field>
            <Field icon={CircleDot} label="Responsable">
              <input value={card.assignee ?? ""} onChange={(e) => onPatch({ assignee: e.target.value })} placeholder="Nom" className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white outline-none placeholder:text-white/30" />
            </Field>
          </div>

          {/* Étiquettes */}
          <Field icon={Tag} label="Étiquettes">
            <div className="flex flex-wrap gap-1.5">
              {labels.length === 0 && <span className="text-xs text-muted">Créez des étiquettes depuis la barre d'outils.</span>}
              {labels.map((l) => {
                const on = (card.labels ?? []).includes(l.id);
                return <button key={l.id} onClick={() => toggleLabel(l.id)} className={`rounded-full px-2.5 py-1 text-xs font-medium text-white transition ${on ? "ring-2 ring-white/50" : "opacity-60 hover:opacity-100"}`} style={{ background: l.color }}>{l.name || "Sans nom"}</button>;
              })}
            </div>
          </Field>

          {/* Couleur de couverture */}
          <Field icon={Palette} label="Couverture">
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => onPatch({ cover: null })} className={`grid size-6 place-items-center rounded-md border text-[9px] ${!card.cover ? "border-brand-400" : "border-white/15"}`}>∅</button>
              {LABEL_COLORS.map((c) => <button key={c} onClick={() => onPatch({ cover: c })} className={`size-6 rounded-md border ${card.cover === c ? "border-white ring-2 ring-white/30" : "border-white/15"}`} style={{ background: c }} />)}
            </div>
          </Field>

          {/* Description */}
          <Field icon={AlignLeft} label="Description">
            <textarea value={card.desc ?? ""} onChange={(e) => onPatch({ desc: e.target.value })} rows={4} placeholder="Ajoutez plus de détails…" className="w-full resize-y rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </Field>

          {/* Checklist */}
          <div className="mb-2">
            <div className="mb-1.5 flex items-center gap-2">
              <ListChecks className="size-4 text-muted" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Checklist</span>
              {total > 0 && <span className="ml-auto text-xs text-muted">{done}/{total}</span>}
            </div>
            {total > 0 && <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / total) * 100}%` }} /></div>}
            <div className="space-y-1">
              {(card.checklist ?? []).map((c) => (
                <div key={c.id} className="group flex items-center gap-2">
                  <button onClick={() => patchCheck(c.id, { done: !c.done })} className={`grid size-4 shrink-0 place-items-center rounded border ${c.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-white/25"}`}>{c.done && <Check className="size-3" />}</button>
                  <input value={c.text} onChange={(e) => patchCheck(c.id, { text: e.target.value })} className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${c.done ? "text-muted line-through" : "text-white/90"}`} />
                  <button onClick={() => delCheck(c.id)} className="grid size-6 shrink-0 place-items-center rounded text-muted opacity-0 transition hover:text-red-400 group-hover:opacity-100"><X className="size-3.5" /></button>
                </div>
              ))}
            </div>
            <AddCheck onAdd={addCheck} />
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
            <button onClick={onDup} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10"><Copy className="size-4" /> Dupliquer</button>
            <button onClick={onDelete} className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="size-4" /> Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function AddCheck({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onAdd(v); setV(""); } }} placeholder="Ajouter un élément…" className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400" />
      <button onClick={() => { onAdd(v); setV(""); }} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5"><Plus className="size-4" /></button>
    </div>
  );
}

// ── Gestionnaire d'étiquettes ────────────────────────────────────────
function LabelsManager({ labels, onClose, onAdd, onPatch, onDelete }: {
  labels: Label[]; onClose: () => void; onAdd: () => void; onPatch: (id: string, p: Partial<Label>) => void; onDelete: (id: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1017]/97 p-5 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Tag className="size-5 text-brand-300" />
          <h3 className="text-lg font-semibold text-white">Étiquettes</h3>
          <button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="space-y-2">
          {labels.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <input value={l.name} onChange={(e) => onPatch(l.id, { name: e.target.value })} placeholder="Nom" className="min-w-0 flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30" style={{ borderLeft: `3px solid ${l.color}` }} />
              <div className="flex flex-wrap gap-1">
                {LABEL_COLORS.slice(0, 5).map((c) => <button key={c} onClick={() => onPatch(l.id, { color: c })} className={`size-4 rounded ${l.color === c ? "ring-2 ring-white/50" : ""}`} style={{ background: c }} />)}
              </div>
              <button onClick={() => onDelete(l.id)} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 className="size-4" /></button>
            </div>
          ))}
          {labels.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-center text-xs text-muted">Aucune étiquette pour l'instant.</p>}
        </div>
        <button onClick={onAdd} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2.5 text-sm text-white/80 hover:border-brand-400/50 hover:bg-white/[0.03] hover:text-white"><Plus className="size-4" /> Nouvelle étiquette</button>
      </div>
    </div>
  );
}

function Field({ icon: I, label, children }: { icon: typeof Tag; label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted"><I className="size-3.5" /> {label}</span>
      {children}
    </label>
  );
}
