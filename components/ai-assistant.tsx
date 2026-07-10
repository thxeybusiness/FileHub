"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Loader2, Send, Check, Copy, CornerDownLeft, type LucideIcon } from "lucide-react";
import { api, type AiChart } from "@/lib/api";

export type QuickAction = { action: string; label: string; icon?: LucideIcon };

export function AiAssistant({
  kind,
  title = "Assistant IA",
  quickActions,
  getContext,
  onApplyText,
  applyLabel = "Insérer",
  onApplyChart,
  onApplyData,
  placeholder = "Demandez ce que vous voulez…",
  accent = "#7b3bff",
}: {
  kind: "doc" | "sheet" | "chart" | "draw" | "note" | "diagram" | "board" | "slides" | "project";
  title?: string;
  quickActions: QuickAction[];
  getContext?: () => string;
  onApplyText?: (text: string) => void;
  applyLabel?: string;
  onApplyChart?: (chart: AiChart) => void;
  onApplyData?: (data: unknown) => void;
  placeholder?: string;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<string | null>(null);
  const [chartResult, setChartResult] = useState<AiChart | null>(null);
  const [dataResult, setDataResult] = useState<unknown>(null);
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function run(action: string, instruction?: string) {
    setBusy(true);
    setError(null);
    setTextResult(null);
    setChartResult(null);
    setDataResult(null);
    setApplied(false);
    setCopied(false);
    try {
      const text = getContext?.() ?? "";
      const res = await api.ai({ kind, action, text, instruction });
      if (res.chart) setChartResult(res.chart);
      else if (res.data !== undefined && res.data !== null) setDataResult(res.data);
      else if (typeof res.result === "string") setTextResult(res.result);
      else setError("Réponse vide.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'assistant.");
    } finally {
      setBusy(false);
    }
  }

  function submitPrompt() {
    const p = prompt.trim();
    if (!p || busy) return;
    run(kind === "chart" ? "generate" : "custom", p);
  }

  function applyText() {
    if (textResult == null) return;
    onApplyText?.(textResult);
    setApplied(true);
  }
  function applyChart() {
    if (!chartResult) return;
    onApplyChart?.(chartResult);
    setApplied(true);
  }
  function applyData() {
    if (dataResult == null) return;
    onApplyData?.(dataResult);
    setApplied(true);
  }
  async function copyResult() {
    if (textResult == null) return;
    // Copie le texte sans balises HTML.
    const tmp = document.createElement("div");
    tmp.innerHTML = textResult;
    await navigator.clipboard.writeText(tmp.innerText || textResult).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const trigger = (
    <button
      onClick={() => setOpen((v) => !v)}
      className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-lg px-3 text-sm font-semibold text-white shadow-lg transition"
      style={{ background: `linear-gradient(90deg, #3b6dff, ${accent})`, boxShadow: `0 6px 18px ${accent}44` }}
      title="Assistant IA"
    >
      <Sparkles className="size-4" /> IA
    </button>
  );

  const panel =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[70]" onMouseDown={() => setOpen(false)}>
            <div
              ref={panelRef}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-3 top-16 flex max-h-[calc(100vh-5rem)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1017]/97 shadow-2xl shadow-black/60 backdrop-blur-2xl"
              style={{ animation: "revealUp 0.25s ease both" }}
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="grid size-7 place-items-center rounded-lg" style={{ background: `linear-gradient(135deg,#3b6dff,${accent})` }}>
                  <Sparkles className="size-4 text-white" />
                </span>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <button onClick={() => setOpen(false)} className="ml-auto grid size-7 place-items-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Actions rapides */}
                <div className="flex flex-wrap gap-1.5">
                  {quickActions.map((qa) => (
                    <button
                      key={qa.action}
                      onClick={() => run(qa.action, prompt.trim() || undefined)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:border-white/25 hover:bg-white/10 disabled:opacity-40"
                    >
                      {qa.icon && <qa.icon className="size-3.5" />}
                      {qa.label}
                    </button>
                  ))}
                </div>

                {/* Prompt libre */}
                <div className="relative mt-3">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitPrompt();
                    }}
                    placeholder={placeholder}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400 focus:bg-white/[0.07]"
                  />
                  <button
                    onClick={submitPrompt}
                    disabled={busy || !prompt.trim()}
                    className="absolute bottom-2.5 right-2 grid size-7 place-items-center rounded-lg text-white transition disabled:opacity-30"
                    style={{ background: `linear-gradient(135deg,#3b6dff,${accent})` }}
                    title="Envoyer (⌘/Ctrl + Entrée)"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>

                {busy && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-white/60">
                    <Loader2 className="size-4 animate-spin" /> Claude réfléchit…
                  </div>
                )}

                {error && (
                  <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
                )}

                {/* Résultat texte */}
                {textResult != null && !busy && (
                  <div className="mt-4">
                    <div
                      className="ai-result max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm leading-relaxed text-white/90"
                      dangerouslySetInnerHTML={{ __html: textResult }}
                    />
                    <div className="mt-2 flex gap-2">
                      {onApplyText && (
                        <button
                          onClick={applyText}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                        >
                          {applied ? <Check className="size-4" /> : <CornerDownLeft className="size-4" />}
                          {applied ? "Ajouté" : applyLabel}
                        </button>
                      )}
                      <button
                        onClick={copyResult}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
                      >
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        {copied ? "Copié" : "Copier"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Résultat structuré (kanban / présentation) */}
                {dataResult != null && !busy && (
                  <div className="mt-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/85">
                      <p className="font-medium">Proposition prête</p>
                      <p className="mt-1 text-xs text-white/60">Cliquez pour l'appliquer à votre {kind === "slides" ? "présentation" : "tableau"}.</p>
                    </div>
                    <button
                      onClick={applyData}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                      {applied ? <Check className="size-4" /> : <CornerDownLeft className="size-4" />}
                      {applied ? "Appliqué" : "Appliquer"}
                    </button>
                  </div>
                )}

                {/* Résultat graphique */}
                {chartResult != null && !busy && (
                  <div className="mt-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/85">
                      <p className="font-medium">Graphique proposé</p>
                      <p className="mt-1 text-xs text-white/60">
                        Type <span className="text-white/80">{chartResult.type}</span> · {chartResult.series.length} série(s) ·{" "}
                        {chartResult.categories.length} catégorie(s)
                      </p>
                    </div>
                    <button
                      onClick={applyChart}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                      {applied ? <Check className="size-4" /> : <CornerDownLeft className="size-4" />}
                      {applied ? "Appliqué" : "Appliquer au graphique"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {panel}
    </>
  );
}
