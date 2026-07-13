import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { effectivePlan, hasAiAccess } from "@/lib/plans";
import { DriveAssistant } from "@/components/drive-assistant";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // L'assistant IA n'est accessible qu'aux grades qui y ont droit (Pro, Fondateur).
  if (!hasAiAccess(effectivePlan(user.email, user.plan))) redirect("/drive");
  return <DriveAssistant />;
}
