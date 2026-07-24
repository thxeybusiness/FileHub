import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const schema = z.object({
  op: z.enum(["add", "update", "delete"]),
  kind: z.enum(["session", "action"]).optional(),
  itemId: z.string().optional(),
  date: z.string().regex(DATE).optional(),
  label: z.string().max(300).optional(),
  done: z.boolean().optional(),
});

// PATCH /api/agenda/general — ajoute / modifie / supprime un événement d'agenda
// « Général » (non rattaché à un coaché), propre à l'utilisateur.
export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { op, kind, itemId, date, label, done } = parsed.data;

  // Bucket coaching = space_id NULL + scope ≠ "filehub" (scope "coaching" ou
  // NULL hérité). NB : Prisma `not` n'inclut PAS les NULL → OR explicite.
  // Cloisonné de l'agenda perso FileHub (scope "filehub").
  const belong = { userId, spaceId: null, OR: [{ scope: null }, { scope: { not: "filehub" } }] };

  if (op === "add") {
    await prisma.agendaEvent.create({
      data: { id: randomUUID(), userId, spaceId: null, scope: "coaching", date: date ?? "", kind: kind === "action" ? "action" : "session", label: label ?? "Séance", done: false },
    });
  } else if (op === "update") {
    if (!itemId) return NextResponse.json({ error: "itemId requis" }, { status: 400 });
    await prisma.agendaEvent.updateMany({
      where: { id: itemId, ...belong },
      data: {
        ...(date !== undefined ? { date } : {}),
        ...(label !== undefined ? { label } : {}),
        ...(done !== undefined ? { done } : {}),
      },
    });
  } else if (op === "delete") {
    if (!itemId) return NextResponse.json({ error: "itemId requis" }, { status: 400 });
    await prisma.agendaEvent.deleteMany({ where: { id: itemId, ...belong } });
  }

  return NextResponse.json({ ok: true });
}
