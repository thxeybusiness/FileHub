import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds } from "@/lib/spaces";

export const runtime = "nodejs";

// GET /api/activity?space=<id> — journal d'activité.
// Sans « space » : activité personnelle (drive perso) + celle des espaces de
// l'utilisateur. Avec « space » : activité de cet espace uniquement.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const space = searchParams.get("space");

  let where: Record<string, unknown>;
  if (space) {
    const memberIds = await getMemberSpaceIds(userId);
    if (!memberIds.includes(space)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    where = { spaceId: space };
  } else {
    const memberIds = await getMemberSpaceIds(userId);
    where = {
      OR: [
        { spaceId: null, userId },
        ...(memberIds.length ? [{ spaceId: { in: memberIds } }] : []),
      ],
    };
  }

  const items = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    activities: items.map((a) => ({
      id: a.id,
      actorName: a.actorName,
      action: a.action,
      targetName: a.targetName,
      spaceId: a.spaceId,
      nodeId: a.nodeId,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
