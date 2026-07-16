import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearCoachingMembers } from "@/lib/coaching-members";
import { deleteCoachingSpace } from "@/lib/coaching-space";

export const runtime = "nodejs";

// DELETE /api/coaching/:id — supprime définitivement un coaché (propriétaire) :
// la fiche, son drive (espace dédié + contenu) et ses membres.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const node = await prisma.node.findFirst({
    where: { id, type: "coaching" },
    select: { id: true, userId: true },
  });
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (node.userId !== userId) {
    return NextResponse.json({ error: "Propriétaire uniquement" }, { status: 403 });
  }

  // Drive (espace + contenu), membres invités, puis la fiche elle-même.
  await deleteCoachingSpace(id);
  await clearCoachingMembers(id).catch(() => {});
  await prisma.node.delete({ where: { id } }).catch(() => {});

  return NextResponse.json({ ok: true });
}
