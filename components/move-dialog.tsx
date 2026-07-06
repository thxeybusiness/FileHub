"use client";

import { useEffect, useState } from "react";
import { X, Folder, ChevronRight, Home, Loader2, FolderInput } from "lucide-react";
import type { SerializedNode } from "@/lib/nodes";
import { api } from "@/lib/api";

export function MoveDialog({
  node,
  onClose,
  onMoved,
}: {
  node: SerializedNode;
  onClose: () => void;
  onMoved: (destId: string | null) => void;
}) {
  const [current, setCurrent] = useState<string | null>(null);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Mon Drive" },
  ]);
  const [folders, setFolders] = useState<SerializedNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .list({ view: "my", parent: current })
      .then((r) => setFolders(r.nodes.filter((n) => n.type === "folder" && n.id !== node.id)))
      .finally(() => setLoading(false));
  }, [current, node.id]);

  const enter = (f: SerializedNode) => {
    setCurrent(f.id);
    setPath((p) => [...p, { id: f.id, name: f.name }]);
  };
  const jump = (idx: number) => {
    setPath((p) => p.slice(0, idx + 1));
    setCurrent(path[idx].id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 animate-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <FolderInput className="size-5 text-brand-600" />
          <h3 className="text-lg font-semibold">Déplacer « {node.name} »</h3>
          <button onClick={onClose} className="ml-auto size-8 grid place-items-center rounded-lg hover:bg-white/5 text-muted">
            <X className="size-4" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted mb-3 flex-wrap">
          {path.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" />}
              <button
                onClick={() => jump(i)}
                className="flex items-center gap-1 hover:text-ink px-1.5 py-0.5 rounded"
              >
                {i === 0 && <Home className="size-3.5" />}
                {c.name}
              </button>
            </span>
          ))}
        </div>

        {/* Folder list */}
        <div className="h-64 overflow-auto rounded-xl border border-line divide-y divide-line">
          {loading ? (
            <div className="h-full grid place-items-center text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : folders.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted">
              Aucun sous-dossier ici.
            </div>
          ) : (
            folders.map((f) => (
              <button
                key={f.id}
                onClick={() => enter(f)}
                className="w-full flex items-center gap-3 px-4 h-12 hover:bg-white/5 text-left"
              >
                <Folder className="size-5 text-amber-500" fill="#f59e0b" fillOpacity={0.15} />
                <span className="flex-1 truncate text-sm">{f.name}</span>
                <ChevronRight className="size-4 text-muted" />
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-line text-sm font-medium hover:bg-white/5">
            Annuler
          </button>
          <button
            onClick={() => onMoved(current)}
            disabled={current === node.parentId}
            className="h-10 px-5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            Déplacer ici
          </button>
        </div>
      </div>
    </div>
  );
}
