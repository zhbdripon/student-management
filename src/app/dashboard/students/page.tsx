import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireAdminOrOwnerPage } from "@/lib/auth-utils";
import { StudentTable } from "@/components/students/student-table";
import { StudentFilters } from "@/components/students/student-filters";
import { fetchStudents } from "./queries";

interface SearchParams {
  q?: string;
  programmeId?: string;
  status?: string;
  page?: string;
}

async function StudentsData({ searchParams }: { searchParams: SearchParams }) {
  let result: Awaited<ReturnType<typeof fetchStudents>>;

  try {
    result = await fetchStudents(searchParams);
  } catch (err) {
    console.error("[StudentsData] failed to fetch students:", err);
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <svg
          className="h-8 w-8 text-red-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Failed to load students
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-500">
            There was a problem reaching the database. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const { students, total, totalPages, page, offset } = result;

  return (
    <div className="space-y-4">
      {/* Results summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {total === 0 ? (
            "No students found"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {offset + 1}–{offset + students.length}
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

      {/* Table */}
      <StudentTable students={students} />

      {/* Pagination */}
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
    if (searchParams.programmeId) params.set("programmeId", searchParams.programmeId);
    if (searchParams.status) params.set("status", searchParams.status);
    params.set("page", String(p));
    return `/dashboard/students?${params.toString()}`;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
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

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminOrOwnerPage();

  const params = await searchParams;

  // Fetch programmes for filter dropdown
  const programmes = await db.programme.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="px-6 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Students
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage and view all enrolled students
          </p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Student
        </Link>
      </div>

      {/* Warn if no programmes */}
      {programmes.length === 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                No programmes available
              </p>
              <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
                You need to create at least one academic programme before enrolling students.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4">
        <Suspense>
          <StudentFilters programmes={programmes} />
        </Suspense>
      </div>

      {/* Table with Suspense for streaming */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        }
      >
        <StudentsData searchParams={params} />
      </Suspense>
    </div>
  );
}
