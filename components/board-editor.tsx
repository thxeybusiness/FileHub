"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { marked } from "marked";
import {
  ArrowLeft, Check, Loader2, KanbanSquare, Plus, X, RefreshCw, Search, Filter, Tag,
  Trash2, Calendar, Flag, GripVertical, MoreHorizontal, Copy, ListChecks, ChevronDown,
  Palette, AlignLeft, CircleDot, CalendarClock, Layers, List, CalendarDays, ArrowUpDown,
  Archive, ChevronLeft, ChevronRight, Timer, RotateCcw, Eye, EyeOff, Minimize2, History, MessageSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";
import { RealtimeEngine, type Actions } from "./realtime";
import { CollabBar } from "./collab-bar";
import { VersionHistory } from "./version-history";
import { CommentsPanel } from "./comments-panel";
import { ExportButton } from "./export-button";
import { downloadText, safeFilename } from "@/lib/export-doc";
import type { Peer } from "./use-collab";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";
type Priority = "none" | "low" | "medium" | "high" | "urgent";
type Check = { id: string; text: string; done: boolean };
type Label = { id: string; name: string; color: string };
type Card = {
  id: string; title: string; desc?: string; labels?: string[]; priority?: Priority;
  due?: string | null; start?: string | null; estimate?: number | null;
  checklist?: Check[]; cover?: string | null; assignee?: string; archived?: boolean;
};
type Column = { id: string; title: string; color?: string | null; wip?: number | null; collapsed?: boolean; cards: Card[] };
type Board = { columns: Column[]; labels: Label[] };

type View = "board" | "list" | "calendar";
type SortKey = "manual" | "priority" | "due" | "title";
type GroupKey = "none" | "assignee" | "priority" | "label";

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const PRIORITIES: { k: Priority; l: string; color: string }[] = [
  { k: "none", l: "Aucune", color: "#64748b" },
  { k: "low", l: "Basse", color: "#22c55e" },
  { k: "medium", l: "Moyenne", color: "#eab308" },
  { k: "high", l: "Haute", color: "#f97316" },
  { k: "urgent", l: "Urgente", color: "#ef4444" },
];
const prio = (k?: Priority) => PRIORITIES.find((p) => p.k === (k ?? "none")) ?? PRIORITIES[0];
const PRANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
const LABEL_COLORS = ["#5b8bff", "#7b3bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff", "#94a3b8"];
const COLUMN_COLORS = ["#5b8bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff"];
const SORTS: { k: SortKey; l: string }[] = [{ k: "manual", l: "Manuel" }, { k: "priority", l: "Priorité" }, { k: "due", l: "Échéance" }, { k: "title", l: "Titre" }];
const GROUPS: { k: GroupKey; l: string }[] = [{ k: "none", l: "Colonne" }, { k: "assignee", l: "Responsable" }, { k: "priority", l: "Priorité" }, { k: "label", l: "Étiquette" }];

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
    start: (c.start as string) ?? null,
    estimate: typeof c.estimate === "number" ? (c.estimate as number) : null,
    checklist: Array.isArray(c.checklist) ? (c.checklist as Check[]).map((x) => ({ id: x.id || uid(), text: x.text || "", done: !!x.done })) : [],
    cover: (c.cover as string) ?? null,
    assignee: (c.assignee as string) ?? "",
    archived: !!c.archived,
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
function sortCards(cards: Card[], sort: SortKey): Card[] {
  if (sort === "manual") return cards;
  const a = [...cards];
  if (sort === "priority") a.sort((x, y) => PRANK[x.priority ?? "none"] - PRANK[y.priority ?? "none"]);
  else if (sort === "due") a.sort((x, y) => (x.due ? Date.parse(x.due) : Infinity) - (y.due ? Date.parse(y.due) : Infinity));
  else if (sort === "title") a.sort((x, y) => x.title.localeCompare(y.title));
  return a;
}

type Drag = { kind: "card" | "col"; id: string; w: number } | null;
type DropCard = { col: string; beforeId: string | null } | null;
type Placed = { card: Card; col: Column };

export function BoardEditor({
  id, initialName, initialContent, backHref, crumbs, shared = false,
}: {
  id: string; initialName: string; initialContent: string; backHref: string; crumbs: Crumb[]; shared?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [board, setBoard] = useState<Board>(() => parse(initialContent));
  const [save, setSave] = useState<SaveState>("saved");
  const [flash, setFlash] = useState(false);
  const [view, setView] = useState<View>("board");
  const [sort, setSort] = useState<SortKey>("manual");
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fLabels, setFLabels] = useState<Set<string>>(new Set());
  const [fPrios, setFPrios] = useState<Set<Priority>>(new Set());
  const [fMine, setFMine] = useState(false);
  const [colMenu, setColMenu] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [dropCard, setDropCard] = useState<DropCard>(null);
  const [dropCol, setDropCol] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag>(null);
  const dropCardRef = useRef<DropCard>(null);
  const dropColRef = useRef<string | null>(null);
  const moved = useRef(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [comOpen, setComOpen] = useState(false);
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

  // ── Cartes (opérations par id) ─────────────────────────────────────
  const findCard = (b: Board, cid: string): { col: Column; card: Card } | null => {
    for (const c of b.columns) { const k = c.cards.find((x) => x.id === cid); if (k) return { col: c, card: k }; }
    return null;
  };
  const addCard = (colId: string, title: string) => {
    const t = title.trim(); if (!t) return;
    update((b) => { b.columns.find((c) => c.id === colId)?.cards.push({ id: uid(), title: t, priority: "none", labels: [], checklist: [] }); });
  };
  const patchCard = (cid: string, patch: Partial<Card>) => update((b) => { const f = findCard(b, cid); if (f) Object.assign(f.card, patch); });
  const deleteCard = (cid: string) => update((b) => { for (const c of b.columns) c.cards = c.cards.filter((k) => k.id !== cid); });
  const dupCard = (cid: string) => update((b) => { for (const c of b.columns) { const i = c.cards.findIndex((x) => x.id === cid); if (i >= 0) { c.cards.splice(i + 1, 0, { ...structuredClone(c.cards[i]), id: uid(), archived: false }); return; } } });

  // ── Colonnes ───────────────────────────────────────────────────────
  const addColumn = () => update((b) => { b.columns.push({ id: uid(), title: "Nouvelle colonne", cards: [], color: COLUMN_COLORS[b.columns.length % COLUMN_COLORS.length] }); });
  const patchColumn = (colId: string, patch: Partial<Column>) => update((b) => { const c = b.columns.find((x) => x.id === colId); if (c) Object.assign(c, patch); });
  const deleteColumn = (colId: string) => update((b) => { b.columns = b.columns.filter((c) => c.id !== colId); });
  const clearColumn = (colId: string) => update((b) => { const c = b.columns.find((x) => x.id === colId); if (c) c.cards = c.cards.filter((k) => k.archived); });

  // ── Étiquettes ─────────────────────────────────────────────────────
  const addLabel = () => update((b) => { b.labels.push({ id: uid(), name: "Nouvelle étiquette", color: LABEL_COLORS[b.labels.length % LABEL_COLORS.length] }); });
  const patchLabel = (lid: string, patch: Partial<Label>) => update((b) => { const l = b.labels.find((x) => x.id === lid); if (l) Object.assign(l, patch); });
  const deleteLabel = (lid: string) => update((b) => { b.labels = b.labels.filter((l) => l.id !== lid); for (const c of b.columns) for (const k of c.cards) k.labels = (k.labels ?? []).filter((x) => x !== lid); });

  const applyAi = (data: unknown) => {
    const d = data as { columns?: { title: string; cards: string[] }[] };
    if (!d?.columns?.length) return;
    update((b) => { b.columns = d.columns!.map((c, i) => ({ id: uid(), title: c.title, color: COLUMN_COLORS[i % COLUMN_COLORS.length], cards: (c.cards ?? []).map((t) => ({ id: uid(), title: t, priority: "none" as Priority, labels: [], checklist: [] })) })); });
  };

  // ── Filtres ────────────────────────────────────────────────────────
  const activeFilters = search.trim() !== "" || fLabels.size > 0 || fPrios.size > 0 || fMine;
  const matches = useCallback((k: Card) => {
    if (k.archived) return false;
    if (search.trim() && !((k.title + " " + (k.desc ?? "")).toLowerCase().includes(search.trim().toLowerCase()))) return false;
    if (fLabels.size && !(k.labels ?? []).some((l) => fLabels.has(l))) return false;
    if (fPrios.size && !fPrios.has(k.priority ?? "none")) return false;
    if (fMine && !(k.assignee ?? "").trim()) return false;
    return true;
  }, [search, fLabels, fPrios, fMine]);
  const resetFilters = () => { setSearch(""); setFLabels(new Set()); setFPrios(new Set()); setFMine(false); };

  const labelById = useMemo(() => { const m = new Map<string, Label>(); for (const l of board.labels) m.set(l.id, l); return m; }, [board.labels]);
  const visible: Placed[] = useMemo(() => board.columns.flatMap((c) => c.cards.filter(matches).map((card) => ({ card, col: c }))), [board.columns, matches]);
  const archivedCards: Placed[] = useMemo(() => board.columns.flatMap((c) => c.cards.filter((k) => k.archived).map((card) => ({ card, col: c }))), [board.columns]);
  const totalCards = board.columns.reduce((n, c) => n + c.cards.filter((k) => !k.archived).length, 0);

  // ── Glisser-déposer (par id, robuste aux filtres/tri) ──────────────
  const computeCardDrop = (x: number, y: number): DropCard => {
    const root = boardRef.current; if (!root) return null;
    for (const colEl of Array.from(root.querySelectorAll<HTMLElement>("[data-col-id]"))) {
      const r = colEl.getBoundingClientRect();
      if (x >= r.left && x <= r.right) {
        const colId = colEl.getAttribute("data-col-id")!;
        const cardEls = Array.from(colEl.querySelectorAll<HTMLElement>("[data-card-id]")).filter((el) => el.getAttribute("data-card-id") !== dragRef.current?.id);
        for (const el of cardEls) { const cr = el.getBoundingClientRect(); if (y < cr.top + cr.height / 2) return { col: colId, beforeId: el.getAttribute("data-card-id") }; }
        return { col: colId, beforeId: null };
      }
    }
    return null;
  };
  const computeColDrop = (x: number): string | null => {
    const root = boardRef.current; if (!root) return "__end__";
    for (const colEl of Array.from(root.querySelectorAll<HTMLElement>("[data-col-id]"))) {
      if (colEl.getAttribute("data-col-id") === dragRef.current?.id) continue;
      const r = colEl.getBoundingClientRect();
      if (x < r.left + r.width / 2) return colEl.getAttribute("data-col-id");
    }
    return "__end__";
  };
  const startDrag = (e: React.PointerEvent, kind: "card" | "col", dId: string, w: number) => {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { kind, id: dId, w }; moved.current = false;
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
          const t = dropCardRef.current;
          update((b) => {
            let card: Card | undefined;
            for (const c of b.columns) { const i = c.cards.findIndex((k) => k.id === g.id); if (i >= 0) { card = c.cards.splice(i, 1)[0]; break; } }
            const col = b.columns.find((c) => c.id === t.col);
            if (!card || !col) return;
            if (t.beforeId) { const bi = col.cards.findIndex((k) => k.id === t.beforeId); col.cards.splice(bi < 0 ? col.cards.length : bi, 0, card); }
            else col.cards.push(card);
          });
        } else if (g.kind === "col" && dropColRef.current) {
          const t = dropColRef.current;
          update((b) => { const i = b.columns.findIndex((c) => c.id === g.id); if (i < 0) return; const [c] = b.columns.splice(i, 1); if (t === "__end__") b.columns.push(c); else { const bi = b.columns.findIndex((x) => x.id === t); b.columns.splice(bi < 0 ? b.columns.length : bi, 0, c); } });
        }
      }
      dragRef.current = null; dropCardRef.current = null; dropColRef.current = null;
      setDrag(null); setDropCard(null); setDropCol(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const activeCard = openCard ? findCard(board, openCard)?.card ?? null : null;
  const dragCard = drag?.kind === "card" ? board.columns.flatMap((c) => c.cards).find((k) => k.id === drag.id) : null;
  const dragColData = drag?.kind === "col" ? board.columns.find((c) => c.id === drag.id) : null;

  return (
    <div className="flex h-full min-h-0 flex-col select-none">
      <RealtimeEngine id={id} shared={shared} mode="blob" content={serialized} onRemote={applyRemoteString} fetchRemote={fetchRemote} setPeers={setPeers} actions={actions} />
      <VersionHistory id={id} open={histOpen} onClose={() => setHistOpen(false)} onRestore={applyRemoteString} />
      <CommentsPanel id={id} open={comOpen} onClose={() => setComOpen(false)} />

      {/* En-tête */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 sm:px-5 flex items-center gap-2 sm:gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour"><ArrowLeft className="size-5" /></Link>
        <KanbanSquare className="size-4 shrink-0 text-orange-400" />
        <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 w-36 sm:w-56 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" placeholder="Tableau sans titre" />
        {/* Sélecteur de vue */}
        <div className="ml-1 hidden sm:flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
          {([["board", "Tableau", KanbanSquare], ["list", "Liste", List], ["calendar", "Calendrier", CalendarDays]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setView(k)} title={l} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition ${view === k ? "bg-brand-500/25 text-white" : "text-muted hover:bg-white/5"}`}><I className="size-3.5" /> <span className="hidden md:inline">{l}</span></button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ExportButton items={[{ label: "Données (.json)", onClick: () => downloadText(safeFilename(name) + ".json", serialized, "application/json") }]} />
        </div>
        <button onClick={() => setComOpen(true)} title="Commentaires" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
          <MessageSquare className="size-5" />
        </button>
        <button onClick={() => setHistOpen(true)} title="Historique des versions" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
          <History className="size-5" />
        </button>
        <div><CollabBar peers={peers} /></div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {flash ? <span className="flex items-center gap-1 text-cyan-300"><RefreshCw className="size-3.5" /> <span className="hidden sm:inline">Mis à jour</span></span> : save === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : save === "error" ? <span className="text-red-400">Erreur</span> : <Check className="size-3.5 text-emerald-400" />}
        </div>
        <AiAssistant kind="board" title="Assistant tâches" accent="#f97316" onApplyData={applyAi} placeholder="Ex. « plan de lancement d'un produit »" quickActions={[{ action: "generate", label: "Générer des tâches" }]} />
      </header>

      {/* Barre d'outils */}
      <div className="h-11 shrink-0 border-b border-white/10 bg-white/[0.02] px-3 sm:px-5 flex items-center gap-2 overflow-x-auto">
        {/* Vue (mobile) */}
        <div className="flex sm:hidden items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
          {([["board", KanbanSquare], ["list", List], ["calendar", CalendarDays]] as const).map(([k, I]) => (
            <button key={k} onClick={() => setView(k)} className={`grid size-7 place-items-center rounded-md ${view === k ? "bg-brand-500/25 text-white" : "text-muted"}`}><I className="size-4" /></button>
          ))}
        </div>
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="h-8 w-32 sm:w-52 rounded-lg border border-white/10 bg-white/5 pl-8 pr-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400" />
        </div>
        {/* Filtres */}
        <div className="relative shrink-0">
          <button onClick={() => setFilterOpen((v) => !v)} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition ${activeFilters ? "border-brand-400/50 bg-brand-500/15 text-white" : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"}`}>
            <Filter className="size-4" /> <span className="hidden sm:inline">Filtres</span>{(fLabels.size + fPrios.size + (fMine ? 1 : 0)) > 0 && <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold">{fLabels.size + fPrios.size + (fMine ? 1 : 0)}</span>}
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
              <div className="absolute left-0 top-10 z-40 w-64 rounded-xl border border-white/10 bg-[#0f1017]/97 p-3 shadow-2xl backdrop-blur-xl">
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-white/85"><input type="checkbox" checked={fMine} onChange={(e) => setFMine(e.target.checked)} className="accent-brand-500" /> Cartes attribuées seulement</label>
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
        {/* Trier & grouper */}
        <div className="relative shrink-0">
          <button onClick={() => setSortOpen((v) => !v)} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition ${sort !== "manual" || groupBy !== "none" ? "border-brand-400/50 bg-brand-500/15 text-white" : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"}`}><ArrowUpDown className="size-4" /> <span className="hidden sm:inline">Trier</span></button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
              <div className="absolute left-0 top-10 z-40 w-52 rounded-xl border border-white/10 bg-[#0f1017]/97 p-2 shadow-2xl backdrop-blur-xl">
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Trier par</p>
                {SORTS.map((s) => <button key={s.k} onClick={() => setSort(s.k)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm hover:bg-white/5 ${sort === s.k ? "text-white" : "text-white/70"}`}>{s.l}{sort === s.k && <Check className="size-3.5 text-brand-300" />}</button>)}
                <div className="my-1 h-px bg-white/10" />
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Grouper (liste)</p>
                {GROUPS.map((g) => <button key={g.k} onClick={() => setGroupBy(g.k)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm hover:bg-white/5 ${groupBy === g.k ? "text-white" : "text-white/70"}`}>{g.l}{groupBy === g.k && <Check className="size-3.5 text-brand-300" />}</button>)}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setLabelsOpen(true)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/85 hover:bg-white/10"><Tag className="size-4" /> <span className="hidden sm:inline">Étiquettes</span></button>
        {archivedCards.length > 0 && <button onClick={() => setArchiveOpen(true)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/85 hover:bg-white/10"><Archive className="size-4" /> <span className="hidden sm:inline">Archivées</span> <span className="grid size-4 place-items-center rounded-full bg-white/10 text-[10px]">{archivedCards.length}</span></button>}
        <div className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted">{totalCards} carte{totalCards > 1 ? "s" : ""}</div>
      </div>

      {/* Vues */}
      {view === "board" ? (
        <div ref={boardRef} className="flex-1 min-h-0 overflow-x-auto p-3 sm:p-4">
          <div className="flex h-full items-start gap-3">
            {board.columns.map((col) => {
              if (col.collapsed) {
                const n = col.cards.filter((k) => !k.archived).length;
                return (
                  <button key={col.id} onClick={() => patchColumn(col.id, { collapsed: false })} className="flex h-full w-11 shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-3 hover:bg-white/[0.06]" title="Déplier">
                    <span className="size-2.5 rounded-full" style={{ background: col.color ?? "#64748b" }} />
                    <span className="rounded bg-white/10 px-1.5 text-[10px] text-white/70">{n}</span>
                    <span className="mt-1 [writing-mode:vertical-rl] rotate-180 text-sm font-semibold text-white/80">{col.title}</span>
                  </button>
                );
              }
              const shown = sortCards(col.cards.filter(matches), sort);
              const over = col.wip != null && col.cards.filter((k) => !k.archived).length > col.wip;
              const isDragCol = drag?.kind === "col" && drag.id === col.id;
              return (
                <div key={col.id} className="flex h-full">
                  {dropCol === col.id && drag?.kind === "col" && <div className="mr-2 h-full w-1 self-stretch rounded-full bg-brand-400" />}
                  <div data-col-id={col.id} className={`flex max-h-full w-72 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] transition ${isDragCol ? "opacity-30" : ""}`}>
                    <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-2">
                      <button onPointerDown={(e) => startDrag(e, "col", col.id, 288)} className="cursor-grab touch-none text-muted hover:text-white" title="Déplacer la colonne"><GripVertical className="size-4" /></button>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: col.color ?? "#64748b" }} />
                      <input value={col.title} onChange={(e) => patchColumn(col.id, { title: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
                      <span className={`shrink-0 rounded px-1.5 text-xs ${over ? "bg-red-500/20 text-red-300" : "text-muted"}`}>{col.cards.filter((k) => !k.archived).length}{col.wip != null ? `/${col.wip}` : ""}</span>
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
                              <button onClick={() => { patchColumn(col.id, { collapsed: true }); setColMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/5"><Minimize2 className="size-4 text-muted" /> Réduire la colonne</button>
                              <button onClick={() => { clearColumn(col.id); setColMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/5"><Layers className="size-4 text-muted" /> Vider la colonne</button>
                              <button onClick={() => { deleteColumn(col.id); setColMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="size-4" /> Supprimer la colonne</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {shown.map((card) => (
                        <div key={card.id}>
                          {dropCard && dropCard.col === col.id && dropCard.beforeId === card.id && drag?.kind === "card" && <div className="mb-2 h-1 rounded-full bg-brand-400" />}
                          <CardFace card={card} labels={labelById} hidden={drag?.kind === "card" && drag.id === card.id} onOpen={() => setOpenCard(card.id)} onDrag={(e) => startDrag(e, "card", card.id, 260)} />
                        </div>
                      ))}
                      {dropCard && dropCard.col === col.id && dropCard.beforeId === null && drag?.kind === "card" && <div className="mb-2 h-1 rounded-full bg-brand-400" />}
                      {shown.length === 0 && col.cards.filter((k) => !k.archived).length > 0 && <p className="px-1 py-2 text-center text-xs text-muted">Aucune carte ne correspond au filtre.</p>}
                      <AddCard onAdd={(t) => addCard(col.id, t)} />
                    </div>
                  </div>
                </div>
              );
            })}
            {dropCol === "__end__" && drag?.kind === "col" && <div className="h-full w-1 rounded-full bg-brand-400" />}
            <button onClick={addColumn} className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 text-sm text-muted hover:border-white/30 hover:text-white transition"><Plus className="size-4" /> Colonne</button>
          </div>
        </div>
      ) : view === "list" ? (
        <ListView cards={visible} labels={labelById} sort={sort} groupBy={groupBy} onOpen={setOpenCard} />
      ) : (
        <CalendarView cards={visible} onOpen={setOpenCard} />
      )}

      {/* Fantôme de glissement */}
      {drag && typeof document !== "undefined" && createPortal(
        <div className="pointer-events-none fixed z-[90] -rotate-2 opacity-90" style={{ left: pos.x + 8, top: pos.y + 8, width: drag.w }}>
          {dragCard ? <CardFace card={dragCard} labels={labelById} onOpen={() => {}} onDrag={() => {}} /> : dragColData ? (
            <div className="rounded-2xl border border-white/15 bg-[#12141f] px-3 py-2 text-sm font-semibold shadow-2xl"><span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: dragColData.color ?? "#64748b" }} />{dragColData.title}</div>
          ) : null}
        </div>, document.body,
      )}

      {activeCard && openCard && typeof document !== "undefined" && createPortal(
        <CardModal card={activeCard} labels={board.labels} onClose={() => setOpenCard(null)}
          onPatch={(p) => patchCard(openCard, p)} onDelete={() => { deleteCard(openCard); setOpenCard(null); }}
          onDup={() => { dupCard(openCard); setOpenCard(null); }} onArchive={() => { patchCard(openCard, { archived: true }); setOpenCard(null); }} />, document.body,
      )}
      {labelsOpen && typeof document !== "undefined" && createPortal(
        <LabelsManager labels={board.labels} onClose={() => setLabelsOpen(false)} onAdd={addLabel} onPatch={patchLabel} onDelete={deleteLabel} />, document.body,
      )}
      {archiveOpen && typeof document !== "undefined" && createPortal(
        <ArchivePanel cards={archivedCards} onClose={() => setArchiveOpen(false)} onRestore={(cid) => patchCard(cid, { archived: false })} onDelete={(cid) => deleteCard(cid)} />, document.body,
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
        {(card.priority && card.priority !== "none") || due || total > 0 || card.desc || card.assignee || card.estimate ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            {card.priority && card.priority !== "none" && <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: p.color + "22", color: p.color }}><Flag className="size-3" />{p.l}</span>}
            {due && <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: due.tone + "22", color: due.tone }}><Calendar className="size-3" />{due.label}</span>}
            {typeof card.estimate === "number" && card.estimate > 0 && <span className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-muted"><Timer className="size-3" />{card.estimate}</span>}
            {total > 0 && <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${done === total ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-muted"}`}><ListChecks className="size-3" />{done}/{total}</span>}
            {card.desc && <AlignLeft className="size-3.5 text-muted" />}
            {card.assignee && <span className="ml-auto grid size-5 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: avatarColor(card.assignee) }} title={card.assignee}>{initials(card.assignee)}</span>}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Vue Liste ────────────────────────────────────────────────────────
function ListView({ cards, labels, sort, groupBy, onOpen }: {
  cards: Placed[]; labels: Map<string, Label>; sort: SortKey; groupBy: GroupKey; onOpen: (id: string) => void;
}) {
  const groups = useMemo(() => {
    if (groupBy === "none") {
      const byCol = new Map<string, { label: string; color?: string | null; items: Placed[] }>();
      for (const p of cards) { const g = byCol.get(p.col.id) ?? { label: p.col.title, color: p.col.color, items: [] }; g.items.push(p); byCol.set(p.col.id, g); }
      return [...byCol.values()];
    }
    if (groupBy === "priority") return PRIORITIES.slice().reverse().map((pr) => ({ label: pr.l, color: pr.color, items: cards.filter((p) => (p.card.priority ?? "none") === pr.k) })).filter((g) => g.items.length);
    if (groupBy === "assignee") {
      const m = new Map<string, Placed[]>();
      for (const p of cards) { const key = (p.card.assignee ?? "").trim() || "— Non attribué"; (m.get(key) ?? m.set(key, []).get(key)!).push(p); }
      return [...m.entries()].map(([label, items]) => ({ label, color: null, items }));
    }
    // label
    const out: { label: string; color?: string | null; items: Placed[] }[] = [];
    for (const l of labels.values()) { const items = cards.filter((p) => (p.card.labels ?? []).includes(l.id)); if (items.length) out.push({ label: l.name || "Sans nom", color: l.color, items }); }
    const none = cards.filter((p) => !(p.card.labels ?? []).some((id) => labels.has(id))); if (none.length) out.push({ label: "— Sans étiquette", color: null, items: none });
    return out;
  }, [cards, groupBy, labels]);

  return (
    <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-5">
      <div className="mx-auto max-w-4xl space-y-5">
        {cards.length === 0 && <p className="py-16 text-center text-sm text-muted">Aucune carte.</p>}
        {groups.map((g, i) => (
          <div key={i}>
            <div className="mb-1.5 flex items-center gap-2 px-1">
              {g.color && <span className="size-2.5 rounded-full" style={{ background: g.color }} />}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</p>
              <span className="text-xs text-muted">· {g.items.length}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              {sortCards(g.items.map((p) => p.card), sort).map((card, j) => {
                const due = fmtDue(card.due); const p = prio(card.priority);
                const cl = (card.labels ?? []).map((id) => labels.get(id)).filter(Boolean) as Label[];
                return (
                  <button key={card.id} onClick={() => onOpen(card.id)} className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-white/[0.04] ${j > 0 ? "border-t border-white/5" : ""}`}>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} title={p.l} />
                    <span className="min-w-0 flex-1 truncate text-sm text-white/90">{card.title || "Sans titre"}</span>
                    {cl.slice(0, 3).map((l) => <span key={l.id} className="hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white sm:inline" style={{ background: l.color + "cc" }}>{l.name}</span>)}
                    {typeof card.estimate === "number" && card.estimate > 0 && <span className="hidden shrink-0 items-center gap-1 text-[11px] text-muted sm:inline-flex"><Timer className="size-3" />{card.estimate}</span>}
                    {due && <span className="inline-flex shrink-0 items-center gap-1 text-[11px]" style={{ color: due.tone }}><Calendar className="size-3" />{due.label}</span>}
                    {card.assignee && <span className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: avatarColor(card.assignee) }} title={card.assignee}>{initials(card.assignee)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vue Calendrier ───────────────────────────────────────────────────
function CalendarView({ cards, onOpen }: { cards: Placed[]; onOpen: (id: string) => void }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const byDate = useMemo(() => { const map = new Map<string, Placed[]>(); for (const p of cards) if (p.card.due) { const arr = map.get(p.card.due) ?? []; arr.push(p); map.set(p.card.due, arr); } return map; }, [cards]);
  const noDate = cards.filter((p) => !p.card.due);
  const first = new Date(ym.y, ym.m, 1);
  const startWd = (first.getDay() + 6) % 7;
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const cells: (number | null)[] = [...Array(startWd).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (d: number) => setYm((s) => { const nm = s.m + d; return { y: s.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }; });

  return (
    <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => shift(-1)} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5"><ChevronLeft className="size-4" /></button>
          <h2 className="min-w-40 text-center text-sm font-semibold capitalize">{first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
          <button onClick={() => shift(1)} className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5"><ChevronRight className="size-4" /></button>
          <button onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })} className="ml-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted hover:bg-white/5">Aujourd'hui</button>
          {noDate.length > 0 && <span className="ml-auto text-xs text-muted">{noDate.length} sans échéance</span>}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d} className="bg-[#0d0f18] px-2 py-1.5 text-center text-[11px] font-medium text-muted">{d}</div>)}
          {cells.map((day, i) => {
            const ds = day ? `${ym.y}-${pad(ym.m + 1)}-${pad(day)}` : "";
            const items = day ? (byDate.get(ds) ?? []) : [];
            return (
              <div key={i} className={`min-h-[92px] bg-[#0a0c14] p-1 ${day ? "" : "opacity-40"}`}>
                {day && <div className={`mb-1 grid size-5 place-items-center rounded-full text-[11px] ${ds === todayStr ? "bg-brand-500 font-bold text-white" : "text-muted"}`}>{day}</div>}
                <div className="space-y-1">
                  {items.slice(0, 4).map((p) => (
                    <button key={p.card.id} onClick={() => onOpen(p.card.id)} className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] text-white/90 hover:bg-white/10" title={p.card.title}>
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: prio(p.card.priority).color }} /><span className="truncate">{p.card.title || "Sans titre"}</span>
                    </button>
                  ))}
                  {items.length > 4 && <div className="px-1 text-[10px] text-muted">+{items.length - 4}</div>}
                </div>
              </div>
            );
          })}
        </div>
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
function CardModal({ card, labels, onClose, onPatch, onDelete, onDup, onArchive }: {
  card: Card; labels: Label[]; onClose: () => void; onPatch: (p: Partial<Card>) => void; onDelete: () => void; onDup: () => void; onArchive: () => void;
}) {
  const [preview, setPreview] = useState(false);
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
  const descHtml = useMemo(() => { try { return marked.parse(card.desc || "*Vide.*", { async: false }) as string; } catch { return ""; } }, [card.desc]);

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

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field icon={Flag} label="Priorité">
              <select value={card.priority ?? "none"} onChange={(e) => onPatch({ priority: e.target.value as Priority })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none">
                {PRIORITIES.map((p) => <option key={p.k} value={p.k} className="bg-[#0f1017]">{p.l}</option>)}
              </select>
            </Field>
            <Field icon={Calendar} label="Début">
              <input type="date" value={card.start ?? ""} onChange={(e) => onPatch({ start: e.target.value || null })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none [color-scheme:dark]" />
            </Field>
            <Field icon={CalendarClock} label="Échéance">
              <input type="date" value={card.due ?? ""} onChange={(e) => onPatch({ due: e.target.value || null })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none [color-scheme:dark]" />
            </Field>
            <Field icon={Timer} label="Estimation (pts)">
              <input type="number" min={0} value={card.estimate ?? ""} onChange={(e) => onPatch({ estimate: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} placeholder="—" className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white outline-none placeholder:text-white/30" />
            </Field>
            <Field icon={CircleDot} label="Responsable">
              <input value={card.assignee ?? ""} onChange={(e) => onPatch({ assignee: e.target.value })} placeholder="Nom" className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white outline-none placeholder:text-white/30" />
            </Field>
          </div>

          <Field icon={Tag} label="Étiquettes">
            <div className="flex flex-wrap gap-1.5">
              {labels.length === 0 && <span className="text-xs text-muted">Créez des étiquettes depuis la barre d'outils.</span>}
              {labels.map((l) => {
                const on = (card.labels ?? []).includes(l.id);
                return <button key={l.id} onClick={() => toggleLabel(l.id)} className={`rounded-full px-2.5 py-1 text-xs font-medium text-white transition ${on ? "ring-2 ring-white/50" : "opacity-60 hover:opacity-100"}`} style={{ background: l.color }}>{l.name || "Sans nom"}</button>;
              })}
            </div>
          </Field>

          <Field icon={Palette} label="Couverture">
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => onPatch({ cover: null })} className={`grid size-6 place-items-center rounded-md border text-[9px] ${!card.cover ? "border-brand-400" : "border-white/15"}`}>∅</button>
              {LABEL_COLORS.map((c) => <button key={c} onClick={() => onPatch({ cover: c })} className={`size-6 rounded-md border ${card.cover === c ? "border-white ring-2 ring-white/30" : "border-white/15"}`} style={{ background: c }} />)}
            </div>
          </Field>

          <div className="mb-3">
            <div className="mb-1 flex items-center gap-1.5">
              <AlignLeft className="size-3.5 text-muted" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Description</span>
              <button onClick={() => setPreview((v) => !v)} className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-white/5 hover:text-white">{preview ? <><EyeOff className="size-3" /> Éditer</> : <><Eye className="size-3" /> Aperçu</>}</button>
            </div>
            {preview
              ? <div className="prose-share min-h-[80px] rounded-lg border border-white/10 bg-white/5 p-3 text-sm" dangerouslySetInnerHTML={{ __html: descHtml }} />
              : <textarea value={card.desc ?? ""} onChange={(e) => onPatch({ desc: e.target.value })} rows={4} placeholder="Markdown supporté : **gras**, - listes, [lien](url)…" className="w-full resize-y rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white outline-none placeholder:text-white/30" />}
          </div>

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

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <button onClick={onDup} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10"><Copy className="size-4" /> Dupliquer</button>
            <button onClick={onArchive} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/85 hover:bg-white/10"><Archive className="size-4" /> Archiver</button>
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

// ── Archivées ────────────────────────────────────────────────────────
function ArchivePanel({ cards, onClose, onRestore, onDelete }: {
  cards: Placed[]; onClose: () => void; onRestore: (id: string) => void; onDelete: (id: string) => void;
}) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1017]/97 p-5 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Archive className="size-5 text-brand-300" />
          <h3 className="text-lg font-semibold text-white">Cartes archivées</h3>
          <button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="space-y-2">
          {cards.length === 0 && <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-4 text-center text-xs text-muted">Aucune carte archivée.</p>}
          {cards.map((p) => (
            <div key={p.card.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/90">{p.card.title || "Sans titre"}</p>
                <p className="text-[11px] text-muted">{p.col.title}</p>
              </div>
              <button onClick={() => onRestore(p.card.id)} title="Restaurer" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white"><RotateCcw className="size-4" /></button>
              <button onClick={() => onDelete(p.card.id)} title="Supprimer" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Gestionnaire d'étiquettes ────────────────────────────────────────
function LabelsManager({ labels, onClose, onAdd, onPatch, onDelete }: {
  labels: Label[]; onClose: () => void; onAdd: () => void; onPatch: (id: string, p: Partial<Label>) => void; onDelete: (id: string) => void;
}) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);
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
