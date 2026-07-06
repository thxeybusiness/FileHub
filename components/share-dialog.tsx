"use client";

import { useEffect, useState } from "react";
import { X, Link2, Check, Loader2, Globe } from "lucide-react";
import type { SerializedNode } from "@/lib/nodes";
import { api } from "@/lib/api";

export function ShareDialog({
  node,
  onClose,
}: {
  node: SerializedNode;
  onClose: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    api
      .share(node.id)
      .then((r) => setToken(r.token))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [node.id]);

  const link = token ? `${origin}/s/${token}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const revoke = async () => {
    await api.unshare(node.id);
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-1">
        <Globe className="size-5 text-brand-600" />
        <h3 className="text-lg font-semibold">Partager « {node.name} »</h3>
      </div>
      <p className="text-sm text-muted mb-5">
        Toute personne disposant du lien pourra consulter cet élément.
      </p>

      {loading ? (
        <div className="h-12 grid place-items-center text-muted">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 h-12">
            <Link2 className="size-4 text-muted shrink-0" />
            <input
              readOnly
              value={link}
              className="flex-1 bg-transparent text-sm outline-none truncate"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copy}
              className="h-8 px-3 rounded-lg bg-brand-600 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-brand-700 transition"
            >
              {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <div className="flex justify-between mt-6">
            <button
              onClick={revoke}
              className="text-sm text-red-600 font-medium hover:underline"
            >
              Désactiver le lien
            </button>
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-ink text-white text-sm font-medium"
            >
              Terminé
            </button>
          </div>
        </>
      )}
    </Overlay>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 animate-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0f1017]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 grid place-items-center rounded-lg hover:bg-white/5 text-muted"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
