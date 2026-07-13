"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { History, X, Loader2, RotateCcw, Check, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

type Version = { id: string; authorName: string | null; size: number; createdAt: string };

function relTime(iso: string): string {
  const d = new Date(iso);
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function VersionHistory({
  id, open, onClose, onRestore,
}: {
  id: string; open: boolean; onClose: () => void; onRestore: (content: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<Version[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useEffect(() => {
    if (!open) return;
    setLoading(true); setError(null); setRestored(null);
    api.listVersions(id).then((r) => setVersions(r.versions)).catch(() => setError("Impossible de charger l'historique.")).finally(() => setLoading(false));
  }, [open, id]);

  const restore = async (versionId: string) => {
    setBusy(versionId); setError(null);
    try {
      const { content } = await api.restoreVersion(id, versionId);
      onRestore(content);
      setRestored(versionId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/12 bg-[#0f1017] shadow-2xl shadow-black/60" style={{ animation: "revealUp 0.2s both" }}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
          <History className="size-4 text-brand-300" />
          <span className="text-sm font-semibold">Historique des versions</span>
          <button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">
          {loading ? (
            <div className="grid h-24 place-items-center text-muted"><Loader2 className="size-5 animate-spin" /></div>
          ) : error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
          ) : versions.length === 0 ? (
            <div className="grid h-28 place-items-center text-center text-sm text-muted">
              <div><Clock className="mx-auto mb-2 size-6 opacity-60" />Aucune version enregistrée pour le moment.<br />Les versions se créent au fil de vos modifications.</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {versions.map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[11px] font-bold text-muted">{versions.length - i}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{relTime(v.createdAt)}{i === 0 && <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">actuelle</span>}</p>
                    <p className="truncate text-[11px] text-muted">{v.authorName || "Anonyme"} · {formatBytes(v.size)}</p>
                  </div>
                  {restored === v.id ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300"><Check className="size-3.5" /> Restaurée</span>
                  ) : (
                    <button onClick={() => restore(v.id)} disabled={busy !== null} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-semibold hover:bg-white/10 transition disabled:opacity-50">
                      {busy === v.id ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} Restaurer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
