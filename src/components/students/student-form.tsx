"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Programme {
  id: string;
  name: string;
}

interface StudentFormData {
  fullName: string;
  email: string;
  dateOfBirth: string;
  programmeId: string;
  academicYear: string;
  enrollmentStatus: string;
}

interface StudentFormProps {
  studentId?: string; // cuid — present in edit mode
  defaultValues?: Partial<StudentFormData>;
  programmes: Programme[];
  mode: "create" | "edit";
}

const STATUS_OPTIONS = [
  { value: "ENROLLED", label: "Enrolled" },
  { value: "DEFERRED", label: "Deferred" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "COMPLETED", label: "Completed" },
];

function getDefaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  // If past July, the new academic year has started
  const month = now.getMonth(); // 0-indexed
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

export function StudentForm({
  studentId,
  defaultValues,
  programmes,
  mode,
}: StudentFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<StudentFormData>({
    fullName: defaultValues?.fullName ?? "",
    email: defaultValues?.email ?? "",
    dateOfBirth: defaultValues?.dateOfBirth ?? "",
    programmeId: defaultValues?.programmeId ?? "",
    academicYear: defaultValues?.academicYear ?? getDefaultAcademicYear(),
    enrollmentStatus: defaultValues?.enrollmentStatus ?? "ENROLLED",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof StudentFormData, string>>
  >({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Update year when mode changes
  useEffect(() => {
    if (mode === "create" && !defaultValues?.academicYear) {
      setValues((v) => ({ ...v, academicYear: getDefaultAcademicYear() }));
    }
  }, [mode, defaultValues?.academicYear]);

  function set(field: keyof StudentFormData, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
    if (globalError) setGlobalError(null);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof StudentFormData, string>> = {};

    if (!values.fullName.trim()) next.fullName = "Full name is required";
    if (!values.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = "Enter a valid email address";
    }
    if (!values.dateOfBirth) {
      next.dateOfBirth = "Date of birth is required";
    } else {
      const dob = new Date(values.dateOfBirth);
      const minDob = new Date();
      minDob.setFullYear(minDob.getFullYear() - 15);
      if (dob > minDob)
        next.dateOfBirth = "Student must be at least 15 years old";
    }
    if (!values.programmeId) next.programmeId = "Programme is required";
    if (!values.academicYear.trim()) {
      next.academicYear = "Academic year is required";
    } else if (!/^\d{4}\/\d{4}$/.test(values.academicYear)) {
      next.academicYear = "Format must be YYYY/YYYY (e.g. 2025/2026)";
    } else {
      const [start, end] = values.academicYear.split("/").map(Number);
      if (end !== start + 1) {
        next.academicYear =
          "End year must be exactly one greater than start year";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGlobalError(null);

    const url =
      mode === "edit" ? `/api/students/${studentId}` : "/api/students";
    const method = mode === "edit" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        email: values.email.trim().toLowerCase(),
        fullName: values.fullName.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setGlobalError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    // Brief success flash then navigate
    setTimeout(() => {
      setSuccess(false);
      setLoading(false);
      router.push(`/dashboard/students`);
    }, 1000);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Global error */}
      {globalError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
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
          <p className="text-sm text-red-700 dark:text-red-400">
            {globalError}
          </p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <svg
            className="h-4 w-4 shrink-0 text-emerald-500"
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
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {mode === "create"
              ? "Student enrolled successfully!"
              : "Changes saved!"}
          </p>
        </div>
      )}

      {/* Form grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Full Name */}
        <Field
          label="Full Name"
          error={errors.fullName}
          required
          className="sm:col-span-2"
        >
          <input
            type="text"
            autoComplete="name"
            placeholder="e.g. Jane Doe"
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className={inputClass(!!errors.fullName)}
          />
        </Field>

        {/* Email */}
        <Field label="Email Address" error={errors.email} required>
          <input
            type="email"
            autoComplete="email"
            placeholder="student@example.com"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass(!!errors.email)}
          />
        </Field>

        {/* Date of Birth */}
        <Field label="Date of Birth" error={errors.dateOfBirth} required>
          <DateOfBirthPicker
            value={values.dateOfBirth}
            onChange={(v) => set("dateOfBirth", v)}
            hasError={!!errors.dateOfBirth}
          />
        </Field>

        {/* Programme */}
        <Field label="Programme" error={errors.programmeId} required>
          {programmes.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
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
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              No programmes available. Create a programme first.
            </div>
          ) : (
            <select
              value={values.programmeId}
              onChange={(e) => set("programmeId", e.target.value)}
              className={inputClass(!!errors.programmeId)}
            >
              <option value="">Select a programme…</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        {/* Academic Year */}
        <Field
          label="Academic Year"
          error={errors.academicYear}
          required
          hint="Format: YYYY/YYYY"
        >
          <input
            type="text"
            placeholder="e.g. 2025/2026"
            value={values.academicYear}
            onChange={(e) => set("academicYear", e.target.value)}
            className={inputClass(!!errors.academicYear)}
          />
        </Field>

        {/* Enrollment Status */}
        <Field
          label="Enrollment Status"
          error={errors.enrollmentStatus}
          required
        >
          <select
            value={values.enrollmentStatus}
            onChange={(e) => set("enrollmentStatus", e.target.value)}
            className={inputClass(!!errors.enrollmentStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <Link
          href="/dashboard/students"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={
            loading || success || (mode === "create" && programmes.length === 0)
          }
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" />
          )}
          {mode === "create" ? "Enrol Student" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// --- DateOfBirthPicker ---

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function DateOfBirthPicker({
  value,
  onChange,
  hasError,
}: {
  value: string; // YYYY-MM-DD or ""
  onChange: (val: string) => void;
  hasError: boolean;
}) {
  const parts = value ? value.split("-") : ["", "", ""];
  const [year, setYear] = useState(parts[0]);
  const [month, setMonth] = useState(parts[1] ?? "");
  const [day, setDay] = useState(parts[2] ?? "");

  const maxYear = new Date().getFullYear();
  const minYear = 1940;
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => maxYear - i
  );

  const numDays =
    year && month ? daysInMonth(parseInt(year), parseInt(month)) : 31;
  const days = Array.from({ length: numDays }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  function emit(y: string, m: string, d: string) {
    if (y && m && d) {
      const maxDay = daysInMonth(parseInt(y), parseInt(m));
      const clamped = Math.min(parseInt(d), maxDay);
      const clampedStr = String(clamped).padStart(2, "0");
      if (d !== clampedStr) setDay(clampedStr);
      onChange(`${y}-${m}-${clampedStr}`);
    } else {
      onChange("");
    }
  }

  const selectClass = `${inputClass(hasError)} appearance-none`;

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={day}
        onChange={(e) => { setDay(e.target.value); emit(year, month, e.target.value); }}
        className={selectClass}
        aria-label="Day"
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {parseInt(d)}
          </option>
        ))}
      </select>

      <select
        value={month}
        onChange={(e) => { setMonth(e.target.value); emit(year, e.target.value, day); }}
        className={selectClass}
        aria-label="Month"
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => { setYear(e.target.value); emit(e.target.value, month, day); }}
        className={selectClass}
        aria-label="Year"
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- Helpers ---

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-1 placeholder-zinc-400
    dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500
    ${
      hasError
        ? "border-red-400 focus:border-red-400 focus:ring-red-400"
        : "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
    }`;
}

function Field({
  label,
  error,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <svg
            className="h-3 w-3 shrink-0"
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
          {error}
        </p>
      )}
    </div>
  );
}
