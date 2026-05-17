import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAnyMemberPage } from "@/lib/auth-utils";
import { SubmissionForm } from "@/components/assessments/submission-form";
import { SubmissionsTable } from "@/components/assessments/submissions-table";
import { CLASSIFICATION_BADGE_CLASSES, CLASSIFICATION_LABELS } from "@/lib/grade-utils";
import type { GradeClassification } from "@/generated/prisma/enums";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { session, member } = await requireAnyMemberPage();
  const { id } = await params;
  const role = member.role;
  const now = new Date();

  // ── Student view ─────────────────────────────────────────────────────────
  if (role === "member") {
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true, programmeId: true },
    });

    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        module: { select: { id: true, title: true, code: true, programmeId: true } },
      },
    });

    if (!assessment) notFound();

    const deadlinePassed = assessment.deadline < now;

    const submissionWithGrade = student
      ? await db.submission.findFirst({
          where: { assessmentId: id, studentId: student.id },
          include: {
            grade: {
              select: {
                id: true,
                numericGrade: true,
                classification: true,
                isPublished: true,
              },
            },
          },
        })
      : null;
    const submission = submissionWithGrade;

    const deadlineStr = assessment.deadline.toLocaleString("en-GB", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // Check eligibility
    const eligible =
      !assessment.module.programmeId ||
      assessment.module.programmeId === student?.programmeId;

    return (
      <div className="px-6 py-8">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/dashboard/assessments" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            Assessments
          </Link>
          <span>/</span>
          <span className="text-zinc-600 dark:text-zinc-300">{assessment.title}</span>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          {/* Assessment info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{assessment.title}</h1>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {assessment.module.code} · {assessment.module.title}
                  </p>
                </div>
                {deadlinePassed ? (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                    Closed
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    Open
                  </span>
                )}
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-widest text-zinc-400">Deadline</dt>
                  <dd className={`mt-1 text-sm font-medium ${deadlinePassed ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-50"}`}>
                    {deadlineStr}
                  </dd>
                  {!deadlinePassed && (() => {
                    const hours = Math.round((assessment.deadline.getTime() - now.getTime()) / 3600000);
                    return (
                      <dd className={`mt-0.5 text-xs ${hours <= 24 ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {hours < 24 ? `${hours}h remaining` : `${Math.round(hours / 24)}d remaining`}
                      </dd>
                    );
                  })()}
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-widest text-zinc-400">Allowed formats</dt>
                  <dd className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">PDF, DOCX</dd>
                </div>
              </dl>

              {!eligible && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                  This assessment is not available for your programme.
                </div>
              )}
            </div>
          </div>

          {/* Submission panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {submission ? "Your submission" : "Submit work"}
              </h2>

              {!student ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No student record linked. Contact the Registry.
                </p>
              ) : !eligible ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Not available for your programme.
                </p>
              ) : (
                <SubmissionForm
                  assessmentId={id}
                  deadlinePassed={deadlinePassed}
                  existingSubmission={
                    submission
                      ? {
                          id: submission.id,
                          fileUrl: submission.fileUrl,
                          fileType: submission.fileType as "PDF" | "DOCX",
                          submittedAt: submission.submittedAt.toISOString(),
                          isLate: submission.isLate,
                        }
                      : null
                  }
                />
              )}
            </div>

            {/* Grade card (if published) */}
            {submission?.grade?.isPublished && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
                <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Your grade</h2>
                <Link href="/dashboard/marksheet" className="block">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                      {submission.grade.numericGrade}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">/ 100</p>
                    <div className="mt-3 flex justify-center">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${CLASSIFICATION_BADGE_CLASSES[submission.grade.classification as GradeClassification]}`}>
                        {CLASSIFICATION_LABELS[submission.grade.classification as GradeClassification]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-blue-600 underline dark:text-blue-400">
                      View full marksheet →
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Staff / Registry view ─────────────────────────────────────────────────
  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      module: {
        include: { programme: { select: { id: true, name: true } } },
      },
      createdBy: { select: { id: true, name: true } },
      submissions: {
        include: {
          student: { select: { id: true, studentId: true, fullName: true, email: true } },
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
      _count: { select: { submissions: true } },
    },
  });

  if (!assessment) notFound();

  const deadlinePassed = assessment.deadline < now;
  const deadlineStr = assessment.deadline.toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const graded = assessment.submissions.filter((s) => s.grade).length;
  const canManage = role === "staff";

  return (
    <div className="px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-1 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/dashboard/assessments" className="hover:text-zinc-600 dark:hover:text-zinc-300">
          Assessments
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
        {canManage && (
          <Link
            href={`/dashboard/marksheet/${id}`}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Open marksheet
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Submissions", value: assessment._count.submissions },
          { label: "Graded", value: graded },
          { label: "Deadline", value: deadlinePassed ? "Closed" : "Open", accent: deadlinePassed ? "" : "text-emerald-700 dark:text-emerald-400" },
          { label: "Created by", value: assessment.createdBy.name },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{s.label}</p>
            <p className={`mt-1 text-lg font-bold truncate ${s.accent ?? "text-zinc-900 dark:text-zinc-50"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Deadline info */}
      <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Deadline</p>
        <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">{deadlineStr}</p>
      </div>

      {/* Submissions table */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Submissions ({assessment._count.submissions})
        </h2>
        <SubmissionsTable
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
          assessmentId={id}
          readOnly={!canManage}
        />
      </div>
    </div>
  );
}
