"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartHandshake, Target, Users, Trash2, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { api, notifyRefresh } from "@/lib/api";
import { CoachingMembersDialog } from "./coaching-members-dialog";

const ACCENT = "#06b6d4";

// Barre de contexte au-dessus du drive d'un coaché : accès à la Fiche, aux
// Membres, et suppression complète du coaché. Le reste (dossiers, documents,
// import) est géré par le DriveExplorer.
export function CoachingDriveBar({ id }: { id: string }) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function del() {
    setDeleting(true);
    try {
      await api.deleteCoaching(id);
      notifyRefresh();
      router.push("/drive/accompagnement");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="h-12 shrink-0 border-b border-white/10 bg-cyan-500/[0.04] px-4 sm:px-6 flex items-center gap-2">
      {membersOpen && <CoachingMembersDialog id={id} onClose={() => setMembersOpen(false)} />}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => !deleting && setConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1017]/95 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-400"><AlertTriangle className="size-4" /></span>
              <div>
                <h3 className="text-sm font-semibold">Supprimer ce coaché ?</h3>
                <p className="mt-1 text-sm text-muted">La fiche, son drive et tous ses documents seront définitivement supprimés. Cette action est irréversible.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={del} disabled={deleting} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Supprimer
              </button>
              <button onClick={() => setConfirm(false)} disabled={deleting} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted hover:bg-white/5">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <HeartHandshake className="size-4 shrink-0" style={{ color: ACCENT }} />
      <span className="hidden sm:inline text-xs text-muted">Espace du coaché</span>
      <div className="ml-auto flex items-center gap-1.5">
        <Link
          href={`/drive/coaching/${id}/fiche`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white shadow"
          style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}
        >
          <Target className="size-3.5" /> Fiche du coaché
        </Link>
        <Link
          href={`/drive/coaching/${id}/portail`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white"
        >
          <Sparkles className="size-3.5" /> Portail
        </Link>
        <button
          onClick={() => setMembersOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white"
        >
          <Users className="size-3.5" /> Membres
        </button>
        <button
          onClick={() => setConfirm(true)}
          title="Supprimer ce coaché"
          className="grid size-8 place-items-center rounded-lg border border-white/10 text-muted transition hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
