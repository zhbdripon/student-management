import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAnyAuthenticatedMember } from "@/lib/auth-utils";
import { dbQuery } from "@/lib/db-error";

// GET /api/modules — list all modules, any authenticated user
export async function GET(request: NextRequest) {
  const member = await getAnyAuthenticatedMember(request.headers);
  if (!member) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: modules, response: err } = await dbQuery(
    () =>
      db.module.findMany({
        include: { programme: { select: { id: true, name: true } } },
        orderBy: { title: "asc" },
      }),
    "GET /api/modules",
  );
  if (err) return err;

  return Response.json({ modules });
}
