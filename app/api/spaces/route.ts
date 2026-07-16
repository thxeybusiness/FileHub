import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { spaceLimit, effectivePlan } from "@/lib/plans";
import { filterCoachingSpaceIds, ownerCoachingSpaceIds } from "@/lib/coaching-space";

export const runtime = "nodejs";

// GET /api/spaces — espaces dont je suis membre (hors drives de coaché, cachés)
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const memberships = await prisma.spaceMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      space: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  // Les espaces adossés à un coaché ne doivent jamais apparaître dans FileHub.
  const hidden = await filterCoachingSpaceIds(memberships.map((m) => m.space.id));

  return NextResponse.json({
    spaces: memberships
      .filter((m) => !hidden.has(m.space.id))
      .map((m) => ({
        id: m.space.id,
        name: m.space.name,
        role: m.role,
        isOwner: m.space.ownerId === userId,
        memberCount: m.space._count.members,
      })),
  });
}

const createSchema = z.object({ name: z.string().trim().min(1).max(80) });

// POST /api/spaces — créer un espace (le créateur en devient propriétaire)
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nom invalide" }, { status: 400 });

  // Limite d'espaces partagés selon le grade (Basic : 1, Team : 3, Pro/Business : illimité).
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, plan: true } });
  const limit = spaceLimit(effectivePlan(me?.email, me?.plan ?? "free"));
  if (Number.isFinite(limit)) {
    // Les drives de coaché (espaces cachés) ne comptent pas dans la limite.
    const coachingSpaceIds = await ownerCoachingSpaceIds(userId);
    const owned = await prisma.space.count({
      where: { ownerId: userId, ...(coachingSpaceIds.length ? { id: { notIn: coachingSpaceIds } } : {}) },
    });
    if (owned >= limit) {
      return NextResponse.json(
        {
          error:
            limit === 1
              ? "Votre grade Basic permet 1 espace partagé. Passez à un grade supérieur pour en créer davantage."
              : `Votre grade permet ${limit} espaces partagés. Vous avez atteint cette limite.`,
        },
        { status: 403 },
      );
    }
  }

  const space = await prisma.space.create({
    data: {
      name: parsed.data.name,
      ownerId: userId,
      members: { create: { userId, role: "owner" } },
    },
    select: { id: true, name: true },
  });

  await notify(userId, {
    type: "space_created",
    title: `Espace « ${space.name} » créé`,
    body: "Invitez des membres depuis le bouton Membres.",
    spaceId: space.id,
  });

  return NextResponse.json({ space: { id: space.id, name: space.name, role: "owner", isOwner: true, memberCount: 1 } });
}
