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

| Model        | Description                                      |
| ------------ | ------------------------------------------------ |
| `Student`    | A student with name, email, and optional phone   |
| `Course`     | A course with title and optional description     |
| `Enrollment` | Join table linking a Student to a Course + grade |

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
