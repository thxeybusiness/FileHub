import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb, nodeBackHref, type NodeScope } from "@/lib/nodes";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";
import { SlidesEditor } from "@/components/slides-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const node = await prisma.node.findFirst({
    where: { id, type: "slides", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true, parentId: true, spaceId: true },
  });
  if (!node) notFound();

  const scope: NodeScope = node.spaceId ? { spaceId: node.spaceId } : { userId, spaceId: null };
  const crumbs = await getBreadcrumb(scope, node.parentId);

  return (
    <SlidesEditor
      id={node.id}
      initialName={node.name}
      initialContent={node.content ?? ""}
      backHref={nodeBackHref(node.spaceId, node.parentId)}
      crumbs={crumbs}
      shared={node.spaceId != null}
    />
  );
}
