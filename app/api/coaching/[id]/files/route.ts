import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCoachingAccess } from "@/lib/coaching-members";
import { getCoachingSpaceId } from "@/lib/coaching-space";

export const runtime = "nodejs";

// GET /api/coaching/:id/files — documents & fichiers du drive du coaché (hors
// dossiers), pour les joindre aux étapes d'un plan d'action.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const spaceId = await getCoachingSpaceId(id).catch(() => null);
  if (!spaceId) return NextResponse.json({ files: [] });

  const nodes = await prisma.node
    .findMany({
      where: { spaceId, trashed: false, type: { not: "folder" } },
      select: { id: true, name: true, type: true, mimeType: true },
      orderBy: { updatedAt: "desc" },
      take: 300,
    })
    .catch(() => [] as { id: string; name: string; type: string; mimeType: string | null }[]);

  return NextResponse.json({ files: nodes });
}
