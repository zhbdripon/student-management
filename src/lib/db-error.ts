import { Prisma } from "@/generated/prisma/client";

/**
 * Unique-constraint field → user-facing message map.
 * Keys are the column names returned in `err.meta.target`.
 */
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  email: "A student with this email already exists",
  studentId: "Student ID conflict — please try again",
  slug: "This slug is already taken",
  code: "A module with this code already exists",
  name: "A record with this name already exists",
  referenceNumber: "A payment with this reference number already exists",
};

/**
 * Wraps a Prisma database operation and maps known errors to HTTP Response objects.
 *
 * - P2002 (unique constraint)  → 409 Conflict with a field-specific message
 * - P2025 (record not found)   → 404 Not Found
 * - All other DB errors        → 500 Internal Server Error (logged to console)
 *
 * Returns `{ data }` on success or `{ response }` on error.
 * The caller decides what to do with `data`; if `response` is present it should
 * be returned immediately.
 *
 * @example
 * const { data: student, response } = await dbQuery(
 *   () => db.student.findUnique({ where: { id } }),
 *   "GET /api/students/[id]"
 * );
 * if (response) return response;
 */
export async function dbQuery<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<{ data: T; response?: never } | { data?: never; response: Response }> {
  try {
    const data = await operation();
    return { data };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation
      if (err.code === "P2002") {
        const fields = err.meta?.target as string[] | undefined;
        const field = fields?.[0] ?? "";
        const message =
          UNIQUE_CONSTRAINT_MESSAGES[field] ??
          "A record with these details already exists";
        return {
          response: Response.json({ error: message }, { status: 409 }),
        };
      }

      // Record not found (e.g. update/delete on a non-existent row)
      if (err.code === "P2025") {
        return {
          response: Response.json({ error: "Record not found" }, { status: 404 }),
        };
      }
    }

    console.error(`[DB Error] ${context}:`, err);
    return {
      response: Response.json(
        { error: "A database error occurred. Please try again." },
        { status: 500 },
      ),
    };
  }
}
