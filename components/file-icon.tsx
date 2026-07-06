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
  type: "folder" | "file" | "doc";
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
