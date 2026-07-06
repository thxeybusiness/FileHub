// Palette catégorielle validée (colonne mode sombre du guide dataviz),
// ordre FIXE — jamais recyclé. Secondary encoding assuré par la légende +
// labels directs. Validée par scripts/validate_palette.js (--mode dark).
export const CHART_PALETTE = [
  "#3987e5", // blue
  "#199e70", // aqua
  "#c98500", // yellow
  "#33a333", // green (éclairci vs #008300 pour le fond très sombre)
  "#9085e9", // violet
  "#e66767", // red
  "#d55181", // magenta
  "#d95926", // orange
];

export function seriesColor(i: number): string {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}

export type ChartType =
  | "bar"
  | "bar-horizontal"
  | "bar-stacked"
  | "line"
  | "area"
  | "pie"
  | "doughnut"
  | "radar"
  | "scatter";

export const CHART_TYPES: {
  id: ChartType;
  label: string;
  group: "Barres" | "Courbes" | "Proportions" | "Autres";
}[] = [
  { id: "bar", label: "Barres verticales", group: "Barres" },
  { id: "bar-horizontal", label: "Barres horizontales", group: "Barres" },
  { id: "bar-stacked", label: "Barres empilées", group: "Barres" },
  { id: "line", label: "Lignes", group: "Courbes" },
  { id: "area", label: "Aires", group: "Courbes" },
  { id: "pie", label: "Secteurs", group: "Proportions" },
  { id: "doughnut", label: "Anneau", group: "Proportions" },
  { id: "radar", label: "Radar", group: "Autres" },
  { id: "scatter", label: "Nuage de points", group: "Autres" },
];

// Les 3 types proposés dans la petite flèche du bouton "Graphique".
export const QUICK_CHART_TYPES: ChartType[] = ["bar", "line", "pie"];

export type ChartDoc = {
  type: ChartType;
  categories: string[];
  series: { name: string; data: number[] }[];
};

export function defaultChartDoc(type: ChartType = "bar"): ChartDoc {
  return {
    type,
    categories: ["Janvier", "Février", "Mars", "Avril", "Mai"],
    series: [
      { name: "Série 1", data: [12, 19, 9, 17, 22] },
      { name: "Série 2", data: [8, 11, 14, 9, 13] },
    ],
  };
}
