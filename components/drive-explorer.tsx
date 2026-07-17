"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FolderPlus,
  LayoutGrid,
  List as ListIcon,
  Search,
  Star,
  Trash2,
  Share2,
  Download,
  Pencil,
  FolderInput,
  RotateCcw,
  MoreVertical,
  Home,
  ChevronRight,
  X,
  CloudUpload,
  Loader2,
  FileText,
  Table2,
  BarChart3,
  ChevronDown,
  Users,
  Brush,
  Presentation,
  FolderKanban,
  StickyNote,
  Workflow,
  Sparkles,
  Cloud,
  LineChart,
  PieChart,
  Menu,
  CalendarClock,
  Target,
  HeartHandshake,
} from "lucide-react";
import type { SerializedNode } from "@/lib/nodes";
import { api, notifyRefresh } from "@/lib/api";
import {
  CHART_TYPES,
  QUICK_CHART_TYPES,
  defaultChartDoc,
  type ChartType,
} from "@/lib/chart-palette";
import { cn, formatBytes, formatRelative } from "@/lib/utils";
import { NodeIcon } from "./file-icon";
import { categoryOf } from "@/lib/filetypes";
import { PreviewModal } from "./preview-modal";
import { ShareDialog } from "./share-dialog";
import { MoveDialog } from "./move-dialog";
import { NameDialog } from "./name-dialog";
import { MembersDialog } from "./members-dialog";
import { ConfirmDialog } from "./confirm-dialog";

type View = "my" | "starred" | "recent" | "trash";
type UploadTask = { id: string; name: string; progress: number; error?: boolean };

// Modèle de plan d'action (drive coaching) — objectifs + étapes cochables.
const ACTION_PLAN_TEMPLATE = JSON.stringify({
  objectives: [
    { id: "o1", title: "Premier objectif", status: "doing", due: "", steps: [
      { id: "o1s1", text: "Première étape", done: true },
      { id: "o1s2", text: "Deuxième étape", done: false },
    ] },
    { id: "o2", title: "Deuxième objectif", status: "todo", due: "", steps: [] },
  ],
});

export function DriveExplorer({
  view,
  folderId = null,
  breadcrumb = [],
  title,
  spaceId = null,
  basePath = "/drive",
  spaceName,
  nodeBase,
  variant = "filehub",
}: {
  view: View;
  folderId?: string | null;
  breadcrumb?: { id: string; name: string }[];
  title: string;
  spaceId?: string | null;
  basePath?: string;
  spaceName?: string;
  // Base pour ouvrir un document (drive du coaché) : "<base>/<nodeId>".
  // Par défaut on ouvre les éditeurs FileHub génériques (/drive/<type>/<id>).
  nodeBase?: string;
  // "coaching" : menu de création adapté au coaching (modèles pré-remplis).
  variant?: "filehub" | "coaching";
}) {
  const router = useRouter();
  const [nodes, setNodes] = useState<SerializedNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<SerializedNode | null>(null);
  const [shareNode, setShareNode] = useState<SerializedNode | null>(null);
  const [moveNode, setMoveNode] = useState<SerializedNode | null>(null);
  const [renameNode, setRenameNode] = useState<SerializedNode | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [projectMenu, setProjectMenu] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [deleteNode, setDeleteNode] = useState<SerializedNode | null>(null);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; node: SerializedNode } | null>(null);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const canUpload = view === "my";

  useEffect(() => {
    const stored = localStorage.getItem("filehub:view");
    if (stored === "grid" || stored === "list") setMode(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem("filehub:view", mode);
  }, [mode]);

  const load = useCallback(
    (q?: string) => {
      setLoading(true);
      const p = q ? api.list({ q, space: spaceId }) : api.list({ view, parent: folderId, space: spaceId });
      p.then((r) => setNodes(r.nodes))
        .catch(() => setNodes([]))
        .finally(() => setLoading(false));
    },
    [view, folderId, spaceId],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search across the whole drive.
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) load(query.trim());
      else load();
    }, 250);
    return () => clearTimeout(t);
  }, [query, load]);

  // ---- Uploads -------------------------------------------------------------
  const uploadFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      list.forEach((file) => {
        const taskId = `${file.name}-${file.size}-${Math.round(file.lastModified)}`;
        setUploads((u) => [...u, { id: taskId, name: file.name, progress: 0 }]);
        const form = new FormData();
        form.append("files", file);
        if (folderId) form.append("parentId", folderId);
        if (spaceId) form.append("spaceId", spaceId);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploads((u) => u.map((t) => (t.id === taskId ? { ...t, progress: pct } : t)));
          }
        };
        xhr.onload = () => {
          const ok = xhr.status >= 200 && xhr.status < 300;
          setUploads((u) =>
            u.map((t) => (t.id === taskId ? { ...t, progress: 100, error: !ok } : t)),
          );
          setTimeout(() => setUploads((u) => u.filter((t) => t.id !== taskId)), ok ? 1200 : 4000);
          if (ok) {
            load();
            notifyRefresh();
          }
        };
        xhr.onerror = () => {
          setUploads((u) => u.map((t) => (t.id === taskId ? { ...t, error: true } : t)));
        };
        xhr.send(form);
      });
    },
    [folderId, spaceId, load],
  );

  // ---- Drag & drop ---------------------------------------------------------
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!canUpload) return;
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  // ---- Actions -------------------------------------------------------------
  // Lien d'ouverture d'un document : drive du coaché (nodeBase) ou éditeur FileHub.
  const editorHref = (type: string, id: string) =>
    nodeBase ? `${nodeBase}/${id}` : `/drive/${type}/${id}`;

  const open = (n: SerializedNode) => {
    if (n.type === "folder") router.push(`${basePath}/folder/${n.id}`);
    else if (n.type === "doc" || n.type === "sheet" || n.type === "chart" || n.type === "draw" || n.type === "note" || n.type === "diagram" || n.type === "board" || n.type === "slides" || n.type === "project" || n.type === "coaching" || n.type === "seance")
      router.push(editorHref(n.type, n.id));
    else setPreview(n);
  };

  const createDoc = async () => {
    const { node } = await api.createDoc("Document sans titre", folderId, spaceId);
    router.push(editorHref("doc", node.id));
  };

  const createSheet = async () => {
    const { node } = await api.createSheet("Feuille sans titre", folderId, spaceId);
    router.push(editorHref("sheet", node.id));
  };

  const createChart = async (type: ChartType = "bar") => {
    const { node } = await api.createChart("Graphique sans titre", folderId, spaceId);
    await api.saveChart(node.id, { content: defaultChartDoc(type) });
    router.push(editorHref("chart", node.id));
  };

  const closeProjectMenu = () => {
    setProjectMenu(false);
    setChartExpanded(false);
  };

  const createDraw = async () => {
    const { node } = await api.createDraw("Dessin sans titre", folderId, spaceId);
    router.push(editorHref("draw", node.id));
  };

  const createTyped = async (type: "note" | "diagram" | "board" | "slides" | "project") => {
    const label = { note: "Note sans titre", diagram: "Diagramme sans titre", board: "Tableau kanban", slides: "Présentation sans titre", project: "Tableau sans titre" }[type];
    const { node } = await api.createNode(type, label, folderId, spaceId);
    router.push(editorHref(type, node.id));
  };

  // ── Créations spécifiques au coaching (avec modèle pré-rempli) ──
  // Compte-rendu de séance : vrai outil structuré (type « seance »), pas un doc.
  const createSessionNote = async () => {
    const { node } = await api.createNode("seance", "Compte-rendu de séance", folderId, spaceId);
    router.push(editorHref("seance", node.id));
  };

  const createActionPlan = async () => {
    const { node } = await api.createNode("project", "Plan d'action", folderId, spaceId);
    await api.saveContent(node.id, { content: ACTION_PLAN_TEMPLATE }).catch(() => {});
    router.push(editorHref("project", node.id));
  };

  // Options du menu « + » : jeu adapté au coaching, ou générique FileHub.
  type CreateItem = { icon: typeof FileText; tint: string; label: string; desc: string; fn?: () => void; expandable?: boolean };
  const createItems: CreateItem[] = variant === "coaching"
    ? [
        { icon: CalendarClock, tint: "#0ea5e9", label: "Compte-rendu de séance", desc: "Outil structuré : objectif, points, actions…", fn: createSessionNote },
        { icon: Target, tint: "#22c55e", label: "Plan d'action", desc: "Objectifs & tâches multi-vues", fn: createActionPlan },
        { icon: FileText, tint: "#5b8bff", label: "Document", desc: "Traitement de texte", fn: createDoc },
        { icon: Table2, tint: "#10b981", label: "Tableur", desc: "Indicateurs, présence, suivi…", fn: createSheet },
        { icon: StickyNote, tint: "#eab308", label: "Note", desc: "Note rapide (Markdown)", fn: () => createTyped("note") },
        { icon: Presentation, tint: "#fb7185", label: "Support de séance", desc: "Diaporama", fn: () => createTyped("slides") },
        { icon: Upload, tint: "#a78bff", label: "Importer un fichier", desc: "PDF, images, contrats…", fn: () => fileInput.current?.click() },
        { icon: FolderPlus, tint: "#f59e0b", label: "Nouveau dossier", desc: "Organisez les documents", fn: () => setNewFolder(true) },
      ]
    : [
        { icon: Upload, tint: "#5b8bff", label: "Importer", desc: "Fichiers depuis votre appareil", fn: () => fileInput.current?.click() },
        { icon: FileText, tint: "#5b8bff", label: "Document", desc: "Traitement de texte", fn: createDoc },
        { icon: Table2, tint: "#10b981", label: "Feuille de calcul", desc: "Tableur complet", fn: createSheet },
        { icon: BarChart3, tint: "#f59e0b", label: "Graphique", desc: "Choisir un type", expandable: true },
        { icon: Presentation, tint: "#fb7185", label: "Présentation", desc: "Diaporama + IA", fn: () => createTyped("slides") },
        { icon: FolderKanban, tint: "#8b5cf6", label: "Tableau", desc: "Base de tâches multi-vues", fn: () => createTyped("project") },
        { icon: StickyNote, tint: "#eab308", label: "Note", desc: "Markdown rapide", fn: () => createTyped("note") },
        { icon: Workflow, tint: "#14b8a6", label: "Diagramme", desc: "Schéma Mermaid", fn: () => createTyped("diagram") },
        { icon: Brush, tint: "#ec4899", label: "Dessin", desc: "Tablette graphique", fn: createDraw },
        { icon: FolderPlus, tint: "#a78bff", label: "Nouveau dossier", desc: "Organisez vos fichiers", fn: () => setNewFolder(true) },
      ];

  const doRename = async (n: SerializedNode, name: string) => {
    await api.update(n.id, { name });
    setRenameNode(null);
    load(query.trim() || undefined);
  };
  const toggleStar = async (n: SerializedNode) => {
    await api.update(n.id, { starred: !n.starred });
    load(query.trim() || undefined);
  };
  const trash = async (n: SerializedNode) => {
    await api.update(n.id, { trashed: true });
    load(query.trim() || undefined);
  };
  const restore = async (n: SerializedNode) => {
    await api.update(n.id, { trashed: false });
    load();
  };
  const deleteForever = async (n: SerializedNode) => {
    await api.remove(n.id);
    setDeleteNode(null);
    load();
    notifyRefresh();
  };
  const createFolder = async (name: string) => {
    await api.createFolder(name, folderId, spaceId);
    setNewFolder(false);
    load();
  };
  const doMove = async (dest: string | null) => {
    if (!moveNode) return;
    await api.update(moveNode.id, { parentId: dest });
    setMoveNode(null);
    load();
  };
  const emptyTrash = async () => {
    await api.emptyTrash();
    setEmptyTrashOpen(false);
    load();
    notifyRefresh();
  };

  const menuItems = useMemo(() => {
    if (!menu) return [];
    const n = menu.node;
    if (view === "trash") {
      return [
        { icon: RotateCcw, label: "Restaurer", fn: () => restore(n) },
        { icon: Trash2, label: "Supprimer définitivement", fn: () => setDeleteNode(n), danger: true },
      ];
    }
    const items = [
      { icon: n.starred ? Star : Star, label: n.starred ? "Retirer des favoris" : "Ajouter aux favoris", fn: () => toggleStar(n) },
      { icon: FolderInput, label: "Déplacer vers", fn: () => setMoveNode(n) },
      { icon: Pencil, label: "Renommer", fn: () => setRenameNode(n) },
      { icon: Share2, label: "Partager", fn: () => setShareNode(n) },
    ];
    if (n.type === "file") {
      items.push({
        icon: Download,
        label: "Télécharger",
        fn: () => {
          const a = document.createElement("a");
          a.href = `/api/nodes/${n.id}/raw?download=1`;
          a.click();
        },
      });
    }
    items.push({ icon: Trash2, label: "Mettre à la corbeille", fn: () => trash(n), danger: true } as never);
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, view]);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  const searching = query.trim().length > 0;

  return (
    <div
      className="flex flex-col h-full min-h-0"
      onDragEnter={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => canUpload && e.preventDefault()}
      onDragLeave={() => {
        if (!canUpload) return;
        dragDepth.current--;
        if (dragDepth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {/* Top bar */}
      <header className="h-16 shrink-0 border-b border-white/10 px-4 sm:px-6 flex items-center gap-2 sm:gap-4 bg-white/[0.03] backdrop-blur-xl">
        <button
          onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden"
          title="Menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          {view === "my" && breadcrumb.length > 0 ? (
            <nav className="flex items-center gap-1 text-sm">
              <button onClick={() => router.push(basePath)} className="flex items-center gap-1 text-muted hover:text-ink px-1.5 py-1 rounded">
                {spaceId ? <Users className="size-4" /> : <Home className="size-4" />} {spaceName || "Mon Drive"}
              </button>
              {breadcrumb.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1 min-w-0">
                  <ChevronRight className="size-3.5 text-muted shrink-0" />
                  <button
                    onClick={() => router.push(`${basePath}/folder/${c.id}`)}
                    className={cn(
                      "px-1.5 py-1 rounded truncate max-w-[200px]",
                      i === breadcrumb.length - 1 ? "font-semibold text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {c.name}
                  </button>
                </span>
              ))}
            </nav>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              {spaceId && <Users className="size-5 shrink-0 text-brand-300" />}
              <h1 className="text-xl font-bold truncate">{title}</h1>
            </div>
          )}
        </div>

        {spaceId && variant !== "coaching" && (
          <button
            onClick={() => setMembersOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm font-medium hover:bg-white/10 transition"
            title="Gérer les membres"
          >
            <Users className="size-4 text-brand-300" /> Membres
          </button>
        )}

        {/* Search */}
        <div className="relative w-full max-w-[9.5rem] sm:max-w-xs">
          <Search className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-white/5 border border-white/10 focus:border-brand-400 focus:bg-white/[0.07] outline-none text-sm transition"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 size-6 grid place-items-center rounded-md hover:bg-white/10 text-muted">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setMode("grid")}
            className={cn("size-8 grid place-items-center rounded-lg", mode === "grid" ? "bg-white/10 text-brand-300" : "text-muted hover:text-ink")}
            title="Grille"
          >
            <LayoutGrid className="size-[18px]" />
          </button>
          <button
            onClick={() => setMode("list")}
            className={cn("size-8 grid place-items-center rounded-lg", mode === "list" ? "bg-white/10 text-brand-300" : "text-muted hover:text-ink")}
            title="Liste"
          >
            <ListIcon className="size-[18px]" />
          </button>
        </div>
      </header>

      {/* Action row */}
      {(canUpload || view === "trash") && (
        <div className="px-6 py-3 flex items-center gap-2 shrink-0">
          {canUpload && (
            <>
              {/* Bouton unique « New Project » : regroupe toutes les créations.
                  Pas de `perspective` ici : elle piégerait l'overlay fixed et
                  le contexte d'empilement (le contenu passerait par-dessus). */}
              <div className="relative z-30">
                <button
                  onClick={() => {
                    setChartExpanded(false);
                    setProjectMenu((v) => !v);
                  }}
                  className="group relative h-10 overflow-hidden rounded-xl bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 flex items-center gap-2"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="size-4" /> {variant === "coaching" ? "Nouveau" : "New Project"}
                    <ChevronDown className={cn("size-4 transition", projectMenu && "rotate-180")} />
                  </span>
                  <span
                    className="absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    style={{ animation: "shine 3.5s ease-in-out infinite" }}
                  />
                </button>

                {projectMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={closeProjectMenu} />
                    <div
                      className="absolute left-0 top-12 z-50 w-[440px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-2xl shadow-2xl shadow-black/50"
                      style={{ animation: "mclarenOpen 0.6s cubic-bezier(0.22,1.15,0.36,1) both", transformOrigin: "top center" }}
                    >
                      {/* En-tête du menu de création */}
                      {variant === "coaching" ? (
                        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#06b6d4]/15 to-[#3b82f6]/15 px-5 py-4">
                          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] shadow-lg shadow-cyan-500/30">
                            <HeartHandshake className="size-5 text-white" />
                          </span>
                          <div>
                            <p className="text-sm font-bold leading-tight">Nouveau pour ce coaché</p>
                            <p className="text-xs text-muted">Que voulez-vous créer&nbsp;?</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#3b6dff]/15 to-[#7b3bff]/15 px-5 py-4">
                          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
                            <Cloud className="size-5 text-white" />
                          </span>
                          <div>
                            <p className="text-sm font-bold leading-tight">Nouveau projet</p>
                            <p className="text-xs text-muted">Que voulez-vous créer&nbsp;?</p>
                          </div>
                        </div>
                      )}

                      {/* Grille des créations */}
                      <div className="grid grid-cols-2 gap-1.5 p-3">
                        {createItems.map((o, i) => (
                          <button
                            key={o.label}
                            onClick={() => {
                              if (o.expandable) {
                                setChartExpanded((v) => !v);
                                return;
                              }
                              closeProjectMenu();
                              o.fn?.();
                            }}
                            style={{ animation: "revealUp 0.4s both", animationDelay: `${180 + i * 45}ms` }}
                            className={cn(
                              "group/card flex items-start gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.07]",
                              o.expandable && chartExpanded
                                ? "border-amber-400/40 bg-white/[0.06]"
                                : "border-white/5 bg-white/[0.03] hover:border-white/15",
                            )}
                          >
                            <span
                              className="grid size-9 shrink-0 place-items-center rounded-lg transition group-hover/card:scale-110"
                              style={{ background: `${o.tint}22` }}
                            >
                              <o.icon className="size-[18px]" style={{ color: o.tint }} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1 text-sm font-semibold leading-tight">
                                <span className="truncate">{o.label}</span>
                                {o.expandable && (
                                  <ChevronDown
                                    className={cn(
                                      "size-3.5 shrink-0 text-muted transition",
                                      chartExpanded && "rotate-180",
                                    )}
                                  />
                                )}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-snug text-muted line-clamp-2">{o.desc}</span>
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Sous-choix des types de graphique (déplié depuis la carte) */}
                      {chartExpanded && (
                        <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
                          {QUICK_CHART_TYPES.map((qt, i) => {
                            const meta = CHART_TYPES.find((t) => t.id === qt)!;
                            const Icon = qt === "bar" ? BarChart3 : qt === "line" ? LineChart : PieChart;
                            return (
                              <button
                                key={qt}
                                onClick={() => {
                                  closeProjectMenu();
                                  createChart(qt);
                                }}
                                style={{ animation: "revealUp 0.32s both", animationDelay: `${i * 50}ms` }}
                                className="group/chart flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-center transition hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/[0.07]"
                              >
                                <span className="grid size-9 place-items-center rounded-lg transition group-hover/chart:scale-110" style={{ background: "#f59e0b22" }}>
                                  <Icon className="size-[18px]" style={{ color: "#f59e0b" }} />
                                </span>
                                <span className="text-xs font-medium leading-tight">{meta.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </>
          )}
          {view === "trash" && nodes.length > 0 && (
            <button
              onClick={() => setEmptyTrashOpen(true)}
              className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium flex items-center gap-2 hover:bg-red-500/10 transition"
            >
              <Trash2 className="size-4" /> Vider la corbeille
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-24 relative" onClick={() => setSelected(null)}>
        {searching && (
          <p className="text-sm text-muted mb-3">
            Résultats pour « <span className="font-medium text-ink">{query}</span> »
          </p>
        )}

        {loading ? (
          <div className="h-64 grid place-items-center text-muted">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : nodes.length === 0 ? (
          <EmptyState view={view} searching={searching} />
        ) : mode === "grid" ? (
          <GridView
            nodes={nodes}
            selected={selected}
            onSelect={setSelected}
            onOpen={open}
            onMenu={(e, n) => {
              e.preventDefault();
              e.stopPropagation();
              setMenu({ x: e.clientX, y: e.clientY, node: n });
            }}
            onStar={toggleStar}
          />
        ) : (
          <ListView
            nodes={nodes}
            selected={selected}
            onSelect={setSelected}
            onOpen={open}
            onMenu={(e, n) => {
              e.preventDefault();
              e.stopPropagation();
              setMenu({ x: e.clientX, y: e.clientY, node: n });
            }}
          />
        )}
      </div>

      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-40 bg-brand-600/10 backdrop-blur-sm grid place-items-center pointer-events-none">
          <div className="bg-[#0f1017] rounded-3xl shadow-2xl px-10 py-8 flex flex-col items-center gap-3 border-2 border-dashed border-brand-400">
            <CloudUpload className="size-12 text-brand-400" />
            <p className="text-lg font-semibold">Déposez pour importer</p>
          </div>
        </div>
      )}

      {/* Upload progress dock */}
      {uploads.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 w-80 bg-[#0f1017]/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 text-sm font-semibold">
            <Upload className="size-4 text-brand-300" />
            Import ({uploads.length})
          </div>
          <div className="max-h-64 overflow-auto divide-y divide-line">
            {uploads.map((u) => (
              <div key={u.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="truncate max-w-[180px]">{u.name}</span>
                  <span className={cn("text-xs", u.error ? "text-red-600" : "text-muted")}>
                    {u.error ? "Échec" : `${u.progress}%`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", u.error ? "bg-red-500" : "bg-brand-500")}
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context menu */}
      {menu && (
        <div
          className="fixed z-50 w-56 bg-[#0f1017]/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 py-1.5 animate-in"
          style={{
            left: Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 240),
            top: Math.min(menu.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - menuItems.length * 40 - 20),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.fn();
                setMenu(null);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 h-10 text-sm text-left hover:bg-white/5 transition",
                (item as { danger?: boolean }).danger && "text-red-400 hover:bg-red-500/10",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {preview && (
        <PreviewModal
          node={preview}
          onClose={() => setPreview(null)}
          onToggleStar={(n) => {
            toggleStar(n);
            setPreview({ ...n, starred: !n.starred });
          }}
          onShare={(n) => {
            setPreview(null);
            setShareNode(n);
          }}
        />
      )}
      {shareNode && <ShareDialog node={shareNode} onClose={() => setShareNode(null)} />}
      {moveNode && <MoveDialog node={moveNode} onClose={() => setMoveNode(null)} onMoved={doMove} />}
      {renameNode && (
        <NameDialog
          title="Renommer"
          label="Nouveau nom"
          initial={renameNode.name}
          confirmLabel="Renommer"
          onCancel={() => setRenameNode(null)}
          onConfirm={(name) => doRename(renameNode, name)}
        />
      )}
      {newFolder && (
        <NameDialog
          title="Nouveau dossier"
          label="Nom du dossier"
          initial="Dossier sans titre"
          confirmLabel="Créer"
          onCancel={() => setNewFolder(false)}
          onConfirm={createFolder}
        />
      )}
      {membersOpen && spaceId && (
        <MembersDialog spaceId={spaceId} onClose={() => setMembersOpen(false)} />
      )}
      {deleteNode && (
        <ConfirmDialog
          title="Supprimer définitivement"
          message={`« ${deleteNode.name} » sera supprimé pour toujours. Cette action est irréversible.`}
          confirmLabel="Supprimer"
          danger
          onCancel={() => setDeleteNode(null)}
          onConfirm={() => deleteForever(deleteNode)}
        />
      )}
      {emptyTrashOpen && (
        <ConfirmDialog
          title="Vider la corbeille"
          message="Tous les éléments de la corbeille seront définitivement supprimés. Cette action est irréversible."
          confirmLabel="Vider la corbeille"
          danger
          onCancel={() => setEmptyTrashOpen(false)}
          onConfirm={emptyTrash}
        />
      )}
    </div>
  );
}

// ---- Grid ------------------------------------------------------------------
function GridView({
  nodes,
  selected,
  onSelect,
  onOpen,
  onMenu,
  onStar,
}: {
  nodes: SerializedNode[];
  selected: string | null;
  onSelect: (id: string) => void;
  onOpen: (n: SerializedNode) => void;
  onMenu: (e: React.MouseEvent, n: SerializedNode) => void;
  onStar: (n: SerializedNode) => void;
}) {
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      {nodes.map((n, i) => {
        const cat = categoryOf(n.mimeType, n.name);
        const showThumb = cat === "image";
        return (
          <div
            key={n.id}
            style={{ animation: "revealUp 0.45s both", animationDelay: `${Math.min(i * 35, 500)}ms` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(n.id);
            }}
            onDoubleClick={() => onOpen(n)}
            onContextMenu={(e) => onMenu(e, n)}
            className={cn(
              "group relative rounded-2xl border bg-white/[0.04] p-3 cursor-pointer transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]",
              selected === n.id ? "border-brand-400 ring-2 ring-brand-500/30" : "border-white/10",
            )}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: "radial-gradient(circle, #3b6dff55, transparent 70%)" }}
            />
            <div className="relative aspect-[4/3] rounded-xl bg-white/5 grid place-items-center overflow-hidden mb-2.5">
              {showThumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/nodes/${n.id}/raw`} alt={n.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <NodeIcon type={n.type} mimeType={n.mimeType} name={n.name} color={n.color} size={44} />
              )}
            </div>
            <div className="flex items-start gap-1.5">
              <NodeIcon type={n.type} mimeType={n.mimeType} name={n.name} color={n.color} size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">{n.name}</p>
            </div>
            <p className="text-xs text-muted mt-1 pl-[22px]">
              {n.type === "folder" ? `${n.childCount ?? 0} élément(s)` : formatBytes(n.size)}
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onStar(n);
              }}
              className={cn(
                "absolute top-2 left-2 size-7 grid place-items-center rounded-lg bg-black/50 backdrop-blur shadow-sm transition",
                n.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              title="Favori"
            >
              <Star className={cn("size-4", n.starred ? "fill-yellow-400 text-yellow-400" : "text-muted")} />
            </button>
            <button
              onClick={(e) => onMenu(e, n)}
              className="absolute top-2 right-2 size-7 grid place-items-center rounded-lg bg-black/50 backdrop-blur shadow-sm opacity-0 group-hover:opacity-100 transition text-white/80"
            >
              <MoreVertical className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---- List ------------------------------------------------------------------
function ListView({
  nodes,
  selected,
  onSelect,
  onOpen,
  onMenu,
}: {
  nodes: SerializedNode[];
  selected: string | null;
  onSelect: (id: string) => void;
  onOpen: (n: SerializedNode) => void;
  onMenu: (e: React.MouseEvent, n: SerializedNode) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="grid grid-cols-[1fr_40px] sm:grid-cols-[1fr_140px_120px_40px] gap-4 px-4 h-11 items-center text-xs font-medium text-muted border-b border-white/10">
        <span>Nom</span>
        <span className="hidden sm:block">Modifié</span>
        <span className="hidden sm:block">Taille</span>
        <span></span>
      </div>
      {nodes.map((n, i) => (
        <div
          key={n.id}
          style={{ animation: "revealUp 0.4s both", animationDelay: `${Math.min(i * 25, 400)}ms` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(n.id);
          }}
          onDoubleClick={() => onOpen(n)}
          onContextMenu={(e) => onMenu(e, n)}
          className={cn(
            "grid grid-cols-[1fr_40px] sm:grid-cols-[1fr_140px_120px_40px] gap-4 px-4 h-14 items-center cursor-pointer border-b border-line last:border-0 transition",
            selected === n.id ? "bg-brand-500/10" : "hover:bg-white/5",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <NodeIcon type={n.type} mimeType={n.mimeType} name={n.name} color={n.color} size={22} className="shrink-0" />
            <span className="text-sm font-medium truncate">{n.name}</span>
            {n.starred && <Star className="size-3.5 fill-yellow-400 text-yellow-400 shrink-0" />}
          </div>
          <span className="hidden sm:block text-sm text-muted">{formatRelative(n.updatedAt)}</span>
          <span className="hidden sm:block text-sm text-muted">{n.type === "folder" ? "—" : formatBytes(n.size)}</span>
          <button
            onClick={(e) => onMenu(e, n)}
            className="size-8 grid place-items-center rounded-lg hover:bg-white/10 text-muted"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---- Empty state -----------------------------------------------------------
function EmptyState({
  view,
  searching,
}: {
  view: View;
  searching: boolean;
}) {
  const config: Record<string, { icon: typeof CloudUpload; title: string; sub: string }> = {
    search: { icon: Search, title: "Aucun résultat", sub: "Essayez d'autres mots-clés." },
    my: { icon: CloudUpload, title: "Ce dossier est vide", sub: "Importez des fichiers ou créez un dossier." },
    starred: { icon: Star, title: "Aucun favori", sub: "Marquez vos fichiers importants d'une étoile." },
    recent: { icon: CloudUpload, title: "Rien de récent", sub: "Vos fichiers récents apparaîtront ici." },
    trash: { icon: Trash2, title: "Corbeille vide", sub: "Les éléments supprimés apparaissent ici." },
  };
  const c = config[searching ? "search" : view];
  return (
    <div className="h-[60vh] grid place-items-center">
      <div className="text-center max-w-sm">
        <div className="size-20 rounded-3xl bg-white/5 grid place-items-center mx-auto mb-5">
          <c.icon className="size-9 text-muted" />
        </div>
        <h3 className="text-lg font-semibold">{c.title}</h3>
        <p className="text-muted mt-1">{c.sub}</p>
      </div>
    </div>
  );
}
