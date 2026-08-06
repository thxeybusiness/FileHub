import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFounder } from "@/lib/plans";
import { DesignCreations } from "@/components/design-creations";

// Inventaire des créations Design, séparé de l'accueil (formats et modèles).
// ACCÈS PRIVÉ : l'application est réservée aux comptes Fondateur pour l'instant.
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isFounder(user.email)) redirect("/drive");
  return <DesignCreations />;
}
