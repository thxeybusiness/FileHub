import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { resolveCoachingAccess, canEditRole } from "@/lib/coaching-members";
import { ensureCoachingSpace } from "@/lib/coaching-space";
import { DriveExplorer } from "@/components/drive-explorer";
import { CoachingDriveBar } from "@/components/coaching-drive-bar";
import { CoachingDriveSummary } from "@/components/coaching-drive-summary";

// Résumé de suivi (nom, statut, progression, prochaine séance, actions) dérivé
// du contenu de la fiche du coaché.
function summarize(content: string | null, fallback: string) {
  const base = { name: fallback, status: "active", progress: 0, openActions: 0, nextSession: null as string | null };
  try {
    const c = JSON.parse(content || "{}") as Record<string, unknown>;
    const coachee = (c.coachee ?? {}) as Record<string, unknown>;
    if (typeof coachee.name === "string" && coachee.name.trim()) base.name = coachee.name.trim();
    if (typeof coachee.status === "string") base.status = coachee.status;

    const objectives = Array.isArray(c.objectives) ? (c.objectives as Record<string, unknown>[]) : [];
    base.progress = objectives.length
      ? Math.round(objectives.reduce((s, o) => s + (o.done ? 100 : Math.max(0, Math.min(100, Number(o.progress) || 0))), 0) / objectives.length)
      : 0;

    const actions = Array.isArray(c.actions) ? (c.actions as Record<string, unknown>[]) : [];
    base.openActions = actions.filter((a) => a.done !== true).length;

    const today = new Date().toISOString().slice(0, 10);
    const sessions = Array.isArray(c.sessions) ? (c.sessions as Record<string, unknown>[]) : [];
    for (const s of sessions) {
      const d = typeof s.date === "string" ? s.date : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today && (!base.nextSession || d < base.nextSession)) base.nextSession = d;
    }
  } catch {
    /* contenu illisible → valeurs par défaut */
  }
  return base;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) notFound();

  const s = summarize(node.content, node.name);
  const spaceId = await ensureCoachingSpace(id, node.userId, s.name);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CoachingDriveBar id={id} />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <DriveExplorer
            view="my"
            folderId={null}
            title={s.name}
            spaceId={spaceId}
            basePath={`/drive/coaching/${id}`}
            nodeBase={`/drive/coaching/${id}/n`}
            variant="coaching"
          />
        </div>
        <CoachingDriveSummary
          id={id}
          status={s.status}
          progress={s.progress}
          openActions={s.openActions}
          nextSession={s.nextSession}
          canEdit={canEditRole(role)}
        />
      </div>
    </div>
  );
}
