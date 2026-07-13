import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFounder } from "@/lib/plans";
import { DriveAssistant } from "@/components/drive-assistant";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // L'assistant IA est réservé au compte Fondateur.
  if (!isFounder(user.email)) redirect("/drive");
  return <DriveAssistant />;
}
