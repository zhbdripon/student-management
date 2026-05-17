<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Guide — Student Management

## Project Overview

A **Student Management** web application built with:

- **Framework**: Next.js 15+ (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma

---

## Project Structure

```
student-management/
├── prisma/
│   ├── schema.prisma          # Database schema (models: Student, Course, Enrollment)
│   └── migrations/            # Auto-generated migration files
├── prisma.config.ts           # Prisma config (uses dotenv, points to schema)
├── src/
│   ├── app/                   # Next.js App Router pages and layouts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   └── db.ts              # Prisma client singleton (import { db } from "@/lib/db")
│   └── generated/
│       └── prisma/            # Auto-generated Prisma client (do NOT edit manually)
├── .env                       # Local environment variables (gitignored)
└── AGENTS.md                  # This file
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values.

| Variable       | Description                        | Example                    |
| -------------- | ---------------------------------- | -------------------------- |
| `DB_USER`      | PostgreSQL username                | `postgres`                 |
| `DB_PASSWORD`  | PostgreSQL password                | `password`                 |
| `DB_HOST`      | PostgreSQL host                    | `localhost`                |
| `DB_PORT`      | Host-side mapped port              | `5433`                     |
| `DB_NAME`      | Database name                      | `student_management`       |
| `DATABASE_URL` | Full connection string (Prisma)    | `postgresql://...`         |

> `DATABASE_URL` must be kept in sync with the individual vars above.
> Docker Compose reads the individual vars; Prisma reads `DATABASE_URL`.

---

## Database

### Models

#### Auth models (managed by Better Auth — do NOT edit manually)

| Model          | Table          | Description                                                  |
| -------------- | -------------- | ------------------------------------------------------------ |
| `User`         | `user`         | Authenticated user — name, email, emailVerified, image       |
| `Session`      | `session`      | Active session with expiry, IP address, and user-agent       |
| `Account`      | `account`      | Links a user to an auth provider; stores hashed password     |
| `Verification` | `verification` | Short-lived tokens for email verification                    |

#### Application models

| Model                | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `Programme`          | Academic programme with a name, optional description, and base `feeAmount`           |
| `Student`            | Student record with auto-generated `studentId` (SMS-YYYY-XXXX), linked to a `User`  |
| `FeeRecord`          | One fee record per student; `totalAmount` copied from programme; tracks `dueDate`    |
| `PaymentTransaction` | Individual payment against a `FeeRecord`; has a unique `referenceNumber`             |
| `Module`             | Teaching module (e.g. "CS101") belonging to a `Programme`                            |
| `Assessment`         | Assessment created by staff within a `Module`; has a `deadline`                      |
| `Submission`         | File submission (PDF/DOCX) by a student; `@@unique([assessmentId, studentId])`; `isLate` set at creation |
| `Grade`              | Grade (0–100) entered by staff; `classification` derived and stored; `isPublished` controls student visibility |

### Common Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply a new migration
npx prisma migrate dev --name <migration-name>

# Apply pending migrations in production
npx prisma migrate deploy

# Reset database (dev only — drops all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## Authentication

Authentication is handled by **[Better Auth](https://better-auth.com)**.

### Strategy: Email & Password

Email/password sign-up and sign-in are enabled. Passwords are hashed with `scrypt` (Node.js built-in).

### RBAC (Role-Based Access Control)

Roles are managed via the Better Auth **organization** plugin. Each user's role is stored in the `member` table (not on the `user` row), scoped to the single institution organization.

| Role      | Description                                                                 |
| --------- | --------------------------------------------------------------------------- |
| `owner`   | Institution superuser — auto-assigned to the org creator                    |
| `admin`   | Registry Administrator — full CRUD on all resources                         |
| `staff`   | Academic staff — create assessments, enter grades, publish/withhold results  |
| `member`  | Student — view own records, upload submissions, read published grades only  |

Custom permissions are defined in `src/lib/auth-permissions.ts` using `createAccessControl`. The same `ac` and role objects are passed to both the server plugin and the client plugin for type-safe permission checks.

#### Checking permissions server-side

```ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Check if the current session user has a specific permission
const result = await auth.api.hasPermission({
  headers: await headers(),
  body: { permissions: { member: ["create"] } },
});
if (!result.success) {
  return new Response("Forbidden", { status: 403 });
}

// Or read the active member role directly
const activeMember = await auth.api.getActiveMember({
  headers: await headers(),
});
if (activeMember?.role !== "admin" && activeMember?.role !== "staff") {
  return new Response("Forbidden", { status: 403 });
}
```

#### Checking permissions client-side

```ts
import { authClient } from "@/lib/auth-client";

// Runtime check (hits the server)
const { success } = await authClient.organization.hasPermission({
  permissions: { member: ["create"] },
});

// Static check (client-side only, no dynamic roles)
const allowed = authClient.organization.checkRolePermission({
  role: "staff",
  permissions: { organization: ["read"] },
});
```

### Key files

| File                                         | Purpose                                                          |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/auth.ts`                            | Server-side Better Auth instance (Prisma adapter, org plugin)    |
| `src/lib/auth-client.ts`                     | Client-side auth instance (`signIn`, `signUp`, etc.)             |
| `src/lib/auth-permissions.ts`                | Access-control statements, role definitions shared by server/client |
| `src/app/api/auth/[...all]/route.ts`         | Catch-all API route that mounts the auth handler                 |
| `src/app/sign-up/page.tsx`                   | Registration form (name, email, password)                        |
| `src/app/sign-in/page.tsx`                   | Login form (email, password)                                     |

### Environment variables

| Variable              | Description                             |
| --------------------- | --------------------------------------- |
| `BETTER_AUTH_SECRET`  | 32-byte secret used for signing tokens  |
| `BETTER_AUTH_URL`     | Base URL of the app (e.g. `http://localhost:3000`) |

### Usage

```ts
// Server Component / Route Handler
import { auth } from "@/lib/auth";
const session = await auth.api.getSession({ headers: request.headers });

// Client Component
import { signIn, signUp, signOut, useSession } from "@/lib/auth-client";
const { data: session } = useSession();
```

---

## Using the Database Client

Import `db` from `@/lib/db` — singleton `PrismaClient` safe for Server Components and Route Handlers.

```ts
import { db } from "@/lib/db";

const students = await db.student.findMany();
```

---

## Fees & Payments

The fees module lives at `/dashboard/fees` and is restricted to `owner` and `admin` roles.

### Fee status lifecycle

| Status        | Condition                                                        |
| ------------- | ---------------------------------------------------------------- |
| `unassigned`  | Student has no `FeeRecord` yet                                   |
| `pending`     | `FeeRecord` exists, outstanding > 0, due date not yet passed     |
| `partial`     | Some payments made, outstanding > 0, due date not yet passed     |
| `overdue`     | Outstanding > 0 and due date has passed                          |
| `paid`        | Outstanding balance = 0                                          |

Outstanding balance is **computed in application code** — not stored. It is derived as `totalAmount - SUM(payments.amount)`.

### Route map

| Route | Description |
| ----- | ----------- |
| `/dashboard/fees` | Fees overview — all students with stats, filters, overdue flags |
| `/dashboard/fees/[studentId]` | Student fee detail — summary, progress bar, payment history, add payment |

### API routes

| Endpoint | Methods | Description |
| -------- | ------- | ----------- |
| `/api/fees` | `GET`, `POST` | List students with fee data / initialise a fee record |
| `/api/fees/[studentId]` | `GET`, `PATCH` | Get fee detail / update due date |
| `/api/fees/[studentId]/payments` | `POST` | Record a payment |
| `/api/fees/[studentId]/payments/[paymentId]` | `DELETE` | Remove a payment |

### Fee initialisation

Fees are **not** auto-created on student enrolment. An admin visits `/dashboard/fees/[studentId]` or clicks "Assign" in the fees table. The `totalAmount` is copied from `student.programme.feeAmount`; the admin sets the `dueDate`. Only one `FeeRecord` per student is allowed (`@@unique`).

### Reference number generation

The client auto-generates a reference in the format `PAY-YYYYMMDD-XXXX` (e.g. `PAY-20260517-4321`). The admin can override it. Uniqueness is enforced at the DB level; `dbQuery` surfaces a `409` conflict if a duplicate is submitted.

### Shared utilities

`src/lib/fee-utils.ts` contains:
- `computeFeeStatus(feeRecord, today)` — returns `{ status, totalPaid, totalAmount, outstanding }`
- `formatCurrency(value)` — GBP currency formatter
- `FEE_STATUS_LABELS` — display strings for each status

### Shared components

| Component | Purpose |
| --------- | ------- |
| `src/components/fees/fee-status-badge.tsx` | Colour-coded badge for each fee status |
| `src/components/fees/fee-table.tsx` | Sortable overview table with "Manage/Assign" links |
| `src/components/fees/fee-filters.tsx` | Search + programme + status dropdowns (URL-driven) |
| `src/components/fees/initialize-fee-form.tsx` | Client form to create a FeeRecord for a student |
| `src/components/fees/payment-form.tsx` | Client form to record a PaymentTransaction |
| `src/components/fees/payments-table.tsx` | Payment history table with delete action |
| `src/components/fees/edit-due-date-form.tsx` | Inline edit for the due date on the fee detail page |

### Student detail integration

The student detail page (`/dashboard/students/[id]`) shows a compact fee summary card (status, paid, outstanding) with a link to the full fees page.

---

```bash
npm install      # Install dependencies
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Lint
```

---

## Conventions

- **Server-side data access**: use `db` in Server Components or `route.ts` handlers directly — never expose Prisma to the browser.
- **Migrations**: always run `prisma migrate dev` after editing `schema.prisma`.
- **Regenerate types**: after schema changes run `prisma generate` to keep TypeScript types in sync.
- **File naming**: use `kebab-case` for files and folders inside `src/app/`.
- **Components**: place shared UI in `src/components/`, page-specific UI co-located with the page.
- **Tailwind v4**: use `shrink-0` not `flex-shrink-0`, `grow` not `flex-grow`, etc. (shorthand-only utility names).

---

## Authorization Pattern

> Do **not** use `auth.api.getActiveMember()` for role checks in pages or API routes — it requires `activeOrganizationId` to be set in the session, which may not always be the case.

Instead, query the `member` table directly:

```ts
// In a Route Handler
import { getAdminOrOwner } from "@/lib/auth-utils";

const admin = await getAdminOrOwner(request.headers);
if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
```

```ts
// In a Server Component / Layout
import { requireAdminOrOwnerPage } from "@/lib/auth-utils";

const { session, member } = await requireAdminOrOwnerPage();
// Redirects to /sign-in if unauthenticated, to / if role is not owner/admin
```

`src/lib/auth-utils.ts` is the single source of truth for these helpers.

---

## Dashboard & Student Enrollment

The admin dashboard lives at `/dashboard` and is protected to `owner` and `admin` roles only.

### Route map

| Route | Description |
| ----- | ----------- |
| `/dashboard` | Redirects to `/dashboard/students` |
| `/dashboard/students` | Student list — search, filter by programme/status, paginate |
| `/dashboard/students/new` | Enrol a new student |
| `/dashboard/students/[id]` | View + edit an existing student |

### API routes

| Endpoint | Methods | Description |
| -------- | ------- | ----------- |
| `/api/students` | `GET`, `POST` | List (with `q`, `programmeId`, `status`, `page` params) / create |
| `/api/students/[id]` | `GET`, `PATCH` | Fetch / partial-update a student |
| `/api/programmes` | `GET` | List programmes (used to populate dropdowns) |

### Student ID generation

IDs follow the pattern `SMS-YYYY-XXXX` (e.g. `SMS-2026-0001`). Generation happens inside a `db.$transaction` to prevent race conditions when multiple students are enrolled concurrently. The transaction finds the highest existing ID for the current year and increments the sequence number.

### Shared components

| Component | Purpose |
| --------- | ------- |
| `src/components/dashboard/sidebar.tsx` | App shell sidebar — active state via `usePathname()`, future features shown as "Soon" |
| `src/components/students/student-filters.tsx` | Search + programme/status dropdowns; updates URL params with `useTransition` |
| `src/components/students/student-table.tsx` | Responsive table + `StatusBadge` (colour-coded per enrollment status) |
| `src/components/students/student-form.tsx` | Shared create/edit form; accepts `mode="create" | "edit"` and `defaultValues` |

### Prerequisite: programmes must exist

`Student` requires a `Programme`. Before enrolling any students, at least one `Programme` row must exist in the DB. The UI shows a warning banner if none are found. When implementing programme management, use the same admin-only auth pattern.

---

## Database Error Handling

All Prisma calls in API route handlers must go through `dbQuery` from `src/lib/db-error.ts` instead of raw `try/catch` blocks.

```ts
import { dbQuery } from "@/lib/db-error";

const { data: student, response: err } = await dbQuery(
  () => db.student.findUnique({ where: { id } }),
  "GET /api/students/[id]",
);
if (err) return err; // returns the appropriate HTTP response
```

### What `dbQuery` handles

| Prisma error code | HTTP response |
| ----------------- | ------------- |
| `P2002` — unique constraint | `409 Conflict` with a field-specific message |
| `P2025` — record not found  | `404 Not Found` |
| Any other error             | `500 Internal Server Error` (logged to console) |

The second argument is a context string used in the server-side `console.error` log.

`UNIQUE_CONSTRAINT_MESSAGES` in `db-error.ts` maps column names to user-facing messages — extend it when adding new unique fields.
