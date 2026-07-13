"use client";

import { useState } from "react";
import { Download, type LucideIcon } from "lucide-react";

export type ExportItem = { label: string; icon?: LucideIcon; onClick: () => void | Promise<void> };

export function ExportButton({ items }: { items: ExportItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} title="Exporter" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition">
        <Download className="size-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-white/10 bg-[#0f1017]/97 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-2xl" style={{ animation: "revealUp 0.15s both" }}>
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Exporter</p>
            {items.map((it, i) => (
              <button
                key={i}
                onClick={async () => { setOpen(false); try { await it.onClick(); } catch { /* ignore */ } }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-white/5"
              >
                {it.icon && <it.icon className="size-4 text-muted" />}
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
