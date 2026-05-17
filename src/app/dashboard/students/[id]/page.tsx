import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminOrOwnerPage } from "@/lib/auth-utils";
import { StudentForm } from "@/components/students/student-form";
import { StatusBadge } from "@/components/students/student-table";
import type { EnrollmentStatus } from "@/components/students/student-table";
import { FeeStatusBadge } from "@/components/fees/fee-status-badge";
import { aggregateFeeRecords, formatCurrency } from "@/lib/fee-utils";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrOwnerPage();
  const { id } = await params;

  const [student, programmes] = await Promise.all([
    db.student.findUnique({
      where: { id },
      include: {
        programme: { select: { id: true, name: true } },
        feeRecords: { include: { payments: { select: { amount: true } } } },
      },
    }),
    db.programme.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!student) notFound();

  const dob = student.dateOfBirth instanceof Date
    ? student.dateOfBirth.toISOString().split("T")[0]
    : String(student.dateOfBirth).split("T")[0];

  const createdAt = new Date(student.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const { status: feeStatus, outstanding, totalPaid, totalAmount } =
    aggregateFeeRecords(
      student.feeRecords.map((fr) => ({
        totalAmount: Number(fr.totalAmount),
        dueDate: fr.dueDate,
        payments: fr.payments.map((p) => ({
          id: "",
          amount: Number(p.amount),
        })),
      })),
      today,
    );

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
        <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
          {student.studentId}
        </span>
      </nav>

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Student profile card */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-start gap-4 border-b border-zinc-100 p-6 dark:border-zinc-800">
            {/* Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {student.fullName}
                </h1>
                <StatusBadge status={student.enrollmentStatus as EnrollmentStatus} />
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {student.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="font-mono font-medium">{student.studentId}</span>
                <span>Enrolled {createdAt}</span>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 sm:grid-cols-4">
            <DetailCell label="Programme">
              {student.programme?.name ?? "—"}
            </DetailCell>
            <DetailCell label="Academic Year">
              {student.academicYear}
            </DetailCell>
            <DetailCell label="Date of Birth">
              {new Date(student.dateOfBirth).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </DetailCell>
            <DetailCell label="Status">
              <StatusBadge status={student.enrollmentStatus as EnrollmentStatus} />
            </DetailCell>
          </div>
        </div>

        {/* Fee status card */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Fees &amp; Payments
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {feeStatus === "unassigned"
                  ? "No fee record assigned yet"
                  : `${formatCurrency(outstanding)} outstanding of ${formatCurrency(totalAmount)}`}
              </p>
            </div>
            <Link
              href={`/dashboard/fees/${student.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {feeStatus === "unassigned" ? "Assign Fees" : "Manage Fees"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-px bg-zinc-100 dark:bg-zinc-800">
            <div className="bg-white px-5 py-4 dark:bg-zinc-900">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Status
              </p>
              <div className="mt-1.5">
                <FeeStatusBadge status={feeStatus} />
              </div>
            </div>
            <div className="bg-white px-5 py-4 dark:bg-zinc-900">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Paid
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {feeStatus !== "unassigned" ? formatCurrency(totalPaid) : "—"}
              </p>
            </div>
            <div className="bg-white px-5 py-4 dark:bg-zinc-900">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Outstanding
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  feeStatus === "overdue"
                    ? "text-red-600 dark:text-red-400"
                    : feeStatus !== "unassigned"
                      ? "text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-400"
                }`}
              >
                {feeStatus !== "unassigned" ? formatCurrency(outstanding) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Edit Details
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Update the student&apos;s information. The Student ID cannot be changed.
            </p>
          </div>
          <div className="p-6">
            <StudentForm
              mode="edit"
              studentId={student.id}
              programmes={programmes}
              defaultValues={{
                fullName: student.fullName,
                email: student.email,
                dateOfBirth: dob,
                programmeId: student.programmeId,
                academicYear: student.academicYear,
                enrollmentStatus: student.enrollmentStatus,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white px-4 py-3 dark:bg-zinc-900">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </div>
  );
}
