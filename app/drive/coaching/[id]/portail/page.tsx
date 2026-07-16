import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCoachingAccess } from "@/lib/coaching-members";
import { getCoachingSpaceId } from "@/lib/coaching-space";
import { CoachingPortal, type PortalObjective, type PortalAction, type PortalResource } from "@/components/coaching-portal";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node || !role) notFound();

  // Objectifs & actions depuis le contenu du suivi.
  let objectives: PortalObjective[] = [];
  let actions: PortalAction[] = [];
  let coacheeName = node.name;
  try {
    const c = JSON.parse(node.content || "{}") as Record<string, unknown>;
    const coachee = (c.coachee ?? {}) as Record<string, unknown>;
    if (typeof coachee.name === "string" && coachee.name.trim()) coacheeName = coachee.name.trim();
    if (Array.isArray(c.objectives)) {
      objectives = (c.objectives as Record<string, unknown>[]).map((o) => ({
        id: String(o.id ?? Math.random()),
        title: typeof o.title === "string" ? o.title : "Objectif",
        progress: o.done ? 100 : Math.max(0, Math.min(100, Math.round(Number(o.progress) || 0))),
        done: o.done === true,
      }));
    }
    if (Array.isArray(c.actions)) {
      actions = (c.actions as Record<string, unknown>[]).map((a) => ({
        id: String(a.id ?? Math.random()),
        text: typeof a.text === "string" ? a.text : "Action",
        due: typeof a.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.due) ? a.due : null,
        done: a.done === true,
      }));
    }
  } catch {
    /* contenu illisible → sections vides */
  }

  // Ressources : dossiers et fichiers à la racine du drive (hors comptes-rendus).
  let resources: PortalResource[] = [];
  const spaceId = await getCoachingSpaceId(id);
  if (spaceId) {
    const roots = await prisma.node
      .findMany({
        where: { spaceId, parentId: null, trashed: false, type: { notIn: ["seance"] } },
        select: { id: true, name: true, type: true },
        orderBy: [{ type: "asc" }, { name: "asc" }],
        take: 30,
      })
      .catch(() => [] as { id: string; name: string; type: string }[]);
    resources = roots.map((r) => ({ id: r.id, name: r.name, type: r.type }));
  }

  return (
    <CoachingPortal
      id={id}
      coacheeName={coacheeName}
      canEdit={role !== "viewer"}
      objectives={objectives}
      actions={actions}
      resources={resources}
    />
  );
}
