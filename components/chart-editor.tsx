"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  Check,
  Loader2,
  ChevronRight,
  Home,
  ChevronDown,
  Plus,
  Trash2,
  BarChart3,
} from "lucide-react";
import { api, type AiChart } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AiAssistant } from "./ai-assistant";
import {
  CHART_TYPES,
  seriesColor,
  defaultChartDoc,
  type ChartType,
  type ChartDoc,
} from "@/lib/chart-palette";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "error";

const AXIS = { fill: "#9aa0ad", fontSize: 12 };
const GRID = "rgba(255,255,255,0.06)";
const TOOLTIP = {
  contentStyle: {
    background: "#0f1017",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#eceef4",
  },
  labelStyle: { color: "#9aa0ad" },
  itemStyle: { color: "#eceef4" },
};

export function ChartEditor({
  id,
  initialName,
  initialDoc,
  backHref,
  crumbs,
}: {
  id: string;
  initialName: string;
  initialDoc: ChartDoc | null;
  backHref: string;
  crumbs: Crumb[];
}) {
  const [name, setName] = useState(initialName);
  const [doc, setDoc] = useState<ChartDoc>(initialDoc ?? defaultChartDoc());
  const [save, setSave] = useState<SaveState>("saved");
  const [typeOpen, setTypeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const persistContent = useCallback(
    (next: ChartDoc) => {
      setSave("saving");
      if (contentTimer.current) clearTimeout(contentTimer.current);
      contentTimer.current = setTimeout(() => {
        api
          .saveChart(id, { content: next })
          .then(() => setSave("saved"))
          .catch(() => setSave("error"));
      }, 600);
    },
    [id],
  );

  const update = useCallback(
    (mut: (d: ChartDoc) => ChartDoc) => {
      setDoc((prev) => {
        const next = mut(structuredClone(prev));
        persistContent(next);
        return next;
      });
    },
    [persistContent],
  );

  const onName = (v: string) => {
    setName(v);
    setSave("saving");
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => {
      api
        .saveChart(id, { name: v.trim() || "Graphique sans titre" })
        .then(() => setSave("saved"))
        .catch(() => setSave("error"));
    }, 600);
  };

  const currentType = CHART_TYPES.find((t) => t.id === doc.type)!;

  // ── Assistant IA ──
  const aiChartContext = () => {
    if (!doc.categories.length) return "";
    const header = ["Catégorie", ...doc.series.map((s) => s.name)].join("\t");
    const rows = doc.categories.map((c, i) =>
      [c, ...doc.series.map((s) => s.data[i] ?? "")].join("\t"),
    );
    return [header, ...rows].join("\n");
  };
  const applyAiChart = (chart: AiChart) => {
    update(() => ({
      type: (CHART_TYPES.some((t) => t.id === chart.type) ? chart.type : "bar") as ChartType,
      categories: chart.categories.length ? chart.categories : ["A", "B", "C"],
      series: chart.series.length ? chart.series : [{ name: "Série 1", data: [0, 0, 0] }],
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête */}
      <header className="relative z-30 h-16 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 flex items-center gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted mb-0.5">
            <Home className="size-3" />
            {crumbs.map((c) => (
              <span key={c.id} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="size-3 shrink-0" />
                <span className="truncate max-w-[140px]">{c.name}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 shrink-0 text-amber-400" />
            <input
              value={name}
              onChange={(e) => onName(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-white/30"
              placeholder="Graphique sans titre"
            />
          </div>
        </div>

        {/* Sélecteur de type (la petite flèche) */}
        <div className="relative">
          <button
            onClick={() => setTypeOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/85 hover:bg-white/10 transition"
          >
            {currentType.label}
            <ChevronDown className={cn("size-4 transition", typeOpen && "rotate-180")} />
          </button>
          {typeOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setTypeOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-white/10 bg-[#0f1017]/95 backdrop-blur-xl p-1.5 shadow-2xl animate-in">
                {["Barres", "Courbes", "Proportions", "Autres"].map((group) => (
                  <div key={group}>
                    <p className="px-2.5 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted">{group}</p>
                    {CHART_TYPES.filter((t) => t.group === group).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          update((d) => ({ ...d, type: t.id }));
                          setTypeOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-lg px-2.5 h-9 text-sm text-left transition",
                          t.id === doc.type ? "bg-brand-500/20 text-white" : "text-white/75 hover:bg-white/5",
                        )}
                      >
                        {t.label}
                        {t.id === doc.type && <Check className="size-4 ml-auto text-brand-300" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <AiAssistant
          kind="chart"
          title="Assistant graphique"
          accent="#f59e0b"
          getContext={aiChartContext}
          onApplyChart={applyAiChart}
          placeholder="Ex. « ventes par trimestre en courbe », « répartition du budget »…"
          quickActions={[
            { action: "generate", label: "Depuis les données" },
          ]}
        />

        <div className="flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? (
            <><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>
          ) : save === "error" ? (
            <span className="text-red-400">Erreur</span>
          ) : (
            <><Check className="size-3.5 text-emerald-400" /> Enregistré</>
          )}
        </div>
      </header>

      {/* Corps : données à gauche, graphique à droite */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-[340px_1fr] overflow-hidden">
        {/* Données */}
        <aside className="border-r border-white/10 bg-white/[0.02] overflow-auto p-4 hidden lg:block">
          <DataEditor doc={doc} update={update} />
        </aside>

        {/* Graphique */}
        <main className="min-h-0 overflow-auto p-4 sm:p-6">
          <div className="h-full min-h-[60vh] rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-4 sm:p-6">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={380}>
                {renderChart(doc)}
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
          </div>
          {/* Données en mobile (accessibilité : table toujours dispo) */}
          <div className="mt-4 lg:hidden">
            <DataEditor doc={doc} update={update} />
          </div>
        </main>
      </div>
    </div>
  );
}

// ---- Rendu du graphique selon le type ----
function toRows(doc: ChartDoc) {
  return doc.categories.map((cat, i) => {
    const row: Record<string, string | number> = { cat };
    doc.series.forEach((s) => (row[s.name] = s.data[i] ?? 0));
    return row;
  });
}

function renderChart(doc: ChartDoc) {
  const rows = toRows(doc);
  const legend = <Legend wrapperStyle={{ fontSize: 12, color: "#c3c2b7" }} />;
  const showLegend = doc.series.length >= 2;

  switch (doc.type) {
    case "bar":
    case "bar-stacked": {
      const stacked = doc.type === "bar-stacked";
      return (
        <BarChart data={rows} barGap={2} barCategoryGap="20%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="cat" tick={AXIS} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} {...TOOLTIP} />
          {showLegend && legend}
          {doc.series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} fill={seriesColor(i)} stackId={stacked ? "s" : undefined} radius={stacked ? 0 : [4, 4, 0, 0]} maxBarSize={48} />
          ))}
        </BarChart>
      );
    }
    case "bar-horizontal":
      return (
        <BarChart data={rows} layout="vertical" barGap={2} barCategoryGap="20%">
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="cat" tick={AXIS} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} width={80} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} {...TOOLTIP} />
          {showLegend && legend}
          {doc.series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} fill={seriesColor(i)} radius={[0, 4, 4, 0]} maxBarSize={40} />
          ))}
        </BarChart>
      );
    case "line":
      return (
        <LineChart data={rows}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="cat" tick={AXIS} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <Tooltip {...TOOLTIP} />
          {showLegend && legend}
          {doc.series.map((s, i) => (
            <Line key={s.name} dataKey={s.name} stroke={seriesColor(i)} strokeWidth={2} dot={{ r: 3, fill: seriesColor(i), strokeWidth: 0 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      );
    case "area":
      return (
        <AreaChart data={rows}>
          <defs>
            {doc.series.map((s, i) => (
              <linearGradient key={s.name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColor(i)} stopOpacity={0.5} />
                <stop offset="100%" stopColor={seriesColor(i)} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="cat" tick={AXIS} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.12)" }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <Tooltip {...TOOLTIP} />
          {showLegend && legend}
          {doc.series.map((s, i) => (
            <Area key={s.name} dataKey={s.name} stroke={seriesColor(i)} strokeWidth={2} fill={`url(#grad-${i})`} />
          ))}
        </AreaChart>
      );
    case "pie":
    case "doughnut": {
      const pieData = doc.categories.map((c, i) => ({ name: c, value: doc.series[0]?.data[i] ?? 0 }));
      return (
        <PieChart>
          <Tooltip {...TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#c3c2b7" }} />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            innerRadius={doc.type === "doughnut" ? "55%" : 0}
            outerRadius="80%"
            paddingAngle={2}
            stroke="#07070c"
            strokeWidth={2}
            label={(e: { name?: string }) => e.name ?? ""}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={seriesColor(i)} />
            ))}
          </Pie>
        </PieChart>
      );
    }
    case "radar":
      return (
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis dataKey="cat" tick={AXIS} />
          <PolarRadiusAxis tick={AXIS} axisLine={false} />
          <Tooltip {...TOOLTIP} />
          {showLegend && legend}
          {doc.series.map((s, i) => (
            <Radar key={s.name} dataKey={s.name} stroke={seriesColor(i)} strokeWidth={2} fill={seriesColor(i)} fillOpacity={0.18} />
          ))}
        </RadarChart>
      );
    case "scatter":
      return (
        <ScatterChart>
          <CartesianGrid stroke={GRID} />
          <XAxis
            type="number"
            dataKey="x"
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            domain={[-0.5, doc.categories.length - 0.5]}
            ticks={doc.categories.map((_, i) => i)}
            tickFormatter={(v: number) => doc.categories[v] ?? ""}
          />
          <YAxis type="number" dataKey="y" tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <ZAxis range={[60, 60]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} {...TOOLTIP} />
          {showLegend && legend}
          {doc.series.map((s, i) => (
            <Scatter key={s.name} name={s.name} data={s.data.map((y, xi) => ({ x: xi, y }))} fill={seriesColor(i)} />
          ))}
        </ScatterChart>
      );
    default:
      return <div />;
  }
}

// ---- Éditeur de données ----
function DataEditor({ doc, update }: { doc: ChartDoc; update: (m: (d: ChartDoc) => ChartDoc) => void }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Données</h3>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-muted">
              <th className="p-2 text-left font-medium">Catégorie</th>
              {doc.series.map((s, si) => (
                <th key={si} className="p-1">
                  <div className="flex items-center gap-1">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: seriesColor(si) }} />
                    <input
                      value={s.name}
                      onChange={(e) => update((d) => { d.series[si].name = e.target.value; return d; })}
                      className="w-full min-w-0 bg-transparent font-medium text-ink outline-none"
                    />
                    {doc.series.length > 1 && (
                      <button
                        onClick={() => update((d) => { d.series.splice(si, 1); return d; })}
                        className="shrink-0 text-muted hover:text-red-400"
                        title="Supprimer la série"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.categories.map((cat, ri) => (
              <tr key={ri} className="border-b border-white/5 last:border-0 group">
                <td className="p-1">
                  <div className="flex items-center gap-1">
                    <input
                      value={cat}
                      onChange={(e) => update((d) => { d.categories[ri] = e.target.value; return d; })}
                      className="w-full min-w-0 bg-transparent text-ink outline-none"
                    />
                    {doc.categories.length > 1 && (
                      <button
                        onClick={() => update((d) => { d.categories.splice(ri, 1); d.series.forEach((s) => s.data.splice(ri, 1)); return d; })}
                        className="shrink-0 text-muted opacity-0 group-hover:opacity-100 hover:text-red-400"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                {doc.series.map((s, si) => (
                  <td key={si} className="p-1">
                    <input
                      type="number"
                      value={s.data[ri] ?? 0}
                      onChange={(e) => update((d) => { d.series[si].data[ri] = Number(e.target.value); return d; })}
                      className="w-full min-w-[56px] rounded-md bg-white/5 px-2 py-1 text-ink outline-none focus:bg-white/10"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => update((d) => { d.categories.push(`Cat. ${d.categories.length + 1}`); d.series.forEach((s) => s.data.push(0)); return d; })}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition"
        >
          <Plus className="size-3.5" /> Ligne
        </button>
        <button
          onClick={() => update((d) => { d.series.push({ name: `Série ${d.series.length + 1}`, data: d.categories.map(() => 0) }); return d; })}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition"
        >
          <Plus className="size-3.5" /> Série
        </button>
      </div>
    </div>
  );
}
