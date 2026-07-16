"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Home, ChevronRight, HeartHandshake, Users, Menu, Loader2, Plus,
  CalendarClock, BookOpen, FileText, Briefcase, Trash2, Target, ArrowUpRight,
} from "lucide-react";
import { api, notifyRefresh, type CoachingDocMeta } from "@/lib/api";
import { CoachingMembersDialog } from "./coaching-members-dialog";

const ACCENT = "#06b6d4";

const STATUS: Record<string, { l: string; color: string }> = {
  prospect: { l: "Prospect", color: "#a78bff" },
  active: { l: "Actif", color: "#22c55e" },
  paused: { l: "En pause", color: "#f59e0b" },
  done: { l: "Terminé", color: "#64748b" },
};

const CATEGORIES = [
  { key: "seances", label: "Séances", desc: "Comptes-rendus de séance", icon: CalendarClock, color: "#06b6d4" },
  { key: "ressources", label: "Ressources", desc: "Exercices, lectures, supports", icon: BookOpen, color: "#a78bff" },
  { key: "documents", label: "Documents", desc: "Notes et documents divers", icon: FileText, color: "#3b82f6" },
  { key: "admin", label: "Administratif", desc: "Contrats, factures, suivi", icon: Briefcase, color: "#f59e0b" },
] as const;

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function CoachingWorkspace({
  id, coacheeName, coachingName, status, canEdit,
}: {
  id: string; coacheeName: string; coachingName: string; status: string; canEdit: boolean;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState<CoachingDocMeta[] | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(() => {
    api.listCoachingDocs(id).then((r) => setDocs(r.docs)).catch(() => setDocs([]));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const title = coacheeName || coachingName || "Coaché";
  const sm = STATUS[status] ?? STATUS.active;

  const addDoc = async (category: string) => {
    setCreating(category);
    try {
      const { doc } = await api.createCoachingDoc(id, category, "Sans titre");
      notifyRefresh();
      router.push(`/drive/coaching/${id}/doc/${doc.id}`);
    } catch {
      setCreating(null);
    }
  };

  const removeDoc = async (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDocs((prev) => (prev ? prev.filter((d) => d.id !== docId) : prev));
    await api.deleteCoachingDoc(id, docId).catch(() => load());
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {membersOpen && <CoachingMembersDialog id={id} onClose={() => setMembersOpen(false)} />}

      {/* Header */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden"
          title="Menu"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/drive/accompagnement" className="hidden sm:grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Tous les coachés">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" /><ChevronRight className="size-3" /><span>Accompagnement</span>
          </div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="size-4 shrink-0" style={{ color: ACCENT }} />
            <span className="truncate text-base font-semibold">{title}</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: sm.color + "26", color: sm.color }}>
              <span className="size-1.5 rounded-full" style={{ background: sm.color }} />{sm.l}
            </span>
          </div>
        </div>
        <button onClick={() => setMembersOpen(true)} title="Membres du suivi" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
          <Users className="size-5" />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">

          {/* Fiche du coaché (épinglée) */}
          <Link
            href={`/drive/coaching/${id}/fiche`}
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-500/[0.06] p-5 transition hover:border-cyan-400/30"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}>
              <Target className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Fiche du coaché</p>
              <p className="text-xs text-muted">Profil, objectifs, séances, actions et notes de suivi</p>
            </div>
            <ArrowUpRight className="size-5 shrink-0 text-muted transition group-hover:text-cyan-300" />
          </Link>

          {/* Rubriques */}
          {docs === null ? (
            <div className="flex items-center justify-center py-16 text-muted"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            CATEGORIES.map((cat) => {
              const items = docs.filter((d) => d.category === cat.key);
              return (
                <section key={cat.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: cat.color + "22", color: cat.color }}>
                      <cat.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold leading-tight">{cat.label} {items.length > 0 && <span className="ml-1 text-xs font-normal text-muted">· {items.length}</span>}</h2>
                      <p className="hidden sm:block text-[11px] text-muted">{cat.desc}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => addDoc(cat.key)}
                        disabled={creating === cat.key}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white shadow disabled:opacity-60"
                        style={{ background: `linear-gradient(90deg, ${cat.color}, #3b82f6)` }}
                      >
                        {creating === cat.key ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Ajouter
                      </button>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-muted">
                      {canEdit ? "Aucun document. Cliquez sur « Ajouter »." : "Aucun document."}
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((d) => (
                        <Link
                          key={d.id}
                          href={`/drive/coaching/${id}/doc/${d.id}`}
                          className="group relative flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.05]"
                        >
                          <cat.icon className="size-4 shrink-0" style={{ color: cat.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{d.title || "Sans titre"}</p>
                            <p className="text-[11px] text-muted">{fmtWhen(d.updatedAt)}</p>
                          </div>
                          {canEdit && (
                            <span
                              onClick={(e) => removeDoc(e, d.id)}
                              className="grid size-6 shrink-0 place-items-center rounded-md text-muted opacity-0 transition hover:bg-white/5 hover:text-red-400 group-hover:opacity-100"
                              title="Supprimer"
                            >
                              <Trash2 className="size-3.5" />
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
