"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Shapes, Plus, Loader2, Clock, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { SIZE_PRESETS } from "@/lib/design";

type Item = { id: string; name: string; updatedAt: string; width: number; height: number; background: string; layers: number };

export function DesignHome() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => api.listDesigns().then((r) => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    try {
      const { node } = await api.createNode("design", "Création sans titre", null);
      router.push(`/drive/design/${node.id}`);
    } finally { setCreating(false); }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 px-4 sm:px-6 flex items-center gap-3 bg-white/[0.03] backdrop-blur-xl">
        <button onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden" title="Menu">
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#a855f7] to-[#6366f1] shadow-lg shadow-purple-500/25">
            <Shapes className="size-4 text-white" />
          </span>
          <h1 className="text-lg font-semibold truncate">Design</h1>
        </div>
        <button onClick={create} disabled={creating} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 disabled:opacity-60">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Nouvelle création
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 sm:px-6 py-6">
        {items === null ? (
          <div className="grid h-40 place-items-center text-muted"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <div className="mx-auto max-w-6xl">
            {/* Démarrage rapide par format */}
            <QuickStart onCreate={create} />

            {items.length === 0 ? (
              <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
                <Sparkles className="mb-3 size-8 text-purple-300/70" />
                <p className="text-sm font-medium text-white/80">Aucune création pour l'instant</p>
                <p className="mt-1 max-w-sm text-xs text-muted">Lancez votre premier visuel : posts réseaux, miniatures, logos, affiches… tout se crée ici.</p>
                <button onClick={create} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white">
                  <Plus className="size-4" /> Créer maintenant
                </button>
              </div>
            ) : (
              <>
                <h2 className="mb-3 mt-8 text-sm font-semibold text-white/80">Vos créations</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((it) => <DesignCard key={it.id} item={it} onOpen={() => router.push(`/drive/design/${it.id}`)} />)}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DesignCard({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const ratio = item.width / item.height;
  const when = useMemo(() => relTime(item.updatedAt), [item.updatedAt]);
  const transparent = item.background === "transparent";
  return (
    <button onClick={onOpen} className="group text-left">
      <div className="mb-2 grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition group-hover:border-purple-400/40">
        <div className="max-h-[80%] max-w-[80%] rounded-md shadow-lg ring-1 ring-black/30"
          style={{
            aspectRatio: String(ratio),
            width: ratio >= 1 ? "80%" : "auto",
            height: ratio >= 1 ? "auto" : "80%",
            background: transparent ? "repeating-conic-gradient(#cbd5e1 0% 25%, #fff 0% 50%) 50% / 14px 14px" : item.background,
          }} />
      </div>
      <p className="truncate text-sm font-medium text-white/90">{item.name || "Sans titre"}</p>
      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <span className="tabular-nums">{item.width}×{item.height}</span>
        <span>·</span>
        <Clock className="size-3" /> {when}
      </p>
    </button>
  );
}

function QuickStart({ onCreate }: { onCreate: () => void }) {
  // Aperçu des formats populaires (le format se choisit ensuite dans l'éditeur).
  const popular = SIZE_PRESETS.filter((p) => ["ig-post", "ig-story", "yt-thumb", "fb-post", "logo", "a4-p"].includes(p.id));
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-white/80">Créer à partir d'un format</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {popular.map((p) => {
          const r = p.w / p.h;
          return (
            <button key={p.id} onClick={onCreate} className="group flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-purple-400/40 hover:bg-white/5">
              <div className="grid h-16 w-full place-items-center">
                <div className="rounded ring-1 ring-white/15 transition group-hover:ring-purple-400/50" style={{ aspectRatio: String(r), width: r >= 1 ? "70%" : "auto", height: r >= 1 ? "auto" : "100%", background: "linear-gradient(135deg,#a855f7,#6366f1)" }} />
              </div>
              <span className="text-center text-[11px] leading-tight text-muted">{p.label}</span>
            </button>
          );
        })}
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
