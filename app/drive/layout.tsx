import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { AuroraBackground } from "@/components/aurora-bg";
import { CalculatorWidget } from "@/components/calculator-widget";
import { effectivePlan, isFounder, planStorage, FOUNDER_STORAGE } from "@/lib/plans";

export default async function DriveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#07070c] text-white">
      <AuroraBackground />
      <Sidebar
        initial={{
          name: user.name,
          email: user.email,
          storageUsed: Number(user.storageUsed),
          storageLimit: isFounder(user.email) ? FOUNDER_STORAGE : planStorage(user.plan),
          plan: effectivePlan(user.email, user.plan),
        }}
      />
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">{children}</div>
      <CalculatorWidget />
    </div>
  );
}
