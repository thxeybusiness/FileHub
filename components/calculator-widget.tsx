"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

type Op = "+" | "-" | "×" | "÷";

function compute(a: number, op: Op, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
  }
}

function fmt(n: number): string {
  if (!isFinite(n)) return "Erreur";
  // Limite la longueur tout en gardant la précision utile.
  const s = Number(n.toPrecision(12)).toString();
  return s.length > 14 ? Number(n).toExponential(6) : s;
}

export function CalculatorWidget() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [overwrite, setOverwrite] = useState(true);

  const inputDigit = useCallback((d: string) => {
    setCurrent((c) => {
      if (overwrite) return d;
      if (c === "0" && d !== ".") return d;
      if (d === "." && c.includes(".")) return c;
      if (c.replace(/[-.]/g, "").length >= 14) return c;
      return c + d;
    });
    setOverwrite(false);
  }, [overwrite]);

  const chooseOp = useCallback((next: Op) => {
    setCurrent((c) => {
      const cur = parseFloat(c);
      if (prev !== null && op && !overwrite) {
        const r = compute(prev, op, cur);
        setPrev(r);
        setOp(next);
        setOverwrite(true);
        return fmt(r);
      }
      setPrev(cur);
      setOp(next);
      setOverwrite(true);
      return c;
    });
  }, [prev, op, overwrite]);

  const equals = useCallback(() => {
    if (prev === null || !op) return;
    const r = compute(prev, op, parseFloat(current));
    setCurrent(fmt(r));
    setPrev(null);
    setOp(null);
    setOverwrite(true);
  }, [prev, op, current]);

  const clearAll = useCallback(() => {
    setCurrent("0"); setPrev(null); setOp(null); setOverwrite(true);
  }, []);

  const backspace = useCallback(() => {
    setCurrent((c) => (overwrite || c.length <= 1 || (c.length === 2 && c.startsWith("-")) ? "0" : c.slice(0, -1)));
  }, [overwrite]);

  const percent = useCallback(() => {
    setCurrent((c) => fmt(parseFloat(c) / 100));
    setOverwrite(true);
  }, []);

  const negate = useCallback(() => {
    setCurrent((c) => (c === "0" ? c : c.startsWith("-") ? c.slice(1) : "-" + c));
  }, []);

  // Support clavier quand la calculatrice est ouverte.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/[0-9]/.test(k)) { inputDigit(k); }
      else if (k === ".") inputDigit(".");
      else if (k === "+") chooseOp("+");
      else if (k === "-") chooseOp("-");
      else if (k === "*") chooseOp("×");
      else if (k === "/") { e.preventDefault(); chooseOp("÷"); }
      else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
      else if (k === "Backspace") backspace();
      else if (k === "%") percent();
      else if (k === "Escape") setOpen(false);
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, inputDigit, chooseOp, equals, backspace, percent]);

  const expr = prev !== null && op ? `${fmt(prev)} ${op}` : "";

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Calculatrice"
        className={cn(
          "fixed bottom-6 right-6 z-[60] grid size-12 place-items-center rounded-2xl border border-white/10 shadow-xl shadow-black/40 backdrop-blur-xl transition hover:scale-105",
          open ? "bg-brand-600 text-white" : "bg-[#0f1017]/85 text-brand-300 hover:text-white",
        )}
      >
        <Calculator className="size-5" />
      </button>

      {/* Panneau calculatrice */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl shadow-2xl animate-in">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <Calculator className="size-4 text-brand-300" />
            <span className="text-sm font-semibold">Calculatrice</span>
            <button onClick={() => setOpen(false)} className="ml-auto grid size-7 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white">
              <X className="size-4" />
            </button>
          </div>

          {/* Écran */}
          <div className="px-4 pt-3 pb-2 text-right">
            <div className="h-4 text-xs text-muted truncate">{expr}</div>
            <div className="text-3xl font-semibold tracking-tight truncate">{current}</div>
          </div>

          {/* Clavier */}
          <div className="grid grid-cols-4 gap-1.5 p-3">
            <Btn onClick={clearAll} variant="fn">AC</Btn>
            <Btn onClick={negate} variant="fn">±</Btn>
            <Btn onClick={percent} variant="fn">%</Btn>
            <Btn onClick={() => chooseOp("÷")} variant="op" active={op === "÷" && overwrite}>÷</Btn>

            <Btn onClick={() => inputDigit("7")}>7</Btn>
            <Btn onClick={() => inputDigit("8")}>8</Btn>
            <Btn onClick={() => inputDigit("9")}>9</Btn>
            <Btn onClick={() => chooseOp("×")} variant="op" active={op === "×" && overwrite}>×</Btn>

            <Btn onClick={() => inputDigit("4")}>4</Btn>
            <Btn onClick={() => inputDigit("5")}>5</Btn>
            <Btn onClick={() => inputDigit("6")}>6</Btn>
            <Btn onClick={() => chooseOp("-")} variant="op" active={op === "-" && overwrite}>−</Btn>

            <Btn onClick={() => inputDigit("1")}>1</Btn>
            <Btn onClick={() => inputDigit("2")}>2</Btn>
            <Btn onClick={() => inputDigit("3")}>3</Btn>
            <Btn onClick={() => chooseOp("+")} variant="op" active={op === "+" && overwrite}>+</Btn>

            <Btn onClick={() => inputDigit("0")} wide>0</Btn>
            <Btn onClick={() => inputDigit(".")}>,</Btn>
            <Btn onClick={equals} variant="eq">=</Btn>
          </div>
          <div className="px-3 pb-3">
            <Btn onClick={backspace} variant="fn" full>
              <span className="flex items-center justify-center gap-1.5"><Delete className="size-4" /> Effacer</span>
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}

function Btn({
  children,
  onClick,
  variant = "num",
  active,
  wide,
  full,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "num" | "op" | "fn" | "eq";
  active?: boolean;
  wide?: boolean;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-11 rounded-xl text-base font-medium transition active:scale-95",
        wide && "col-span-2",
        full && "w-full",
        variant === "num" && "bg-white/5 text-white hover:bg-white/10",
        variant === "fn" && "bg-white/[0.07] text-white/80 hover:bg-white/[0.12]",
        variant === "op" && (active ? "bg-brand-500 text-white" : "bg-brand-500/20 text-brand-200 hover:bg-brand-500/30"),
        variant === "eq" && "bg-gradient-to-br from-[#3b6dff] to-[#7b3bff] text-white hover:opacity-90",
      )}
    >
      {children}
    </button>
  );
}
