import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** Human-readable byte size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number | bigint, decimals = 1): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (!n) return "0 B";
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), UNITS.length - 1);
  const value = n / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${UNITS[i]}`;
}

/** Relative time like "3 min ago", falling back to a date for older items. */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `il y a ${day} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
