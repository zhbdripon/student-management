import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrOwner } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// GET /api/fees
// Returns paginated list of students with their fee record status.
// Query params: q, programmeId, feeStatus (all|overdue|paid|partial|pending|unassigned), page
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const programmeId = searchParams.get("programmeId") ?? "";
  const feeStatus = searchParams.get("feeStatus") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const studentWhere: Record<string, unknown> = {};
  if (q) {
    studentWhere.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { studentId: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (programmeId) studentWhere.programmeId = programmeId;
  if (feeStatus === "unassigned") studentWhere.feeRecords = { none: {} };
  if (feeStatus !== "unassigned" && feeStatus !== "all")
    studentWhere.feeRecords = { some: {} };

  const { data: result, response: err } = await dbQuery(
    () =>
      Promise.all([
        db.student.findMany({
          where: studentWhere,
          include: {
            programme: { select: { id: true, name: true } },
            feeRecords: { include: { payments: { select: { amount: true } } } },
          },
          orderBy: { fullName: "asc" },
          take: PAGE_SIZE,
          skip: offset,
        }),
        db.student.count({ where: studentWhere }),
      ]),
    "GET /api/fees",
  );
  if (err) return err;

  const [students, total] = result;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = students.map((s) => {
    if (s.feeRecords.length === 0) {
      return { ...s, feeStatus: "unassigned", totalPaid: 0, outstanding: 0, totalAmount: 0, feeCount: 0 };
    }
    let totalAmount = 0;
    let totalPaid = 0;
    let hasOverdue = false;
    for (const fr of s.feeRecords) {
      const amt = Number(fr.totalAmount);
      const paid = fr.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      totalAmount += amt;
      totalPaid += paid;
      const dueDate = new Date(fr.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (paid < amt && dueDate < today) hasOverdue = true;
    }
    const outstanding = Math.max(0, totalAmount - totalPaid);
    let feeStatus: string;
    if (outstanding <= 0) feeStatus = "paid";
    else if (hasOverdue) feeStatus = "overdue";
    else if (totalPaid > 0) feeStatus = "partial";
    else feeStatus = "pending";
    return { ...s, feeStatus, totalPaid, outstanding, totalAmount, feeCount: s.feeRecords.length };
  });

  // Filter by computed status after aggregation (for overdue/paid/partial/pending)
  const COMPUTED_STATUSES = ["overdue", "paid", "partial", "pending"];
  const filtered =
    COMPUTED_STATUSES.includes(feeStatus)
      ? rows.filter((r) => r.feeStatus === feeStatus)
      : rows;

  return Response.json({
    students: filtered,
    total: COMPUTED_STATUSES.includes(feeStatus) ? filtered.length : total,
    page,
    limit: PAGE_SIZE,
  });
}

// ---------------------------------------------------------------------------
// POST /api/fees
// Creates a new FeeRecord for a student.
// Body: { studentId, label, amount, dueDate }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { studentId, label, amount, dueDate } = body as Record<string, string>;

  if (!studentId?.trim())
    return Response.json({ error: "studentId is required" }, { status: 400 });
  if (!label?.trim())
    return Response.json({ error: "label is required" }, { status: 400 });
  if (label.trim().length > 100)
    return Response.json({ error: "Label must be 100 characters or fewer" }, { status: 400 });
  if (!amount)
    return Response.json({ error: "amount is required" }, { status: 400 });
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0)
    return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
  if (numAmount > 9999999.99)
    return Response.json({ error: "Amount is too large" }, { status: 400 });
  if (!dueDate)
    return Response.json({ error: "dueDate is required" }, { status: 400 });

  const due = new Date(dueDate);
  if (isNaN(due.getTime()))
    return Response.json({ error: "Invalid due date" }, { status: 400 });

  // Verify student exists
  const { data: student, response: studentErr } = await dbQuery(
    () => db.student.findUnique({ where: { id: studentId }, select: { id: true } }),
    "POST /api/fees — student lookup",
  );
  if (studentErr) return studentErr;
  if (!student)
    return Response.json({ error: "Student not found" }, { status: 404 });

  const { data: feeRecord, response: createErr } = await dbQuery(
    () =>
      db.feeRecord.create({
        data: {
          studentId,
          label: label.trim(),
          totalAmount: numAmount,
          dueDate: due,
        },
        include: { payments: true },
      }),
    "POST /api/fees — create fee record",
  );
  if (createErr) return createErr;

  return Response.json({ feeRecord }, { status: 201 });
}
