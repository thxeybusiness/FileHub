import { randomUUID } from "crypto";
import { prisma } from "./prisma";

// Commentaires sur les documents : auteur + texte, rattachés à un node.
// Table filehub_comment désormais DÉCLARÉE dans le schéma Prisma (DocComment).

export type Comment = { id: string; authorId: string; authorName: string | null; body: string; createdAt: string };

export async function addComment(nodeId: string, authorId: string, authorName: string | null, body: string): Promise<Comment> {  const id = randomUUID();
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

export async function listComments(nodeId: string): Promise<Comment[]> {  const rows = await prisma.$queryRawUnsafe<{ id: string; author_id: string; author_name: string | null; body: string; created_at: Date }[]>(
    `SELECT id, author_id, author_name, body, created_at FROM filehub_comment WHERE node_id = $1 ORDER BY created_at ASC LIMIT 200`,
    nodeId,
  );
  return rows.map((r) => ({ id: r.id, authorId: r.author_id, authorName: r.author_name, body: r.body, createdAt: new Date(r.created_at).toISOString() }));
}

/** Supprime un commentaire (uniquement par son auteur). Renvoie true si supprimé. */
export async function deleteComment(nodeId: string, commentId: string, authorId: string): Promise<boolean> {  const n = await prisma.$executeRawUnsafe(
    `DELETE FROM filehub_comment WHERE id = $1 AND node_id = $2 AND author_id = $3`,
    commentId,
    nodeId,
    authorId,
  );
  return Number(n) > 0;
}
