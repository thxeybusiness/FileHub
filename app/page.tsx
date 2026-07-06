import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { Landing } from "@/components/landing";

export default async function Home() {
  const uid = await getUserId();
  if (uid) redirect("/drive");
  return <Landing />;
}
