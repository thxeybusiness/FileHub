"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { marked } from "marked";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import {
  ArrowLeft, Check, Loader2, FolderKanban, Plus, X, RefreshCw, Search, Filter, Trash2,
  GripVertical, MoreHorizontal, Copy, ChevronDown, ChevronRight, ChevronLeft, Home,
  Table2, KanbanSquare, CalendarDays, GanttChartSquare, LayoutGrid, ArrowUpDown, Layers,
  Type, CircleDot, Tag, User, Calendar, Hash, Flag, CheckSquare, Percent, Star, Link2,
  Eye, EyeOff, Settings2, ListChecks, AlignLeft, SlidersHorizontal, Palette, History, MessageSquare,
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

/* ───────────────────────── Types ───────────────────────── */
type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

type FieldType =
  | "text" | "status" | "select" | "tags" | "person" | "date"
  | "number" | "priority" | "checkbox" | "progress" | "rating" | "url";
type Option = { id: string; name: string; color: string };
type Field = { id: string; name: string; type: FieldType; primary?: boolean; width?: number; options?: Option[] };
type Check = { id: string; text: string; done: boolean };
type Row = { id: string; cells: Record<string, unknown>; notes?: string; checklist?: Check[] };
type ViewType = "table" | "board" | "calendar" | "timeline" | "gallery";
type SortDir = "asc" | "desc";
type Filter = { id: string; fieldId: string; op: FilterOp; value: string };
type FilterOp = "is" | "isnot" | "contains" | "empty" | "notempty";
type ProjectView = {
  id: string; name: string; type: ViewType;
  groupBy?: string; dateField?: string; startField?: string; endField?: string;
  sortField?: string; sortDir?: SortDir; filters?: Filter[]; hidden?: string[];
};
type Project = { fields: Field[]; rows: Row[]; views: ProjectView[] };

/* ───────────────────────── Constants ───────────────────────── */
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const PRIORITIES: { k: string; l: string; color: string }[] = [
  { k: "none", l: "Aucune", color: "#64748b" },
  { k: "low", l: "Basse", color: "#22c55e" },
  { k: "medium", l: "Moyenne", color: "#eab308" },
  { k: "high", l: "Haute", color: "#f97316" },
  { k: "urgent", l: "Urgente", color: "#ef4444" },
];
const PRANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
const prioMeta = (k: string) => PRIORITIES.find((p) => p.k === (k || "none")) ?? PRIORITIES[0];

const OPTION_COLORS = ["#5b8bff", "#7b3bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff", "#94a3b8"];
const ACCENT = "#8b5cf6";

const FIELD_TYPES: { t: FieldType; l: string; icon: typeof Type; hint: string }[] = [
  { t: "text", l: "Texte", icon: Type, hint: "Texte libre" },
  { t: "status", l: "Statut", icon: CircleDot, hint: "Une étiquette colorée" },
  { t: "select", l: "Sélection", icon: ChevronDown, hint: "Un choix parmi une liste" },
  { t: "tags", l: "Étiquettes", icon: Tag, hint: "Plusieurs choix" },
  { t: "person", l: "Responsable", icon: User, hint: "Une personne" },
  { t: "date", l: "Date", icon: Calendar, hint: "Une date" },
  { t: "number", l: "Nombre", icon: Hash, hint: "Une valeur numérique" },
  { t: "priority", l: "Priorité", icon: Flag, hint: "Niveau de priorité" },
  { t: "checkbox", l: "Case à cocher", icon: CheckSquare, hint: "Vrai / faux" },
  { t: "progress", l: "Avancement", icon: Percent, hint: "Barre de 0 à 100 %" },
  { t: "rating", l: "Note", icon: Star, hint: "De 1 à 5 étoiles" },
  { t: "url", l: "Lien", icon: Link2, hint: "Une adresse web" },
];
const fieldIcon = (t: FieldType) => FIELD_TYPES.find((f) => f.t === t)?.icon ?? Type;

const VIEW_TYPES: { t: ViewType; l: string; icon: typeof Table2 }[] = [
  { t: "table", l: "Table", icon: Table2 },
  { t: "board", l: "Tableau", icon: KanbanSquare },
  { t: "calendar", l: "Calendrier", icon: CalendarDays },
  { t: "timeline", l: "Chronologie", icon: GanttChartSquare },
  { t: "gallery", l: "Galerie", icon: LayoutGrid },
];
const viewIcon = (t: ViewType) => VIEW_TYPES.find((v) => v.t === t)?.icon ?? Table2;

/* ───────────────────────── Value helpers ───────────────────────── */
const asStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const asNum = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : null);
const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const asBool = (v: unknown) => v === true || v === "true";

/* ───────────────────────── Parse / normalize ───────────────────────── */
function defaultProject(): Project {
  const fStatus: Field = {
    id: "f_status", name: "Statut", type: "status", width: 150,
    options: [
      { id: "s_todo", name: "À faire", color: "#64748b" },
      { id: "s_doing", name: "En cours", color: "#3b6dff" },
      { id: "s_block", name: "Bloqué", color: "#ef4444" },
      { id: "s_done", name: "Terminé", color: "#22c55e" },
    ],
  };
  return {
    fields: [
      { id: "f_task", name: "Tâche", type: "text", primary: true, width: 280 },
      fStatus,
      { id: "f_prio", name: "Priorité", type: "priority", width: 130 },
      { id: "f_assignee", name: "Responsable", type: "person", width: 160 },
      { id: "f_due", name: "Échéance", type: "date", width: 130 },
      { id: "f_progress", name: "Avancement", type: "progress", width: 150 },
    ],
    rows: [
      { id: uid(), cells: { f_task: "Première tâche", f_status: "s_doing", f_prio: "high", f_progress: 30 } },
      { id: uid(), cells: { f_task: "Deuxième tâche", f_status: "s_todo", f_prio: "medium", f_progress: 0 } },
    ],
    views: [
      { id: "v_table", name: "Table", type: "table" },
      { id: "v_board", name: "Tableau", type: "board", groupBy: "f_status" },
      { id: "v_cal", name: "Calendrier", type: "calendar", dateField: "f_due" },
    ],
  };
}

function normOption(o: unknown): Option {
  const x = (o ?? {}) as Record<string, unknown>;
  return { id: asStr(x.id) || uid(), name: asStr(x.name), color: asStr(x.color) || OPTION_COLORS[0] };
}
function normField(f: unknown): Field {
  const x = (f ?? {}) as Record<string, unknown>;
  const type = (x.type as FieldType) || "text";
  return {
    id: asStr(x.id) || uid(),
    name: asStr(x.name) || "Champ",
    type,
    primary: !!x.primary,
    width: typeof x.width === "number" ? (x.width as number) : undefined,
    options: Array.isArray(x.options) ? x.options.map(normOption) : (type === "status" || type === "select" || type === "tags" ? [] : undefined),
  };
}
function normRow(r: unknown): Row {
  const x = (r ?? {}) as Record<string, unknown>;
  return {
    id: asStr(x.id) || uid(),
    cells: (x.cells && typeof x.cells === "object" ? (x.cells as Record<string, unknown>) : {}),
    notes: asStr(x.notes),
    checklist: Array.isArray(x.checklist) ? (x.checklist as unknown[]).map((c) => { const y = (c ?? {}) as Record<string, unknown>; return { id: asStr(y.id) || uid(), text: asStr(y.text), done: !!y.done }; }) : [],
  };
}
function normView(v: unknown): ProjectView {
  const x = (v ?? {}) as Record<string, unknown>;
  return {
    id: asStr(x.id) || uid(),
    name: asStr(x.name) || "Vue",
    type: (x.type as ViewType) || "table",
    groupBy: x.groupBy ? asStr(x.groupBy) : undefined,
    dateField: x.dateField ? asStr(x.dateField) : undefined,
    startField: x.startField ? asStr(x.startField) : undefined,
    endField: x.endField ? asStr(x.endField) : undefined,
    sortField: x.sortField ? asStr(x.sortField) : undefined,
    sortDir: (x.sortDir as SortDir) || "asc",
    filters: Array.isArray(x.filters) ? (x.filters as unknown[]).map((ff) => { const y = (ff ?? {}) as Record<string, unknown>; return { id: asStr(y.id) || uid(), fieldId: asStr(y.fieldId), op: (y.op as FilterOp) || "contains", value: asStr(y.value) }; }) : [],
    hidden: Array.isArray(x.hidden) ? (x.hidden as unknown[]).map(String) : [],
  };
}
function parse(content: string): Project {
  try {
    const p = JSON.parse(content) as Record<string, unknown>;
    if (Array.isArray(p?.fields) && Array.isArray(p?.rows)) {
      const fields = p.fields.map(normField);
      if (!fields.some((f) => f.primary)) fields[0] && (fields[0].primary = true);
      const views = Array.isArray(p.views) && p.views.length ? p.views.map(normView) : [{ id: "v_table", name: "Table", type: "table" as ViewType }];
      return { fields, rows: p.rows.map(normRow), views };
    }
  } catch { /* défaut */ }
  return defaultProject();
}

/* ───────────────────────── Date helpers ───────────────────────── */
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
function fmtDate(s: string): { label: string; tone: string } | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (diff < 0) return { label, tone: "#ef4444" };
  if (diff === 0) return { label: "Auj.", tone: "#f97316" };
  if (diff === 1) return { label: "Demain", tone: "#eab308" };
  return { label, tone: "#94a3b8" };
}
const initials = (s: string) => { const p = s.trim().split(/\s+/).filter(Boolean); return !p.length ? "" : p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase(); };
const avatarColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return `hsl(${h} 55% 55%)`; };

/* ───────────────────────── Cell display (read-only chip) ───────────────────────── */
function CellChip({ field, value }: { field: Field; value: unknown }) {
  switch (field.type) {
    case "status":
    case "select": {
      const o = field.options?.find((x) => x.id === asStr(value));
      if (!o) return <span className="text-white/25">—</span>;
      return <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: o.color + "26", color: o.color }}><span className="size-1.5 rounded-full" style={{ background: o.color }} />{o.name}</span>;
    }
    case "tags": {
      const ids = asArr(value);
      if (!ids.length) return <span className="text-white/25">—</span>;
      return <span className="flex flex-wrap gap-1">{ids.map((id) => { const o = field.options?.find((x) => x.id === id); if (!o) return null; return <span key={id} className="rounded-full px-1.5 py-0.5 text-[11px] font-medium" style={{ background: o.color + "26", color: o.color }}>{o.name}</span>; })}</span>;
    }
    case "priority": {
      const m = prioMeta(asStr(value));
      if (m.k === "none") return <span className="text-white/25">—</span>;
      return <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: m.color }}><Flag className="size-3" />{m.l}</span>;
    }
    case "person": {
      const v = asStr(value);
      if (!v) return <span className="text-white/25">—</span>;
      return <span className="inline-flex items-center gap-1.5 text-xs"><span className="grid size-5 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: avatarColor(v) }}>{initials(v)}</span><span className="truncate">{v}</span></span>;
    }
    case "date": {
      const f = fmtDate(asStr(value));
      if (!f) return <span className="text-white/25">—</span>;
      return <span className="inline-flex items-center gap-1 text-xs" style={{ color: f.tone }}><Calendar className="size-3" />{f.label}</span>;
    }
    case "number": {
      const n = asNum(value);
      return n == null ? <span className="text-white/25">—</span> : <span className="text-xs tabular-nums">{n}</span>;
    }
    case "checkbox":
      return <span className={`grid size-4 place-items-center rounded ${asBool(value) ? "" : "border border-white/20"}`} style={asBool(value) ? { background: "#22c55e" } : {}}>{asBool(value) && <Check className="size-3 text-white" />}</span>;
    case "progress": {
      const n = Math.max(0, Math.min(100, asNum(value) ?? 0));
      return <span className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${n}%`, background: n >= 100 ? "#22c55e" : ACCENT }} /></span><span className="text-[11px] tabular-nums text-muted">{n}%</span></span>;
    }
    case "rating": {
      const n = asNum(value) ?? 0;
      return <span className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="size-3.5" style={{ color: i <= n ? "#eab308" : "#ffffff20", fill: i <= n ? "#eab308" : "transparent" }} />)}</span>;
    }
    case "url": {
      const v = asStr(value);
      if (!v) return <span className="text-white/25">—</span>;
      return <a href={/^https?:\/\//.test(v) ? v : `https://${v}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-brand-300 hover:underline"><Link2 className="size-3" /><span className="truncate max-w-[140px]">{v.replace(/^https?:\/\//, "")}</span></a>;
    }
    default: {
      const v = asStr(value);
      return v ? <span className="truncate text-sm">{v}</span> : <span className="text-white/25">—</span>;
    }
  }
}

/* ───────────────────────── Main editor ───────────────────────── */
export function ProjectEditor({
  id, initialName, initialContent, backHref, crumbs, shared = false,
}: {
  id: string; initialName: string; initialContent: string; backHref: string; crumbs: Crumb[]; shared?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [proj, setProj] = useState<Project>(() => parse(initialContent));
  const [save, setSave] = useState<SaveState>("saved");
  const [flash, setFlash] = useState(false);
  const [activeView, setActiveView] = useState<string>(() => parse(initialContent).views[0]?.id ?? "v_table");
  const [query, setQuery] = useState("");
  const [detailRow, setDetailRow] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | "sort" | "filter" | "group" | "fields" | "views">(null);

  const [peers, setPeers] = useState<Peer[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [comOpen, setComOpen] = useState(false);
  const actions = useRef<Actions>({ markEditing: () => {}, syncVersion: () => {} });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const serialize = useCallback((p: Project) => JSON.stringify(p), []);

  const persist = useCallback((next: Project, nextName?: string) => {
    setSave("saving");
    dirty.current = true;
    actions.current.markEditing();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, { content: serialize(next), ...(nextName != null ? { name: nextName } : {}) })
        .then((r) => { setSave("saved"); dirty.current = false; if (r?.updatedAt) actions.current.syncVersion(r.updatedAt); })
        .catch(() => setSave("error"));
    }, 550);
  }, [id, serialize]);

  const update = useCallback((fn: (p: Project) => Project) => {
    setProj((prev) => { const next = fn(prev); persist(next); return next; });
  }, [persist]);

  const onName = (v: string) => { setName(v); persist(proj, v.trim() || "Projet sans titre"); };

  // Contenu distant (temps réel / heartbeat).
  const applyRemote = useCallback((str: string) => {
    if (dirty.current) return;
    try {
      const p = parse(str);
      setProj(p);
      setActiveView((cur) => (p.views.some((v) => v.id === cur) ? cur : p.views[0]?.id ?? cur));
      setFlash(true); setTimeout(() => setFlash(false), 2200);
    } catch { /* ignore */ }
  }, []);
  const fetchRemote = useCallback(async () => {
    if (dirty.current) return;
    try { const { content } = await api.getContent(id); applyRemote(content); } catch { /* ignore */ }
  }, [id, applyRemote]);

  const view = proj.views.find((v) => v.id === activeView) ?? proj.views[0];
  const fields = proj.fields;
  const primary = fields.find((f) => f.primary) ?? fields[0];

  /* ── Row / field mutations ── */
  const setCell = (rowId: string, fieldId: string, value: unknown) =>
    update((p) => ({ ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [fieldId]: value } } : r)) }));
  const addRow = (seed?: Record<string, unknown>) => {
    const r: Row = { id: uid(), cells: seed ?? {}, notes: "", checklist: [] };
    update((p) => ({ ...p, rows: [...p.rows, r] }));
    return r.id;
  };
  const deleteRow = (rowId: string) => update((p) => ({ ...p, rows: p.rows.filter((r) => r.id !== rowId) }));
  const duplicateRow = (rowId: string) => update((p) => {
    const i = p.rows.findIndex((r) => r.id === rowId); if (i < 0) return p;
    const src = p.rows[i]; const copy: Row = { ...src, id: uid(), cells: { ...src.cells }, checklist: (src.checklist ?? []).map((c) => ({ ...c, id: uid() })) };
    const rows = [...p.rows]; rows.splice(i + 1, 0, copy); return { ...p, rows };
  });
  const moveRow = (fromId: string, toId: string) => update((p) => {
    if (fromId === toId) return p;
    const rows = [...p.rows]; const fi = rows.findIndex((r) => r.id === fromId); const ti = rows.findIndex((r) => r.id === toId);
    if (fi < 0 || ti < 0) return p; const [m] = rows.splice(fi, 1); rows.splice(ti, 0, m); return { ...p, rows };
  });

  const addField = (type: FieldType) => update((p) => {
    const f: Field = { id: uid(), name: FIELD_TYPES.find((x) => x.t === type)?.l ?? "Champ", type, width: 150, options: (type === "status" || type === "select" || type === "tags") ? [] : undefined };
    return { ...p, fields: [...p.fields, f] };
  });
  const patchField = (fieldId: string, patch: Partial<Field>) => update((p) => ({ ...p, fields: p.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) }));
  const deleteField = (fieldId: string) => update((p) => {
    if (p.fields.find((f) => f.id === fieldId)?.primary) return p;
    return { ...p, fields: p.fields.filter((f) => f.id !== fieldId), rows: p.rows.map((r) => { const c = { ...r.cells }; delete c[fieldId]; return { ...r, cells: c }; }) };
  });
  const changeFieldType = (fieldId: string, type: FieldType) => update((p) => ({ ...p, fields: p.fields.map((f) => (f.id === fieldId ? { ...f, type, options: (type === "status" || type === "select" || type === "tags") ? (f.options ?? []) : undefined } : f)) }));
  const addOption = (fieldId: string, name: string) => {
    const opt: Option = { id: uid(), name, color: OPTION_COLORS[(proj.fields.find((f) => f.id === fieldId)?.options?.length ?? 0) % OPTION_COLORS.length] };
    update((p) => ({ ...p, fields: p.fields.map((f) => (f.id === fieldId ? { ...f, options: [...(f.options ?? []), opt] } : f)) }));
    return opt.id;
  };
  const patchOption = (fieldId: string, optId: string, patch: Partial<Option>) => update((p) => ({ ...p, fields: p.fields.map((f) => (f.id === fieldId ? { ...f, options: (f.options ?? []).map((o) => (o.id === optId ? { ...o, ...patch } : o)) } : f)) }));

  /* ── View config ── */
  const patchView = (patch: Partial<ProjectView>) => update((p) => ({ ...p, views: p.views.map((v) => (v.id === activeView ? { ...v, ...patch } : v)) }));
  const addView = (type: ViewType) => {
    const dateF = fields.find((f) => f.type === "date");
    const groupF = fields.find((f) => f.type === "status" || f.type === "select");
    const v: ProjectView = {
      id: uid(), name: VIEW_TYPES.find((x) => x.t === type)?.l ?? "Vue", type,
      groupBy: type === "board" ? groupF?.id : undefined,
      dateField: type === "calendar" ? dateF?.id : undefined,
      startField: type === "timeline" ? fields.find((f) => f.type === "date")?.id : undefined,
      endField: type === "timeline" ? dateF?.id : undefined,
    };
    update((p) => ({ ...p, views: [...p.views, v] }));
    setActiveView(v.id); setPanel(null);
  };
  const deleteView = (vid: string) => update((p) => {
    if (p.views.length <= 1) return p;
    const views = p.views.filter((v) => v.id !== vid);
    if (activeView === vid) setActiveView(views[0].id);
    return { ...p, views };
  });

  /* ── Derived rows (search + filter + sort) for the active view ── */
  const visibleRows = useMemo(() => {
    let rows = proj.rows;
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((r) => fields.some((f) => cellText(f, r.cells[f.id]).toLowerCase().includes(q)));
    for (const flt of view?.filters ?? []) {
      const f = fields.find((x) => x.id === flt.fieldId); if (!f) continue;
      rows = rows.filter((r) => matchFilter(f, r.cells[f.id], flt));
    }
    if (view?.sortField) {
      const f = fields.find((x) => x.id === view.sortField);
      if (f) { const dir = view.sortDir === "desc" ? -1 : 1; rows = [...rows].sort((a, b) => cmpCell(f, a.cells[f.id], b.cells[f.id]) * dir); }
    }
    return rows;
  }, [proj.rows, query, view, fields]);

  const hidden = new Set(view?.hidden ?? []);
  const shownFields = fields.filter((f) => f.primary || !hidden.has(f.id));

  /* ───────────────────────── Render ───────────────────────── */
  return (
    <div className="flex h-full min-h-0 flex-col">
      <RealtimeEngine id={id} shared={shared} mode="blob" content={serialize(proj)} onRemote={applyRemote} fetchRemote={fetchRemote} setPeers={setPeers} actions={actions} />
      <VersionHistory id={id} open={histOpen} onClose={() => setHistOpen(false)} onRestore={applyRemote} />
      <CommentsPanel id={id} open={comOpen} onClose={() => setComOpen(false)} />

      {/* Header */}
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
            <FolderKanban className="size-4 shrink-0" style={{ color: ACCENT }} />
            <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30" placeholder="Tableau sans titre" />
          </div>
        </div>
        <ExportButton items={[{ label: "Données (.json)", onClick: () => downloadText(safeFilename(name) + ".json", serialize(proj), "application/json") }]} />
        <button onClick={() => setComOpen(true)} title="Commentaires" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
          <MessageSquare className="size-5" />
        </button>
        <button onClick={() => setHistOpen(true)} title="Historique des versions" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
          <History className="size-5" />
        </button>
        <CollabBar peers={peers} />
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
          {flash ? (<span className="flex items-center gap-1.5 text-cyan-300"><RefreshCw className="size-3.5" /> Mis à jour</span>) : save === "saving" ? (<><Loader2 className="size-3.5 animate-spin" /> …</>) : save === "error" ? (<span className="text-red-400">Erreur</span>) : (<><Check className="size-3.5 text-emerald-400" /> Enregistré</>)}
        </div>
        <AiAssistant
          kind="project" title="Assistant tableau" accent={ACCENT}
          onApplyData={(data) => applyAiTasks(data)}
          placeholder="Ex. « plan de lancement d'une application mobile »"
          quickActions={[{ action: "generate", label: "Générer un plan de tâches" }]}
        />
      </header>

      {/* View tabs */}
      <div className="shrink-0 border-b border-white/10 bg-white/[0.02] px-2 sm:px-4 flex items-center gap-1 overflow-x-auto">
        {proj.views.map((v) => {
          const Icon = viewIcon(v.type);
          const on = v.id === activeView;
          return (
            <button key={v.id} onClick={() => { setActiveView(v.id); setPanel(null); }}
              className={`group relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition ${on ? "text-white" : "text-muted hover:text-white/80"}`}>
              <Icon className="size-4" style={on ? { color: ACCENT } : {}} />
              <ViewName view={v} onRename={(n) => patchView2(v.id, { name: n })} editable={on} />
              {on && proj.views.length > 1 && (
                <span onClick={(e) => { e.stopPropagation(); deleteView(v.id); }} className="ml-0.5 grid size-4 place-items-center rounded text-muted hover:text-red-400" title="Supprimer la vue"><X className="size-3" /></span>
              )}
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: ACCENT }} />}
            </button>
          );
        })}
        <div className="relative">
          <button onClick={() => setPanel((p) => (p === "views" ? null : "views"))} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white" title="Ajouter une vue"><Plus className="size-4" /></button>
          {panel === "views" && (
            <Pop onClose={() => setPanel(null)} className="left-0 top-10 w-52">
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Nouvelle vue</p>
              {VIEW_TYPES.map((vt) => (<button key={vt.t} onClick={() => addView(vt.t)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-white/5"><vt.icon className="size-4" style={{ color: ACCENT }} />{vt.l}</button>))}
            </Pop>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-b border-white/10 px-2 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="h-8 w-40 rounded-lg border border-white/10 bg-white/5 pl-8 pr-2 text-sm outline-none focus:border-white/20" />
        </div>
        <ToolBtn active={!!view?.sortField} icon={ArrowUpDown} label="Trier" onClick={() => setPanel((p) => (p === "sort" ? null : "sort"))} />
        <ToolBtn active={(view?.filters?.length ?? 0) > 0} icon={Filter} label="Filtrer" onClick={() => setPanel((p) => (p === "filter" ? null : "filter"))} />
        {view?.type === "table" && <ToolBtn active={!!view?.groupBy} icon={Layers} label="Grouper" onClick={() => setPanel((p) => (p === "group" ? null : "group"))} />}
        <ToolBtn active={(view?.hidden?.length ?? 0) > 0} icon={SlidersHorizontal} label="Champs" onClick={() => setPanel((p) => (p === "fields" ? null : "fields"))} />
        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden sm:inline text-xs text-muted">{visibleRows.length} élément{visibleRows.length > 1 ? "s" : ""}</span>
          <button onClick={() => { const rid = addRow(); if (view?.type !== "table") setDetailRow(rid); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white shadow" style={{ background: `linear-gradient(90deg, #3b6dff, ${ACCENT})` }}><Plus className="size-4" /> Ligne</button>
        </div>

        {/* Panels */}
        {panel === "sort" && (
          <Pop onClose={() => setPanel(null)} className="left-2 top-11 w-64">
            <PanelTitle>Trier par</PanelTitle>
            <select value={view?.sortField ?? ""} onChange={(e) => patchView({ sortField: e.target.value || undefined })} className="w-full rounded-lg border border-white/10 bg-[#0f1017] px-2 py-1.5 text-sm">
              <option value="">Aucun (ordre manuel)</option>
              {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {view?.sortField && (
              <div className="mt-2 flex gap-1.5">
                {(["asc", "desc"] as SortDir[]).map((d) => (<button key={d} onClick={() => patchView({ sortDir: d })} className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${view.sortDir === d ? "border-white/30 bg-white/10" : "border-white/10"}`}>{d === "asc" ? "Croissant" : "Décroissant"}</button>))}
              </div>
            )}
          </Pop>
        )}
        {panel === "group" && (
          <Pop onClose={() => setPanel(null)} className="left-2 top-11 w-64">
            <PanelTitle>Grouper par</PanelTitle>
            <select value={view?.groupBy ?? ""} onChange={(e) => patchView({ groupBy: e.target.value || undefined })} className="w-full rounded-lg border border-white/10 bg-[#0f1017] px-2 py-1.5 text-sm">
              <option value="">Aucun</option>
              {fields.filter((f) => f.type === "status" || f.type === "select" || f.type === "priority" || f.type === "person").map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Pop>
        )}
        {panel === "filter" && (
          <FilterPanel view={view} fields={fields} onClose={() => setPanel(null)} patchView={patchView} />
        )}
        {panel === "fields" && (
          <Pop onClose={() => setPanel(null)} className="left-2 top-11 w-64">
            <PanelTitle>Champs visibles</PanelTitle>
            <div className="max-h-72 space-y-0.5 overflow-auto">
              {fields.map((f) => {
                const Icon = fieldIcon(f.type); const vis = f.primary || !(view?.hidden ?? []).includes(f.id);
                return (
                  <button key={f.id} disabled={f.primary} onClick={() => patchView({ hidden: vis ? [...(view?.hidden ?? []), f.id] : (view?.hidden ?? []).filter((x) => x !== f.id) })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50">
                    <Icon className="size-3.5 text-muted" /><span className="flex-1 text-left truncate">{f.name}</span>{f.primary ? <span className="text-[10px] text-muted">titre</span> : vis ? <Eye className="size-3.5 text-emerald-400" /> : <EyeOff className="size-3.5 text-muted" />}
                  </button>
                );
              })}
            </div>
          </Pop>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        {view?.type === "table" && (
          <TableView proj={proj} view={view} rows={visibleRows} shownFields={shownFields} primary={primary}
            onCell={setCell} onOpen={setDetailRow} onAddRow={addRow} onDeleteRow={deleteRow} onDuplicate={duplicateRow} onMoveRow={moveRow}
            onAddField={addField} onPatchField={patchField} onDeleteField={deleteField} onChangeType={changeFieldType} onAddOption={addOption} onPatchOption={patchOption} />
        )}
        {view?.type === "board" && (
          <BoardView proj={proj} view={view} rows={visibleRows} primary={primary} shownFields={shownFields}
            onCell={setCell} onOpen={setDetailRow} onAddRow={addRow} onSetGroup={(g) => patchView({ groupBy: g })} />
        )}
        {view?.type === "calendar" && (
          <CalendarView view={view} rows={visibleRows} fields={fields} primary={primary} onOpen={setDetailRow} onSetDateField={(d) => patchView({ dateField: d })} onAddOn={(date) => { const rid = addRow(view.dateField ? { [view.dateField]: date } : {}); setDetailRow(rid); }} />
        )}
        {view?.type === "timeline" && (
          <TimelineView view={view} rows={visibleRows} fields={fields} primary={primary} onOpen={setDetailRow} onConfig={(patch) => patchView(patch)} />
        )}
        {view?.type === "gallery" && (
          <GalleryView rows={visibleRows} shownFields={shownFields} primary={primary} onOpen={setDetailRow} onAddRow={() => setDetailRow(addRow())} />
        )}
      </div>

      {/* Row detail modal */}
      {detailRow && (() => {
        const r = proj.rows.find((x) => x.id === detailRow); if (!r) return null;
        return <RowDetail row={r} fields={fields} primary={primary}
          onClose={() => setDetailRow(null)} onCell={(fid, v) => setCell(r.id, fid, v)}
          onNotes={(n) => update((p) => ({ ...p, rows: p.rows.map((x) => (x.id === r.id ? { ...x, notes: n } : x)) }))}
          onChecklist={(cl) => update((p) => ({ ...p, rows: p.rows.map((x) => (x.id === r.id ? { ...x, checklist: cl } : x)) }))}
          onDelete={() => { deleteRow(r.id); setDetailRow(null); }}
          onAddOption={addOption} />;
      })()}
    </div>
  );

  // Renommage d'une vue directement (helper pour éviter la fermeture sur activeView).
  function patchView2(vid: string, patch: Partial<ProjectView>) {
    update((p) => ({ ...p, views: p.views.map((v) => (v.id === vid ? { ...v, ...patch } : v)) }));
  }

  // Applique des tâches générées par l'IA.
  function applyAiTasks(data: unknown) {
    const d = (data ?? {}) as { tasks?: unknown[] };
    if (!Array.isArray(d.tasks)) return;
    const statusF = fields.find((f) => f.type === "status" || f.type === "select");
    const prioF = fields.find((f) => f.type === "priority");
    const statusMap: Record<string, string | undefined> = {};
    if (statusF?.options) {
      statusMap.todo = statusF.options.find((o) => /faire|todo|à faire/i.test(o.name))?.id ?? statusF.options[0]?.id;
      statusMap.doing = statusF.options.find((o) => /cours|doing|progress/i.test(o.name))?.id;
      statusMap.done = statusF.options.find((o) => /termin|done|fini/i.test(o.name))?.id;
    }
    const newRows: Row[] = d.tasks.slice(0, 40).map((t) => {
      const task = (t ?? {}) as { title?: string; status?: string; priority?: string };
      const cells: Record<string, unknown> = { [primary.id]: asStr(task.title) || "Tâche" };
      if (statusF && task.status && statusMap[task.status]) cells[statusF.id] = statusMap[task.status];
      if (prioF && task.priority) cells[prioF.id] = ["urgent", "high", "medium", "low"].includes(task.priority) ? task.priority : "medium";
      return { id: uid(), cells, notes: "", checklist: [] };
    });
    update((p) => ({ ...p, rows: [...p.rows, ...newRows] }));
  }
}

/* ───────────────────────── Filter / sort helpers ───────────────────────── */
function cellText(f: Field, v: unknown): string {
  if (f.type === "status" || f.type === "select") return f.options?.find((o) => o.id === asStr(v))?.name ?? "";
  if (f.type === "tags") return asArr(v).map((id) => f.options?.find((o) => o.id === id)?.name ?? "").join(" ");
  if (f.type === "priority") return prioMeta(asStr(v)).l;
  if (f.type === "checkbox") return asBool(v) ? "oui" : "non";
  return asStr(v);
}
function matchFilter(f: Field, v: unknown, flt: Filter): boolean {
  const text = cellText(f, v).toLowerCase();
  const val = flt.value.toLowerCase();
  const empty = f.type === "tags" ? asArr(v).length === 0 : text.trim() === "";
  switch (flt.op) {
    case "empty": return empty;
    case "notempty": return !empty;
    case "is": return f.type === "status" || f.type === "select" || f.type === "priority" ? asStr(v) === flt.value || text === val : text === val;
    case "isnot": return !(text === val);
    default: return text.includes(val);
  }
}
function cmpCell(f: Field, a: unknown, b: unknown): number {
  if (f.type === "number" || f.type === "progress" || f.type === "rating") return (asNum(a) ?? -Infinity) - (asNum(b) ?? -Infinity);
  if (f.type === "priority") return PRANK[asStr(a) || "none"] - PRANK[asStr(b) || "none"];
  if (f.type === "checkbox") return (asBool(a) ? 1 : 0) - (asBool(b) ? 1 : 0);
  return cellText(f, a).localeCompare(cellText(f, b));
}

/* ───────────────────────── Small UI atoms ───────────────────────── */
function ToolBtn({ icon: Icon, label, active, onClick }: { icon: typeof Filter; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition ${active ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-muted hover:bg-white/5 hover:text-white"}`}>
      <Icon className="size-3.5" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
function PanelTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{children}</p>;
}
function Pop({ children, onClose, className = "" }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`absolute z-50 rounded-xl border border-white/10 bg-[#0f1017]/97 p-2 shadow-2xl shadow-black/50 backdrop-blur-2xl ${className}`} style={{ animation: "revealUp 0.15s both" }}>{children}</div>
    </>
  );
}
function ViewName({ view, onRename, editable }: { view: ProjectView; onRename: (n: string) => void; editable: boolean }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(view.name);
  useEffect(() => setVal(view.name), [view.name]);
  if (edit && editable) {
    return <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => { setEdit(false); onRename(val.trim() || view.name); }} onKeyDown={(e) => { if (e.key === "Enter") { setEdit(false); onRename(val.trim() || view.name); } }} onClick={(e) => e.stopPropagation()} className="w-24 bg-transparent outline-none border-b border-white/30" />;
  }
  return <span onDoubleClick={() => editable && setEdit(true)}>{view.name}</span>;
}

/* ───────────────────────── Filter panel ───────────────────────── */
function FilterPanel({ view, fields, onClose, patchView }: { view?: ProjectView; fields: Field[]; onClose: () => void; patchView: (p: Partial<ProjectView>) => void }) {
  const filters = view?.filters ?? [];
  const add = () => patchView({ filters: [...filters, { id: uid(), fieldId: fields[0].id, op: "contains", value: "" }] });
  const patch = (fid: string, p: Partial<Filter>) => patchView({ filters: filters.map((f) => (f.id === fid ? { ...f, ...p } : f)) });
  const remove = (fid: string) => patchView({ filters: filters.filter((f) => f.id !== fid) });
  return (
    <Pop onClose={onClose} className="left-2 top-11 w-[340px] max-w-[calc(100vw-2rem)]">
      <PanelTitle>Filtres</PanelTitle>
      <div className="space-y-1.5">
        {filters.length === 0 && <p className="px-1 py-2 text-xs text-muted">Aucun filtre. Ajoutez-en un pour affiner la liste.</p>}
        {filters.map((flt) => (
          <div key={flt.id} className="flex items-center gap-1">
            <select value={flt.fieldId} onChange={(e) => patch(flt.id, { fieldId: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f1017] px-1.5 py-1 text-xs">
              {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={flt.op} onChange={(e) => patch(flt.id, { op: e.target.value as FilterOp })} className="rounded-lg border border-white/10 bg-[#0f1017] px-1.5 py-1 text-xs">
              <option value="contains">contient</option>
              <option value="is">est</option>
              <option value="isnot">n&apos;est pas</option>
              <option value="empty">est vide</option>
              <option value="notempty">non vide</option>
            </select>
            {flt.op !== "empty" && flt.op !== "notempty" && (
              <input value={flt.value} onChange={(e) => patch(flt.id, { value: e.target.value })} placeholder="valeur" className="w-20 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 text-xs" />
            )}
            <button onClick={() => remove(flt.id)} className="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-red-400"><X className="size-3.5" /></button>
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs hover:bg-white/5"><Plus className="size-3.5" /> Ajouter un filtre</button>
    </Pop>
  );
}

/* ───────────────────────── Inline cell editor ───────────────────────── */
function CellEditor({ field, value, onChange, onAddOption, autoFocus, primary, onOpen }: {
  field: Field; value: unknown; onChange: (v: unknown) => void; onAddOption: (fieldId: string, name: string) => string;
  autoFocus?: boolean; primary?: boolean; onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  switch (field.type) {
    case "text":
    case "url":
    case "person": {
      if (primary) {
        return (
          <div className="flex items-center gap-1 group/prim">
            <input value={asStr(value)} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/25" placeholder="Sans titre" />
            {onOpen && <button onClick={onOpen} className="opacity-0 group-hover/prim:opacity-100 shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted hover:bg-white/10 transition">Ouvrir</button>}
          </div>
        );
      }
      return <input autoFocus={autoFocus} value={asStr(value)} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-white/20" placeholder={field.type === "url" ? "https://…" : field.type === "person" ? "Nom…" : "—"} />;
    }
    case "number":
    case "rating":
    case "progress": {
      if (field.type === "rating") {
        const n = asNum(value) ?? 0;
        return <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((i) => <button key={i} onClick={() => onChange(i === n ? 0 : i)}><Star className="size-4" style={{ color: i <= n ? "#eab308" : "#ffffff25", fill: i <= n ? "#eab308" : "transparent" }} /></button>)}</div>;
      }
      if (field.type === "progress") {
        const n = Math.max(0, Math.min(100, asNum(value) ?? 0));
        return (
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={100} step={5} value={n} onChange={(e) => onChange(Number(e.target.value))} className="h-1 flex-1 accent-[var(--a)]" style={{ ["--a" as string]: ACCENT }} />
            <span className="w-9 text-right text-[11px] tabular-nums text-muted">{n}%</span>
          </div>
        );
      }
      return <input type="number" value={asNum(value) ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="w-full bg-transparent text-sm tabular-nums outline-none" placeholder="0" />;
    }
    case "date":
      return <input type="date" value={asStr(value)} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm outline-none [color-scheme:dark]" />;
    case "checkbox":
      return <button onClick={() => onChange(!asBool(value))} className={`grid size-5 place-items-center rounded ${asBool(value) ? "" : "border border-white/25"}`} style={asBool(value) ? { background: "#22c55e" } : {}}>{asBool(value) && <Check className="size-3.5 text-white" />}</button>;
    case "priority": {
      const m = prioMeta(asStr(value));
      return (
        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-sm" style={{ color: m.k === "none" ? "#64748b" : m.color }}><Flag className="size-3.5" />{m.k === "none" ? "—" : m.l}</button>
          {open && (
            <Pop onClose={() => setOpen(false)} className="left-0 top-6 w-36">
              {PRIORITIES.map((p) => <button key={p.k} onClick={() => { onChange(p.k); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5" style={{ color: p.color }}><Flag className="size-3.5" />{p.l}</button>)}
            </Pop>
          )}
        </div>
      );
    }
    case "status":
    case "select": {
      const cur = field.options?.find((o) => o.id === asStr(value));
      return (
        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5">
            {cur ? <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: cur.color + "26", color: cur.color }}><span className="size-1.5 rounded-full" style={{ background: cur.color }} />{cur.name}</span> : <span className="text-sm text-white/30">— choisir —</span>}
          </button>
          {open && (
            <Pop onClose={() => setOpen(false)} className="left-0 top-7 w-52">
              <div className="max-h-52 space-y-0.5 overflow-auto">
                <button onClick={() => { onChange(""); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-white/5"><X className="size-3.5" /> Vider</button>
                {(field.options ?? []).map((o) => (
                  <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                    <span className="size-2.5 rounded-full" style={{ background: o.color }} /><span className="flex-1 text-left">{o.name}</span>{asStr(value) === o.id && <Check className="size-3.5" style={{ color: ACCENT }} />}
                  </button>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-1 border-t border-white/10 pt-1.5">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { const oid = onAddOption(field.id, draft.trim()); onChange(oid); setDraft(""); setOpen(false); } }} placeholder="Nouvelle option…" className="min-w-0 flex-1 rounded-md bg-white/5 px-2 py-1 text-xs outline-none" />
                <button onClick={() => { if (draft.trim()) { const oid = onAddOption(field.id, draft.trim()); onChange(oid); setDraft(""); setOpen(false); } }} className="grid size-6 place-items-center rounded-md" style={{ background: ACCENT }}><Plus className="size-3.5 text-white" /></button>
              </div>
            </Pop>
          )}
        </div>
      );
    }
    case "tags": {
      const ids = asArr(value);
      return (
        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="flex flex-wrap items-center gap-1 text-left">
            {ids.length ? ids.map((tid) => { const o = field.options?.find((x) => x.id === tid); return o ? <span key={tid} className="rounded-full px-1.5 py-0.5 text-[11px] font-medium" style={{ background: o.color + "26", color: o.color }}>{o.name}</span> : null; }) : <span className="text-sm text-white/30">— choisir —</span>}
          </button>
          {open && (
            <Pop onClose={() => setOpen(false)} className="left-0 top-7 w-52">
              <div className="max-h-52 space-y-0.5 overflow-auto">
                {(field.options ?? []).map((o) => { const on = ids.includes(o.id); return (
                  <button key={o.id} onClick={() => onChange(on ? ids.filter((x) => x !== o.id) : [...ids, o.id])} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                    <span className={`grid size-4 place-items-center rounded ${on ? "" : "border border-white/20"}`} style={on ? { background: o.color } : {}}>{on && <Check className="size-3 text-white" />}</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[11px] font-medium" style={{ background: o.color + "26", color: o.color }}>{o.name}</span>
                  </button>
                ); })}
              </div>
              <div className="mt-1 flex items-center gap-1 border-t border-white/10 pt-1.5">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { const oid = onAddOption(field.id, draft.trim()); onChange([...ids, oid]); setDraft(""); } }} placeholder="Nouvelle étiquette…" className="min-w-0 flex-1 rounded-md bg-white/5 px-2 py-1 text-xs outline-none" />
                <button onClick={() => { if (draft.trim()) { const oid = onAddOption(field.id, draft.trim()); onChange([...ids, oid]); setDraft(""); } }} className="grid size-6 place-items-center rounded-md" style={{ background: ACCENT }}><Plus className="size-3.5 text-white" /></button>
              </div>
            </Pop>
          )}
        </div>
      );
    }
    default:
      return <span className="text-sm text-white/30">—</span>;
  }
}

/* ───────────────────────── Column header menu ───────────────────────── */
function ColumnHeader({ field, onPatch, onDelete, onChangeType, onPatchOption }: {
  field: Field; onPatch: (p: Partial<Field>) => void; onDelete: () => void; onChangeType: (t: FieldType) => void; onPatchOption: (optId: string, p: Partial<Option>) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [sub, setSub] = useState<null | "type" | "options">(null);
  const [nm, setNm] = useState(field.name);
  useEffect(() => setNm(field.name), [field.name]);
  const Icon = fieldIcon(field.type);
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="size-3.5 shrink-0 text-muted" />
      <span className="truncate">{field.name}</span>
      {!field.primary && (
        <div className="relative ml-auto">
          <button onClick={() => { setMenu((v) => !v); setSub(null); }} className="grid size-5 place-items-center rounded text-muted opacity-0 group-hover/col:opacity-100 hover:bg-white/10 hover:text-white"><ChevronDown className="size-3.5" /></button>
          {menu && (
            <Pop onClose={() => setMenu(false)} className="right-0 top-6 w-56">
              <input value={nm} onChange={(e) => setNm(e.target.value)} onBlur={() => onPatch({ name: nm.trim() || field.name })} onKeyDown={(e) => { if (e.key === "Enter") { onPatch({ name: nm.trim() || field.name }); setMenu(false); } }} className="mb-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm outline-none" placeholder="Nom du champ" />
              <button onClick={() => setSub(sub === "type" ? null : "type")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"><Settings2 className="size-4 text-muted" /> Type : {FIELD_TYPES.find((t) => t.t === field.type)?.l}<ChevronRight className="ml-auto size-3.5 text-muted" /></button>
              {sub === "type" && (
                <div className="my-1 max-h-52 space-y-0.5 overflow-auto rounded-lg bg-black/20 p-1">
                  {FIELD_TYPES.map((t) => <button key={t.t} onClick={() => { onChangeType(t.t); setSub(null); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5"><t.icon className="size-3.5 text-muted" />{t.l}{field.type === t.t && <Check className="ml-auto size-3.5" style={{ color: ACCENT }} />}</button>)}
                </div>
              )}
              {(field.type === "status" || field.type === "select" || field.type === "tags") && (
                <button onClick={() => setSub(sub === "options" ? null : "options")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"><Palette className="size-4 text-muted" /> Options<ChevronRight className="ml-auto size-3.5 text-muted" /></button>
              )}
              {sub === "options" && (
                <div className="my-1 max-h-52 space-y-1 overflow-auto rounded-lg bg-black/20 p-1.5">
                  {(field.options ?? []).map((o) => (
                    <div key={o.id} className="flex items-center gap-1.5">
                      <div className="flex flex-wrap gap-0.5">{OPTION_COLORS.map((c) => <button key={c} onClick={() => onPatchOption(o.id, { color: c })} className={`size-3 rounded-full ${o.color === c ? "ring-2 ring-white/60" : ""}`} style={{ background: c }} />)}</div>
                      <input value={o.name} onChange={(e) => onPatchOption(o.id, { name: e.target.value })} className="min-w-0 flex-1 rounded bg-white/5 px-1.5 py-0.5 text-xs outline-none" />
                    </div>
                  ))}
                  {!(field.options ?? []).length && <p className="px-1 text-[11px] text-muted">Ajoutez des options depuis une cellule.</p>}
                </div>
              )}
              <div className="my-1 border-t border-white/10" />
              <button onClick={() => { onDelete(); setMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="size-4" /> Supprimer le champ</button>
            </Pop>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Table view ───────────────────────── */
function TableView({ proj, view, rows, shownFields, primary, onCell, onOpen, onAddRow, onDeleteRow, onDuplicate, onMoveRow, onAddField, onPatchField, onDeleteField, onChangeType, onAddOption, onPatchOption }: {
  proj: Project; view: ProjectView; rows: Row[]; shownFields: Field[]; primary: Field;
  onCell: (rowId: string, fieldId: string, v: unknown) => void; onOpen: (id: string) => void; onAddRow: (seed?: Record<string, unknown>) => string;
  onDeleteRow: (id: string) => void; onDuplicate: (id: string) => void; onMoveRow: (from: string, to: string) => void;
  onAddField: (t: FieldType) => void; onPatchField: (id: string, p: Partial<Field>) => void; onDeleteField: (id: string) => void; onChangeType: (id: string, t: FieldType) => void;
  onAddOption: (fieldId: string, name: string) => string; onPatchOption: (fieldId: string, optId: string, p: Partial<Option>) => void;
}) {
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const drag = useRef<string | null>(null);

  // Grouping
  const groupField = view.groupBy ? proj.fields.find((f) => f.id === view.groupBy) : null;
  const groups = useMemo(() => {
    if (!groupField) return [{ key: "__all", label: "", color: "", rows }];
    const map = new Map<string, Row[]>();
    for (const r of rows) { const k = asStr(r.cells[groupField.id]) || "__none"; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
    const out: { key: string; label: string; color: string; rows: Row[] }[] = [];
    const opts = groupField.options ?? (groupField.type === "priority" ? PRIORITIES.map((p) => ({ id: p.k, name: p.l, color: p.color })) : []);
    for (const o of opts) if (map.has(o.id)) { out.push({ key: o.id, label: o.name, color: o.color, rows: map.get(o.id)! }); map.delete(o.id); }
    for (const [k, rs] of map) out.push({ key: k, label: k === "__none" ? "Sans valeur" : k, color: "#64748b", rows: rs });
    return out;
  }, [groupField, rows]);

  const gridCols = `36px ${shownFields.map((f) => `${f.width ?? 150}px`).join(" ")} 44px`;

  return (
    <div className="min-w-max">
      {/* Header row */}
      <div className="sticky top-0 z-20 grid items-center border-b border-white/10 bg-[#0d0e14]/95 backdrop-blur text-xs font-semibold text-muted" style={{ gridTemplateColumns: gridCols }}>
        <div />
        {shownFields.map((f) => (
          <div key={f.id} className="group/col flex items-center border-l border-white/5 px-2.5 py-2.5">
            <ColumnHeader field={f} onPatch={(p) => onPatchField(f.id, p)} onDelete={() => onDeleteField(f.id)} onChangeType={(t) => onChangeType(f.id, t)} onPatchOption={(oid, p) => onPatchOption(f.id, oid, p)} />
          </div>
        ))}
        <div className="relative grid place-items-center border-l border-white/5">
          <button onClick={() => setAddFieldOpen((v) => !v)} className="grid size-6 place-items-center rounded text-muted hover:bg-white/10 hover:text-white" title="Ajouter un champ"><Plus className="size-4" /></button>
          {addFieldOpen && (
            <Pop onClose={() => setAddFieldOpen(false)} className="right-1 top-9 w-56">
              <PanelTitle>Nouveau champ</PanelTitle>
              <div className="max-h-72 space-y-0.5 overflow-auto">
                {FIELD_TYPES.map((t) => <button key={t.t} onClick={() => { onAddField(t.t); setAddFieldOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"><t.icon className="size-4 text-muted" /><span className="text-sm"><span className="block font-medium">{t.l}</span><span className="block text-[11px] text-muted">{t.hint}</span></span></button>)}
              </div>
            </Pop>
          )}
        </div>
      </div>

      {/* Groups + rows */}
      {groups.map((g) => (
        <div key={g.key}>
          {groupField && (
            <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background: g.color + "22", color: g.color }}><span className="size-1.5 rounded-full" style={{ background: g.color }} />{g.label}</span>
              <span className="text-muted">{g.rows.length}</span>
            </div>
          )}
          {g.rows.map((r) => (
            <div key={r.id} draggable={!groupField} onDragStart={() => (drag.current = r.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag.current && drag.current !== r.id) onMoveRow(drag.current, r.id); drag.current = null; }}
              className="group/row grid items-stretch border-b border-white/5 hover:bg-white/[0.025]" style={{ gridTemplateColumns: gridCols }}>
              <div className="flex items-center justify-center text-muted">
                {!groupField && <GripVertical className="size-3.5 cursor-grab opacity-0 group-hover/row:opacity-60" />}
              </div>
              {shownFields.map((f) => (
                <div key={f.id} className="flex items-center border-l border-white/5 px-2.5 py-1.5 min-h-[38px]">
                  <div className="w-full min-w-0">
                    <CellEditor field={f} value={r.cells[f.id]} primary={f.id === primary.id} onOpen={() => onOpen(r.id)} onChange={(v) => onCell(r.id, f.id, v)} onAddOption={onAddOption} />
                  </div>
                </div>
              ))}
              <div className="relative flex items-center justify-center border-l border-white/5">
                <button onClick={() => setRowMenu(rowMenu === r.id ? null : r.id)} className="grid size-6 place-items-center rounded text-muted opacity-0 group-hover/row:opacity-100 hover:bg-white/10 hover:text-white"><MoreHorizontal className="size-4" /></button>
                {rowMenu === r.id && (
                  <Pop onClose={() => setRowMenu(null)} className="right-1 top-8 w-44">
                    <button onClick={() => { onOpen(r.id); setRowMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"><AlignLeft className="size-4 text-muted" /> Ouvrir la fiche</button>
                    <button onClick={() => { onDuplicate(r.id); setRowMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"><Copy className="size-4 text-muted" /> Dupliquer</button>
                    <button onClick={() => { onDeleteRow(r.id); setRowMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="size-4" /> Supprimer</button>
                  </Pop>
                )}
              </div>
            </div>
          ))}
          {/* add-row within group */}
          <button onClick={() => onAddRow(groupField ? { [groupField.id]: g.key === "__none" ? "" : g.key } : {})} className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-sm text-muted hover:bg-white/[0.03] hover:text-white">
            <Plus className="size-4" /> Nouvelle ligne
          </button>
        </div>
      ))}

      {/* Summary footer */}
      <div className="sticky bottom-0 grid border-t border-white/10 bg-[#0d0e14]/95 text-[11px] text-muted backdrop-blur" style={{ gridTemplateColumns: gridCols }}>
        <div />
        {shownFields.map((f) => <div key={f.id} className="border-l border-white/5 px-2.5 py-1.5 truncate">{summarize(f, rows)}</div>)}
        <div />
      </div>
    </div>
  );
}

function summarize(f: Field, rows: Row[]): string {
  const vals = rows.map((r) => r.cells[f.id]);
  if (f.type === "number" || f.type === "progress" || f.type === "rating") {
    const nums = vals.map(asNum).filter((n): n is number => n != null);
    if (!nums.length) return "";
    const sum = nums.reduce((a, b) => a + b, 0);
    return f.type === "number" ? `Σ ${sum}` : `moy. ${Math.round(sum / nums.length)}${f.type === "progress" ? "%" : "★"}`;
  }
  if (f.type === "checkbox") { const done = vals.filter(asBool).length; return rows.length ? `${Math.round((done / rows.length) * 100)}% ✓` : ""; }
  const filled = vals.filter((v) => (f.type === "tags" ? asArr(v).length : asStr(v))).length;
  return filled ? `${filled} rempli${filled > 1 ? "s" : ""}` : "";
}

/* ───────────────────────── Board view ───────────────────────── */
function BoardView({ proj, view, rows, primary, shownFields, onCell, onOpen, onAddRow, onSetGroup }: {
  proj: Project; view: ProjectView; rows: Row[]; primary: Field; shownFields: Field[];
  onCell: (rowId: string, fieldId: string, v: unknown) => void; onOpen: (id: string) => void; onAddRow: (seed?: Record<string, unknown>) => string; onSetGroup: (g: string) => void;
}) {
  const groupF = view.groupBy ? proj.fields.find((f) => f.id === view.groupBy) : proj.fields.find((f) => f.type === "status" || f.type === "select");
  const drag = useRef<string | null>(null);

  if (!groupF || !(groupF.type === "status" || groupF.type === "select" || groupF.type === "priority")) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <KanbanSquare className="mx-auto size-8 text-muted" />
          <p className="mt-2 text-sm text-muted">Choisissez un champ de type statut ou sélection pour regrouper les cartes.</p>
          <select value={view.groupBy ?? ""} onChange={(e) => onSetGroup(e.target.value)} className="mt-3 rounded-lg border border-white/10 bg-[#0f1017] px-3 py-1.5 text-sm">
            <option value="">— champ —</option>
            {proj.fields.filter((f) => f.type === "status" || f.type === "select" || f.type === "priority").map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>
    );
  }
  const opts: Option[] = groupF.type === "priority" ? PRIORITIES.map((p) => ({ id: p.k, name: p.l, color: p.color })) : (groupF.options ?? []);
  const cols = [...opts, { id: "__none", name: "Sans valeur", color: "#64748b" }];
  const cardFields = shownFields.filter((f) => !f.primary && f.id !== groupF.id).slice(0, 4);

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3">
      {cols.map((col) => {
        const cardRows = rows.filter((r) => (asStr(r.cells[groupF.id]) || "__none") === col.id);
        return (
          <div key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag.current) onCell(drag.current, groupF.id, col.id === "__none" ? "" : col.id); drag.current = null; }}
            className="flex w-72 shrink-0 flex-col rounded-2xl border border-white/8 bg-white/[0.02]">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: col.color + "22", color: col.color }}><span className="size-1.5 rounded-full" style={{ background: col.color }} />{col.name}</span>
              <span className="text-xs text-muted">{cardRows.length}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
              {cardRows.map((r) => (
                <div key={r.id} draggable onDragStart={() => (drag.current = r.id)} onClick={() => onOpen(r.id)}
                  className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] p-2.5 hover:border-white/20 hover:bg-white/[0.07] transition">
                  <p className="text-sm font-medium leading-snug">{asStr(r.cells[primary.id]) || "Sans titre"}</p>
                  {cardFields.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {cardFields.map((f) => <span key={f.id}><CellChip field={f} value={r.cells[f.id]} /></span>)}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => { const rid = onAddRow(col.id === "__none" ? {} : { [groupF.id]: col.id }); onOpen(rid); }} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-white"><Plus className="size-3.5" /> Ajouter</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Calendar view ───────────────────────── */
function CalendarView({ view, rows, fields, primary, onOpen, onSetDateField, onAddOn }: {
  view: ProjectView; rows: Row[]; fields: Field[]; primary: Field; onOpen: (id: string) => void; onSetDateField: (d: string) => void; onAddOn: (date: string) => void;
}) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const dateFields = fields.filter((f) => f.type === "date");
  const dateField = view.dateField ?? dateFields[0]?.id;

  if (!dateField) {
    return <div className="grid h-full place-items-center p-8 text-center"><div><CalendarDays className="mx-auto size-8 text-muted" /><p className="mt-2 text-sm text-muted">Ajoutez un champ de type date pour utiliser le calendrier.</p></div></div>;
  }

  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const key = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} className="grid size-8 place-items-center rounded-lg border border-white/10 hover:bg-white/5"><ChevronLeft className="size-4" /></button>
        <div className="min-w-[150px] text-center text-sm font-semibold capitalize">{MONTHS[cursor.m]} {cursor.y}</div>
        <button onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} className="grid size-8 place-items-center rounded-lg border border-white/10 hover:bg-white/5"><ChevronRight className="size-4" /></button>
        <button onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Aujourd&apos;hui</button>
        <select value={dateField} onChange={(e) => onSetDateField(e.target.value)} className="ml-auto rounded-lg border border-white/10 bg-[#0f1017] px-2 py-1.5 text-xs">
          {dateFields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {DOW.map((d) => <div key={d} className="bg-[#0d0e14] px-2 py-1.5 text-center text-[11px] font-semibold text-muted">{d}</div>)}
        {cells.map((d, i) => {
          const dk = d ? key(d) : "";
          const dayRows = d ? rows.filter((r) => asStr(r.cells[dateField]) === dk) : [];
          const isToday = dk === todayStr;
          return (
            <div key={i} className={`group/day min-h-[92px] bg-[#0b0c11] p-1.5 ${d ? "" : "opacity-40"}`}>
              {d && (
                <div className="flex items-center justify-between">
                  <span className={`grid size-5 place-items-center rounded-full text-[11px] ${isToday ? "font-bold text-white" : "text-muted"}`} style={isToday ? { background: ACCENT } : {}}>{d}</span>
                  <button onClick={() => onAddOn(dk)} className="grid size-4 place-items-center rounded text-muted opacity-0 group-hover/day:opacity-100 hover:text-white"><Plus className="size-3" /></button>
                </div>
              )}
              <div className="mt-1 space-y-1">
                {dayRows.slice(0, 3).map((r) => (
                  <button key={r.id} onClick={() => onOpen(r.id)} className="block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-white" style={{ background: ACCENT + "33" }}>{asStr(r.cells[primary.id]) || "Sans titre"}</button>
                ))}
                {dayRows.length > 3 && <span className="px-1 text-[10px] text-muted">+{dayRows.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Timeline (Gantt) view ───────────────────────── */
function TimelineView({ view, rows, fields, primary, onOpen, onConfig }: {
  view: ProjectView; rows: Row[]; fields: Field[]; primary: Field; onOpen: (id: string) => void; onConfig: (p: Partial<ProjectView>) => void;
}) {
  const dateFields = fields.filter((f) => f.type === "date");
  const startF = view.startField ?? dateFields[0]?.id;
  const endF = view.endField ?? dateFields[dateFields.length - 1]?.id ?? startF;

  if (!startF) {
    return <div className="grid h-full place-items-center p-8 text-center"><div><GanttChartSquare className="mx-auto size-8 text-muted" /><p className="mt-2 text-sm text-muted">Ajoutez des champs date (début / échéance) pour la chronologie.</p></div></div>;
  }

  const items = rows.map((r) => {
    const s = asStr(r.cells[startF!]); const e = asStr(r.cells[endF!]) || s;
    const sd = s ? new Date(s + "T00:00:00") : null; const ed = e ? new Date(e + "T00:00:00") : sd;
    return { r, sd, ed: ed && sd && ed < sd ? sd : ed };
  }).filter((x) => x.sd);

  if (!items.length) {
    return <div className="grid h-full place-items-center p-8 text-center"><div><GanttChartSquare className="mx-auto size-8 text-muted" /><p className="mt-2 text-sm text-muted">Renseignez les dates de vos tâches pour les voir ici.</p></div></div>;
  }

  const min = new Date(Math.min(...items.map((x) => x.sd!.getTime())));
  const max = new Date(Math.max(...items.map((x) => x.ed!.getTime())));
  min.setDate(min.getDate() - 2); max.setDate(max.getDate() + 2);
  const totalDays = Math.max(1, Math.round((max.getTime() - min.getTime()) / 86400000));
  const DAY_W = 34;
  const width = totalDays * DAY_W;
  const dayList = Array.from({ length: totalDays + 1 }, (_, i) => { const d = new Date(min); d.setDate(d.getDate() + i); return d; });
  const todayX = Math.round((new Date().setHours(0, 0, 0, 0) - min.getTime()) / 86400000) * DAY_W;

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="text-muted">Début</span>
        <select value={startF} onChange={(e) => onConfig({ startField: e.target.value })} className="rounded-lg border border-white/10 bg-[#0f1017] px-2 py-1">{dateFields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <span className="text-muted">Fin</span>
        <select value={endF} onChange={(e) => onConfig({ endField: e.target.value })} className="rounded-lg border border-white/10 bg-[#0f1017] px-2 py-1">{dateFields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <div style={{ width: width + 220 }}>
          {/* axis */}
          <div className="sticky top-0 flex border-b border-white/10 bg-[#0d0e14]/95 backdrop-blur">
            <div className="w-[220px] shrink-0 border-r border-white/10 px-3 py-1.5 text-[11px] font-semibold text-muted">Tâche</div>
            <div className="relative flex" style={{ width }}>
              {dayList.map((d, i) => (
                <div key={i} className="shrink-0 border-r border-white/5 py-1.5 text-center text-[10px] text-muted" style={{ width: DAY_W }}>
                  {d.getDate() === 1 || i === 0 ? <span className="font-semibold text-white/70">{d.toLocaleDateString("fr-FR", { month: "short" })}</span> : d.getDate()}
                </div>
              ))}
            </div>
          </div>
          {/* rows */}
          <div className="relative">
            {todayX >= 0 && todayX <= width && <div className="pointer-events-none absolute bottom-0 top-0 z-10 w-px" style={{ left: 220 + todayX, background: ACCENT }} />}
            {items.map(({ r, sd, ed }) => {
              const offset = Math.round((sd!.getTime() - min.getTime()) / 86400000);
              const span = Math.max(1, Math.round((ed!.getTime() - sd!.getTime()) / 86400000) + 1);
              return (
                <div key={r.id} className="flex items-center border-b border-white/5 hover:bg-white/[0.02]">
                  <button onClick={() => onOpen(r.id)} className="w-[220px] shrink-0 truncate border-r border-white/10 px-3 py-2 text-left text-sm hover:text-white">{asStr(r.cells[primary.id]) || "Sans titre"}</button>
                  <div className="relative py-2" style={{ width }}>
                    <button onClick={() => onOpen(r.id)} className="absolute top-1/2 h-5 -translate-y-1/2 rounded-full text-[10px] font-medium text-white shadow transition hover:brightness-110" style={{ left: offset * DAY_W + 3, width: span * DAY_W - 6, background: `linear-gradient(90deg, #3b6dff, ${ACCENT})` }} title={asStr(r.cells[primary.id])} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Gallery view ───────────────────────── */
function GalleryView({ rows, shownFields, primary, onOpen, onAddRow }: {
  rows: Row[]; shownFields: Field[]; primary: Field; onOpen: (id: string) => void; onAddRow: () => void;
}) {
  const fieldsToShow = shownFields.filter((f) => !f.primary).slice(0, 5);
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 p-3">
      {rows.map((r) => (
        <button key={r.id} onClick={() => onOpen(r.id)} className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]">
          <div className="h-1.5 w-10 rounded-full" style={{ background: `linear-gradient(90deg, #3b6dff, ${ACCENT})` }} />
          <p className="text-sm font-semibold leading-snug">{asStr(r.cells[primary.id]) || "Sans titre"}</p>
          <div className="space-y-1.5">
            {fieldsToShow.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">{f.name}</span>
                <CellChip field={f} value={r.cells[f.id]} />
              </div>
            ))}
          </div>
        </button>
      ))}
      <button onClick={onAddRow} className="grid min-h-[120px] place-items-center rounded-2xl border border-dashed border-white/15 text-muted transition hover:border-white/30 hover:bg-white/[0.03] hover:text-white"><span className="flex items-center gap-1.5 text-sm"><Plus className="size-4" /> Nouvelle carte</span></button>
    </div>
  );
}

/* ───────────────────────── Row detail modal ───────────────────────── */
function RowDetail({ row, fields, primary, onClose, onCell, onNotes, onChecklist, onDelete, onAddOption }: {
  row: Row; fields: Field[]; primary: Field; onClose: () => void; onCell: (fid: string, v: unknown) => void;
  onNotes: (n: string) => void; onChecklist: (cl: Check[]) => void; onDelete: () => void; onAddOption: (fieldId: string, name: string) => string;
}) {
  const [mounted, setMounted] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  useEffect(() => { setMounted(true); const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);
  if (!mounted) return null;
  const cl = row.checklist ?? [];
  const done = cl.filter((c) => c.done).length;
  const notesHtml = (() => { try { return sanitizeRichHtml(marked.parse(row.notes || "*Aucune description.*", { async: false }) as string); } catch { return ""; } })();

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl border border-white/12 bg-[#0f1017] shadow-2xl shadow-black/60" style={{ animation: "revealUp 0.2s both" }}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
          <FolderKanban className="size-4" style={{ color: ACCENT }} />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Fiche</span>
          <button onClick={onDelete} className="ml-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400" title="Supprimer"><Trash2 className="size-4" /></button>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="max-h-[75vh] overflow-auto p-5">
          <input value={asStr(row.cells[primary.id])} onChange={(e) => onCell(primary.id, e.target.value)} placeholder="Sans titre" className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-white/25" />

          {/* Properties */}
          <div className="mt-5 space-y-1">
            {fields.filter((f) => !f.primary).map((f) => {
              const Icon = fieldIcon(f.type);
              return (
                <div key={f.id} className="flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-white/[0.02]">
                  <span className="flex w-36 shrink-0 items-center gap-2 pt-1 text-xs text-muted"><Icon className="size-3.5" />{f.name}</span>
                  <div className="min-w-0 flex-1 pt-0.5"><CellEditor field={f} value={row.cells[f.id]} onChange={(v) => onCell(f.id, v)} onAddOption={onAddOption} /></div>
                </div>
              );
            })}
          </div>

          {/* Checklist */}
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ListChecks className="size-4" style={{ color: ACCENT }} /> Sous-tâches {cl.length > 0 && <span className="text-xs font-normal text-muted">{done}/{cl.length}</span>}</div>
            {cl.length > 0 && <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${(done / cl.length) * 100}%`, background: ACCENT }} /></div>}
            <div className="space-y-1">
              {cl.map((c) => (
                <div key={c.id} className="group/ck flex items-center gap-2">
                  <button onClick={() => onChecklist(cl.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} className={`grid size-4 shrink-0 place-items-center rounded ${c.done ? "" : "border border-white/25"}`} style={c.done ? { background: ACCENT } : {}}>{c.done && <Check className="size-3 text-white" />}</button>
                  <input value={c.text} onChange={(e) => onChecklist(cl.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)))} className={`flex-1 bg-transparent text-sm outline-none ${c.done ? "text-muted line-through" : ""}`} />
                  <button onClick={() => onChecklist(cl.filter((x) => x.id !== c.id))} className="opacity-0 group-hover/ck:opacity-100 text-muted hover:text-red-400"><X className="size-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Plus className="size-3.5 text-muted" />
              <input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newCheck.trim()) { onChecklist([...cl, { id: uid(), text: newCheck.trim(), done: false }]); setNewCheck(""); } }} placeholder="Ajouter une sous-tâche…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/25" />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlignLeft className="size-4" style={{ color: ACCENT }} /> Description</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <textarea value={row.notes ?? ""} onChange={(e) => onNotes(e.target.value)} placeholder="Écrivez en Markdown…" className="min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm outline-none focus:border-white/20 placeholder:text-white/25" />
              <div className="prose-share min-h-[120px] rounded-xl border border-white/10 bg-white/[0.015] px-3 py-2 text-sm" dangerouslySetInnerHTML={{ __html: notesHtml }} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
