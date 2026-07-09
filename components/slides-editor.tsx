"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, Presentation, Plus, Trash2, Play, X,
  Type, Square, Circle, Minus, MoveUpRight, ImageIcon, Copy, ChevronUp, ChevronDown,
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  LayoutTemplate, Undo2, Redo2, BringToFront, SendToBack, Sparkles as SparkleIcon,
  PaintBucket, Blend, Droplets, Frame, Triangle, Diamond, Hexagon, Star, Target,
  ArrowBigRight, ChevronsRight, Slash, Sunrise, Cloud, Waves, Activity, Equal,
  MoreHorizontal, Grip, Hash, PartyPopper, Crop, PanelLeft, PanelBottom, Layers,
  Aperture, Lock, LockOpen, FlipHorizontal, FlipVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  ArrowUp, ArrowDown, CaseUpper, Shapes,
  TrendingUp, TrendingDown, RefreshCw, MousePointerClick, ArrowRight, ArrowUpRight, Repeat, Send,
  Briefcase, Trophy, Award, Rocket, Lightbulb, PieChart, BarChart3, LineChart, Coins,
  CreditCard, DollarSign, ShoppingCart, Store, Building2, Handshake, Gauge, Timer,
  User, Users, UserPlus, Smile, Heart, ThumbsUp, MessageCircle, Megaphone, Mail, Phone, Camera, Music, Gift,
  Laptop, Smartphone, Globe, Wifi, Database, Server, Code, Cpu, ShieldCheck, KeyRound,
  Search, Settings, Zap, Link2, Sun, Moon, Flame, Leaf, Coffee, MapPin, Calendar, Clock,
  CheckCircle2, XCircle, AlertTriangle, Info, Bookmark, Flag, Eye, Puzzle, Palette,
  Pencil, Wrench, GraduationCap, BookOpen, FileText, Folder,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";
import { useCollab } from "./use-collab";
import { CollabBar } from "./collab-bar";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

const W = 1280;
const H = 720;
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

type ElType = "text" | "rect" | "ellipse" | "line" | "arrow" | "image" | "shape" | "icon" | "pattern";
type El = {
  id: string; type: ElType; x: number; y: number; w: number; h: number; rot: number;
  // Texte
  text?: string; size?: number; font?: string; weight?: number; italic?: boolean; underline?: boolean;
  align?: "left" | "center" | "right"; vAlign?: "top" | "middle" | "bottom"; color?: string; lineHeight?: number;
  letterSpacing?: number; upper?: boolean; fx?: string; fxColor?: string; bgFill?: string;
  // Formes / images / icônes / motifs
  fill?: string; stroke?: string; strokeW?: number; radius?: number; opacity?: number; src?: string;
  shadow?: string; dash?: boolean; both?: boolean; flipH?: boolean; flipV?: boolean;
  shape?: string; icon?: string; gap?: number; dot?: number;
  locked?: boolean;
};
type Slide = { id: string; bg: string; els: El[] };
type Deck = { theme: string; slides: Slide[] };

// ── Polices ──────────────────────────────────────────────────────────
const FONTS: { key: string; label: string; css: string }[] = [
  { key: "sans", label: "Sans", css: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif' },
  { key: "serif", label: "Serif", css: 'Georgia, "Times New Roman", serif' },
  { key: "round", label: "Arrondi", css: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
  { key: "condensed", label: "Condensé", css: '"Arial Narrow", "Helvetica Neue", sans-serif' },
  { key: "display", label: "Impact", css: 'Impact, "Arial Black", "Franklin Gothic Bold", sans-serif' },
  { key: "script", label: "Manuscrit", css: '"Segoe Script", "Bradley Hand", "Comic Sans MS", cursive' },
  { key: "slab", label: "Slab", css: 'Rockwell, "Roboto Slab", "Courier New", serif' },
  { key: "mono", label: "Mono", css: 'ui-monospace, "SF Mono", Menlo, monospace' },
];
const fontCss = (k?: string) => FONTS.find((f) => f.key === k)?.css ?? FONTS[0].css;

type Theme = { name: string; label: string; bg: string; text: string; accent: string; head: string; body: string };
const THEMES: Theme[] = [
  { name: "aurore", label: "Aurore", bg: "linear-gradient(135deg,#0b1020,#1a1140 55%,#241247)", text: "#eef1ff", accent: "#5b8bff", head: "sans", body: "sans" },
];
const themeOf = (name: string) => THEMES.find((t) => t.name === name) ?? THEMES[0];

// Palette dérivée du fond courant : texte sombre sur fond clair, etc.
type Pal = { text: string; accent: string; faint: string; head: string; body: string };
function lumOf(c: string): number {
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})\b/i)?.[1];
  if (hex) {
    const f = hex.length === 3 ? hex.split("").map((x) => x + x).join("") : hex;
    const n = parseInt(f, 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  }
  const rgb = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) return (0.2126 * +rgb[1] + 0.7152 * +rgb[2] + 0.0722 * +rgb[3]) / 255;
  return 0.1;
}
function paletteFor(bg: string): Pal {
  const light = lumOf(extractColors(bg)[0] ?? "#0a0e1a") > 0.55;
  return light
    ? { text: "#151821", accent: "#3b6dff", faint: "rgba(0,0,0,0.06)", head: "sans", body: "sans" }
    : { text: "#ffffff", accent: "#5b8bff", faint: "rgba(255,255,255,0.08)", head: "sans", body: "sans" };
}

const SWATCHES = ["#ffffff", "#0a0a0a", "#5b8bff", "#7b3bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff", "#94a3b8"];
const BG_SWATCHES = [...SWATCHES, "#0a0e1a", "#1e293b", "#f5f1e8", "#0f766e", "#7c2d12", "#fde68a"];

// ── Fond personnalisable (uni / dégradé / radial / image) ────────────
type BgKind = "solid" | "linear" | "radial" | "image";
type BgModel = { kind: BgKind; angle: number; colors: string[]; pos: string; src?: string; dim?: number };

const GRADIENTS: string[][] = [
  ["#3b6dff", "#7b3bff"], ["#0f766e", "#10b981"], ["#ff6b6b", "#ff9e7d"],
  ["#0b1020", "#241247"], ["#f5576c", "#f093fb"], ["#4facfe", "#00f2fe"],
  ["#fa709a", "#fee140"], ["#30cfd0", "#330867"], ["#a8edea", "#fed6e3"],
  ["#232526", "#414345"], ["#c2410c", "#fbbf24"], ["#06b6d4", "#3b82f6", "#8b5cf6"],
  ["#667eea", "#764ba2"], ["#f83600", "#f9d423"], ["#00c6ff", "#0072ff"],
  ["#11998e", "#38ef7d"], ["#ee0979", "#ff6a00"], ["#8e2de2", "#4a00e0"],
];

function extractColors(s: string): string[] {
  return s.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g) ?? [];
}
function parseBg(bg: string): BgModel {
  const s = (bg || "").trim();
  if (s.includes("url(")) {
    const src = s.match(/url\((?:"|')?([^)"']+)(?:"|')?\)/)?.[1] ?? "";
    const dim = Number(s.match(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/)?.[1] ?? 0);
    return { kind: "image", angle: 135, colors: ["#0a0e1a"], pos: "50% 50%", src, dim };
  }
  const lin = s.match(/^linear-gradient\((.*)\)$/i);
  if (lin) {
    const a = lin[1].match(/(-?\d+(?:\.\d+)?)deg/);
    const cols = extractColors(lin[1]);
    return { kind: "linear", angle: a ? Number(a[1]) : 135, colors: cols.length >= 2 ? cols : ["#3b6dff", "#7b3bff"], pos: "50% 50%" };
  }
  const rad = s.match(/^radial-gradient\((.*)\)$/i);
  if (rad) {
    const cols = extractColors(rad[1]);
    const pos = rad[1].match(/at\s+([^,]+),/)?.[1]?.trim() ?? "50% 50%";
    return { kind: "radial", angle: 0, colors: cols.length >= 2 ? cols : ["#3b6dff", "#7b3bff"], pos };
  }
  return { kind: "solid", angle: 135, colors: [s || "#0a0e1a"], pos: "50% 50%" };
}
function buildBg(m: BgModel): string {
  if (m.kind === "image") {
    if (!m.src) return m.colors[0] || "#0a0e1a";
    const dim = m.dim && m.dim > 0 ? `linear-gradient(rgba(0,0,0,${m.dim}),rgba(0,0,0,${m.dim})),` : "";
    return `${dim}url(${m.src}) center/cover no-repeat`;
  }
  if (m.kind === "solid") return m.colors[0] || "#0a0e1a";
  const cols = m.colors.join(",");
  if (m.kind === "radial") return `radial-gradient(circle at ${m.pos},${cols})`;
  return `linear-gradient(${m.angle}deg,${cols})`;
}

// ── Tracés des formes (viewBox = taille logique de l'élément) ────────
function shapePath(kind: string | undefined, w: number, h: number): string {
  const px = (fx: number, fy: number) => `${(fx * w).toFixed(2)} ${(fy * h).toFixed(2)}`;
  const poly = (pts: [number, number][]) => "M " + pts.map(([a, b]) => px(a, b)).join(" L ") + " Z";
  const ngon = (n: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = ((-90 + (360 * i) / n) * Math.PI) / 180;
      pts.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]);
    }
    return poly(pts);
  };
  switch (kind) {
    case "triangle": return poly([[0.5, 0], [1, 1], [0, 1]]);
    case "diamond": return poly([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]);
    case "pentagon": return ngon(5);
    case "hexagon": return ngon(6);
    case "star": {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = ((-90 + 36 * i) * Math.PI) / 180;
        const r = i % 2 === 0 ? 0.5 : 0.21;
        pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]);
      }
      return poly(pts);
    }
    case "star4":
      return `M ${px(0.5, 0)} C ${px(0.56, 0.36)} ${px(0.64, 0.44)} ${px(1, 0.5)} C ${px(0.64, 0.56)} ${px(0.56, 0.64)} ${px(0.5, 1)} C ${px(0.44, 0.64)} ${px(0.36, 0.56)} ${px(0, 0.5)} C ${px(0.36, 0.44)} ${px(0.44, 0.36)} ${px(0.5, 0)} Z`;
    case "chevron": return poly([[0, 0], [0.72, 0], [1, 0.5], [0.72, 1], [0, 1], [0.28, 0.5]]);
    case "arrowBlock": return poly([[0, 0.28], [0.62, 0.28], [0.62, 0], [1, 0.5], [0.62, 1], [0.62, 0.72], [0, 0.72]]);
    case "para": return poly([[0.22, 0], [1, 0], [0.78, 1], [0, 1]]);
    case "trap": return poly([[0.2, 0], [0.8, 0], [1, 1], [0, 1]]);
    case "cross": return poly([[0.34, 0], [0.66, 0], [0.66, 0.34], [1, 0.34], [1, 0.66], [0.66, 0.66], [0.66, 1], [0.34, 1], [0.34, 0.66], [0, 0.66], [0, 0.34], [0.34, 0.34]]);
    case "half": return `M ${px(0, 1)} A ${(w / 2).toFixed(2)} ${h.toFixed(2)} 0 0 1 ${px(1, 1)} Z`;
    case "ring":
      return `M ${px(1, 0.5)} A ${(w / 2).toFixed(2)} ${(h / 2).toFixed(2)} 0 1 0 ${px(0, 0.5)} A ${(w / 2).toFixed(2)} ${(h / 2).toFixed(2)} 0 1 0 ${px(1, 0.5)} Z M ${px(0.84, 0.5)} A ${(w * 0.34).toFixed(2)} ${(h * 0.34).toFixed(2)} 0 1 1 ${px(0.16, 0.5)} A ${(w * 0.34).toFixed(2)} ${(h * 0.34).toFixed(2)} 0 1 1 ${px(0.84, 0.5)} Z`;
    case "blob1":
      return `M ${px(0.83, 0.09)} C ${px(0.97, 0.22)} ${px(1, 0.5)} ${px(0.9, 0.71)} C ${px(0.8, 0.92)} ${px(0.54, 1)} ${px(0.33, 0.94)} C ${px(0.13, 0.88)} ${px(0.01, 0.66)} ${px(0.03, 0.44)} C ${px(0.05, 0.21)} ${px(0.26, 0.02)} ${px(0.5, 0.01)} C ${px(0.66, 0)} ${px(0.72, 0)} ${px(0.83, 0.09)} Z`;
    case "blob2":
      return `M ${px(0.72, 0.04)} C ${px(0.92, 0.12)} ${px(1, 0.38)} ${px(0.95, 0.6)} C ${px(0.9, 0.84)} ${px(0.68, 1)} ${px(0.45, 0.97)} C ${px(0.24, 0.94)} ${px(0.03, 0.78)} ${px(0.02, 0.55)} C ${px(0.01, 0.3)} ${px(0.2, 0.08)} ${px(0.45, 0.03)} C ${px(0.55, 0.01)} ${px(0.62, 0)} ${px(0.72, 0.04)} Z`;
    case "wave":
      return `M ${px(0, 0.5)} C ${px(0.18, 0.2)} ${px(0.32, 0.8)} ${px(0.5, 0.55)} C ${px(0.68, 0.3)} ${px(0.82, 0.7)} ${px(1, 0.45)} L ${px(1, 1)} L ${px(0, 1)} Z`;
    case "zigzag": {
      const pts: string[] = [];
      for (let i = 0; i <= 6; i++) pts.push(px(i / 6, i % 2 ? 0.1 : 0.9));
      return "M " + pts.join(" L ");
    }
    default: return poly([[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
}

const SHAPE_LABELS: Record<string, string> = {
  triangle: "Triangle", diamond: "Losange", pentagon: "Pentagone", hexagon: "Hexagone",
  star: "Étoile", star4: "Éclat", chevron: "Chevron", arrowBlock: "Flèche pleine",
  para: "Parallélogramme", trap: "Trapèze", cross: "Croix", half: "Demi-cercle",
  ring: "Anneau", blob1: "Blob", blob2: "Blob 2", wave: "Vague", zigzag: "Zigzag",
};
const SHAPES_MENU: { k: string; l: string; i: LucideIcon }[] = [
  { k: "rect", l: "Rectangle", i: Square }, { k: "ellipse", l: "Ellipse", i: Circle },
  { k: "triangle", l: "Triangle", i: Triangle }, { k: "diamond", l: "Losange", i: Diamond },
  { k: "pentagon", l: "Pentagone", i: Shapes }, { k: "hexagon", l: "Hexagone", i: Hexagon },
  { k: "star", l: "Étoile", i: Star }, { k: "star4", l: "Éclat", i: SparkleIcon },
  { k: "ring", l: "Anneau", i: Target }, { k: "half", l: "Demi-cercle", i: Sunrise },
  { k: "arrowBlock", l: "Flèche pleine", i: ArrowBigRight }, { k: "chevron", l: "Chevron", i: ChevronsRight },
  { k: "para", l: "Parallélogramme", i: Slash }, { k: "trap", l: "Trapèze", i: Triangle },
  { k: "cross", l: "Croix", i: Plus }, { k: "blob1", l: "Blob", i: Cloud },
  { k: "blob2", l: "Blob 2", i: Cloud }, { k: "wave", l: "Vague", i: Waves },
  { k: "zigzag", l: "Zigzag", i: Activity },
];

// ── Bibliothèque d'icônes insérables ─────────────────────────────────
const ICON_LIB: { label: string; items: { n: string; c: LucideIcon }[] }[] = [
  { label: "Flèches & tendances", items: [
    { n: "ArrowRight", c: ArrowRight }, { n: "ArrowUpRight", c: ArrowUpRight }, { n: "TrendingUp", c: TrendingUp },
    { n: "TrendingDown", c: TrendingDown }, { n: "RefreshCw", c: RefreshCw }, { n: "Repeat", c: Repeat },
    { n: "MousePointerClick", c: MousePointerClick }, { n: "Send", c: Send },
  ] },
  { label: "Business", items: [
    { n: "Briefcase", c: Briefcase }, { n: "Target", c: Target }, { n: "Trophy", c: Trophy }, { n: "Award", c: Award },
    { n: "Rocket", c: Rocket }, { n: "Lightbulb", c: Lightbulb }, { n: "PieChart", c: PieChart }, { n: "BarChart3", c: BarChart3 },
    { n: "LineChart", c: LineChart }, { n: "Coins", c: Coins }, { n: "CreditCard", c: CreditCard }, { n: "DollarSign", c: DollarSign },
    { n: "ShoppingCart", c: ShoppingCart }, { n: "Store", c: Store }, { n: "Building2", c: Building2 }, { n: "Handshake", c: Handshake },
    { n: "Gauge", c: Gauge }, { n: "Timer", c: Timer },
  ] },
  { label: "Personnes & com", items: [
    { n: "User", c: User }, { n: "Users", c: Users }, { n: "UserPlus", c: UserPlus }, { n: "Smile", c: Smile },
    { n: "Heart", c: Heart }, { n: "ThumbsUp", c: ThumbsUp }, { n: "MessageCircle", c: MessageCircle }, { n: "Megaphone", c: Megaphone },
    { n: "Mail", c: Mail }, { n: "Phone", c: Phone }, { n: "Camera", c: Camera }, { n: "Music", c: Music }, { n: "Gift", c: Gift },
  ] },
  { label: "Tech", items: [
    { n: "Laptop", c: Laptop }, { n: "Smartphone", c: Smartphone }, { n: "Globe", c: Globe }, { n: "Wifi", c: Wifi },
    { n: "Cloud", c: Cloud }, { n: "Database", c: Database }, { n: "Server", c: Server }, { n: "Code", c: Code },
    { n: "Cpu", c: Cpu }, { n: "ShieldCheck", c: ShieldCheck }, { n: "KeyRound", c: KeyRound }, { n: "Search", c: Search },
    { n: "Settings", c: Settings }, { n: "Zap", c: Zap }, { n: "Link2", c: Link2 },
  ] },
  { label: "Symboles", items: [
    { n: "Sun", c: Sun }, { n: "Moon", c: Moon }, { n: "Star", c: Star }, { n: "Flame", c: Flame }, { n: "Leaf", c: Leaf },
    { n: "Coffee", c: Coffee }, { n: "MapPin", c: MapPin }, { n: "Calendar", c: Calendar }, { n: "Clock", c: Clock },
    { n: "CheckCircle2", c: CheckCircle2 }, { n: "XCircle", c: XCircle }, { n: "AlertTriangle", c: AlertTriangle },
    { n: "Info", c: Info }, { n: "Bookmark", c: Bookmark }, { n: "Flag", c: Flag }, { n: "Eye", c: Eye },
    { n: "Puzzle", c: Puzzle }, { n: "Palette", c: Palette }, { n: "Pencil", c: Pencil }, { n: "Wrench", c: Wrench },
    { n: "GraduationCap", c: GraduationCap }, { n: "BookOpen", c: BookOpen }, { n: "FileText", c: FileText }, { n: "Folder", c: Folder },
  ] },
];
const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(ICON_LIB.flatMap((g) => g.items.map((i) => [i.n, i.c])));

// ── Ombres ───────────────────────────────────────────────────────────
const SHADOW_OPTIONS = [
  { k: "none", l: "Aucune" }, { k: "soft", l: "Douce" }, { k: "strong", l: "Forte" }, { k: "glow", l: "Lueur" },
];
function glowColor(el: El): string {
  const c = el.fill ?? el.color ?? "#5b8bff";
  return /^#[0-9a-fA-F]{6}$/.test(c) ? `${c}b3` : "#5b8bffb3";
}
function shadowBox(el: El): string | undefined {
  if (el.shadow === "soft") return "0 14px 38px rgba(0,0,0,0.4)";
  if (el.shadow === "strong") return "0 26px 70px rgba(0,0,0,0.6)";
  if (el.shadow === "glow") return `0 0 34px ${glowColor(el)}`;
  return undefined;
}
function shadowFilter(el: El): string | undefined {
  if (el.shadow === "soft") return "drop-shadow(0 10px 22px rgba(0,0,0,0.4))";
  if (el.shadow === "strong") return "drop-shadow(0 18px 42px rgba(0,0,0,0.6))";
  if (el.shadow === "glow") return `drop-shadow(0 0 18px ${glowColor(el)})`;
  return undefined;
}

// ── Effets de texte ──────────────────────────────────────────────────
const TEXT_FX = [
  { k: "none", l: "Aucun" }, { k: "ombre", l: "Ombre" }, { k: "portee", l: "Portée" },
  { k: "neon", l: "Néon" }, { k: "contour", l: "Contour" }, { k: "creux", l: "Creux" }, { k: "degrade", l: "Dégradé" },
];
function textFxStyle(el: El): React.CSSProperties {
  const c = el.fxColor ?? "#000000";
  const sw = Math.max(1, (el.size ?? 40) / 32);
  switch (el.fx) {
    case "ombre": return { textShadow: `0 6px 18px ${c}` };
    case "portee": return { textShadow: `0.045em 0.045em 0 ${c}` };
    case "neon": return { textShadow: `0 0 10px ${c}, 0 0 34px ${c}` };
    case "contour": return { WebkitTextStroke: `${sw}px ${c}` };
    case "creux": return { color: "transparent", WebkitTextStroke: `${sw}px ${el.color ?? "#fff"}` };
    case "degrade": return { backgroundImage: `linear-gradient(90deg, ${el.color ?? "#fff"}, ${c})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
    default: return {};
  }
}

const mkText = (p: Partial<El>): El => ({
  id: uid(), type: "text", x: 120, y: 120, w: 400, h: 100, rot: 0,
  text: "Texte", size: 40, font: "sans", weight: 400, align: "left", color: "#ffffff", lineHeight: 1.25, ...p,
});

// ── Décors (éléments posés en arrière-plan, tous éditables) ──────────
const DECOR_GROUPS: { label: string; items: { k: string; l: string; i: LucideIcon }[] }[] = [
  { label: "Formes douces", items: [
    { k: "bulle", l: "Bulle", i: Circle }, { k: "bulles", l: "Bulles", i: Droplets },
    { k: "anneaux", l: "Anneaux", i: Target }, { k: "blob", l: "Blob", i: Cloud },
    { k: "demi", l: "Demi-cercle", i: Sunrise },
  ] },
  { label: "Vagues", items: [
    { k: "vagueBas", l: "Vague en bas", i: Waves }, { k: "vagueHaut", l: "Vague en haut", i: Waves },
  ] },
  { label: "Lignes", items: [
    { k: "trait", l: "Trait diagonal", i: Minus }, { k: "doubleTrait", l: "Double trait", i: Equal },
    { k: "zigzag", l: "Zigzag", i: Activity }, { k: "pointilles", l: "Pointillés", i: MoreHorizontal },
  ] },
  { label: "Motifs", items: [
    { k: "points", l: "Points", i: Grip }, { k: "grille", l: "Grille", i: Hash },
    { k: "confettis", l: "Confettis", i: PartyPopper }, { k: "etoiles", l: "Étoiles", i: SparkleIcon },
  ] },
  { label: "Cadres & bandes", items: [
    { k: "cadre", l: "Cadre", i: Frame }, { k: "coins", l: "Coins", i: Crop },
    { k: "bandeG", l: "Bande latérale", i: PanelLeft }, { k: "bandeBas", l: "Bande en bas", i: PanelBottom },
  ] },
  { label: "Voiles", items: [
    { k: "voile", l: "Voile sombre", i: Layers }, { k: "vignette", l: "Vignette", i: Aperture },
  ] },
];

function decorEls(kind: string, accent: string): El[] {
  const bubble = (x: number, y: number, d: number, fill: string, opacity: number): El =>
    ({ id: uid(), type: "ellipse", x, y, w: d, h: d, rot: 0, fill, opacity });
  const shape = (shp: string, x: number, y: number, w2: number, h2: number, p: Partial<El> = {}): El =>
    ({ id: uid(), type: "shape", shape: shp, x, y, w: w2, h: h2, rot: 0, fill: accent, opacity: 0.2, ...p });
  const CONFETTI = ["#fbbf24", "#f472b6", "#34d399", "#5b8bff", "#f97316", "#a78bff", "#22d3ee", "#ec4899"];
  switch (kind) {
    case "bulle":
      return [bubble(870, -150, 540, accent, 0.16)];
    case "bulles":
      return [
        bubble(-110, 420, 320, accent, 0.13), bubble(150, -90, 190, "#ffffff", 0.1),
        bubble(1010, 90, 260, accent, 0.17), bubble(780, 540, 150, "#ffffff", 0.1),
      ];
    case "anneaux":
      return [
        shape("ring", 950, 40, 300, 300, { opacity: 0.25 }),
        shape("ring", 50, 470, 180, 180, { fill: "#ffffff", opacity: 0.18 }),
      ];
    case "blob":
      return [shape("blob1", 860, 340, 500, 440, { opacity: 0.18 })];
    case "demi":
      return [shape("half", -80, 540, 440, 180, { opacity: 0.15 })];
    case "vagueBas":
      return [
        shape("wave", 0, 480, 1280, 240, { opacity: 0.2 }),
        shape("wave", 0, 540, 1280, 180, { fill: "#ffffff", opacity: 0.09 }),
      ];
    case "vagueHaut":
      return [
        shape("wave", 0, 0, 1280, 240, { rot: 180, opacity: 0.2 }),
        shape("wave", 0, 0, 1280, 180, { rot: 180, fill: "#ffffff", opacity: 0.09 }),
      ];
    case "trait":
      return [{ id: uid(), type: "rect", x: -80, y: 300, w: 1440, h: 12, rot: -16, fill: accent, radius: 6, opacity: 0.55 }];
    case "doubleTrait":
      return [
        { id: uid(), type: "rect", x: -80, y: 310, w: 1440, h: 6, rot: -16, fill: accent, radius: 3, opacity: 0.55 },
        { id: uid(), type: "rect", x: -80, y: 345, w: 1440, h: 6, rot: -16, fill: "#ffffff", radius: 3, opacity: 0.25 },
      ];
    case "zigzag":
      return [shape("zigzag", 390, 600, 500, 50, { fill: "none", stroke: accent, strokeW: 6, opacity: 0.8 })];
    case "pointilles":
      return [{ id: uid(), type: "line", x: 90, y: 640, w: 1100, h: 10, rot: 0, stroke: "#ffffff", strokeW: 4, dash: true, opacity: 0.5 }];
    case "points":
      return [{ id: uid(), type: "pattern", shape: "dots", x: 820, y: 60, w: 400, h: 290, rot: 0, fill: accent, gap: 30, dot: 5, opacity: 0.5 }];
    case "grille":
      return [{ id: uid(), type: "pattern", shape: "grid", x: 60, y: 390, w: 380, h: 280, rot: 0, fill: "#ffffff", gap: 34, dot: 3, opacity: 0.25 }];
    case "confettis": {
      const spots: [number, number, number, string][] = [
        [150, 120, 18, "ellipse"], [300, 80, 14, "rect"], [480, 150, 16, "triangle"], [700, 90, 12, "ellipse"],
        [900, 140, 20, "rect"], [1100, 110, 16, "triangle"], [200, 560, 14, "rect"], [420, 610, 18, "ellipse"],
        [640, 570, 15, "triangle"], [860, 620, 13, "ellipse"], [1050, 580, 17, "rect"], [1180, 540, 14, "triangle"],
      ];
      return spots.map(([x, y, s, t], i) => t === "triangle"
        ? shape("triangle", x, y, s, s, { fill: CONFETTI[i % CONFETTI.length], opacity: 0.85, rot: (i * 37) % 90 - 45 })
        : ({ id: uid(), type: t as ElType, x, y, w: s, h: s, rot: (i * 53) % 80 - 40, fill: CONFETTI[i % CONFETTI.length], radius: 3, opacity: 0.85 }));
    }
    case "etoiles":
      return [
        shape("star4", 1040, 80, 64, 64, { fill: "#fde68a", opacity: 0.9 }),
        shape("star4", 980, 190, 36, 36, { fill: "#fde68a", opacity: 0.75 }),
        shape("star4", 1120, 200, 26, 26, { fill: "#ffffff", opacity: 0.7 }),
      ];
    case "cadre":
      return [{ id: uid(), type: "rect", x: 44, y: 44, w: W - 88, h: H - 88, rot: 0, fill: "transparent", stroke: accent, strokeW: 3, radius: 18, opacity: 1 }];
    case "coins": {
      const r = (x: number, y: number, w2: number, h2: number): El => ({ id: uid(), type: "rect", x, y, w: w2, h: h2, rot: 0, fill: accent, radius: 3, opacity: 1 });
      return [
        r(44, 44, 100, 6), r(44, 44, 6, 100), r(1136, 44, 100, 6), r(1230, 44, 6, 100),
        r(44, 670, 100, 6), r(44, 576, 6, 100), r(1136, 670, 100, 6), r(1230, 576, 6, 100),
      ];
    }
    case "bandeG":
      return [{ id: uid(), type: "rect", x: 0, y: 0, w: 120, h: 720, rot: 0, fill: accent, radius: 0, opacity: 0.9 }];
    case "bandeBas":
      return [{ id: uid(), type: "rect", x: 0, y: 620, w: 1280, h: 100, rot: 0, fill: accent, radius: 0, opacity: 0.9 }];
    case "voile":
      return [{ id: uid(), type: "rect", x: 0, y: 360, w: 1280, h: 360, rot: 0, fill: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.72))", radius: 0, opacity: 1 }];
    case "vignette":
      return [{ id: uid(), type: "rect", x: 0, y: 0, w: 1280, h: 720, rot: 0, fill: "radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6))", radius: 0, opacity: 1 }];
    default:
      return [];
  }
}

// ── Mises en page ────────────────────────────────────────────────────
const LAYOUTS: { k: string; l: string; boxes: { x: number; y: number; w: number; h: number; c: "a" | "t" | "f"; r?: boolean }[] }[] = [
  { k: "title", l: "Titre", boxes: [{ x: 15, y: 35, w: 70, h: 14, c: "t" }, { x: 25, y: 56, w: 50, h: 7, c: "a" }] },
  { k: "content", l: "Titre + contenu", boxes: [{ x: 8, y: 10, w: 60, h: 12, c: "t" }, { x: 8, y: 27, w: 12, h: 4, c: "a" }, { x: 8, y: 40, w: 80, h: 6, c: "f" }, { x: 8, y: 52, w: 70, h: 6, c: "f" }, { x: 8, y: 64, w: 60, h: 6, c: "f" }] },
  { k: "two", l: "Deux colonnes", boxes: [{ x: 8, y: 10, w: 60, h: 12, c: "t" }, { x: 8, y: 34, w: 38, h: 6, c: "f" }, { x: 8, y: 46, w: 34, h: 6, c: "f" }, { x: 54, y: 34, w: 38, h: 6, c: "f" }, { x: 54, y: 46, w: 34, h: 6, c: "f" }] },
  { k: "three", l: "Trois colonnes", boxes: [{ x: 8, y: 10, w: 50, h: 12, c: "t" }, { x: 8, y: 32, w: 25, h: 52, c: "f" }, { x: 37.5, y: 32, w: 25, h: 52, c: "f" }, { x: 67, y: 32, w: 25, h: 52, c: "f" }] },
  { k: "image", l: "Image + texte", boxes: [{ x: 8, y: 14, w: 38, h: 72, c: "f" }, { x: 52, y: 20, w: 38, h: 11, c: "t" }, { x: 52, y: 40, w: 40, h: 6, c: "f" }, { x: 52, y: 52, w: 34, h: 6, c: "f" }] },
  { k: "section", l: "Section", boxes: [{ x: 0, y: 42, w: 3, h: 22, c: "a" }, { x: 8, y: 45, w: 62, h: 15, c: "t" }] },
  { k: "quote", l: "Citation", boxes: [{ x: 8, y: 10, w: 9, h: 16, c: "a" }, { x: 15, y: 38, w: 70, h: 8, c: "t" }, { x: 15, y: 50, w: 55, h: 8, c: "t" }, { x: 30, y: 68, w: 40, h: 5, c: "a" }] },
  { k: "stats", l: "Chiffres clés", boxes: [{ x: 8, y: 10, w: 50, h: 12, c: "t" }, { x: 9, y: 38, w: 22, h: 20, c: "a" }, { x: 39, y: 38, w: 22, h: 20, c: "a" }, { x: 69, y: 38, w: 22, h: 20, c: "a" }, { x: 9, y: 64, w: 22, h: 5, c: "f" }, { x: 39, y: 64, w: 22, h: 5, c: "f" }, { x: 69, y: 64, w: 22, h: 5, c: "f" }] },
  { k: "steps", l: "Étapes", boxes: [{ x: 8, y: 10, w: 50, h: 12, c: "t" }, { x: 14, y: 38, w: 9, h: 16, c: "a", r: true }, { x: 45, y: 38, w: 9, h: 16, c: "a", r: true }, { x: 76, y: 38, w: 9, h: 16, c: "a", r: true }, { x: 10, y: 62, w: 17, h: 5, c: "f" }, { x: 41, y: 62, w: 17, h: 5, c: "f" }, { x: 72, y: 62, w: 17, h: 5, c: "f" }] },
  { k: "timeline", l: "Chronologie", boxes: [{ x: 8, y: 10, w: 50, h: 12, c: "t" }, { x: 8, y: 54, w: 84, h: 3, c: "f" }, { x: 13, y: 51, w: 5, h: 9, c: "a", r: true }, { x: 35, y: 51, w: 5, h: 9, c: "a", r: true }, { x: 57, y: 51, w: 5, h: 9, c: "a", r: true }, { x: 79, y: 51, w: 5, h: 9, c: "a", r: true }] },
  { k: "compare", l: "Comparaison", boxes: [{ x: 8, y: 10, w: 50, h: 12, c: "t" }, { x: 8, y: 30, w: 40, h: 56, c: "f" }, { x: 52, y: 30, w: 40, h: 56, c: "f" }, { x: 14, y: 36, w: 28, h: 7, c: "t" }, { x: 58, y: 36, w: 28, h: 7, c: "t" }] },
  { k: "merci", l: "Merci / Fin", boxes: [{ x: 25, y: 36, w: 50, h: 17, c: "t" }, { x: 32, y: 60, w: 36, h: 6, c: "a" }] },
  { k: "blank", l: "Vide", boxes: [] },
];

function layoutEls(kind: string, p: Pal): El[] {
  const head = { color: p.text, font: p.head };
  const body = { color: p.text, font: p.body };
  const card = (x: number, y: number, w2: number, h2: number): El =>
    ({ id: uid(), type: "rect", x, y, w: w2, h: h2, rot: 0, fill: p.faint, radius: 20, opacity: 1 });
  const bar = (): El => ({ id: uid(), type: "rect", x: 90, y: 168, w: 90, h: 6, rot: 0, fill: p.accent, radius: 3, opacity: 1 });
  const heading = (text: string): El => mkText({ ...head, text, x: 90, y: 70, w: 1100, h: 90, size: 48, weight: 800 });
  switch (kind) {
    case "title":
      return [
        mkText({ ...head, text: "Titre de la présentation", x: 160, y: 225, w: 960, h: 200, size: 76, weight: 800, align: "center" }),
        mkText({ ...body, text: "Sous-titre ou intervenant", x: 160, y: 400, w: 960, h: 60, size: 30, align: "center", color: p.accent }),
      ];
    case "section":
      return [
        { id: uid(), type: "rect", x: 0, y: 300, w: 20, h: 120, rot: 0, fill: p.accent, radius: 0, opacity: 1 },
        mkText({ ...head, text: "Nouvelle section", x: 90, y: 300, w: 1000, h: 120, size: 64, weight: 800, align: "left" }),
      ];
    case "content":
      return [
        heading("Titre de la diapo"), bar(),
        mkText({ ...body, text: "• Premier point\n• Deuxième point\n• Troisième point", x: 90, y: 210, w: 1100, h: 420, size: 32, lineHeight: 1.5 }),
      ];
    case "two":
      return [
        heading("Titre de la diapo"), bar(),
        mkText({ ...body, text: "• Colonne A\n• Point\n• Point", x: 90, y: 210, w: 520, h: 420, size: 30, lineHeight: 1.5 }),
        mkText({ ...body, text: "• Colonne B\n• Point\n• Point", x: 660, y: 210, w: 520, h: 420, size: 30, lineHeight: 1.5 }),
      ];
    case "three": {
      const xs = [90, 470, 850];
      return [
        heading("Trois idées clés"), bar(),
        ...xs.flatMap((x, i) => [
          card(x, 200, 340, 430),
          mkText({ ...head, text: `Point ${i + 1}`, x, y: 235, w: 340, h: 50, size: 30, weight: 700, align: "center" }),
          mkText({ ...body, text: "Décrivez ce point en quelques lignes.", x: x + 25, y: 300, w: 290, h: 290, size: 23, lineHeight: 1.5 }),
        ]),
      ];
    }
    case "image":
      return [
        { id: uid(), type: "rect", x: 90, y: 90, w: 520, h: 540, rot: 0, fill: p.faint, stroke: p.accent, strokeW: 2, radius: 18, opacity: 1 },
        mkText({ ...body, text: "Ajoutez une image\n(bouton Image)", x: 90, y: 320, w: 520, h: 80, size: 22, align: "center" }),
        mkText({ ...head, text: "Titre", x: 660, y: 150, w: 530, h: 90, size: 44, weight: 800 }),
        mkText({ ...body, text: "• Point clé\n• Point clé\n• Point clé", x: 660, y: 260, w: 530, h: 360, size: 30, lineHeight: 1.5 }),
      ];
    case "quote":
      return [
        mkText({ color: p.accent, font: "serif", text: "“", x: 80, y: 40, w: 220, h: 220, size: 220, weight: 800 }),
        mkText({ ...head, font: "serif", text: "Une citation inspirante qui marque les esprits et donne le ton.", x: 160, y: 250, w: 960, h: 220, size: 44, italic: true, align: "center", lineHeight: 1.4 }),
        mkText({ color: p.accent, font: p.body, text: "— Auteur, fonction", x: 160, y: 500, w: 960, h: 50, size: 26, align: "center" }),
      ];
    case "stats": {
      const xs = [90, 470, 850];
      const nums = ["87%", "×3", "1,2 M"];
      const labs = ["de satisfaction", "de croissance", "d'utilisateurs"];
      return [
        heading("Chiffres clés"), bar(),
        ...xs.flatMap((x, i) => [
          card(x, 230, 340, 300),
          mkText({ color: p.accent, font: p.head, text: nums[i], x, y: 290, w: 340, h: 110, size: 84, weight: 800, align: "center" }),
          mkText({ ...body, text: labs[i], x: x + 20, y: 420, w: 300, h: 60, size: 24, align: "center" }),
        ]),
      ];
    }
    case "steps": {
      const xs = [120, 520, 920];
      return [
        heading("Notre méthode"), bar(),
        ...xs.flatMap((x, i) => [
          { id: uid(), type: "ellipse" as ElType, x, y: 250, w: 84, h: 84, rot: 0, fill: p.accent, opacity: 1 },
          mkText({ color: "#ffffff", font: p.head, text: String(i + 1), x, y: 265, w: 84, h: 60, size: 40, weight: 800, align: "center" }),
          mkText({ ...head, text: `Étape ${i + 1}`, x: x - 78, y: 365, w: 240, h: 45, size: 28, weight: 700, align: "center" }),
          mkText({ ...body, text: "Décrivez cette étape en quelques mots.", x: x - 78, y: 415, w: 240, h: 120, size: 22, lineHeight: 1.4, align: "center" }),
        ]),
      ];
    }
    case "timeline": {
      const xs = [150, 430, 710, 990];
      return [
        heading("Chronologie"), bar(),
        { id: uid(), type: "rect", x: 90, y: 398, w: 1100, h: 4, rot: 0, fill: p.accent, radius: 2, opacity: 0.35 },
        ...xs.flatMap((x, i) => [
          { id: uid(), type: "ellipse" as ElType, x: x - 11, y: 389, w: 22, h: 22, rot: 0, fill: p.accent, opacity: 1 },
          mkText({ color: p.accent, font: p.head, text: `T${i + 1}`, x: x - 100, y: 330, w: 200, h: 40, size: 22, weight: 700, align: "center" }),
          mkText({ ...body, text: "Jalon important", x: x - 100, y: 440, w: 200, h: 80, size: 20, lineHeight: 1.35, align: "center" }),
        ]),
      ];
    }
    case "compare":
      return [
        heading("Comparaison"), bar(),
        card(90, 200, 530, 440), card(660, 200, 530, 440),
        mkText({ ...head, text: "Option A", x: 90, y: 230, w: 530, h: 50, size: 32, weight: 700, align: "center" }),
        mkText({ ...head, text: "Option B", x: 660, y: 230, w: 530, h: 50, size: 32, weight: 700, align: "center" }),
        mkText({ ...body, text: "• Avantage\n• Avantage\n• Avantage", x: 140, y: 300, w: 430, h: 300, size: 26, lineHeight: 1.6 }),
        mkText({ ...body, text: "• Avantage\n• Avantage\n• Avantage", x: 710, y: 300, w: 430, h: 300, size: 26, lineHeight: 1.6 }),
      ];
    case "merci":
      return [
        mkText({ ...head, text: "Merci !", x: 160, y: 240, w: 960, h: 160, size: 110, weight: 800, align: "center" }),
        mkText({ color: p.accent, font: p.body, text: "Des questions ? contact@exemple.com", x: 160, y: 430, w: 960, h: 60, size: 28, align: "center" }),
      ];
    default:
      return [];
  }
}

function palFromTheme(t: Theme): Pal {
  return { text: t.text, accent: t.accent, faint: "rgba(255,255,255,0.08)", head: t.head, body: t.body };
}

function migrate(content: string): Deck {
  try {
    const d = JSON.parse(content) as Deck & { slides?: unknown };
    if (Array.isArray(d?.slides) && d.slides.length && (d.slides[0] as Slide).els) return d as Deck;
    // Ancien format { slides: [{ title, bullets[] }] } -> conversion en diapos riches.
    const old = d as unknown as { slides?: { title?: string; bullets?: string[] }[] };
    if (Array.isArray(old?.slides)) {
      const t = themeOf("aurore");
      const p = palFromTheme(t);
      return {
        theme: "aurore",
        slides: old.slides.map((s, i) => {
          const els = i === 0
            ? [mkText({ color: p.text, font: p.head, text: s.title || "Titre", x: 160, y: 225, w: 960, h: 190, size: 72, weight: 800, align: "center" }),
               mkText({ color: p.accent, font: p.body, text: (s.bullets ?? []).join("  ·  "), x: 160, y: 410, w: 960, h: 60, size: 28, align: "center" })]
            : [mkText({ color: p.text, font: p.head, text: s.title || "Titre", x: 90, y: 70, w: 1100, h: 90, size: 48, weight: 800 }),
               { id: uid(), type: "rect" as ElType, x: 90, y: 168, w: 90, h: 6, rot: 0, fill: p.accent, radius: 3, opacity: 1 },
               mkText({ color: p.text, font: p.body, text: (s.bullets ?? []).map((b) => `• ${b}`).join("\n"), x: 90, y: 210, w: 1100, h: 420, size: 32, lineHeight: 1.5 })];
          return { id: uid(), bg: t.bg, els };
        }),
      };
    }
  } catch { /* défaut ci-dessous */ }
  const t = themeOf("aurore");
  return { theme: "aurore", slides: [{ id: uid(), bg: t.bg, els: layoutEls("title", palFromTheme(t)) }] };
}

const HANDLES: { k: string; dir: [number, number]; cx: number; cy: number; cursor: string }[] = [
  { k: "nw", dir: [-1, -1], cx: 0, cy: 0, cursor: "nwse-resize" },
  { k: "n", dir: [0, -1], cx: 0.5, cy: 0, cursor: "ns-resize" },
  { k: "ne", dir: [1, -1], cx: 1, cy: 0, cursor: "nesw-resize" },
  { k: "e", dir: [1, 0], cx: 1, cy: 0.5, cursor: "ew-resize" },
  { k: "se", dir: [1, 1], cx: 1, cy: 1, cursor: "nwse-resize" },
  { k: "s", dir: [0, 1], cx: 0.5, cy: 1, cursor: "ns-resize" },
  { k: "sw", dir: [-1, 1], cx: 0, cy: 1, cursor: "nesw-resize" },
  { k: "w", dir: [-1, 0], cx: 0, cy: 0.5, cursor: "ew-resize" },
];

async function resizeImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = dataUrl;
  });
  const max = 1400;
  let { width, height } = img;
  if (width > max || height > max) {
    const r = Math.min(max / width, max / height);
    width = Math.round(width * r); height = Math.round(height * r);
  }
  const c = document.createElement("canvas");
  c.width = width; c.height = height;
  c.getContext("2d")!.drawImage(img, 0, 0, width, height);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return c.toDataURL(type, 0.85);
}

const TEXT_PRESETS: { k: string; l: string; size: number; weight: number; w: number; h: number; cls: string }[] = [
  { k: "h1", l: "Titre", size: 64, weight: 800, w: 640, h: 110, cls: "text-xl font-extrabold" },
  { k: "h2", l: "Sous-titre", size: 40, weight: 700, w: 560, h: 80, cls: "text-base font-bold" },
  { k: "body", l: "Corps de texte", size: 28, weight: 400, w: 520, h: 160, cls: "text-sm" },
  { k: "caption", l: "Légende", size: 18, weight: 400, w: 320, h: 50, cls: "text-xs text-muted" },
];

export function SlidesEditor({
  id, initialName, initialContent, backHref, crumbs, shared = false,
}: {
  id: string; initialName: string; initialContent: string; backHref: string; crumbs: Crumb[]; shared?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [deck, setDeck] = useState<Deck>(() => migrate(initialContent));
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [present, setPresent] = useState<number | null>(null);
  const [save, setSave] = useState<SaveState>("saved");
  const [flash, setFlash] = useState(false);
  const [scale, setScale] = useState(0.6);
  const [shapeMenu, setShapeMenu] = useState(false);
  const [textMenu, setTextMenu] = useState(false);
  const [iconMenu, setIconMenu] = useState(false);
  const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });

  const deckRef = useRef(deck);
  useEffect(() => { deckRef.current = deck; }, [deck]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceFor = useRef<string | null>(null);
  const clip = useRef<El | null>(null);
  const gesture = useRef<{ kind: string; elId: string; handle?: string; sx: number; sy: number; orig: El; cx?: number; cy?: number } | null>(null);
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);

  const slide = deck.slides[Math.min(cur, deck.slides.length - 1)] ?? deck.slides[0];
  const selEl = slide?.els.find((e) => e.id === sel) ?? null;
  const pal = paletteFor(slide.bg);
  const lockedCount = slide.els.filter((e) => e.locked).length;

  const dirty = useRef(false);
  const applyRemote = useCallback(async () => {
    if (dirty.current) return;
    try {
      const { content } = await api.getContent(id);
      if (dirty.current) return;
      setDeck(migrate(content));
      setSel(null); setEditing(null);
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
    } catch { /* ignore */ }
  }, [id]);
  const { peers, markEditing, syncVersion } = useCollab(id, shared, applyRemote);

  const persist = useCallback((content: string, patch?: { name?: string }) => {
    setSave("saving");
    dirty.current = true;
    markEditing();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, { content, ...patch })
        .then((r) => { setSave("saved"); dirty.current = false; if (r?.updatedAt) syncVersion(r.updatedAt); })
        .catch(() => setSave("error"));
    }, 500);
  }, [id, markEditing, syncVersion]);

  const commit = useCallback(() => { persist(JSON.stringify(deckRef.current)); }, [persist]);
  const pushHistory = () => { past.current.push(JSON.stringify(deckRef.current)); if (past.current.length > 60) past.current.shift(); future.current = []; };

  // Applique une mutation immédiate ; `record` gère l'historique + la sauvegarde.
  const mutate = (fn: (d: Deck) => void, record = true) => {
    if (record) pushHistory();
    setDeck((prev) => { const n = structuredClone(prev); fn(n); return n; });
    if (record) setTimeout(commit, 0);
  };
  const setEl = (elId: string, patch: Partial<El>, record = false) => {
    mutate((d) => { const s = d.slides[cur]; const e = s?.els.find((x) => x.id === elId); if (e) Object.assign(e, patch); }, record);
  };

  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(JSON.stringify(deckRef.current)); setDeck(JSON.parse(p)); setSel(null); setTimeout(commit, 0); };
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push(JSON.stringify(deckRef.current)); setDeck(JSON.parse(f)); setSel(null); setTimeout(commit, 0); };

  const onName = (v: string) => { setName(v); persist(JSON.stringify(deckRef.current), { name: v.trim() || "Présentation sans titre" }); };

  // ── Scale du canvas ────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = 48;
      const s = Math.min((el.clientWidth - pad) / W, (el.clientHeight - pad) / H);
      setScale(Math.max(0.15, Math.min(s, 1)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Éléments ───────────────────────────────────────────────────────
  const addEl = (el: El) => { mutate((d) => d.slides[cur].els.push(el)); setSel(el.id); };
  const addText = (preset?: typeof TEXT_PRESETS[number]) => {
    setTextMenu(false);
    const p = preset ?? { size: 40, weight: 400, w: 340, h: 90 };
    addEl(mkText({ color: pal.text, font: pal.body, text: "Nouveau texte", x: Math.round((W - p.w) / 2), y: 300, w: p.w, h: p.h, size: p.size, weight: p.weight }));
  };
  const addShape = (kind: string) => {
    setShapeMenu(false);
    if (kind === "line" || kind === "arrow")
      return addEl({ id: uid(), type: kind as ElType, x: 440, y: 340, w: 400, h: 40, rot: 0, stroke: pal.accent, strokeW: 5, opacity: 1 });
    if (kind === "rect" || kind === "ellipse")
      return addEl({ id: uid(), type: kind as ElType, x: 470, y: 270, w: 340, h: 200, rot: 0, fill: pal.accent, radius: kind === "rect" ? 16 : 0, opacity: 1 });
    if (kind === "zigzag")
      return addEl({ id: uid(), type: "shape", shape: kind, x: 430, y: 320, w: 420, h: 80, rot: 0, fill: "none", stroke: pal.accent, strokeW: 6, opacity: 1 });
    addEl({ id: uid(), type: "shape", shape: kind, x: 500, y: 240, w: 280, h: 240, rot: 0, fill: pal.accent, strokeW: 0, opacity: 1 });
  };
  const addIcon = (n: string) => {
    setIconMenu(false);
    addEl({ id: uid(), type: "icon", icon: n, x: 560, y: 280, w: 160, h: 160, rot: 0, color: pal.accent, strokeW: 2, opacity: 1 });
  };
  const onImageFile = async (f: File | undefined) => {
    if (!f) return;
    const src = await resizeImage(f);
    if (replaceFor.current) {
      setEl(replaceFor.current, { src }, true);
      replaceFor.current = null;
      return;
    }
    const im = new Image(); im.src = src;
    await new Promise((r) => { im.onload = r; });
    const ratio = im.width / im.height || 1.5;
    const w = Math.min(560, ratio >= 1 ? 560 : 560 * ratio);
    addEl({ id: uid(), type: "image", x: 360, y: 160, w, h: w / ratio, rot: 0, src, radius: 8, opacity: 1 });
  };
  const deleteEl = (elId: string) => { mutate((d) => { d.slides[cur].els = d.slides[cur].els.filter((e) => e.id !== elId); }); setSel(null); setEditing(null); };
  const dupEl = (elId: string) => { const e = slide.els.find((x) => x.id === elId); if (!e) return; const c = { ...structuredClone(e), id: uid(), x: e.x + 24, y: e.y + 24 }; addEl(c); };
  const layer = (elId: string, dir: 1 | -1 | "front" | "back") =>
    mutate((d) => {
      const s = d.slides[cur]; const i = s.els.findIndex((e) => e.id === elId); if (i < 0) return;
      const [e] = s.els.splice(i, 1);
      if (dir === "front") s.els.push(e);
      else if (dir === "back") s.els.unshift(e);
      else s.els.splice(Math.max(0, Math.min(s.els.length, i + dir)), 0, e);
    });
  const alignEl = (elId: string, k: string) => {
    const e = slide.els.find((x) => x.id === elId); if (!e) return;
    const p: Partial<El> = {};
    if (k === "left") p.x = 0; if (k === "centerH") p.x = (W - e.w) / 2; if (k === "right") p.x = W - e.w;
    if (k === "top") p.y = 0; if (k === "centerV") p.y = (H - e.h) / 2; if (k === "bottom") p.y = H - e.h;
    setEl(elId, p, true);
  };
  const lockEl = (elId: string) => { setEl(elId, { locked: true }, true); setSel(null); };
  const unlockAll = () => { mutate((d) => { d.slides[cur].els.forEach((e) => { e.locked = false; }); }); };

  // ── Slides ─────────────────────────────────────────────────────────
  const addSlide = (kind = "content") => {
    const s: Slide = { id: uid(), bg: slide.bg, els: layoutEls(kind, paletteFor(slide.bg)) };
    mutate((d) => d.slides.splice(cur + 1, 0, s)); setCur(cur + 1); setSel(null);
  };
  const dupSlide = () => { const s = structuredClone(slide); s.id = uid(); s.els = s.els.map((e) => ({ ...e, id: uid() })); mutate((d) => d.slides.splice(cur + 1, 0, s)); setCur(cur + 1); };
  const delSlide = () => { if (deck.slides.length <= 1) return; mutate((d) => d.slides.splice(cur, 1)); setCur(Math.max(0, cur - 1)); setSel(null); };
  const moveSlide = (dir: -1 | 1) => { const j = cur + dir; if (j < 0 || j >= deck.slides.length) return; mutate((d) => { [d.slides[cur], d.slides[j]] = [d.slides[j], d.slides[cur]]; }); setCur(j); };
  const setSlideBg = (bg: string) => mutate((d) => { d.slides[cur].bg = bg; });
  const setAllBg = (bg: string) => mutate((d) => { d.slides.forEach((s) => { s.bg = bg; }); });
  // Ajoute un décor en arrière-plan (déplaçable / modifiable comme tout élément).
  const addDecor = (kind: string) => {
    const els = decorEls(kind, pal.accent);
    if (!els.length) return;
    mutate((d) => { d.slides[cur].els.unshift(...els); });
    setSel(els[els.length - 1].id);
  };

  // ── Gestes (déplacer / redimensionner / pivoter) ───────────────────
  const stageScale = () => (stageRef.current ? stageRef.current.getBoundingClientRect().width / W : scale);
  const startMove = (e: React.PointerEvent, elId: string) => {
    if (editing) return;
    e.stopPropagation();
    setSel(elId);
    if (e.button !== 0) return;
    const orig = slide.els.find((x) => x.id === elId); if (!orig) return;
    pushHistory();
    gesture.current = { kind: "move", elId, sx: e.clientX, sy: e.clientY, orig: { ...orig } };
    addListeners();
  };
  const startResize = (e: React.PointerEvent, elId: string, handle: string) => {
    e.stopPropagation();
    const orig = slide.els.find((x) => x.id === elId); if (!orig) return;
    pushHistory();
    gesture.current = { kind: "resize", elId, handle, sx: e.clientX, sy: e.clientY, orig: { ...orig } };
    addListeners();
  };
  const startRotate = (e: React.PointerEvent, elId: string) => {
    e.stopPropagation();
    const orig = slide.els.find((x) => x.id === elId); if (!orig || !stageRef.current) return;
    pushHistory();
    const r = stageRef.current.getBoundingClientRect(); const s = r.width / W;
    gesture.current = { kind: "rotate", elId, sx: e.clientX, sy: e.clientY, orig: { ...orig }, cx: r.left + (orig.x + orig.w / 2) * s, cy: r.top + (orig.y + orig.h / 2) * s };
    addListeners();
  };
  const onMove = (e: PointerEvent) => {
    const g = gesture.current; if (!g) return;
    const s = stageScale();
    if (g.kind === "move") {
      let nx = g.orig.x + (e.clientX - g.sx) / s;
      let ny = g.orig.y + (e.clientY - g.sy) / s;
      let gv: number | null = null, gh: number | null = null;
      if (!e.shiftKey) {
        // Aimantation : centres et bords de la diapo.
        const th = 8;
        const cx = nx + g.orig.w / 2, cy = ny + g.orig.h / 2;
        if (Math.abs(cx - W / 2) < th) { nx = W / 2 - g.orig.w / 2; gv = W / 2; }
        else if (Math.abs(nx) < th) { nx = 0; gv = 0; }
        else if (Math.abs(nx + g.orig.w - W) < th) { nx = W - g.orig.w; gv = W; }
        if (Math.abs(cy - H / 2) < th) { ny = H / 2 - g.orig.h / 2; gh = H / 2; }
        else if (Math.abs(ny) < th) { ny = 0; gh = 0; }
        else if (Math.abs(ny + g.orig.h - H) < th) { ny = H - g.orig.h; gh = H; }
      }
      setGuides({ v: gv, h: gh });
      setEl(g.elId, { x: nx, y: ny });
    } else if (g.kind === "resize") {
      const hd = HANDLES.find((h) => h.k === g.handle)!; const [dx, dy] = hd.dir;
      const l0x = (e.clientX - g.sx) / s, l0y = (e.clientY - g.sy) / s;
      const a = -g.orig.rot * Math.PI / 180;
      const lx = l0x * Math.cos(a) - l0y * Math.sin(a);
      const ly = l0x * Math.sin(a) + l0y * Math.cos(a);
      const newW = Math.max(24, g.orig.w + dx * lx);
      const newH = Math.max(24, g.orig.h + dy * ly);
      const adw = newW - g.orig.w, adh = newH - g.orig.h;
      const slx = dx * adw / 2, sly = dy * adh / 2;
      const ca = Math.cos(g.orig.rot * Math.PI / 180), sa = Math.sin(g.orig.rot * Math.PI / 180);
      const cx0 = g.orig.x + g.orig.w / 2, cy0 = g.orig.y + g.orig.h / 2;
      const ncx = cx0 + (slx * ca - sly * sa), ncy = cy0 + (slx * sa + sly * ca);
      setEl(g.elId, { w: newW, h: newH, x: ncx - newW / 2, y: ncy - newH / 2 });
    } else if (g.kind === "rotate") {
      let deg = Math.atan2(e.clientY - (g.cy ?? 0), e.clientX - (g.cx ?? 0)) * 180 / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      setEl(g.elId, { rot: Math.round(deg) });
    }
  };
  const onUp = () => { gesture.current = null; setGuides({ v: null, h: null }); removeListeners(); commit(); };
  const addListeners = () => { window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp, { once: true }); };
  const removeListeners = () => { window.removeEventListener("pointermove", onMove); };

  // ── Clavier ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (present != null) {
        if (e.key === "ArrowRight" || e.key === " ") setPresent((p) => (p == null ? p : Math.min(p + 1, deck.slides.length - 1)));
        else if (e.key === "ArrowLeft") setPresent((p) => (p == null ? p : Math.max(p - 1, 0)));
        else if (e.key === "Escape") setPresent(null);
        return;
      }
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && sel) { e.preventDefault(); dupEl(sel); return; }
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c" && selEl) { e.preventDefault(); clip.current = structuredClone(selEl); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v" && clip.current) {
        e.preventDefault();
        const c = { ...structuredClone(clip.current), id: uid(), x: clip.current.x + 24, y: clip.current.y + 24 };
        addEl(c);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); deleteEl(sel); }
      else if (e.key === "Escape") { setSel(null); setEditing(null); }
      else if (sel && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 20 : 2;
        const p: Partial<El> = {};
        if (e.key === "ArrowLeft") p.x = (selEl?.x ?? 0) - d;
        if (e.key === "ArrowRight") p.x = (selEl?.x ?? 0) + d;
        if (e.key === "ArrowUp") p.y = (selEl?.y ?? 0) - d;
        if (e.key === "ArrowDown") p.y = (selEl?.y ?? 0) + d;
        setEl(sel, p, true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, sel, selEl, deck.slides.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyAi = (data: unknown) => {
    const d = data as { slides?: { title: string; bullets: string[] }[] };
    if (!d?.slides?.length) return;
    const bg0 = deckRef.current.slides[cur]?.bg ?? themeOf(deck.theme).bg;
    const p = paletteFor(bg0);
    mutate((dk) => {
      dk.slides = d.slides!.map((s, i) => {
        const els = i === 0
          ? [mkText({ color: p.text, font: p.head, text: s.title, x: 160, y: 225, w: 960, h: 190, size: 72, weight: 800, align: "center" }),
             mkText({ color: p.accent, font: p.body, text: (s.bullets ?? []).join("  ·  "), x: 160, y: 415, w: 960, h: 60, size: 28, align: "center" })]
          : [mkText({ color: p.text, font: p.head, text: s.title, x: 90, y: 70, w: 1100, h: 90, size: 48, weight: 800 }),
             { id: uid(), type: "rect" as ElType, x: 90, y: 168, w: 90, h: 6, rot: 0, fill: p.accent, radius: 3, opacity: 1 },
             mkText({ color: p.text, font: p.body, text: (s.bullets ?? []).map((b) => `• ${b}`).join("\n"), x: 90, y: 210, w: 1100, h: 430, size: 32, lineHeight: 1.5 })];
        return { id: uid(), bg: bg0, els };
      });
    });
    setCur(0); setSel(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 sm:px-5 flex items-center gap-2 sm:gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour"><ArrowLeft className="size-5" /></Link>
        <Presentation className="size-4 shrink-0 text-rose-400" />
        <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 w-40 sm:w-64 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" placeholder="Présentation sans titre" />
        <div className="hidden sm:flex items-center gap-0.5 ml-1">
          <button onClick={undo} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white" title="Annuler (⌘Z)"><Undo2 className="size-4" /></button>
          <button onClick={redo} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white" title="Rétablir (⌘⇧Z)"><Redo2 className="size-4" /></button>
        </div>
        <div className="ml-auto"><CollabBar peers={peers} /></div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {flash ? <span className="flex items-center gap-1 text-cyan-300"><RefreshCw className="size-3.5" /> <span className="hidden sm:inline">Mis à jour</span></span> : save === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : save === "error" ? <span className="text-red-400">Erreur</span> : <Check className="size-3.5 text-emerald-400" />}
        </div>
        <button onClick={() => setPresent(cur)} className="flex h-9 items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/15"><Play className="size-4" /> <span className="hidden sm:inline">Présenter</span></button>
        <AiAssistant
          kind="slides" title="Assistant présentation" accent="#fb7185"
          onApplyData={applyAi}
          placeholder="Ex. « présentation de notre offre en 8 diapos »"
          quickActions={[{ action: "generate", label: "Générer la présentation", icon: SparkleIcon }]}
        />
      </header>

      {/* Barre d'outils insertion */}
      <div className="h-11 shrink-0 border-b border-white/10 bg-white/[0.02] px-3 sm:px-5 flex items-center gap-1.5">
        <div className="relative">
          <ToolBtn onClick={() => { setTextMenu((v) => !v); setShapeMenu(false); setIconMenu(false); }} icon={Type} label="Texte" caret />
          {textMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setTextMenu(false)} />
              <div className="absolute left-0 top-10 z-40 w-52 rounded-xl border border-white/10 bg-[#0f1017]/97 p-1.5 shadow-2xl backdrop-blur-xl">
                {TEXT_PRESETS.map((p) => (
                  <button key={p.k} onClick={() => addText(p)} className={`block w-full rounded-lg px-3 py-2 text-left text-white/90 hover:bg-white/5 ${p.cls}`}>{p.l}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <ToolBtn onClick={() => { setShapeMenu((v) => !v); setTextMenu(false); setIconMenu(false); }} icon={Shapes} label="Forme" caret />
          {shapeMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShapeMenu(false)} />
              <div className="absolute left-0 top-10 z-40 w-64 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1017]/97 p-1.5 shadow-2xl backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-0.5">
                  {SHAPES_MENU.map((o) => (
                    <button key={o.k} onClick={() => addShape(o.k)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/5"><o.i className="size-4 shrink-0 text-brand-200" /> <span className="truncate">{o.l}</span></button>
                  ))}
                </div>
                <div className="my-1 h-px bg-white/10" />
                <div className="grid grid-cols-2 gap-0.5">
                  <button onClick={() => addShape("line")} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/5"><Minus className="size-4 text-brand-200" /> Ligne</button>
                  <button onClick={() => addShape("arrow")} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/5"><MoveUpRight className="size-4 text-brand-200" /> Flèche</button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <ToolBtn onClick={() => { setIconMenu((v) => !v); setTextMenu(false); setShapeMenu(false); }} icon={Star} label="Icônes" caret />
          {iconMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIconMenu(false)} />
              <div className="absolute left-0 top-10 z-40 w-80 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1017]/97 p-2.5 shadow-2xl backdrop-blur-xl">
                {ICON_LIB.map((g) => (
                  <div key={g.label} className="mb-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{g.label}</p>
                    <div className="grid grid-cols-8 gap-0.5">
                      {g.items.map((it) => (
                        <button key={it.n} onClick={() => addIcon(it.n)} title={it.n} className="grid size-8 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"><it.c className="size-[18px]" /></button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <ToolBtn onClick={() => { replaceFor.current = null; fileRef.current?.click(); }} icon={ImageIcon} label="Image" />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onImageFile(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn onClick={() => addSlide("content")} icon={Plus} label="Diapo" />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Rail des diapos */}
        <div className="w-36 sm:w-48 shrink-0 overflow-y-auto border-r border-white/10 bg-white/[0.015] p-2 space-y-2">
          {deck.slides.map((s, i) => (
            <div key={s.id} className="group relative">
              <button onClick={() => { setCur(i); setSel(null); }} className={`block w-full overflow-hidden rounded-lg border-2 transition ${i === cur ? "border-brand-400" : "border-white/10 hover:border-white/25"}`}>
                <Stage slide={s} scale={(144 / W)} />
              </button>
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white/80">{i + 1}</span>
            </div>
          ))}
          <button onClick={() => addSlide("content")} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 py-2 text-xs text-muted hover:border-white/30 hover:text-white"><Plus className="size-3.5" /> Diapo</button>
        </div>

        {/* Canvas */}
        <div ref={wrapRef} className="relative flex-1 min-h-0 grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_70%)] p-6" onPointerDown={() => setSel(null)}>
          <div className="shadow-2xl shadow-black/50" onPointerDown={(e) => e.stopPropagation()}>
            <Stage
              ref={stageRef}
              slide={slide}
              scale={scale}
              editable
              sel={sel}
              editing={editing}
              guides={guides}
              onSelect={setSel}
              onStartMove={startMove}
              onStartResize={startResize}
              onStartRotate={startRotate}
              onEdit={setEditing}
              onText={(elId, text) => setEl(elId, { text }, true)}
            />
          </div>
          {/* Barre de diapos */}
          <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#0f1017]/90 px-2 py-1 text-xs text-muted backdrop-blur">
            <button onClick={() => moveSlide(-1)} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Diapo précédente"><ChevronUp className="size-4" /></button>
            <span className="px-1 tabular-nums">{cur + 1} / {deck.slides.length}</span>
            <button onClick={() => moveSlide(1)} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Diapo suivante"><ChevronDown className="size-4" /></button>
            <div className="mx-1 h-4 w-px bg-white/10" />
            <button onClick={dupSlide} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Dupliquer"><Copy className="size-4" /></button>
            <button onClick={delSlide} className="grid size-7 place-items-center rounded-full hover:bg-red-500/10 hover:text-red-400" title="Supprimer"><Trash2 className="size-4" /></button>
          </div>
        </div>

        {/* Panneau de format */}
        <div className="hidden md:block w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-white/[0.02] p-4">
          {selEl ? (
            <ElementPanel
              el={selEl}
              onChange={(p, rec) => setEl(selEl.id, p, rec)}
              onDup={() => dupEl(selEl.id)}
              onDelete={() => deleteEl(selEl.id)}
              onLayer={(d) => layer(selEl.id, d)}
              onAlign={(k) => alignEl(selEl.id, k)}
              onLock={() => lockEl(selEl.id)}
              onReplaceImage={() => { replaceFor.current = selEl.id; fileRef.current?.click(); }}
            />
          ) : (
            <SlidePanel
              slideBg={slide.bg}
              lockedCount={lockedCount}
              onBg={setSlideBg}
              onBgAll={setAllBg}
              onDecor={addDecor}
              onUnlockAll={unlockAll}
              onLayout={(k) => mutate((d) => { d.slides[cur].els = layoutEls(k, paletteFor(d.slides[cur].bg)); })}
              onAddSlide={addSlide}
            />
          )}
        </div>
      </div>

      {/* Mode présentation */}
      {present != null && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black" onClick={() => setPresent((p) => (p == null ? p : Math.min(p + 1, deck.slides.length - 1)))}>
          <button onClick={(e) => { e.stopPropagation(); setPresent(null); }} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="size-5" /></button>
          <div className="flex flex-1 items-center justify-center">
            <PresentStage slide={deck.slides[present]} />
          </div>
          <div className="flex items-center justify-center gap-4 pb-5 text-sm text-white/50">
            <span className="tabular-nums">{present + 1} / {deck.slides.length}</span>
            <span className="hidden sm:inline">← → naviguer · Échap quitter</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Le plateau (rend une diapo, éditable ou non) ─────────────────────
type StageProps = {
  slide: Slide; scale: number; editable?: boolean; sel?: string | null; editing?: string | null;
  guides?: { v: number | null; h: number | null };
  onSelect?: (id: string) => void;
  onStartMove?: (e: React.PointerEvent, id: string) => void;
  onStartResize?: (e: React.PointerEvent, id: string, handle: string) => void;
  onStartRotate?: (e: React.PointerEvent, id: string) => void;
  onEdit?: (id: string | null) => void;
  onText?: (id: string, text: string) => void;
};
const Stage = forwardRef<HTMLDivElement, StageProps>(function Stage(
  { slide, scale, editable, sel, editing, guides, onSelect, onStartMove, onStartResize, onStartRotate, onEdit, onText }, ref,
) {
  return (
    <div style={{ width: W * scale, height: H * scale, position: "relative" }}>
      <div ref={ref} style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", overflow: "hidden", background: slide.bg }}>
        {slide.els.map((el) => (
          <ElementView key={el.id} el={el} scale={scale} editable={editable} selected={sel === el.id} editing={editing === el.id}
            onSelect={onSelect} onStartMove={onStartMove} onStartResize={onStartResize} onStartRotate={onStartRotate} onEdit={onEdit} onText={onText} />
        ))}
        {editable && guides?.v != null && (
          <div style={{ position: "absolute", left: guides.v, top: 0, width: 1.5 / scale, height: H, background: "#22d3ee", pointerEvents: "none", opacity: 0.9 }} />
        )}
        {editable && guides?.h != null && (
          <div style={{ position: "absolute", top: guides.h, left: 0, height: 1.5 / scale, width: W, background: "#22d3ee", pointerEvents: "none", opacity: 0.9 }} />
        )}
      </div>
    </div>
  );
});

function ElementView({ el, scale, editable, selected, editing, onSelect, onStartMove, onStartResize, onStartRotate, onEdit, onText }: {
  el: El; scale: number; editable?: boolean; selected?: boolean; editing?: boolean;
  onSelect?: (id: string) => void;
  onStartMove?: (e: React.PointerEvent, id: string) => void;
  onStartResize?: (e: React.PointerEvent, id: string, handle: string) => void;
  onStartRotate?: (e: React.PointerEvent, id: string) => void;
  onEdit?: (id: string | null) => void;
  onText?: (id: string, text: string) => void;
}) {
  const hs = 11 / scale; // taille d'un handle en unités logiques (≈ constante à l'écran)
  const flip = `${el.flipH ? "scaleX(-1) " : ""}${el.flipV ? "scaleY(-1) " : ""}`;
  const wrap: React.CSSProperties = {
    position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h,
    transform: `rotate(${el.rot}deg) ${flip}`.trim(), transformOrigin: "center", boxSizing: "border-box",
  };
  let inner: React.ReactNode = null;
  if (el.type === "text") {
    const fx = textFxStyle(el);
    const style: React.CSSProperties = {
      width: "100%", height: "100%", fontFamily: fontCss(el.font), fontSize: el.size, fontWeight: el.weight,
      fontStyle: el.italic ? "italic" : "normal", textDecoration: el.underline ? "underline" : "none",
      textAlign: el.align, color: el.color, lineHeight: el.lineHeight ?? 1.25, whiteSpace: "pre-wrap",
      wordBreak: "break-word", outline: "none", padding: 6, overflow: "hidden",
      letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : undefined,
      textTransform: el.upper ? "uppercase" : "none",
      display: "flex", flexDirection: "column",
      justifyContent: el.vAlign === "middle" ? "center" : el.vAlign === "bottom" ? "flex-end" : "flex-start",
      background: el.bgFill && el.bgFill !== "transparent" ? el.bgFill : undefined,
      borderRadius: el.bgFill && el.bgFill !== "transparent" ? (el.radius ?? 8) : undefined,
      opacity: el.opacity ?? 1,
      ...fx,
    };
    inner = editing ? (
      <div contentEditable suppressContentEditableWarning autoFocus
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={(e) => { onText?.(el.id, e.currentTarget.innerText); onEdit?.(null); }}
        style={{ ...style, WebkitTextStroke: undefined, color: el.color, backgroundImage: undefined }}>{el.text}</div>
    ) : (<div style={{ ...style, cursor: editable ? "move" : "default" }}>{el.text}</div>);
  } else if (el.type === "rect" || el.type === "ellipse") {
    inner = <div style={{ width: "100%", height: "100%", background: el.fill, opacity: el.opacity, borderRadius: el.type === "ellipse" ? "50%" : el.radius, border: el.stroke && (el.strokeW ?? 0) > 0 ? `${el.strokeW}px ${el.dash ? "dashed" : "solid"} ${el.stroke}` : undefined, boxSizing: "border-box", boxShadow: shadowBox(el) }} />;
  } else if (el.type === "shape") {
    const filled = el.fill && el.fill !== "none";
    inner = (
      <svg width="100%" height="100%" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none" style={{ overflow: "visible", opacity: el.opacity, filter: shadowFilter(el) }}>
        <path d={shapePath(el.shape, el.w, el.h)} fill={filled ? el.fill : "none"}
          stroke={el.stroke && (el.strokeW ?? 0) > 0 ? el.stroke : "none"} strokeWidth={el.strokeW ?? 0}
          strokeDasharray={el.dash ? "10 8" : undefined} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  } else if (el.type === "pattern") {
    const gap = el.gap ?? 30; const dot = el.dot ?? 4;
    const pid = `pat-${el.id}`;
    inner = (
      <svg width="100%" height="100%" style={{ opacity: el.opacity }}>
        <defs>
          <pattern id={pid} width={gap} height={gap} patternUnits="userSpaceOnUse">
            {el.shape === "grid"
              ? <path d={`M ${gap} 0 L 0 0 0 ${gap}`} fill="none" stroke={el.fill} strokeWidth={dot} />
              : <circle cx={gap / 2} cy={gap / 2} r={dot} fill={el.fill} />}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${pid})`} />
      </svg>
    );
  } else if (el.type === "line" || el.type === "arrow") {
    inner = (
      <svg width="100%" height="100%" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none" style={{ overflow: "visible", opacity: el.opacity, filter: shadowFilter(el) }}>
        {(el.type === "arrow" || el.both) && (
          <defs>
            <marker id={`ah-${el.id}`} markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill={el.stroke} /></marker>
            <marker id={`ahs-${el.id}`} markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto"><path d="M7,0 L0,3 L7,6 Z" fill={el.stroke} /></marker>
          </defs>
        )}
        <line x1={0} y1={el.h / 2} x2={el.w} y2={el.h / 2} stroke={el.stroke} strokeWidth={el.strokeW} strokeLinecap="round"
          strokeDasharray={el.dash ? `${(el.strokeW ?? 4) * 2} ${(el.strokeW ?? 4) * 2}` : undefined}
          markerStart={el.both ? `url(#ahs-${el.id})` : undefined}
          markerEnd={el.type === "arrow" || el.both ? `url(#ah-${el.id})` : undefined} />
      </svg>
    );
  } else if (el.type === "icon") {
    const Ic = ICON_MAP[el.icon ?? ""] ?? Star;
    inner = <div style={{ width: "100%", height: "100%", opacity: el.opacity, filter: shadowFilter(el) }}><Ic width="100%" height="100%" style={{ color: el.color }} strokeWidth={el.strokeW ?? 2} /></div>;
  } else if (el.type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    inner = <img src={el.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: el.opacity, borderRadius: el.radius, boxShadow: shadowBox(el), border: el.stroke && (el.strokeW ?? 0) > 0 ? `${el.strokeW}px solid ${el.stroke}` : undefined, pointerEvents: "none" }} />;
  }

  const interactive = editable && !el.locked;
  return (
    <div
      style={wrap}
      onPointerDown={(e) => interactive && onStartMove?.(e, el.id)}
      onClick={(e) => { if (!el.locked) { e.stopPropagation(); onSelect?.(el.id); } }}
      onDoubleClick={(e) => { if (el.type === "text" && interactive) { e.stopPropagation(); onEdit?.(el.id); } }}
    >
      {inner}
      {editable && selected && !editing && (
        <>
          <div style={{ position: "absolute", inset: 0, border: `${1.5 / scale}px solid #5b8bff`, pointerEvents: "none" }} />
          {/* poignée de rotation */}
          <div onPointerDown={(e) => onStartRotate?.(e, el.id)}
            style={{ position: "absolute", left: "50%", top: -28 / scale, width: hs, height: hs, marginLeft: -hs / 2, borderRadius: "50%", background: "#5b8bff", border: `${1.5 / scale}px solid #fff`, cursor: "grab" }} />
          <div style={{ position: "absolute", left: "50%", top: -28 / scale + hs, width: 1.5 / scale, height: 28 / scale - hs, background: "#5b8bff", marginLeft: -0.75 / scale, pointerEvents: "none" }} />
          {HANDLES.map((h) => (
            <div key={h.k} onPointerDown={(e) => onStartResize?.(e, el.id, h.k)}
              style={{ position: "absolute", left: `${h.cx * 100}%`, top: `${h.cy * 100}%`, width: hs, height: hs, marginLeft: -hs / 2, marginTop: -hs / 2, background: "#fff", border: `${1.5 / scale}px solid #5b8bff`, borderRadius: 2 / scale, cursor: h.cursor }} />
          ))}
        </>
      )}
    </div>
  );
}

// Rend une diapo en plein écran (mode présentation), ajustée à l'écran.
function PresentStage({ slide }: { slide: Slide }) {
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, (window.innerHeight - 60) / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: "none" }}><Stage slide={slide} scale={scale} /></div>;
}

// ── Composants de panneau réutilisables ──────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>{children}</label>;
}
function SectionTitle({ icon: I, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><I className="size-3.5" /> {children}</p>;
}
function ColorRow({ value, onChange, allowTransparent }: { value?: string; onChange: (c: string) => void; allowTransparent?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SWATCHES.map((c) => (
        <button key={c} onClick={() => onChange(c)} className={`size-6 rounded-md border ${value === c ? "border-brand-400 ring-2 ring-brand-400/40" : "border-white/15"}`} style={{ background: c }} />
      ))}
      {allowTransparent && (
        <button onClick={() => onChange("transparent")} title="Transparent" className={`grid size-6 place-items-center rounded-md border text-[9px] text-white/60 ${value === "transparent" || !value ? "border-brand-400" : "border-white/15"}`} style={{ backgroundImage: "linear-gradient(45deg,#555 25%,transparent 25%,transparent 75%,#555 75%),linear-gradient(45deg,#555 25%,#333 25%,#333 75%,#555 75%)", backgroundSize: "8px 8px", backgroundPosition: "0 0,4px 4px" }}>∅</button>
      )}
      <input type="color" value={value?.startsWith("#") ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="size-6 cursor-pointer rounded-md border border-white/15 bg-transparent p-0" />
    </div>
  );
}
function Stepper({ value, onChange, min = 1, max = 400, step = 1 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - step))} className="grid size-7 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5">−</button>
      <input type="number" value={Math.round(value)} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className="h-7 w-14 rounded-lg border border-white/10 bg-white/5 text-center text-sm text-white outline-none" />
      <button onClick={() => onChange(Math.min(max, value + step))} className="grid size-7 place-items-center rounded-lg border border-white/10 text-muted hover:bg-white/5">+</button>
    </div>
  );
}
function Slider({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[11px] uppercase tracking-wide text-muted"><span>{label}</span><span className="tabular-nums">{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand-500" />
    </label>
  );
}
function Segmented<T extends string>({ options, value, onChange }: { options: { k: T; l: string; i?: LucideIcon }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1" style={{ gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o.k} onClick={() => onChange(o.k)} className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs transition ${value === o.k ? "bg-brand-500/25 text-white" : "text-muted hover:bg-white/5"}`}>
          {o.i && <o.i className="size-3.5" />} {o.l}
        </button>
      ))}
    </div>
  );
}
function ToolBtn({ onClick, icon: I, label, caret }: { onClick: () => void; icon: LucideIcon; label: string; caret?: boolean }) {
  return (
    <button onClick={onClick} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/85 hover:bg-white/10">
      <I className="size-4" /> <span className="hidden sm:inline">{label}</span>{caret && <ChevronDown className="size-3" />}
    </button>
  );
}
function IconToggle({ on, onClick, icon: I }: { on?: boolean; onClick: () => void; icon: LucideIcon }) {
  return <button onClick={onClick} className={`grid size-8 place-items-center rounded-lg border transition ${on ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}><I className="size-4" /></button>;
}
function PanelBtn({ onClick, icon: I, title, danger }: { onClick: () => void; icon: LucideIcon; title: string; danger?: boolean }) {
  return <button onClick={onClick} title={title} className={`grid h-9 place-items-center rounded-lg border border-white/10 transition ${danger ? "text-muted hover:bg-red-500/10 hover:text-red-400" : "text-white/80 hover:bg-white/5"}`}><I className="size-4" /></button>;
}

// ── Panneau d'un élément sélectionné ─────────────────────────────────
function ElementPanel({ el, onChange, onDup, onDelete, onLayer, onAlign, onLock, onReplaceImage }: {
  el: El; onChange: (p: Partial<El>, record?: boolean) => void; onDup: () => void; onDelete: () => void;
  onLayer: (d: 1 | -1 | "front" | "back") => void; onAlign: (k: string) => void; onLock: () => void; onReplaceImage: () => void;
}) {
  const set = (p: Partial<El>) => onChange(p, true);
  const typeLabel: Record<string, string> = { text: "Texte", rect: "Rectangle", ellipse: "Ellipse", line: "Ligne", arrow: "Flèche", image: "Image", shape: SHAPE_LABELS[el.shape ?? ""] ?? "Forme", icon: "Icône", pattern: "Motif" };
  const hasFill = el.type === "rect" || el.type === "ellipse" || el.type === "shape";
  const hasStroke = el.type === "rect" || el.type === "ellipse" || el.type === "shape" || el.type === "line" || el.type === "arrow";
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{typeLabel[el.type]}</p>

      {el.type === "text" && (
        <>
          <Field label="Police">
            <select value={el.font} onChange={(e) => set({ font: e.target.value })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none">
              {FONTS.map((f) => <option key={f.key} value={f.key} className="bg-[#0f1017]" style={{ fontFamily: f.css }}>{f.label}</option>)}
            </select>
          </Field>
          <div className="flex items-end justify-between gap-2">
            <Field label="Taille"><Stepper value={el.size ?? 40} onChange={(n) => set({ size: n })} min={8} max={300} step={2} /></Field>
            <div className="flex items-center gap-1">
              <IconToggle on={(el.weight ?? 400) >= 600} onClick={() => set({ weight: (el.weight ?? 400) >= 600 ? 400 : 700 })} icon={Bold} />
              <IconToggle on={!!el.italic} onClick={() => set({ italic: !el.italic })} icon={Italic} />
              <IconToggle on={!!el.underline} onClick={() => set({ underline: !el.underline })} icon={UnderlineIcon} />
              <IconToggle on={!!el.upper} onClick={() => set({ upper: !el.upper })} icon={CaseUpper} />
            </div>
          </div>
          <Field label="Graisse"><Slider label="" value={el.weight ?? 400} min={100} max={900} step={100} onChange={(n) => set({ weight: n })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Interligne"><Slider label="" value={Math.round((el.lineHeight ?? 1.25) * 100)} min={80} max={220} step={5} onChange={(n) => set({ lineHeight: n / 100 })} /></Field>
            <Field label="Interlettre"><Slider label="" value={Math.round((el.letterSpacing ?? 0) * 100)} min={-10} max={60} step={1} onChange={(n) => set({ letterSpacing: n / 100 })} /></Field>
          </div>
          <Field label="Alignement">
            <div className="flex gap-1">
              {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, I]) => (
                <IconToggle key={a} on={el.align === a} onClick={() => set({ align: a })} icon={I} />
              ))}
              <div className="mx-0.5 w-px bg-white/10" />
              {([["top", AlignStartHorizontal], ["middle", AlignCenterHorizontal], ["bottom", AlignEndHorizontal]] as const).map(([a, I]) => (
                <IconToggle key={a} on={(el.vAlign ?? "top") === a} onClick={() => set({ vAlign: a })} icon={I} />
              ))}
            </div>
          </Field>
          <Field label="Couleur du texte"><ColorRow value={el.color} onChange={(c) => set({ color: c })} /></Field>
          <Field label="Effet de texte">
            <select value={el.fx ?? "none"} onChange={(e) => set({ fx: e.target.value })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none">
              {TEXT_FX.map((f) => <option key={f.k} value={f.k} className="bg-[#0f1017]">{f.l}</option>)}
            </select>
          </Field>
          {el.fx && el.fx !== "none" && (
            <Field label="Couleur de l'effet"><ColorRow value={el.fxColor ?? "#000000"} onChange={(c) => set({ fxColor: c })} /></Field>
          )}
          <Field label="Surlignage (fond du texte)"><ColorRow value={el.bgFill ?? "transparent"} onChange={(c) => set({ bgFill: c })} allowTransparent /></Field>
        </>
      )}

      {hasFill && (
        <Field label="Remplissage"><ColorRow value={el.fill} onChange={(c) => set({ fill: c })} allowTransparent /></Field>
      )}
      {hasStroke && (
        <>
          <Field label="Bordure"><ColorRow value={el.stroke ?? "#ffffff"} onChange={(c) => set({ stroke: c })} /></Field>
          <div className="flex items-end gap-3">
            <Field label="Épaisseur"><Stepper value={el.strokeW ?? 0} onChange={(n) => set({ strokeW: n })} min={0} max={60} /></Field>
            {el.type === "rect" && <Field label="Arrondi"><Stepper value={el.radius ?? 0} onChange={(n) => set({ radius: n })} min={0} max={200} step={2} /></Field>}
          </div>
          <div className="flex items-center gap-2">
            <IconToggle on={!!el.dash} onClick={() => set({ dash: !el.dash })} icon={MoreHorizontal} />
            <span className="text-xs text-muted">Tirets</span>
          </div>
        </>
      )}

      {(el.type === "line" || el.type === "arrow") && (
        <div className="flex items-center gap-2">
          <IconToggle on={!!el.both} onClick={() => set({ both: !el.both })} icon={MoveUpRight} />
          <span className="text-xs text-muted">Double flèche</span>
        </div>
      )}

      {el.type === "icon" && (
        <>
          <Field label="Couleur"><ColorRow value={el.color} onChange={(c) => set({ color: c })} /></Field>
          <Field label="Épaisseur du trait"><Slider label="" value={el.strokeW ?? 2} min={1} max={4} step={0.25} onChange={(n) => set({ strokeW: n })} /></Field>
        </>
      )}

      {el.type === "pattern" && (
        <>
          <Field label="Couleur"><ColorRow value={el.fill} onChange={(c) => set({ fill: c })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Espacement"><Stepper value={el.gap ?? 30} onChange={(n) => set({ gap: n })} min={10} max={90} step={2} /></Field>
            <Field label="Épaisseur"><Stepper value={el.dot ?? 4} onChange={(n) => set({ dot: n })} min={1} max={16} /></Field>
          </div>
        </>
      )}

      {el.type === "image" && (
        <>
          <button onClick={onReplaceImage} className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-white/85 hover:bg-white/10">Remplacer l'image</button>
          <Field label="Arrondi"><Stepper value={el.radius ?? 0} onChange={(n) => set({ radius: n })} min={0} max={300} step={4} /></Field>
          <Field label="Bordure"><ColorRow value={el.stroke ?? "#ffffff"} onChange={(c) => set({ stroke: c })} /></Field>
          <Field label="Épaisseur bordure"><Stepper value={el.strokeW ?? 0} onChange={(n) => set({ strokeW: n })} min={0} max={40} /></Field>
        </>
      )}

      {el.type !== "text" && (
        <Field label="Ombre">
          <Segmented options={SHADOW_OPTIONS.map((s) => ({ k: s.k, l: s.l }))} value={el.shadow ?? "none"} onChange={(v) => set({ shadow: v })} />
        </Field>
      )}

      <Field label={`Opacité ${Math.round((el.opacity ?? 1) * 100)}%`}>
        <input type="range" min={5} max={100} value={(el.opacity ?? 1) * 100} onChange={(e) => set({ opacity: Number(e.target.value) / 100 })} className="w-full accent-brand-500" />
      </Field>

      <div className="border-t border-white/10 pt-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Transformation</p>
        <div className="flex items-center gap-2">
          <Field label="Rotation"><Stepper value={((el.rot % 360) + 360) % 360} onChange={(n) => set({ rot: n })} min={0} max={359} step={5} /></Field>
          <div className="ml-auto flex items-end gap-1">
            <IconToggle on={!!el.flipH} onClick={() => set({ flipH: !el.flipH })} icon={FlipHorizontal} />
            <IconToggle on={!!el.flipV} onClick={() => set({ flipV: !el.flipV })} icon={FlipVertical} />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Aligner sur la diapo</p>
        <div className="grid grid-cols-6 gap-1">
          <PanelBtn onClick={() => onAlign("left")} icon={AlignStartVertical} title="Gauche" />
          <PanelBtn onClick={() => onAlign("centerH")} icon={AlignCenterVertical} title="Centre horizontal" />
          <PanelBtn onClick={() => onAlign("right")} icon={AlignEndVertical} title="Droite" />
          <PanelBtn onClick={() => onAlign("top")} icon={AlignStartHorizontal} title="Haut" />
          <PanelBtn onClick={() => onAlign("centerV")} icon={AlignCenterHorizontal} title="Centre vertical" />
          <PanelBtn onClick={() => onAlign("bottom")} icon={AlignEndHorizontal} title="Bas" />
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Disposition</p>
        <div className="grid grid-cols-5 gap-1.5">
          <PanelBtn onClick={() => onLayer("front")} icon={BringToFront} title="Premier plan" />
          <PanelBtn onClick={() => onLayer("back")} icon={SendToBack} title="Arrière-plan" />
          <PanelBtn onClick={onLock} icon={Lock} title="Verrouiller" />
          <PanelBtn onClick={onDup} icon={Copy} title="Dupliquer" />
          <PanelBtn onClick={onDelete} icon={Trash2} title="Supprimer" danger />
        </div>
      </div>
    </div>
  );
}

// ── Panneau de la diapo (fond + décor + mise en page) ────────────────
function SlidePanel({ slideBg, lockedCount, onBg, onBgAll, onDecor, onUnlockAll, onLayout, onAddSlide }: {
  slideBg: string; lockedCount: number; onBg: (bg: string) => void; onBgAll: (bg: string) => void; onDecor: (k: string) => void;
  onUnlockAll: () => void; onLayout: (k: string) => void; onAddSlide: (k: string) => void;
}) {
  return (
    <div className="space-y-5">
      <BackgroundPanel slideBg={slideBg} onBg={onBg} onBgAll={onBgAll} onDecor={onDecor} />

      <div>
        <SectionTitle icon={LayoutTemplate}>Mise en page</SectionTitle>
        <div className="grid grid-cols-2 gap-1.5">
          {LAYOUTS.map((l) => (
            <div key={l.k} className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] hover:border-white/25">
              <button onClick={() => onLayout(l.k)} className="block w-full">
                <div className="relative h-14 w-full bg-[#121420]">
                  {l.boxes.map((b, i) => (
                    <span key={i} className="absolute rounded-[2px]" style={{
                      left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`,
                      borderRadius: b.r ? "50%" : 2,
                      background: b.c === "a" ? "#5b8bff" : b.c === "t" ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)",
                    }} />
                  ))}
                </div>
                <span className="block px-2 py-1 text-left text-[11px] text-white/80">{l.l}</span>
              </button>
              <button onClick={() => onAddSlide(l.k)} title="Ajouter en nouvelle diapo" className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-black/50 text-white/70 opacity-0 transition hover:bg-black/70 hover:text-white group-hover:opacity-100"><Plus className="size-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {lockedCount > 0 && (
        <button onClick={onUnlockAll} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-sm text-white/80 hover:bg-white/5"><LockOpen className="size-4" /> Déverrouiller {lockedCount} élément{lockedCount > 1 ? "s" : ""}</button>
      )}
    </div>
  );
}

function BackgroundPanel({ slideBg, onBg, onBgAll, onDecor }: { slideBg: string; onBg: (bg: string) => void; onBgAll: (bg: string) => void; onDecor: (k: string) => void }) {
  const [m, setM] = useState<BgModel>(() => parseBg(slideBg));
  const emitted = useRef(slideBg);
  const bgFileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (slideBg !== emitted.current) { setM(parseBg(slideBg)); emitted.current = slideBg; }
  }, [slideBg]);
  const apply = (next: BgModel) => { setM(next); const s = buildBg(next); emitted.current = s; onBg(s); };

  const setKind = (kind: BgKind) => {
    if (kind === m.kind) return;
    if (kind === "solid") apply({ ...m, kind, colors: [m.colors[0] ?? "#0a0e1a"] });
    else if (kind === "image") apply({ ...m, kind });
    else apply({ ...m, kind, colors: m.colors.length >= 2 ? m.colors : [m.colors[0] ?? "#3b6dff", "#7b3bff"] });
  };
  const setColor = (i: number, c: string) => { const colors = m.colors.slice(); colors[i] = c; apply({ ...m, colors }); };
  const addStop = () => { if (m.colors.length < 5) apply({ ...m, colors: [...m.colors, "#ffffff"] }); };
  const removeStop = (i: number) => { if (m.colors.length > 2) apply({ ...m, colors: m.colors.filter((_, j) => j !== i) }); };
  const onBgImage = async (f: File | undefined) => { if (!f) return; const src = await resizeImage(f); apply({ ...m, kind: "image", src, dim: m.dim || 0.35 }); };

  const RADIAL_POS = [
    { k: "50% 45%", l: "Centre" }, { k: "20% 20%", l: "Haut-G" }, { k: "80% 20%", l: "Haut-D" },
    { k: "20% 80%", l: "Bas-G" }, { k: "80% 80%", l: "Bas-D" },
  ];

  return (
    <div>
      <SectionTitle icon={PaintBucket}>Fond de la diapo</SectionTitle>
      <div className="mb-2.5 h-16 rounded-xl border border-white/10" style={{ background: buildBg(m) }} />
      <div className="mb-3">
        <Segmented
          options={[{ k: "solid", l: "Uni", i: PaintBucket }, { k: "linear", l: "Dégradé", i: Blend }, { k: "radial", l: "Radial", i: Circle }, { k: "image", l: "Image", i: ImageIcon }]}
          value={m.kind} onChange={(v) => setKind(v as BgKind)}
        />
      </div>

      {m.kind === "solid" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {BG_SWATCHES.map((c) => (
              <button key={c} onClick={() => apply({ ...m, colors: [c] })} className={`size-6 rounded-md border ${m.colors[0] === c ? "border-brand-400 ring-2 ring-brand-400/40" : "border-white/15"}`} style={{ background: c }} />
            ))}
            <input type="color" value={m.colors[0]?.startsWith("#") ? m.colors[0] : "#0a0e1a"} onChange={(e) => apply({ ...m, colors: [e.target.value] })} className="size-6 cursor-pointer rounded-md border border-white/15 bg-transparent p-0" />
          </div>
        </div>
      )}

      {(m.kind === "linear" || m.kind === "radial") && (
        <div className="space-y-2">
          {m.colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={c.startsWith("#") ? c : "#ffffff"} onChange={(e) => setColor(i, e.target.value)} className="size-7 shrink-0 cursor-pointer rounded-md border border-white/15 bg-transparent p-0" />
              <span className="flex-1 truncate font-mono text-[11px] text-muted">{c}</span>
              {m.colors.length > 2 && (
                <button onClick={() => removeStop(i)} className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-red-400" title="Retirer"><X className="size-3.5" /></button>
              )}
            </div>
          ))}
          {m.colors.length < 5 && (
            <button onClick={addStop} className="flex items-center gap-1 text-xs text-brand-200 hover:text-white"><Plus className="size-3.5" /> Ajouter une couleur</button>
          )}
          {m.kind === "linear" && <Slider label="Angle" value={m.angle} min={0} max={360} onChange={(n) => apply({ ...m, angle: n })} />}
          {m.kind === "radial" && (
            <Field label="Position">
              <div className="flex flex-wrap gap-1">
                {RADIAL_POS.map((p) => (
                  <button key={p.k} onClick={() => apply({ ...m, pos: p.k })} className={`rounded-md border px-2 py-1 text-[11px] ${m.pos === p.k ? "border-brand-400 text-white" : "border-white/10 text-muted hover:bg-white/5"}`}>{p.l}</button>
                ))}
              </div>
            </Field>
          )}
          <div className="pt-1">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">Inspirations</p>
            <div className="grid grid-cols-6 gap-1.5">
              {GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => apply({ ...m, colors: g })} title="Appliquer" className="h-7 rounded-md border border-white/10 hover:border-white/30" style={{ background: `linear-gradient(135deg,${g.join(",")})` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {m.kind === "image" && (
        <div className="space-y-2">
          <button onClick={() => bgFileRef.current?.click()} className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-white/85 hover:bg-white/10">{m.src ? "Changer l'image" : "Choisir une image"}</button>
          <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onBgImage(e.target.files?.[0]); e.target.value = ""; }} />
          {m.src && <Slider label={`Assombrir ${Math.round((m.dim ?? 0) * 100)}%`} value={Math.round((m.dim ?? 0) * 100)} min={0} max={80} onChange={(n) => apply({ ...m, dim: n / 100 })} />}
        </div>
      )}

      <button onClick={() => onBgAll(buildBg(m))} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-1.5 text-xs text-white/70 hover:bg-white/5"><Layers className="size-3.5" /> Appliquer à toutes les diapos</button>

      {/* Décor : éléments ajoutés en arrière-plan */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <SectionTitle icon={SparkleIcon}>Décor</SectionTitle>
        <div className="space-y-2.5">
          {DECOR_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/70">{g.label}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {g.items.map((it) => (
                  <button key={it.k} onClick={() => onDecor(it.k)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/85 hover:bg-white/[0.07]">
                    <it.i className="size-3.5 shrink-0 text-brand-200" /> <span className="truncate">{it.l}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted">Chaque décor est posé en arrière-plan et reste déplaçable, redimensionnable et personnalisable.</p>
      </div>
    </div>
  );
}
