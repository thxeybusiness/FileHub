import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSpaceRole } from "@/lib/spaces";
import { DriveExplorer } from "@/components/drive-explorer";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { spaceId } = await params;

  if (!(await getSpaceRole(userId, spaceId))) notFound();
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { name: true },
  });
  if (!space) notFound();

  return (
    <DriveExplorer
      view="my"
      folderId={null}
      title={space.name}
      spaceId={spaceId}
      basePath={`/drive/space/${spaceId}`}
      spaceName={space.name}
    />
  );
}
