import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAnyMemberPage } from "@/lib/auth-utils";
import { MarksheetTable } from "@/components/marksheet/marksheet-table";
import { CLASSIFICATION_BADGE_CLASSES, CLASSIFICATION_LABELS } from "@/lib/grade-utils";
import type { GradeClassification } from "@/generated/prisma/enums";

export default async function AssessmentMarksheetPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { member } = await requireAnyMemberPage();
  const { assessmentId } = await params;
  const role = member.role;

  // Students don't access this page directly — redirect to their grades
  if (role === "member") redirect("/dashboard/marksheet");

  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      module: {
        include: { programme: { select: { id: true, name: true } } },
      },
      createdBy: { select: { name: true } },
      submissions: {
        include: {
          student: { select: { id: true, studentId: true, fullName: true } },
          grade: {
            select: {
              id: true,
              numericGrade: true,
              classification: true,
              isPublished: true,
              publishedAt: true,
              gradedBy: { select: { name: true } },
            },
          },
        },
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  if (!assessment) notFound();

  const canGrade = role === "staff";
  const total = assessment.submissions.length;
  const graded = assessment.submissions.filter((s) => s.grade).length;
  const published = assessment.submissions.filter((s) => s.grade?.isPublished).length;
  const lateCount = assessment.submissions.filter((s) => s.isLate).length;

  // Grade distribution (for graded submissions)
  const dist: Record<GradeClassification, number> = {
    DISTINCTION: 0, MERIT: 0, PASS: 0, FAIL: 0,
  };
  let sumGrades = 0;
  for (const sub of assessment.submissions) {
    if (sub.grade) {
      dist[sub.grade.classification]++;
      sumGrades += sub.grade.numericGrade;
    }
  }
  const avgGrade = graded > 0 ? Math.round(sumGrades / graded) : null;

  const deadlineStr = assessment.deadline.toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-1 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/dashboard/marksheet" className="hover:text-zinc-600 dark:hover:text-zinc-300">
          Marksheet
        </Link>
        <span>/</span>
        <span className="text-zinc-600 dark:text-zinc-300">{assessment.title}</span>
      </div>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{assessment.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {assessment.module.code} · {assessment.module.title}
            {assessment.module.programme && ` · ${assessment.module.programme.name}`}
          </p>
        </div>
        <Link
          href={`/dashboard/assessments/${assessmentId}`}
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          View assessment
        </Link>
      </div>

      {/* Info row */}
      <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-zinc-400">Deadline: </span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{deadlineStr}</span>
          </div>
          <div>
            <span className="text-zinc-400">Created by: </span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{assessment.createdBy.name}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: "Submissions", value: total, accent: "" },
          { label: "Graded", value: graded, accent: "text-blue-700 dark:text-blue-400" },
          { label: "Published", value: published, accent: "text-emerald-700 dark:text-emerald-400" },
          { label: "Late", value: lateCount, accent: lateCount > 0 ? "text-amber-700 dark:text-amber-400" : "" },
          { label: "Avg grade", value: avgGrade !== null ? `${avgGrade}` : "—", accent: "" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.accent || "text-zinc-900 dark:text-zinc-50"}`}>{s.value}</p>
          </div>
        ))}

        {/* Grade distribution */}
        {(["DISTINCTION", "MERIT", "PASS", "FAIL"] as GradeClassification[]).map((cls) => (
          <div key={cls} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{CLASSIFICATION_LABELS[cls]}</p>
            <p className={`mt-1 text-xl font-bold ${dist[cls] > 0 ? CLASSIFICATION_BADGE_CLASSES[cls].split(" ")[1] : "text-zinc-900 dark:text-zinc-50"}`}>
              {dist[cls]}
            </p>
          </div>
        ))}
      </div>

      {/* Grading progress bar */}
      {total > 0 && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
            <span>{graded} of {total} graded</span>
            <span>{published} published</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all"
              style={{ width: total > 0 ? `${Math.round((graded / total) * 100)}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {canGrade ? "Grade submissions" : "Submissions & grades"}
        </h2>
        {!canGrade && (
          <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
            You are viewing this in read-only mode. Only staff can enter or publish grades.
          </div>
        )}
        <MarksheetTable
          submissions={assessment.submissions.map((s) => ({
            ...s,
            submittedAt: s.submittedAt.toISOString(),
            grade: s.grade
              ? {
                  ...s.grade,
                  publishedAt: s.grade.publishedAt?.toISOString() ?? null,
                }
              : null,
          }))}
          assessmentId={assessmentId}
          readOnly={!canGrade}
        />
      </div>
    </div>
  );
}
