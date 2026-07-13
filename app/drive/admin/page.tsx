import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFounder } from "@/lib/plans";
import { AdminGrades } from "@/components/admin-grades";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; plan?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isFounder(user.email)) redirect("/drive");

  const sp = await searchParams;
  return <AdminGrades initialEmail={sp.email ?? ""} initialPlan={sp.plan ?? "business"} />;
}
