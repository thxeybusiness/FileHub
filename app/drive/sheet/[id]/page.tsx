import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb, nodeBackHref, type NodeScope } from "@/lib/nodes";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";
import { ExcelBoardLazy } from "@/components/excel-board-lazy";

export default async function SheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const sheet = await prisma.node.findFirst({
    where: { id, type: "sheet", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true, parentId: true, spaceId: true },
  });
  if (!sheet) notFound();

  let initialData: unknown = null;
  if (sheet.content) {
    try {
      initialData = JSON.parse(sheet.content);
    } catch {
      initialData = null;
    }
  }

  const scope: NodeScope = sheet.spaceId ? { spaceId: sheet.spaceId } : { userId, spaceId: null };
  const crumbs = await getBreadcrumb(scope, sheet.parentId);

  return (
    <ExcelBoardLazy
      sheetId={sheet.id}
      initialName={sheet.name}
      initialData={initialData}
      backHref={nodeBackHref(sheet.spaceId, sheet.parentId)}
      crumbs={crumbs}
    />
  );
}
