/**
 * Shared helpers for fee computation and display — used by both server and
 * client components (no Prisma imports here, only plain types).
 */

export type FeeStatus = "unassigned" | "paid" | "partial" | "overdue" | "pending";

export interface PaymentRow {
  id: string;
  amount: number | string;
}

export function computeFeeStatus(
  feeRecord: { totalAmount: number | string; dueDate: string | Date; payments: PaymentRow[] } | null,
  today: Date = new Date(),
): {
  status: FeeStatus;
  totalPaid: number;
  totalAmount: number;
  outstanding: number;
} {
  if (!feeRecord) {
    return { status: "unassigned", totalPaid: 0, totalAmount: 0, outstanding: 0 };
  }

  const totalAmount = Number(feeRecord.totalAmount);
  const totalPaid = feeRecord.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const outstanding = Math.max(0, totalAmount - totalPaid);

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  const dueDate = new Date(feeRecord.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  let status: FeeStatus;
  if (outstanding <= 0) status = "paid";
  else if (dueDate < todayMidnight) status = "overdue";
  else if (totalPaid > 0) status = "partial";
  else status = "pending";

  return { status, totalPaid, totalAmount, outstanding };
}

/**
 * Aggregates multiple fee records for a single student into one summary.
 * Returns "unassigned" when feeRecords is empty.
 */
export function aggregateFeeRecords(
  feeRecords: Array<{
    totalAmount: number | string;
    dueDate: string | Date;
    payments: PaymentRow[];
  }>,
  today: Date = new Date(),
): {
  status: FeeStatus;
  totalPaid: number;
  totalAmount: number;
  outstanding: number;
} {
  if (feeRecords.length === 0) {
    return { status: "unassigned", totalPaid: 0, totalAmount: 0, outstanding: 0 };
  }

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  let totalAmount = 0;
  let totalPaid = 0;
  let hasOverdue = false;

  for (const fr of feeRecords) {
    const amt = Number(fr.totalAmount);
    const paid = fr.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    totalAmount += amt;
    totalPaid += paid;
    const dueDate = new Date(fr.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (paid < amt && dueDate < todayMidnight) hasOverdue = true;
  }

  const outstanding = Math.max(0, totalAmount - totalPaid);
  let status: FeeStatus;
  if (outstanding <= 0) status = "paid";
  else if (hasOverdue) status = "overdue";
  else if (totalPaid > 0) status = "partial";
  else status = "pending";

  return { status, totalPaid, totalAmount, outstanding };
}

export const FEE_STATUS_LABELS: Record<FeeStatus, string> = {
  unassigned: "Unassigned",
  paid: "Paid in Full",
  partial: "Partial",
  overdue: "Overdue",
  pending: "Pending",
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);
}
