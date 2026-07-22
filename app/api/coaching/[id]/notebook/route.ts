import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCoachingAccess, canEditRole } from "@/lib/coaching-members";
import { ensureCoachingSpace } from "@/lib/coaching-space";

export const runtime = "nodejs";

const schema = z.object({ name: z.string().trim().min(1).max(255).optional() });

// POST /api/coaching/:id/notebook — crée une note (« carnet ») dans le drive du
// coaché. Cette note est partagée : le coaché, membre de l'espace, peut y écrire
// lui-même ses notes de séance. Renvoie l'identifiant et le nom de la note créée.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canEditRole(role)) {
    return NextResponse.json({ error: "Lecture seule" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const name = parsed.data.name?.trim() || "Carnet du coaché";

  const spaceId = await ensureCoachingSpace(id, node.userId, node.name);

  const created = await prisma.node.create({
    data: {
      userId,
      spaceId,
      parentId: null,
      name,
      type: "note",
      content: "",
      mimeType: "application/vnd.filehub.note",
    },
    select: { id: true, name: true, type: true },
  });

  return NextResponse.json({ note: created });
}
