"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-[#0f1017]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl",
              danger ? "bg-red-500/15 text-red-400" : "bg-brand-500/15 text-brand-300",
            )}
          >
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-white/10 text-sm font-medium text-white/80 hover:bg-white/5 transition"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={cn(
              "h-10 px-5 rounded-xl text-sm font-semibold text-white transition",
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gradient-to-r from-[#3b6dff] to-[#7b3bff] hover:opacity-90",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
