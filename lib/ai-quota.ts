import { prisma } from "./prisma";

// Quota d'utilisation quotidien de l'IA, sans migration de schéma : la table
// est provisionnée à la volée (CREATE TABLE IF NOT EXISTS) sur la base à
// laquelle l'application est connectée. Un compteur par (utilisateur, jour).
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS filehub_ai_usage (
       user_id text NOT NULL,
       day date NOT NULL,
       count integer NOT NULL DEFAULT 0,
       PRIMARY KEY (user_id, day)
     )`,
  );
  ensured = true;
}

/** Nombre d'utilisations de l'IA aujourd'hui pour cet utilisateur. */
export async function aiUsageToday(userId: string): Promise<number> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `SELECT count FROM filehub_ai_usage WHERE user_id = $1 AND day = CURRENT_DATE`,
    userId,
  );
  return rows[0] ? Number(rows[0].count) : 0;
}

/** Incrémente le compteur d'utilisation de l'IA du jour. */
export async function incrementAiUsage(userId: string): Promise<void> {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO filehub_ai_usage (user_id, day, count) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET count = filehub_ai_usage.count + 1`,
    userId,
  );
}

/**
 * Réserve atomiquement une utilisation IA AVANT l'appel au modèle : incrémente
 * le compteur uniquement s'il reste sous la limite. Renvoie `true` si la place
 * est accordée, `false` si le quota du jour est déjà atteint. Atomique — insensible
 * aux requêtes concurrentes (impossible de dépasser la limite en parallèle).
 */
export async function reserveAiUsage(userId: string, limit: number): Promise<boolean> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `INSERT INTO filehub_ai_usage (user_id, day, count) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET count = filehub_ai_usage.count + 1
       WHERE filehub_ai_usage.count < $2
     RETURNING count`,
    userId,
    limit,
  );
  return rows.length > 0;
}

/** Rembourse une utilisation réservée (ex. si l'appel au modèle a échoué). */
export async function refundAiUsage(userId: string): Promise<void> {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `UPDATE filehub_ai_usage SET count = GREATEST(count - 1, 0)
       WHERE user_id = $1 AND day = CURRENT_DATE`,
    userId,
  );
}
