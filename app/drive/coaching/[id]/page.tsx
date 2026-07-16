import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";
import { CoachingEditor } from "@/components/coaching-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const node = await prisma.node.findFirst({
    where: { id, type: "coaching", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true, parentId: true, spaceId: true },
  });
  if (!node) notFound();

  return (
    <CoachingEditor
      id={node.id}
      initialName={node.name}
      initialContent={node.content ?? ""}
      backHref="/drive/accompagnement"
      crumbs={[{ id: "accompagnement", name: "Accompagnement" }]}
      shared={node.spaceId != null}
    />
  );
}
