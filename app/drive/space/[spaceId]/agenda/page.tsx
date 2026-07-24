import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSpaceRole } from "@/lib/spaces";
import { AgendaView } from "@/components/agenda-view";

// Agenda commun d'un espace partagé : rendez-vous et tâches visibles par tous
// les membres de l'espace.
export default async function Page({ params }: { params: Promise<{ spaceId: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { spaceId } = await params;

  if (!(await getSpaceRole(userId, spaceId))) notFound();
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { name: true } });
  if (!space) notFound();

  return <AgendaView spaceId={spaceId} title={`Agenda · ${space.name}`} subtitle={`Rendez-vous et tâches partagés de ${space.name}`} shared backHref={`/drive/space/${spaceId}`} />;
}
