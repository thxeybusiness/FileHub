import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Hash bcrypt factice : comparé quand l'email n'existe pas, pour que le temps
// de réponse soit constant (pas d'oracle d'énumération d'emails par timing).
const DUMMY_HASH = "$2b$10$kKbUsop9h94GmYXDH02WMupNUMPxnYohCiP7nSfpPrjOUwJCVKuba";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (typeof body?.email === "string" ? body.email : "").trim().toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  // Limitation anti-force brute : par IP+email puis par IP (fenêtre 15 min).
  const ip = clientIp(req);
  const perAccount = await rateLimit(`login:${ip}:${email}`, 10, 15 * 60);
  const perIp = await rateLimit(`login-ip:${ip}`, 50, 15 * 60);
  if (!perAccount.ok || !perIp.ok) {
    const retry = Math.max(perAccount.retryAfter, perIp.retryAfter);
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  // Recherche insensible à la casse (comptes historiques en casse mixte).
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  // Toujours exécuter un bcrypt.compare (réel ou factice) → temps constant.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }
  await setSession(user.id);
  return NextResponse.json({ ok: true });
}
