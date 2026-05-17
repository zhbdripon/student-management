import Link from "next/link";
import { db } from "@/lib/db";
import { requireAnyMemberPage } from "@/lib/auth-utils";
import { CLASSIFICATION_BADGE_CLASSES, CLASSIFICATION_LABELS } from "@/lib/grade-utils";
import type { GradeClassification } from "@/generated/prisma/enums";

export default async function MarksheetPage() {
  const { session, member } = await requireAnyMemberPage();
  const role = member.role;

  // ── Student view ─────────────────────────────────────────────────────────
  if (role === "member") {
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true, fullName: true, studentId: true, programme: { select: { name: true } } },
    });

    if (!student) {
      return (
        <div className="px-6 py-8">
          <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My Grades</h1>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Your account is not linked to a student record.
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Contact the Registry to have your account linked.
            </p>
          </div>
        </div>
      );
    }

    const grades = await db.grade.findMany({
      where: { studentId: student.id, isPublished: true },
      include: {
        submission: {
          include: {
            assessment: {
              include: {
                module: { select: { id: true, title: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    // Compute stats
    const totalGrades = grades.length;
    const avg = totalGrades > 0 ? Math.round(grades.reduce((s, g) => s + g.numericGrade, 0) / totalGrades) : null;
    const distinctions = grades.filter((g) => g.classification === "DISTINCTION").length;
    const merits = grades.filter((g) => g.classification === "MERIT").length;
    const passes = grades.filter((g) => g.classification === "PASS").length;
    const fails = grades.filter((g) => g.classification === "FAIL").length;

    return (
      <div className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My Grades</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {student.studentId} · {student.programme?.name}
          </p>
        </div>

        {grades.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <svg className="h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No published grades yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Grades will appear here once your assessments have been graded and published.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Average</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{avg ?? "—"}</p>
              </div>
              {[
                { label: "Distinction", count: distinctions, cls: "DISTINCTION" as GradeClassification },
                { label: "Merit", count: merits, cls: "MERIT" as GradeClassification },
                { label: "Pass", count: passes, cls: "PASS" as GradeClassification },
                { label: "Fail", count: fails, cls: "FAIL" as GradeClassification },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${s.count > 0 ? CLASSIFICATION_BADGE_CLASSES[s.cls].split(" ")[1] : "text-zinc-900 dark:text-zinc-50"}`}>
                    {s.count}
                  </p>
                </div>
              ))}
            </div>

            {/* Grades table */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Assessment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Grade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Classification</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {grades.map((g) => {
                    const publishedAt = g.publishedAt
                      ? new Date(g.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "—";
                    return (
                      <tr key={g.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/assessments/${g.submission.assessment.id}`}
                            className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                          >
                            {g.submission.assessment.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-700 dark:text-zinc-300">{g.submission.assessment.module.code}</p>
                          <p className="text-xs text-zinc-400">{g.submission.assessment.module.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{g.numericGrade}</span>
                          <span className="ml-1 text-xs text-zinc-400">/100</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_BADGE_CLASSES[g.classification]}`}>
                            {CLASSIFICATION_LABELS[g.classification]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{publishedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Staff / Registry view ─────────────────────────────────────────────────
  const assessments = await db.assessment.findMany({
    include: {
      module: { select: { id: true, title: true, code: true } },
      _count: { select: { submissions: true } },
      submissions: {
        include: {
          grade: { select: { id: true, isPublished: true } },
        },
      },
    },
    orderBy: { deadline: "desc" },
  });

  const canGrade = ["staff"].includes(role);

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Marksheet</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {canGrade ? "Enter grades and publish results per assessment." : "View all grades and results."}
        </p>
      </div>

      {assessments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No assessments yet</p>
          {canGrade && (
            <Link href="/dashboard/assessments/new" className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100">
              Create an assessment first
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Assessment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Deadline</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Progress</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {assessments.map((a) => {
                const total = a.submissions.length;
                const graded = a.submissions.filter((s) => s.grade).length;
                const published = a.submissions.filter((s) => s.grade?.isPublished).length;
                const pct = total > 0 ? Math.round((graded / total) * 100) : 0;
                const deadlineStr = a.deadline.toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                });

                return (
                  <tr key={a.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">{a.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-700 dark:text-zinc-300">{a.module.code}</p>
                      <p className="text-xs text-zinc-400">{a.module.title}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{deadlineStr}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{graded}/{total} graded</span>
                          <span>{published} published</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/marksheet/${a.id}`}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        {canGrade ? "Grade" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
