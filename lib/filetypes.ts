// Maps mime types / extensions to a category, an accent color and a label.
// Used for icons and previews across the UI.

export type FileCategory =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "code"
  | "text"
  | "other";

export function categoryOf(mime: string | null, name = ""): FileCategory {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!mime && !ext) return "other";
  const m = mime ?? "";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) return "archive";
  if (
    ["doc", "docx", "odt", "rtf"].includes(ext) ||
    m.includes("word") ||
    m.includes("opendocument.text")
  )
    return "document";
  if (
    ["xls", "xlsx", "ods", "csv"].includes(ext) ||
    m.includes("sheet") ||
    m.includes("excel")
  )
    return "spreadsheet";
  if (["ppt", "pptx", "odp"].includes(ext) || m.includes("presentation"))
    return "presentation";
  if (
    ["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "cs", "go", "rs", "rb", "php", "html", "css", "json", "xml", "yml", "yaml", "sh", "sql"].includes(
      ext,
    )
  )
    return "code";
  if (m.startsWith("text/") || ["txt", "md", "log"].includes(ext)) return "text";
  return "other";
}

export const CATEGORY_META: Record<
  FileCategory,
  { label: string; color: string; bg: string }
> = {
  folder: { label: "Dossier", color: "#f59e0b", bg: "#fef3c7" },
  image: { label: "Image", color: "#ec4899", bg: "#fce7f3" },
  video: { label: "Vidéo", color: "#8b5cf6", bg: "#ede9fe" },
  audio: { label: "Audio", color: "#06b6d4", bg: "#cffafe" },
  pdf: { label: "PDF", color: "#ef4444", bg: "#fee2e2" },
  document: { label: "Document", color: "#3b82f6", bg: "#dbeafe" },
  spreadsheet: { label: "Feuille", color: "#10b981", bg: "#d1fae5" },
  presentation: { label: "Présentation", color: "#f97316", bg: "#ffedd5" },
  archive: { label: "Archive", color: "#a16207", bg: "#fef9c3" },
  code: { label: "Code", color: "#6366f1", bg: "#e0e7ff" },
  text: { label: "Texte", color: "#64748b", bg: "#f1f5f9" },
  other: { label: "Fichier", color: "#64748b", bg: "#f1f5f9" },
};

export function isPreviewableInline(cat: FileCategory): boolean {
  return ["image", "video", "audio", "pdf", "text", "code"].includes(cat);
}
