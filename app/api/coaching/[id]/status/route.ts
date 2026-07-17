import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCoachingAccess, canEditRole } from "@/lib/coaching-members";

export const runtime = "nodejs";

const schema = z.object({ status: z.enum(["prospect", "active", "paused", "done"]) });

// PATCH /api/coaching/:id/status — change le statut d'un coaché (pipeline).
// Rôle éditeur requis. Lecture-modif-écriture de content.coachee.status.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canEditRole(role)) return NextResponse.json({ error: "Lecture seule" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });

  let content: Record<string, unknown> = {};
  try {
    content = JSON.parse(node.content || "{}") as Record<string, unknown>;
  } catch {
    content = {};
  }
  const coachee = (content.coachee ?? {}) as Record<string, unknown>;
  coachee.status = parsed.data.status;
  content.coachee = coachee;

  await prisma.node.update({ where: { id }, data: { content: JSON.stringify(content) } });
  return NextResponse.json({ ok: true });
}
