/*
  Warnings:

  - You are about to drop the column `chatbotName` on the `Store` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Store" DROP COLUMN "chatbotName",
ADD COLUMN     "iconUrl" TEXT;
