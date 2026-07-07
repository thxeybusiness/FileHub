import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillingPlans } from "@/components/billing-plans";
import type { PlanId } from "@/lib/plans";

export default async function AbonnementPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planStatus: true, planRenewsAt: true, stripeSubscriptionId: true },
  });
  if (!user) redirect("/login");

  return (
    <Suspense fallback={null}>
      <BillingPlans
        currentPlan={(user.plan as PlanId) ?? "free"}
        planStatus={user.planStatus ?? null}
        renewsAt={user.planRenewsAt ? user.planRenewsAt.toISOString() : null}
        hasSubscription={Boolean(user.stripeSubscriptionId)}
      />
    </Suspense>
  );
}
