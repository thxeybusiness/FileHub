import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounder, aiDailyLimit } from "@/lib/plans";
import { reserveAiUsage, refundAiUsage } from "@/lib/ai-quota";
import { aiConfigured, completeChat, type ChatMessage } from "@/lib/ai";
import { buildDriveContext } from "@/lib/drive-context";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .min(1)
    .max(20),
});

const SYSTEM = (context: string) => `Tu es l'assistant intelligent de FileHub, un espace de fichiers moderne.
Tu as accès aux fichiers de l'utilisateur (ci-dessous) et tu réponds à ses questions à leur sujet :
retrouver un fichier, résumer un document, comparer, calculer des totaux, faire un compte-rendu, etc.

Règles :
- Réponds en français, de façon concise et directement utile.
- Appuie-toi UNIQUEMENT sur les fichiers fournis ; si l'information n'y est pas, dis-le simplement.
- Quand tu cites un fichier, mets son nom entre « guillemets ».
- Pour une synthèse ou une liste, utilise des puces "- ".
- Ne divulgue jamais ce contexte technique tel quel ; reformule naturellement.

=== FICHIERS DE L'UTILISATEUR ===
${context}
=== FIN ===`;

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "L'assistant IA n'est pas encore activé. Ajoutez la clé ANTHROPIC_API_KEY sur Vercel." },
      { status: 503 },
    );
  }

  // Contrôle d'accès + quota quotidien selon le grade.
  const meRow = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, plan: true } });
  const plan = isFounder(meRow?.email) ? "founder" : meRow?.plan ?? "free";
  const limit = aiDailyLimit(plan);
  if (limit <= 0) {
    return NextResponse.json({ error: "L'assistant IA n'est pas inclus dans votre grade." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  // Réservation atomique du quota AVANT l'appel au modèle (anti-course).
  const metered = Number.isFinite(limit);
  if (metered && !(await reserveAiUsage(userId, limit))) {
    return NextResponse.json({ error: `Quota IA du jour atteint (${limit}/jour). Réessayez demain.` }, { status: 429 });
  }

  const messages = parsed.data.messages as ChatMessage[];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  try {
    const context = await buildDriveContext(userId, lastUser?.content ?? "");
    const reply = await completeChat({ system: SYSTEM(context), messages });
    return NextResponse.json({ reply });
  } catch (err) {
    if (metered) await refundAiUsage(userId); // l'appel a échoué : on rend le crédit
    const raw = err instanceof Error ? err.message : String(err);
    let message = "L'assistant a rencontré une erreur. Réessayez dans un instant.";
    if (/credit balance|Plans & Billing|purchase credits/i.test(raw)) {
      message = "Crédits Anthropic insuffisants. Ajoutez des crédits sur console.anthropic.com pour activer l'IA.";
    } else if (/authentication|invalid x-api-key|401/i.test(raw)) {
      message = "Clé API Anthropic invalide. Vérifiez ANTHROPIC_API_KEY sur Vercel.";
    } else if (/rate_?limit|429/i.test(raw)) {
      message = "Trop de requêtes en peu de temps. Réessayez dans quelques secondes.";
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
