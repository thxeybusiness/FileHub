import { randomUUID } from "crypto";
import { prisma } from "./prisma";

// Historique de versions des documents (contenu texte/JSON de node.content).
// Snapshots limités dans le temps (throttle) et en nombre (30 par document).
// Table filehub_doc_version désormais DÉCLARÉE dans le schéma Prisma (DocVersion).

const KEEP = 30; // versions conservées par document
const THROTTLE_SECONDS = 90; // pas plus d'un snapshot par 90 s et par document

/** Enregistre une version si aucune n'a été prise récemment ; élague les anciennes. */
export async function snapshotVersion(nodeId: string, authorName: string | null, content: string): Promise<void> {
  try {
    const recent = await prisma.$queryRawUnsafe<{ one: number }[]>(
      `SELECT 1 as one FROM filehub_doc_version WHERE node_id = $1 AND created_at > now() - ($2 || ' seconds')::interval LIMIT 1`,
      nodeId,
      String(THROTTLE_SECONDS),
    );
    if (recent.length) return;
    await prisma.$executeRawUnsafe(
      `INSERT INTO filehub_doc_version (id, node_id, author_name, content, size) VALUES ($1, $2, $3, $4, $5)`,
      randomUUID(),
      nodeId,
      authorName,
      content,
      Buffer.byteLength(content, "utf8"),
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM filehub_doc_version WHERE node_id = $1 AND id NOT IN (
         SELECT id FROM filehub_doc_version WHERE node_id = $1 ORDER BY created_at DESC LIMIT $2
       )`,
      nodeId,
      KEEP,
    );
  } catch {
    /* best-effort : l'historique ne doit jamais bloquer l'enregistrement */
  }
}

export type VersionMeta = { id: string; authorName: string | null; size: number; createdAt: string };

/** Liste les versions d'un document (plus récentes d'abord). */
export async function listVersions(nodeId: string): Promise<VersionMeta[]> {
  const rows = await prisma.$queryRawUnsafe<{ id: string; author_name: string | null; size: number; created_at: Date }[]>(
    `SELECT id, author_name, size, created_at FROM filehub_doc_version WHERE node_id = $1 ORDER BY created_at DESC LIMIT 50`,
    nodeId,
  );
  return rows.map((r) => ({ id: r.id, authorName: r.author_name, size: Number(r.size), createdAt: new Date(r.created_at).toISOString() }));
}

/** Renvoie le contenu d'une version précise (ou null). */
export async function getVersionContent(nodeId: string, versionId: string): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<{ content: string | null }[]>(
    `SELECT content FROM filehub_doc_version WHERE node_id = $1 AND id = $2 LIMIT 1`,
    nodeId,
    versionId,
  );
  return rows[0]?.content ?? null;
}
