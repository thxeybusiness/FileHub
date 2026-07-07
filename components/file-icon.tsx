"use client";

import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  FileType,
  Presentation,
  BarChart3,
  BarChartHorizontal,
  BarChart4,
  LineChart,
  AreaChart,
  PieChart,
  Donut,
  Radar,
  ScatterChart,
  Pencil,
  File as FileIcon,
  type LucideIcon,
} from "lucide-react";
import { categoryOf, CATEGORY_META, type FileCategory } from "@/lib/filetypes";

// Icône + teinte par type de graphique (les familles partagent une teinte,
// mais chaque type a une forme distincte).
const CHART_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  bar: { icon: BarChart3, color: "#f59e0b" }, // Barres verticales — ambre
  "bar-horizontal": { icon: BarChartHorizontal, color: "#f59e0b" },
  "bar-stacked": { icon: BarChart4, color: "#f59e0b" },
  line: { icon: LineChart, color: "#22d3ee" }, // Courbes — cyan
  area: { icon: AreaChart, color: "#22d3ee" },
  pie: { icon: PieChart, color: "#a78bff" }, // Proportions — violet
  doughnut: { icon: Donut, color: "#a78bff" },
  radar: { icon: Radar, color: "#34d399" }, // Autres — vert
  scatter: { icon: ScatterChart, color: "#fb7185" },
};

const ICONS: Record<FileCategory, LucideIcon> = {
  folder: Folder,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileType,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  archive: FileArchive,
  code: FileCode,
  text: FileText,
  other: FileIcon,
};

export function NodeIcon({
  type,
  mimeType,
  name,
  color,
  size = 20,
  className = "",
}: {
  type: "folder" | "file" | "doc" | "sheet" | "chart" | "draw";
  mimeType?: string | null;
  name?: string;
  color?: string | null;
  size?: number;
  className?: string;
}) {
  // Un document du traitement de texte a sa propre icône bleue.
  if (type === "doc") {
    return (
      <FileText
        style={{ color: "#5b8bff" }}
        width={size}
        height={size}
        className={className}
        strokeWidth={1.75}
      />
    );
  }
  // Une feuille de calcul a son icône verte.
  if (type === "sheet") {
    return (
      <FileSpreadsheet
        style={{ color: "#10b981" }}
        width={size}
        height={size}
        className={className}
        strokeWidth={1.75}
      />
    );
  }
  // Un graphique : une icône ET une teinte propres à chaque type, pour les
  // distinguer d'un coup d'œil dans le Drive. Le type est encodé dans le
  // mimeType (« application/vnd.filehub.chart+<type> »).
  if (type === "chart") {
    const kind = mimeType?.split("+")[1] ?? "bar";
    const { icon: ChartIcon, color } = CHART_ICONS[kind] ?? CHART_ICONS.bar;
    return (
      <ChartIcon
        style={{ color }}
        width={size}
        height={size}
        className={className}
        strokeWidth={1.75}
      />
    );
  }
  // Un dessin a son icône rose.
  if (type === "draw") {
    return (
      <Pencil
        style={{ color: "#ec4899" }}
        width={size}
        height={size}
        className={className}
        strokeWidth={1.75}
      />
    );
  }
  const cat: FileCategory = type === "folder" ? "folder" : categoryOf(mimeType ?? null, name);
  const Icon = ICONS[cat];
  const accent = type === "folder" && color ? color : CATEGORY_META[cat].color;
  return (
    <Icon
      style={{ color: accent }}
      width={size}
      height={size}
      className={className}
      strokeWidth={type === "folder" ? 2 : 1.75}
      {...(type === "folder" ? { fill: accent, fillOpacity: 0.15 } : {})}
    />
  );
}
