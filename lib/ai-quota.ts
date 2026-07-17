import { prisma } from "./prisma";

// Quota d'utilisation quotidien de l'IA : un compteur par (utilisateur, jour).
// Table filehub_ai_usage désormais DÉCLARÉE dans le schéma Prisma (AiUsage) —
// créée/gérée par `prisma db push` au build, plus aucun DDL à l'exécution.

/** Nombre d'utilisations de l'IA aujourd'hui pour cet utilisateur. */
export async function aiUsageToday(userId: string): Promise<number> {  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `SELECT count FROM filehub_ai_usage WHERE user_id = $1 AND day = CURRENT_DATE`,
    userId,
  );
  return rows[0] ? Number(rows[0].count) : 0;
}

/** Incrémente le compteur d'utilisation de l'IA du jour. */
export async function incrementAiUsage(userId: string): Promise<void> {  await prisma.$executeRawUnsafe(
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
export async function reserveAiUsage(userId: string, limit: number): Promise<boolean> {  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
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
export async function refundAiUsage(userId: string): Promise<void> {  await prisma.$executeRawUnsafe(
    `UPDATE filehub_ai_usage SET count = GREATEST(count - 1, 0)
       WHERE user_id = $1 AND day = CURRENT_DATE`,
    userId,
  );
}
