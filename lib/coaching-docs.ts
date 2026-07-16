import { randomUUID } from "crypto";
import { prisma } from "./prisma";

// Documents d'un coaché (drive dédié de l'espace Coaching), sans migration :
// table provisionnée à la volée. Un document = titre + contenu Markdown, rangé
// dans une rubrique (category), rattaché à un suivi (coaching node).
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS filehub_coaching_doc (
       id text PRIMARY KEY,
       coaching_id text NOT NULL,
       category text NOT NULL DEFAULT 'documents',
       title text NOT NULL DEFAULT '',
       content text NOT NULL DEFAULT '',
       author_id text,
       created_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS filehub_coaching_doc_coaching_idx ON filehub_coaching_doc (coaching_id, updated_at)`,
  );
  ensured = true;
}

// Rubriques autorisées (repli sur « documents » si inconnue).
export const COACHING_CATEGORIES = ["seances", "ressources", "documents", "admin"] as const;
export type CoachingCategory = (typeof COACHING_CATEGORIES)[number];
export function normCategory(c: string | undefined): CoachingCategory {
  return (COACHING_CATEGORIES as readonly string[]).includes(c ?? "") ? (c as CoachingCategory) : "documents";
}

export type CoachingDocMeta = {
  id: string;
  category: CoachingCategory;
  title: string;
  updatedAt: string;
};
export type CoachingDoc = CoachingDocMeta & { content: string };

export async function listCoachingDocs(coachingId: string): Promise<CoachingDocMeta[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<
    { id: string; category: string; title: string; updated_at: Date }[]
  >(
    `SELECT id, category, title, updated_at FROM filehub_coaching_doc WHERE coaching_id = $1 ORDER BY updated_at DESC LIMIT 500`,
    coachingId,
  );
  return rows.map((r) => ({
    id: r.id,
    category: normCategory(r.category),
    title: r.title,
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function getCoachingDoc(coachingId: string, docId: string): Promise<CoachingDoc | null> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<
    { id: string; category: string; title: string; content: string; updated_at: Date }[]
  >(
    `SELECT id, category, title, content, updated_at FROM filehub_coaching_doc WHERE id = $1 AND coaching_id = $2 LIMIT 1`,
    docId,
    coachingId,
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    category: normCategory(r.category),
    title: r.title,
    content: r.content,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function createCoachingDoc(
  coachingId: string,
  authorId: string,
  category: string,
  title: string,
): Promise<CoachingDoc> {
  await ensureTable();
  const id = randomUUID();
  const cat = normCategory(category);
  const rows = await prisma.$queryRawUnsafe<{ updated_at: Date }[]>(
    `INSERT INTO filehub_coaching_doc (id, coaching_id, category, title, content, author_id)
       VALUES ($1, $2, $3, $4, '', $5) RETURNING updated_at`,
    id,
    coachingId,
    cat,
    title,
    authorId,
  );
  return { id, category: cat, title, content: "", updatedAt: new Date(rows[0].updated_at).toISOString() };
}

export async function updateCoachingDoc(
  coachingId: string,
  docId: string,
  patch: { title?: string; content?: string; category?: string },
): Promise<string | null> {
  await ensureTable();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (patch.title !== undefined) { sets.push(`title = $${i++}`); vals.push(patch.title); }
  if (patch.content !== undefined) { sets.push(`content = $${i++}`); vals.push(patch.content); }
  if (patch.category !== undefined) { sets.push(`category = $${i++}`); vals.push(normCategory(patch.category)); }
  if (!sets.length) return null;
  sets.push(`updated_at = now()`);
  vals.push(docId, coachingId);
  const rows = await prisma.$queryRawUnsafe<{ updated_at: Date }[]>(
    `UPDATE filehub_coaching_doc SET ${sets.join(", ")} WHERE id = $${i++} AND coaching_id = $${i} RETURNING updated_at`,
    ...vals,
  );
  return rows.length ? new Date(rows[0].updated_at).toISOString() : null;
}

export async function deleteCoachingDoc(coachingId: string, docId: string): Promise<boolean> {
  await ensureTable();
  const n = await prisma.$executeRawUnsafe(
    `DELETE FROM filehub_coaching_doc WHERE id = $1 AND coaching_id = $2`,
    docId,
    coachingId,
  );
  return Number(n) > 0;
}
