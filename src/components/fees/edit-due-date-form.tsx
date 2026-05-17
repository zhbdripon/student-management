"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EditDueDateFormProps {
  studentId: string;
  feeRecordId: string;
  currentDueDate: string; // ISO date string YYYY-MM-DD
}

export function EditDueDateForm({ studentId, feeRecordId, currentDueDate }: EditDueDateFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState(currentDueDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dueDate) {
      setError("Please select a due date");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fees/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeRecordId, dueDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Edit due date
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="date"
        value={dueDate}
        onChange={(e) => {
          setDueDate(e.target.value);
          setError(null);
        }}
        className={`rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500"
            : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600"
        }`}
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
          setDueDate(currentDueDate);
        }}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
      >
        Cancel
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}
