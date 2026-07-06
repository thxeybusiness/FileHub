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
  File as FileIcon,
  type LucideIcon,
} from "lucide-react";
import { categoryOf, CATEGORY_META, type FileCategory } from "@/lib/filetypes";

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
  type: "folder" | "file" | "doc" | "sheet" | "chart";
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
  // Un graphique a son icône ambre.
  if (type === "chart") {
    return (
      <BarChart3
        style={{ color: "#f59e0b" }}
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
