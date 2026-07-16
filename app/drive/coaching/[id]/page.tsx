import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { resolveCoachingAccess, canEditRole } from "@/lib/coaching-members";
import { CoachingWorkspace } from "@/components/coaching-workspace";

function parseCoachee(content: string | null): { name: string; status: string } {
  try {
    const c = JSON.parse(content || "{}") as { coachee?: { name?: unknown; status?: unknown } };
    const co = c.coachee ?? {};
    return {
      name: typeof co.name === "string" ? co.name : "",
      status: typeof co.status === "string" ? co.status : "active",
    };
  } catch {
    return { name: "", status: "active" };
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) notFound();

  const { name, status } = parseCoachee(node.content);
  return (
    <CoachingWorkspace
      id={id}
      coacheeName={name}
      coachingName={node.name}
      status={status}
      canEdit={canEditRole(role)}
    />
  );
}
