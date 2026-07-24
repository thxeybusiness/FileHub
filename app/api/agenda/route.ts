import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSpaceRole, canEditRole } from "@/lib/spaces";

export const runtime = "nodejs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type AgendaEventDTO = { id: string; date: string; kind: "session" | "action"; label: string; done: boolean };

// GET /api/agenda            → agenda personnel (space_id NULL, propre à l'user)
// GET /api/agenda?space=<id> → agenda commun d'un espace (membre requis)
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const spaceId = new URL(req.url).searchParams.get("space");

  if (spaceId) {
    if (!(await getSpaceRole(userId, spaceId))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  }

  const rows = await prisma.agendaEvent
    .findMany({
      where: spaceId ? { spaceId } : { userId, spaceId: null },
      select: { id: true, date: true, kind: true, label: true, done: true },
      orderBy: { date: "asc" },
    })
    .catch(() => [] as { id: string; date: string; kind: string; label: string; done: boolean }[]);

  const events: AgendaEventDTO[] = rows
    .filter((r) => DATE.test(r.date))
    .map((r) => ({ id: r.id, date: r.date, kind: r.kind === "action" ? "action" : "session", label: r.label, done: r.done }));

  return NextResponse.json({ events });
}

const schema = z.object({
  op: z.enum(["add", "update", "delete"]),
  kind: z.enum(["session", "action"]).optional(),
  itemId: z.string().optional(),
  date: z.string().regex(DATE).optional(),
  label: z.string().max(300).optional(),
  done: z.boolean().optional(),
  spaceId: z.string().nullable().optional(),
});

// PATCH /api/agenda — ajoute / modifie / supprime un événement.
// spaceId présent ⇒ agenda commun d'un espace (droit éditeur requis) ;
// sinon ⇒ agenda personnel (space_id NULL, restreint à l'utilisateur).
export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { op, kind, itemId, date, label, done, spaceId } = parsed.data;

  // Portée espace : droit d'édition requis. Portée perso : rien de plus.
  if (spaceId) {
    if (!canEditRole(await getSpaceRole(userId, spaceId))) {
      return NextResponse.json({ error: "Vous êtes en lecture seule sur cet espace" }, { status: 403 });
    }
  }

  // Filtre d'appartenance : espace → {id, spaceId} (tout éditeur) ;
  // perso → {id, userId, spaceId: null}.
  const scope = spaceId ? { spaceId } : { userId, spaceId: null };

  if (op === "add") {
    await prisma.agendaEvent.create({
      data: {
        id: randomUUID(),
        userId,
        spaceId: spaceId ?? null,
        date: date ?? "",
        kind: kind === "action" ? "action" : "session",
        label: label ?? "Événement",
        done: false,
      },
    });
  } else if (op === "update") {
    if (!itemId) return NextResponse.json({ error: "itemId requis" }, { status: 400 });
    await prisma.agendaEvent.updateMany({
      where: { id: itemId, ...scope },
      data: {
        ...(date !== undefined ? { date } : {}),
        ...(label !== undefined ? { label } : {}),
        ...(done !== undefined ? { done } : {}),
      },
    });
  } else if (op === "delete") {
    if (!itemId) return NextResponse.json({ error: "itemId requis" }, { status: 400 });
    await prisma.agendaEvent.deleteMany({ where: { id: itemId, ...scope } });
  }

  return NextResponse.json({ ok: true });
}
