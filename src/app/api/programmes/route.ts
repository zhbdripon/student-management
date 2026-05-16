import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminOrOwner } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

export async function GET(request: NextRequest) {
  const admin = await getAdminOrOwner(request.headers);
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: programmes, response: err } = await dbQuery(
    () =>
      db.programme.findMany({
        select: { id: true, name: true, feeAmount: true },
        orderBy: { name: "asc" },
      }),
    "GET /api/programmes",
  );
  if (err) return err;

  return Response.json({ programmes });
}
