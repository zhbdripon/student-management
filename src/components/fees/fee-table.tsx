import Link from "next/link";
import { FeeStatusBadge } from "@/components/fees/fee-status-badge";
import type { FeeStatus } from "@/lib/fee-utils";
import { formatCurrency } from "@/lib/fee-utils";

interface FeeRow {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  programme: { name: string } | null;
  feeStatus: string;
  totalPaid: number;
  outstanding: number;
  totalAmount: number;
  feeCount: number;
}

interface FeeTableProps {
  rows: FeeRow[];
}

export function FeeTable({ rows }: FeeTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
        <svg
          className="h-10 w-10 text-zinc-300 dark:text-zinc-600"
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
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          No students found
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Student
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 sm:table-cell">
                Programme
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Total Fee
              </th>
              <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 md:table-cell">
                Paid
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Outstanding
              </th>
              <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 lg:table-cell">
                Records
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((row) => {
              const hasFee = row.feeCount > 0;
              return (
                <tr
                  key={row.id}
                  className={`bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 ${
                    row.feeStatus === "overdue"
                      ? "border-l-2 border-l-red-400"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {row.fullName}
                    </div>
                    <div className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                      {row.studentId}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-600 dark:text-zinc-400 sm:table-cell">
                    {row.programme?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                    {hasFee ? formatCurrency(row.totalAmount) : "—"}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 md:table-cell">
                    {hasFee ? formatCurrency(row.totalPaid) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                    {hasFee ? (
                      <span
                        className={
                          row.outstanding > 0
                            ? row.feeStatus === "overdue"
                              ? "text-red-600 dark:text-red-400"
                              : "text-zinc-900 dark:text-zinc-50"
                            : "text-emerald-700 dark:text-emerald-400"
                        }
                      >
                        {formatCurrency(row.outstanding)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-center text-zinc-500 dark:text-zinc-400 lg:table-cell">
                    {hasFee ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {row.feeCount} record{row.feeCount !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <FeeStatusBadge status={row.feeStatus as FeeStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/fees/${row.id}`}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                    >
                      {hasFee ? "Manage" : "Assign"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
