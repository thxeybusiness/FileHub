"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

export function NameDialog({
  title,
  label,
  initial = "",
  confirmLabel = "Valider",
  onCancel,
  onConfirm,
}: {
  title: string;
  label: string;
  initial?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    // Select filename without extension for rename convenience.
    const dot = initial.lastIndexOf(".");
    ref.current?.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);

  const submit = () => {
    const v = value.trim();
    if (v) onConfirm(v);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 animate-in" onClick={onCancel}>
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onCancel} className="ml-auto size-8 grid place-items-center rounded-lg hover:bg-canvas text-muted">
            <X className="size-4" />
          </button>
        </div>
        <label className="block">
          <span className="text-sm font-medium">{label}</span>
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onCancel();
            }}
            className="mt-1.5 w-full h-11 rounded-xl border border-line px-3.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="h-10 px-4 rounded-xl border border-line text-sm font-medium hover:bg-canvas">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="h-10 px-5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
