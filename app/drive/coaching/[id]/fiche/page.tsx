import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { resolveCoachingAccess, canEditRole, listCoachingMembers } from "@/lib/coaching-members";
import { CoachingEditor } from "@/components/coaching-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) notFound();

  const shared = role !== "owner" || (await listCoachingMembers(id)).length > 0;

  return (
    <CoachingEditor
      id={node.id}
      initialName={node.name}
      initialContent={node.content ?? ""}
      backHref={`/drive/coaching/${id}`}
      crumbs={[{ id: "ws", name: "Espace du coaché" }]}
      shared={shared}
      canEdit={canEditRole(role)}
    />
  );
}
