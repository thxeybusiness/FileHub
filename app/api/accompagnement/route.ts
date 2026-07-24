import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, actorNameFor } from "@/lib/activity";
import { listMemberCoachingIds } from "@/lib/coaching-members";

export const runtime = "nodejs";

// Contenu initial d'un nouveau suivi de coaché (même schéma que l'éditeur).
function defaultCoachingContent(): string {
  return JSON.stringify({
    coachee: { name: "", status: "active", startDate: "", contact: "", goal: "" },
    objectives: [{ id: "o1", title: "Définir l'objectif principal", progress: 20, done: false }],
    sessions: [],
    actions: [{ id: "a1", text: "Planifier la première séance", due: "", done: false }],
    notes: "",
  });
}

type Summary = {
  id: string;
  name: string;
  updatedAt: string;
  coacheeName: string;
  status: string;
  progress: number;
  objectives: number;
  sessions: number;
  openActions: number;
  nextSession: string | null;
  shared: boolean;
};

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function summarize(content: string | null): Omit<Summary, "id" | "name" | "updatedAt" | "shared"> {
  const fallback = { coacheeName: "", status: "active", progress: 0, objectives: 0, sessions: 0, openActions: 0, nextSession: null };
  if (!content) return fallback;
  try {
    const c = JSON.parse(content) as Record<string, unknown>;
    const coachee = (c.coachee ?? {}) as Record<string, unknown>;
    const objectives = Array.isArray(c.objectives) ? (c.objectives as Record<string, unknown>[]) : [];
    const sessionsArr = Array.isArray(c.sessions) ? (c.sessions as Record<string, unknown>[]) : [];
    const actions = Array.isArray(c.actions) ? (c.actions as Record<string, unknown>[]) : [];
    const progress = objectives.length
      ? Math.round(
          objectives.reduce((s, o) => s + (o.done ? 100 : Math.max(0, Math.min(100, Number(o.progress) || 0))), 0) /
            objectives.length,
        )
      : 0;

    // Prochaine séance : date planifiée la plus proche dans le futur.
    const today = new Date().toISOString().slice(0, 10);
    let nextSession: string | null = null;
    for (const s of sessionsArr) {
      const d = s.date;
      if (isDate(d) && d >= today && (!nextSession || d < nextSession)) nextSession = d;
    }

    return {
      coacheeName: typeof coachee.name === "string" ? coachee.name : "",
      status: typeof coachee.status === "string" ? coachee.status : "active",
      progress,
      objectives: objectives.length,
      sessions: sessionsArr.length,
      openActions: actions.filter((a) => !a.done).length,
      nextSession,
    };
  } catch {
    return fallback;
  }
}

// GET /api/accompagnement — liste les suivis de coaché du membre (perso).
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Suivis dont je suis propriétaire OU membre invité (partagés avec moi).
  const memberIds = await listMemberCoachingIds(userId);
  const nodes = await prisma.node.findMany({
    where: {
      type: "coaching",
      trashed: false,
      OR: [{ userId, spaceId: null }, { id: { in: memberIds } }],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, content: true, updatedAt: true, userId: true },
  });

  const items: Summary[] = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    updatedAt: n.updatedAt.toISOString(),
    shared: n.userId !== userId,
    ...summarize(n.content),
  }));

  return NextResponse.json({ items });
}

const createSchema = z.object({ name: z.string().trim().min(1).max(255).optional() });

// POST /api/accompagnement — crée un nouveau suivi de coaché.
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const node = await prisma.node.create({
    data: {
      userId,
      parentId: null,
      spaceId: null,
      name: parsed.data.name?.trim() || "Nouveau coaché",
      type: "coaching",
      content: defaultCoachingContent(),
      mimeType: "application/vnd.filehub.coaching",
    },
    select: { id: true, name: true },
  });

  await logActivity({
    userId,
    actorName: await actorNameFor(userId),
    action: "created",
    targetName: node.name,
    spaceId: null,
    nodeId: node.id,
  });

  return NextResponse.json({ id: node.id, name: node.name });
}
