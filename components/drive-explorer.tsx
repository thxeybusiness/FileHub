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
} from "lucide-react";
import type { SerializedNode } from "@/lib/nodes";
import { api, notifyRefresh } from "@/lib/api";
import { cn, formatBytes, formatRelative } from "@/lib/utils";
import { NodeIcon } from "./file-icon";
import { categoryOf } from "@/lib/filetypes";
import { PreviewModal } from "./preview-modal";
import { ShareDialog } from "./share-dialog";
import { MoveDialog } from "./move-dialog";
import { NameDialog } from "./name-dialog";

type View = "my" | "starred" | "recent" | "trash";
type UploadTask = { id: string; name: string; progress: number; error?: boolean };

export function DriveExplorer({
  view,
  folderId = null,
  breadcrumb = [],
  title,
}: {
  view: View;
  folderId?: string | null;
  breadcrumb?: { id: string; name: string }[];
  title: string;
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
      const p = q ? api.list({ q }) : api.list({ view, parent: folderId });
      p.then((r) => setNodes(r.nodes))
        .catch(() => setNodes([]))
        .finally(() => setLoading(false));
    },
    [view, folderId],
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
    [folderId, load],
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
    if (n.type === "folder") router.push(`/drive/folder/${n.id}`);
    else setPreview(n);
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
    await api.createFolder(name, folderId);
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
      <header className="h-16 shrink-0 border-b border-line px-6 flex items-center gap-4 bg-surface">
        <div className="min-w-0 flex-1">
          {view === "my" && breadcrumb.length > 0 ? (
            <nav className="flex items-center gap-1 text-sm">
              <button onClick={() => router.push("/drive")} className="flex items-center gap-1 text-muted hover:text-ink px-1.5 py-1 rounded">
                <Home className="size-4" /> Mon Drive
              </button>
              {breadcrumb.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1 min-w-0">
                  <ChevronRight className="size-3.5 text-muted shrink-0" />
                  <button
                    onClick={() => router.push(`/drive/folder/${c.id}`)}
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
            <h1 className="text-xl font-bold truncate">{title}</h1>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-canvas border border-transparent focus:border-brand-300 focus:bg-white outline-none text-sm transition"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 size-6 grid place-items-center rounded-md hover:bg-line text-muted">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-canvas rounded-xl p-1">
          <button
            onClick={() => setMode("grid")}
            className={cn("size-8 grid place-items-center rounded-lg", mode === "grid" ? "bg-white shadow-sm text-brand-600" : "text-muted")}
            title="Grille"
          >
            <LayoutGrid className="size-[18px]" />
          </button>
          <button
            onClick={() => setMode("list")}
            className={cn("size-8 grid place-items-center rounded-lg", mode === "list" ? "bg-white shadow-sm text-brand-600" : "text-muted")}
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
                className="h-10 px-4 rounded-xl bg-brand-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-brand-700 shadow-sm transition"
              >
                <Plus className="size-4" /> Importer
              </button>
              <button
                onClick={() => setNewFolder(true)}
                className="h-10 px-4 rounded-xl border border-line bg-white text-sm font-medium flex items-center gap-2 hover:bg-canvas transition"
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
              className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium flex items-center gap-2 hover:bg-red-50 transition"
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
          <div className="bg-white rounded-3xl shadow-2xl px-10 py-8 flex flex-col items-center gap-3 border-2 border-dashed border-brand-400">
            <CloudUpload className="size-12 text-brand-600" />
            <p className="text-lg font-semibold">Déposez pour importer</p>
          </div>
        </div>
      )}

      {/* Upload progress dock */}
      {uploads.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 w-80 bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center gap-2 text-sm font-semibold">
            <Upload className="size-4 text-brand-600" />
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
          className="fixed z-50 w-56 bg-surface rounded-xl shadow-2xl border border-line py-1.5 animate-in"
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
                "w-full flex items-center gap-3 px-4 h-10 text-sm text-left hover:bg-canvas transition",
                (item as { danger?: boolean }).danger && "text-red-600 hover:bg-red-50",
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
      {nodes.map((n) => {
        const cat = categoryOf(n.mimeType, n.name);
        const showThumb = cat === "image";
        return (
          <div
            key={n.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(n.id);
            }}
            onDoubleClick={() => onOpen(n)}
            onContextMenu={(e) => onMenu(e, n)}
            className={cn(
              "group relative rounded-2xl border bg-surface p-3 cursor-pointer transition hover:shadow-md",
              selected === n.id ? "border-brand-400 ring-2 ring-brand-100" : "border-line",
            )}
          >
            <div className="aspect-[4/3] rounded-xl bg-canvas grid place-items-center overflow-hidden mb-2.5">
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
                "absolute top-2 left-2 size-7 grid place-items-center rounded-lg bg-white/90 shadow-sm transition",
                n.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              title="Favori"
            >
              <Star className={cn("size-4", n.starred ? "fill-yellow-400 text-yellow-400" : "text-muted")} />
            </button>
            <button
              onClick={(e) => onMenu(e, n)}
              className="absolute top-2 right-2 size-7 grid place-items-center rounded-lg bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition text-muted"
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
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="grid grid-cols-[1fr_140px_120px_40px] gap-4 px-4 h-11 items-center text-xs font-medium text-muted border-b border-line">
        <span>Nom</span>
        <span>Modifié</span>
        <span>Taille</span>
        <span></span>
      </div>
      {nodes.map((n) => (
        <div
          key={n.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(n.id);
          }}
          onDoubleClick={() => onOpen(n)}
          onContextMenu={(e) => onMenu(e, n)}
          className={cn(
            "grid grid-cols-[1fr_140px_120px_40px] gap-4 px-4 h-14 items-center cursor-pointer border-b border-line last:border-0 transition",
            selected === n.id ? "bg-brand-50" : "hover:bg-canvas",
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
            className="size-8 grid place-items-center rounded-lg hover:bg-line text-muted"
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
        <div className="size-20 rounded-3xl bg-canvas grid place-items-center mx-auto mb-5">
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
