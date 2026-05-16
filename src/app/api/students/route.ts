import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrOwner } from "@/lib/auth-utils";
import { EnrollmentStatus } from "@/generated/prisma/enums";
import { dbQuery } from "@/lib/db-error";

async function generateStudentId(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SMS-${year}-`;
  const lastStudent = await tx.student.findFirst({
    where: { studentId: { startsWith: prefix } },
    orderBy: { studentId: "desc" },
    select: { studentId: true },
  });
  const nextNumber = lastStudent
    ? parseInt(lastStudent.studentId.slice(-4), 10) + 1
    : 1;
  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const programmeId = searchParams.get("programmeId") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const validStatuses = Object.values(EnrollmentStatus) as string[];
  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { studentId: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (programmeId) where.programmeId = programmeId;
  if (status && validStatuses.includes(status)) {
    where.enrollmentStatus = status as EnrollmentStatus;
  }

  const { data: result, response: listErr } = await dbQuery(
    () =>
      Promise.all([
        db.student.findMany({
          where,
          include: { programme: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        db.student.count({ where }),
      ]),
    "GET /api/students",
  );
  if (listErr) return listErr;
  const [students, total] = result;

  return Response.json({ students, total, page, limit });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    fullName,
    email,
    dateOfBirth,
    programmeId,
    academicYear,
    enrollmentStatus,
  } = body as Record<string, string>;

  // Required field validation
  if (!fullName?.trim())
    return Response.json({ error: "Full name is required" }, { status: 400 });
  if (!email?.trim())
    return Response.json({ error: "Email is required" }, { status: 400 });
  if (!dateOfBirth)
    return Response.json(
      { error: "Date of birth is required" },
      { status: 400 },
    );
  if (!programmeId)
    return Response.json({ error: "Programme is required" }, { status: 400 });
  if (!academicYear?.trim())
    return Response.json(
      { error: "Academic year is required" },
      { status: 400 },
    );

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Academic year format: YYYY/YYYY
  if (!/^\d{4}\/\d{4}$/.test(academicYear)) {
    return Response.json(
      { error: "Academic year must be in format YYYY/YYYY (e.g. 2025/2026)" },
      { status: 400 },
    );
  }

  // Date of birth: must be a valid date in the past, and student should be at least 15
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) {
    return Response.json({ error: "Invalid date of birth" }, { status: 400 });
  }
  const minDob = new Date();
  minDob.setFullYear(minDob.getFullYear() - 15);
  if (dob > minDob) {
    return Response.json(
      { error: "Student must be at least 15 years old" },
      { status: 400 },
    );
  }

  // Enrollment status validation
  const validStatuses = Object.values(EnrollmentStatus) as string[];
  const status =
    enrollmentStatus && validStatuses.includes(enrollmentStatus)
      ? (enrollmentStatus as EnrollmentStatus)
      : EnrollmentStatus.ENROLLED;

  // Programme exists?
  const { data: programme, response: progErr } = await dbQuery(
    () => db.programme.findUnique({ where: { id: programmeId } }),
    "POST /api/students — programme lookup",
  );
  if (progErr) return progErr;
  if (!programme) {
    return Response.json({ error: "Programme not found" }, { status: 400 });
  }

  // Duplicate email?
  const { data: existingEmail, response: emailErr } = await dbQuery(
    () => db.student.findUnique({ where: { email: email.trim().toLowerCase() } }),
    "POST /api/students — duplicate email check",
  );
  if (emailErr) return emailErr;
  if (existingEmail) {
    return Response.json(
      { error: "A student with this email already exists" },
      { status: 409 },
    );
  }

  // Create student in a transaction for safe sequential ID generation
  const { data: student, response: createErr } = await dbQuery(
    () =>
      db.$transaction(async (tx) => {
        const studentId = await generateStudentId(tx);
        return tx.student.create({
          data: {
            studentId,
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            dateOfBirth: dob,
            programmeId,
            academicYear: academicYear.trim(),
            enrollmentStatus: status,
          },
          include: { programme: { select: { id: true, name: true } } },
        });
      }),
    "POST /api/students — create transaction",
  );
  if (createErr) return createErr;

  return Response.json({ student }, { status: 201 });
}
