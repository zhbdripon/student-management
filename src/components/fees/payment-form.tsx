"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PaymentFormProps {
  studentId: string;
  feeRecordId: string;
  outstanding: number;
  onSuccess?: () => void;
}

function generateReference(): string {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${yyyymmdd}-${rand}`;
}

export function PaymentForm({ studentId, feeRecordId, outstanding, onSuccess }: PaymentFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  const [referenceNumber, setReferenceNumber] = useState(generateReference);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function clearFieldError(field: string) {
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      return next;
    });
    setGlobalError(null);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    const num = parseFloat(amount);
    if (!amount.trim()) next.amount = "Amount is required";
    else if (isNaN(num) || num <= 0) next.amount = "Enter a valid positive amount";
    else if (num > 9999999.99) next.amount = "Amount is too large";

    if (!paidAt) next.paidAt = "Payment date is required";
    if (!referenceNumber.trim())
      next.referenceNumber = "Reference number is required";
    else if (referenceNumber.trim().length > 100)
      next.referenceNumber = "Max 100 characters";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch(`/api/fees/${studentId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeRecordId,
          amount,
          paidAt,
          referenceNumber: referenceNumber.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGlobalError(json.error ?? "Something went wrong");
        return;
      }
      setSuccess(true);
      // Reset form for next payment
      setAmount("");
      setPaidAt(today);
      setReferenceNumber(generateReference());
      setNotes("");
      router.refresh();
      onSuccess?.();
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
          <svg
            className="h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Payment recorded successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Amount */}
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Amount (£) <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            max="9999999.99"
            placeholder={outstanding > 0 ? outstanding.toFixed(2) : "0.00"}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              clearFieldError("amount");
            }}
            className={`mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50 ${
              errors.amount
                ? "border-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-600"
                : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
            }`}
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.amount}
            </p>
          )}
        </div>

        {/* Payment date */}
        <div>
          <label
            htmlFor="paidAt"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Payment Date <span className="text-red-500">*</span>
          </label>
          <input
            id="paidAt"
            type="date"
            value={paidAt}
            onChange={(e) => {
              setPaidAt(e.target.value);
              clearFieldError("paidAt");
            }}
            className={`mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50 ${
              errors.paidAt
                ? "border-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-600"
                : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
            }`}
          />
          {errors.paidAt && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.paidAt}
            </p>
          )}
        </div>
      </div>

      {/* Reference number */}
      <div>
        <label
          htmlFor="referenceNumber"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Reference Number <span className="text-red-500">*</span>
        </label>
        <input
          id="referenceNumber"
          type="text"
          value={referenceNumber}
          onChange={(e) => {
            setReferenceNumber(e.target.value);
            clearFieldError("referenceNumber");
          }}
          maxLength={100}
          className={`mt-1.5 block w-full rounded-lg border px-3 py-2 font-mono text-sm shadow-sm focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50 ${
            errors.referenceNumber
              ? "border-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-600"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-600 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
          }`}
        />
        {errors.referenceNumber ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {errors.referenceNumber}
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Auto-generated — edit if needed
          </p>
        )}
      </div>

      {/* Notes (optional) */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Notes{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Bank transfer, instalment payment…"
          className="mt-1.5 block w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
        />
      </div>

      {globalError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {globalError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? (
          "Recording…"
        ) : (
          <>
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Record Payment
          </>
        )}
      </button>
    </form>
  );
}
