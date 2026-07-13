import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().max(80).optional(),
  username: z.string().trim().regex(/^[a-zA-Z0-9_-]{3,30}$/, "3 à 30 caractères (lettres, chiffres, _ ou -)").optional().or(z.literal("")),
});

// POST /api/account/profile — met à jour le nom et/ou l'identifiant public.
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  }

  const data: { name?: string | null; username?: string | null } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name || null;
  if (parsed.data.username !== undefined) data.username = parsed.data.username ? parsed.data.username : null;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { name: true, username: true, email: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Cet identifiant est déjà pris." }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible de mettre à jour le profil." }, { status: 500 });
  }
}
