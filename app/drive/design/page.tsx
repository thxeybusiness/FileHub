import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFounder } from "@/lib/plans";
import { DesignHome } from "@/components/design-home";

// Accueil de l'application « Design » : galerie des créations + démarrage rapide.
// ACCÈS PRIVÉ : l'application est réservée aux comptes Fondateur pour l'instant.
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isFounder(user.email)) redirect("/drive");
  return <DesignHome />;
}
