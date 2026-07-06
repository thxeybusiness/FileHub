import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/nodes";
import { ExcelBoardLazy } from "@/components/excel-board-lazy";

export default async function SheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const sheet = await prisma.node.findFirst({
    where: { id, userId, type: "sheet" },
    select: { id: true, name: true, content: true, parentId: true },
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

  const crumbs = await getBreadcrumb(userId, sheet.parentId);

  return (
    <ExcelBoardLazy
      sheetId={sheet.id}
      initialName={sheet.name}
      initialData={initialData}
      backHref={sheet.parentId ? `/drive/folder/${sheet.parentId}` : "/drive"}
      crumbs={crumbs}
    />
  );
}
