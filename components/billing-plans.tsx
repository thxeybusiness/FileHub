"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Loader2, Crown, CreditCard, Home, Gem } from "lucide-react";
import { PLANS, type PlanId } from "@/lib/plans";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  currentPlan: PlanId;
  planStatus: string | null;
  renewsAt: string | null;
  hasSubscription: boolean;
  founder?: boolean;
};

export function BillingPlans({ currentPlan, planStatus, renewsAt, hasSubscription, founder }: Props) {
  const params = useSearchParams();
  const [busy, setBusy] = useState<null | "checkout" | "portal">(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<null | "success" | "canceled">(null);

  useEffect(() => {
    if (params.get("success")) setBanner("success");
    else if (params.get("canceled")) setBanner("canceled");
  }, [params]);

  const upgrade = async () => {
    setBusy("checkout");
    setError(null);
    try {
      const { url } = await api.startCheckout();
      if (url) window.location.href = url;
      else setError("Paiement indisponible pour le moment.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const manage = async () => {
    setBusy("portal");
    setError(null);
    try {
      const { url } = await api.openBillingPortal();
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const isPremium = currentPlan === "premium";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link
          href="/drive"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition"
          title="Retour"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Crown className="size-5 text-amber-300" />
          <h1 className="text-xl font-bold">Abonnement</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-8">
        {founder ? (
          <div className="mx-auto w-full max-w-lg">
            <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-500/10 via-pink-500/5 to-transparent p-8 text-center">
              <div
                className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-40 blur-3xl"
                style={{ background: "radial-gradient(circle, #f59e0b66, transparent 70%)" }}
              />
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#f472b6] shadow-lg shadow-amber-500/30">
                <Gem className="size-8 text-white" />
              </span>
              <h2 className="mt-5 text-2xl font-bold">Compte Fondateur</h2>
              <p className="mt-2 text-muted">
                Merci d&apos;avoir créé FileHub. Ce compte bénéficie d&apos;un accès
                <span className="text-amber-200 font-semibold"> illimité à vie</span>.
              </p>
              <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
                {[
                  "Stockage illimité",
                  "Espaces partagés illimités",
                  "Tous les éditeurs, sans aucune limite",
                  "Toutes les fonctionnalités à venir incluses",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-amber-300" />
                    <span className="text-white/85">{f}</span>
                  </li>
                ))}
              </ul>
              <span className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-white/5 px-3 py-1 text-xs font-semibold text-amber-200">
                <Gem className="size-3.5" /> Aucun paiement — à vie
              </span>
            </div>
          </div>
        ) : (
        <div className="mx-auto w-full max-w-3xl">
          {banner === "success" && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm animate-in">
              <Check className="size-5 text-emerald-400 shrink-0" />
              <span>Bienvenue chez Pro ! Votre stockage a été augmenté à 250 Go.</span>
            </div>
          )}
          {banner === "canceled" && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted animate-in">
              Paiement annulé — vous pouvez réessayer quand vous voulez.
            </div>
          )}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 animate-in">
              {error}
            </div>
          )}

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Choisissez votre formule</h2>
            <p className="text-muted mt-1">
              Passez à Pro pour 250 Go de stockage et des espaces illimités.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.values(PLANS)).map((plan) => {
              const active = currentPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-3xl border p-6 transition",
                    plan.highlight
                      ? "border-brand-400/40 bg-gradient-to-b from-[#3b6dff]/10 to-transparent"
                      : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] px-3 py-1 text-[11px] font-semibold text-white shadow-lg shadow-blue-500/30">
                      Recommandé
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    {plan.id === "premium" ? (
                      <Sparkles className="size-5 text-brand-300" />
                    ) : (
                      <Home className="size-5 text-muted" />
                    )}
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {active && (
                      <span className="ml-auto rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/80">
                        Plan actuel
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.priceLabel}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{plan.storageLabel} de stockage</p>

                  <ul className="mt-5 space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="size-4 shrink-0 mt-0.5 text-emerald-400" />
                        <span className="text-white/85">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    {plan.id === "free" ? (
                      <div className="h-11 grid place-items-center rounded-xl border border-white/10 text-sm text-muted">
                        {isPremium ? "Inclus dans Pro" : "Votre formule actuelle"}
                      </div>
                    ) : active ? (
                      <button
                        onClick={manage}
                        disabled={busy !== null || !hasSubscription}
                        className="h-11 w-full rounded-xl border border-white/15 bg-white/5 text-sm font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {busy === "portal" ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                        Gérer mon abonnement
                      </button>
                    ) : (
                      <button
                        onClick={upgrade}
                        disabled={busy !== null}
                        className="group relative h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {busy === "checkout" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                        Passer à Pro
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent" style={{ animation: "shine 3.5s ease-in-out infinite" }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isPremium && (
            <p className="mt-6 text-center text-xs text-muted">
              {planStatus === "active"
                ? renewsAt
                  ? `Votre abonnement se renouvelle le ${new Date(renewsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.`
                  : "Abonnement actif."
                : planStatus === "past_due"
                  ? "Paiement en attente — mettez à jour votre moyen de paiement."
                  : "Abonnement en cours de mise à jour."}
            </p>
          )}

          <p className="mt-8 text-center text-xs text-muted">
            Paiement sécurisé par Stripe. Résiliable à tout moment.
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
