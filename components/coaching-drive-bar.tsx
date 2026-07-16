"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartHandshake, Target, Users } from "lucide-react";
import { CoachingMembersDialog } from "./coaching-members-dialog";

const ACCENT = "#06b6d4";

// Barre de contexte au-dessus du drive d'un coaché : accès à la Fiche et aux
// Membres. Le reste (dossiers, documents, import) est géré par le DriveExplorer.
export function CoachingDriveBar({ id }: { id: string }) {
  const [membersOpen, setMembersOpen] = useState(false);
  return (
    <div className="h-12 shrink-0 border-b border-white/10 bg-cyan-500/[0.04] px-4 sm:px-6 flex items-center gap-2">
      {membersOpen && <CoachingMembersDialog id={id} onClose={() => setMembersOpen(false)} />}
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
        <button
          onClick={() => setMembersOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-white"
        >
          <Users className="size-3.5" /> Membres
        </button>
      </div>
    </div>
  );
}
