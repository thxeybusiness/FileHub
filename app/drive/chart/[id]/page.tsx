import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/nodes";
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

  const chart = await prisma.node.findFirst({
    where: { id, userId, type: "chart" },
    select: { id: true, name: true, content: true, parentId: true },
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

  const crumbs = await getBreadcrumb(userId, chart.parentId);

  return (
    <ChartEditor
      id={chart.id}
      initialName={chart.name}
      initialDoc={initialDoc}
      backHref={chart.parentId ? `/drive/folder/${chart.parentId}` : "/drive"}
      crumbs={crumbs}
    />
  );
}
