"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/fee-utils";

interface Payment {
  id: string;
  amount: string | number;
  paidAt: string | Date;
  referenceNumber: string;
  notes: string | null;
  createdAt: string | Date;
}

interface PaymentsTableProps {
  payments: Payment[];
  studentId: string;
}

export function PaymentsTable({ payments, studentId }: PaymentsTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(paymentId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this payment? This cannot be undone.",
      )
    )
      return;

    setDeletingId(paymentId);
    setError(null);
    try {
      const res = await fetch(
        `/api/fees/${studentId}/payments/${paymentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Failed to delete payment");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-700">
        <svg
          className="h-8 w-8 text-zinc-300 dark:text-zinc-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No payments recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Reference
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Amount
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 sm:table-cell">
                Notes
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payments.map((p) => (
              <tr
                key={p.id}
                className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
              >
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {new Date(p.paidAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {p.referenceNumber}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(Number(p.amount))}
                </td>
                <td className="hidden px-4 py-3 text-zinc-500 dark:text-zinc-400 sm:table-cell">
                  {p.notes ?? (
                    <span className="text-zinc-300 dark:text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Delete payment"
                  >
                    {deletingId === p.id ? (
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
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
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
