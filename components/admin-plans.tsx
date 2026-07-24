"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Sparkles, Loader2, Home, Building2, Gift, Gem,
  Tag, X, Copy, Percent, ShieldCheck,
} from "lucide-react";
import { PLANS, type PlanId } from "@/lib/plans";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }) + " €";

type PaidPlan = "premium" | "business";

// Interface classique d'abonnement, réservée au Fondateur : prix, avantages,
// paiement — et sous chaque formule payante, deux « boutons magiques » :
//   • Offrir le grade (gratuitement, par e-mail)
//   • Vendre à -60 % (génère un code promo à remettre à certaines personnes)
export function AdminPlans() {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [gift, setGift] = useState<PaidPlan | null>(null);
  const [sell, setSell] = useState<PaidPlan | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href="/drive" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Gem className="size-5 text-amber-300" />
          <h1 className="text-xl font-bold">Abonnements — Fondateur</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-100/90">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <span>
              Vue réservée au Fondateur. Sous chaque formule, <span className="font-semibold text-amber-200">offrez</span> le
              grade gratuitement ou générez un code <span className="font-semibold text-amber-200">-60 %</span> à remettre à certaines personnes.
            </span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Les formules FileHub</h2>
            <p className="text-muted mt-1">Prix, avantages et paiement — plus vos actions Fondateur.</p>
          </div>

          {/* Bascule mensuel / annuel */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
              {(["month", "year"] as const).map((it) => (
                <button
                  key={it}
                  onClick={() => setInterval(it)}
                  className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition", interval === it ? "bg-white/10 text-white shadow" : "text-muted hover:text-white")}
                >
                  {it === "month" ? "Mensuel" : "Annuel"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {Object.values(PLANS).map((plan) => {
              const isBusiness = plan.id === "business";
              const paid = plan.id !== "free";
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-3xl border p-6 transition",
                    isBusiness
                      ? "border-amber-400/40 bg-gradient-to-b from-[#f59e0b]/10 to-transparent"
                      : plan.highlight
                        ? "border-brand-400/40 bg-gradient-to-b from-[#3b6dff]/10 to-transparent"
                        : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] px-3 py-1 text-[11px] font-semibold text-white shadow-lg shadow-blue-500/30">Recommandé</span>
                  )}
                  {isBusiness && (
                    <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f472b6] px-3 py-1 text-[11px] font-semibold text-white shadow-lg shadow-amber-500/30">Le plus complet</span>
                  )}
                  <div className="flex items-center gap-2">
                    {plan.id === "business" ? <Building2 className="size-5 text-amber-300" /> : plan.id === "premium" ? <Sparkles className="size-5 text-brand-300" /> : <Home className="size-5 text-muted" />}
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                  </div>
                  <div className="mt-3 min-h-[3.25rem]">
                    {plan.priceMonthly === 0 ? (
                      <span className="text-3xl font-bold">0 €</span>
                    ) : interval === "year" && plan.priceYearly ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{euro(plan.priceYearly)}</span>
                          <span className="text-sm text-muted">/ an</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">soit {euro(plan.priceYearly / 12)} / mois</p>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{euro(plan.priceMonthly)}</span>
                        <span className="text-sm text-muted">/ mois</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">{plan.storageLabel} de stockage</p>

                  <ul className="mt-5 space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className={cn("size-4 shrink-0 mt-0.5", isBusiness ? "text-amber-300" : "text-emerald-400")} />
                        <span className="text-white/85">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Boutons magiques Fondateur (formules payantes uniquement) */}
                  {paid ? (
                    <div className="mt-6 space-y-2">
                      <button
                        onClick={() => setGift(plan.id as PaidPlan)}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15"
                      >
                        <Gift className="size-4" /> Offrir ce grade
                      </button>
                      <button
                        onClick={() => setSell(plan.id as PaidPlan)}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-pink-500/10 text-sm font-semibold text-amber-200 transition hover:from-amber-500/25 hover:to-pink-500/15"
                      >
                        <Tag className="size-4" /> Vendre à -60 %
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 h-10 grid place-items-center rounded-xl border border-white/10 text-xs text-muted">
                      Formule gratuite
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-xs text-muted">
            « Offrir » attribue le grade immédiatement à un compte FileHub existant. « Vendre à -60 % » génère un code promo
            Stripe : la personne paie 60 % moins cher sur la page d'abonnement.
          </p>
        </div>
      </div>

      {gift && <GiftModal plan={gift} onClose={() => setGift(null)} />}
      {sell && <SellModal plan={sell} interval={interval} onClose={() => setSell(null)} />}
    </div>
  );
}

// ── Modale « Offrir ce grade » ──
function GiftModal({ plan, onClose }: { plan: PaidPlan; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const name = PLANS[plan].name;

  const submit = async () => {
    const e = email.trim();
    if (!e || busy) return;
    setBusy(true); setError(null); setOk(null);
    try {
      const r = await api.adminSetPlan(e, plan);
      setOk(`${r.user.name || r.user.email} : ${r.previousPlan} → ${r.user.plan}.`);
      setEmail("");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} icon={<Gift className="size-4 text-emerald-300" />} title={`Offrir le grade ${name}`}>
      <p className="text-sm text-muted">Attribue gratuitement le grade <span className="font-semibold text-white">{name}</span> à un compte FileHub existant.</p>
      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">E-mail du bénéficiaire</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        type="email"
        autoFocus
        placeholder="exemple@gmail.com"
        className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-emerald-400/40"
      />
      {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      {ok && <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"><Check className="size-4 shrink-0" /> {ok}</p>}
      <button
        onClick={submit}
        disabled={busy || !email.trim()}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />} Offrir le grade
      </button>
    </Modal>
  );
}

// ── Modale « Vendre à -60 % » ──
function SellModal({ plan, interval, onClose }: { plan: PaidPlan; interval: "month" | "year"; onClose: () => void }) {
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; basePrice: number; discountedPrice: number; maxRedemptions: number | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const name = PLANS[plan].name;

  const generate = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await api.adminDiscountCode(plan, interval, maxRedemptions);
      setResult({ code: r.code, basePrice: r.basePrice, discountedPrice: r.discountedPrice, maxRedemptions: r.maxRedemptions });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard?.writeText(result.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };

  return (
    <Modal onClose={onClose} icon={<Percent className="size-4 text-amber-300" />} title={`Vendre ${name} à -60 %`}>
      {!result ? (
        <>
          <p className="text-sm text-muted">
            Génère un code promo <span className="font-semibold text-amber-200">-60 %</span> sur la formule
            <span className="font-semibold text-white"> {name}</span> ({interval === "year" ? "annuel" : "mensuel"}). La personne
            l'utilise sur la page d'abonnement pour payer 60 % moins cher.
          </p>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">Nombre de personnes (utilisations du code)</label>
          <input
            type="number" min={1} max={1000}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
            className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-amber-400/40"
          />
          {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <button
            onClick={generate}
            disabled={busy}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#f472b6] text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Tag className="size-4" />} Générer le code -60 %
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Code prêt ! Transmettez-le à la personne — elle l'entre lors du paiement.</p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
            <code className="flex-1 select-all text-lg font-bold tracking-wider text-amber-200">{result.code}</code>
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/10">
              {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />} {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <div className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted">Prix normal</span><span className="line-through text-muted">{euro(result.basePrice)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Avec le code -60 %</span><span className="font-bold text-emerald-300">{euro(result.discountedPrice)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Utilisations</span><span className="text-white/85">{result.maxRedemptions ?? "Illimité"}</span></div>
          </div>
          <button onClick={onClose} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10">
            Terminé
          </button>
        </>
      )}
    </Modal>
  );
}

function Modal({ icon, title, children, onClose }: { icon: React.ReactNode; title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="ml-auto grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
