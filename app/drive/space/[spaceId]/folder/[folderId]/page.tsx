import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/nodes";
import { getSpaceRole } from "@/lib/spaces";
import { DriveExplorer } from "@/components/drive-explorer";

export default async function SpaceFolderPage({
  params,
}: {
  params: Promise<{ spaceId: string; folderId: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { spaceId, folderId } = await params;

  if (!(await getSpaceRole(userId, spaceId))) notFound();

  const [space, folder] = await Promise.all([
    prisma.space.findUnique({ where: { id: spaceId }, select: { name: true } }),
    prisma.node.findFirst({
      where: { id: folderId, spaceId, type: "folder" },
      select: { id: true, name: true },
    }),
  ]);
  if (!space || !folder) notFound();

  const breadcrumb = await getBreadcrumb({ spaceId }, folderId);

  return (
    <DriveExplorer
      view="my"
      folderId={folderId}
      breadcrumb={breadcrumb}
      title={folder.name}
      spaceId={spaceId}
      basePath={`/drive/space/${spaceId}`}
      spaceName={space.name}
    />
  );
}
