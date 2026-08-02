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

  const items = rows.map((r) => {
    let width = 1080, height = 1080, background = "#ffffff", layers = 0;
    try {
      const d = JSON.parse(r.content ?? "{}");
      if (typeof d.width === "number") width = d.width;
      if (typeof d.height === "number") height = d.height;
      if (typeof d.background === "string") background = d.background;
      if (Array.isArray(d.layers)) layers = d.layers.length;
    } catch { /* contenu vide/illisible : valeurs par défaut */ }
    return { id: r.id, name: r.name, updatedAt: r.updatedAt.toISOString(), width, height, background, layers };
  });

  return NextResponse.json({ items });
}
