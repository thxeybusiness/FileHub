"use client";

// Page des créations de l'application Design.
//
// Elle est SÉPARÉE de l'accueil : l'accueil est un point de départ (formats et
// modèles), celle-ci un inventaire (ouvrir, renommer, dupliquer, jeter). Les
// mélanger obligeait à faire défiler tout le catalogue avant d'atteindre son
// travail, et gonflait la barre latérale d'une liste qui n'y avait pas sa
// place.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, Shapes, Plus, Loader2, Clock, Sparkles, MoreHorizontal, Pencil, Copy, Trash2, ArrowLeft, Search, X,
} from "lucide-react";
import { api, notifyRefresh } from "@/lib/api";
import { parseDesign } from "@/lib/design";
import { normalizeSearch } from "@/lib/design-elements";
import { DocPreview } from "./design-render";
import { NameDialog } from "./name-dialog";

type Item = { id: string; name: string; updatedAt: string; content: string };

// Les vignettes vivent dans une boîte au ratio 4/3 : on contraint la largeur
// pour les formats plus larges que la boîte, la hauteur sinon.
const BOX_RATIO = 4 / 3;
function fitInBox(w: number, h: number, fill = "86%") {
  const wide = w / h >= BOX_RATIO;
  return {
    aspectRatio: `${w} / ${h}`,
    width: wide ? fill : "auto",
    height: wide ? "auto" : fill,
  } satisfies React.CSSProperties;
}

export function DesignCreations() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [renaming, setRenaming] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query.trim());

  const load = () => api.listDesigns().then((r) => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const vues = useMemo(
    () => (items ?? []).filter((it) => !q || normalizeSearch(it.name || "sans titre").includes(q)),
    [items, q],
  );

  const createBlank = async () => {
    setCreating(true);
    try {
      const { node } = await api.createNode("design", "Création sans titre", null);
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
        <button onClick={() => router.push("/drive/design")} title="Retour à FileHub Design"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#a855f7] to-[#6366f1] shadow-lg shadow-purple-500/25">
            <Shapes className="size-4 text-white" />
          </span>
          <h1 className="truncate text-lg font-semibold">Mes créations</h1>
          {items && <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted">{items.length}</span>}
        </div>
        <button onClick={createBlank} disabled={creating}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 disabled:opacity-60">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Nouvelle création
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6">
        {items === null ? (
          <div className="grid h-40 place-items-center text-muted"><Loader2 className="size-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="mx-auto mt-10 grid max-w-md place-items-center rounded-2xl border border-dashed border-white/10 py-14 text-center">
            <Sparkles className="mb-3 size-8 text-purple-300/70" />
            <p className="text-sm font-medium text-white/80">Aucune création pour l'instant</p>
            <p className="mt-1 max-w-sm text-xs text-muted">Partez d'un format vierge ou d'un modèle depuis FileHub Design.</p>
            <button onClick={() => router.push("/drive/design")}
              className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 transition hover:border-purple-400/40 hover:bg-white/10">
              Aller à FileHub Design
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl">
            <div className="relative mb-5 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une création"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple-400/50"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted hover:text-white">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {vues.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Aucune création pour « {query} ».</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {vues.map((it) => (
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
            )}
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

/* ═══════════ Sélecteur de format : catégories + carrousel compact ═══════════ */

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
