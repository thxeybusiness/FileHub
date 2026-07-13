"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Loader2, Check, Building2, Crown, Users, Home } from "lucide-react";
import { api } from "@/lib/api";

const PLAN_OPTIONS: { id: "free" | "team" | "premium" | "business"; label: string; icon: typeof Home }[] = [
  { id: "free", label: "Basic", icon: Home },
  { id: "team", label: "Team", icon: Users },
  { id: "premium", label: "Pro", icon: Crown },
  { id: "business", label: "Business", icon: Building2 },
];

export function AdminGrades({ initialEmail = "", initialPlan = "business" }: { initialEmail?: string; initialPlan?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [plan, setPlan] = useState<"free" | "team" | "premium" | "business">(
    (["free", "team", "premium", "business"].includes(initialPlan) ? initialPlan : "business") as "business",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const apply = async () => {
    const e = email.trim();
    if (!e || busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const r = await api.adminSetPlan(e, plan);
      setOk(`${r.user.name || r.user.email} : ${r.previousPlan} → ${r.user.plan}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href="/drive" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-amber-300" />
          <h1 className="text-xl font-bold">Admin — Grades</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-8">
        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-muted">
              Attribuez un grade à n&apos;importe quel compte FileHub (par e-mail). Réservé au compte Fondateur.
            </p>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-muted">E-mail du compte</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
              type="email"
              placeholder="exemple@gmail.com"
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-amber-400/40"
            />

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">Grade</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLAN_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setPlan(o.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm transition ${plan === o.id ? "border-amber-400/50 bg-amber-500/10 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}
                >
                  <o.icon className={`size-5 ${plan === o.id ? "text-amber-300" : ""}`} />
                  {o.label}
                </button>
              ))}
            </div>

            {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            {ok && (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                <Check className="size-4 shrink-0" /> {ok}
              </p>
            )}

            <button
              onClick={apply}
              disabled={busy || !email.trim()}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#f472b6] text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:shadow-amber-500/40 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Appliquer le grade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
