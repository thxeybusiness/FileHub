import { prisma } from "./prisma";
import { isFounder } from "./plans";

/** Vrai si l'utilisateur (par id) est un compte Fondateur. */
export async function callerIsFounder(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return isFounder(u?.email);
}
