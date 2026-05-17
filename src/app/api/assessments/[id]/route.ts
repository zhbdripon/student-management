import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffOrAdminOrOwner, getAnyAuthenticatedMember } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

type Params = { params: Promise<{ id: string }> };

// GET /api/assessments/[id]
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await getAnyAuthenticatedMember(request.headers);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { session, member } = auth;

  if (member.role === "member") {
    const student = await db.student.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const { data: assessment, response: err } = await dbQuery(
      () =>
        db.assessment.findUnique({
          where: { id },
          include: {
            module: { select: { id: true, title: true, code: true } },
            submissions: student
              ? {
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
                }
              : false,
          },
        }),
      "GET /api/assessments/[id] (member)",
    );
    if (err) return err;
    if (!assessment) return Response.json({ error: "Assessment not found" }, { status: 404 });

    return Response.json({ assessment, studentId: student?.id ?? null });
  }

  // Staff/admin/owner
  const { data: assessment, response: err } = await dbQuery(
    () =>
      db.assessment.findUnique({
        where: { id },
        include: {
          module: {
            include: { programme: { select: { id: true, name: true } } },
          },
          createdBy: { select: { id: true, name: true } },
          submissions: {
            include: {
              student: {
                select: {
                  id: true,
                  studentId: true,
                  fullName: true,
                  email: true,
                },
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
          },
          _count: { select: { submissions: true } },
        },
      }),
    "GET /api/assessments/[id] (staff)",
  );
  if (err) return err;
  if (!assessment) return Response.json({ error: "Assessment not found" }, { status: 404 });

  return Response.json({ assessment });
}

// PATCH /api/assessments/[id] — staff/admin/owner update
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getStaffOrAdminOrOwner(request.headers);
  if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, deadline } = body as Record<string, string>;
  const data: Record<string, unknown> = {};

  if (title !== undefined) {
    if (!title.trim()) return Response.json({ error: "Title cannot be empty" }, { status: 400 });
    data.title = title.trim();
  }
  if (deadline !== undefined) {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return Response.json({ error: "Invalid deadline" }, { status: 400 });
    data.deadline = d;
  }

  if (Object.keys(data).length === 0)
    return Response.json({ error: "No fields to update" }, { status: 400 });

  const { data: assessment, response: err } = await dbQuery(
    () => db.assessment.update({ where: { id }, data }),
    "PATCH /api/assessments/[id]",
  );
  if (err) return err;

  return Response.json({ assessment });
}

// DELETE /api/assessments/[id] — admin/owner only
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await getStaffOrAdminOrOwner(request.headers);
  if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Only admin/owner can delete
  if (!["owner", "admin"].includes(auth.member.role))
    return Response.json({ error: "Only administrators can delete assessments" }, { status: 403 });

  const { id } = await params;

  const { data: assessment, response: err } = await dbQuery(
    () => db.assessment.delete({ where: { id } }),
    "DELETE /api/assessments/[id]",
  );
  if (err) return err;

  return Response.json({ assessment });
}
