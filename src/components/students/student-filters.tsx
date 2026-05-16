"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface Programme {
  id: string;
  name: string;
}

interface StudentFiltersProps {
  programmes: Programme[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "DEFERRED", label: "Deferred" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "COMPLETED", label: "Completed" },
];

export function StudentFilters({ programmes }: StudentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const q = searchParams.get("q") ?? "";
  const programmeId = searchParams.get("programmeId") ?? "";
  const status = searchParams.get("status") ?? "";

  const hasFilters = q || programmeId || status;

  function clearFilters() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-0 flex-1" style={{ minWidth: "200px" }}>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-4 w-4 text-zinc-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="search"
          placeholder="Search by name, ID or email…"
          defaultValue={q}
          onChange={(e) => updateParam("q", e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm transition-colors focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      </div>

      {/* Programme filter */}
      <select
        value={programmeId}
        onChange={(e) => updateParam("programmeId", e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <option value="">All programmes</option>
        {programmes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={status}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-sm text-zinc-700 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          <svg
            className="h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Clear
        </button>
      )}

      {isPending && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      )}
    </div>
  );
}
