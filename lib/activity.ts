import { prisma } from "./prisma";

export type ActivityAction =
  | "created"
  | "renamed"
  | "trashed"
  | "restored"
  | "deleted"
  | "uploaded"
  | "shared"
  | "unshared"
  | "moved"
  | "member_added"
  | "member_removed"
  | "role_changed";

export type ActivityInput = {
  userId: string;
  actorName: string;
  action: ActivityAction;
  targetName: string;
  spaceId?: string | null;
  nodeId?: string | null;
};

/**
 * Enregistre une entrée du journal d'activité. Volontairement « best-effort » :
 * une action métier ne doit jamais échouer parce que le journal a un souci, donc
 * on avale les erreurs.
 */
export async function logActivity(a: ActivityInput) {
  try {
    await prisma.activity.create({
      data: {
        userId: a.userId,
        actorName: a.actorName,
        action: a.action,
        targetName: a.targetName,
        spaceId: a.spaceId ?? null,
        nodeId: a.nodeId ?? null,
      },
    });
  } catch {
    // journal non bloquant
  }
}

/** Récupère le nom affichable d'un utilisateur pour l'instantané du journal. */
export async function actorNameFor(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, email: true },
  });
  if (!u) return "Quelqu'un";
  return u.name || (u.username ? `@${u.username}` : u.email.split("@")[0]);
}
