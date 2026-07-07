"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Lock, Loader2, ArrowRight } from "lucide-react";

export function SharePasswordGate({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/s/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Mot de passe incorrect");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Connexion impossible.");
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas grid place-items-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-2xl">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/30">
          <Lock className="size-7 text-white" />
        </span>
        <h1 className="mt-5 text-lg font-bold">Lien protégé</h1>
        <p className="mt-1 text-sm text-muted">
          Entrez le mot de passe pour accéder à ce contenu.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center outline-none transition placeholder:text-white/30 focus:border-brand-400 focus:bg-white/[0.07]"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending || !password}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : <>Déverrouiller <ArrowRight className="size-4" /></>}
          </button>
        </form>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Cloud className="size-3.5" /> Partagé via FileHub
        </div>
      </div>
    </div>
  );
}
