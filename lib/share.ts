import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { getAuthSecret } from "./env";

const SECRET = getAuthSecret();

export async function hashSharePassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifySharePassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/** Nom du cookie qui atteste qu'un lien protégé a été déverrouillé. */
export function unlockCookieName(token: string): string {
  return `sh_${token}`;
}

/** Signature de déverrouillage : dépend du mot de passe courant, donc le
 * changer invalide les anciens cookies. */
export function signUnlock(token: string, passwordHash: string): string {
  return createHmac("sha256", SECRET)
    .update(`share-unlock:${token}:${passwordHash}`)
    .digest("base64url");
}

export function isUnlocked(
  cookieVal: string | undefined,
  token: string,
  passwordHash: string,
): boolean {
  if (!cookieVal) return false;
  return cookieVal === signUnlock(token, passwordHash);
}
