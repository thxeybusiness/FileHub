import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  if (await getUserId()) redirect("/drive");
  return <AuthForm mode="login" />;
}
