"use client";

// Accueil de l'application Design : démarrage rapide par format et modèles.
// Les créations ont leur propre page (/drive/design/mes-creations) : cet écran
// reste une page de DÉPART, sans inventaire à faire défiler.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, Shapes, Plus, Loader2, FolderOpen,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { api, notifyRefresh } from "@/lib/api";
import { parseDesign, type DesignDoc } from "@/lib/design";
import { TEMPLATES, templateDoc, templateGroups } from "@/lib/design-presets";
import { cn } from "@/lib/utils";
import { DocPreview } from "./design-render";
import { BrandGlyph, BRANDS, PLATFORMS, type Platform, type PlatformFormat } from "./design-brands";

// Les vignettes vivent dans une boîte au ratio 4/3 : on contraint la largeur
// pour les formats plus larges que la boîte, la hauteur sinon. Rien ne déborde,
// rien n'est rogné, le ratio réel est toujours respecté.
const BOX_RATIO = 4 / 3;
function fitInBox(w: number, h: number, fill = "86%") {
  const wide = w / h >= BOX_RATIO;
  return {
    aspectRatio: `${w} / ${h}`,
    width: wide ? fill : "auto",
    height: wide ? "auto" : fill,
  } satisfies React.CSSProperties;
}

// Taille du logo adaptée à la vignette : les formats très étirés (bannières)
// n'ont que quelques pixels de haut.
function glyphSize(w: number, h: number): number {
  const r = w / h;
  if (r >= 3.4) return 10;
  if (r >= 2.2) return 13;
  if (r >= 1.5) return 15;
  return 17;
}

const TPL_PAGE = 16; // modèles rendus par page : chaque vignette monte un document

export function DesignHome() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [groupe, setGroupe] = useState("Tous");
  const [montres, setMontres] = useState(TPL_PAGE);
  const groupes = useMemo(() => ["Tous", ...templateGroups(TEMPLATES)], []);
  const modeles = useMemo(() => (groupe === "Tous" ? TEMPLATES : TEMPLATES.filter((t) => t.group === groupe)), [groupe]);
  useEffect(() => { setMontres(TPL_PAGE); }, [groupe]);

  const createBlank = async (w?: number, h?: number) => {
    setCreating(true);
    try {
      const { node } = await api.createNode("design", "Création sans titre", null);
      if (w && h) {
        const doc: DesignDoc = { version: 1, width: w, height: h, background: "#ffffff", backgroundGradient: null, layers: [] };
        await api.saveContent(node.id, { content: JSON.stringify(doc) }).catch(() => {});
      }
      notifyRefresh();
      router.push(`/drive/design/${node.id}`);
    } finally { setCreating(false); }
  };

  const createFromTemplate = async (tplId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setCreating(true);
    try {
      const { node } = await api.createNode("design", tpl.label, null);
      await api.saveContent(node.id, { content: JSON.stringify(templateDoc(tpl)) }).catch(() => {});
      notifyRefresh();
      router.push(`/drive/design/${node.id}`);
    } finally { setCreating(false); }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 backdrop-blur-xl sm:px-6">
        <button onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white lg:hidden" title="Menu">
          <Menu className="size-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#a855f7] to-[#6366f1] shadow-lg shadow-purple-500/25">
            <Shapes className="size-4 text-white" />
          </span>
          <h1 className="truncate text-lg font-semibold">Design</h1>
        </div>
        <button onClick={() => router.push("/drive/design/mes-creations")}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 transition hover:border-purple-400/40 hover:bg-white/10 hover:text-white">
          <FolderOpen className="size-4" /> Mes créations
        </button>
        <button onClick={() => createBlank()} disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 disabled:opacity-60">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Nouvelle création
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-9">
            {/* Formats vierges : catégories + carrousel compact */}
            <FormatPicker onPick={createBlank} disabled={creating} />

            {/* Modèles.
               Il y en a plusieurs centaines et chaque vignette monte un
               document complet : on n'en rend qu'une page, filtrée par groupe. */}
            <section>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-white/80">Commencer avec un modèle</h2>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted">{TEMPLATES.length}</span>
              </div>
              <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {groupes.map((g) => (
                  <button key={g} onClick={() => setGroupe(g)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                      groupe === g ? "border-purple-400/50 bg-purple-500/15 text-white" : "border-white/10 text-muted hover:bg-white/5 hover:text-white",
                    )}>
                    {g}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {modeles.slice(0, montres).map((t) => (
                  <button key={t.id} onClick={() => createFromTemplate(t.id)} disabled={creating}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] p-2.5 text-left transition hover:border-purple-400/40 hover:bg-white/5 disabled:opacity-60">
                    <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-black/25 ring-1 ring-inset ring-white/5">
                      <div style={fitInBox(t.doc.width, t.doc.height, "88%")}>
                        <DocPreview doc={t.doc} className="shadow-lg shadow-black/40 ring-1 ring-black/30 transition group-hover:ring-purple-400/50" rounded={8} />
                      </div>
                    </div>
                    <p className="mt-2 truncate text-[12px] font-medium text-white/90">{t.label}</p>
                    <p className="text-[10.5px] text-muted">{t.group} · {t.doc.width}×{t.doc.height}</p>
                  </button>
                ))}
              </div>
              {modeles.length > montres && (
                <button onClick={() => setMontres((n) => n + TPL_PAGE)}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-white/80 transition hover:border-purple-400/40 hover:bg-white/10">
                  Afficher plus ({montres} sur {modeles.length})
                </button>
              )}
            </section>

        </div>
      </div>
    </div>
  );
}

function FormatPicker({ onPick, disabled }: { onPick: (w: number, h: number) => void; disabled: boolean }) {
  const [active, setActive] = useState(0);
  const platform = PLATFORMS[active];
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-white/80">Créer à partir d'un format</h2>
        <button onClick={() => onPick(1080, 1080)} disabled={disabled}
          className="shrink-0 text-[11px] font-medium text-purple-300 transition hover:text-purple-200 disabled:opacity-50">
          Format personnalisé →
        </button>
      </div>

      {/* Catégories */}
      <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto">
        {PLATFORMS.map((p, i) => {
          const on = i === active;
          return (
            <button key={p.id} onClick={() => setActive(i)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition ${on ? "border-purple-400/50 bg-purple-500/15 text-white" : "border-white/10 text-muted hover:bg-white/5 hover:text-white"}`}>
              <span className="grid size-4 place-items-center rounded-[5px]" style={{ background: BRANDS[p.id].bg, color: BRANDS[p.id].fg }}>
                <BrandGlyph id={p.id} size={9} />
              </span>
              {p.label}
            </button>
          );
        })}
      </div>

      <FormatRow platform={platform} onPick={onPick} disabled={disabled} />
    </section>
  );
}

function FormatRow({ platform, onPick, disabled }: { platform: Platform; onPick: (w: number, h: number) => void; disabled: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [nav, setNav] = useState({ left: false, right: false });
  const b = BRANDS[platform.id];

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setNav({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  }, []);

  // Re-mesure au changement de catégorie et sur redimensionnement.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = 0;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [platform.id, measure]);

  // Défile jusqu'au format suivant (une « page » de vignettes, alignée grâce
  // au scroll-snap sur chaque carte).
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth - 120), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={ref} onScroll={measure}
        className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-0.5">
        {platform.formats.map((f) => (
          <FormatCard key={`${f.label}-${f.w}x${f.h}`} f={f} bg={b.bg} fg={b.fg} ring={b.ring}
            brand={platform.id} onPick={onPick} disabled={disabled} />
        ))}
      </div>

      {/* Flèches de défilement (affichées seulement s'il reste à voir) */}
      {nav.left && <ScrollArrow side="left" onClick={() => scrollBy(-1)} />}
      {nav.right && <ScrollArrow side="right" onClick={() => scrollBy(1)} />}
    </div>
  );
}

function ScrollArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <>
      {/* Dégradé de fondu pour signaler qu'il y a une suite */}
      <div className={`pointer-events-none absolute inset-y-0 ${side === "left" ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"} w-14 from-[#07070c] to-transparent`} />
      <button onClick={onClick} aria-label={side === "left" ? "Formats précédents" : "Formats suivants"}
        className={`absolute top-[38%] ${side === "left" ? "left-1" : "right-1"} grid size-7 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#15151d]/95 text-white/85 shadow-lg shadow-black/50 backdrop-blur transition hover:border-purple-400/50 hover:text-white`}>
        <Icon className="size-4" />
      </button>
    </>
  );
}

function FormatCard({ f, bg, fg, ring, brand, onPick, disabled }: {
  f: PlatformFormat; bg: string; fg: string; ring?: string;
  brand: Platform["id"]; onPick: (w: number, h: number) => void; disabled: boolean;
}) {
  return (
    <button onClick={() => onPick(f.w, f.h)} disabled={disabled} title={`${f.label} — ${f.w} × ${f.h}`}
      className="group w-[126px] shrink-0 snap-start rounded-xl border border-white/10 bg-white/[0.02] p-2 text-left transition hover:border-purple-400/40 hover:bg-white/5 disabled:opacity-60">
      <div className="grid aspect-[4/3] place-items-center rounded-lg bg-black/25 ring-1 ring-inset ring-white/5">
        <div
          className="relative grid place-items-center overflow-hidden rounded-[5px] shadow-md shadow-black/40 transition group-hover:scale-[1.06]"
          style={{ ...fitInBox(f.w, f.h, "84%"), background: bg, color: fg, boxShadow: ring ? `inset 0 0 0 1px ${ring}` : undefined }}
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
          <span className="relative"><BrandGlyph id={brand} size={glyphSize(f.w, f.h)} /></span>
        </div>
      </div>
      <p className="mt-1.5 truncate text-[11px] font-medium leading-tight text-white/90">{f.label}</p>
      <p className="text-[9.5px] tabular-nums text-muted">{f.w} × {f.h}</p>
    </button>
  );
}
