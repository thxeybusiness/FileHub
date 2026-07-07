import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySharePassword, signUnlock, unlockCookieName } from "@/lib/share";

export const runtime = "nodejs";

// POST { password } — vérifie le mot de passe d'un lien protégé et pose un
// cookie de déverrouillage (signé, lié au mot de passe courant).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const share = await prisma.share.findUnique({ where: { token } });
  if (!share) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  if (!share.passwordHash) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!(await verifySharePassword(password, share.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const store = await cookies();
  store.set(unlockCookieName(token), signUnlock(token, share.passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 h
  });
  return NextResponse.json({ ok: true });
}
