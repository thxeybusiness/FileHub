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
  FolderTree,
  Star,
  Check,
  FileImage,
  FileText,
  Folder,
  FileVideo,
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
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      ...(mode === "signup"
        ? { name: [firstName, lastName].filter(Boolean).join(" ") }
        : {}),
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
    <div className="relative min-h-screen overflow-hidden bg-[#07070c] text-white antialiased">
      <AuroraBackground />

      {/* barre du haut */}
      <header className="relative z-20 mx-auto flex h-16 w-full max-w-7xl items-center px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
            <Cloud className="size-5" />
          </span>
          <span className="text-lg">
            FileHub
          </span>
        </Link>
        <Link
          href="/"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur transition hover:text-white"
        >
          <ArrowLeft className="size-4" /> Accueil
        </Link>
      </header>

      {/* Zone centrale : carte au milieu, éléments qui l'entourent */}
      <main className="relative z-10 grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-10">
        <div className="relative w-full max-w-md">
          {/* ── éléments flottants autour (masqués en petit écran) ── */}
          <div className="pointer-events-none absolute inset-0 hidden xl:block">
            {/* haut-gauche : fichier image */}
            <FloatCard className="-left-64 -top-14" delay={0}>
              <FileMini icon={FileImage} name="vue-montagne.jpg" meta="2,4 Mo" color="#ec4899" />
            </FloatCard>
            {/* haut-droite : pilule fonctionnalité */}
            <FloatPill className="-right-56 -top-8" delay={1.2} icon={UploadCloud} text="Glisser-déposer" tint="#5b8bff" />
            {/* milieu-gauche : stat */}
            <FloatCard className="-left-72 top-1/2 -translate-y-1/2" delay={0.6}>
              <StatMini value="1 Go" label="offert, sans carte" />
            </FloatCard>
            {/* milieu-droite : lien de partage */}
            <FloatPill className="-right-64 top-[46%]" delay={1.8} icon={Share2} text="Partage par lien" tint="#a78bff" />
            {/* bas-gauche : pilule */}
            <FloatPill className="-left-52 -bottom-10" delay={2.2} icon={FolderTree} text="Dossiers imbriqués" tint="#22d3ee" />
            {/* bas-droite : fichier dossier */}
            <FloatCard className="-right-60 -bottom-16" delay={0.9}>
              <FileMini icon={Folder} name="Projets" meta="12 éléments" color="#f59e0b" />
            </FloatCard>
            {/* petites icônes satellites */}
            <FloatCard className="left-1/4 -top-24" delay={1.5}>
              <IconBubble icon={Eye} tint="#22d3ee" />
            </FloatCard>
            <FloatCard className="right-1/4 -bottom-24" delay={0.4}>
              <IconBubble icon={Star} tint="#fbbf24" />
            </FloatCard>
            <FloatCard className="-left-24 -bottom-24" delay={1.1}>
              <IconBubble icon={FileVideo} tint="#8b5cf6" />
            </FloatCard>
            <FloatCard className="-right-24 -top-24" delay={1.9}>
              <IconBubble icon={FileText} tint="#ef4444" />
            </FloatCard>
          </div>

          {/* halo derrière la carte */}
          <div
            className="pointer-events-none absolute -inset-10 -z-0 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, #3b6dff44, transparent 65%)", animation: "pulseGlow 6s ease-in-out infinite" }}
          />

          {/* ── LA CARTE D'INSCRIPTION ── */}
          <div
            className="relative z-10 rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10"
            style={{ animation: "revealUp 0.7s both" }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-white/70">
              <Check className="size-3.5 text-emerald-300" />
              {mode === "login" ? "Content de vous revoir" : "1 Go offert, sans carte"}
            </div>

            <h2 className="text-3xl font-bold leading-tight tracking-tight">
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
            </h2>
            <p className="mt-2 text-white/55">
              {mode === "login" ? "Connectez-vous pour accéder à vos fichiers." : "Quelques secondes et c'est parti."}
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom" name="firstName" type="text" placeholder="Jean" autoComplete="given-name" />
                  <Field label="Nom" name="lastName" type="text" placeholder="Dupont" autoComplete="family-name" />
                </div>
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
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>
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

            <p className="mt-6 text-center text-sm text-white/50">
              {mode === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <Link href="/signup" className="font-medium text-white transition hover:text-cyan-300">Inscrivez-vous</Link>
                </>
              ) : (
                <>
                  Déjà inscrit ?{" "}
                  <Link href="/login" className="font-medium text-white transition hover:text-cyan-300">Connectez-vous</Link>
                </>
              )}
            </p>
          </div>

          {/* réassurance mobile (les satellites sont masqués en petit écran) */}
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-white/40 xl:hidden">
            <span className="inline-flex items-center gap-1.5"><UploadCloud className="size-3.5" /> Glisser-déposer</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" /> Aperçu</span>
            <span className="inline-flex items-center gap-1.5"><Share2 className="size-3.5" /> Partage</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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

/* ── éléments flottants ── */

function FloatCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`absolute ${className}`} style={{ animation: `floaty ${6 + delay}s ease-in-out ${delay}s infinite` }}>
      {children}
    </div>
  );
}

function FloatPill({ className = "", delay = 0, icon: Icon, text, tint }: { className?: string; delay?: number; icon: typeof UploadCloud; text: string; tint: string }) {
  return (
    <div className={`absolute ${className}`} style={{ animation: `floaty ${6 + delay}s ease-in-out ${delay}s infinite` }}>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0c0c14]/85 px-4 py-2.5 text-sm text-white/80 shadow-xl shadow-black/40 backdrop-blur">
        <span className="grid size-6 place-items-center rounded-lg" style={{ background: `${tint}26` }}>
          <Icon className="size-3.5" style={{ color: tint }} />
        </span>
        {text}
      </div>
    </div>
  );
}

function FileMini({ icon: Icon, name, meta, color }: { icon: typeof FileImage; name: string; meta: string; color: string }) {
  return (
    <div className="w-40 rounded-2xl border border-white/10 bg-[#0c0c14]/85 p-3 shadow-xl shadow-black/40 backdrop-blur">
      <div className="mb-2 grid aspect-[4/3] place-items-center rounded-xl" style={{ background: `${color}1a` }}>
        <Icon className="size-8" style={{ color }} />
      </div>
      <div className="truncate text-xs font-medium text-white/80">{name}</div>
      <div className="text-[10px] text-white/40">{meta}</div>
    </div>
  );
}

function StatMini({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0c14]/85 px-5 py-4 text-center shadow-xl shadow-black/40 backdrop-blur">
      <div className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-2xl font-bold text-transparent">{value}</div>
      <div className="mt-0.5 text-[11px] text-white/45">{label}</div>
    </div>
  );
}

function IconBubble({ icon: Icon, tint }: { icon: typeof Eye; tint: string }) {
  return (
    <div className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-[#0c0c14]/80 shadow-lg shadow-black/40 backdrop-blur">
      <Icon className="size-5" style={{ color: tint }} />
    </div>
  );
}
