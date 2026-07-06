import { createHash } from "node:crypto";

// Public URL of the app, mirroring RoadMapXey: NEXT_PUBLIC_URL, else the Vercel
// production domain, else localhost.
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

// Session secret: AUTH_SECRET if set (recommended), otherwise a stable secret
// derived from DATABASE_URL — never committed, unique per environment, with
// enough entropy (random DB password). If DB credentials change, sessions are
// simply invalidated. Same strategy as RoadMapXey.
export function getAuthSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.DATABASE_URL) {
    return createHash("sha256")
      .update(`filehub-auth:${process.env.DATABASE_URL}`)
      .digest("base64");
  }
  return "insecure-dev-secret-set-AUTH_SECRET-or-DATABASE_URL";
}
