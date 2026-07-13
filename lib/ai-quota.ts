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
