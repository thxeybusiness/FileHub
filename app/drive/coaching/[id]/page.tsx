import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { resolveCoachingAccess } from "@/lib/coaching-members";
import { ensureCoachingSpace } from "@/lib/coaching-space";
import { DriveExplorer } from "@/components/drive-explorer";
import { CoachingDriveBar } from "@/components/coaching-drive-bar";

function coacheeName(content: string | null, fallback: string): string {
  try {
    const c = JSON.parse(content || "{}") as { coachee?: { name?: unknown } };
    const n = c.coachee?.name;
    return typeof n === "string" && n.trim() ? n : fallback;
  } catch {
    return fallback;
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) notFound();

  const name = coacheeName(node.content, node.name);
  const spaceId = await ensureCoachingSpace(id, node.userId, name);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CoachingDriveBar id={id} />
      <div className="flex-1 min-h-0">
        <DriveExplorer
          view="my"
          folderId={null}
          title={name}
          spaceId={spaceId}
          basePath={`/drive/coaching/${id}`}
          nodeBase={`/drive/coaching/${id}/n`}
          variant="coaching"
        />
      </div>
    </div>
  );
}
