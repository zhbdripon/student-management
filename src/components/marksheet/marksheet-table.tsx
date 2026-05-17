"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLASSIFICATION_BADGE_CLASSES, CLASSIFICATION_LABELS } from "@/lib/grade-utils";
import type { GradeClassification } from "@/generated/prisma/enums";

interface Submission {
  id: string;
  fileUrl: string;
  fileType: string;
  submittedAt: string;
  isLate: boolean;
  student: {
    id: string;
    studentId: string;
    fullName: string;
  };
  grade?: {
    id: string;
    numericGrade: number;
    classification: GradeClassification;
    isPublished: boolean;
    publishedAt?: string | null;
    gradedBy?: { name: string } | null;
  } | null;
}

interface MarksheetTableProps {
  submissions: Submission[];
  assessmentId: string;
  readOnly?: boolean;
}

interface GradeRowState {
  submitting: boolean;
  publishing: boolean;
  error: string | null;
  localGrade: string;
  editMode: boolean;
}

export function MarksheetTable({ submissions, assessmentId, readOnly = false }: MarksheetTableProps) {
  const router = useRouter();
  const [rowStates, setRowStates] = useState<Record<string, GradeRowState>>(() =>
    Object.fromEntries(
      submissions.map((s) => [
        s.id,
        {
          submitting: false,
          publishing: false,
          error: null,
          localGrade: s.grade ? String(s.grade.numericGrade) : "",
          editMode: false,
        },
      ]),
    ),
  );

  function updateRow(submissionId: string, update: Partial<GradeRowState>) {
    setRowStates((prev) => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], ...update },
    }));
  }

  async function handleSaveGrade(submission: Submission) {
    const state = rowStates[submission.id];
    const grade = Number(state.localGrade);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      updateRow(submission.id, { error: "Enter a valid grade (0–100)" });
      return;
    }

    updateRow(submission.id, { submitting: true, error: null });

    try {
      let res: Response;
      if (submission.grade) {
        // Update existing grade
        res = await fetch(`/api/grades/${submission.grade.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numericGrade: grade }),
        });
      } else {
        // Create new grade
        res = await fetch("/api/grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId: submission.id, numericGrade: grade }),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        updateRow(submission.id, { error: json.error ?? "Failed to save grade" });
        return;
      }
      updateRow(submission.id, { editMode: false });
      router.refresh();
    } catch {
      updateRow(submission.id, { error: "Network error. Please try again." });
    } finally {
      updateRow(submission.id, { submitting: false });
    }
  }

  async function handleTogglePublish(submission: Submission) {
    if (!submission.grade) return;
    const newPublished = !submission.grade.isPublished;
    updateRow(submission.id, { publishing: true, error: null });

    try {
      const res = await fetch(`/api/grades/${submission.grade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: newPublished }),
      });
      const json = await res.json();
      if (!res.ok) {
        updateRow(submission.id, { error: json.error ?? "Failed to update" });
        return;
      }
      router.refresh();
    } catch {
      updateRow(submission.id, { error: "Network error. Please try again." });
    } finally {
      updateRow(submission.id, { publishing: false });
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No submissions for this assessment</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Student</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">File</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Grade</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Classification</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Visibility</th>
            {!readOnly && (
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-400">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {submissions.map((sub) => {
            const state = rowStates[sub.id] ?? {
              submitting: false, publishing: false, error: null, localGrade: "", editMode: false,
            };
            const submittedAt = new Date(sub.submittedAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            });

            return (
              <tr key={sub.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
                {/* Student */}
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{sub.student.fullName}</p>
                  <p className="text-xs text-zinc-400">{sub.student.studentId}</p>
                </td>

                {/* File */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                      {sub.fileType}
                    </span>
                    {sub.isLate && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        Late
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={sub.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View ↗
                    </a>
                    <span className="text-xs text-zinc-400">{submittedAt}</span>
                  </div>
                </td>

                {/* Grade input */}
                <td className="px-4 py-3">
                  {readOnly ? (
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {sub.grade ? sub.grade.numericGrade : "—"}
                    </span>
                  ) : state.editMode || !sub.grade ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={state.localGrade}
                        onChange={(e) => updateRow(sub.id, { localGrade: e.target.value, error: null })}
                        placeholder="0–100"
                        className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                      />
                      <button
                        onClick={() => handleSaveGrade(sub)}
                        disabled={state.submitting || !state.localGrade}
                        className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        {state.submitting ? "…" : "Save"}
                      </button>
                      {state.editMode && (
                        <button
                          onClick={() => updateRow(sub.id, { editMode: false, localGrade: sub.grade ? String(sub.grade.numericGrade) : "", error: null })}
                          className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {sub.grade.numericGrade}
                      </span>
                      <button
                        onClick={() => updateRow(sub.id, { editMode: true, localGrade: String(sub.grade!.numericGrade) })}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {state.error && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
                  )}
                </td>

                {/* Classification */}
                <td className="px-4 py-3">
                  {sub.grade ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_BADGE_CLASSES[sub.grade.classification]}`}>
                      {CLASSIFICATION_LABELS[sub.grade.classification]}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                  )}
                </td>

                {/* Visibility status */}
                <td className="px-4 py-3">
                  {sub.grade ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      sub.grade.isPublished
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                    }`}>
                      {sub.grade.isPublished ? "Published" : "Withheld"}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                  )}
                </td>

                {/* Actions */}
                {!readOnly && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {sub.grade && (
                        <button
                          onClick={() => handleTogglePublish(sub)}
                          disabled={state.publishing}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                            sub.grade.isPublished
                              ? "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                          }`}
                        >
                          {state.publishing ? "…" : sub.grade.isPublished ? "Withhold" : "Publish"}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
