"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Gift, Check, Loader2, HardDrive, Users, Send, Trash2, Info } from "lucide-react";
import { TEAM_PLAN } from "@/lib/plans";
import { api } from "@/lib/api";

type Gifted = { id: string; email: string; name: string | null };

export function TeamGradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canGift, setCanGift] = useState(false);
  const [max, setMax] = useState(2);
  const [gifts, setGifts] = useState<Gifted[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setOk(null);
    api
      .teamGifts()
      .then((r) => {
        setCanGift(r.canGift);
        setMax(r.max);
        setGifts(r.gifts);
      })
      .catch(() => setCanGift(false))
      .finally(() => setLoading(false));
  }, [open]);

  const grant = async () => {
    const e = email.trim();
    if (!e || busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { recipient } = await api.giftTeam(e);
      setGifts((g) => [...g, recipient]);
      setEmail("");
      setOk(`Grade Partner offert à ${recipient.name || recipient.email}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api.revokeTeam(id);
      setGifts((g) => g.filter((x) => x.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!open || !mounted) return null;
  const remaining = max - gifts.length;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-auto bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/25 bg-[#0f1017] shadow-2xl shadow-black/60"
        style={{ animation: "revealUp 0.2s both" }}
      >
        {/* En-tête */}
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-amber-500/15 via-pink-500/10 to-transparent px-5 py-4">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle,#f59e0b66,transparent 70%)" }} />
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#f472b6] shadow-lg shadow-amber-500/30">
              <Gift className="size-5 text-white" />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Grade {TEAM_PLAN.name}</h2>
              <p className="text-xs text-amber-200/90">Offert · non achetable</p>
            </div>
            <button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto p-5">
          <p className="text-sm text-muted">
            Un membre <span className="font-semibold text-amber-200">Business</span> peut offrir le grade Partner à
            <span className="font-semibold text-white"> {max} personnes</span>. Il reprend le grade Basic, avec plus d&apos;espace.
          </p>

          {/* Avantages */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <HardDrive className="size-4 text-amber-300" />
              <p className="mt-1.5 text-lg font-bold">{TEAM_PLAN.storageLabel}</p>
              <p className="text-[11px] text-muted">de stockage</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <Users className="size-4 text-amber-300" />
              <p className="mt-1.5 text-lg font-bold">{TEAM_PLAN.spaces} espaces</p>
              <p className="text-[11px] text-muted">partagés</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {TEAM_PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <span className="text-white/85">{f}</span>
              </li>
            ))}
          </ul>

          {/* Section « offrir » */}
          <div className="mt-5 border-t border-white/10 pt-4">
            {loading ? (
              <div className="grid h-16 place-items-center text-muted"><Loader2 className="size-5 animate-spin" /></div>
            ) : canGift ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Offrir le grade Partner</span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">{gifts.length}/{max} offerts</span>
                </div>

                {remaining > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={inputRef}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") grant(); }}
                      type="email"
                      placeholder="e-mail du bénéficiaire"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-amber-400/40"
                    />
                    <button
                      onClick={grant}
                      disabled={busy || !email.trim()}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#f472b6] px-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:shadow-amber-500/40 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Offrir
                    </button>
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted">Vous avez offert tous vos grades Partner.</p>
                )}

                {error && <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
                {ok && <p className="mt-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{ok}</p>}

                {gifts.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {gifts.map((g) => (
                      <div key={g.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-pink-500 text-[11px] font-bold text-white">
                          {(g.name || g.email).charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{g.name || g.email}</p>
                          {g.name && <p className="truncate text-[11px] text-muted">{g.email}</p>}
                        </div>
                        <button onClick={() => revoke(g.id)} disabled={busy} title="Retirer le grade" className="grid size-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-muted">
                <Info className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <span>Ce grade est réservé : seuls les membres <span className="font-semibold text-amber-200">Business</span> peuvent l&apos;offrir, à {max} personnes.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
