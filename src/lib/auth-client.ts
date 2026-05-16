import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { ac, adminRole, staffRole, memberRole } from "@/lib/auth-permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    organizationClient({
      ac,
      roles: {
        admin: adminRole,
        staff: staffRole,
        member: memberRole,
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
