import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/notifications — dernières notifications + nombre de non-lues
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        spaceId: true,
        read: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return NextResponse.json({
    unread,
    notifications: items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  });
}

// POST /api/notifications — tout marquer comme lu
export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
