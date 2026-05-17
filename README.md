# Student Management System

![Dashboard Preview](public/preview.png)

A full-stack web application for managing student enrolment, fees, assessments, submissions, and grading within a university setting. Built with a role-based access model that separates the concerns of registry administrators, academic staff, and students.

---

## Features

- **Student enrolment** — register students against academic programmes with auto-generated student IDs (`SMS-YYYY-XXXX`)
- **Fee management** — track tuition fee records, payment transactions, and fee status per student
- **Assessment & submission** — staff create assessments; students submit shareable file links (Google Drive, Dropbox, etc.)
- **Marksheet & grading** — staff enter grades (0–100) with automatic classification (Pass / Merit / Distinction / Fail); publish or withhold results per student
- **Role-based access control** — four roles (`owner`, `admin`, `staff`, `member`) with granular permission checks throughout the application

---

## Technology Stack

| Technology | Version |
|------------|---------|
| Node.js | 20.x (`v20.19.2`) |
| Next.js | 16.2.6 (App Router) |
| React | 19.2.4 |
| TypeScript | ^5 |
| Tailwind CSS | ^4 |
| PostgreSQL | 16 (via Docker) |
| Prisma ORM | ^7.8.0 |
| Better Auth | ^1.6.11 |

---

## ER Diagram

[View the database schema on dbdiagram.io](https://dbdiagram.io/d/student-management-6a0888349f1f8ec47b2d1719)

---

## Setup Guide

### 1. Prerequisites

- Node.js v20+
- npm
- PostgreSQL 16 (via Docker recommended, or a local installation)

### 2. Clone & Install Dependencies

```bash
git clone <repo-url>
cd student-management
npm install
```

### 3. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `your_password` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Host-side mapped port | `5433` |
| `DB_NAME` | Database name | `student_management` |
| `DATABASE_URL` | Full Prisma connection string | `postgresql://postgres:your_password@localhost:5433/student_management?schema=public` |
| `BETTER_AUTH_SECRET` | 32-byte secret for signing auth tokens | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Base URL of the application | `http://localhost:3000` |

> `DATABASE_URL` must be kept in sync with the individual `DB_*` vars.
> Docker Compose reads the individual vars; Prisma reads `DATABASE_URL`.

### 4. Database Setup

#### Option A — With Docker (recommended)

```bash
# Start PostgreSQL container
npm run db:start

# Run all migrations
npm run db:migrate
```

#### Option B — Without Docker (local PostgreSQL)

1. Create a database named `student_management` (or whatever you set in `DB_NAME`).
2. Update `.env` with the correct host, port, and credentials.
3. Run migrations:

```bash
npm run db:migrate
```

### 5. Seed the Database

The seed script creates all default users, the organization, and sample academic data in one step:

```bash
npm run seed:all
```

What it creates:
- The **Greenfield University** organization
- An owner, admin, staff, and 5 student accounts
- Academic programmes (BSc Computer Science, BSc Data Science and Analytics, and more) with modules
- Student records linked to the student user accounts

The script is safe to re-run — it skips already-existing records.

### 6. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Seeded Accounts

### Organization

| Name | Slug |
|------|------|
| Greenfield University | `greenfield-university` |

### Owner (Registry Administrator)

| Name | Email | Password |
|------|-------|----------|
| Sarah Mitchell | `owner@university.ac.uk` | `Password123!` |

### Admin (Registry Administrator)

| Name | Email | Password |
|------|-------|----------|
| James Harrison | `admin@university.ac.uk` | `Password123!` |

### Staff (Academic Staff)

| Name | Email | Password |
|------|-------|----------|
| Dr. Emily Clarke | `staff@university.ac.uk` | `Password123!` |

### Students

| Name | Email | Password | Programme |
|------|-------|----------|-----------|
| Alice Thompson | `alice.thompson@student.ac.uk` | `Password123!` | BSc Computer Science |
| Ben Okafor | `ben.okafor@student.ac.uk` | `Password123!` | BSc Computer Science |
| Chloe Patel | `chloe.patel@student.ac.uk` | `Password123!` | BSc Computer Science |
| Daniel Nguyen | `daniel.nguyen@student.ac.uk` | `Password123!` | BSc Data Science and Analytics |
| Emma Rossi | `emma.rossi@student.ac.uk` | `Password123!` | BSc Data Science and Analytics |

---

## Known Limitations & TODO

### User sign-up without organization role

Users can self-register via the `/sign-up` page. However, a newly registered user is **not** automatically added to the Greenfield University organization with a role. Without a role assignment, they can authenticate but cannot access any meaningful part of the dashboard.

The full **invitation and onboarding flow** — where an admin invites a user via email, the user accepts the invitation, and is assigned a role — has **not yet been implemented**. For now, use the seed script to create accounts with the correct roles, or manually assign roles via Prisma Studio (`npm run db:studio`).

---

## AI-Assisted Development

This project was developed with a deliberate and efficient use of AI coding assistants (primarily GitHub Copilot with Claude Sonnet).

### The Approach

Rather than treating AI as a one-off code generator, the workflow here centred on keeping the AI well-informed throughout the entire development lifecycle:

- **`AGENTS.md`** — a living document that describes the project's architecture, conventions, data models, authorization patterns, API routes, and component inventory. This file is updated continuously as the codebase evolves.
- **`CLAUDE.md`** — a thin alias that references `AGENTS.md`, making the same context available to Claude-based agents via their standard entry-point filename.

By maintaining these files, any AI agent dropped into the codebase cold can immediately understand the project's structure and conventions without requiring lengthy back-and-forth. This dramatically reduced the time spent re-explaining context at the start of each session.

### Context Window Discipline

Claude Sonnet has a large but finite context window. To get the most out of it:

- The agent guide was written to be dense and precise — enough detail to act, no more.
- New sections were added to `AGENTS.md` incrementally as each feature was completed, rather than in one large batch.
- Repetitive boilerplate was extracted into shared utilities (e.g., `auth-utils.ts`, `db-error.ts`, `fee-utils.ts`, `grade-utils.ts`) so the AI only needed to know the utility's contract, not re-derive the implementation each time.
- Component and API inventories in `AGENTS.md` serve as a map — the AI can read a section and know exactly which file to look at rather than searching the whole codebase.
