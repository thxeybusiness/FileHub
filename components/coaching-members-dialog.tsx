"use client";

import { useEffect, useState } from "react";
import { X, UserPlus, Loader2, Crown, Trash2, HeartHandshake } from "lucide-react";
import { api, type CoachingMemberInfo } from "@/lib/api";

const ACCENT = "#06b6d4";

export function CoachingMembersDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [myRole, setMyRole] = useState<string>("viewer");
  const [members, setMembers] = useState<CoachingMemberInfo[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canInvite = isOwner || myRole === "editor";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    api
      .getCoachingMembers(id)
      .then((s) => {
        setIsOwner(s.isOwner);
        setMyRole(s.myRole);
        setMembers(s.members);
      })
      .catch(() => setError("Impossible de charger les membres."))
      .finally(() => setLoading(false));
  }, [id]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const ident = identifier.trim();
    if (!ident) return;
    setInviting(true);
    setError(null);
    setNotice(null);
    try {
      const { member } = await api.inviteCoachingMember(id, ident, inviteRole);
      setMembers((m) => [...m, member]);
      setIdentifier("");
      setNotice(`${member.username ? "@" + member.username : member.email} a été ajouté au suivi.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(memberUserId: string, role: "editor" | "viewer") {
    setMembers((m) => m.map((x) => (x.id === memberUserId ? { ...x, role } : x)));
    await api.updateCoachingMemberRole(id, memberUserId, role).catch(() => {});
  }

  async function remove(memberUserId: string) {
    setMembers((m) => m.filter((x) => x.id !== memberUserId));
    await api.removeCoachingMember(id, memberUserId).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <HeartHandshake className="size-5" style={{ color: ACCENT }} />
          <h3 className="text-lg font-semibold">Membres du suivi</h3>
          <button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted mb-5">
          Ajoutez la personne accompagnée (ou un collègue) par{" "}
          <span className="text-white/80">nom d'utilisateur</span> ou email. Elle retrouvera le suivi
          dans son propre espace « Accompagnement ».
        </p>

        {/* Invitation (propriétaire / éditeur uniquement) */}
        {canInvite && (
          <>
            <form onSubmit={invite} className="flex flex-wrap gap-2">
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="@nomdutilisateur ou email"
                className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.07]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                className="h-11 rounded-xl border border-white/10 bg-white/5 px-2 text-sm text-white outline-none focus:border-white/25"
              >
                <option value="editor" className="bg-[#0f1017]">Éditeur</option>
                <option value="viewer" className="bg-[#0f1017]">Lecteur</option>
              </select>
              <button
                type="submit"
                disabled={inviting || !identifier.trim()}
                className="flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}
              >
                {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Ajouter
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            {notice && <p className="mt-2 text-sm text-emerald-400">{notice}</p>}
          </>
        )}

        {/* Liste */}
        <div className="mt-5 space-y-1.5 max-h-72 overflow-auto">
          {loading ? (
            <div className="grid h-20 place-items-center text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, #3b82f6)` }}>
                  {(m.name || m.username || m.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium truncate">
                    {m.name || m.username || m.email.split("@")[0]}
                    {m.isMe && <span className="text-xs text-muted">(vous)</span>}
                  </p>
                  <p className="text-xs text-muted truncate">{m.username ? `@${m.username}` : m.email}</p>
                </div>
                {m.isOwner ? (
                  <span className="flex items-center gap-1 text-xs text-amber-400 shrink-0">
                    <Crown className="size-3.5" /> Coach
                  </span>
                ) : isOwner ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={m.role === "viewer" ? "viewer" : "editor"}
                      onChange={(e) => changeRole(m.id, e.target.value as "editor" | "viewer")}
                      className="h-8 rounded-lg border border-white/10 bg-white/5 px-1.5 text-xs text-white outline-none focus:border-white/25"
                    >
                      <option value="editor" className="bg-[#0f1017]">Éditeur</option>
                      <option value="viewer" className="bg-[#0f1017]">Lecteur</option>
                    </select>
                    <button onClick={() => remove(m.id)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400" title="Retirer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted shrink-0">{m.role === "viewer" ? "Lecteur" : "Éditeur"}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
