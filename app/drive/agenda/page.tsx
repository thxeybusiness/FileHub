import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { AgendaView } from "@/components/agenda-view";

// Agenda personnel FileHub (« Général ») : rendez-vous et tâches propres à
// l'utilisateur, indépendants des coachés et des espaces communs.
export default async function Page() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  return <AgendaView title="Agenda" subtitle="Vos rendez-vous et tâches personnels" />;
}
