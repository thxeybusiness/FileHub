"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, X, Loader2, Send, Trash2 } from "lucide-react";

type Comment = { id: string; authorId: string; authorName: string | null; body: string; createdAt: string };

import { api } from "@/lib/api";

function relTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
const initials = (s: string) => { const p = s.trim().replace(/^@/, "").split(/\s+/).filter(Boolean); return !p.length ? "?" : (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase(); };
const avatarColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return `hsl(${h} 55% 55%)`; };

// Surligne les mentions @pseudo dans le corps du commentaire.
function renderBody(body: string) {
  return body.split(/(@[a-zA-Z0-9_-]{3,30})/g).map((part, i) =>
    part.startsWith("@") ? <span key={i} className="font-semibold text-brand-300">{part}</span> : <span key={i}>{part}</span>,
  );
}

export function CommentsPanel({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [me, setMe] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useEffect(() => {
    if (!open) return;
    setLoading(true); setError(null);
    api.listComments(id).then((r) => { setComments(r.comments); setMe(r.me); }).catch(() => setError("Impossible de charger les commentaires.")).finally(() => setLoading(false));
  }, [open, id]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [comments]);

  const send = async () => {
    const b = draft.trim();
    if (!b || busy) return;
    setBusy(true); setError(null);
    try {
      const { comment } = await api.addComment(id, b);
      setComments((c) => [...c, comment]);
      setDraft("");
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  const remove = async (commentId: string) => {
    try { await api.deleteComment(id, commentId); setComments((c) => c.filter((x) => x.id !== commentId)); } catch { /* ignore */ }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[85] flex justify-end bg-black/50 backdrop-blur-sm" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="flex h-full w-full max-w-sm flex-col border-l border-white/12 bg-[#0f1017] shadow-2xl" style={{ animation: "revealUp 0.2s both" }}>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
          <MessageSquare className="size-4 text-brand-300" />
          <span className="text-sm font-semibold">Commentaires</span>
          {comments.length > 0 && <span className="rounded-full bg-white/5 px-1.5 text-[11px] text-muted">{comments.length}</span>}
          <button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-auto p-4">
          {loading ? (
            <div className="grid h-24 place-items-center text-muted"><Loader2 className="size-5 animate-spin" /></div>
          ) : comments.length === 0 ? (
            <div className="grid h-32 place-items-center text-center text-sm text-muted"><div><MessageSquare className="mx-auto mb-2 size-6 opacity-60" />Aucun commentaire.<br />Lancez la discussion — mentionnez avec @pseudo.</div></div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="group/c flex gap-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: avatarColor(c.authorName || "?") }}>{initials(c.authorName || "?")}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs"><span className="font-semibold">{c.authorName || "Anonyme"}</span><span className="text-muted">{relTime(c.createdAt)}</span>
                    {c.authorId === me && <button onClick={() => remove(c.id)} className="ml-auto opacity-0 group-hover/c:opacity-100 text-muted hover:text-red-400"><Trash2 className="size-3.5" /></button>}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/85">{renderBody(c.body)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {error && <p className="mx-4 mb-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">{error}</p>}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
              rows={2}
              placeholder="Écrire un commentaire… (@pseudo pour mentionner)"
              className="min-h-[42px] max-h-32 flex-1 resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-400/40 placeholder:text-white/25"
            />
            <button onClick={send} disabled={busy || !draft.trim()} className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 disabled:opacity-50">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          <p className="mt-1 px-1 text-[10px] text-muted">⌘/Ctrl + Entrée pour envoyer</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
