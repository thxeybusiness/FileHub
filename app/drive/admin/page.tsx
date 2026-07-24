import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFounder } from "@/lib/plans";
import { AdminPlans } from "@/components/admin-plans";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isFounder(user.email)) redirect("/drive");

  return <AdminPlans />;
}
