import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { effectivePlan } from "@/lib/plans";
import { SettingsPanel } from "@/components/settings-panel";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <SettingsPanel
      initialName={user.name ?? ""}
      initialUsername={user.username ?? ""}
      email={user.email}
      plan={effectivePlan(user.email, user.plan)}
    />
  );
}
