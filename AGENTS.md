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

## Development Workflow

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
