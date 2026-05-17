import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffOrAdminOrOwnerPage } from "@/lib/auth-utils";
import { AssessmentForm } from "@/components/assessments/assessment-form";

export default async function NewAssessmentPage() {
  const { member } = await requireStaffOrAdminOrOwnerPage();

  // Only staff can create assessments
  if (member.role !== "staff") redirect("/dashboard/assessments");

  const [modules, programmes] = await Promise.all([
    db.module.findMany({
      include: { programme: { select: { id: true, name: true } } },
      orderBy: { title: "asc" },
    }),
    db.programme.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New Assessment</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create an assessment for students to submit work against.
        </p>
      </div>

      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <AssessmentForm modules={modules} programmes={programmes} />
      </div>
    </div>
  );
}
