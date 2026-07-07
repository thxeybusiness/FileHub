"use client";

import { useEffect, useState } from "react";
import { X, Link2, Check, Loader2, Globe, Lock, Clock, Download, Eye } from "lucide-react";
import type { SerializedNode } from "@/lib/nodes";
import { api, type ShareInfo } from "@/lib/api";
import { cn, formatRelative } from "@/lib/utils";

const EXPIRY_OPTIONS: { label: string; days: number | null }[] = [
  { label: "Jamais", days: null },
  { label: "1 jour", days: 1 },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
];

export function ShareDialog({
  node,
  onClose,
}: {
  node: SerializedNode;
  onClose: () => void;
}) {
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  // Champ mot de passe (édité localement, appliqué au clic).
  const [pw, setPw] = useState("");
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    api
      .share(node.id)
      .then((r) => setShare(r.share))
      .catch(() => setShare(null))
      .finally(() => setLoading(false));
  }, [node.id]);

  const link = share ? `${origin}/s/${share.token}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const patch = async (p: { expiresInDays?: number | null; password?: string | null; allowDownload?: boolean }) => {
    setSaving(true);
    try {
      const r = await api.updateShare(node.id, p);
      setShare(r.share);
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    await api.unshare(node.id);
    onClose();
  };

  // Nombre de jours actuellement sélectionné (approx. depuis expiresAt).
  const currentDays = (() => {
    if (!share?.expiresAt) return null;
    const diff = new Date(share.expiresAt).getTime() - Date.now();
    const d = Math.round(diff / 86400_000);
    return EXPIRY_OPTIONS.find((o) => o.days === d)?.days ?? d;
  })();

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-1">
        <Globe className="size-5 text-brand-300" />
        <h3 className="text-lg font-semibold">Partager « {node.name} »</h3>
      </div>
      <p className="text-sm text-muted mb-5">
        Toute personne disposant du lien pourra {share?.allowDownload ? "consulter et télécharger" : "consulter"} cet élément.
      </p>

      {loading || !share ? (
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

          {/* Statistiques d'ouverture */}
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted">
            <Eye className="size-3.5" />
            {share.views > 0 ? (
              <span>
                Ouvert <span className="text-white/80">{share.views}</span> fois
                {share.lastViewedAt && <> · dernier accès {formatRelative(share.lastViewedAt)}</>}
              </span>
            ) : (
              <span>Pas encore ouvert</span>
            )}
          </div>

          {/* Réglages */}
          <div className="mt-4 space-y-3">
            {/* Autorisation de téléchargement */}
            <Row icon={share.allowDownload ? Download : Eye} label={share.allowDownload ? "Téléchargement autorisé" : "Lecture seule"}>
              <Toggle checked={share.allowDownload} disabled={saving} onChange={(v) => patch({ allowDownload: v })} />
            </Row>

            {/* Expiration */}
            <Row icon={Clock} label="Expiration">
              <select
                value={currentDays === null ? "null" : String(currentDays)}
                disabled={saving}
                onChange={(e) =>
                  patch({ expiresInDays: e.target.value === "null" ? null : Number(e.target.value) })
                }
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-sm outline-none focus:border-brand-400"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.label} value={o.days === null ? "null" : String(o.days)} className="bg-[#0f1017]">
                    {o.label}
                  </option>
                ))}
                {currentDays !== null && !EXPIRY_OPTIONS.some((o) => o.days === currentDays) && (
                  <option value={String(currentDays)} className="bg-[#0f1017]">{currentDays} jours</option>
                )}
              </select>
            </Row>

            {/* Mot de passe */}
            <Row icon={Lock} label="Mot de passe">
              {share.hasPassword && !pwOpen ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="size-3.5" /> Protégé</span>
                  <button onClick={() => setPwOpen(true)} className="text-xs text-muted hover:text-white">Changer</button>
                  <button onClick={() => patch({ password: null })} disabled={saving} className="text-xs text-red-400 hover:underline">Retirer</button>
                </div>
              ) : pwOpen || !share.hasPassword ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="Définir…"
                    className="h-8 w-28 rounded-lg border border-white/10 bg-white/5 px-2 text-sm outline-none focus:border-brand-400"
                  />
                  <button
                    disabled={saving || !pw.trim()}
                    onClick={async () => {
                      await patch({ password: pw.trim() });
                      setPw("");
                      setPwOpen(false);
                    }}
                    className="h-8 px-2.5 rounded-lg bg-brand-600 text-white text-xs font-medium disabled:opacity-50"
                  >
                    OK
                  </button>
                </div>
              ) : null}
            </Row>
          </div>

          <div className="flex justify-between items-center mt-6">
            <button
              onClick={revoke}
              className="text-sm text-red-400 font-medium hover:underline"
            >
              Désactiver le lien
            </button>
            <div className="flex items-center gap-3">
              {saving && <Loader2 className="size-4 animate-spin text-muted" />}
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-lg bg-white text-[#07070c] text-sm font-semibold"
              >
                Terminé
              </button>
            </div>
          </div>
        </>
      )}
    </Overlay>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Lock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 h-11">
      <span className="flex items-center gap-2 text-sm text-white/85">
        <Icon className="size-4 text-muted" /> {label}
      </span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 rounded-full transition disabled:opacity-50",
        checked ? "bg-brand-500" : "bg-white/15",
      )}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
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
