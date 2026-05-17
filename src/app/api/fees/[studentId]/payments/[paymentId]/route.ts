import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrOwner } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

type RouteContext = {
  params: Promise<{ studentId: string; paymentId: string }>;
};

// ---------------------------------------------------------------------------
// DELETE /api/fees/[studentId]/payments/[paymentId]
// Removes a payment transaction.
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, paymentId } = await context.params;

  // Verify the payment belongs to this student's fee record
  const { data: payment, response: lookupErr } = await dbQuery(
    () =>
      db.paymentTransaction.findFirst({
        where: {
          id: paymentId,
          feeRecord: { studentId },
        },
      }),
    `DELETE /api/fees/${studentId}/payments/${paymentId} — lookup`,
  );
  if (lookupErr) return lookupErr;
  if (!payment)
    return Response.json({ error: "Payment not found" }, { status: 404 });

  const { response: deleteErr } = await dbQuery(
    () => db.paymentTransaction.delete({ where: { id: paymentId } }),
    `DELETE /api/fees/${studentId}/payments/${paymentId} — delete`,
  );
  if (deleteErr) return deleteErr;

  return new Response(null, { status: 204 });
}
