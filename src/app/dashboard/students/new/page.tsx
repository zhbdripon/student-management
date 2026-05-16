import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminOrOwnerPage } from "@/lib/auth-utils";
import { StudentForm } from "@/components/students/student-form";

export default async function NewStudentPage() {
  await requireAdminOrOwnerPage();

  const programmes = await db.programme.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="px-6 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/dashboard/students"
          className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Students
        </Link>
        <svg
          className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-zinc-900 dark:text-zinc-100">New Student</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Enrol New Student
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Fill in the student&apos;s details below. A unique Student ID will be auto-generated.
        </p>
      </div>

      {/* Form card */}
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <StudentForm mode="create" programmes={programmes} />
      </div>
    </div>
  );
}
