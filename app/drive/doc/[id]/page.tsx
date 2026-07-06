import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb, nodeBackHref, type NodeScope } from "@/lib/nodes";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";
import { DocEditor } from "@/components/doc-editor";

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const doc = await prisma.node.findFirst({
    where: { id, type: "doc", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true, parentId: true, spaceId: true },
  });
  if (!doc) notFound();

  const scope: NodeScope = doc.spaceId ? { spaceId: doc.spaceId } : { userId, spaceId: null };
  const crumbs = await getBreadcrumb(scope, doc.parentId);

  return (
    <DocEditor
      id={doc.id}
      initialName={doc.name}
      initialContent={doc.content ?? ""}
      backHref={nodeBackHref(doc.spaceId, doc.parentId)}
      crumbs={crumbs}
    />
  );
}
