import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getAuthSecret } from "./env";

const COOKIE = "filehub_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SECRET = getAuthSecret();

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", SECRET).update(payload).digest());
}

/** Create a signed, tamper-proof session token for a user id. */
export function createToken(userId: string): string {
  const body = b64url(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 }));
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64").toString());
    if (typeof data.uid !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function setSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Returns the logged-in user id, or null. */
export async function getUserId(): Promise<string | null> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}

/** Returns the logged-in user record, or null. */
export async function getCurrentUser() {
  const uid = await getUserId();
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function randomToken(bytes = 16): string {
  return b64url(randomBytes(bytes));
}
