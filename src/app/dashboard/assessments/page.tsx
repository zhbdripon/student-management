import Link from "next/link";
import { db } from "@/lib/db";
import { requireAnyMemberPage } from "@/lib/auth-utils";

export default async function AssessmentsPage() {
  const { session, member } = await requireAnyMemberPage();
  const role = member.role;
  const now = new Date();

  // ── Student view ─────────────────────────────────────────────────────────
  if (role === "member") {
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true, programmeId: true, programme: { select: { name: true } } },
    });

    if (!student) {
      return (
        <div className="px-6 py-8">
          <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Assessments</h1>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Your account is not linked to a student record.
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Please contact the Registry to have your account linked to your student record.
            </p>
          </div>
        </div>
      );
    }

    const assessments = await db.assessment.findMany({
      where: {
        OR: [
          { module: { programmeId: student.programmeId } },
          { module: { programmeId: null } },
        ],
      },
      include: {
        module: { select: { id: true, title: true, code: true } },
        submissions: {
          where: { studentId: student.id },
          include: {
            grade: { select: { isPublished: true, numericGrade: true, classification: true } },
          },
        },
      },
      orderBy: { deadline: "asc" },
    });

    const open = assessments.filter((a) => a.deadline >= now);
    const past = assessments.filter((a) => a.deadline < now);

    return (
      <div className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Assessments</h1>
          {student.programme && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {student.programme.name}
            </p>
          )}
        </div>

        {assessments.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <svg className="h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No assessments for your programme yet</p>
          </div>
        )}

        {open.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Open</h2>
            <div className="space-y-3">
              {open.map((a) => {
                const sub = a.submissions[0] ?? null;
                const hoursLeft = Math.round((a.deadline.getTime() - now.getTime()) / 3600000);
                const isUrgent = hoursLeft <= 48;
                return (
                  <AssessmentCard
                    key={a.id}
                    assessment={a}
                    submission={sub}
                    role="member"
                    urgencyBadge={isUrgent ? `${hoursLeft < 24 ? `${hoursLeft}h` : `${Math.round(hoursLeft / 24)}d`} left` : null}
                  />
                );
              })}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Past</h2>
            <div className="space-y-3">
              {past.map((a) => {
                const sub = a.submissions[0] ?? null;
                return <AssessmentCard key={a.id} assessment={a} submission={sub} role="member" />;
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ── Staff / Registry view ─────────────────────────────────────────────────
  const assessments = await db.assessment.findMany({
    include: {
      module: {
        include: { programme: { select: { id: true, name: true } } },
      },
      createdBy: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { deadline: "desc" },
  });

  const canCreate = role === "staff";
  const open = assessments.filter((a) => a.deadline >= now);
  const past = assessments.filter((a) => a.deadline < now);

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Assessments</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {assessments.length} assessment{assessments.length !== 1 ? "s" : ""} total
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/assessments/new"
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + New assessment
          </Link>
        )}
      </div>

      {assessments.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No assessments yet</p>
          {canCreate && (
            <Link href="/dashboard/assessments/new" className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100">
              Create the first assessment
            </Link>
          )}
        </div>
      )}

      {open.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Open</h2>
          <StaffAssessmentList assessments={open} role={role} />
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Past</h2>
          <StaffAssessmentList assessments={past} role={role} />
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student assessment card
// ---------------------------------------------------------------------------
interface StudentAssessmentCardProps {
  assessment: {
    id: string;
    title: string;
    deadline: Date;
    module: { code: string; title: string };
  };
  submission: {
    isLate: boolean;
    grade?: { isPublished: boolean; numericGrade: number; classification: string } | null;
  } | null;
  role: string;
  urgencyBadge?: string | null;
}

function AssessmentCard({ assessment, submission, urgencyBadge }: StudentAssessmentCardProps) {
  const deadlineStr = assessment.deadline.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const isPast = assessment.deadline < new Date();

  return (
    <Link
      href={`/dashboard/assessments/${assessment.id}`}
      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-shadow hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="space-y-0.5">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">{assessment.title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {assessment.module.code} · {assessment.module.title}
        </p>
        <p className={`text-xs ${isPast ? "text-zinc-400" : "text-zinc-500"} dark:text-zinc-500`}>
          Deadline: {deadlineStr}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        {urgencyBadge && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
            {urgencyBadge}
          </span>
        )}
        {submission ? (
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              submission.isLate
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            }`}>
              {submission.isLate ? "Late" : "Submitted"}
            </span>
            {submission.grade?.isPublished && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                Graded
              </span>
            )}
          </div>
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isPast
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
          }`}>
            {isPast ? "Missed" : "Not submitted"}
          </span>
        )}
        <svg className="h-4 w-4 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Staff/registry assessment list
// ---------------------------------------------------------------------------
interface StaffAssessment {
  id: string;
  title: string;
  deadline: Date;
  module: { code: string; title: string; programme?: { name: string } | null };
  createdBy: { name: string };
  _count: { submissions: number };
}

function StaffAssessmentList({ assessments, role }: { assessments: StaffAssessment[]; role: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Assessment</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Module</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Deadline</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">Submissions</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {assessments.map((a) => {
            const deadlineStr = a.deadline.toLocaleString("en-GB", {
              day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            });
            const isPast = a.deadline < new Date();
            return (
              <tr key={a.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{a.title}</p>
                  <p className="text-xs text-zinc-400">by {a.createdBy.name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-zinc-700 dark:text-zinc-300">{a.module.code}</p>
                  <p className="text-xs text-zinc-400">{a.module.title}</p>
                  {a.module.programme && (
                    <p className="text-xs text-zinc-400">{a.module.programme.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${isPast ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-300"}`}>
                    {deadlineStr}
                  </span>
                  {isPast && <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">Closed</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-zinc-700 dark:text-zinc-300">{a._count.submissions}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/assessments/${a.id}`}
                      className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    >
                      View
                    </Link>
                    {["owner", "admin", "staff"].includes(role) && (
                      <Link
                        href={`/dashboard/marksheet/${a.id}`}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        Marksheet
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
