import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CoachingEditor } from "@/components/coaching-editor";
import { getCoachingRole, listCoachingMembers } from "@/lib/coaching-members";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const node = await prisma.node.findFirst({
    where: { id, type: "coaching", trashed: false },
    select: { id: true, name: true, content: true, userId: true },
  });
  if (!node) notFound();

  // Accès : propriétaire OU membre invité (rôle éditeur / lecteur).
  const isOwner = node.userId === userId;
  const role = isOwner ? "owner" : await getCoachingRole(id, userId);
  if (!role) notFound();

  const canEdit = role === "owner" || role === "editor";
  const members = await listCoachingMembers(id);
  const shared = members.length > 0;

  return (
    <CoachingEditor
      id={node.id}
      initialName={node.name}
      initialContent={node.content ?? ""}
      backHref="/drive/accompagnement"
      crumbs={[{ id: "accompagnement", name: "Accompagnement" }]}
      shared={shared}
      canEdit={canEdit}
    />
  );
}
