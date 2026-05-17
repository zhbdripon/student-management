/**
 * Full system seed script — creates all default accounts, organization, and academic data.
 * No interactive input required.
 *
 * What it creates:
 *   1. Owner account + organization (Greenfield University)
 *   2. Admin user  (registry@university.ac.uk)
 *   3. Staff user  (staff@university.ac.uk)
 *   4. Two student (member) users with linked Student records
 *   5. Academic programmes and modules
 *
 * Usage:
 *   npx tsx scripts/seed-all.ts
 *
 * Safe to re-run — skips already-existing records.
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";

// ---------------------------------------------------------------------------
// Hardcoded seed data
// ---------------------------------------------------------------------------

const ORG = {
  name: "Greenfield University",
  slug: "greenfield-university",
};

const OWNER = {
  name: "Sarah Mitchell",
  email: "owner@university.ac.uk",
  password: "Password123!",
};

const ADMIN = {
  name: "James Harrison",
  email: "admin@university.ac.uk",
  password: "Password123!",
};

const STAFF = {
  name: "Dr. Emily Clarke",
  email: "staff@university.ac.uk",
  password: "Password123!",
};

const STUDENTS = [
  // 3 students on BSc Computer Science
  {
    name: "Alice Thompson",
    email: "alice.thompson@student.ac.uk",
    password: "Password123!",
    dateOfBirth: "2000-03-15",
    academicYear: "2025/2026",
    programme: "BSc Computer Science",
  },
  {
    name: "Ben Okafor",
    email: "ben.okafor@student.ac.uk",
    password: "Password123!",
    dateOfBirth: "1999-07-22",
    academicYear: "2025/2026",
    programme: "BSc Computer Science",
  },
  {
    name: "Chloe Patel",
    email: "chloe.patel@student.ac.uk",
    password: "Password123!",
    dateOfBirth: "2001-11-05",
    academicYear: "2025/2026",
    programme: "BSc Computer Science",
  },
  // 2 students on BSc Data Science and Analytics
  {
    name: "Daniel Nguyen",
    email: "daniel.nguyen@student.ac.uk",
    password: "Password123!",
    dateOfBirth: "2000-06-18",
    academicYear: "2025/2026",
    programme: "BSc Data Science and Analytics",
  },
  {
    name: "Emma Rossi",
    email: "emma.rossi@student.ac.uk",
    password: "Password123!",
    dateOfBirth: "1998-09-30",
    academicYear: "2025/2026",
    programme: "BSc Data Science and Analytics",
  },
];

type ProgrammeSeed = {
  name: string;
  description: string;
  feeAmount: number;
  modules: { title: string; code: string }[];
};

const PROGRAMMES: ProgrammeSeed[] = [
  {
    name: "BSc Computer Science",
    description:
      "A comprehensive programme covering algorithms, software engineering, artificial intelligence, and systems programming. Prepares graduates for careers in software development and research.",
    feeAmount: 9250,
    modules: [
      { title: "Introduction to Programming", code: "CS101" },
      { title: "Data Structures and Algorithms", code: "CS201" },
      { title: "Database Systems", code: "CS202" },
      { title: "Software Engineering", code: "CS301" },
      { title: "Operating Systems", code: "CS302" },
      { title: "Artificial Intelligence", code: "CS401" },
    ],
  },
  {
    name: "BSc Business Administration",
    description:
      "Covers management, marketing, finance, and entrepreneurship. Equips students with the skills to lead and grow organisations in a global economy.",
    feeAmount: 8500,
    modules: [
      { title: "Principles of Management", code: "BA101" },
      { title: "Marketing Fundamentals", code: "BA201" },
      { title: "Human Resource Management", code: "BA202" },
      { title: "Corporate Finance", code: "BA301" },
      { title: "Entrepreneurship and Innovation", code: "BA401" },
    ],
  },
  {
    name: "BEng Mechanical Engineering",
    description:
      "Focuses on thermodynamics, fluid mechanics, materials science, and design. Graduates are prepared for roles in manufacturing, aerospace, and energy industries.",
    feeAmount: 9500,
    modules: [
      { title: "Engineering Mathematics", code: "ME101" },
      { title: "Thermodynamics", code: "ME201" },
      { title: "Fluid Mechanics", code: "ME301" },
      { title: "Materials Science", code: "ME302" },
      { title: "Mechanical Design", code: "ME401" },
    ],
  },
  {
    name: "BSc Nursing",
    description:
      "A practice-based programme combining clinical placements with academic study in anatomy, pharmacology, and patient care to produce registered nurses.",
    feeAmount: 9250,
    modules: [
      { title: "Anatomy and Physiology", code: "NU101" },
      { title: "Pharmacology", code: "NU201" },
      { title: "Community Health Nursing", code: "NU202" },
      { title: "Patient Care and Clinical Practice", code: "NU301" },
      { title: "Mental Health Nursing", code: "NU401" },
    ],
  },
  {
    name: "LLB Law",
    description:
      "An undergraduate law degree covering contract, tort, criminal, constitutional, and international law. Provides a solid foundation for legal practice or further study.",
    feeAmount: 9000,
    modules: [
      { title: "Contract Law", code: "LW101" },
      { title: "Criminal Law", code: "LW201" },
      { title: "Tort Law", code: "LW202" },
      { title: "Constitutional Law", code: "LW301" },
      { title: "International Law", code: "LW401" },
    ],
  },
  {
    name: "BA Psychology",
    description:
      "Explores human behaviour, cognition, development, and mental health through evidence-based research methods and clinical theory.",
    feeAmount: 8750,
    modules: [
      { title: "Introduction to Psychology", code: "PS101" },
      { title: "Cognitive Psychology", code: "PS201" },
      { title: "Research Methods in Psychology", code: "PS202" },
      { title: "Developmental Psychology", code: "PS301" },
      { title: "Clinical Psychology", code: "PS401" },
    ],
  },
  {
    name: "BSc Data Science and Analytics",
    description:
      "Combines statistics, machine learning, and data engineering to train specialists in extracting insights from large datasets across sectors such as finance, healthcare, and tech.",
    feeAmount: 9250,
    modules: [
      { title: "Statistics for Data Science", code: "DS101" },
      { title: "Machine Learning", code: "DS201" },
      { title: "Data Visualisation", code: "DS202" },
      { title: "Data Engineering", code: "DS301" },
      { title: "Big Data Analytics", code: "DS401" },
    ],
  },
  {
    name: "BEng Civil Engineering",
    description:
      "Covers structural analysis, geotechnics, hydraulics, and infrastructure design. Prepares students for careers in construction, transport, and environmental engineering.",
    feeAmount: 9500,
    modules: [
      { title: "Engineering Mathematics", code: "CE101" },
      { title: "Structural Analysis", code: "CE201" },
      { title: "Geotechnics", code: "CE301" },
      { title: "Infrastructure Design", code: "CE302" },
      { title: "Hydraulics and Water Engineering", code: "CE401" },
    ],
  },
  {
    name: "BA Education Studies",
    description:
      "Examines pedagogy, curriculum development, and educational policy. Suitable for those pursuing careers in teaching, educational research, or policy-making.",
    feeAmount: 8000,
    modules: [
      { title: "Foundations of Education", code: "ED101" },
      { title: "Curriculum Development", code: "ED201" },
      { title: "Inclusive Education", code: "ED202" },
      { title: "Educational Psychology", code: "ED301" },
      { title: "Educational Policy and Leadership", code: "ED401" },
    ],
  },
  {
    name: "MSc Cybersecurity",
    description:
      "A postgraduate programme covering network security, ethical hacking, digital forensics, and security governance. Designed for professionals seeking advanced expertise in cyber defence.",
    feeAmount: 12000,
    modules: [
      { title: "Network Security", code: "CY501" },
      { title: "Ethical Hacking and Penetration Testing", code: "CY502" },
      { title: "Digital Forensics", code: "CY503" },
      { title: "Security Governance and Compliance", code: "CY504" },
      { title: "Malware Analysis", code: "CY505" },
    ],
  },
  {
    name: "MBA Master of Business Administration",
    description:
      "An advanced management programme for experienced professionals, covering strategic management, leadership, corporate finance, and innovation.",
    feeAmount: 18000,
    modules: [
      { title: "Strategic Management", code: "MB501" },
      { title: "Leadership and Organisational Behaviour", code: "MB502" },
      { title: "Corporate Finance", code: "MB503" },
      { title: "Innovation and Entrepreneurship", code: "MB504" },
      { title: "Global Business Strategy", code: "MB505" },
    ],
  },
  {
    name: "BSc Biomedical Science",
    description:
      "Integrates biology and chemistry with medical laboratory practice, covering haematology, microbiology, and clinical biochemistry. Accredited for NHS laboratory roles.",
    feeAmount: 9250,
    modules: [
      { title: "Human Anatomy", code: "BM101" },
      { title: "Haematology", code: "BM201" },
      { title: "Immunology", code: "BM202" },
      { title: "Microbiology", code: "BM301" },
      { title: "Clinical Biochemistry", code: "BM401" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrCreateUser(
  name: string,
  email: string,
  password: string,
): Promise<{ id: string; name: string; email: string; isNew: boolean }> {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { id: existing.id, name: existing.name, email: existing.email, isNew: false };
  }

  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  if (!result?.user) {
    throw new Error(
      `Failed to create user "${email}". The email may be invalid or the password too weak.`,
    );
  }
  return { id: result.user.id, name: result.user.name, email: result.user.email, isNew: true };
}

async function ensureMember(
  userId: string,
  organizationId: string,
  role: string,
): Promise<{ isNew: boolean }> {
  const existing = await db.member.findFirst({ where: { userId, organizationId } });
  if (existing) return { isNew: false };

  await db.member.create({
    data: {
      id: randomUUID(),
      userId,
      organizationId,
      role,
      createdAt: new Date(),
    },
  });
  return { isNew: true };
}

async function generateStudentId(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SMS-${year}-`;
  const last = await tx.student.findFirst({
    where: { studentId: { startsWith: prefix } },
    orderBy: { studentId: "desc" },
    select: { studentId: true },
  });
  const nextNum = last ? parseInt(last.studentId.slice(-4), 10) + 1 : 1;
  return `${prefix}${nextNum.toString().padStart(4, "0")}`;
}

async function ensureStudentRecord(
  userId: string,
  fullName: string,
  email: string,
  dateOfBirth: string,
  programmeId: string,
  academicYear: string,
): Promise<{ studentId: string; isNew: boolean }> {
  const existing = await db.student.findUnique({ where: { email } });
  if (existing) return { studentId: existing.studentId, isNew: false };

  const student = await db.$transaction(async (tx) => {
    const studentId = await generateStudentId(tx);
    return tx.student.create({
      data: {
        studentId,
        userId,
        fullName,
        email,
        dateOfBirth: new Date(dateOfBirth),
        programmeId,
        academicYear,
      },
    });
  });
  return { studentId: student.studentId, isNew: true };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n========================================");
  console.log("  Student Management — Full System Seed");
  console.log("========================================\n");

  // ── Step 1: Programmes & Modules ────────────────────────────────────────────
  console.log("─── Programmes & Modules ───────────────\n");

  let progCreated = 0, progSkipped = 0, modCreated = 0, modSkipped = 0;

  for (const { modules, ...progData } of PROGRAMMES) {
    const prog = await db.programme.upsert({
      where: { name: progData.name },
      update: {},
      create: progData,
    });

    const isNew = prog.createdAt.getTime() === prog.updatedAt.getTime();
    if (isNew) {
      console.log(`  ✓ Programme created:  ${prog.name}`);
      progCreated++;
    } else {
      console.log(`  – Programme exists:   ${prog.name}`);
      progSkipped++;
    }

    for (const mod of modules) {
      const result = await db.module.upsert({
        where: { code: mod.code },
        update: {},
        create: { ...mod, programmeId: prog.id },
      });
      const modIsNew = result.createdAt.getTime() === result.updatedAt.getTime();
      if (modIsNew) {
        modCreated++;
      } else {
        modSkipped++;
      }
    }
  }

  console.log(
    `\n  Programmes: ${progCreated} created, ${progSkipped} already existed.`,
  );
  console.log(
    `  Modules:    ${modCreated} created, ${modSkipped} already existed.\n`,
  );

  // ── Step 2: Owner account ────────────────────────────────────────────────────
  console.log("─── Owner Account ──────────────────────\n");

  const owner = await getOrCreateUser(OWNER.name, OWNER.email, OWNER.password);
  if (owner.isNew) {
    console.log(`  ✓ Owner user created:  ${owner.name} <${owner.email}>`);
  } else {
    console.log(`  – Owner user exists:   ${owner.name} <${owner.email}>`);
  }

  // ── Step 3: Organization ─────────────────────────────────────────────────────
  console.log("\n─── Organization ───────────────────────\n");

  let org = await db.organization.findUnique({ where: { slug: ORG.slug } });
  let orgIsNew = false;

  if (!org) {
    const created = await auth.api.createOrganization({
      body: { name: ORG.name, slug: ORG.slug, userId: owner.id },
    });
    if (!created) {
      throw new Error(
        `Failed to create organization "${ORG.slug}". The slug may already be taken.`,
      );
    }
    org = await db.organization.findUnique({ where: { slug: ORG.slug } });
    orgIsNew = true;
  }

  if (!org) throw new Error("Organization not found after creation.");

  if (orgIsNew) {
    console.log(`  ✓ Organization created: ${org.name} (slug: ${org.slug})`);
    console.log(`  ✓ Owner role assigned:  ${OWNER.email}`);
  } else {
    console.log(`  – Organization exists:  ${org.name} (slug: ${org.slug})`);
  }

  const orgId = org.id;

  // ── Step 4: Admin user ───────────────────────────────────────────────────────
  console.log("\n─── Admin User ─────────────────────────\n");

  const admin = await getOrCreateUser(ADMIN.name, ADMIN.email, ADMIN.password);
  const adminMember = await ensureMember(admin.id, orgId, "admin");

  if (admin.isNew) {
    console.log(`  ✓ Admin user created:  ${admin.name} <${admin.email}>`);
  } else {
    console.log(`  – Admin user exists:   ${admin.name} <${admin.email}>`);
  }
  if (adminMember.isNew) {
    console.log(`  ✓ Admin member added to org`);
  } else {
    console.log(`  – Admin already member of org`);
  }

  // ── Step 5: Staff user ───────────────────────────────────────────────────────
  console.log("\n─── Staff User ─────────────────────────\n");

  const staff = await getOrCreateUser(STAFF.name, STAFF.email, STAFF.password);
  const staffMember = await ensureMember(staff.id, orgId, "staff");

  if (staff.isNew) {
    console.log(`  ✓ Staff user created:  ${staff.name} <${staff.email}>`);
  } else {
    console.log(`  – Staff user exists:   ${staff.name} <${staff.email}>`);
  }
  if (staffMember.isNew) {
    console.log(`  ✓ Staff member added to org`);
  } else {
    console.log(`  – Staff already member of org`);
  }

  // ── Step 6: Student (member) accounts ────────────────────────────────────────
  console.log("\n─── Student Accounts ───────────────────\n");

  for (const s of STUDENTS) {
    const programme = await db.programme.findUnique({ where: { name: s.programme } });
    if (!programme) {
      throw new Error(`Programme not found: "${s.programme}". Ensure programmes are seeded first.`);
    }

    const user = await getOrCreateUser(s.name, s.email, s.password);
    const memberEntry = await ensureMember(user.id, orgId, "member");
    const { studentId, isNew: studentIsNew } = await ensureStudentRecord(
      user.id,
      s.name,
      s.email,
      s.dateOfBirth,
      programme.id,
      s.academicYear,
    );

    if (user.isNew) {
      console.log(`  ✓ Student user created:  ${user.name} <${user.email}>`);
    } else {
      console.log(`  – Student user exists:   ${user.name} <${user.email}>`);
    }
    if (memberEntry.isNew) {
      console.log(`    ✓ Member role added to org`);
    } else {
      console.log(`    – Already member of org`);
    }
    if (studentIsNew) {
      console.log(`    ✓ Student record created: ${studentId}  (${s.programme})`);
    } else {
      console.log(`    – Student record exists:  ${studentId}  (${s.programme})`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n========================================");
  console.log("  Seed complete — account credentials");
  console.log("========================================\n");

  const accounts = [
    { role: "Registry (owner)", name: OWNER.name, email: OWNER.email, password: OWNER.password, programme: null },
    { role: "Registry (admin)", name: ADMIN.name, email: ADMIN.email, password: ADMIN.password, programme: null },
    { role: "staff", name: STAFF.name, email: STAFF.email, password: STAFF.password, programme: null },
    ...STUDENTS.map((s) => ({ role: "student", name: s.name, email: s.email, password: s.password, programme: s.programme })),
  ];

  for (const a of accounts) {
    console.log(`  Role:     ${a.role}`);
    console.log(`  Name:     ${a.name}`);
    console.log(`  Email:    ${a.email}`);
    console.log(`  Password: ${a.password}`);
    if (a.programme) {
      console.log(`  Programme: ${a.programme}`);
    }
    console.log();
  }
}

main()
  .catch((err) => {
    console.error("\nUnexpected error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
