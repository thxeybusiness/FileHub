"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  ArrowRight,
  UploadCloud,
  FolderTree,
  Eye,
  Share2,
  ShieldCheck,
  Trash2,
  Search,
  Sparkles,
  Star,
  FileText,
  FileImage,
  FileVideo,
  Folder,
  Lock,
  Zap,
} from "lucide-react";

/* Reveal-on-scroll wrapper */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* Count-up number */
function Counter({ to, suffix = "", duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(eased * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref}>
      {val.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

export function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Subtle mouse parallax on the hero mock
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rx = (e.clientX / window.innerWidth - 0.5) * 10;
      const ry = (e.clientY / window.innerHeight - 0.5) * 10;
      el.style.transform = `perspective(1400px) rotateY(${rx}deg) rotateX(${-ry}deg)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07070c] text-white antialiased">
      {/* Ambient aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="aurora-blob absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, #2a4bff88, transparent 60%)", animation: "aurora 18s ease-in-out infinite" }}
        />
        <div
          className="aurora-blob absolute top-1/3 -right-40 h-[38rem] w-[38rem] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, #7b3bff77, transparent 60%)", animation: "aurora 22s ease-in-out infinite reverse" }}
        />
        <div
          className="aurora-blob absolute bottom-0 left-1/4 h-[34rem] w-[34rem] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle, #14e0e066, transparent 60%)", animation: "aurora 26s ease-in-out infinite" }}
        />
        {/* fine grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <StarField />
      </div>

      {/* NAV */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "backdrop-blur-xl bg-[#07070c]/70 border-b border-white/10" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
              <Cloud className="size-5" />
            </span>
            <span className="text-lg">FileHub</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#features" className="transition hover:text-white">Fonctionnalités</a>
            <a href="#preview" className="transition hover:text-white">Aperçu</a>
            <a href="#security" className="transition hover:text-white">Sécurité</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-white/70 transition hover:text-white sm:block">
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="group relative overflow-hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#07070c] transition hover:shadow-lg hover:shadow-white/20"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Commencer <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/70 backdrop-blur"
            style={{ animation: "revealUp 0.8s both" }}
          >
            <Sparkles className="size-3.5 text-cyan-300" />
            Votre Drive nouvelle génération
          </div>

          <h1
            className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
            style={{ animation: "revealUp 0.9s 0.05s both" }}
          >
            Vos fichiers,{" "}
            <span
              className="bg-gradient-to-r from-[#5b8bff] via-[#a78bff] to-[#22d3ee] bg-clip-text italic text-transparent"
              style={{ backgroundSize: "200% auto", animation: "gradientPan 5s linear infinite" }}
            >
              enfin
            </span>{" "}
            au bon endroit.
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl text-lg text-white/60"
            style={{ animation: "revealUp 1s 0.15s both" }}
          >
            Stockez, organisez, prévisualisez et partagez — dans une interface rapide et
            élégante. Le confort d'un grand Drive, sans l'usine à gaz.
          </p>

          <div
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animation: "revealUp 1.1s 0.25s both" }}
          >
            <Link
              href="/signup"
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-7 py-3.5 font-semibold text-[#07070c] shadow-xl shadow-blue-500/10 transition hover:scale-[1.02] sm:w-auto"
            >
              <span className="relative z-10 flex items-center gap-2">
                Commencer gratuitement
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-transparent via-black/5 to-transparent" style={{ animation: "shine 3.5s ease-in-out infinite" }} />
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 font-medium text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
            >
              Se connecter
            </Link>
          </div>

          <p className="mt-5 text-xs text-white/40" style={{ animation: "revealUp 1.2s 0.35s both" }}>
            15 Go offerts · Aucune carte requise · Prêt en 30 secondes
          </p>
        </div>

        {/* Floating app mock */}
        <div className="mt-20 [perspective:1400px]">
          <div ref={heroRef} className="transition-transform duration-300 ease-out will-change-transform">
            <div style={{ animation: "floatySlow 7s ease-in-out infinite" }}>
              <MockDrive />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="grid grid-cols-2 gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur md:grid-cols-4">
          {[
            { n: 15, s: " Go", l: "offerts gratuitement" },
            { n: 100, s: "+", l: "types de fichiers gérés" },
            { n: 99, s: "%", l: "de disponibilité" },
            { n: 30, s: "s", l: "pour démarrer" },
          ].map((stat, i) => (
            <Reveal key={i} delay={i * 80} className="text-center">
              <div className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
                <Counter to={stat.n} suffix={stat.s} />
              </div>
              <div className="mt-1 text-sm text-white/50">{stat.l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* MARQUEE */}
      <section className="relative overflow-hidden py-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#07070c] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#07070c] to-transparent" />
        <div className="flex w-max gap-4" style={{ animation: "marquee 28s linear infinite" }}>
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i} className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-sm text-white/50">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300/80">Fonctionnalités</span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Tout ce qu'un Drive devrait faire.</h2>
          <p className="mt-4 text-white/55">Et rien de superflu. Chaque détail pensé pour vous faire gagner du temps.</p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 90}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]">
                <div
                  className="absolute -right-16 -top-16 size-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `radial-gradient(circle, ${f.glow}, transparent 70%)` }}
                />
                <div className="relative">
                  <div
                    className="mb-5 grid size-12 place-items-center rounded-2xl border border-white/10"
                    style={{ background: `linear-gradient(135deg, ${f.glow}33, transparent)` }}
                  >
                    <f.icon className="size-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PREVIEW SHOWCASE */}
      <section id="preview" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300/80">Aperçu instantané</span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Voyez vos fichiers,
              <br />
              <span className="text-white/50">sans les télécharger.</span>
            </h2>
            <p className="mt-5 max-w-md text-white/55">
              Images, vidéos, PDF, texte, code… tout s'ouvre en un clic dans un aperçu
              plein écran. Glissez-déposez pour importer, étoilez vos favoris, partagez
              par lien sécurisé.
            </p>
            <ul className="mt-7 space-y-3">
              {["Glisser-déposer multi-fichiers", "Aperçu image · vidéo · PDF · code", "Partage par lien en un clic", "Corbeille avec restauration"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-white/70">
                  <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-[#3b6dff] to-[#22d3ee]">
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="white" strokeWidth="3.5"><path d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[#07070c] transition hover:scale-[1.02]">
              Essayer maintenant <ArrowRight className="size-4" />
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <div style={{ animation: "floaty 8s ease-in-out infinite" }}>
              <MockPreview />
            </div>
          </Reveal>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="relative mx-auto max-w-5xl px-5 py-24 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-10 text-center sm:p-16">
            <div className="absolute inset-0 -z-10 opacity-40" style={{ background: "radial-gradient(600px circle at 50% 0%, #3b6dff44, transparent 70%)" }} />
            <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/5" style={{ animation: "floaty 6s ease-in-out infinite" }}>
              <ShieldCheck className="size-8 text-emerald-300" />
            </div>
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Vos données restent les vôtres.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/55">
              Sessions chiffrées, isolation stricte par compte, liens de partage
              révocables à tout moment. La sécurité par défaut, pas en option.
            </p>
            <div className="mx-auto mt-8 flex max-w-lg flex-wrap items-center justify-center gap-3 text-sm text-white/60">
              {[{ i: Lock, t: "Sessions signées" }, { i: ShieldCheck, t: "Isolation par compte" }, { i: Zap, t: "Infra Vercel + Neon" }].map((b) => (
                <span key={b.t} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <b.i className="size-4" /> {b.t}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#1a2bff]/30 via-[#6d3bff]/20 to-[#0bb]/10 p-12 text-center sm:p-20">
            <div className="pointer-events-none absolute -top-1/2 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, #5b8bff55, transparent 60%)", animation: "pulseGlow 6s ease-in-out infinite" }} />
            <h2 className="relative mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
              Rangez votre univers numérique.
            </h2>
            <p className="relative mx-auto mt-5 max-w-lg text-lg text-white/60">
              Créez votre espace en 30 secondes. C'est gratuit.
            </p>
            <Link
              href="/signup"
              className="group relative mt-9 inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-lg font-semibold text-[#07070c] transition hover:scale-[1.03]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Commencer gratuitement
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#3b6dff] to-[#7b3bff]">
              <Cloud className="size-4" />
            </span>
            FileHub
          </Link>
          <p className="text-sm text-white/40">© 2026 FileHub. Votre espace de fichiers, réinventé.</p>
          <div className="flex gap-5 text-sm text-white/50">
            <Link href="/login" className="transition hover:text-white">Connexion</Link>
            <Link href="/signup" className="transition hover:text-white">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── decorative sub-components ─────────────────────────────────────────── */

function StarField() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    top: `${(i * 53) % 100}%`,
    delay: `${(i % 10) * 0.4}s`,
    size: (i % 3) + 1,
  }));
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animation: `twinkle ${3 + (i % 4)}s ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
    </>
  );
}

function MockDrive() {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14]/90 shadow-2xl shadow-black/60 backdrop-blur">
      {/* top bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <div className="ml-4 flex h-7 flex-1 items-center gap-2 rounded-lg bg-white/5 px-3 text-xs text-white/40">
          <Search className="size-3.5" /> Rechercher dans FileHub…
        </div>
      </div>
      <div className="flex">
        {/* sidebar */}
        <div className="hidden w-44 shrink-0 border-r border-white/10 p-3 sm:block">
          {[{ i: Cloud, t: "Mon Drive", a: true }, { i: Star, t: "Favoris" }, { i: Trash2, t: "Corbeille" }].map((n) => (
            <div key={t(n.t)} className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${n.a ? "bg-white/10 text-white" : "text-white/50"}`}>
              <n.i className="size-4" /> {n.t}
            </div>
          ))}
          <div className="mt-4 rounded-xl border border-white/10 p-3">
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-[#3b6dff] to-[#22d3ee]" />
            </div>
            <p className="text-[10px] text-white/40">6 Go sur 15 Go</p>
          </div>
        </div>
        {/* grid */}
        <div className="grid flex-1 grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {MOCK_FILES.map((f, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20">
              <div className="mb-2 grid aspect-[4/3] place-items-center rounded-lg" style={{ background: `${f.color}1a` }}>
                <f.icon className="size-7" style={{ color: f.color }} />
              </div>
              <div className="truncate text-xs font-medium text-white/80">{f.name}</div>
              <div className="text-[10px] text-white/40">{f.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockPreview() {
  return (
    <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14]/90 p-4 shadow-2xl shadow-black/60">
      <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
        <FileImage className="size-4 text-pink-400" /> vue-montagne.jpg
        <span className="ml-auto flex gap-1.5 text-white/40">
          <Star className="size-4" /> <Share2 className="size-4" />
        </span>
      </div>
      <div
        className="grid aspect-video place-items-center rounded-xl"
        style={{ background: "linear-gradient(135deg,#3b6dff,#7b3bff 45%,#22d3ee)" }}
      >
        <div className="rounded-full bg-white/15 p-4 backdrop-blur" style={{ animation: "pulseGlow 3s ease-in-out infinite" }}>
          <Eye className="size-7 text-white" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-white/40">
        <span>2,4 Mo · modifié à l'instant</span>
        <span className="rounded-md bg-white/10 px-2 py-1 text-white/60">Aperçu</span>
      </div>
    </div>
  );
}

/* helper to keep keys stable */
function t(s: string) {
  return s;
}

const MARQUEE = ["Images", "Vidéos", "PDF", "Documents", "Feuilles de calcul", "Code", "Archives", "Audio", "Présentations"];

const FEATURES = [
  { icon: UploadCloud, title: "Import glisser-déposer", desc: "Déposez vos fichiers n'importe où. Import multiple avec barre de progression en temps réel.", color: "#5b8bff", glow: "#3b6dff" },
  { icon: FolderTree, title: "Dossiers imbriqués", desc: "Organisez à l'infini. Fil d'Ariane, déplacement, tout reste limpide.", color: "#f59e0b", glow: "#f59e0b" },
  { icon: Eye, title: "Aperçu instantané", desc: "Images, vidéos, PDF, texte et code s'ouvrent en un clic, sans téléchargement.", color: "#22d3ee", glow: "#22d3ee" },
  { icon: Share2, title: "Partage par lien", desc: "Générez un lien public sécurisé pour un fichier ou un dossier. Révocable à tout moment.", color: "#a78bff", glow: "#7b3bff" },
  { icon: Search, title: "Recherche instantanée", desc: "Retrouvez n'importe quoi en tapant. Résultats dans tout votre Drive, en direct.", color: "#34d399", glow: "#10b981" },
  { icon: Trash2, title: "Corbeille & restauration", desc: "Rien n'est perdu par erreur. Restaurez ou videz définitivement en un geste.", color: "#fb7185", glow: "#f43f5e" },
];

const MOCK_FILES = [
  { icon: FileImage, name: "vue-montagne.jpg", meta: "2,4 Mo", color: "#ec4899" },
  { icon: Folder, name: "Projets", meta: "12 éléments", color: "#f59e0b" },
  { icon: FileText, name: "rapport.pdf", meta: "840 Ko", color: "#ef4444" },
  { icon: FileVideo, name: "demo.mp4", meta: "18 Mo", color: "#8b5cf6" },
  { icon: FileText, name: "notes.md", meta: "12 Ko", color: "#64748b" },
  { icon: Folder, name: "Design", meta: "7 éléments", color: "#f59e0b" },
  { icon: FileImage, name: "logo.png", meta: "120 Ko", color: "#ec4899" },
  { icon: FileText, name: "budget.csv", meta: "44 Ko", color: "#10b981" },
];
