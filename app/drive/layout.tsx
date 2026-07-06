import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { AuroraBackground } from "@/components/aurora-bg";

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
          storageLimit: Number(user.storageLimit),
        }}
      />
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
