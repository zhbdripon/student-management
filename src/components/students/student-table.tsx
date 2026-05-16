import Link from "next/link";

export type EnrollmentStatus = "ENROLLED" | "DEFERRED" | "WITHDRAWN" | "COMPLETED";

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  academicYear: string;
  enrollmentStatus: EnrollmentStatus;
  createdAt: string | Date;
  programme: { id: string; name: string } | null;
}

interface StudentTableProps {
  students: Student[];
}

const statusConfig: Record<
  EnrollmentStatus,
  { label: string; classes: string }
> = {
  ENROLLED: {
    label: "Enrolled",
    classes:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  DEFERRED: {
    label: "Deferred",
    classes:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    classes:
      "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400",
  },
  COMPLETED: {
    label: "Completed",
    classes:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

export function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const config = statusConfig[status] ?? statusConfig.ENROLLED;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

export function StudentTable({ students }: StudentTableProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <svg
          className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          No students found
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Student ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Name
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:table-cell dark:text-zinc-400">
                Email
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 md:table-cell dark:text-zinc-400">
                Programme
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:table-cell dark:text-zinc-400">
                Acad. Year
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {students.map((student) => (
              <tr
                key={student.id}
                className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {student.studentId}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {student.fullName}
                  </p>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {student.email}
                  </span>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {student.programme?.name ?? "—"}
                  </span>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {student.academicYear}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={student.enrollmentStatus} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
