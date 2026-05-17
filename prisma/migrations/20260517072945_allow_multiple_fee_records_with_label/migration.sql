/*
  Warnings:

  - Added the required column `label` to the `fee_record` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "fee_record_studentId_key";

-- AlterTable: add label with a temporary default, then remove the default
ALTER TABLE "fee_record" ADD COLUMN "label" TEXT NOT NULL DEFAULT 'Fee';
ALTER TABLE "fee_record" ALTER COLUMN "label" DROP DEFAULT;
