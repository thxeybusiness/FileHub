import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, storageUsed: true, storageLimit: true },
  });
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json({
    name: user.name,
    email: user.email,
    storageUsed: Number(user.storageUsed),
    storageLimit: Number(user.storageLimit),
  });
}
