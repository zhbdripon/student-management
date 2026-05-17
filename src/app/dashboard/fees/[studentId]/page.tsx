import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminOrOwnerPage } from "@/lib/auth-utils";
import { aggregateFeeRecords, formatCurrency } from "@/lib/fee-utils";
import { FeeStatusBadge } from "@/components/fees/fee-status-badge";
import { InitializeFeeForm } from "@/components/fees/initialize-fee-form";
import { FeeRecordCard } from "@/components/fees/fee-record-card";

export default async function StudentFeePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireAdminOrOwnerPage();
  const { studentId } = await params;

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      programme: { select: { id: true, name: true, feeAmount: true } },
      feeRecords: {
        include: {
          payments: { orderBy: { paidAt: "desc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!student) notFound();

  const today = new Date();
  const hasFeeRecords = student.feeRecords.length > 0;

  // Aggregate totals across all fee records
  const { status, totalPaid, totalAmount, outstanding } = aggregateFeeRecords(
    student.feeRecords.map((fr) => ({
      totalAmount: Number(fr.totalAmount),
      dueDate: fr.dueDate,
      payments: fr.payments.map((p) => ({ id: p.id, amount: Number(p.amount) })),
    })),
    today,
  );

  const isOverdue = status === "overdue";
  const suggestedAmount = student.programme?.feeAmount
    ? Number(student.programme.feeAmount)
    : undefined;

  // Serialise fee records for client components
  const serialisedRecords = student.feeRecords.map((fr) => ({
    id: fr.id,
    label: fr.label,
    totalAmount: Number(fr.totalAmount),
    dueDate: fr.dueDate.toISOString(),
    payments: fr.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      paidAt: p.paidAt.toISOString(),
      referenceNumber: p.referenceNumber,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="px-6 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/dashboard/fees"
          className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Fees &amp; Payments
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
          <div className="flex items-start gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {student.fullName}
                </h1>
                {hasFeeRecords && <FeeStatusBadge status={status} />}
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {student.email}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span className="font-mono font-medium">{student.studentId}</span>
                <span>{student.programme?.name ?? "—"}</span>
                <Link
                  href={`/dashboard/students/${student.id}`}
                  className="text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  View student record →
                </Link>
              </div>
            </div>
          </div>

          {/* Aggregate totals — only shown when fee records exist */}
          {hasFeeRecords && (
            <div className="grid grid-cols-3 gap-px border-t border-zinc-100 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
              <AggCell label="Total Assigned" value={formatCurrency(totalAmount)} />
              <AggCell
                label="Total Paid"
                value={formatCurrency(totalPaid)}
                accent="emerald"
              />
              <AggCell
                label="Outstanding"
                value={formatCurrency(outstanding)}
                accent={outstanding <= 0 ? "emerald" : isOverdue ? "red" : "amber"}
              />
            </div>
          )}
        </div>

        {/* Fee records section */}
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Fee Records
            </h2>
            {hasFeeRecords && (
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {student.feeRecords.length} record{student.feeRecords.length !== 1 ? "s" : ""}
                {" · "}
                {student.feeRecords.reduce((n, fr) => n + fr.payments.length, 0)} payment
                {student.feeRecords.reduce((n, fr) => n + fr.payments.length, 0) !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Existing fee records */}
          {serialisedRecords.map((fr, i) => (
            <FeeRecordCard
              key={fr.id}
              feeRecord={fr}
              studentId={student.id}
              defaultOpen={i === serialisedRecords.length - 1}
            />
          ))}

          {/* Add fee record form */}
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {hasFeeRecords ? "Add Another Fee Record" : "Assign First Fee Record"}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {hasFeeRecords
                  ? "Add a new fee charge such as accommodation, late fees, or a repeat year."
                  : "No fee records yet. Add the first one to start tracking payments."}
                {student.programme?.feeAmount
                  ? ` Programme fee: ${formatCurrency(Number(student.programme.feeAmount))}.`
                  : ""}
              </p>
            </div>
            <div className="p-6">
              <InitializeFeeForm
                studentId={student.id}
                suggestedAmount={suggestedAmount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AggCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "red" | "amber";
}) {
  const textClass =
    accent === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : accent === "red"
        ? "text-red-600 dark:text-red-400"
        : accent === "amber"
          ? "text-amber-700 dark:text-amber-400"
          : "text-zinc-900 dark:text-zinc-50";

  return (
    <div className="bg-white px-5 py-3 dark:bg-zinc-900">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className={`mt-0.5 text-base font-bold ${textClass}`}>{value}</p>
    </div>
  );
}
