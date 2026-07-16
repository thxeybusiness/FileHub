import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds } from "@/lib/spaces";
import { effectivePlan, isFounder, planStorage, FOUNDER_STORAGE } from "@/lib/plans";

export const runtime = "nodejs";

// GET /api/dashboard — statistiques du drive personnel de l'utilisateur.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, plan: true, storageUsed: true },
  });
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Portée : drive personnel (hors corbeille) pour les compteurs par type.
  const personalActive = { userId, spaceId: null, trashed: false };

  const [grouped, trashedCount, sharesCount, memberIds, biggest] = await Promise.all([
    prisma.node.groupBy({
      by: ["type"],
      // L'accompagnement est une extension à part : hors statistiques du drive.
      where: { ...personalActive, type: { not: "coaching" } },
      _count: { _all: true },
      _sum: { size: true },
    }),
    prisma.node.count({ where: { userId, spaceId: null, trashed: true } }),
    prisma.share.count({ where: { ownerId: userId } }),
    getMemberSpaceIds(userId),
    prisma.node.findMany({
      where: { ...personalActive, type: "file" },
      orderBy: { size: "desc" },
      take: 5,
      select: { id: true, name: true, size: true, mimeType: true },
    }),
  ]);

  const byType: Record<string, { count: number; size: number }> = {};
  let totalCount = 0;
  for (const g of grouped) {
    const count = g._count._all;
    byType[g.type] = { count, size: Number(g._sum.size ?? 0n) };
    totalCount += count;
  }

  const spacesCount = memberIds.length;
  const founder = isFounder(user.email);

  return NextResponse.json({
    plan: effectivePlan(user.email, user.plan),
    storageUsed: Number(user.storageUsed),
    storageLimit: founder ? FOUNDER_STORAGE : planStorage(user.plan),
    totalCount,
    trashedCount,
    sharesCount,
    spacesCount,
    byType,
    biggest: biggest.map((b) => ({
      id: b.id,
      name: b.name,
      size: Number(b.size),
      mimeType: b.mimeType,
    })),
  });
}
