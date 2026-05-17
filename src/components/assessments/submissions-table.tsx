"use client";

import Link from "next/link";
import { CLASSIFICATION_BADGE_CLASSES, CLASSIFICATION_LABELS } from "@/lib/grade-utils";
import type { GradeClassification } from "@/generated/prisma/enums";

interface Submission {
  id: string;
  fileUrl: string;
  fileType: string;
  submittedAt: string | Date;
  isLate: boolean;
  student: {
    id: string;
    studentId: string;
    fullName: string;
    email: string;
  };
  grade?: {
    id: string;
    numericGrade: number;
    classification: GradeClassification;
    isPublished: boolean;
    publishedAt?: string | Date | null;
    gradedBy?: { name: string } | null;
  } | null;
}

interface SubmissionsTableProps {
  submissions: Submission[];
  assessmentId: string;
  readOnly?: boolean;
}

export function SubmissionsTable({ submissions, assessmentId, readOnly = false }: SubmissionsTableProps) {
  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No submissions yet</p>
      </div>
    );
  }

  const graded = submissions.filter((s) => s.grade).length;
  const published = submissions.filter((s) => s.grade?.isPublished).length;
  const late = submissions.filter((s) => s.isLate).length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: submissions.length, color: "" },
          { label: "Graded", value: graded, color: "text-blue-700 dark:text-blue-400" },
          { label: "Published", value: published, color: "text-emerald-700 dark:text-emerald-400" },
          { label: "Late", value: late, color: late > 0 ? "text-amber-700 dark:text-amber-400" : "" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color || "text-zinc-900 dark:text-zinc-50"}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">File</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Submitted</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Grade</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Status</th>
              {!readOnly && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-400">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {submissions.map((sub) => {
              const submittedAt = new Date(sub.submittedAt).toLocaleString("en-GB", {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              });
              return (
                <tr key={sub.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{sub.student.fullName}</p>
                    <p className="text-xs text-zinc-400">{sub.student.studentId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {sub.fileType}
                      </span>
                      {sub.isLate && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          Late
                        </span>
                      )}
                    </div>
                    <a
                      href={sub.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block max-w-[180px] truncate text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View file ↗
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{submittedAt}</td>
                  <td className="px-4 py-3">
                    {sub.grade ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {sub.grade.numericGrade}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_BADGE_CLASSES[sub.grade.classification]}`}>
                          {CLASSIFICATION_LABELS[sub.grade.classification]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">Not graded</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub.grade ? (
                      sub.grade.isPublished ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                          Withheld
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                        Pending
                      </span>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/marksheet/${assessmentId}`}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        Grade
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
