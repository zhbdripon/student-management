"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FileType = "PDF" | "DOCX";

interface SubmissionFormProps {
  assessmentId: string;
  deadlinePassed: boolean;
  existingSubmission?: {
    id: string;
    fileUrl: string;
    fileType: FileType;
    submittedAt: string;
    isLate: boolean;
  } | null;
}

export function SubmissionForm({ assessmentId, deadlinePassed, existingSubmission }: SubmissionFormProps) {
  const router = useRouter();
  const isResubmit = !!existingSubmission;

  const [fileUrl, setFileUrl] = useState(existingSubmission?.fileUrl ?? "");
  const [fileType, setFileType] = useState<FileType>(existingSubmission?.fileType ?? "PDF");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(!isResubmit);

  function clearFieldError(field: string) {
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    setGlobalError(null);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!fileUrl.trim()) next.fileUrl = "Document URL is required";
    else {
      try { new URL(fileUrl.trim()); }
      catch { next.fileUrl = "Please enter a valid URL (e.g. https://drive.google.com/...)"; }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGlobalError(null);

    try {
      let res: Response;
      if (isResubmit && existingSubmission) {
        res = await fetch(
          `/api/assessments/${assessmentId}/submissions/${existingSubmission.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl: fileUrl.trim(), fileType }),
          },
        );
      } else {
        res = await fetch(`/api/assessments/${assessmentId}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: fileUrl.trim(), fileType }),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        setGlobalError(json.error ?? "Submission failed");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500";
  const errorInputClass = "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-600 dark:bg-zinc-900 dark:text-zinc-50";

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          {isResubmit ? "Resubmission received!" : "Submission received!"}
        </p>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
          Your work has been submitted successfully.
        </p>
      </div>
    );
  }

  // Show current submission with resubmit option
  if (isResubmit && existingSubmission && !showResubmitForm) {
    const submittedDate = new Date(existingSubmission.submittedAt).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Current submission</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {existingSubmission.fileType}
                </span>
                {existingSubmission.isLate && (
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    Late
                  </span>
                )}
              </div>
              <a
                href={existingSubmission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block max-w-xs truncate text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {existingSubmission.fileUrl}
              </a>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Submitted {submittedDate}</p>
            </div>
          </div>
        </div>

        {!deadlinePassed && (
          <button
            onClick={() => setShowResubmitForm(true)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Resubmit work
          </button>
        )}

        {deadlinePassed && (
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            The deadline has passed. Resubmission is no longer allowed.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {globalError}
        </div>
      )}

      {isResubmit && showResubmitForm && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          You are replacing your previous submission. The new file will be submitted immediately.
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="fileUrl" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Document URL <span className="text-red-500">*</span>
        </label>
        <input
          id="fileUrl"
          type="text"
          value={fileUrl}
          onChange={(e) => { setFileUrl(e.target.value); clearFieldError("fileUrl"); }}
          placeholder="https://drive.google.com/file/..."
          className={errors.fileUrl ? errorInputClass : inputClass}
        />
        {errors.fileUrl
          ? <p className="text-xs text-red-600 dark:text-red-400">{errors.fileUrl}</p>
          : <p className="text-xs text-zinc-400 dark:text-zinc-500">Paste a shareable link to your document (Google Drive, OneDrive, Dropbox, etc.)</p>
        }
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          File type <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {(["PDF", "DOCX"] as FileType[]).map((type) => (
            <label key={type} className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors"
              style={fileType === type ? {} : {}}
              data-selected={fileType === type}
            >
              <input
                type="radio"
                name="fileType"
                value={type}
                checked={fileType === type}
                onChange={() => setFileType(type)}
                className="text-zinc-900"
              />
              <span className={`font-medium ${fileType === type ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}`}>
                {type}
              </span>
              <span className="ml-auto text-xs text-zinc-400">
                {type === "PDF" ? ".pdf" : ".docx"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {isResubmit && (
          <button
            type="button"
            onClick={() => { setShowResubmitForm(false); setGlobalError(null); setErrors({}); }}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? (isResubmit ? "Resubmitting…" : "Submitting…") : (isResubmit ? "Resubmit" : "Submit work")}
        </button>
      </div>
    </form>
  );
}
