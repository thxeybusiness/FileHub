"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type ReactElement } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check, Loader2, Workflow, AlertTriangle,
  Maximize2, Sparkles, LayoutTemplate, Shapes, ChevronDown, Palette, Download, ImageIcon,
  Copy, Eye, Code2, ZoomIn, ZoomOut, Maximize, X, ArrowLeftRight, Boxes, Waypoints,
  Table2, Calendar, PieChart, Network, Route, GitBranch, LayoutGrid, Clock, Plus, Trash2, RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";
import { RealtimeEngine, type Actions } from "./realtime";
import { CollabBar } from "./collab-bar";
import type { Peer } from "./use-collab";

type Crumb = { id: string; name: string };
type SaveState = "saved" | "saving" | "idle" | "error";

// ── Modèles de départ (un par type de diagramme Mermaid) ─────────────
type Template = { key: string; label: string; icon: LucideIcon; code: string };
const TEMPLATES: Template[] = [
  { key: "flow", label: "Organigramme", icon: Workflow, code: `graph TD
  A[Début] --> B{Condition ?}
  B -->|Oui| C[Traitement]
  B -->|Non| D[Autre voie]
  C --> E[Fin]
  D --> E` },
  { key: "sequence", label: "Séquence", icon: ArrowLeftRight, code: `sequenceDiagram
  actor U as Utilisateur
  participant S as Serveur
  participant DB as Base de données
  U->>S: Requête
  S->>DB: Lecture
  DB-->>S: Résultat
  S-->>U: Réponse` },
  { key: "class", label: "Classes", icon: Boxes, code: `classDiagram
  class Animal {
    +String nom
    +manger()
  }
  class Chien {
    +aboyer()
  }
  Animal <|-- Chien` },
  { key: "state", label: "États", icon: Waypoints, code: `stateDiagram-v2
  [*] --> Inactif
  Inactif --> Actif : démarrer
  Actif --> Inactif : arrêter
  Actif --> [*]` },
  { key: "er", label: "Entité-relation", icon: Table2, code: `erDiagram
  CLIENT ||--o{ COMMANDE : passe
  COMMANDE ||--|{ LIGNE : contient
  PRODUIT ||--o{ LIGNE : figure` },
  { key: "gantt", label: "Gantt", icon: Calendar, code: `gantt
  title Planning
  dateFormat YYYY-MM-DD
  section Conception
  Cadrage : 2024-01-01, 7d
  Maquettes : 2024-01-08, 5d
  section Développement
  Intégration : 2024-01-15, 10d` },
  { key: "pie", label: "Camembert", icon: PieChart, code: `pie showData title Répartition
  "Produit A" : 45
  "Produit B" : 30
  "Produit C" : 25` },
  { key: "mindmap", label: "Carte mentale", icon: Network, code: `mindmap
  FileHub
    Documents
      Texte
      Feuilles
    Partage
      Liens
      Espaces` },
  { key: "journey", label: "Parcours", icon: Route, code: `journey
  title Parcours utilisateur
  section Découverte
    Visite le site: 5: Visiteur
    S'inscrit: 4: Visiteur
  section Usage
    Crée un document: 5: Client` },
  { key: "git", label: "Git", icon: GitBranch, code: `gitGraph
  commit
  branch dev
  checkout dev
  commit
  checkout main
  merge dev` },
  { key: "quadrant", label: "Quadrant", icon: LayoutGrid, code: `quadrantChart
  title Priorisation
  x-axis Faible --> Fort
  y-axis Faible --> Fort
  quadrant-1 Prioritaire
  quadrant-2 À planifier
  quadrant-3 À éviter
  quadrant-4 Rapide
  Projet A: [0.7, 0.8]
  Projet B: [0.3, 0.4]` },
  { key: "timeline", label: "Frise", icon: Clock, code: `timeline
  title Historique
  2022 : Lancement
  2023 : Croissance : 10k utilisateurs
  2024 : Expansion` },
];

// ── Éléments à insérer au curseur (surtout organigrammes) ────────────
type Snip = { l: string; t: string };
const SNIPPET_GROUPS: { label: string; items: Snip[] }[] = [
  {
    label: "Nœuds", items: [
      { l: "Rectangle", t: "id[Texte]" },
      { l: "Arrondi", t: "id(Texte)" },
      { l: "Cercle", t: "id((Texte))" },
      { l: "Losange", t: "id{Décision}" },
      { l: "Hexagone", t: "id{{Texte}}" },
      { l: "Parallélogramme", t: "id[/Texte/]" },
      { l: "Cylindre", t: "id[(Données)]" },
      { l: "Drapeau", t: "id>Texte]" },
    ],
  },
  {
    label: "Liens", items: [
      { l: "Flèche", t: "A --> B" },
      { l: "Ligne", t: "A --- B" },
      { l: "Pointillé", t: "A -.-> B" },
      { l: "Épais", t: "A ==> B" },
      { l: "Étiquette", t: "A -->|texte| B" },
    ],
  },
  {
    label: "Conteneurs & notes", items: [
      { l: "Sous-graphe", t: "subgraph Titre\n  A --> B\nend" },
      { l: "Note (séquence)", t: "Note over A,B: remarque" },
      { l: "Boucle (séquence)", t: "loop Chaque jour\n  A->>B: ping\nend" },
    ],
  },
  {
    label: "Style", items: [
      { l: "Style d'un nœud", t: "style A fill:#5b8bff,stroke:#fff,color:#fff" },
      { l: "Classe réutilisable", t: "classDef fort fill:#f97316,stroke:#fff,color:#fff;\nclass A,B fort" },
    ],
  },
];

// ── Palettes « FileHub » (thème Mermaid sur mesure, aux couleurs de l'app) ──
const FONT = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
// Palette de séries (camemberts, git, etc.) — arc-en-ciel de la marque.
const SERIES = ["#5b8bff", "#7b3bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff", "#2dd4bf", "#f59e0b", "#f472b6"];
function seriesVars(): Record<string, string> {
  const o: Record<string, string> = {};
  SERIES.forEach((c, i) => { o[`pie${i + 1}`] = c; });
  ["#5b8bff", "#22d3ee", "#34d399", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a78bff"].forEach((c, i) => { o[`git${i}`] = c; o[`gitBranchLabel${i}`] = "#0a0e17"; });
  return o;
}

type PaletteInput = { key: string; label: string; swatch: string; light?: boolean; fill: string; border: string; text: string; line: string; soft: string; edgeBg: string; note: string };
type Palette = { key: string; label: string; swatch: string; light: boolean; vars: Record<string, string> };
function makePalette(o: PaletteInput): Palette {
  return {
    key: o.key, label: o.label, swatch: o.swatch, light: !!o.light,
    vars: {
      background: "transparent", fontFamily: FONT, fontSize: "15px",
      primaryColor: o.fill, primaryBorderColor: o.border, primaryTextColor: o.text,
      secondaryColor: o.soft, secondaryBorderColor: o.border, secondaryTextColor: o.text,
      tertiaryColor: o.soft, tertiaryBorderColor: o.border, tertiaryTextColor: o.text,
      lineColor: o.line, textColor: o.text,
      mainBkg: o.fill, nodeBorder: o.border, nodeTextColor: o.text,
      clusterBkg: o.soft, clusterBorder: o.border, titleColor: o.text,
      edgeLabelBackground: o.edgeBg, labelBackgroundColor: o.edgeBg,
      actorBkg: o.fill, actorBorder: o.border, actorTextColor: o.text, actorLineColor: o.line,
      signalColor: o.line, signalTextColor: o.text,
      labelBoxBkgColor: o.fill, labelBoxBorderColor: o.border, labelTextColor: o.text, loopTextColor: o.text,
      noteBkgColor: o.note, noteTextColor: "#3a2a00", noteBorderColor: o.border,
      activationBkgColor: o.soft, activationBorderColor: o.border,
      classText: o.text, attributeBackgroundColorOdd: o.soft, attributeBackgroundColorEven: o.edgeBg,
      pieTitleTextSize: "18px", pieSectionTextSize: "15px", pieStrokeColor: o.edgeBg, pieOuterStrokeColor: o.edgeBg,
      ...seriesVars(),
    },
  };
}

const PALETTES: Palette[] = [
  makePalette({ key: "filehub", label: "FileHub", swatch: "#5b8bff", fill: "#3b6dff", border: "#9db6ff", text: "#ffffff", line: "#8aa2ff", soft: "rgba(91,139,255,0.12)", edgeBg: "#141a2e", note: "#fde68a" }),
  makePalette({ key: "violet", label: "Améthyste", swatch: "#7b3bff", fill: "#7b3bff", border: "#c9b6ff", text: "#ffffff", line: "#b39cff", soft: "rgba(123,59,255,0.14)", edgeBg: "#181233", note: "#fbcfe8" }),
  makePalette({ key: "ocean", label: "Océan", swatch: "#22d3ee", fill: "#0e7490", border: "#67e8f9", text: "#ecfeff", line: "#22d3ee", soft: "rgba(34,211,238,0.12)", edgeBg: "#0a1f27", note: "#fde68a" }),
  makePalette({ key: "mint", label: "Menthe", swatch: "#34d399", fill: "#0f766e", border: "#6ee7b7", text: "#ecfdf5", line: "#34d399", soft: "rgba(52,211,153,0.12)", edgeBg: "#0b201b", note: "#fde68a" }),
  makePalette({ key: "coral", label: "Corail", swatch: "#fb7185", fill: "#e11d48", border: "#fda4af", text: "#fff1f2", line: "#fb7185", soft: "rgba(251,113,133,0.14)", edgeBg: "#2a0f16", note: "#fde68a" }),
  makePalette({ key: "light", label: "Clair", swatch: "#e2e8f0", light: true, fill: "#eef2ff", border: "#5b8bff", text: "#1e293b", line: "#64748b", soft: "rgba(91,139,255,0.10)", edgeBg: "#ffffff", note: "#fef3c7" }),
];
const paletteOf = (k: string) => PALETTES.find((p) => p.key === k) ?? PALETTES[0];

// CSS injecté dans le SVG : traits plus épais, coins arrondis, ombres, typo.
const THEME_CSS = `
  .edgePath .path, .flowchart-link, path.messageLine0, path.messageLine1, .relation, .transition { stroke-width: 2px !important; }
  .node rect, .node polygon, .node circle, .node ellipse, .node path, .cluster rect, .er.entityBox, .actor, .task, .exclude-range { stroke-width: 2px; }
  .node rect, .node ellipse, .node circle, .node polygon, .node path, .actor, .er.entityBox { filter: drop-shadow(0 6px 16px rgba(0,0,0,.30)); }
  .node rect { rx: 13px; ry: 13px; }
  .cluster rect { rx: 16px; ry: 16px; }
  .actor { rx: 12px; ry: 12px; }
  .nodeLabel, .edgeLabel, .messageText, .loopText, text.actor, .titleText, .pieTitleText, .sectionTitle, .taskText { font-weight: 600; }
  .edgeLabel { border-radius: 6px; padding: 2px 6px; }
  .pieCircle, .pieOuterCircle { stroke-width: 2px; }
  .marker { stroke-width: 1.5px; }
`;

const DIRS: { k: string; i: LucideIcon; l: string }[] = [
  { k: "TD", i: ArrowDown, l: "Vertical" }, { k: "LR", i: ArrowRight, l: "Horizontal" },
  { k: "BT", i: ArrowUp, l: "Bas → haut" }, { k: "RL", i: ArrowLeft, l: "Droite → gauche" },
];

// ── Mode « Simple » : constructeur visuel d'organigramme ──────────────
// L'utilisateur ajoute des étapes (boîtes) et les relie ; on génère le
// code Mermaid en coulisses. Le mode Code reste dispo pour les experts.
type FShape = "rect" | "round" | "stadium" | "circle" | "diamond" | "hexagon" | "parallelogram" | "cylinder";
type FNode = { id: string; label: string; shape: FShape };
type FEdge = { from: string; to: string; label: string };
type Flow = { dir: string; nodes: FNode[]; edges: FEdge[] };

const SHAPES: { k: FShape; l: string }[] = [
  { k: "rect", l: "Rectangle" }, { k: "round", l: "Coins arrondis" }, { k: "stadium", l: "Pilule" },
  { k: "circle", l: "Cercle" }, { k: "diamond", l: "Décision (losange)" }, { k: "hexagon", l: "Hexagone" },
  { k: "parallelogram", l: "Données" }, { k: "cylinder", l: "Base de données" },
];
const SHAPE_LABEL: Record<FShape, string> = Object.fromEntries(SHAPES.map((s) => [s.k, s.l])) as Record<FShape, string>;

const q = (s: string) => `"${(s || " ").replace(/"/g, "&quot;").replace(/\n/g, "<br/>")}"`;
function wrapShape(shape: FShape, label: string): string {
  const L = q(label);
  switch (shape) {
    case "round": return `(${L})`;
    case "stadium": return `([${L}])`;
    case "circle": return `((${L}))`;
    case "diamond": return `{${L}}`;
    case "hexagon": return `{{${L}}}`;
    case "parallelogram": return `[/${L}/]`;
    case "cylinder": return `[(${L})]`;
    default: return `[${L}]`;
  }
}
function genFlow(f: Flow): string {
  if (!f.nodes.length) return "";
  const out = [`graph ${f.dir || "TD"}`];
  for (const n of f.nodes) out.push(`  ${n.id}${wrapShape(n.shape, n.label)}`);
  for (const e of f.edges) {
    const lbl = e.label && e.label.trim() ? `|${q(e.label)}|` : "";
    out.push(`  ${e.from} -->${lbl} ${e.to}`);
  }
  return out.join("\n");
}

const unq = (s: string) => s.trim().replace(/^"([\s\S]*)"$/, "$1").replace(/&quot;/g, '"').replace(/<br\s*\/?>/gi, "\n");
function matchBracket(rest: string): { shape: FShape; label: string; len: number } | null {
  const pats: [RegExp, FShape][] = [
    [/^\[\(([\s\S]*?)\)\]/, "cylinder"], [/^\(\(([\s\S]*?)\)\)/, "circle"], [/^\(\[([\s\S]*?)\]\)/, "stadium"],
    [/^\{\{([\s\S]*?)\}\}/, "hexagon"], [/^\[\/([\s\S]*?)\/\]/, "parallelogram"],
    [/^\[([\s\S]*?)\]/, "rect"], [/^\(([\s\S]*?)\)/, "round"], [/^\{([\s\S]*?)\}/, "diamond"],
  ];
  for (const [re, shape] of pats) { const m = rest.match(re); if (m) return { shape, label: unq(m[1]), len: m[0].length }; }
  return null;
}
// Analyse le code Mermaid en modèle simple. Renvoie null si le diagramme
// n'est pas un organigramme « simple » (autre type, styles, sous-graphes…).
function parseFlow(code: string): Flow | null {
  if (!code.trim()) return { dir: "TD", nodes: [], edges: [] };
  const lines = code.split(/\r?\n/);
  const head = (lines[0] || "").trim().match(/^(?:graph|flowchart)\s+(TB|TD|BT|RL|LR)\b/i);
  if (!head) return null;
  const dir = head[1].toUpperCase() === "TB" ? "TD" : head[1].toUpperCase();
  const map = new Map<string, FNode>();
  const edges: FEdge[] = [];
  const reg = (id: string, shape: FShape, label: string, explicit: boolean) => {
    const ex = map.get(id);
    if (!ex) map.set(id, { id, shape: explicit ? shape : "rect", label: explicit ? label : id });
    else if (explicit) { ex.shape = shape; ex.label = label; }
  };
  const readNode = (s: string) => {
    const m = s.match(/^\s*([A-Za-z0-9_]+)/);
    if (!m) return null;
    const id = m[1];
    const rest = s.slice(m[0].length);
    const b = matchBracket(rest);
    if (b) return { id, shape: b.shape, label: b.label, explicit: true, rest: rest.slice(b.len) };
    return { id, shape: "rect" as FShape, label: id, explicit: false, rest };
  };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) continue;
    // Constructions qu'on ne sait pas représenter simplement → bascule Code.
    if (/^(style|classDef|class|subgraph|end|linkStyle|direction|click)\b/i.test(line)) return null;
    let cur = readNode(line);
    if (!cur) continue;
    reg(cur.id, cur.shape, cur.label, cur.explicit);
    let rest = cur.rest;
    let guard = 0;
    while (rest.trim() && guard++ < 40) {
      const lm = rest.match(/^\s*(-{2,3}>|-\.->|={2,3}>|-{3}|-\.-|--[ox])\s*(?:\|([^|]*)\|\s*)?/);
      if (!lm) return null; // syntaxe non gérée en mode simple
      const label = lm[2] ? unq(lm[2]) : "";
      rest = rest.slice(lm[0].length);
      const nxt = readNode(rest);
      if (!nxt) return null;
      reg(nxt.id, nxt.shape, nxt.label, nxt.explicit);
      edges.push({ from: cur.id, to: nxt.id, label });
      cur = nxt; rest = nxt.rest;
    }
  }
  return { dir, nodes: [...map.values()], edges };
}

const clamp01 = (v: unknown) => Math.max(0, Math.min(1, Number(v) || 0));
const esc = (s: string) => (s || "").replace(/"/g, "'");

// ── Séquence ──────────────────────────────────────────────────────────
type SPart = { id: string; label: string; actor: boolean };
type SMsg = { from: string; to: string; text: string; dashed: boolean };
type Seq = { parts: SPart[]; msgs: SMsg[] };
function genSeq(m: Seq): string {
  if (!m.parts.length) return "";
  const out = ["sequenceDiagram"];
  for (const p of m.parts) out.push(`  ${p.actor ? "actor" : "participant"} ${p.id}${p.label && p.label !== p.id ? ` as ${p.label}` : ""}`);
  for (const g of m.msgs) out.push(`  ${g.from}${g.dashed ? "-->>" : "->>"}${g.to}: ${g.text || " "}`);
  return out.join("\n");
}
function parseSeq(code: string): Seq | null {
  if (!code.trim()) return { parts: [], msgs: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*sequenceDiagram\b/i.test(ls[0] || "")) return null;
  const parts: SPart[] = []; const msgs: SMsg[] = []; const map = new Map<string, SPart>();
  const ensure = (id: string) => { if (!map.has(id)) { const p = { id, label: id, actor: false }; map.set(id, p); parts.push(p); } return map.get(id)!; };
  for (let i = 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line || line.startsWith("%%")) continue;
    const pm = line.match(/^(participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?$/i);
    if (pm) { const p = ensure(pm[2]); p.actor = pm[1].toLowerCase() === "actor"; if (pm[3]) p.label = pm[3].trim(); continue; }
    const mm = line.match(/^([A-Za-z0-9_]+)\s*(--?>>|--?>|-x|--x)\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (mm) { ensure(mm[1]); ensure(mm[3]); msgs.push({ from: mm[1], to: mm[3], text: mm[4].trim(), dashed: mm[2].startsWith("--") }); continue; }
    return null;
  }
  return { parts, msgs };
}

// ── États ─────────────────────────────────────────────────────────────
type StState = { id: string; label: string };
type StTrans = { from: string; to: string; label: string };
type St = { states: StState[]; trans: StTrans[] };
function genState(m: St): string {
  if (!m.states.length && !m.trans.length) return "";
  const out = ["stateDiagram-v2"];
  for (const s of m.states) out.push(`  state ${q(s.label)} as ${s.id}`);
  for (const t of m.trans) out.push(`  ${t.from} --> ${t.to}${t.label && t.label.trim() ? ` : ${t.label}` : ""}`);
  return out.join("\n");
}
function parseState(code: string): St | null {
  if (!code.trim()) return { states: [], trans: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*stateDiagram(-v2)?\b/i.test(ls[0] || "")) return null;
  const map = new Map<string, StState>(); const states: StState[] = []; const trans: StTrans[] = [];
  const ensure = (id: string) => { if (id === "[*]") return; if (!map.has(id)) { const s = { id, label: id }; map.set(id, s); states.push(s); } };
  for (let i = 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line || line.startsWith("%%")) continue;
    const sm = line.match(/^state\s+"([^"]*)"\s+as\s+([A-Za-z0-9_]+)$/i);
    if (sm) { ensure(sm[2]); const s = map.get(sm[2]); if (s) s.label = sm[1]; continue; }
    const tm = line.match(/^(\[\*\]|[A-Za-z0-9_]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_]+)\s*(?::\s*(.*))?$/);
    if (tm) { ensure(tm[1]); ensure(tm[2]); trans.push({ from: tm[1], to: tm[2], label: (tm[3] || "").trim() }); continue; }
    return null;
  }
  return { states, trans };
}

// ── Classes ───────────────────────────────────────────────────────────
type CClass = { name: string; members: string };
type CRel = { from: string; type: string; to: string };
type Cls = { classes: CClass[]; rels: CRel[] };
const CLASS_RELS = [{ v: "<|--", l: "Héritage ▷" }, { v: "*--", l: "Composition ◆" }, { v: "o--", l: "Agrégation ◇" }, { v: "-->", l: "Association →" }, { v: "..>", l: "Dépendance ⇢" }, { v: "--", l: "Lien —" }];
function genClass(m: Cls): string {
  if (!m.classes.length) return "";
  const out = ["classDiagram"];
  for (const c of m.classes) {
    const mem = c.members.split("\n").map((s) => s.trim()).filter(Boolean);
    if (mem.length) { out.push(`  class ${c.name} {`); for (const x of mem) out.push(`    ${x}`); out.push("  }"); }
    else out.push(`  class ${c.name}`);
  }
  for (const r of m.rels) out.push(`  ${r.from} ${r.type} ${r.to}`);
  return out.join("\n");
}
function parseClass(code: string): Cls | null {
  if (!code.trim()) return { classes: [], rels: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*classDiagram\b/i.test(ls[0] || "")) return null;
  const map = new Map<string, CClass>(); const classes: CClass[] = []; const rels: CRel[] = [];
  const ensure = (n: string) => { if (!map.has(n)) { const c = { name: n, members: "" }; map.set(n, c); classes.push(c); } return map.get(n)!; };
  let i = 1;
  while (i < ls.length) {
    const line = ls[i].trim(); i++;
    if (!line || line.startsWith("%%")) continue;
    const open = line.match(/^class\s+([A-Za-z0-9_]+)\s*\{$/);
    if (open) { const c = ensure(open[1]); const mem: string[] = []; while (i < ls.length && ls[i].trim() !== "}") { const t = ls[i].trim(); if (t) mem.push(t); i++; } i++; c.members = mem.join("\n"); continue; }
    const single = line.match(/^class\s+([A-Za-z0-9_]+)$/);
    if (single) { ensure(single[1]); continue; }
    const rel = line.match(/^([A-Za-z0-9_]+)\s*(<\|--|\*--|o--|-->|\.\.>|<\|\.\.|\.\.|--)\s*([A-Za-z0-9_]+)\s*(?::.*)?$/);
    if (rel) { ensure(rel[1]); ensure(rel[3]); rels.push({ from: rel[1], type: rel[2], to: rel[3] }); continue; }
    return null;
  }
  return { classes, rels };
}

// ── Entité-relation ───────────────────────────────────────────────────
type EEntity = { name: string; attrs: string };
type ERel = { from: string; card: string; to: string; label: string };
type Er = { entities: EEntity[]; rels: ERel[] };
const ER_CARDS = [{ v: "||--o{", l: "1 → N" }, { v: "||--||", l: "1 → 1" }, { v: "}o--o{", l: "N → N" }, { v: "||--|{", l: "1 → 1..N" }, { v: "}|--||", l: "N → 1" }, { v: "}o--||", l: "N → 0..1" }];
function genEr(m: Er): string {
  if (!m.entities.length && !m.rels.length) return "";
  const out = ["erDiagram"];
  for (const r of m.rels) out.push(`  ${r.from} ${r.card} ${r.to} : ${r.label || "lié"}`);
  for (const e of m.entities) {
    const a = e.attrs.split("\n").map((s) => s.trim()).filter(Boolean);
    const inRel = m.rels.some((r) => r.from === e.name || r.to === e.name);
    if (a.length) { out.push(`  ${e.name} {`); for (const x of a) out.push(`    ${x}`); out.push("  }"); }
    else if (!inRel) { out.push(`  ${e.name} {`); out.push("  }"); }
  }
  return out.join("\n");
}
function parseEr(code: string): Er | null {
  if (!code.trim()) return { entities: [], rels: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*erDiagram\b/i.test(ls[0] || "")) return null;
  const map = new Map<string, EEntity>(); const entities: EEntity[] = []; const rels: ERel[] = [];
  const ensure = (n: string) => { if (!map.has(n)) { const e = { name: n, attrs: "" }; map.set(n, e); entities.push(e); } return map.get(n)!; };
  let i = 1;
  while (i < ls.length) {
    const line = ls[i].trim(); i++;
    if (!line || line.startsWith("%%")) continue;
    const open = line.match(/^([A-Za-z0-9_]+)\s*\{$/);
    if (open) { const e = ensure(open[1]); const a: string[] = []; while (i < ls.length && ls[i].trim() !== "}") { const t = ls[i].trim(); if (t) a.push(t); i++; } i++; e.attrs = a.join("\n"); continue; }
    const rel = line.match(/^([A-Za-z0-9_]+)\s+([|}][o|](?:--|\.\.)[o|][|{])\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (rel) { ensure(rel[1]); ensure(rel[3]); rels.push({ from: rel[1], card: rel[2], to: rel[3], label: (rel[4] || "").trim() }); continue; }
    return null;
  }
  return { entities, rels };
}

// ── Gantt ─────────────────────────────────────────────────────────────
type GTask = { section: string; name: string; start: string; dur: string };
type Gantt = { title: string; tasks: GTask[] };
function genGantt(m: Gantt): string {
  if (!m.tasks.length) return "";
  const out = ["gantt", `  title ${m.title || "Planning"}`, "  dateFormat YYYY-MM-DD"];
  let cur = "";
  for (const t of m.tasks) { if (t.section && t.section !== cur) { out.push(`  section ${t.section}`); cur = t.section; } out.push(`  ${t.name || "Tâche"} :${t.start || "2024-01-01"}, ${t.dur || "3d"}`); }
  return out.join("\n");
}
function parseGantt(code: string): Gantt | null {
  if (!code.trim()) return { title: "", tasks: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*gantt\b/i.test(ls[0] || "")) return null;
  let title = ""; let section = ""; const tasks: GTask[] = [];
  for (let i = 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line || line.startsWith("%%") || /^dateFormat\b/i.test(line) || /^axisFormat\b/i.test(line) || /^excludes\b/i.test(line)) continue;
    const tm = line.match(/^title\s+(.*)$/i); if (tm) { title = tm[1].trim(); continue; }
    const sm = line.match(/^section\s+(.*)$/i); if (sm) { section = sm[1].trim(); continue; }
    const km = line.match(/^(.+?)\s*:\s*(.*)$/);
    if (km) {
      const parts = km[2].split(",").map((s) => s.trim());
      const dur = parts.find((p) => /^\d+[dhwmy]$/i.test(p)) || "";
      const start = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p)) || "";
      // Dépendances/ids/états non gérés simplement → mode Code.
      const extra = parts.some((p) => p && p !== dur && p !== start && !/^(active|done|crit|milestone)$/i.test(p));
      if (extra || !start) return null;
      tasks.push({ section, name: km[1].trim(), start, dur }); continue;
    }
    return null;
  }
  return { title, tasks };
}

// ── Camembert ─────────────────────────────────────────────────────────
type PSlice = { label: string; value: number };
type Pie = { title: string; slices: PSlice[] };
function genPie(m: Pie): string {
  if (!m.slices.length) return "";
  const out = [`pie showData title ${m.title || "Répartition"}`];
  for (const s of m.slices) out.push(`  "${esc(s.label)}" : ${Number(s.value) || 0}`);
  return out.join("\n");
}
function parsePie(code: string): Pie | null {
  if (!code.trim()) return { title: "", slices: [] };
  const ls = code.split(/\r?\n/);
  const h = (ls[0] || "").match(/^\s*pie\b(?:\s+showData)?(?:\s+title\s+(.*))?$/i);
  if (!h) return null;
  const slices: PSlice[] = [];
  for (let i = 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line || line.startsWith("%%")) continue;
    const m2 = line.match(/^"?([^":]+?)"?\s*:\s*([\d.]+)$/);
    if (m2) { slices.push({ label: m2[1].trim(), value: Number(m2[2]) }); continue; }
    return null;
  }
  return { title: (h[1] || "").trim(), slices };
}

// ── Carte mentale ─────────────────────────────────────────────────────
type MNode = { level: number; label: string };
type Mind = { nodes: MNode[] };
function genMind(m: Mind): string {
  if (!m.nodes.length) return "";
  const out = ["mindmap"];
  for (const n of m.nodes) out.push(`${"  ".repeat((n.level || 0) + 1)}${n.label || "Idée"}`);
  return out.join("\n");
}
function parseMind(code: string): Mind | null {
  if (!code.trim()) return { nodes: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*mindmap\b/i.test(ls[0] || "")) return null;
  const nodes: MNode[] = []; let base: number | null = null;
  for (let i = 1; i < ls.length; i++) {
    const raw = ls[i]; if (!raw.trim() || raw.trim().startsWith("%%")) continue;
    const indent = (raw.match(/^\s*/) || [""])[0].length;
    if (base === null) base = indent;
    const level = Math.max(0, Math.round((indent - base) / 2));
    const label = raw.trim().replace(/^[A-Za-z0-9_]*\(\(([\s\S]*)\)\)$/, "$1").replace(/^\(\(([\s\S]*)\)\)$/, "$1").replace(/^\[([\s\S]*)\]$/, "$1").replace(/^\(([\s\S]*)\)$/, "$1").replace(/^\{\{([\s\S]*)\}\}$/, "$1");
    nodes.push({ level, label });
  }
  return { nodes };
}

// ── Parcours ──────────────────────────────────────────────────────────
type JTask = { section: string; name: string; score: number; actors: string };
type Journey = { title: string; tasks: JTask[] };
function genJourney(m: Journey): string {
  if (!m.tasks.length) return "";
  const out = ["journey", `  title ${m.title || "Parcours"}`];
  let cur = "";
  for (const t of m.tasks) { if (t.section && t.section !== cur) { out.push(`  section ${t.section}`); cur = t.section; } out.push(`    ${t.name || "Étape"}: ${Number(t.score) || 3}: ${t.actors || "Utilisateur"}`); }
  return out.join("\n");
}
function parseJourney(code: string): Journey | null {
  if (!code.trim()) return { title: "", tasks: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*journey\b/i.test(ls[0] || "")) return null;
  let title = ""; let section = ""; const tasks: JTask[] = [];
  for (let i = 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line || line.startsWith("%%")) continue;
    const tm = line.match(/^title\s+(.*)$/i); if (tm) { title = tm[1].trim(); continue; }
    const sm = line.match(/^section\s+(.*)$/i); if (sm) { section = sm[1].trim(); continue; }
    const km = line.match(/^(.+?)\s*:\s*(\d+)\s*:\s*(.*)$/);
    if (km) { tasks.push({ section, name: km[1].trim(), score: Number(km[2]), actors: km[3].trim() }); continue; }
    return null;
  }
  return { title, tasks };
}

// ── Git ───────────────────────────────────────────────────────────────
type GitOp = { type: string; arg: string };
type Git = { ops: GitOp[] };
const GIT_TYPES = [{ v: "commit", l: "Commit" }, { v: "branch", l: "Nouvelle branche" }, { v: "checkout", l: "Aller sur" }, { v: "merge", l: "Fusionner" }];
function genGit(m: Git): string {
  if (!m.ops.length) return "";
  const out = ["gitGraph"];
  for (const o of m.ops) {
    if (o.type === "commit") out.push(o.arg ? `  commit id: "${esc(o.arg)}"` : "  commit");
    else out.push(`  ${o.type} ${o.arg || "branche"}`);
  }
  return out.join("\n");
}
function parseGit(code: string): Git | null {
  if (!code.trim()) return { ops: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*gitGraph\b/i.test(ls[0] || "")) return null;
  const ops: GitOp[] = [];
  for (let i = 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line || line.startsWith("%%")) continue;
    if (/^commit\b/i.test(line)) { const cm = line.match(/id:\s*"([^"]*)"/i); ops.push({ type: "commit", arg: cm ? cm[1] : "" }); continue; }
    const bm = line.match(/^(branch|checkout|merge)\s+(\S+)/i);
    if (bm) { ops.push({ type: bm[1].toLowerCase(), arg: bm[2] }); continue; }
    return null;
  }
  return { ops };
}

// ── Quadrant ──────────────────────────────────────────────────────────
type QPoint = { label: string; x: number; y: number };
type Quad = { title: string; xl: string; xr: string; yb: string; yt: string; q1: string; q2: string; q3: string; q4: string; points: QPoint[] };
function genQuad(m: Quad): string {
  const out = ["quadrantChart", `  title ${m.title || "Quadrant"}`,
    `  x-axis ${m.xl || "Faible"} --> ${m.xr || "Fort"}`, `  y-axis ${m.yb || "Faible"} --> ${m.yt || "Fort"}`,
    `  quadrant-1 ${m.q1 || "Q1"}`, `  quadrant-2 ${m.q2 || "Q2"}`, `  quadrant-3 ${m.q3 || "Q3"}`, `  quadrant-4 ${m.q4 || "Q4"}`];
  for (const p of m.points) out.push(`  ${p.label || "Point"}: [${clamp01(p.x)}, ${clamp01(p.y)}]`);
  return out.join("\n");
}
function parseQuad(code: string): Quad | null {
  const empty: Quad = { title: "", xl: "Faible", xr: "Fort", yb: "Faible", yt: "Fort", q1: "", q2: "", q3: "", q4: "", points: [] };
  if (!code.trim()) return empty;
  const ls = code.split(/\r?\n/);
  if (!/^\s*quadrantChart\b/i.test(ls[0] || "")) return null;
  const m: Quad = { ...empty, xl: "", xr: "", yb: "", yt: "" };
  for (let i = 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line || line.startsWith("%%")) continue;
    let mm: RegExpMatchArray | null;
    if ((mm = line.match(/^title\s+(.*)/i))) m.title = mm[1].trim();
    else if ((mm = line.match(/^x-axis\s+(.*?)\s*-->\s*(.*)$/i))) { m.xl = mm[1].trim(); m.xr = mm[2].trim(); }
    else if ((mm = line.match(/^y-axis\s+(.*?)\s*-->\s*(.*)$/i))) { m.yb = mm[1].trim(); m.yt = mm[2].trim(); }
    else if ((mm = line.match(/^quadrant-([1-4])\s+(.*)/i))) (m as unknown as Record<string, string>)[`q${mm[1]}`] = mm[2].trim();
    else if ((mm = line.match(/^"?([^":[]+?)"?\s*:\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]$/))) m.points.push({ label: mm[1].trim(), x: Number(mm[2]), y: Number(mm[3]) });
    else return null;
  }
  return m;
}

// ── Frise chronologique ───────────────────────────────────────────────
type TEvent = { period: string; text: string };
type Timeline = { title: string; events: TEvent[] };
function genTimeline(m: Timeline): string {
  if (!m.events.length) return "";
  const out = ["timeline", `  title ${m.title || "Frise"}`];
  for (const e of m.events) out.push(`  ${e.period || "Période"} : ${e.text || " "}`);
  return out.join("\n");
}
function parseTimeline(code: string): Timeline | null {
  if (!code.trim()) return { title: "", events: [] };
  const ls = code.split(/\r?\n/);
  if (!/^\s*timeline\b/i.test(ls[0] || "")) return null;
  let title = ""; const events: TEvent[] = [];
  for (let i = 1; i < ls.length; i++) {
    const line = ls[i].trim();
    if (!line || line.startsWith("%%")) continue;
    const tm = line.match(/^title\s+(.*)$/i); if (tm) { title = tm[1].trim(); continue; }
    const em = line.match(/^([^:]+?)\s*:\s*(.*)$/);
    if (em) { events.push({ period: em[1].trim(), text: em[2].trim() }); continue; }
    return null;
  }
  return { title, events };
}

// Détecte le type de diagramme d'après la première ligne significative.
function firstMeaningful(code: string): string {
  for (const l of code.split(/\r?\n/)) { const t = l.trim(); if (t && !t.startsWith("%%")) return t; }
  return "";
}
function detectKind(code: string): string | null {
  const f = firstMeaningful(code);
  if (!f) return "flow";
  if (/^(graph|flowchart)\b/i.test(f)) return "flow";
  if (/^sequenceDiagram\b/i.test(f)) return "sequence";
  if (/^classDiagram\b/i.test(f)) return "class";
  if (/^stateDiagram/i.test(f)) return "state";
  if (/^erDiagram\b/i.test(f)) return "er";
  if (/^gantt\b/i.test(f)) return "gantt";
  if (/^pie\b/i.test(f)) return "pie";
  if (/^mindmap\b/i.test(f)) return "mindmap";
  if (/^journey\b/i.test(f)) return "journey";
  if (/^gitGraph\b/i.test(f)) return "git";
  if (/^quadrantChart\b/i.test(f)) return "quadrant";
  if (/^timeline\b/i.test(f)) return "timeline";
  return null;
}

export function DiagramEditor({
  id, initialName, initialContent, backHref, crumbs, shared = false,
}: {
  id: string;
  initialName: string;
  initialContent: string;
  backHref: string;
  crumbs: Crumb[];
  shared?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(initialContent);
  const [save, setSave] = useState<SaveState>("saved");
  const [flash, setFlash] = useState(false);
  const [svg, setSvg] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [theme, setTheme] = useState("filehub");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [menu, setMenu] = useState<null | "tpl" | "snip" | "theme" | "export">(null);
  const [mobileView, setMobileView] = useState<"code" | "preview">("code");
  const [present, setPresent] = useState(false);
  const [modeState, setModeState] = useState<"simple" | "code">("simple");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mermaidRef = useRef<typeof import("mermaid").default | null>(null);
  const seq = useRef(0);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentDim = useRef<{ w: number; h: number } | null>(null);
  const panGesture = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const dirty = useRef(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const actions = useRef<Actions>({ markEditing: () => {}, syncVersion: () => {} });

  const applyRemoteString = useCallback((str: string) => {
    setCode((prev) => {
      if (prev === str) return prev;
      const el = codeRef.current;
      if (el && document.activeElement === el) {
        const caret = el.selectionStart ?? 0;
        const m = Math.min(prev.length, str.length);
        let p = 0;
        while (p < m && prev[p] === str[p]) p++;
        const delta = str.length - prev.length;
        const next = caret <= p ? caret : Math.max(p, caret + delta);
        requestAnimationFrame(() => { try { el.setSelectionRange(next, next); } catch { /* ignore */ } });
      }
      return str;
    });
  }, []);
  const fetchRemote = useCallback(async () => {
    if (dirty.current) return;
    try {
      const { content } = await api.getContent(id);
      if (dirty.current) return;
      applyRemoteString(content);
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
    } catch { /* ignore */ }
  }, [id, applyRemoteString]);

  const persist = useCallback((patch: { content?: string; name?: string }) => {
    setSave("saving");
    dirty.current = true;
    actions.current.markEditing();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, patch)
        .then((r) => { setSave("saved"); dirty.current = false; if (r?.updatedAt) actions.current.syncVersion(r.updatedAt); })
        .catch(() => setSave("error"));
    }, 600);
  }, [id]);

  // ── Rendu Mermaid débouncé (ré-initialise selon le thème) ──────────
  useEffect(() => {
    const t = setTimeout(async () => {
      const src = code.trim();
      if (!src) { setSvg(""); setRenderError(null); return; }
      try {
        if (!mermaidRef.current) mermaidRef.current = (await import("mermaid")).default;
        mermaidRef.current.initialize({
          startOnLoad: false, theme: "base", securityLevel: "strict", fontFamily: "inherit",
          flowchart: { curve: "basis", padding: 16, htmlLabels: true, useMaxWidth: false },
          themeVariables: paletteOf(theme).vars, themeCSS: THEME_CSS,
        });
        const n = ++seq.current;
        const { svg: out } = await mermaidRef.current.render(`mmd-${id}-${n}`, src);
        if (n === seq.current) { setSvg(out); setRenderError(null); }
      } catch (e) {
        setRenderError(e instanceof Error ? e.message.split("\n")[0] : "Syntaxe invalide");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [code, id, theme]);

  // Ajuste automatiquement l'aperçu à chaque nouveau rendu.
  useEffect(() => {
    if (!svg) return;
    const el = previewRef.current;
    const m = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
    if (el && m) {
      const w = Number(m[1]), h = Number(m[2]);
      contentDim.current = { w, h };
      const cw = el.clientWidth - 56, ch = el.clientHeight - 56;
      const s = Math.min(cw / w, ch / h, 1.6);
      setZoom(s > 0 && isFinite(s) ? s : 1);
      setPan({ x: 0, y: 0 });
    }
  }, [svg]);

  // Échap ferme les menus et le plein écran.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(null); setPresent(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Zoom molette (listener natif pour pouvoir preventDefault).
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(4, Math.max(0.1, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onCode = (v: string) => { setCode(v); persist({ content: v }); };
  const onName = (v: string) => { setName(v); persist({ name: v.trim() || "Diagramme sans titre" }); };

  const applyTemplate = (tpl: Template) => { setMenu(null); onCode(tpl.code); setMobileView("code"); };

  // ── Mode Simple : type détecté + disponibilité du constructeur ──────
  const kind = useMemo(() => detectKind(code), [code]);
  const canSimple = useMemo(() => {
    if (kind == null) return false;
    const b = BUILDERS[kind];
    return !!b && b.parse(code) != null;
  }, [kind, code]);
  const mode: "simple" | "code" = canSimple ? modeState : "code";

  const insertSnippet = (snippet: string) => {
    setMenu(null);
    const ta = codeRef.current;
    if (!ta) { onCode(code + (code && !code.endsWith("\n") ? "\n" : "") + snippet); return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    const before = code.slice(0, s), after = code.slice(e);
    const ins = (before.length && !before.endsWith("\n") ? "\n" : "") + snippet;
    const next = before + ins + after;
    onCode(next);
    requestAnimationFrame(() => { const pos = (before + ins).length; ta.focus(); ta.setSelectionRange(pos, pos); });
  };

  // Direction (organigrammes uniquement).
  const isFlowchart = /^\s*(graph|flowchart)\b/i.test(code);
  const curDir = (code.match(/^\s*(?:graph|flowchart)\s+(TB|TD|BT|RL|LR)/i)?.[1] || "TD").toUpperCase();
  const setDirection = (dir: string) => {
    if (/^\s*(?:graph|flowchart)\s+(TB|TD|BT|RL|LR)/i.test(code)) {
      onCode(code.replace(/^(\s*(?:graph|flowchart)\s+)(TB|TD|BT|RL|LR)/i, `$1${dir}`));
    } else {
      onCode(code.replace(/^(\s*(?:graph|flowchart))\b/i, `$1 ${dir}`));
    }
  };

  const syncScroll = () => { if (gutterRef.current && codeRef.current) gutterRef.current.scrollTop = codeRef.current.scrollTop; };
  const lineCount = useMemo(() => Math.max(1, code.split("\n").length), [code]);

  // ── Pan (déplacement de l'aperçu) ──────────────────────────────────
  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    panGesture.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
    const onMove = (ev: PointerEvent) => {
      const g = panGesture.current; if (!g) return;
      setPan({ x: g.ox + (ev.clientX - g.sx), y: g.oy + (ev.clientY - g.sy) });
    };
    const onUp = () => { panGesture.current = null; window.removeEventListener("pointermove", onMove); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const fit = () => {
    const el = previewRef.current, d = contentDim.current;
    if (!el || !d) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
    const s = Math.min((el.clientWidth - 56) / d.w, (el.clientHeight - 56) / d.h, 1.6);
    setZoom(s > 0 && isFinite(s) ? s : 1); setPan({ x: 0, y: 0 });
  };

  // ── Export ─────────────────────────────────────────────────────────
  const download = (href: string, ext: string) => {
    const a = document.createElement("a"); a.href = href; a.download = `${(name || "diagramme").replace(/[^\w.-]+/g, "_")}.${ext}`; a.click();
  };
  const exportSvg = () => { setMenu(null); if (!svg) return; download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, "svg"); };
  const copyCode = async () => { setMenu(null); try { await navigator.clipboard.writeText(code); } catch { /* ignore */ } };
  const exportPng = async () => {
    setMenu(null);
    if (!svg) return;
    const d = contentDim.current ?? { w: 1200, h: 800 };
    const scale = 2;
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement("canvas");
    c.width = Math.round(d.w * scale); c.height = Math.round(d.h * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = paletteOf(theme).light ? "#ffffff" : "#0b0e17";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    download(c.toDataURL("image/png"), "png");
  };

  const lightTheme = paletteOf(theme).light;
  const previewBg = lightTheme
    ? "radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px) 0 0 / 22px 22px, #f4f6fb"
    : "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px) 0 0 / 22px 22px, radial-gradient(circle at 50% 0%, rgba(91,139,255,0.08), transparent 55%), #0a0d16";
  const svgWrap = "[&_svg]:h-auto [&_svg]:max-w-none [&_svg]:select-none";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RealtimeEngine id={id} shared={shared} mode="text" content={code} onRemote={applyRemoteString} fetchRemote={fetchRemote} setPeers={setPeers} actions={actions} />
      {/* En-tête */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 sm:px-5 flex items-center gap-2 sm:gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour"><ArrowLeft className="size-5" /></Link>
        <Workflow className="size-4 shrink-0 text-teal-400" />
        <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 w-40 sm:w-64 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" placeholder="Diagramme sans titre" />
        <div className="ml-auto flex items-center gap-2">
          <CollabBar peers={peers} />
          <div className="flex items-center gap-1.5 text-xs text-muted">
            {flash ? <span className="flex items-center gap-1 text-cyan-300"><RefreshCw className="size-3.5" /> <span className="hidden sm:inline">Mis à jour</span></span> : save === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : save === "error" ? <span className="text-red-400">Erreur</span> : <Check className="size-3.5 text-emerald-400" />}
          </div>
        </div>
        <button onClick={() => setPresent(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/15" title="Plein écran"><Maximize2 className="size-4" /> <span className="hidden sm:inline">Plein écran</span></button>
        <AiAssistant
          kind="diagram" title="Assistant diagramme" accent="#14b8a6"
          getContext={() => code}
          onApplyText={(t) => onCode(t)}
          applyLabel="Remplacer le diagramme"
          placeholder="Ex. « flux d'une commande e-commerce »"
          quickActions={[{ action: "generate", label: "Générer", icon: Sparkles }, { action: "fix", label: "Corriger la syntaxe" }]}
        />
      </header>

      {/* Barre d'outils */}
      <div className="h-11 shrink-0 border-b border-white/10 bg-white/[0.02] px-3 sm:px-5 flex items-center gap-1.5 overflow-x-auto">
        {/* Mode Simple / Code */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
          <button onClick={() => canSimple && setModeState("simple")} disabled={!canSimple} title={canSimple ? "Constructeur visuel" : "Disponible pour les organigrammes"} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition ${mode === "simple" ? "bg-brand-500/25 text-white" : "text-muted hover:bg-white/5"} ${!canSimple ? "cursor-not-allowed opacity-40" : ""}`}><Sparkles className="size-3.5" /> Simple</button>
          <button onClick={() => setModeState("code")} title="Éditeur de code Mermaid" className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition ${mode === "code" ? "bg-brand-500/25 text-white" : "text-muted hover:bg-white/5"}`}><Code2 className="size-3.5" /> Code</button>
        </div>
        <div className="mx-1 h-5 w-px bg-white/10" />

        {/* Modèles */}
        <Dropdown open={menu === "tpl"} onToggle={() => setMenu(menu === "tpl" ? null : "tpl")} onClose={() => setMenu(null)}
          trigger={<><LayoutTemplate className="size-4" /> <span className="hidden sm:inline">Modèles</span> <ChevronDown className="size-3" /></>}>
          <div className="grid w-64 grid-cols-2 gap-1">
            {TEMPLATES.map((tpl) => (
              <button key={tpl.key} onClick={() => applyTemplate(tpl)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/5">
                <tpl.icon className="size-4 shrink-0 text-teal-300" /> <span className="truncate">{tpl.label}</span>
              </button>
            ))}
          </div>
        </Dropdown>

        {/* Éléments (mode Code uniquement) */}
        {mode === "code" && (
          <Dropdown open={menu === "snip"} onToggle={() => setMenu(menu === "snip" ? null : "snip")} onClose={() => setMenu(null)}
            trigger={<><Shapes className="size-4" /> <span className="hidden sm:inline">Éléments</span> <ChevronDown className="size-3" /></>}>
            <div className="max-h-[60vh] w-60 space-y-2 overflow-y-auto">
              {SNIPPET_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted/70">{g.label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {g.items.map((it) => (
                      <button key={it.l} onClick={() => insertSnippet(it.t)} title={it.t} className="truncate rounded-md px-2 py-1.5 text-left text-xs text-white/85 hover:bg-white/5">{it.l}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Dropdown>
        )}

        {/* Direction (organigrammes) */}
        {isFlowchart && (
          <>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
              {DIRS.map((d) => {
                const active = d.k === "TD" ? (curDir === "TD" || curDir === "TB") : curDir === d.k;
                return (
                  <button key={d.k} onClick={() => setDirection(d.k)} title={d.l} className={`grid size-7 place-items-center rounded-md transition ${active ? "bg-brand-500/25 text-white" : "text-muted hover:bg-white/5"}`}><d.i className="size-4" /></button>
                );
              })}
            </div>
          </>
        )}

        {/* Thème */}
        <div className="mx-1 h-5 w-px bg-white/10" />
        <Dropdown open={menu === "theme"} onToggle={() => setMenu(menu === "theme" ? null : "theme")} onClose={() => setMenu(null)}
          trigger={<><Palette className="size-4" /> <span className="hidden sm:inline">{paletteOf(theme).label}</span> <ChevronDown className="size-3" /></>}>
          <div className="w-40">
            {PALETTES.map((p) => (
              <button key={p.key} onClick={() => { setTheme(p.key); setMenu(null); }} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-white/5 ${theme === p.key ? "text-white" : "text-white/70"}`}>
                <span className="size-4 rounded-md border border-white/20 shadow-inner" style={{ background: p.swatch }} /> {p.label}
                {theme === p.key && <Check className="ml-auto size-3.5 text-teal-300" />}
              </button>
            ))}
          </div>
        </Dropdown>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Bascule code / aperçu (mobile) */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5 lg:hidden">
            <button onClick={() => setMobileView("code")} className={`grid size-7 place-items-center rounded-md ${mobileView === "code" ? "bg-brand-500/25 text-white" : "text-muted"}`} title="Édition"><Shapes className="size-4" /></button>
            <button onClick={() => setMobileView("preview")} className={`grid size-7 place-items-center rounded-md ${mobileView === "preview" ? "bg-brand-500/25 text-white" : "text-muted"}`} title="Aperçu"><Eye className="size-4" /></button>
          </div>
          {/* Export */}
          <Dropdown align="right" open={menu === "export"} onToggle={() => setMenu(menu === "export" ? null : "export")} onClose={() => setMenu(null)}
            trigger={<><Download className="size-4" /> <span className="hidden sm:inline">Exporter</span> <ChevronDown className="size-3" /></>}>
            <div className="w-48">
              <button onClick={exportPng} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/5"><ImageIcon className="size-4 text-teal-300" /> Image PNG</button>
              <button onClick={exportSvg} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/5"><Download className="size-4 text-teal-300" /> Fichier SVG</button>
              <button onClick={copyCode} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/85 hover:bg-white/5"><Copy className="size-4 text-teal-300" /> Copier le code</button>
            </div>
          </Dropdown>
        </div>
      </div>

      {/* Corps : éditeur + aperçu */}
      <div className="flex flex-1 min-h-0">
        {/* Panneau gauche : constructeur visuel (Simple) ou code Mermaid */}
        <div className={`${mobileView === "code" ? "flex" : "hidden"} lg:flex w-full lg:w-[38%] lg:min-w-[320px] lg:max-w-[580px] min-h-0 shrink-0 flex-col border-r border-white/10 bg-[#0b0d14]`}>
          {mode === "simple" && kind ? (
            <SimpleBuilder kind={kind} code={code} onCode={onCode} />
          ) : (
            <div className="flex min-h-0 flex-1">
              <div ref={gutterRef} className="select-none overflow-hidden py-4 pl-3 pr-2 text-right font-mono text-[13px] leading-[1.6] text-white/25">
                {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                ref={codeRef}
                value={code}
                onChange={(e) => onCode(e.target.value)}
                onScroll={syncScroll}
                spellCheck={false}
                placeholder={"graph TD\n  A[Début] --> B{Test}\n  B -->|oui| C[OK]\n  B -->|non| D[Fin]\n\n(ou choisissez un modèle ci-dessus)"}
                className="h-full flex-1 resize-none bg-transparent py-4 pr-4 font-mono text-[13px] leading-[1.6] text-teal-50/90 outline-none placeholder:text-white/25"
              />
            </div>
          )}
        </div>

        {/* Aperçu zoomable */}
        <div
          ref={previewRef}
          onPointerDown={startPan}
          className={`${mobileView === "preview" ? "block" : "hidden"} lg:block relative min-h-0 flex-1 overflow-hidden ${panGesture.current ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ background: previewBg }}
        >
          {renderError && (
            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200 shadow-lg backdrop-blur">
              <AlertTriangle className="size-3.5 shrink-0" /> {renderError}
            </div>
          )}
          {svg ? (
            <div className="absolute inset-0 grid place-items-center">
              <div className={svgWrap} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }} dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          ) : (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-muted">
              <div>
                <Workflow className="mx-auto mb-3 size-8 text-white/15" />
                {mode === "simple"
                  ? <>Ajoutez une <span className="text-white/70">étape</span> à gauche, ou choisissez un <span className="text-white/70">modèle</span>.</>
                  : <>Écrivez du code Mermaid ou choisissez un <span className="text-white/70">modèle</span> pour commencer.</>}
              </div>
            </div>
          )}

          {/* Contrôles de zoom */}
          {svg && (
            <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#0f1017]/90 px-1.5 py-1 text-xs text-muted backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Dézoomer"><ZoomOut className="size-4" /></button>
              <button onClick={fit} className="px-1.5 tabular-nums hover:text-white" title="Ajuster">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom((z) => Math.min(4, z * 1.2))} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Zoomer"><ZoomIn className="size-4" /></button>
              <div className="mx-0.5 h-4 w-px bg-white/10" />
              <button onClick={fit} className="grid size-7 place-items-center rounded-full hover:bg-white/10" title="Ajuster à l'écran"><Maximize className="size-4" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Plein écran */}
      {present && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black/95 backdrop-blur">
          <button onClick={() => setPresent(false)} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="size-5" /></button>
          <div className="flex flex-1 items-center justify-center overflow-auto p-8" style={{ background: lightTheme ? "#f8fafc" : "transparent" }}>
            {svg
              ? <div className="[&_svg]:max-h-[88vh] [&_svg]:max-w-[94vw] [&_svg]:h-auto [&_svg]:w-auto" dangerouslySetInnerHTML={{ __html: svg }} />
              : <p className="text-sm text-white/50">Rien à afficher.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Constructeurs visuels (mode Simple) — un par type de diagramme ────
type Opt = { v: string; l: string };
type Col = { key: string; kind: "text" | "num" | "select" | "area" | "arrow"; w?: string; ph?: string; options?: Opt[]; min?: number; max?: number; step?: number; block?: boolean; num?: boolean; bool?: boolean };
const FLD = "h-9 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400";
const coerce = (c: Col, v: string): string | number | boolean => (c.num ? (Number(v) || 0) : c.bool ? v === "1" : v);

function Field({ col, value, onChange }: { col: Col; value: unknown; onChange: (v: string) => void }) {
  const w = col.w ?? "flex-1 min-w-[90px]";
  if (col.kind === "arrow") return <ArrowRight className="size-4 shrink-0 text-brand-300" />;
  if (col.kind === "area") return <textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={col.ph} rows={3} className={`${FLD} w-full resize-y py-2 font-mono text-[12.5px] leading-relaxed`} />;
  if (col.kind === "select") { const v = col.bool ? (value ? "1" : "0") : String(value ?? ""); return <select value={v} onChange={(e) => onChange(e.target.value)} className={`${FLD} ${w}`}>{col.options?.map((o) => <option key={o.v} value={o.v} className="bg-[#0f1017]">{o.l}</option>)}</select>; }
  if (col.kind === "num") return <input type="number" value={Number(value ?? 0)} min={col.min} max={col.max} step={col.step} onChange={(e) => onChange(e.target.value)} className={`${FLD} ${col.w ?? "w-20"}`} placeholder={col.ph} />;
  return <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={`${FLD} ${w}`} placeholder={col.ph} />;
}

type Row = Record<string, unknown>;
function Rows({ items, cols, onEdit, onDelete, onAdd, addLabel, empty }: {
  items: Row[]; cols: Col[]; onEdit: (i: number, key: string, v: string | number | boolean) => void;
  onDelete: (i: number) => void; onAdd: () => void; addLabel: string; empty?: string;
}) {
  const inline = cols.filter((c) => !c.block && c.kind !== "area");
  const blocks = cols.filter((c) => c.block || c.kind === "area");
  return (
    <div className="space-y-2">
      {items.length === 0 && empty && <Hint>{empty}</Hint>}
      {items.map((row, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <div className="flex flex-wrap items-center gap-2">
            {inline.map((c) => <Field key={c.key} col={c} value={row[c.key]} onChange={(v) => onEdit(i, c.key, coerce(c, v))} />)}
            <button onClick={() => onDelete(i)} title="Supprimer" className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 className="size-4" /></button>
          </div>
          {blocks.map((c) => <Field key={c.key} col={c} value={row[c.key]} onChange={(v) => onEdit(i, c.key, coerce(c, v))} />)}
        </div>
      ))}
      <button onClick={onAdd} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2.5 text-sm text-white/80 hover:border-brand-400/50 hover:bg-white/[0.03] hover:text-white"><Plus className="size-4" /> {addLabel}</button>
    </div>
  );
}
function Hint({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs leading-snug text-muted">{children}</p>;
}
function BHead({ icon: I, children, count }: { icon: LucideIcon; children: ReactNode; count?: number }) {
  return <div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><I className="size-3.5" /> {children}</p>{count != null && <span className="text-[11px] text-muted">{count}</span>}</div>;
}
function TitleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <label className="mb-4 block"><span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">Titre</span><input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-brand-400" placeholder="Titre du diagramme" /></label>;
}
function Shell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">{children}<p className="mt-4 text-[11px] leading-snug text-muted/70">Astuce : passez en « Code » pour un contrôle avancé.</p></div>;
}
function Sep() { return <div className="mb-2 mt-6 border-t border-white/10 pt-4" />; }

type BProps<T> = { model: T; onChange: (m: T) => void };
const clone = <T,>(m: T): T => structuredClone(m);

// Organigramme
function FlowBuilder({ model, onChange }: BProps<Flow>) {
  const set = (mut: (m: Flow) => void) => { const m = clone(model); mut(m); onChange(m); };
  const nid = (m: Flow) => { const u = new Set(m.nodes.map((n) => n.id)); for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") if (!u.has(c)) return c; let i = 1; while (u.has(`N${i}`)) i++; return `N${i}`; };
  const nopts = model.nodes.map((n) => ({ v: n.id, l: n.label || n.id }));
  return (
    <Shell>
      <BHead icon={Boxes} count={model.nodes.length}>Étapes</BHead>
      <Rows items={model.nodes} cols={[{ key: "shape", kind: "select", w: "w-40", options: SHAPES.map((s) => ({ v: s.k, l: s.l })) }, { key: "label", kind: "text", ph: "Nom de l'étape" }]}
        onEdit={(i, k, v) => set((m) => { (m.nodes[i] as Row)[k] = v; })}
        onDelete={(i) => set((m) => { const id = m.nodes[i].id; m.nodes.splice(i, 1); m.edges = m.edges.filter((e) => e.from !== id && e.to !== id); })}
        onAdd={() => set((m) => { m.nodes.push({ id: nid(m), label: "Nouvelle étape", shape: m.nodes.length ? "rect" : "stadium" }); })} addLabel="Ajouter une étape" />
      <Sep />
      <BHead icon={Waypoints} count={model.edges.length}>Liens</BHead>
      {model.nodes.length < 2 ? <Hint>Ajoutez au moins deux étapes pour les relier par des flèches.</Hint> : (
        <Rows items={model.edges} cols={[{ key: "from", kind: "select", options: nopts }, { key: "_a", kind: "arrow" }, { key: "to", kind: "select", options: nopts }, { key: "label", kind: "text", block: true, ph: "Étiquette de la flèche (facultatif)" }]}
          onEdit={(i, k, v) => set((m) => { (m.edges[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.edges.splice(i, 1); })}
          onAdd={() => set((m) => { m.edges.push({ from: m.nodes[0].id, to: m.nodes[1].id, label: "" }); })} addLabel="Ajouter un lien" />
      )}
    </Shell>
  );
}

// Séquence
function SeqBuilder({ model, onChange }: BProps<Seq>) {
  const set = (mut: (m: Seq) => void) => { const m = clone(model); mut(m); onChange(m); };
  const pid = (m: Seq) => { const u = new Set(m.parts.map((p) => p.id)); for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") if (!u.has(c)) return c; let i = 1; while (u.has(`P${i}`)) i++; return `P${i}`; };
  const popts = model.parts.map((p) => ({ v: p.id, l: p.label || p.id }));
  return (
    <Shell>
      <BHead icon={Boxes} count={model.parts.length}>Participants</BHead>
      <Rows items={model.parts} cols={[{ key: "actor", kind: "select", bool: true, w: "w-36", options: [{ v: "0", l: "Participant" }, { v: "1", l: "Acteur" }] }, { key: "label", kind: "text", ph: "Nom" }]}
        onEdit={(i, k, v) => set((m) => { (m.parts[i] as Row)[k] = v; })}
        onDelete={(i) => set((m) => { const id = m.parts[i].id; m.parts.splice(i, 1); m.msgs = m.msgs.filter((g) => g.from !== id && g.to !== id); })}
        onAdd={() => set((m) => { m.parts.push({ id: pid(m), label: "Participant", actor: false }); })} addLabel="Ajouter un participant" />
      <Sep />
      <BHead icon={Waypoints} count={model.msgs.length}>Messages</BHead>
      {model.parts.length < 1 ? <Hint>Ajoutez au moins un participant.</Hint> : (
        <Rows items={model.msgs} cols={[{ key: "from", kind: "select", options: popts }, { key: "_a", kind: "arrow" }, { key: "to", kind: "select", options: popts }, { key: "dashed", kind: "select", bool: true, w: "w-32", options: [{ v: "0", l: "→ Appel" }, { v: "1", l: "⇠ Réponse" }] }, { key: "text", kind: "text", block: true, ph: "Message" }]}
          onEdit={(i, k, v) => set((m) => { (m.msgs[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.msgs.splice(i, 1); })}
          onAdd={() => set((m) => { m.msgs.push({ from: m.parts[0].id, to: m.parts[Math.min(1, m.parts.length - 1)].id, text: "Message", dashed: false }); })} addLabel="Ajouter un message" />
      )}
    </Shell>
  );
}

// États
function StateBuilder({ model, onChange }: BProps<St>) {
  const set = (mut: (m: St) => void) => { const m = clone(model); mut(m); onChange(m); };
  const sid = (m: St) => { const u = new Set(m.states.map((s) => s.id)); let i = 1; while (u.has(`S${i}`)) i++; return `S${i}`; };
  const sopts = [{ v: "[*]", l: "● Début / Fin" }, ...model.states.map((s) => ({ v: s.id, l: s.label || s.id }))];
  return (
    <Shell>
      <BHead icon={Boxes} count={model.states.length}>États</BHead>
      <Rows items={model.states} cols={[{ key: "label", kind: "text", ph: "Nom de l'état" }]}
        onEdit={(i, k, v) => set((m) => { (m.states[i] as Row)[k] = v; })}
        onDelete={(i) => set((m) => { const id = m.states[i].id; m.states.splice(i, 1); m.trans = m.trans.filter((t) => t.from !== id && t.to !== id); })}
        onAdd={() => set((m) => { m.states.push({ id: sid(m), label: "Nouvel état" }); })} addLabel="Ajouter un état" />
      <Sep />
      <BHead icon={Waypoints} count={model.trans.length}>Transitions</BHead>
      {model.states.length < 1 ? <Hint>Ajoutez au moins un état.</Hint> : (
        <Rows items={model.trans} cols={[{ key: "from", kind: "select", options: sopts }, { key: "_a", kind: "arrow" }, { key: "to", kind: "select", options: sopts }, { key: "label", kind: "text", block: true, ph: "Déclencheur (facultatif)" }]}
          onEdit={(i, k, v) => set((m) => { (m.trans[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.trans.splice(i, 1); })}
          onAdd={() => set((m) => { m.trans.push({ from: "[*]", to: m.states[0].id, label: "" }); })} addLabel="Ajouter une transition" />
      )}
    </Shell>
  );
}

// Classes
function ClassBuilder({ model, onChange }: BProps<Cls>) {
  const set = (mut: (m: Cls) => void) => { const m = clone(model); mut(m); onChange(m); };
  const copts = model.classes.map((c) => ({ v: c.name, l: c.name }));
  return (
    <Shell>
      <BHead icon={Boxes} count={model.classes.length}>Classes</BHead>
      <Rows items={model.classes} cols={[{ key: "name", kind: "text", ph: "Nom de la classe" }, { key: "members", kind: "area", ph: "Un attribut / méthode par ligne\nex : +String nom\nex : +calculer()" }]}
        onEdit={(i, k, v) => set((m) => { (m.classes[i] as Row)[k] = v; })}
        onDelete={(i) => set((m) => { const nm = m.classes[i].name; m.classes.splice(i, 1); m.rels = m.rels.filter((r) => r.from !== nm && r.to !== nm); })}
        onAdd={() => set((m) => { m.classes.push({ name: `Classe${m.classes.length + 1}`, members: "" }); })} addLabel="Ajouter une classe" />
      <Sep />
      <BHead icon={Waypoints} count={model.rels.length}>Relations</BHead>
      {model.classes.length < 1 ? <Hint>Ajoutez au moins une classe.</Hint> : (
        <Rows items={model.rels} cols={[{ key: "from", kind: "select", options: copts }, { key: "type", kind: "select", w: "w-40", options: CLASS_RELS }, { key: "to", kind: "select", options: copts }]}
          onEdit={(i, k, v) => set((m) => { (m.rels[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.rels.splice(i, 1); })}
          onAdd={() => set((m) => { m.rels.push({ from: m.classes[0].name, type: "<|--", to: m.classes[Math.min(1, m.classes.length - 1)].name }); })} addLabel="Ajouter une relation" />
      )}
    </Shell>
  );
}

// Entité-relation
function ErBuilder({ model, onChange }: BProps<Er>) {
  const set = (mut: (m: Er) => void) => { const m = clone(model); mut(m); onChange(m); };
  const eopts = model.entities.map((e) => ({ v: e.name, l: e.name }));
  return (
    <Shell>
      <BHead icon={Boxes} count={model.entities.length}>Entités</BHead>
      <Rows items={model.entities} cols={[{ key: "name", kind: "text", ph: "Nom de l'entité" }, { key: "attrs", kind: "area", ph: "Un attribut par ligne\nex : string nom\nex : int quantite" }]}
        onEdit={(i, k, v) => set((m) => { (m.entities[i] as Row)[k] = v; })}
        onDelete={(i) => set((m) => { const nm = m.entities[i].name; m.entities.splice(i, 1); m.rels = m.rels.filter((r) => r.from !== nm && r.to !== nm); })}
        onAdd={() => set((m) => { m.entities.push({ name: `ENTITE${m.entities.length + 1}`, attrs: "" }); })} addLabel="Ajouter une entité" />
      <Sep />
      <BHead icon={Waypoints} count={model.rels.length}>Relations</BHead>
      {model.entities.length < 2 ? <Hint>Ajoutez au moins deux entités pour les relier.</Hint> : (
        <Rows items={model.rels} cols={[{ key: "from", kind: "select", options: eopts }, { key: "card", kind: "select", w: "w-28", options: ER_CARDS }, { key: "to", kind: "select", options: eopts }, { key: "label", kind: "text", block: true, ph: "Verbe (ex : passe, contient)" }]}
          onEdit={(i, k, v) => set((m) => { (m.rels[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.rels.splice(i, 1); })}
          onAdd={() => set((m) => { m.rels.push({ from: m.entities[0].name, card: "||--o{", to: m.entities[1].name, label: "" }); })} addLabel="Ajouter une relation" />
      )}
    </Shell>
  );
}

// Gantt
function GanttBuilder({ model, onChange }: BProps<Gantt>) {
  const set = (mut: (m: Gantt) => void) => { const m = clone(model); mut(m); onChange(m); };
  return (
    <Shell>
      <TitleField value={model.title} onChange={(v) => set((m) => { m.title = v; })} />
      <BHead icon={Calendar} count={model.tasks.length}>Tâches</BHead>
      <Rows items={model.tasks} cols={[{ key: "section", kind: "text", w: "w-32", ph: "Section" }, { key: "name", kind: "text", ph: "Tâche" }, { key: "start", kind: "text", w: "w-32", ph: "AAAA-MM-JJ" }, { key: "dur", kind: "text", w: "w-20", ph: "5d" }]}
        onEdit={(i, k, v) => set((m) => { (m.tasks[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.tasks.splice(i, 1); })}
        onAdd={() => set((m) => { const last = m.tasks[m.tasks.length - 1]; m.tasks.push({ section: last?.section || "Section", name: "Nouvelle tâche", start: last?.start || "2024-01-01", dur: "3d" }); })}
        addLabel="Ajouter une tâche" empty="Aucune tâche pour l'instant." />
    </Shell>
  );
}

// Camembert
function PieBuilder({ model, onChange }: BProps<Pie>) {
  const set = (mut: (m: Pie) => void) => { const m = clone(model); mut(m); onChange(m); };
  return (
    <Shell>
      <TitleField value={model.title} onChange={(v) => set((m) => { m.title = v; })} />
      <BHead icon={PieChart} count={model.slices.length}>Parts</BHead>
      <Rows items={model.slices as unknown as Row[]} cols={[{ key: "label", kind: "text", ph: "Nom de la part" }, { key: "value", kind: "num", num: true, w: "w-24", min: 0, step: 1 }]}
        onEdit={(i, k, v) => set((m) => { (m.slices[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.slices.splice(i, 1); })}
        onAdd={() => set((m) => { m.slices.push({ label: `Part ${m.slices.length + 1}`, value: 10 }); })} addLabel="Ajouter une part" empty="Aucune part pour l'instant." />
    </Shell>
  );
}

// Carte mentale
function MindBuilder({ model, onChange }: BProps<Mind>) {
  const set = (mut: (m: Mind) => void) => { const m = clone(model); mut(m); onChange(m); };
  const lvls: Opt[] = [{ v: "0", l: "Racine" }, { v: "1", l: "Niveau 1" }, { v: "2", l: "Niveau 2" }, { v: "3", l: "Niveau 3" }, { v: "4", l: "Niveau 4" }];
  return (
    <Shell>
      <BHead icon={Network} count={model.nodes.length}>Idées</BHead>
      <Rows items={model.nodes as unknown as Row[]} cols={[{ key: "level", kind: "select", num: true, w: "w-28", options: lvls }, { key: "label", kind: "text", ph: "Idée" }]}
        onEdit={(i, k, v) => set((m) => { (m.nodes[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.nodes.splice(i, 1); })}
        onAdd={() => set((m) => { const last = m.nodes[m.nodes.length - 1]; m.nodes.push({ level: m.nodes.length ? Math.min(4, (last?.level ?? 0) + 1) : 0, label: m.nodes.length ? "Nouvelle idée" : "Sujet central" }); })}
        addLabel="Ajouter une idée" empty="Commencez par le sujet central (Racine)." />
    </Shell>
  );
}

// Parcours
function JourneyBuilder({ model, onChange }: BProps<Journey>) {
  const set = (mut: (m: Journey) => void) => { const m = clone(model); mut(m); onChange(m); };
  return (
    <Shell>
      <TitleField value={model.title} onChange={(v) => set((m) => { m.title = v; })} />
      <BHead icon={Route} count={model.tasks.length}>Étapes du parcours</BHead>
      <Rows items={model.tasks as unknown as Row[]} cols={[{ key: "section", kind: "text", w: "w-32", ph: "Phase" }, { key: "name", kind: "text", ph: "Action" }, { key: "score", kind: "num", num: true, w: "w-16", min: 1, max: 5 }, { key: "actors", kind: "text", block: true, ph: "Acteurs (ex : Client, Support)" }]}
        onEdit={(i, k, v) => set((m) => { (m.tasks[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.tasks.splice(i, 1); })}
        onAdd={() => set((m) => { const last = m.tasks[m.tasks.length - 1]; m.tasks.push({ section: last?.section || "Phase", name: "Nouvelle action", score: 3, actors: "Utilisateur" }); })}
        addLabel="Ajouter une action" empty="Note : 1 (difficile) à 5 (facile)." />
    </Shell>
  );
}

// Git
function GitBuilder({ model, onChange }: BProps<Git>) {
  const set = (mut: (m: Git) => void) => { const m = clone(model); mut(m); onChange(m); };
  return (
    <Shell>
      <BHead icon={GitBranch} count={model.ops.length}>Opérations (dans l'ordre)</BHead>
      <Rows items={model.ops as unknown as Row[]} cols={[{ key: "type", kind: "select", w: "w-44", options: GIT_TYPES }, { key: "arg", kind: "text", ph: "nom de branche / message" }]}
        onEdit={(i, k, v) => set((m) => { (m.ops[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.ops.splice(i, 1); })}
        onAdd={() => set((m) => { m.ops.push({ type: "commit", arg: "" }); })} addLabel="Ajouter une opération" empty="Ex : commit, nouvelle branche, fusionner…" />
    </Shell>
  );
}

// Quadrant
function QuadBuilder({ model, onChange }: BProps<Quad>) {
  const set = (mut: (m: Quad) => void) => { const m = clone(model); mut(m); onChange(m); };
  const inp = (k: keyof Quad, ph: string) => <input value={String(model[k])} onChange={(e) => set((m) => { (m as unknown as Record<string, string>)[k as string] = e.target.value; })} placeholder={ph} className={`${FLD} w-full`} />;
  return (
    <Shell>
      <TitleField value={model.title} onChange={(v) => set((m) => { m.title = v; })} />
      <BHead icon={LayoutGrid}>Axes</BHead>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted">Axe X gauche{inp("xl", "Faible")}</label>
        <label className="text-[11px] text-muted">Axe X droite{inp("xr", "Fort")}</label>
        <label className="text-[11px] text-muted">Axe Y bas{inp("yb", "Faible")}</label>
        <label className="text-[11px] text-muted">Axe Y haut{inp("yt", "Fort")}</label>
      </div>
      <div className="mb-1 mt-4"><BHead icon={Boxes}>Quadrants</BHead></div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted">Haut-droite{inp("q1", "Prioritaire")}</label>
        <label className="text-[11px] text-muted">Haut-gauche{inp("q2", "À planifier")}</label>
        <label className="text-[11px] text-muted">Bas-gauche{inp("q3", "À éviter")}</label>
        <label className="text-[11px] text-muted">Bas-droite{inp("q4", "Rapide")}</label>
      </div>
      <Sep />
      <BHead icon={Waypoints} count={model.points.length}>Points</BHead>
      <Rows items={model.points as unknown as Row[]} cols={[{ key: "label", kind: "text", ph: "Nom du point" }, { key: "x", kind: "num", num: true, w: "w-20", min: 0, max: 1, step: 0.05 }, { key: "y", kind: "num", num: true, w: "w-20", min: 0, max: 1, step: 0.05 }]}
        onEdit={(i, k, v) => set((m) => { (m.points[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.points.splice(i, 1); })}
        onAdd={() => set((m) => { m.points.push({ label: `Point ${m.points.length + 1}`, x: 0.5, y: 0.5 }); })} addLabel="Ajouter un point" empty="Positions de 0 à 1 (x = horizontal, y = vertical)." />
    </Shell>
  );
}

// Frise chronologique
function TimelineBuilder({ model, onChange }: BProps<Timeline>) {
  const set = (mut: (m: Timeline) => void) => { const m = clone(model); mut(m); onChange(m); };
  return (
    <Shell>
      <TitleField value={model.title} onChange={(v) => set((m) => { m.title = v; })} />
      <BHead icon={Clock} count={model.events.length}>Événements</BHead>
      <Rows items={model.events as unknown as Row[]} cols={[{ key: "period", kind: "text", w: "w-28", ph: "2024" }, { key: "text", kind: "text", ph: "Événement" }]}
        onEdit={(i, k, v) => set((m) => { (m.events[i] as Row)[k] = v; })} onDelete={(i) => set((m) => { m.events.splice(i, 1); })}
        onAdd={() => set((m) => { m.events.push({ period: "", text: "Nouvel événement" }); })} addLabel="Ajouter un événement" empty="Aucun événement pour l'instant." />
    </Shell>
  );
}

// Registre : associe chaque type à son analyseur, générateur et constructeur.
type BuilderEntry = { parse: (c: string) => unknown; gen: (m: never) => string; Builder: (p: { model: never; onChange: (m: never) => void }) => ReactElement };
const BUILDERS: Record<string, BuilderEntry> = {
  flow: { parse: parseFlow, gen: genFlow as (m: never) => string, Builder: FlowBuilder as unknown as BuilderEntry["Builder"] },
  sequence: { parse: parseSeq, gen: genSeq as (m: never) => string, Builder: SeqBuilder as unknown as BuilderEntry["Builder"] },
  state: { parse: parseState, gen: genState as (m: never) => string, Builder: StateBuilder as unknown as BuilderEntry["Builder"] },
  class: { parse: parseClass, gen: genClass as (m: never) => string, Builder: ClassBuilder as unknown as BuilderEntry["Builder"] },
  er: { parse: parseEr, gen: genEr as (m: never) => string, Builder: ErBuilder as unknown as BuilderEntry["Builder"] },
  gantt: { parse: parseGantt, gen: genGantt as (m: never) => string, Builder: GanttBuilder as unknown as BuilderEntry["Builder"] },
  pie: { parse: parsePie, gen: genPie as (m: never) => string, Builder: PieBuilder as unknown as BuilderEntry["Builder"] },
  mindmap: { parse: parseMind, gen: genMind as (m: never) => string, Builder: MindBuilder as unknown as BuilderEntry["Builder"] },
  journey: { parse: parseJourney, gen: genJourney as (m: never) => string, Builder: JourneyBuilder as unknown as BuilderEntry["Builder"] },
  git: { parse: parseGit, gen: genGit as (m: never) => string, Builder: GitBuilder as unknown as BuilderEntry["Builder"] },
  quadrant: { parse: parseQuad, gen: genQuad as (m: never) => string, Builder: QuadBuilder as unknown as BuilderEntry["Builder"] },
  timeline: { parse: parseTimeline, gen: genTimeline as (m: never) => string, Builder: TimelineBuilder as unknown as BuilderEntry["Builder"] },
};

function SimpleBuilder({ kind, code, onCode }: { kind: string; code: string; onCode: (v: string) => void }) {
  const b = BUILDERS[kind];
  const model = useMemo(() => (b ? b.parse(code) : null), [b, code]);
  if (!b || model == null) return null;
  const B = b.Builder;
  return <B model={model as never} onChange={(m) => onCode(b.gen(m))} />;
}

// ── Menu déroulant réutilisable ──────────────────────────────────────
// Le panneau est rendu en portail (document.body) pour ne pas être rogné
// par le défilement horizontal de la barre d'outils.
function Dropdown({ open, onToggle, onClose, trigger, children, align = "left" }: {
  open: boolean; onToggle: () => void; onClose: () => void; trigger: ReactNode; children: ReactNode; align?: "left" | "right";
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btnRef.current;
      if (!b) return;
      const r = b.getBoundingClientRect();
      setPos(align === "right"
        ? { top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) }
        : { top: r.bottom + 6, left: r.left });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, align]);
  return (
    <div className="relative shrink-0">
      <button ref={btnRef} onClick={onToggle} className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/85 hover:bg-white/10">{trigger}</button>
      {open && mounted && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={onClose} />
          <div className="fixed z-[61] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0f1017]/97 p-2 shadow-2xl backdrop-blur-xl" style={{ top: pos.top, left: pos.left, right: pos.right }} onClick={(e) => e.stopPropagation()}>{children}</div>
        </>,
        document.body,
      )}
    </div>
  );
}
