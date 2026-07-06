"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cloud,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  UploadCloud,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { AuroraBackground } from "./aurora-bg";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      ...(mode === "signup" ? { name: String(form.get("name") ?? "") } : {}),
    };
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Une erreur est survenue.");
        setPending(false);
        return;
      }
      router.push("/drive");
      router.refresh();
    } catch {
      setError("Connexion impossible. Réessayez.");
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#07070c] text-white antialiased">
      <AuroraBackground />

      {/* Top bar : retour à l'accueil */}
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
            <Cloud className="size-5" />
          </span>
          <span className="text-lg">
            File<span className="text-white/60">'</span>Hub
          </span>
        </Link>
        <Link
          href="/"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur transition hover:text-white"
        >
          <ArrowLeft className="size-4" /> Accueil
        </Link>
      </header>

      {/* Carte centrale */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md" style={{ animation: "revealUp 0.7s both" }}>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-white/70"
              style={{ animation: "revealUp 0.7s 0.05s both" }}
            >
              <ShieldCheck className="size-3.5 text-emerald-300" />
              {mode === "login" ? "Content de vous revoir" : "15 Go offerts, sans carte"}
            </div>

            <h1
              className="text-3xl font-bold leading-tight tracking-tight"
              style={{ animation: "revealUp 0.75s 0.1s both" }}
            >
              {mode === "login" ? (
                <>
                  Bon{" "}
                  <span className="bg-gradient-to-r from-[#5b8bff] via-[#a78bff] to-[#22d3ee] bg-clip-text italic text-transparent" style={{ backgroundSize: "200% auto", animation: "gradientPan 5s linear infinite" }}>
                    retour
                  </span>
                </>
              ) : (
                <>
                  Créez votre{" "}
                  <span className="bg-gradient-to-r from-[#5b8bff] via-[#a78bff] to-[#22d3ee] bg-clip-text italic text-transparent" style={{ backgroundSize: "200% auto", animation: "gradientPan 5s linear infinite" }}>
                    espace
                  </span>
                </>
              )}
            </h1>
            <p className="mt-2 text-white/55" style={{ animation: "revealUp 0.8s 0.15s both" }}>
              {mode === "login"
                ? "Connectez-vous pour accéder à vos fichiers."
                : "Quelques secondes et c'est parti."}
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4" style={{ animation: "revealUp 0.85s 0.2s both" }}>
              {mode === "signup" && (
                <Field label="Nom" name="name" type="text" placeholder="Votre nom" autoComplete="name" />
              )}
              <Field label="Email" name="email" type="email" placeholder="vous@exemple.com" autoComplete="email" required />

              <label className="block">
                <span className="text-sm font-medium text-white/80">Mot de passe</span>
                <div className="relative mt-1.5">
                  <input
                    name="password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-11 text-white outline-none transition placeholder:text-white/30 focus:border-[#5b8bff] focus:bg-white/[0.07] focus:ring-2 focus:ring-[#3b6dff]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-white/40 transition hover:text-white/80"
                    aria-label={showPw ? "Masquer" : "Afficher"}
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-[#07070c] transition hover:scale-[1.01] disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Se connecter" : "Créer mon compte"}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/50" style={{ animation: "revealUp 0.9s 0.25s both" }}>
              {mode === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <Link href="/signup" className="font-medium text-white transition hover:text-cyan-300">
                    Inscrivez-vous
                  </Link>
                </>
              ) : (
                <>
                  Déjà inscrit ?{" "}
                  <Link href="/login" className="font-medium text-white transition hover:text-cyan-300">
                    Connectez-vous
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* mini réassurance sous la carte */}
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-white/40" style={{ animation: "revealUp 1s 0.3s both" }}>
            <span className="inline-flex items-center gap-1.5"><UploadCloud className="size-3.5" /> Glisser-déposer</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" /> Aperçu instantané</span>
            <span className="inline-flex items-center gap-1.5"><Share2 className="size-3.5" /> Partage sécurisé</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white/80">{label}</span>
      <input
        {...props}
        className="mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-[#5b8bff] focus:bg-white/[0.07] focus:ring-2 focus:ring-[#3b6dff]/30"
      />
    </label>
  );
}
