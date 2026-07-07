import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlan, isFounder, planStorage, FOUNDER_STORAGE } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      username: true,
      email: true,
      storageUsed: true,
      storageLimit: true,
      plan: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const founder = isFounder(user.email);
  return NextResponse.json({
    name: user.name,
    username: user.username,
    email: user.email,
    storageUsed: Number(user.storageUsed),
    storageLimit: founder ? FOUNDER_STORAGE : planStorage(user.plan),
    plan: effectivePlan(user.email, user.plan),
  });
}
