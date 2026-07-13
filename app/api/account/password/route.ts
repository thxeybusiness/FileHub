import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  current: z.string().min(1),
  next: z.string().min(8, "8 caractères minimum.").max(200),
});

// POST /api/account/password — change le mot de passe (vérifie l'actuel).
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });

  return NextResponse.json({ ok: true });
}
