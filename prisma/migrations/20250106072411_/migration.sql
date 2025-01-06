/*
  Warnings:

  - You are about to drop the column `blockingKeywords` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `faqContent` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `metaFieldDescription` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `storePrompt` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `systemPrompt` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `tone` on the `Store` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Store" DROP COLUMN "blockingKeywords",
DROP COLUMN "faqContent",
DROP COLUMN "metaFieldDescription",
DROP COLUMN "storePrompt",
DROP COLUMN "systemPrompt",
DROP COLUMN "tone";
