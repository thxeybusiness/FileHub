"use client";

import { useEffect, useState } from "react";
import { X, UserPlus, Loader2, Crown, Trash2, Users } from "lucide-react";
import { api, notifyRefresh, type SpaceMemberInfo } from "@/lib/api";

export function MembersDialog({
  spaceId,
  onClose,
}: {
  spaceId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<SpaceMemberInfo[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSpace(spaceId)
      .then((s) => {
        setIsOwner(s.isOwner);
        setMembers(s.members);
      })
      .catch(() => setError("Impossible de charger l'espace."))
      .finally(() => setLoading(false));
  }, [spaceId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) return;
    setInviting(true);
    setError(null);
    setNotice(null);
    try {
      const { member } = await api.inviteMember(spaceId, id);
      setMembers((m) => [...m, member]);
      setIdentifier("");
      setNotice(`${member.username ? "@" + member.username : member.email} a rejoint l'espace.`);
      notifyRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function remove(userId: string) {
    setMembers((m) => m.filter((x) => x.id !== userId));
    await api.removeMember(spaceId, userId).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <Users className="size-5 text-brand-300" />
          <h3 className="text-lg font-semibold">Membres de l'espace</h3>
          <button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted mb-5">
          Invitez par <span className="text-white/80">nom d'utilisateur</span> ou email. Les membres
          accèdent à tous les fichiers de l'espace.
        </p>

        {/* Invitation */}
        <form onSubmit={invite} className="flex gap-2">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="@nomdutilisateur ou email"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400 focus:bg-white/[0.07]"
          />
          <button
            type="submit"
            disabled={inviting || !identifier.trim()}
            className="flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Inviter
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {notice && <p className="mt-2 text-sm text-emerald-400">{notice}</p>}

        {/* Liste */}
        <div className="mt-5 space-y-1.5 max-h-72 overflow-auto">
          {loading ? (
            <div className="grid h-20 place-items-center text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-semibold text-white">
                  {(m.name || m.username || m.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium truncate">
                    {m.name || m.username || m.email.split("@")[0]}
                    {m.isMe && <span className="text-xs text-muted">(vous)</span>}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {m.username ? `@${m.username}` : m.email}
                  </p>
                </div>
                {m.isOwner ? (
                  <span className="flex items-center gap-1 text-xs text-amber-400">
                    <Crown className="size-3.5" /> Propriétaire
                  </span>
                ) : isOwner ? (
                  <button
                    onClick={() => remove(m.id)}
                    className="grid size-8 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400"
                    title="Retirer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : (
                  <span className="text-xs text-muted">Membre</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
