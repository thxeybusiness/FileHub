import { randomUUID } from "crypto";
import { prisma } from "./prisma";

// Commentaires sur les documents, sans migration : table provisionnée à la
// volée. Un commentaire = auteur + texte, rattaché à un node.
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS filehub_comment (
       id text PRIMARY KEY,
       node_id text NOT NULL,
       author_id text NOT NULL,
       author_name text,
       body text NOT NULL,
       created_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS filehub_comment_node_idx ON filehub_comment (node_id, created_at)`,
  );
  ensured = true;
}

export type Comment = { id: string; authorId: string; authorName: string | null; body: string; createdAt: string };

export async function addComment(nodeId: string, authorId: string, authorName: string | null, body: string): Promise<Comment> {
  await ensureTable();
  const id = randomUUID();
  const rows = await prisma.$queryRawUnsafe<{ created_at: Date }[]>(
    `INSERT INTO filehub_comment (id, node_id, author_id, author_name, body) VALUES ($1, $2, $3, $4, $5) RETURNING created_at`,
    id,
    nodeId,
    authorId,
    authorName,
    body,
  );
  return { id, authorId, authorName, body, createdAt: new Date(rows[0].created_at).toISOString() };
}

export async function listComments(nodeId: string): Promise<Comment[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ id: string; author_id: string; author_name: string | null; body: string; created_at: Date }[]>(
    `SELECT id, author_id, author_name, body, created_at FROM filehub_comment WHERE node_id = $1 ORDER BY created_at ASC LIMIT 200`,
    nodeId,
  );
  return rows.map((r) => ({ id: r.id, authorId: r.author_id, authorName: r.author_name, body: r.body, createdAt: new Date(r.created_at).toISOString() }));
}

/** Supprime un commentaire (uniquement par son auteur). Renvoie true si supprimé. */
export async function deleteComment(nodeId: string, commentId: string, authorId: string): Promise<boolean> {
  await ensureTable();
  const n = await prisma.$executeRawUnsafe(
    `DELETE FROM filehub_comment WHERE id = $1 AND node_id = $2 AND author_id = $3`,
    commentId,
    nodeId,
    authorId,
  );
  return Number(n) > 0;
}
