import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/nodes";
import { resolveCoachingAccess } from "@/lib/coaching-members";
import { ensureCoachingSpace } from "@/lib/coaching-space";
import { DriveExplorer } from "@/components/drive-explorer";
import { CoachingDriveBar } from "@/components/coaching-drive-bar";

export default async function Page({ params }: { params: Promise<{ id: string; folderId: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id, folderId } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) notFound();

  const spaceId = await ensureCoachingSpace(id, node.userId, node.name);
  const folder = await prisma.node.findFirst({
    where: { id: folderId, spaceId, type: "folder" },
    select: { id: true, name: true },
  });
  if (!folder) notFound();

  const breadcrumb = await getBreadcrumb({ spaceId }, folderId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CoachingDriveBar id={id} />
      <div className="flex-1 min-h-0">
        <DriveExplorer
          view="my"
          folderId={folderId}
          breadcrumb={breadcrumb}
          title={folder.name}
          spaceId={spaceId}
          basePath={`/drive/coaching/${id}`}
          nodeBase={`/drive/coaching/${id}/n`}
          variant="coaching"
        />
      </div>
    </div>
  );
}
