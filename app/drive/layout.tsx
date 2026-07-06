import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DriveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        initial={{
          name: user.name,
          email: user.email,
          storageUsed: Number(user.storageUsed),
          storageLimit: Number(user.storageLimit),
        }}
      />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
