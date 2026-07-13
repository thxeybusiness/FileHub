import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillingPlans } from "@/components/billing-plans";
import { isFounder } from "@/lib/plans";

export default async function AbonnementPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, plan: true, planStatus: true, planRenewsAt: true, stripeSubscriptionId: true },
  });
  if (!user) redirect("/login");

  return (
    <Suspense fallback={null}>
      <BillingPlans
        currentPlan={user.plan ?? "free"}
        planStatus={user.planStatus ?? null}
        renewsAt={user.planRenewsAt ? user.planRenewsAt.toISOString() : null}
        hasSubscription={Boolean(user.stripeSubscriptionId)}
        founder={isFounder(user.email)}
      />
    </Suspense>
  );
}
