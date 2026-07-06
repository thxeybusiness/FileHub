import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb, nodeBackHref, type NodeScope } from "@/lib/nodes";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";
import { DrawEditor, type DrawDoc } from "@/components/draw-editor";

export default async function DrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const draw = await prisma.node.findFirst({
    where: { id, type: "draw", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true, parentId: true, spaceId: true },
  });
  if (!draw) notFound();

  let initialDoc: DrawDoc | null = null;
  if (draw.content) {
    try {
      initialDoc = JSON.parse(draw.content) as DrawDoc;
    } catch {
      initialDoc = null;
    }
  }

  const scope: NodeScope = draw.spaceId ? { spaceId: draw.spaceId } : { userId, spaceId: null };
  const crumbs = await getBreadcrumb(scope, draw.parentId);

  return (
    <DrawEditor
      id={draw.id}
      initialName={draw.name}
      initialDoc={initialDoc}
      backHref={nodeBackHref(draw.spaceId, draw.parentId)}
      crumbs={crumbs}
    />
  );
}
