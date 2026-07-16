import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCoachingAccess, canEditRole } from "@/lib/coaching-members";

export const runtime = "nodejs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const schema = z.object({
  op: z.enum(["add", "update", "delete"]),
  kind: z.enum(["session", "action"]),
  itemId: z.string().optional(),
  date: z.string().regex(DATE).optional(),
  label: z.string().max(300).optional(),
  done: z.boolean().optional(),
});

type Session = { id: string; date: string; title: string; notes: string; mood: string; done: boolean };
type Action = { id: string; text: string; due: string; done: boolean };

// PATCH /api/coaching/:id/agenda — ajoute / modifie / supprime une séance ou une
// action de la fiche d'un coaché depuis l'agenda (lecture-modif-écriture du
// contenu). Rôle éditeur requis.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canEditRole(role)) return NextResponse.json({ error: "Lecture seule" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { op, kind, itemId, date, label, done } = parsed.data;

  let content: Record<string, unknown> = {};
  try {
    content = JSON.parse(node.content || "{}") as Record<string, unknown>;
  } catch {
    content = {};
  }
  const sessions: Session[] = Array.isArray(content.sessions) ? (content.sessions as Session[]) : [];
  const actions: Action[] = Array.isArray(content.actions) ? (content.actions as Action[]) : [];

  if (kind === "session") {
    if (op === "add") {
      sessions.push({ id: randomUUID(), date: date ?? "", title: label ?? "Séance", notes: "", mood: "", done: false });
    } else if (op === "update") {
      const s = sessions.find((x) => x.id === itemId);
      if (!s) return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });
      if (date !== undefined) s.date = date;
      if (label !== undefined) s.title = label;
      if (done !== undefined) s.done = done;
    } else if (op === "delete") {
      const i = sessions.findIndex((x) => x.id === itemId);
      if (i >= 0) sessions.splice(i, 1);
    }
    content.sessions = sessions;
  } else {
    if (op === "add") {
      actions.push({ id: randomUUID(), text: label ?? "Action", due: date ?? "", done: false });
    } else if (op === "update") {
      const a = actions.find((x) => x.id === itemId);
      if (!a) return NextResponse.json({ error: "Action introuvable" }, { status: 404 });
      if (date !== undefined) a.due = date;
      if (label !== undefined) a.text = label;
      if (done !== undefined) a.done = done;
    } else if (op === "delete") {
      const i = actions.findIndex((x) => x.id === itemId);
      if (i >= 0) actions.splice(i, 1);
    }
    content.actions = actions;
  }

  await prisma.node.update({ where: { id }, data: { content: JSON.stringify(content) } });
  return NextResponse.json({ ok: true });
}
