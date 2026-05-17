import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminOrOwnerPage } from "@/lib/auth-utils";
import { formatCurrency } from "@/lib/fee-utils";
import { FeeTable } from "@/components/fees/fee-table";
import { FeeFilters } from "@/components/fees/fee-filters";

interface SearchParams {
  q?: string;
  programmeId?: string;
  feeStatus?: string;
  page?: string;
}

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Summary stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "red" | "emerald" | "amber";
}) {
  const accentClass =
    accent === "red"
      ? "text-red-600 dark:text-red-400"
      : accent === "emerald"
        ? "text-emerald-700 dark:text-emerald-400"
        : accent === "amber"
          ? "text-amber-700 dark:text-amber-400"
          : "text-zinc-900 dark:text-zinc-50";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accentClass}`}>{value}</p>
      {sub && (
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data-fetching section (Suspense boundary)
// ---------------------------------------------------------------------------
async function FeesData({ searchParams }: { searchParams: SearchParams }) {
  const q = searchParams.q?.trim() ?? "";
  const programmeId = searchParams.programmeId ?? "";
  const feeStatus = searchParams.feeStatus ?? "all";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const studentWhere: Record<string, unknown> = {};
  if (q) {
    studentWhere.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { studentId: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (programmeId) studentWhere.programmeId = programmeId;
  if (feeStatus === "unassigned") studentWhere.feeRecords = { none: {} };
  else if (feeStatus !== "all") studentWhere.feeRecords = { some: {} };

  let students: Awaited<
    ReturnType<
      typeof db.student.findMany<{
        include: {
          programme: { select: { id: true; name: true } };
          feeRecords: { include: { payments: { select: { amount: true } } } };
        };
      }>
    >
  >;
  try {
    students = await db.student.findMany({
      where: studentWhere,
      include: {
        programme: { select: { id: true, name: true } },
        feeRecords: {
          include: { payments: { select: { amount: true } } },
        },
      },
      orderBy: { fullName: "asc" },
    });
  } catch (err) {
    console.error("[FeesData] failed to fetch students:", err);
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Failed to load fee data
        </p>
        <p className="text-xs text-red-600 dark:text-red-500">
          There was a problem reaching the database. Please try refreshing.
        </p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Aggregate status across all fee records for each student
  const rows = students.map((s) => {
    if (s.feeRecords.length === 0) {
      return { ...s, feeStatus: "unassigned", totalPaid: 0, outstanding: 0, totalAmount: 0, feeCount: 0 };
    }
    let totalAmount = 0;
    let totalPaid = 0;
    let hasOverdue = false;
    for (const fr of s.feeRecords) {
      const amt = Number(fr.totalAmount);
      const paid = fr.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      totalAmount += amt;
      totalPaid += paid;
      const dueDate = new Date(fr.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (paid < amt && dueDate < today) hasOverdue = true;
    }
    const outstanding = Math.max(0, totalAmount - totalPaid);
    let feeStatus: string;
    if (outstanding <= 0) feeStatus = "paid";
    else if (hasOverdue) feeStatus = "overdue";
    else if (totalPaid > 0) feeStatus = "partial";
    else feeStatus = "pending";
    return { ...s, feeStatus, totalPaid, outstanding, totalAmount, feeCount: s.feeRecords.length };
  });

  // Filter by computed status (overdue/paid/partial/pending must be computed client-side)
  const COMPUTED = ["overdue", "paid", "partial", "pending"] as const;
  const filtered = COMPUTED.includes(feeStatus as (typeof COMPUTED)[number])
    ? rows.filter((r) => r.feeStatus === feeStatus)
    : rows;

  // Paginate
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginated = filtered.slice(offset, offset + PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {total === 0 ? (
            "No students found"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {Math.min(offset + 1, total)}–{Math.min(offset + PAGE_SIZE, total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {total}
              </span>{" "}
              student{total !== 1 ? "s" : ""}
            </>
          )}
        </p>
      </div>

      <FeeTable rows={paginated} />

      {totalPages > 1 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          searchParams={searchParams}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
function PaginationControls({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: SearchParams;
}) {
  function buildUrl(p: number) {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.programmeId)
      params.set("programmeId", searchParams.programmeId);
    if (searchParams.feeStatus) params.set("feeStatus", searchParams.feeStatus);
    params.set("page", String(p));
    return `/dashboard/fees?${params.toString()}`;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex items-center justify-center gap-1">
      <Link
        href={buildUrl(page - 1)}
        aria-disabled={page <= 1}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
          page <= 1
            ? "pointer-events-none border-zinc-100 text-zinc-300 dark:border-zinc-800 dark:text-zinc-600"
            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        }`}
      >
        ‹
      </Link>
      {pages.map((p, i) => {
        const prev = pages[i - 1];
        const showEllipsis = prev && p - prev > 1;
        return (
          <div key={p} className="flex items-center gap-1">
            {showEllipsis && (
              <span className="px-1 text-sm text-zinc-400">…</span>
            )}
            <Link
              href={buildUrl(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                p === page
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {p}
            </Link>
          </div>
        );
      })}
      <Link
        href={buildUrl(page + 1)}
        aria-disabled={page >= totalPages}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
          page >= totalPages
            ? "pointer-events-none border-zinc-100 text-zinc-300 dark:border-zinc-800 dark:text-zinc-600"
            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        }`}
      >
        ›
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminOrOwnerPage();
  const params = await searchParams;

  // Fetch programmes for filter dropdown + global stats
  const [programmes, allStudents] = await Promise.all([
    db.programme.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.student.findMany({
      include: {
        feeRecords: { include: { payments: { select: { amount: true } } } },
      },
    }),
  ]);

  const statsToday = new Date();
  statsToday.setHours(0, 0, 0, 0);
  let totalOutstanding = 0;
  let overdueCount = 0;
  let assignedCount = 0;

  for (const s of allStudents) {
    if (s.feeRecords.length === 0) continue;
    assignedCount++;
    let hasOverdue = false;
    for (const fr of s.feeRecords) {
      const amt = Number(fr.totalAmount);
      const paid = fr.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const outstanding = Math.max(0, amt - paid);
      totalOutstanding += outstanding;
      const dueDate = new Date(fr.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (outstanding > 0 && dueDate < statsToday) hasOverdue = true;
    }
    if (hasOverdue) overdueCount++;
  }

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Fees &amp; Payments
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Track tuition fees, record payments, and monitor outstanding balances
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Students"
          value={String(allStudents.length)}
          sub={`${assignedCount} with fees assigned`}
        />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          sub="balance past due date"
          accent={overdueCount > 0 ? "red" : undefined}
        />
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          accent={totalOutstanding > 0 ? "amber" : "emerald"}
        />
        <StatCard
          label="Unassigned"
          value={String(allStudents.length - assignedCount)}
          sub="no fee record yet"
        />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FeeFilters programmes={programmes} />
      </div>

      {/* Table */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading…</p>
          </div>
        }
      >
        <FeesData searchParams={params} />
      </Suspense>
    </div>
  );
}
