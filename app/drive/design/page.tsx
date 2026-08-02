import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { DesignHome } from "@/components/design-home";

// Accueil de l'application « Design » : galerie des créations + démarrage rapide.
export default async function Page() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return <DesignHome />;
}
