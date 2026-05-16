import { db } from "@/lib/db";
import { EnrollmentStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export interface StudentFiltersInput {
  q?: string;
  programmeId?: string;
  status?: string;
  page?: string;
}

export type StudentRow = Prisma.StudentGetPayload<{
  include: { programme: { select: { id: true; name: true } } };
}>;

export interface FetchStudentsResult {
  students: StudentRow[];
  total: number;
  totalPages: number;
  page: number;
  offset: number;
}

export async function fetchStudents(
  filters: StudentFiltersInput
): Promise<FetchStudentsResult> {
  const q = filters.q?.trim() ?? "";
  const programmeId = filters.programmeId ?? "";
  const status = filters.status ?? "";
  const page = Math.max(1, parseInt(filters.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const validStatuses = Object.values(EnrollmentStatus) as string[];
  const where: Prisma.StudentWhereInput = {};

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

  const [students, total] = await Promise.all([
    db.student.findMany({
      where,
      include: { programme: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: offset,
    }),
    db.student.count({ where }),
  ]);

  return { students, total, totalPages: Math.ceil(total / PAGE_SIZE), page, offset };
}
