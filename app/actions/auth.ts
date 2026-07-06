"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  setSession,
  clearSession,
} from "@/lib/auth";

const credsSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  name: z.string().trim().max(80).optional(),
});

export type AuthState = { error?: string } | undefined;

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Un compte existe déjà avec cet email." };

  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash: await hashPassword(password) },
  });
  await setSession(user.id);
  redirect("/drive");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email ou mot de passe incorrect." };
  }
  await setSession(user.id);
  redirect("/drive");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
