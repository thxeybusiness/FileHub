import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/nodes";
import { DriveExplorer } from "@/components/drive-explorer";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const folder = await prisma.node.findFirst({
    where: { id, userId, type: "folder" },
    select: { id: true, name: true },
  });
  if (!folder) notFound();

  const breadcrumb = await getBreadcrumb(userId, id);

  return (
    <DriveExplorer view="my" folderId={id} breadcrumb={breadcrumb} title={folder.name} />
  );
}
