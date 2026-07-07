import Anthropic from "@anthropic-ai/sdk";

// L'assistant IA de FileHub, propulsé par Claude (Anthropic).
// La clé API doit être fournie via la variable d'environnement ANTHROPIC_API_KEY
// (à définir sur Vercel). Sans elle, les fonctions IA renvoient une erreur claire.

const MODEL = "claude-opus-4-8";

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/** Appel texte simple : renvoie la réponse de Claude en texte brut. */
export async function completeText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<string> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    output_config: { effort: opts.effort ?? "medium" },
    messages: [{ role: "user", content: opts.user }],
  });
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Conversation multi-tours : renvoie la réponse texte de Claude. */
export async function completeChat(opts: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
}): Promise<string> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 2500,
    system: opts.system,
    output_config: { effort: "medium" },
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

/** Appel avec sortie structurée : renvoie l'objet JSON validé par le schéma. */
export async function completeJson<T = unknown>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    output_config: { effort: "medium", format: { type: "json_schema", schema: opts.schema } },
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return JSON.parse(text) as T;
}
