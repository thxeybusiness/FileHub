import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { resolveCoachingAccess, canEditRole } from "@/lib/coaching-members";
import { getCoachingDoc } from "@/lib/coaching-docs";
import { CoachingDocEditor } from "@/components/coaching-doc-editor";

export default async function Page({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id, docId } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) notFound();

  const doc = await getCoachingDoc(id, docId);
  if (!doc) notFound();

  return (
    <CoachingDocEditor
      coachingId={id}
      docId={doc.id}
      initialTitle={doc.title}
      initialContent={doc.content}
      category={doc.category}
      backHref={`/drive/coaching/${id}`}
      canEdit={canEditRole(role)}
    />
  );
}
