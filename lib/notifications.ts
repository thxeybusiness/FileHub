import { prisma } from "./prisma";

export type NotifInput = {
  type: string;
  title: string;
  body?: string;
  spaceId?: string;
  actorName?: string;
};

export async function notify(userId: string, n: NotifInput) {
  await prisma.notification.create({ data: { userId, ...n } });
}

export async function notifyMany(userIds: string[], n: NotifInput) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, ...n })),
  });
}

/** Nom affichable d'un utilisateur (nom, sinon @username, sinon email). */
export function displayName(u: { name: string | null; username: string | null; email: string }) {
  return u.name || (u.username ? `@${u.username}` : u.email.split("@")[0]);
}
