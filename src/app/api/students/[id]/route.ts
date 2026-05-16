import { EnrollmentStatus } from "@/generated/prisma/enums";
import { getAdminOrOwner } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { dbQuery } from "@/lib/db-error";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const { data: student, response: err } = await dbQuery(
    () =>
      db.student.findUnique({
        where: { id },
        include: {
          programme: { select: { id: true, name: true } },
          feeRecord: {
            include: { payments: { orderBy: { paidAt: "desc" } } },
          },
        },
      }),
    `GET /api/students/${id}`,
  );
  if (err) return err;

  if (!student) {
    return Response.json({ error: "Student not found" }, { status: 404 });
  }

  return Response.json({ student });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const { data: existing, response: fetchErr } = await dbQuery(
    () => db.student.findUnique({ where: { id } }),
    `PATCH /api/students/${id} — existence check`,
  );
  if (fetchErr) return fetchErr;
  if (!existing) {
    return Response.json({ error: "Student not found" }, { status: 404 });
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

  const updates: Record<string, unknown> = {};

  if (fullName !== undefined) {
    if (!fullName.trim())
      return Response.json(
        { error: "Full name cannot be empty" },
        { status: 400 },
      );
    updates.fullName = fullName.trim();
  }

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }
    const normalised = email.trim().toLowerCase();
    // Check for duplicate email (excluding this student)
    const { data: dup, response: dupErr } = await dbQuery(
      () => db.student.findFirst({ where: { email: normalised, NOT: { id } } }),
      `PATCH /api/students/${id} — duplicate email check`,
    );
    if (dupErr) return dupErr;
    if (dup) {
      return Response.json(
        { error: "A student with this email already exists" },
        { status: 409 },
      );
    }
    updates.email = normalised;
  }

  if (dateOfBirth !== undefined) {
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
    updates.dateOfBirth = dob;
  }

  if (programmeId !== undefined) {
    const { data: programme, response: progErr } = await dbQuery(
      () => db.programme.findUnique({ where: { id: programmeId } }),
      `PATCH /api/students/${id} — programme lookup`,
    );
    if (progErr) return progErr;
    if (!programme) {
      return Response.json({ error: "Programme not found" }, { status: 400 });
    }
    updates.programmeId = programmeId;
  }

  if (academicYear !== undefined) {
    if (!/^\d{4}\/\d{4}$/.test(academicYear)) {
      return Response.json(
        { error: "Academic year must be in format YYYY/YYYY (e.g. 2025/2026)" },
        { status: 400 },
      );
    }
    updates.academicYear = academicYear.trim();
  }

  if (enrollmentStatus !== undefined) {
    const validStatuses = Object.values(EnrollmentStatus) as string[];
    if (!validStatuses.includes(enrollmentStatus)) {
      return Response.json(
        { error: "Invalid enrollment status" },
        { status: 400 },
      );
    }
    updates.enrollmentStatus = enrollmentStatus as EnrollmentStatus;
  }

  const { data: student, response: updateErr } = await dbQuery(
    () =>
      db.student.update({
        where: { id },
        data: updates,
        include: { programme: { select: { id: true, name: true } } },
      }),
    `PATCH /api/students/${id} — update`,
  );
  if (updateErr) return updateErr;

  return Response.json({ student });
}
