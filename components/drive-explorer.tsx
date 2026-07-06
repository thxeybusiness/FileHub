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
  Plus,
  X,
  CloudUpload,
  Loader2,
  FileText,
  Table2,
  BarChart3,
  ChevronDown,
  Users,
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

type View = "my" | "starred" | "recent" | "trash";
type UploadTask = { id: string; name: string; progress: number; error?: boolean };

export function DriveExplorer({
  view,
  folderId = null,
  breadcrumb = [],
  title,
  spaceId = null,
  basePath = "/drive",
  spaceName,
}: {
  view: View;
  folderId?: string | null;
  breadcrumb?: { id: string; name: string }[];
  title: string;
  spaceId?: string | null;
  basePath?: string;
  spaceName?: string;
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
  const [chartMenu, setChartMenu] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
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
  const open = (n: SerializedNode) => {
    if (n.type === "folder") router.push(`${basePath}/folder/${n.id}`);
    else if (n.type === "doc") router.push(`/drive/doc/${n.id}`);
    else if (n.type === "sheet") router.push(`/drive/sheet/${n.id}`);
    else if (n.type === "chart") router.push(`/drive/chart/${n.id}`);
    else setPreview(n);
  };

  const createDoc = async () => {
    const { node } = await api.createDoc("Document sans titre", folderId, spaceId);
    router.push(`/drive/doc/${node.id}`);
  };

  const createSheet = async () => {
    const { node } = await api.createSheet("Feuille sans titre", folderId, spaceId);
    router.push(`/drive/sheet/${node.id}`);
  };

  const createChart = async (type: ChartType = "bar") => {
    const { node } = await api.createChart("Graphique sans titre", folderId, spaceId);
    await api.saveChart(node.id, { content: defaultChartDoc(type) });
    router.push(`/drive/chart/${node.id}`);
  };

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
    if (!confirm(`Supprimer définitivement « ${n.name} » ? Cette action est irréversible.`)) return;
    await api.remove(n.id);
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
    if (!confirm("Vider la corbeille ? Tous les éléments seront définitivement supprimés.")) return;
    await api.emptyTrash();
    load();
    notifyRefresh();
  };

  const menuItems = useMemo(() => {
    if (!menu) return [];
    const n = menu.node;
    if (view === "trash") {
      return [
        { icon: RotateCcw, label: "Restaurer", fn: () => restore(n) },
        { icon: Trash2, label: "Supprimer définitivement", fn: () => deleteForever(n), danger: true },
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
      <header className="h-16 shrink-0 border-b border-white/10 px-6 flex items-center gap-4 bg-white/[0.03] backdrop-blur-xl">
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

        {spaceId && (
          <button
            onClick={() => setMembersOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm font-medium hover:bg-white/10 transition"
            title="Gérer les membres"
          >
            <Users className="size-4 text-brand-300" /> Membres
          </button>
        )}

        {/* Search */}
        <div className="relative w-full max-w-xs">
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
              <button
                onClick={() => fileInput.current?.click()}
                className="group relative h-10 overflow-hidden rounded-xl bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 flex items-center gap-2"
              >
                <span className="relative z-10 flex items-center gap-2"><Plus className="size-4" /> Importer</span>
                <span className="absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent" style={{ animation: "shine 3.5s ease-in-out infinite" }} />
              </button>
              <button
                onClick={createDoc}
                className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition"
              >
                <FileText className="size-4 text-brand-300" /> Document
              </button>
              <button
                onClick={createSheet}
                className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition"
              >
                <Table2 className="size-4 text-emerald-400" /> Feuille de calcul
              </button>

              {/* Bouton scindé Graphique + flèche (propose 3 types) */}
              <div className="relative flex items-center">
                <button
                  onClick={() => createChart("bar")}
                  className="h-10 pl-4 pr-3 rounded-l-xl border border-white/10 bg-white/5 text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition"
                >
                  <BarChart3 className="size-4 text-amber-400" /> Graphique
                </button>
                <button
                  onClick={() => setChartMenu((v) => !v)}
                  className="h-10 px-2 rounded-r-xl border border-l-0 border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="Choisir un type"
                >
                  <ChevronDown className={cn("size-4 text-muted transition", chartMenu && "rotate-180")} />
                </button>
                {chartMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setChartMenu(false)} />
                    <div className="absolute left-0 top-12 z-40 w-52 rounded-xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl p-1.5 shadow-2xl animate-in">
                      <p className="px-2.5 pt-1.5 pb-1 text-[10px] uppercase tracking-wider text-muted">Créer un graphique</p>
                      {QUICK_CHART_TYPES.map((qt) => {
                        const meta = CHART_TYPES.find((t) => t.id === qt)!;
                        return (
                          <button
                            key={qt}
                            onClick={() => {
                              setChartMenu(false);
                              createChart(qt);
                            }}
                            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-sm text-left text-white/80 hover:bg-white/5 transition"
                          >
                            <BarChart3 className="size-4 text-amber-400" />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setNewFolder(true)}
                className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition"
              >
                <FolderPlus className="size-4" /> Nouveau dossier
              </button>
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
              onClick={emptyTrash}
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
          <EmptyState view={view} searching={searching} onUpload={() => fileInput.current?.click()} canUpload={canUpload} />
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
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
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
      <div className="grid grid-cols-[1fr_140px_120px_40px] gap-4 px-4 h-11 items-center text-xs font-medium text-muted border-b border-white/10">
        <span>Nom</span>
        <span>Modifié</span>
        <span>Taille</span>
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
            "grid grid-cols-[1fr_140px_120px_40px] gap-4 px-4 h-14 items-center cursor-pointer border-b border-line last:border-0 transition",
            selected === n.id ? "bg-brand-500/10" : "hover:bg-white/5",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <NodeIcon type={n.type} mimeType={n.mimeType} name={n.name} color={n.color} size={22} className="shrink-0" />
            <span className="text-sm font-medium truncate">{n.name}</span>
            {n.starred && <Star className="size-3.5 fill-yellow-400 text-yellow-400 shrink-0" />}
          </div>
          <span className="text-sm text-muted">{formatRelative(n.updatedAt)}</span>
          <span className="text-sm text-muted">{n.type === "folder" ? "—" : formatBytes(n.size)}</span>
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
  onUpload,
  canUpload,
}: {
  view: View;
  searching: boolean;
  onUpload: () => void;
  canUpload: boolean;
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
        {canUpload && view === "my" && !searching && (
          <button
            onClick={onUpload}
            className="mt-5 h-10 px-5 rounded-xl bg-brand-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand-700"
          >
            <Plus className="size-4" /> Importer des fichiers
          </button>
        )}
      </div>
    </div>
  );
}
