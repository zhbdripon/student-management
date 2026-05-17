import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrOwner } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

type RouteContext = {
  params: Promise<{ studentId: string; feeRecordId: string }>;
};

// ---------------------------------------------------------------------------
// DELETE /api/fees/[studentId]/records/[feeRecordId]
// Deletes a specific fee record (and cascades to its payments).
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, feeRecordId } = await context.params;

  // Verify ownership
  const { data: record, response: lookupErr } = await dbQuery(
    () => db.feeRecord.findFirst({ where: { id: feeRecordId, studentId } }),
    `DELETE /api/fees/${studentId}/records/${feeRecordId} — lookup`,
  );
  if (lookupErr) return lookupErr;
  if (!record)
    return Response.json({ error: "Fee record not found" }, { status: 404 });

  const { response: deleteErr } = await dbQuery(
    () => db.feeRecord.delete({ where: { id: feeRecordId } }),
    `DELETE /api/fees/${studentId}/records/${feeRecordId} — delete`,
  );
  if (deleteErr) return deleteErr;

  return new Response(null, { status: 204 });
}
