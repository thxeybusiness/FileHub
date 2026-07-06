import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";

export default async function Home() {
  const uid = await getUserId();
  redirect(uid ? "/drive" : "/login");
}
