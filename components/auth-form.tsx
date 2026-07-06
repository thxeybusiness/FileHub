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
  Search,
  Star,
  Trash2,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  Check,
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#07070c] text-white antialiased">
      <AuroraBackground />

      {/* barre du haut */}
      <header className="relative z-20 mx-auto flex h-16 w-full max-w-7xl items-center px-5 sm:px-8">
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

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* ── VITRINE (gauche) ─────────────────────────────── */}
        <section className="hidden flex-col justify-center lg:flex" style={{ animation: "revealUp 0.8s both" }}>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/70">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Votre Drive nouvelle génération
          </div>

          <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tight">
            Tout votre univers,
            <br />
            <span
              className="bg-gradient-to-r from-[#5b8bff] via-[#a78bff] to-[#22d3ee] bg-clip-text italic text-transparent"
              style={{ backgroundSize: "200% auto", animation: "gradientPan 5s linear infinite" }}
            >
              au même endroit.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/55">
            Stockez, organisez, prévisualisez et partagez. Rejoignez FileHub et
            reprenez le contrôle de vos fichiers.
          </p>

          {/* mock drive flottant */}
          <div className="mt-10" style={{ animation: "floaty 8s ease-in-out infinite" }}>
            <MiniDrive />
          </div>

          {/* features + stats */}
          <ul className="mt-9 grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              { i: UploadCloud, t: "Import glisser-déposer" },
              { i: Eye, t: "Aperçu instantané" },
              { i: FolderTree, t: "Dossiers imbriqués" },
              { i: Share2, t: "Partage par lien" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-2.5 text-sm text-white/70">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/5">
                  <f.i className="size-3.5 text-cyan-300" />
                </span>
                {f.t}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-8 border-t border-white/10 pt-6">
            {[
              { n: "15 Go", l: "offerts" },
              { n: "100+", l: "types de fichiers" },
              { n: "99%", l: "de disponibilité" },
            ].map((s) => (
              <div key={s.l}>
                <div className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-2xl font-bold text-transparent">{s.n}</div>
                <div className="text-xs text-white/45">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FORMULAIRE (droite) ──────────────────────────── */}
        <section className="mx-auto w-full max-w-md lg:mx-0 lg:ml-auto" style={{ animation: "revealUp 0.8s 0.1s both" }}>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-white/70">
              <Check className="size-3.5 text-emerald-300" />
              {mode === "login" ? "Content de vous revoir" : "15 Go offerts, sans carte"}
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
              {mode === "signup" && <Field label="Nom" name="name" type="text" placeholder="Votre nom" autoComplete="name" />}
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

          {/* réassurance mobile (la vitrine est masquée en petit écran) */}
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-white/40 lg:hidden">
            <span className="inline-flex items-center gap-1.5"><UploadCloud className="size-3.5" /> Glisser-déposer</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" /> Aperçu</span>
            <span className="inline-flex items-center gap-1.5"><Share2 className="size-3.5" /> Partage</span>
          </div>
        </section>
      </div>
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

/* mini aperçu du Drive pour la vitrine */
function MiniDrive() {
  const files = [
    { icon: FileImage, name: "vue-montagne.jpg", color: "#ec4899" },
    { icon: Folder, name: "Projets", color: "#f59e0b" },
    { icon: FileText, name: "rapport.pdf", color: "#ef4444" },
    { icon: FileVideo, name: "demo.mp4", color: "#8b5cf6" },
    { icon: Folder, name: "Design", color: "#f59e0b" },
    { icon: FileText, name: "notes.md", color: "#64748b" },
  ];
  return (
    <div className="max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14]/90 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex h-6 flex-1 items-center gap-2 rounded-md bg-white/5 px-2.5 text-[11px] text-white/40">
          <Search className="size-3" /> Rechercher…
        </div>
        <Star className="size-3.5 text-white/30" />
        <Trash2 className="size-3.5 text-white/30" />
      </div>
      <div className="grid grid-cols-3 gap-2.5 p-3.5">
        {files.map((f, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
            <div className="mb-1.5 grid aspect-[4/3] place-items-center rounded-md" style={{ background: `${f.color}1a` }}>
              <f.icon className="size-5" style={{ color: f.color }} />
            </div>
            <div className="truncate text-[11px] text-white/70">{f.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
