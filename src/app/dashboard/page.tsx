import { redirect } from "next/navigation";
import { requireAnyMemberPage } from "@/lib/auth-utils";

export default async function DashboardPage() {
  const { member } = await requireAnyMemberPage();

  if (member.role === "owner" || member.role === "admin") {
    redirect("/dashboard/students");
  }

  redirect("/dashboard/assessments");
}
