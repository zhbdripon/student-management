/**
 * Seed script: populates the programme table with realistic academic programmes.
 *
 * Usage:
 *   npx tsx scripts/seed-programmes.ts
 *
 * Safe to re-run — uses upsert so existing programmes are not duplicated.
 */

import "dotenv/config";
import { db } from "../src/lib/db";

const programmes = [
  {
    name: "BSc Computer Science",
    description:
      "A comprehensive programme covering algorithms, software engineering, artificial intelligence, and systems programming. Prepares graduates for careers in software development and research.",
    feeAmount: 9250,
  },
  {
    name: "BSc Business Administration",
    description:
      "Covers management, marketing, finance, and entrepreneurship. Equips students with the skills to lead and grow organisations in a global economy.",
    feeAmount: 8500,
  },
  {
    name: "BEng Mechanical Engineering",
    description:
      "Focuses on thermodynamics, fluid mechanics, materials science, and design. Graduates are prepared for roles in manufacturing, aerospace, and energy industries.",
    feeAmount: 9500,
  },
  {
    name: "BSc Nursing",
    description:
      "A practice-based programme combining clinical placements with academic study in anatomy, pharmacology, and patient care to produce registered nurses.",
    feeAmount: 9250,
  },
  {
    name: "LLB Law",
    description:
      "An undergraduate law degree covering contract, tort, criminal, constitutional, and international law. Provides a solid foundation for legal practice or further study.",
    feeAmount: 9000,
  },
  {
    name: "BA Psychology",
    description:
      "Explores human behaviour, cognition, development, and mental health through evidence-based research methods and clinical theory.",
    feeAmount: 8750,
  },
  {
    name: "BSc Data Science and Analytics",
    description:
      "Combines statistics, machine learning, and data engineering to train specialists in extracting insights from large datasets across sectors such as finance, healthcare, and tech.",
    feeAmount: 9250,
  },
  {
    name: "BEng Civil Engineering",
    description:
      "Covers structural analysis, geotechnics, hydraulics, and infrastructure design. Prepares students for careers in construction, transport, and environmental engineering.",
    feeAmount: 9500,
  },
  {
    name: "BA Education Studies",
    description:
      "Examines pedagogy, curriculum development, and educational policy. Suitable for those pursuing careers in teaching, educational research, or policy-making.",
    feeAmount: 8000,
  },
  {
    name: "MSc Cybersecurity",
    description:
      "A postgraduate programme covering network security, ethical hacking, digital forensics, and security governance. Designed for professionals seeking advanced expertise in cyber defence.",
    feeAmount: 12000,
  },
  {
    name: "MBA Master of Business Administration",
    description:
      "An advanced management programme for experienced professionals, covering strategic management, leadership, corporate finance, and innovation.",
    feeAmount: 18000,
  },
  {
    name: "BSc Biomedical Science",
    description:
      "Integrates biology and chemistry with medical laboratory practice, covering haematology, microbiology, and clinical biochemistry. Accredited for NHS laboratory roles.",
    feeAmount: 9250,
  },
];

async function main() {
  console.log(`\nSeeding ${programmes.length} academic programmes…\n`);

  let created = 0;
  let skipped = 0;

  for (const programme of programmes) {
    const result = await db.programme.upsert({
      where: { name: programme.name },
      update: {},
      create: programme,
    });

    const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
    if (isNew) {
      console.log(`  ✓ Created: ${result.name}`);
      created++;
    } else {
      console.log(`  – Skipped (exists): ${result.name}`);
      skipped++;
    }
  }

  console.log(`\nDone — ${created} created, ${skipped} already existed.\n`);
}

main()
  .catch((err) => {
    console.error("\nUnexpected error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
