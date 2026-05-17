import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffOrAdminOrOwner } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";
import { classifyGrade } from "@/lib/grade-utils";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/grades/[id] — staff only: update grade value, publish, or withhold
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getStaffOrAdminOrOwner(request.headers);
  if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (auth.member.role !== "staff") return Response.json({ error: "Only staff can update grades" }, { status: 403 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.numericGrade !== undefined) {
    const grade = Number(body.numericGrade);
    if (isNaN(grade) || grade < 0 || grade > 100)
      return Response.json({ error: "Grade must be between 0 and 100" }, { status: 400 });
    data.numericGrade = Math.round(grade);
    data.classification = classifyGrade(Math.round(grade));
    data.gradedById = auth.session.user.id;
  }

  if (body.isPublished !== undefined) {
    data.isPublished = Boolean(body.isPublished);
    data.publishedAt = Boolean(body.isPublished) ? new Date() : null;
  }

  if (Object.keys(data).length === 0)
    return Response.json({ error: "No fields to update" }, { status: 400 });

  const { data: grade, response: err } = await dbQuery(
    () => db.grade.update({ where: { id }, data }),
    "PATCH /api/grades/[id]",
  );
  if (err) return err;

  return Response.json({ grade });
}
