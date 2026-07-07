import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { aiConfigured, completeText, completeJson } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  kind: z.enum(["doc", "sheet", "chart", "draw"]),
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

    const table =
      kind === "doc" ? DOC_ACTIONS : kind === "sheet" ? SHEET_ACTIONS : DRAW_ACTIONS;
    const build = table[action] ?? table.custom;
    if (!build) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

    const system = kind === "doc" ? DOC_SYSTEM : kind === "sheet" ? SHEET_SYSTEM : DRAW_SYSTEM;
    const result = await completeText({
      system,
      user: build(text, instruction),
      maxTokens: kind === "doc" ? 6000 : 2000,
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
