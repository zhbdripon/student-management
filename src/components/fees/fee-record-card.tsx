"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeFeeStatus, formatCurrency } from "@/lib/fee-utils";
import { FeeStatusBadge } from "@/components/fees/fee-status-badge";
import { PaymentForm } from "@/components/fees/payment-form";
import { PaymentsTable } from "@/components/fees/payments-table";
import { EditDueDateForm } from "@/components/fees/edit-due-date-form";

interface Payment {
  id: string;
  amount: string | number;
  paidAt: string | Date;
  referenceNumber: string;
  notes: string | null;
  createdAt: string | Date;
}

interface FeeRecordCardProps {
  feeRecord: {
    id: string;
    label: string;
    totalAmount: string | number;
    dueDate: string | Date;
    payments: Payment[];
  };
  studentId: string;
  defaultOpen?: boolean;
}

export function FeeRecordCard({ feeRecord, studentId, defaultOpen = false }: FeeRecordCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const today = new Date();
  const { status, totalPaid, totalAmount, outstanding } = computeFeeStatus(
    {
      totalAmount: feeRecord.totalAmount,
      dueDate: feeRecord.dueDate,
      payments: feeRecord.payments.map((p) => ({ id: p.id, amount: p.amount })),
    },
    today,
  );

  const isOverdue = status === "overdue";
  const dueDateStr = new Date(feeRecord.dueDate).toISOString().split("T")[0];

  async function handleDelete() {
    if (
      !confirm(
        `Delete fee record "${feeRecord.label}"? This will also remove all ${feeRecord.payments.length} payment(s) associated with it.`,
      )
    )
      return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/fees/${studentId}/records/${feeRecord.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setDeleteError(json.error ?? "Failed to delete fee record");
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${
        isOverdue
          ? "border-red-200 dark:border-red-800"
          : "border-zinc-200 dark:border-zinc-700"
      } bg-white dark:bg-zinc-900`}
    >
      {/* Card header — always visible */}
      <div
        className={`flex cursor-pointer select-none items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
          open ? "border-b border-zinc-100 dark:border-zinc-800" : ""
        }`}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {feeRecord.label}
          </span>
          <FeeStatusBadge status={status} />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Outstanding</p>
            <p
              className={`font-semibold ${
                outstanding <= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : isOverdue
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {formatCurrency(outstanding)}
            </p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="space-y-0">
          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 sm:grid-cols-4">
            <SummaryCell label="Total Fee">
              <span className="text-zinc-900 dark:text-zinc-50">{formatCurrency(totalAmount)}</span>
            </SummaryCell>
            <SummaryCell label="Paid">
              <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(totalPaid)}</span>
            </SummaryCell>
            <SummaryCell label="Outstanding">
              <span
                className={
                  outstanding <= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : isOverdue
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-700 dark:text-amber-400"
                }
              >
                {formatCurrency(outstanding)}
              </span>
            </SummaryCell>
            <SummaryCell label="Due Date">
              <span className={isOverdue ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"}>
                {new Date(feeRecord.dueDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </SummaryCell>
          </div>

          {/* Progress bar + controls */}
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Payment progress</span>
              <span>
                {totalAmount > 0
                  ? Math.min(100, Math.round((totalPaid / totalAmount) * 100))
                  : 0}
                % paid
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${
                  outstanding <= 0
                    ? "bg-emerald-500"
                    : isOverdue
                      ? "bg-red-500"
                      : "bg-amber-500"
                }`}
                style={{
                  width: `${totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0}%`,
                }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <EditDueDateForm
                studentId={studentId}
                feeRecordId={feeRecord.id}
                currentDueDate={dueDateStr}
              />
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
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
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
                {deleting ? "Deleting…" : "Delete record"}
              </button>
            </div>
            {deleteError && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {deleteError}
              </p>
            )}
          </div>

          {/* Payment history */}
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Payment History
                <span className="ml-2 text-xs font-normal text-zinc-400 dark:text-zinc-500">
                  ({feeRecord.payments.length} transaction{feeRecord.payments.length !== 1 ? "s" : ""})
                </span>
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setShowPaymentForm((v) => !v); }}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {showPaymentForm ? "Cancel" : "Record Payment"}
              </button>
            </div>

            {showPaymentForm && (
              <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Record a payment
                </p>
                <PaymentForm
                  studentId={studentId}
                  feeRecordId={feeRecord.id}
                  outstanding={outstanding}
                  onSuccess={() => setShowPaymentForm(false)}
                />
              </div>
            )}

            <PaymentsTable
              payments={feeRecord.payments.map((p) => ({
                ...p,
                amount: typeof p.amount === "object" ? String(p.amount) : p.amount,
                paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
                createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
              }))}
              studentId={studentId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCell({
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
      <div className="mt-0.5 text-base font-bold">{children}</div>
    </div>
  );
}
