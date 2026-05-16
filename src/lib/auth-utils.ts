import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Returns the current session, or null if not authenticated.
 * Use in server components / route handlers.
 */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Used in Server Components (pages/layouts).
 * Redirects to /sign-in if not authenticated.
 * Redirects to / if authenticated but not admin/owner.
 * Returns { session, member } on success.
 */
export async function requireAdminOrOwnerPage() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const member = await db.member.findFirst({
    where: { userId: session.user.id, role: { in: ["owner", "admin"] } },
  });

  if (!member) redirect("/");
  return { session, member };
}

/**
 * Used in Route Handlers.
 * Returns { session, member } or null if not authorized.
 */
export async function getAdminOrOwner(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const member = await db.member.findFirst({
    where: { userId: session.user.id, role: { in: ["owner", "admin"] } },
  });

  if (!member) return null;
  return { session, member };
}
