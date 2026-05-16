import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
} from "better-auth/plugins/organization/access";

/**
 * Roles used in this application (stored as the `role` field on the `member` table):
 *
 *   "owner"  — Institution owner / superuser (auto-assigned to the org creator)
 *   "admin"  — Registry Administrator: full CRUD on all resources
 *   "staff"  — Academic staff: create assessments, enter grades, publish results
 *   "member" — Student: view own records, submit work, read published grades only
 *
 * Default Better Auth org actions:
 *   organization → ["update", "delete"]
 *   member       → ["create", "update", "delete"]
 *   invitation   → ["create", "cancel"]
 *
 * App-level permission checks (who can create assessments, enter grades, etc.)
 * are done by reading `activeMember.role` in route handlers — not via this AC.
 */
export const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

// Registry Administrator — inherits the full built-in admin permission set.
export const adminRole = ac.newRole({
  ...adminAc.statements,
});

// Academic staff — can invite students into the organization.
export const staffRole = ac.newRole({
  invitation: ["create", "cancel"],
});

// Student — no org-management permissions.
export const memberRole = ac.newRole({});
