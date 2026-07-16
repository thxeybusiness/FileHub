import { randomUUID } from "crypto";
import { prisma } from "./prisma";

// Membres d'un suivi de coaché (extension « Accompagnement »), sans migration :
// table provisionnée à la volée. Un membre = un utilisateur invité sur un node
// de type « coaching », avec un rôle (editor | viewer). Le propriétaire du node
// (node.userId) est implicitement « owner » et n'est pas stocké ici.
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS filehub_coaching_member (
       id text PRIMARY KEY,
       node_id text NOT NULL,
       user_id text NOT NULL,
       role text NOT NULL DEFAULT 'editor',
       created_at timestamptz NOT NULL DEFAULT now(),
       UNIQUE (node_id, user_id)
     )`,
  );
  // Index indépendants → en parallèle (moins d'allers-retours à froid).
  await Promise.all([
    prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS filehub_coaching_member_user_idx ON filehub_coaching_member (user_id)`,
    ).catch(() => {}),
    prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS filehub_coaching_member_node_idx ON filehub_coaching_member (node_id)`,
    ).catch(() => {}),
  ]);
  ensured = true;
}

export type CoachingRole = "editor" | "viewer";
const normRole = (r: string | undefined): CoachingRole => (r === "viewer" ? "viewer" : "editor");

/** Ids des suivis de coaché dont l'utilisateur est membre invité. */
export async function listMemberCoachingIds(userId: string): Promise<string[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ node_id: string }[]>(
    `SELECT node_id FROM filehub_coaching_member WHERE user_id = $1`,
    userId,
  );
  return rows.map((r) => r.node_id);
}

/** Rôle de l'utilisateur sur un suivi (invité), ou null s'il n'est pas membre. */
export async function getCoachingRole(nodeId: string, userId: string): Promise<CoachingRole | null> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ role: string }[]>(
    `SELECT role FROM filehub_coaching_member WHERE node_id = $1 AND user_id = $2 LIMIT 1`,
    nodeId,
    userId,
  );
  if (!rows.length) return null;
  return normRole(rows[0].role);
}

/** Liste des membres invités d'un suivi (hors propriétaire). */
export async function listCoachingMembers(nodeId: string): Promise<{ userId: string; role: CoachingRole }[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ user_id: string; role: string }[]>(
    `SELECT user_id, role FROM filehub_coaching_member WHERE node_id = $1 ORDER BY created_at ASC`,
    nodeId,
  );
  return rows.map((r) => ({ userId: r.user_id, role: normRole(r.role) }));
}

export async function addCoachingMember(nodeId: string, userId: string, role: CoachingRole): Promise<void> {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO filehub_coaching_member (id, node_id, user_id, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (node_id, user_id) DO NOTHING`,
    randomUUID(),
    nodeId,
    userId,
    role,
  );
}

export async function setCoachingMemberRole(nodeId: string, userId: string, role: CoachingRole): Promise<void> {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `UPDATE filehub_coaching_member SET role = $3 WHERE node_id = $1 AND user_id = $2`,
    nodeId,
    userId,
    role,
  );
}

export async function removeCoachingMember(nodeId: string, userId: string): Promise<void> {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `DELETE FROM filehub_coaching_member WHERE node_id = $1 AND user_id = $2`,
    nodeId,
    userId,
  );
}

/** Supprime tous les membres d'un suivi (quand le suivi est supprimé). */
export async function clearCoachingMembers(nodeId: string): Promise<void> {
  await ensureTable();
  await prisma.$executeRawUnsafe(`DELETE FROM filehub_coaching_member WHERE node_id = $1`, nodeId);
}

export type CoachingAccessRole = "owner" | "editor" | "viewer";
export type CoachingNode = { id: string; name: string; content: string | null; userId: string };

/**
 * Résout l'accès d'un utilisateur à un suivi de coaché : renvoie le node et le
 * rôle effectif (owner = propriétaire, sinon rôle de membre invité), ou null si
 * aucun accès. Utilisé par la fiche, le drive du coaché et ses documents.
 */
export async function resolveCoachingAccess(
  userId: string,
  coachingId: string,
): Promise<{ node: CoachingNode | null; role: CoachingAccessRole | null }> {
  const node = await prisma.node.findFirst({
    where: { id: coachingId, type: "coaching", trashed: false },
    select: { id: true, name: true, content: true, userId: true },
  });
  if (!node) return { node: null, role: null };
  const role: CoachingAccessRole | null =
    node.userId === userId ? "owner" : await getCoachingRole(coachingId, userId);
  return { node, role };
}

export function canEditRole(role: CoachingAccessRole | null): boolean {
  return role === "owner" || role === "editor";
}
