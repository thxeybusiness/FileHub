import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSession } from "@/lib/auth";
import { generateUsername } from "@/lib/spaces";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  name: z.string().trim().max(80).optional(),
});

export async function POST(req: NextRequest) {
  // Anti-abus : limite les créations de compte par IP (fenêtre 1 h).
  const rl = await rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de créations de compte. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }
  const { password, name } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email." },
      { status: 409 },
    );
  }

  const username = await generateUsername(name || email.split("@")[0]);
  const user = await prisma.user.create({
    data: { email, username, name: name || null, passwordHash: await hashPassword(password) },
  });
  await setSession(user.id);
  return NextResponse.json({ ok: true });
}
