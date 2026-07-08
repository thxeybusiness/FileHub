"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check, Loader2, Workflow, AlertTriangle,
  Maximize2, Sparkles, LayoutTemplate, Shapes, ChevronDown, Palette, Download, ImageIcon,
  Copy, Eye, Code2, ZoomIn, ZoomOut, Maximize, X, ArrowLeftRight, Boxes, Waypoints,
  Table2, Calendar, PieChart, Network, Route, GitBranch, LayoutGrid, Clock, Plus, Trash2,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { AiAssistant } from "./ai-assistant";

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
  Cadrage      :a1, 2024-01-01, 7d
  Maquettes    :after a1, 5d
  section Développement
  Intégration  :2024-01-15, 10d` },
  { key: "pie", label: "Camembert", icon: PieChart, code: `pie showData title Répartition
  "Produit A" : 45
  "Produit B" : 30
  "Produit C" : 25` },
  { key: "mindmap", label: "Carte mentale", icon: Network, code: `mindmap
  root((FileHub))
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

export function DiagramEditor({
  id, initialName, initialContent, backHref, crumbs,
}: {
  id: string;
  initialName: string;
  initialContent: string;
  backHref: string;
  crumbs: Crumb[];
}) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(initialContent);
  const [save, setSave] = useState<SaveState>("saved");
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

  const persist = useCallback((patch: { content?: string; name?: string }) => {
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.saveContent(id, patch).then(() => setSave("saved")).catch(() => setSave("error"));
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

  // ── Mode Simple : modèle dérivé du code + actions du constructeur ───
  const flow = useMemo(() => parseFlow(code), [code]);
  const canSimple = flow !== null;
  const mode: "simple" | "code" = canSimple ? modeState : "code";
  const editFlow = (fn: (f: Flow) => void) => {
    const f: Flow = flow ? structuredClone(flow) : { dir: "TD", nodes: [], edges: [] };
    fn(f);
    onCode(genFlow(f));
  };
  const nextNodeId = (f: Flow) => {
    const used = new Set(f.nodes.map((n) => n.id));
    for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") if (!used.has(c)) return c;
    let i = 1; while (used.has(`N${i}`)) i++; return `N${i}`;
  };
  const addNode = () => editFlow((f) => { f.nodes.push({ id: nextNodeId(f), label: "Nouvelle étape", shape: f.nodes.length ? "rect" : "stadium" }); });
  const setNode = (nid: string, patch: Partial<FNode>) => editFlow((f) => { const n = f.nodes.find((x) => x.id === nid); if (n) Object.assign(n, patch); });
  const delNode = (nid: string) => editFlow((f) => { f.nodes = f.nodes.filter((n) => n.id !== nid); f.edges = f.edges.filter((e) => e.from !== nid && e.to !== nid); });
  const addEdge = () => editFlow((f) => { if (f.nodes.length < 2) return; f.edges.push({ from: f.nodes[0].id, to: f.nodes[1].id, label: "" }); });
  const setEdge = (i: number, patch: Partial<FEdge>) => editFlow((f) => { if (f.edges[i]) Object.assign(f.edges[i], patch); });
  const delEdge = (i: number) => editFlow((f) => { f.edges.splice(i, 1); });

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
      {/* En-tête */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 sm:px-5 flex items-center gap-2 sm:gap-3">
        <Link href={backHref} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-white transition" title="Retour"><ArrowLeft className="size-5" /></Link>
        <Workflow className="size-4 shrink-0 text-teal-400" />
        <input value={name} onChange={(e) => onName(e.target.value)} className="min-w-0 w-40 sm:w-64 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" placeholder="Diagramme sans titre" />
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          {save === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : save === "error" ? <span className="text-red-400">Erreur</span> : <Check className="size-3.5 text-emerald-400" />}
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
          {mode === "simple" && flow ? (
            <FlowBuilder flow={flow} onAddNode={addNode} onSetNode={setNode} onDelNode={delNode} onAddEdge={addEdge} onSetEdge={setEdge} onDelEdge={delEdge} />
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

// ── Constructeur visuel d'organigramme (mode Simple) ─────────────────
function FlowBuilder({ flow, onAddNode, onSetNode, onDelNode, onAddEdge, onSetEdge, onDelEdge }: {
  flow: Flow;
  onAddNode: () => void; onSetNode: (id: string, patch: Partial<FNode>) => void; onDelNode: (id: string) => void;
  onAddEdge: () => void; onSetEdge: (i: number, patch: Partial<FEdge>) => void; onDelEdge: (i: number) => void;
}) {
  const nodeName = (id: string) => { const n = flow.nodes.find((x) => x.id === id); return n ? (n.label.trim() || id) : id; };
  const selectCls = "h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none focus:border-brand-400";
  const inputCls = "h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand-400";
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      {/* Étapes */}
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Boxes className="size-3.5" /> Étapes</p>
        <span className="text-[11px] text-muted">{flow.nodes.length}</span>
      </div>
      <div className="space-y-2">
        {flow.nodes.map((n) => (
          <div key={n.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <div className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-500/20 text-[11px] font-bold text-brand-200">{n.id}</span>
              <input value={n.label} onChange={(e) => onSetNode(n.id, { label: e.target.value })} placeholder="Nom de l'étape" className={inputCls} />
              <button onClick={() => onDelNode(n.id)} title="Supprimer" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 className="size-4" /></button>
            </div>
            <div className="mt-2 flex items-center gap-2 pl-9">
              <span className="text-[11px] text-muted">Forme</span>
              <select value={n.shape} onChange={(e) => onSetNode(n.id, { shape: e.target.value as FShape })} className={`${selectCls} flex-1`}>
                {SHAPES.map((s) => <option key={s.k} value={s.k} className="bg-[#0f1017]">{s.l}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onAddNode} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2.5 text-sm text-white/80 hover:border-brand-400/50 hover:bg-white/[0.03] hover:text-white">
        <Plus className="size-4" /> Ajouter une étape
      </button>

      {/* Liens */}
      <div className="mb-2 mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Waypoints className="size-3.5" /> Liens</p>
        <span className="text-[11px] text-muted">{flow.edges.length}</span>
      </div>
      {flow.nodes.length < 2 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs leading-snug text-muted">Ajoutez au moins deux étapes pour pouvoir les relier par des flèches.</p>
      ) : (
        <>
          <div className="space-y-2">
            {flow.edges.map((e, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <div className="flex items-center gap-1.5">
                  <select value={e.from} onChange={(ev) => onSetEdge(i, { from: ev.target.value })} className={`${selectCls} min-w-0 flex-1`}>
                    {flow.nodes.map((n) => <option key={n.id} value={n.id} className="bg-[#0f1017]">{nodeName(n.id)}</option>)}
                  </select>
                  <ArrowRight className="size-4 shrink-0 text-brand-300" />
                  <select value={e.to} onChange={(ev) => onSetEdge(i, { to: ev.target.value })} className={`${selectCls} min-w-0 flex-1`}>
                    {flow.nodes.map((n) => <option key={n.id} value={n.id} className="bg-[#0f1017]">{nodeName(n.id)}</option>)}
                  </select>
                  <button onClick={() => onDelEdge(i)} title="Supprimer" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 className="size-4" /></button>
                </div>
                <input value={e.label} onChange={(ev) => onSetEdge(i, { label: ev.target.value })} placeholder="Étiquette de la flèche (facultatif)" className={`${inputCls} mt-2`} />
              </div>
            ))}
          </div>
          <button onClick={onAddEdge} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2.5 text-sm text-white/80 hover:border-brand-400/50 hover:bg-white/[0.03] hover:text-white">
            <Plus className="size-4" /> Ajouter un lien
          </button>
        </>
      )}
      <p className="mt-4 text-[11px] leading-snug text-muted/70">Astuce : passez en mode « Code » pour un contrôle avancé (styles, sous-graphes, autres types de diagrammes).</p>
    </div>
  );
}

// ── Menu déroulant réutilisable ──────────────────────────────────────
// Le panneau est rendu en portail (document.body) pour ne pas être rogné
// par le défilement horizontal de la barre d'outils.
function Dropdown({ open, onToggle, onClose, trigger, children, align = "left" }: {
  open: boolean; onToggle: () => void; onClose: () => void; trigger: React.ReactNode; children: React.ReactNode; align?: "left" | "right";
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
