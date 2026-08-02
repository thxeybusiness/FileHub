"use client";

// Accueil de l'application Design : démarrage rapide par format, modèles
// professionnels et galerie des créations avec vrais aperçus miniatures.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, Shapes, Plus, Loader2, Clock, Sparkles, MoreHorizontal, Pencil, Copy, Trash2,
} from "lucide-react";
import { api, notifyRefresh } from "@/lib/api";
import { parseDesign, type DesignDoc } from "@/lib/design";
import { TEMPLATES, templateDoc } from "@/lib/design-presets";
import { DocPreview } from "./design-render";
import { BrandGlyph, BRANDS, type BrandId } from "./design-brands";
import { NameDialog } from "./name-dialog";

type Item = { id: string; name: string; updatedAt: string; content: string };

// Vignettes de démarrage : chaque format porte l'identité de sa plateforme.
type FormatCard = { label: string; w: number; h: number; brand: BrandId; icon: number };
const FORMAT_CARDS: FormatCard[] = [
  { label: "Post Instagram", w: 1080, h: 1080, brand: "instagram", icon: 24 },
  { label: "Story · Reel · TikTok", w: 1080, h: 1920, brand: "tiktok", icon: 24 },
  { label: "Miniature YouTube", w: 1280, h: 720, brand: "youtube", icon: 24 },
  { label: "Post Facebook", w: 1200, h: 630, brand: "facebook", icon: 22 },
  { label: "Post X", w: 1600, h: 900, brand: "x", icon: 20 },
  { label: "Bannière LinkedIn", w: 1584, h: 396, brand: "linkedin", icon: 15 },
  { label: "Logo", w: 800, h: 800, brand: "logo", icon: 24 },
  { label: "Affiche A4", w: 1240, h: 1754, brand: "print", icon: 24 },
];

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

export function DesignHome() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Item | null>(null);

  const load = () => api.listDesigns().then((r) => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

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

  const duplicate = async (it: Item) => {
    const { node } = await api.createNode("design", `${it.name} copie`, null);
    await api.saveContent(node.id, { content: it.content }).catch(() => {});
    notifyRefresh();
    load();
  };

  const trash = async (it: Item) => {
    await api.update(it.id, { trashed: true });
    notifyRefresh();
    load();
  };

  const rename = async (it: Item, name: string) => {
    await api.update(it.id, { name });
    setRenaming(null);
    notifyRefresh();
    load();
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
        <button onClick={() => createBlank()} disabled={creating}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 disabled:opacity-60">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Nouvelle création
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6">
        {items === null ? (
          <div className="grid h-40 place-items-center text-muted"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-9">
            {/* Formats vierges */}
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-white/80">Créer à partir d'un format</h2>
                <button onClick={() => createBlank()} disabled={creating}
                  className="shrink-0 text-[11px] font-medium text-purple-300 transition hover:text-purple-200 disabled:opacity-50">
                  Format personnalisé →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FORMAT_CARDS.map((f) => {
                  const b = BRANDS[f.brand];
                  return (
                    <button key={f.label} onClick={() => createBlank(f.w, f.h)} disabled={creating}
                      className="group rounded-2xl border border-white/10 bg-white/[0.02] p-2.5 text-left transition hover:border-purple-400/40 hover:bg-white/5 disabled:opacity-60">
                      <div className="grid aspect-[4/3] place-items-center rounded-xl bg-black/25 ring-1 ring-inset ring-white/5">
                        <div
                          className="relative grid place-items-center overflow-hidden rounded-lg shadow-lg shadow-black/40 transition group-hover:scale-[1.04]"
                          style={{
                            ...fitInBox(f.w, f.h),
                            background: b.bg,
                            color: b.fg,
                            boxShadow: b.ring ? `inset 0 0 0 1px ${b.ring}` : undefined,
                          }}
                        >
                          <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                          <span className="relative"><BrandGlyph id={f.brand} size={f.icon} /></span>
                        </div>
                      </div>
                      <p className="mt-2 truncate text-[12px] font-medium text-white/90">{f.label}</p>
                      <p className="text-[10.5px] tabular-nums text-muted">{f.w} × {f.h}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Modèles */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-white/80">Commencer avec un modèle</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {TEMPLATES.map((t) => (
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
            </section>

            {/* Créations */}
            <section>
              {items.length === 0 ? (
                <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 py-14 text-center">
                  <Sparkles className="mb-3 size-8 text-purple-300/70" />
                  <p className="text-sm font-medium text-white/80">Aucune création pour l'instant</p>
                  <p className="mt-1 max-w-sm text-xs text-muted">Partez d'un format vierge ou d'un modèle ci-dessus : posts, miniatures, logos, affiches…</p>
                </div>
              ) : (
                <>
                  <h2 className="mb-3 text-sm font-semibold text-white/80">Vos créations</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {items.map((it) => (
                      <DesignCard
                        key={it.id}
                        item={it}
                        onOpen={() => router.push(`/drive/design/${it.id}`)}
                        onRename={() => setRenaming(it)}
                        onDuplicate={() => duplicate(it)}
                        onTrash={() => trash(it)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {renaming && (
        <NameDialog
          title="Renommer la création"
          label="Nom"
          initial={renaming.name}
          confirmLabel="Renommer"
          onCancel={() => setRenaming(null)}
          onConfirm={(v) => rename(renaming, v)}
        />
      )}
    </div>
  );
}

function DesignCard({ item, onOpen, onRename, onDuplicate, onTrash }: {
  item: Item; onOpen: () => void; onRename: () => void; onDuplicate: () => void; onTrash: () => void;
}) {
  const doc = useMemo(() => parseDesign(item.content), [item.content]);
  const when = useMemo(() => relTime(item.updatedAt), [item.updatedAt]);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  return (
    <div className="group relative">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/25 transition group-hover:border-purple-400/40">
          <div style={fitInBox(doc.width, doc.height, "88%")}>
            <DocPreview doc={doc} className="shadow-lg shadow-black/40 ring-1 ring-black/30" rounded={6} />
          </div>
        </div>
        <p className="mt-2 truncate pr-8 text-sm font-medium text-white/90">{item.name || "Sans titre"}</p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="tabular-nums">{doc.width}×{doc.height}</span>
          <span>·</span>
          <Clock className="size-3" /> {when}
        </p>
      </button>

      <div className="absolute bottom-1 right-0" ref={menuRef}>
        <button onClick={() => setMenu((m) => !m)}
          className="grid size-7 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
          title="Options">
          <MoreHorizontal className="size-4" />
        </button>
        {menu && (
          <div className="absolute bottom-8 right-0 z-30 w-44 rounded-xl border border-white/10 bg-[#15151d]/98 p-1.5 shadow-2xl shadow-black/60 backdrop-blur">
            <button onClick={() => { setMenu(false); onRename(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-white/85 transition hover:bg-white/5 hover:text-white">
              <Pencil className="size-3.5 opacity-70" /> Renommer
            </button>
            <button onClick={() => { setMenu(false); onDuplicate(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-white/85 transition hover:bg-white/5 hover:text-white">
              <Copy className="size-3.5 opacity-70" /> Dupliquer
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button onClick={() => { setMenu(false); onTrash(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-red-300 transition hover:bg-white/5 hover:text-red-200">
              <Trash2 className="size-3.5 opacity-70" /> Mettre à la corbeille
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}
