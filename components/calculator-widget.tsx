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

export function CalculatorWidget({ sideOffset = false }: { sideOffset?: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [expBase, setExpBase] = useState<number | null>(null);
  const [expPow, setExpPow] = useState(2);

  const exitExp = () => {
    setExpBase(null);
    setExpPow(2);
  };

  const inputDigit = useCallback((d: string) => {
    exitExp();
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
    exitExp();
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
    exitExp();
    if (prev === null || !op) return;
    const r = compute(prev, op, parseFloat(current));
    setCurrent(fmt(r));
    setPrev(null);
    setOp(null);
    setOverwrite(true);
  }, [prev, op, current]);

  const clearAll = useCallback(() => {
    setCurrent("0"); setPrev(null); setOp(null); setOverwrite(true); exitExp();
  }, []);

  const backspace = useCallback(() => {
    exitExp();
    setCurrent((c) => (overwrite || c.length <= 1 || (c.length === 2 && c.startsWith("-")) ? "0" : c.slice(0, -1)));
  }, [overwrite]);

  const percent = useCallback(() => {
    exitExp();
    setCurrent((c) => fmt(parseFloat(c) / 100));
    setOverwrite(true);
  }, []);

  const negate = useCallback(() => {
    exitExp();
    setCurrent((c) => (c === "0" ? c : c.startsWith("-") ? c.slice(1) : "-" + c));
  }, []);

  // Exposant : 1er clic -> ²; clics suivants -> ³, ⁴, ⁵… sur la même base.
  const power = useCallback(() => {
    const base = expBase !== null ? expBase : parseFloat(current);
    if (!isFinite(base)) return;
    const pow = expBase !== null ? expPow + 1 : 2;
    setExpBase(base);
    setExpPow(pow);
    setCurrent(fmt(Math.pow(base, pow)));
    setOverwrite(true);
  }, [expBase, expPow, current]);

  // Un seul widget flottant ouvert à la fois : quand un autre s'ouvre, on ferme.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== "calc") setOpen(false);
    };
    window.addEventListener("filehub:widget-open", onOther);
    return () => window.removeEventListener("filehub:widget-open", onOther);
  }, []);
  const toggle = () => {
    if (!open) window.dispatchEvent(new CustomEvent("filehub:widget-open", { detail: "calc" }));
    setOpen((v) => !v);
  };

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
      else if (k === "^") { e.preventDefault(); power(); }
      else if (k === "Escape") setOpen(false);
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, inputDigit, chooseOp, equals, backspace, percent, power]);

  const inExp = expBase !== null;
  const expr = inExp ? `= ${current}` : prev !== null && op ? `${fmt(prev)} ${op}` : "";

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={toggle}
        title="Calculatrice"
        className={cn(
          "fixed bottom-6 z-[60] grid size-12 place-items-center rounded-2xl border border-white/10 shadow-xl shadow-black/40 backdrop-blur-xl transition hover:scale-105",
          sideOffset ? "right-6 lg:right-[17.5rem]" : "right-6",
          open ? "bg-brand-600 text-white" : "bg-[#0f1017]/85 text-brand-300 hover:text-white",
        )}
      >
        <Calculator className="size-5" />
      </button>

      {/* Panneau calculatrice */}
      {open && (
        <div className={cn("fixed bottom-24 z-[60] w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl shadow-2xl animate-in", sideOffset ? "right-6 lg:right-[17.5rem]" : "right-6")}>
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
            <div className="text-3xl font-semibold tracking-tight truncate">
              {inExp ? (
                <span>
                  {fmt(expBase)}
                  <sup className="ml-0.5 text-xl text-brand-300">{expPow}</sup>
                </span>
              ) : (
                current
              )}
            </div>
          </div>

          {/* Clavier */}
          <div className="grid grid-cols-4 gap-1.5 p-3">
            <Btn onClick={power} variant="fn" title="Exposant (puissance)">
              <span>
                x<sup className="text-[10px]">{inExp ? expPow : 2}</sup>
              </span>
            </Btn>
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
          <div className="flex gap-1.5 px-3 pb-3">
            <Btn onClick={clearAll} variant="fn" className="flex-1">Tout effacer</Btn>
            <button
              onClick={backspace}
              title="Effacer un caractère"
              className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-white/80 transition hover:bg-white/[0.12] active:scale-95"
            >
              <Delete className="size-4" />
            </button>
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
  className,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "num" | "op" | "fn" | "eq";
  active?: boolean;
  wide?: boolean;
  full?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "h-11 rounded-xl text-base font-medium transition active:scale-95",
        wide && "col-span-2",
        full && "w-full",
        className,
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
