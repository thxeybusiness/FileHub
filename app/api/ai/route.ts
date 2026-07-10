import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { aiConfigured, completeText, completeJson } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  kind: z.enum(["doc", "sheet", "chart", "draw", "note", "diagram", "board", "slides", "project"]),
  action: z.string().min(1).max(40),
  text: z.string().max(40000).optional(), // contenu / sélection / données
  instruction: z.string().max(2000).optional(), // demande libre de l'utilisateur
});

// ── Traitement de texte ──────────────────────────────────────────────
const DOC_SYSTEM = `Tu es l'assistant d'écriture intégré à FileHub, un traitement de texte.
On te donne un extrait (ou tout le document) et une action à réaliser.
Réponds UNIQUEMENT avec le texte résultant, formaté en HTML simple :
<p>, <strong>, <em>, <u>, <ul>/<ol>/<li>, <h2>/<h3>, <blockquote>.
Pas de <html>, <head>, <body>, pas de balises de code, pas de commentaire ni d'explication.
Conserve la langue du texte d'origine sauf si l'action est une traduction.`;

const DOC_ACTIONS: Record<string, (t: string, instr?: string) => string> = {
  improve: (t) => `Améliore ce texte (clarté, style, grammaire) sans en changer le sens :\n\n${t}`,
  rewrite: (t) => `Réécris ce texte différemment, en gardant le sens :\n\n${t}`,
  summarize: (t) => `Résume ce texte en quelques points clés (liste) :\n\n${t}`,
  shorten: (t) => `Raccourcis ce texte de moitié environ, garde l'essentiel :\n\n${t}`,
  expand: (t) => `Développe et enrichis ce texte avec plus de détails :\n\n${t}`,
  professional: (t) => `Réécris ce texte sur un ton professionnel et soigné :\n\n${t}`,
  friendly: (t) => `Réécris ce texte sur un ton chaleureux et accessible :\n\n${t}`,
  translate_en: (t) => `Traduis ce texte en anglais :\n\n${t}`,
  translate_fr: (t) => `Traduis ce texte en français :\n\n${t}`,
  translate_es: (t) => `Traduis ce texte en espagnol :\n\n${t}`,
  continue: (t) => `Continue ce texte de façon naturelle (2-3 paragraphes) :\n\n${t}`,
  custom: (t, instr) =>
    `${instr}\n\n${t ? `Texte concerné :\n${t}` : "(Aucun texte fourni — génère à partir de la consigne.)"}`,
};

// ── Feuille de calcul ────────────────────────────────────────────────
const SHEET_SYSTEM = `Tu es l'analyste tableur de FileHub.
On te donne les données d'une feuille (au format TSV, tabulations entre colonnes) et une demande.
Réponds de façon concise et directement exploitable, en français, en texte simple.
- Pour une formule : donne-la seule sur sa propre ligne, préfixée de "=", puis une phrase d'explication.
- Pour une analyse : va droit au but (tendances, totaux, anomalies), en quelques puces "- ".
N'invente pas de données absentes.`;

const SHEET_ACTIONS: Record<string, (t: string, instr?: string) => string> = {
  analyze: (t) => `Analyse ces données et donne les points saillants :\n\n${t}`,
  insights: (t) => `Quelles décisions ou observations utiles peut-on tirer de ces données ?\n\n${t}`,
  formula: (t, instr) =>
    `Donne la formule tableur (syntaxe type Excel) pour : ${instr}\n\nDonnées :\n${t}`,
  clean: (t) => `Propose comment nettoyer/normaliser ces données (colonnes, formats, doublons) :\n\n${t}`,
  custom: (t, instr) => `${instr}\n\nDonnées de la feuille :\n${t}`,
};

// ── Dessin ───────────────────────────────────────────────────────────
const DRAW_SYSTEM = `Tu es l'assistant créatif de l'outil de dessin de FileHub.
Tu ne dessines pas toi-même : tu aides l'utilisateur à savoir QUOI dessiner.
Réponds en français, de façon concrète et concise (puces "- "), avec des éléments visuels précis,
une composition (ce qui va où), et éventuellement une palette de couleurs.`;

const DRAW_ACTIONS: Record<string, (t: string, instr?: string) => string> = {
  ideas: (_t, instr) => `Propose 4 idées de dessin sur le thème : ${instr || "libre"}.`,
  compose: (_t, instr) =>
    `Décris une composition détaillée (éléments + placement + couleurs) pour dessiner : ${instr}`,
  custom: (_t, instr) => `${instr}`,
};

// ── Note (Markdown) ──────────────────────────────────────────────────
const NOTE_SYSTEM = `Tu es l'assistant de prise de notes de FileHub.
Réponds UNIQUEMENT en Markdown (titres #, listes -, **gras**, \`code\`, > citation).
Pas de bloc de code englobant, pas de commentaire hors de la note.`;

const NOTE_ACTIONS: Record<string, (t: string, instr?: string) => string> = {
  improve: (t) => `Améliore et structure cette note en Markdown :\n\n${t}`,
  summarize: (t) => `Résume cette note en points clés (Markdown) :\n\n${t}`,
  todo: (t) => `Extrais une liste de tâches (cases à cocher Markdown) de cette note :\n\n${t}`,
  continue: (t) => `Continue cette note de façon utile :\n\n${t}`,
  custom: (t, instr) => `${instr}\n\n${t ? `Note actuelle :\n${t}` : "(Rédige à partir de la consigne.)"}`,
};

// ── Diagramme (Mermaid) ──────────────────────────────────────────────
const DIAGRAM_SYSTEM = `Tu génères des diagrammes Mermaid pour FileHub.
Réponds UNIQUEMENT avec du code Mermaid valide (graph/flowchart, sequenceDiagram, classDiagram, etc.).
Aucune explication, aucun bloc \`\`\`, juste le code du diagramme.`;

const DIAGRAM_ACTIONS: Record<string, (t: string, instr?: string) => string> = {
  generate: (t, instr) =>
    `Crée un diagramme Mermaid pour : ${instr || "un processus pertinent"}.${t ? `\n\nDiagramme actuel (à faire évoluer si utile) :\n${t}` : ""}`,
  fix: (t) => `Corrige la syntaxe de ce diagramme Mermaid et renvoie-le complet :\n\n${t}`,
  custom: (t, instr) => `${instr}\n\n${t ? `Diagramme actuel :\n${t}` : ""}`,
};

// ── Graphique (sortie structurée) ────────────────────────────────────
const CHART_SYSTEM = `Tu génères la configuration d'un graphique pour FileHub à partir d'une description.
Choisis le type le plus adapté parmi : bar, bar-horizontal, bar-stacked, line, area, pie, doughnut, radar, scatter.
Renvoie des catégories (axe) et une ou plusieurs séries de nombres cohérentes avec la demande.
Si des données sont fournies, sers-t'en ; sinon, génère un exemple plausible et représentatif.`;

const CHART_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: {
      type: "string",
      enum: ["bar", "bar-horizontal", "bar-stacked", "line", "area", "pie", "doughnut", "radar", "scatter"],
    },
    categories: { type: "array", items: { type: "string" } },
    series: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          data: { type: "array", items: { type: "number" } },
        },
        required: ["name", "data"],
      },
    },
  },
  required: ["type", "categories", "series"],
};

// ── Kanban (sortie structurée) ───────────────────────────────────────
const BOARD_SYSTEM = `Tu organises un tableau kanban pour FileHub à partir d'une demande.
Crée des colonnes claires (ex. À faire / En cours / Terminé, ou par thème) et des cartes concrètes et actionnables.`;
const BOARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    columns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: "string" }, cards: { type: "array", items: { type: "string" } } },
        required: ["title", "cards"],
      },
    },
  },
  required: ["columns"],
};

// ── Présentation (sortie structurée) ─────────────────────────────────
const SLIDES_SYSTEM = `Tu crées une présentation (diaporama) pour FileHub à partir d'un sujet.
Chaque diapositive a un titre court et 2 à 5 puces concises et percutantes. Vise 5 à 10 diapositives.`;
const SLIDES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } } },
        required: ["title", "bullets"],
      },
    },
  },
  required: ["slides"],
};

// ── Projet (liste de tâches structurée) ──────────────────────────────
const PROJECT_SYSTEM = `Tu planifies un projet pour FileHub sous forme de liste de tâches.
Chaque tâche a un titre concret et actionnable, un statut (À faire / En cours / Terminé),
une priorité (urgent, high, medium, low), et éventuellement des étiquettes courtes.
Propose 6 à 14 tâches couvrant l'ensemble du projet, du cadrage à la livraison.`;
const PROJECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          status: { type: "string", enum: ["todo", "doing", "done"] },
          priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "status", "priority"],
      },
    },
  },
  required: ["tasks"],
};

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "L'assistant IA n'est pas encore activé. Ajoutez la clé ANTHROPIC_API_KEY sur Vercel." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { kind, action, text = "", instruction } = parsed.data;

  try {
    if (kind === "chart") {
      const chart = await completeJson({
        system: CHART_SYSTEM,
        user: `${instruction || "Génère un graphique pertinent."}${text ? `\n\nDonnées disponibles :\n${text}` : ""}`,
        schema: CHART_SCHEMA,
        maxTokens: 2000,
      });
      return NextResponse.json({ chart });
    }
    if (kind === "board") {
      const data = await completeJson({
        system: BOARD_SYSTEM,
        user: `${instruction || "Crée un tableau de tâches pertinent."}${text ? `\n\nContexte :\n${text}` : ""}`,
        schema: BOARD_SCHEMA,
        maxTokens: 2500,
      });
      return NextResponse.json({ data });
    }
    if (kind === "slides") {
      const data = await completeJson({
        system: SLIDES_SYSTEM,
        user: `${instruction || "Crée une présentation pertinente."}${text ? `\n\nContexte :\n${text}` : ""}`,
        schema: SLIDES_SCHEMA,
        maxTokens: 3000,
      });
      return NextResponse.json({ data });
    }
    if (kind === "project") {
      const data = await completeJson({
        system: PROJECT_SYSTEM,
        user: `${instruction || "Planifie un projet pertinent en tâches."}${text ? `\n\nContexte :\n${text}` : ""}`,
        schema: PROJECT_SCHEMA,
        maxTokens: 3000,
      });
      return NextResponse.json({ data });
    }

    const tables: Record<string, Record<string, (t: string, instr?: string) => string>> = {
      doc: DOC_ACTIONS, sheet: SHEET_ACTIONS, draw: DRAW_ACTIONS, note: NOTE_ACTIONS, diagram: DIAGRAM_ACTIONS,
    };
    const systems: Record<string, string> = {
      doc: DOC_SYSTEM, sheet: SHEET_SYSTEM, draw: DRAW_SYSTEM, note: NOTE_SYSTEM, diagram: DIAGRAM_SYSTEM,
    };
    const table = tables[kind];
    if (!table) return NextResponse.json({ error: "Type inconnu" }, { status: 400 });
    const build = table[action] ?? table.custom;
    if (!build) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

    const result = await completeText({
      system: systems[kind],
      user: build(text, instruction),
      maxTokens: kind === "doc" ? 6000 : 2500,
      effort: "low",
    });
    return NextResponse.json({ result });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    let message = "L'assistant IA a rencontré une erreur. Réessayez dans un instant.";
    if (/credit balance|Plans & Billing|purchase credits/i.test(raw)) {
      message =
        "Crédits Anthropic insuffisants. Ajoutez des crédits sur console.anthropic.com (Plans & Billing) pour activer l'IA.";
    } else if (/authentication|invalid x-api-key|401/i.test(raw)) {
      message = "Clé API Anthropic invalide. Vérifiez la variable ANTHROPIC_API_KEY sur Vercel.";
    } else if (/rate_?limit|429/i.test(raw)) {
      message = "Trop de requêtes vers l'IA en peu de temps. Réessayez dans quelques secondes.";
    } else if (/overloaded|529/i.test(raw)) {
      message = "Le service Claude est momentanément surchargé. Réessayez dans un instant.";
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
