import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffOrAdminOrOwner, getAnyAuthenticatedMember } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";
import { classifyGrade } from "@/lib/grade-utils";

// GET /api/grades
// Query params: assessmentId, studentId
// - Staff/admin/owner: all grades (filtered by assessmentId and/or studentId)
// - Member: own published grades only
export async function GET(request: NextRequest) {
  const auth = await getAnyAuthenticatedMember(request.headers);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { session, member } = auth;
  const { searchParams } = request.nextUrl;
  const assessmentId = searchParams.get("assessmentId") ?? "";
  const studentId = searchParams.get("studentId") ?? "";

  if (member.role === "member") {
    // Student: only their own published grades
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) return Response.json({ grades: [] });

    const where: Record<string, unknown> = {
      studentId: student.id,
      isPublished: true,
    };
    if (assessmentId) {
      where.submission = { assessmentId };
    }

    const { data: grades, response: err } = await dbQuery(
      () =>
        db.grade.findMany({
          where,
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
          orderBy: { createdAt: "desc" },
        }),
      "GET /api/grades (member)",
    );
    if (err) return err;

    return Response.json({ grades });
  }

  // Staff/admin/owner
  const staffAuth = await getStaffOrAdminOrOwner(request.headers);
  if (!staffAuth) return Response.json({ error: "Forbidden" }, { status: 403 });

  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = studentId;
  if (assessmentId) {
    where.submission = { assessmentId };
  }

  const { data: grades, response: err } = await dbQuery(
    () =>
      db.grade.findMany({
        where,
        include: {
          student: { select: { id: true, studentId: true, fullName: true } },
          submission: {
            include: {
              assessment: {
                include: {
                  module: { select: { id: true, title: true, code: true } },
                },
              },
            },
          },
          gradedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    "GET /api/grades (staff)",
  );
  if (err) return err;

  return Response.json({ grades });
}

// POST /api/grades — staff only — staff/admin/owner enters a grade for a submission
export async function POST(request: NextRequest) {
  const auth = await getStaffOrAdminOrOwner(request.headers);
  if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (auth.member.role !== "staff") return Response.json({ error: "Only staff can enter grades" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { submissionId, numericGrade } = body as Record<string, unknown>;

  if (!submissionId) return Response.json({ error: "Submission ID is required" }, { status: 400 });

  const grade = Number(numericGrade);
  if (isNaN(grade) || grade < 0 || grade > 100)
    return Response.json({ error: "Grade must be a number between 0 and 100" }, { status: 400 });

  // Validate submission exists
  const submission = await db.submission.findUnique({
    where: { id: String(submissionId) },
    select: { id: true, studentId: true },
  });
  if (!submission) return Response.json({ error: "Submission not found" }, { status: 404 });

  // Check if grade already exists
  const existing = await db.grade.findUnique({
    where: { submissionId: String(submissionId) },
  });
  if (existing)
    return Response.json(
      { error: "A grade already exists for this submission. Use PATCH to update it." },
      { status: 409 },
    );

  const classification = classifyGrade(grade);

  const { data: createdGrade, response: err } = await dbQuery(
    () =>
      db.grade.create({
        data: {
          submissionId: String(submissionId),
          studentId: submission.studentId,
          numericGrade: Math.round(grade),
          classification,
          isPublished: false,
          gradedById: auth.session.user.id,
        },
      }),
    "POST /api/grades",
  );
  if (err) return err;

  return Response.json({ grade: createdGrade }, { status: 201 });
}
