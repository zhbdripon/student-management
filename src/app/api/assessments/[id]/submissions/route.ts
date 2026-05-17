import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffOrAdminOrOwner, getAnyAuthenticatedMember } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";
import { FileType } from "@/generated/prisma/enums";

type Params = { params: Promise<{ id: string }> };

// GET /api/assessments/[id]/submissions
// - Staff/admin/owner: all submissions with student info and grade
// - Member: only their own submission
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await getAnyAuthenticatedMember(request.headers);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assessmentId } = await params;
  const { session, member } = auth;

  if (member.role === "member") {
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) return Response.json({ submissions: [] });

    const { data: submissions, response: err } = await dbQuery(
      () =>
        db.submission.findMany({
          where: { assessmentId, studentId: student.id },
          include: { grade: true },
        }),
      "GET /api/assessments/[id]/submissions (member)",
    );
    if (err) return err;
    return Response.json({ submissions });
  }

  // Staff/admin/owner
  const staffAuth = await getStaffOrAdminOrOwner(request.headers);
  if (!staffAuth) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { data: submissions, response: err } = await dbQuery(
    () =>
      db.submission.findMany({
        where: { assessmentId },
        include: {
          student: {
            select: { id: true, studentId: true, fullName: true, email: true },
          },
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
      }),
    "GET /api/assessments/[id]/submissions (staff)",
  );
  if (err) return err;

  return Response.json({ submissions });
}

// POST /api/assessments/[id]/submissions — student submits
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getAnyAuthenticatedMember(request.headers);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (auth.member.role !== "member")
    return Response.json({ error: "Only students can submit" }, { status: 403 });

  const { id: assessmentId } = await params;
  const { session } = auth;

  // Find linked student record
  const student = await db.student.findFirst({
    where: { userId: session.user.id },
    select: { id: true, programmeId: true },
  });
  if (!student)
    return Response.json(
      { error: "No student record is linked to your account. Please contact the Registry." },
      { status: 403 },
    );

  // Load assessment
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: { module: { select: { programmeId: true } } },
  });
  if (!assessment) return Response.json({ error: "Assessment not found" }, { status: 404 });

  // Check programme eligibility: student's programme must match module's programme (or module has none)
  if (
    assessment.module.programmeId !== null &&
    assessment.module.programmeId !== student.programmeId
  ) {
    return Response.json(
      { error: "This assessment is not available for your programme" },
      { status: 403 },
    );
  }

  // Check for existing submission
  const existing = await db.submission.findUnique({
    where: { assessmentId_studentId: { assessmentId, studentId: student.id } },
  });
  if (existing)
    return Response.json(
      {
        error:
          "You have already submitted for this assessment. Use the resubmit option to update your submission.",
      },
      { status: 409 },
    );

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
  const isLate = submittedAt > assessment.deadline;

  const { data: submission, response: err } = await dbQuery(
    () =>
      db.submission.create({
        data: {
          assessmentId,
          studentId: student.id,
          fileUrl: fileUrl.trim(),
          fileType: fileType as FileType,
          submittedAt,
          isLate,
        },
      }),
    "POST /api/assessments/[id]/submissions",
  );
  if (err) return err;

  return Response.json({ submission }, { status: 201 });
}
