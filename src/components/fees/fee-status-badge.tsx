import type { FeeStatus } from "@/lib/fee-utils";
import { FEE_STATUS_LABELS } from "@/lib/fee-utils";

const BADGE_STYLES: Record<FeeStatus, string> = {
  unassigned:
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  partial:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  overdue:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  pending:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
};

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_STYLES[status]}`}
    >
      {status === "overdue" && (
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
      )}
      {FEE_STATUS_LABELS[status]}
    </span>
  );
}
