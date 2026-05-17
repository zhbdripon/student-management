import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffOrAdminOrOwner, getAnyAuthenticatedMember } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

// GET /api/assessments
// - Staff/admin/owner: all assessments with submission counts
// - Member: assessments for their programme's modules
export async function GET(request: NextRequest) {
  const auth = await getAnyAuthenticatedMember(request.headers);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { session, member } = auth;
  const { searchParams } = request.nextUrl;
  const moduleId = searchParams.get("moduleId") ?? "";

  if (member.role === "member") {
    // Student view: assessments for their programme
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true, programmeId: true },
    });

    if (!student) return Response.json({ assessments: [], studentMissing: true });

    const where: Record<string, unknown> = {
      OR: [
        { module: { programmeId: student.programmeId } },
        { module: { programmeId: null } },
      ],
    };
    if (moduleId) where.moduleId = moduleId;

    const { data: assessments, response: err } = await dbQuery(
      () =>
        db.assessment.findMany({
          where,
          include: {
            module: { select: { id: true, title: true, code: true } },
            submissions: {
              where: { studentId: student.id },
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
            },
          },
          orderBy: { deadline: "asc" },
        }),
      "GET /api/assessments (member)",
    );
    if (err) return err;

    return Response.json({ assessments, studentId: student.id });
  }

  // Staff/admin/owner: all assessments
  const where: Record<string, unknown> = {};
  if (moduleId) where.moduleId = moduleId;

  const { data: assessments, response: err } = await dbQuery(
    () =>
      db.assessment.findMany({
        where,
        include: {
          module: {
            include: { programme: { select: { id: true, name: true } } },
          },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { deadline: "desc" },
      }),
    "GET /api/assessments (staff)",
  );
  if (err) return err;

  return Response.json({ assessments });
}

// POST /api/assessments — staff only creates an assessment
export async function POST(request: NextRequest) {
  const auth = await getStaffOrAdminOrOwner(request.headers);
  if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (auth.member.role !== "staff") return Response.json({ error: "Only staff can create assessments" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, moduleId, deadline } = body as Record<string, string>;

  if (!title?.trim()) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!moduleId?.trim()) return Response.json({ error: "Module is required" }, { status: 400 });
  if (!deadline) return Response.json({ error: "Deadline is required" }, { status: 400 });

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime()))
    return Response.json({ error: "Invalid deadline date" }, { status: 400 });

  // Verify module exists
  const module = await db.module.findUnique({ where: { id: moduleId } });
  if (!module) return Response.json({ error: "Module not found" }, { status: 404 });

  const { data: assessment, response: err } = await dbQuery(
    () =>
      db.assessment.create({
        data: {
          title: title.trim(),
          moduleId,
          deadline: deadlineDate,
          createdById: auth.session.user.id,
        },
        include: {
          module: { select: { id: true, title: true, code: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    "POST /api/assessments",
  );
  if (err) return err;

  return Response.json({ assessment }, { status: 201 });
}
