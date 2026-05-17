"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AddFeeRecordFormProps {
  studentId: string;
  suggestedAmount?: number;
}

export function InitializeFeeForm({ studentId, suggestedAmount }: AddFeeRecordFormProps) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : "");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  function clearFieldError(field: string) {
    setErrors((e) => { const next = { ...e }; delete next[field]; return next; });
    setGlobalError(null);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!label.trim()) next.label = "Label is required";
    else if (label.trim().length > 100) next.label = "Max 100 characters";

    const num = parseFloat(amount);
    if (!amount.trim()) next.amount = "Amount is required";
    else if (isNaN(num) || num <= 0) next.amount = "Enter a valid positive amount";
    else if (num > 9999999.99) next.amount = "Amount is too large";

    if (!dueDate) next.dueDate = "Due date is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, label: label.trim(), amount, dueDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGlobalError(json.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Label */}
      <div>
        <label
          htmlFor="fee-label"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Fee Label <span className="text-red-500">*</span>
        </label>
        <input
          id="fee-label"
          type="text"
          value={label}
          onChange={(e) => { setLabel(e.target.value); clearFieldError("label"); }}
          placeholder="e.g. Tuition 2025/2026"
          maxLength={100}
          className={`mt-1.5 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50 ${
            errors.label
              ? "border-red-400 focus:border-red-400 focus:ring-red-400"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
          }`}
        />
        {errors.label && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.label}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor="fee-amount"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Fee Amount (£) <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-zinc-400">
            £
          </span>
          <input
            id="fee-amount"
            type="number"
            step="0.01"
            min="0.01"
            max="9999999.99"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); clearFieldError("amount"); }}
            placeholder="0.00"
            className={`block w-full rounded-lg border bg-white py-2 pl-7 pr-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50 ${
              errors.amount
                ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
            }`}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.amount}</p>
        )}
      </div>

      {/* Due Date */}
      <div>
        <label
          htmlFor="fee-dueDate"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Payment Due Date <span className="text-red-500">*</span>
        </label>
        <input
          id="fee-dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => { setDueDate(e.target.value); clearFieldError("dueDate"); }}
          className={`mt-1.5 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50 ${
            errors.dueDate
              ? "border-red-400 focus:border-red-400 focus:ring-red-400"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
          }`}
        />
        {errors.dueDate && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.dueDate}</p>
        )}
      </div>

      {globalError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {globalError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Adding…" : "Add Fee Record"}
      </button>
    </form>
  );
}
