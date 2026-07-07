"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Sparkles, Send, Loader2, Cloud, User } from "lucide-react";
import { api } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Résume mes documents récents",
  "Combien de fichiers ai-je, et de quels types ?",
  "Retrouve le document qui parle de budget",
  "Fais un compte-rendu à partir de mes notes",
];

export function DriveAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await api.aiChat(next.slice(-12));
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'assistant.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="h-16 shrink-0 border-b border-white/10 px-4 sm:px-6 flex items-center gap-2 sm:gap-4 bg-white/[0.03] backdrop-blur-xl">
        <button
          onClick={() => window.dispatchEvent(new Event("filehub:sidebar"))}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition lg:hidden"
          title="Menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-lg shadow-blue-500/25">
          <Sparkles className="size-4 text-white" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight">Assistant IA</h1>
          <p className="hidden truncate text-xs text-muted sm:block">Discutez avec l'ensemble de vos fichiers</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-4 py-6">
          {messages.length === 0 && !busy && (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] shadow-xl shadow-blue-500/30">
                <Sparkles className="size-8 text-white" />
              </span>
              <h2 className="mt-5 text-xl font-semibold">Que puis-je faire pour vous ?</h2>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Je connais tous vos fichiers. Posez une question, demandez un résumé, une recherche ou un compte-rendu.
              </p>
              <div className="mt-6 grid w-full max-w-md gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left text-sm text-white/85 transition hover:border-white/25 hover:bg-white/[0.06]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full ${
                  m.role === "user"
                    ? "bg-white/10 text-white/80"
                    : "bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] text-white"
                }`}
              >
                {m.role === "user" ? <User className="size-4" /> : <Cloud className="size-4" />}
              </span>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-tr-sm bg-brand-600 text-white"
                    : "rounded-tl-sm border border-white/10 bg-white/[0.04] text-ink/90"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] text-white">
                <Cloud className="size-4" />
              </span>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> Je parcours vos fichiers…
              </div>
            </div>
          )}

          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-white/[0.02] px-4 sm:px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Posez une question sur vos fichiers…"
            className="max-h-40 min-h-[46px] flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400 focus:bg-white/[0.07]"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="grid size-[46px] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 disabled:opacity-40"
            title="Envoyer"
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-2xl text-center text-[11px] text-white/35">
          L'assistant lit vos documents pour répondre. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
}
