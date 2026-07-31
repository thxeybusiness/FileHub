"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Settings, User, AtSign, Check, Loader2, Lock, Mail, ShieldCheck, LogOut, Star, Activity, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

export function SettingsPanel({
  initialName, initialUsername, email, plan,
}: {
  initialName: string; initialUsername: string; email: string; plan: string;
}) {
  const router = useRouter();
  // Ouverte depuis l'Accompagnement ? Le retour revient dans ce SaaS, pas FileHub.
  const fromAccompagnement = useSearchParams().get("from") === "accompagnement";
  const backHref = fromAccompagnement ? "/drive/accompagnement" : "/drive";
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [savingP, setSavingP] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };

  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveProfile = async () => {
    setSavingP(true); setProfileMsg(null);
    try {
      await api.updateProfile({ name: name.trim(), username: username.trim() });
      setProfileMsg({ ok: true, text: "Profil mis à jour." });
    } catch (e) {
      setProfileMsg({ ok: false, text: (e as Error).message });
    } finally { setSavingP(false); }
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (next !== confirm) { setPwMsg({ ok: false, text: "Les mots de passe ne correspondent pas." }); return; }
    setSavingPw(true);
    try {
      await api.changePassword(cur, next);
      setPwMsg({ ok: true, text: "Mot de passe modifié." });
      setCur(""); setNext(""); setConfirm("");
    } catch (e) {
      setPwMsg({ ok: false, text: (e as Error).message });
    } finally { setSavingPw(false); }
  };

  const planLabel: Record<string, string> = { founder: "Fondateur", business: "Business", premium: "Pro", team: "Team", free: "Basic" };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Settings className="size-5 text-brand-300" />
          <h1 className="text-xl font-bold">Paramètres</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-8">
        <div className="mx-auto w-full max-w-lg space-y-6">
          {/* Raccourcis FileHub : Favoris & Activité (masqués dans l'Accompagnement) */}
          {!fromAccompagnement && (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href="/drive/starred" className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: "#f59e0b1f", color: "#f59e0b" }}><Star className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Favoris</p>
                <p className="text-xs text-muted">Vos éléments épinglés</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/drive/activite" className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: "#3b6dff1f", color: "#7aa2ff" }}><Activity className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Activité</p>
                <p className="text-xs text-muted">Historique des actions</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5" />
            </Link>
          </section>
          )}

          {/* Compte */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-lg font-bold text-white">
                {(name || email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm text-muted"><Mail className="size-3.5" /> {email}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                  <ShieldCheck className="size-3 text-amber-300" /> Grade {planLabel[plan] ?? plan}
                </span>
              </div>
            </div>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-muted">Nom affiché</label>
            <div className="relative mt-1.5">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm outline-none focus:border-brand-400/40" />
            </div>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">Identifiant public</label>
            <div className="relative mt-1.5">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="pseudo" className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm outline-none focus:border-brand-400/40" />
            </div>
            <p className="mt-1 text-[11px] text-muted">Sert à vous inviter dans les espaces partagés.</p>

            {profileMsg && (
              <p className={`mt-3 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm ${profileMsg.ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>
                {profileMsg.ok && <Check className="size-4" />} {profileMsg.text}
              </p>
            )}
            <button onClick={saveProfile} disabled={savingP} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 disabled:opacity-50">
              {savingP ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Enregistrer le profil
            </button>
          </section>

          {/* Mot de passe */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><Lock className="size-4 text-brand-300" /> Changer le mot de passe</div>
            <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Mot de passe actuel" className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-brand-400/40" />
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nouveau mot de passe (8 caractères min.)" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-brand-400/40" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer le nouveau mot de passe" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-brand-400/40" />
            {pwMsg && (
              <p className={`mt-3 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm ${pwMsg.ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>
                {pwMsg.ok && <Check className="size-4" />} {pwMsg.text}
              </p>
            )}
            <button onClick={savePassword} disabled={savingPw || !cur || !next} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-50">
              {savingPw ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Mettre à jour le mot de passe
            </button>
          </section>

          {/* Session */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><LogOut className="size-4 text-red-400" /> Session</div>
            <p className="mb-4 text-xs text-muted">Se déconnecter de votre compte sur cet appareil.</p>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} Se déconnecter
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
