import type { GradeClassification } from "@/generated/prisma/enums";

/**
 * Derives a grade classification from a numeric grade (0–100).
 *   < 40  → FAIL
 *   ≥ 40  → PASS
 *   ≥ 60  → MERIT
 *   ≥ 70  → DISTINCTION
 */
export function classifyGrade(numericGrade: number): GradeClassification {
  if (numericGrade >= 70) return "DISTINCTION";
  if (numericGrade >= 60) return "MERIT";
  if (numericGrade >= 40) return "PASS";
  return "FAIL";
}

export const CLASSIFICATION_LABELS: Record<GradeClassification, string> = {
  DISTINCTION: "Distinction",
  MERIT: "Merit",
  PASS: "Pass",
  FAIL: "Fail",
};

export const CLASSIFICATION_BADGE_CLASSES: Record<GradeClassification, string> = {
  DISTINCTION: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  MERIT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  PASS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  FAIL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};
