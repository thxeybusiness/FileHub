import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds } from "@/lib/spaces";
import { filterCoachingSpaceIds, ownerCoachingSpaceIds } from "@/lib/coaching-space";
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

  // Les drives de coaché (espaces cachés) ne comptent pas comme des « espaces ».
  const hiddenCoaching = await filterCoachingSpaceIds(memberIds).catch(() => new Set<string>());
  const spacesCount = memberIds.filter((sid) => !hiddenCoaching.has(sid)).length;
  const founder = isFounder(user.email);

  // ── Stockage consommé par l'Accompagnement (SaaS séparé) ──
  // = fiches des coachés (nodes « coaching ») + tout le contenu de leurs drives
  //   dédiés (espaces cachés dont je suis propriétaire).
  const coachingSpaceIds = await ownerCoachingSpaceIds(userId).catch(() => [] as string[]);
  const [coachees, fiches, driveAgg, driveDocs] = await Promise.all([
    prisma.node.count({ where: { userId, type: "coaching", trashed: false } }),
    prisma.node.aggregate({ _sum: { size: true }, where: { userId, type: "coaching" } }),
    coachingSpaceIds.length
      ? prisma.node.aggregate({ _sum: { size: true }, where: { spaceId: { in: coachingSpaceIds } } })
      : Promise.resolve({ _sum: { size: null as bigint | null } }),
    coachingSpaceIds.length
      ? prisma.node.count({ where: { spaceId: { in: coachingSpaceIds }, type: { not: "folder" }, trashed: false } })
      : Promise.resolve(0),
  ]);
  const accompagnement = {
    coachees,
    documents: driveDocs,
    size: Number(fiches._sum.size ?? 0n) + Number(driveAgg._sum.size ?? 0n),
  };

  return NextResponse.json({
    plan: effectivePlan(user.email, user.plan),
    storageUsed: Number(user.storageUsed),
    storageLimit: founder ? FOUNDER_STORAGE : planStorage(user.plan),
    totalCount,
    trashedCount,
    sharesCount,
    spacesCount,
    byType,
    accompagnement,
    biggest: biggest.map((b) => ({
      id: b.id,
      name: b.name,
      size: Number(b.size),
      mimeType: b.mimeType,
    })),
  });
}
