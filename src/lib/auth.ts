import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { db } from "@/lib/db";
import { ac, adminRole, staffRole, memberRole } from "@/lib/auth-permissions";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      // Only existing admins/owners can invite new members — no self-sign-up into an org.
      allowUserToCreateOrganization: false,
      ac,
      roles: {
        admin: adminRole,
        staff: staffRole,
        member: memberRole,
      },
    }),
  ],
});
