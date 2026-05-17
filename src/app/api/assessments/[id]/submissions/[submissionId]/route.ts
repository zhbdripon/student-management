import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAnyAuthenticatedMember } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";
import { FileType } from "@/generated/prisma/enums";

type Params = { params: Promise<{ id: string; submissionId: string }> };

// PATCH /api/assessments/[id]/submissions/[submissionId] — student resubmits
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getAnyAuthenticatedMember(request.headers);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (auth.member.role !== "member")
    return Response.json({ error: "Only students can resubmit" }, { status: 403 });

  const { id: assessmentId, submissionId } = await params;
  const { session } = auth;

  // Find linked student record
  const student = await db.student.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return Response.json({ error: "No student record linked to your account" }, { status: 403 });

  // Load submission and verify ownership
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: {
      assessment: { select: { id: true, deadline: true } },
    },
  });
  if (!submission) return Response.json({ error: "Submission not found" }, { status: 404 });
  if (submission.assessmentId !== assessmentId)
    return Response.json({ error: "Submission does not belong to this assessment" }, { status: 400 });
  if (submission.studentId !== student.id)
    return Response.json({ error: "You can only update your own submission" }, { status: 403 });

  // Resubmission not allowed after deadline
  const now = new Date();
  if (now > submission.assessment.deadline) {
    return Response.json(
      { error: "The deadline has passed. Resubmission is no longer allowed." },
      { status: 422 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fileUrl, fileType } = body as Record<string, string>;

  if (!fileUrl?.trim()) return Response.json({ error: "File URL is required" }, { status: 400 });
  if (!fileType || !Object.values(FileType).includes(fileType as FileType))
    return Response.json({ error: "File type must be PDF or DOCX" }, { status: 400 });

  try {
    new URL(fileUrl.trim());
  } catch {
    return Response.json({ error: "Please enter a valid URL" }, { status: 400 });
  }

  const submittedAt = new Date();
  const isLate = submittedAt > submission.assessment.deadline;

  const { data: updated, response: err } = await dbQuery(
    () =>
      db.submission.update({
        where: { id: submissionId },
        data: {
          fileUrl: fileUrl.trim(),
          fileType: fileType as FileType,
          submittedAt,
          isLate,
        },
      }),
    "PATCH /api/assessments/[id]/submissions/[submissionId]",
  );
  if (err) return err;

  return Response.json({ submission: updated });
}
