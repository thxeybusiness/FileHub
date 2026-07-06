import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb, nodeBackHref, type NodeScope } from "@/lib/nodes";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";
import { ChartEditor } from "@/components/chart-editor";
import type { ChartDoc } from "@/lib/chart-palette";

export default async function ChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const chart = await prisma.node.findFirst({
    where: { id, type: "chart", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true, parentId: true, spaceId: true },
  });
  if (!chart) notFound();

  let initialDoc: ChartDoc | null = null;
  if (chart.content) {
    try {
      initialDoc = JSON.parse(chart.content) as ChartDoc;
    } catch {
      initialDoc = null;
    }
  }

  const scope: NodeScope = chart.spaceId ? { spaceId: chart.spaceId } : { userId, spaceId: null };
  const crumbs = await getBreadcrumb(scope, chart.parentId);

  return (
    <ChartEditor
      id={chart.id}
      initialName={chart.name}
      initialDoc={initialDoc}
      backHref={nodeBackHref(chart.spaceId, chart.parentId)}
      crumbs={crumbs}
    />
  );
}
