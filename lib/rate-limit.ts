import { prisma } from "./prisma";
import type { NextRequest } from "next/server";

// Limiteur de débit à fenêtre glissante. Chaque « bucket » (clé libre) compte
// les hits sur une fenêtre ; au-delà du plafond, la requête est refusée.
// Atomique (une seule requête INSERT ... ON CONFLICT), insensible aux courses.
// Table filehub_rate_limit désormais DÉCLARÉE dans le schéma Prisma (RateLimit).

export type RateResult = { ok: boolean; remaining: number; retryAfter: number };

/**
 * Incrémente le compteur du bucket et indique s'il dépasse le plafond.
 * @param bucket   clé unique (ex. `login:ip:email`)
 * @param max      nombre de hits autorisés par fenêtre
 * @param windowSec durée de la fenêtre en secondes
 */
export async function rateLimit(bucket: string, max: number, windowSec: number): Promise<RateResult> {
  try {    const rows = await prisma.$queryRawUnsafe<{ count: number; reset_at: Date }[]>(
      `INSERT INTO filehub_rate_limit (bucket, count, reset_at)
         VALUES ($1, 1, now() + ($2 || ' seconds')::interval)
       ON CONFLICT (bucket) DO UPDATE SET
         count = CASE WHEN filehub_rate_limit.reset_at < now() THEN 1
                      ELSE filehub_rate_limit.count + 1 END,
         reset_at = CASE WHEN filehub_rate_limit.reset_at < now()
                         THEN now() + ($2 || ' seconds')::interval
                         ELSE filehub_rate_limit.reset_at END
       RETURNING count, reset_at`,
      bucket,
      String(windowSec),
    );
    const row = rows[0];
    if (!row) return { ok: true, remaining: max, retryAfter: 0 };
    const count = Number(row.count);
    const retryAfter = Math.max(0, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000));
    return { ok: count <= max, remaining: Math.max(0, max - count), retryAfter };
  } catch {
    // En cas d'indisponibilité du limiteur, on n'empêche pas l'accès (fail-open)
    // : la sécurité applicative (bcrypt, autorisations) reste en place.
    return { ok: true, remaining: max, retryAfter: 0 };
  }
}

/** Adresse IP de l'appelant à partir des en-têtes de proxy (Vercel). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
