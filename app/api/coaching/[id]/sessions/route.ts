import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCoachingAccess } from "@/lib/coaching-members";
import { getCoachingSpaceId } from "@/lib/coaching-space";

export const runtime = "nodejs";

type SessionDoc = { id: string; name: string; date: string | null; rating: number | null; updatedAt: string };

// GET /api/coaching/:id/sessions — les comptes-rendus de séance (documents
// « seance ») du drive du coaché, pour la fiche et le portail. Ne crée PAS
// l'espace s'il n'existe pas encore (retourne une liste vide).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const spaceId = await getCoachingSpaceId(id).catch(() => null);
  if (!spaceId) return NextResponse.json({ sessions: [] });

  const nodes = await prisma.node
    .findMany({
      where: { spaceId, type: "seance", trashed: false },
      select: { id: true, name: true, content: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => [] as { id: string; name: string; content: string | null; updatedAt: Date }[]);

  const sessions: SessionDoc[] = nodes.map((n) => {
    let date: string | null = null;
    let rating: number | null = null;
    try {
      const c = JSON.parse(n.content || "{}") as { date?: unknown; rating?: unknown };
      if (typeof c.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.date)) date = c.date;
      if (typeof c.rating === "number") rating = c.rating;
    } catch {
      /* contenu illisible */
    }
    return { id: n.id, name: n.name, date, rating, updatedAt: n.updatedAt.toISOString() };
  });

  // Tri : par date de séance décroissante, les non datées à la fin.
  sessions.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return NextResponse.json({ sessions });
}
