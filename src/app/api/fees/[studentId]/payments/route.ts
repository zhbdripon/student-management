import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrOwner } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

type RouteContext = { params: Promise<{ studentId: string }> };

// ---------------------------------------------------------------------------
// POST /api/fees/[studentId]/payments
// Records a payment transaction against a student's fee record.
// Body: { amount, paidAt, referenceNumber, notes? }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { studentId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { amount, paidAt, referenceNumber, notes, feeRecordId } = body as Record<string, string>;

  // Validation
  if (!feeRecordId?.trim())
    return Response.json({ error: "feeRecordId is required" }, { status: 400 });
  if (!amount)
    return Response.json({ error: "Amount is required" }, { status: 400 });
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0)
    return Response.json(
      { error: "Amount must be a positive number" },
      { status: 400 },
    );
  if (numAmount > 9999999.99)
    return Response.json({ error: "Amount is too large" }, { status: 400 });

  if (!paidAt)
    return Response.json({ error: "Payment date is required" }, { status: 400 });
  const paymentDate = new Date(paidAt);
  if (isNaN(paymentDate.getTime()))
    return Response.json({ error: "Invalid payment date" }, { status: 400 });

  if (!referenceNumber?.trim())
    return Response.json(
      { error: "Reference number is required" },
      { status: 400 },
    );
  if (referenceNumber.trim().length > 100)
    return Response.json(
      { error: "Reference number must be 100 characters or fewer" },
      { status: 400 },
    );

  // Verify the fee record exists and belongs to this student
  const { data: feeRecord, response: feeErr } = await dbQuery(
    () => db.feeRecord.findFirst({ where: { id: feeRecordId, studentId } }),
    `POST /api/fees/${studentId}/payments — fee lookup`,
  );
  if (feeErr) return feeErr;
  if (!feeRecord)
    return Response.json(
      { error: "Fee record not found for this student." },
      { status: 404 },
    );

  const { data: payment, response: createErr } = await dbQuery(
    () =>
      db.paymentTransaction.create({
        data: {
          feeRecordId: feeRecord.id,
          amount: numAmount,
          paidAt: paymentDate,
          referenceNumber: referenceNumber.trim(),
          notes: notes?.trim() || null,
        },
      }),
    `POST /api/fees/${studentId}/payments — create`,
  );
  if (createErr) return createErr;

  return Response.json({ payment }, { status: 201 });
}
