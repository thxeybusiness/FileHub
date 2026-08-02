import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Liste des créations de l'application « Design » (personnelles).
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const rows = await prisma.node.findMany({
    where: { userId, spaceId: null, type: "design", trashed: false },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, content: true },
  });

  // Le contenu complet est renvoyé : les documents sont de petits JSON et la
  // galerie s'en sert pour rendre de vrais aperçus miniatures.
  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    updatedAt: r.updatedAt.toISOString(),
    content: r.content ?? "",
  }));

  return NextResponse.json({ items });
}
