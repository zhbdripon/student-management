import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrOwner } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

type RouteContext = { params: Promise<{ studentId: string }> };

// ---------------------------------------------------------------------------
// GET /api/fees/[studentId]
// Returns the fee record (with payments) for a student.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { studentId } = await context.params;

  const { data: student, response: err } = await dbQuery(
    () =>
      db.student.findUnique({
        where: { id: studentId },
        include: {
          programme: { select: { id: true, name: true, feeAmount: true } },
          feeRecords: {
            include: {
              payments: { orderBy: { paidAt: "desc" } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    `GET /api/fees/${studentId}`,
  );
  if (err) return err;

  if (!student)
    return Response.json({ error: "Student not found" }, { status: 404 });

  return Response.json({ student });
}

// ---------------------------------------------------------------------------
// PATCH /api/fees/[studentId]
// Updates the due date of a specific fee record.
// Body: { feeRecordId, dueDate }
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { studentId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { feeRecordId, dueDate } = body as Record<string, string>;
  if (!feeRecordId?.trim())
    return Response.json({ error: "feeRecordId is required" }, { status: 400 });
  if (!dueDate)
    return Response.json({ error: "dueDate is required" }, { status: 400 });

  const due = new Date(dueDate);
  if (isNaN(due.getTime()))
    return Response.json({ error: "Invalid due date" }, { status: 400 });

  // Verify the fee record belongs to this student
  const { data: existing, response: lookupErr } = await dbQuery(
    () => db.feeRecord.findFirst({ where: { id: feeRecordId, studentId } }),
    `PATCH /api/fees/${studentId} — lookup`,
  );
  if (lookupErr) return lookupErr;
  if (!existing)
    return Response.json(
      { error: "Fee record not found for this student" },
      { status: 404 },
    );

  const { data: feeRecord, response: updateErr } = await dbQuery(
    () => db.feeRecord.update({ where: { id: feeRecordId }, data: { dueDate: due } }),
    `PATCH /api/fees/${studentId} — update`,
  );
  if (updateErr) return updateErr;

  return Response.json({ feeRecord });
}
