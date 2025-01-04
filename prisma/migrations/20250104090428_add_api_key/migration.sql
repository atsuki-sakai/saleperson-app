/*
  Warnings:

  - You are about to drop the column `isSubscribed` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Knowledge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Knowledge" DROP CONSTRAINT "Knowledge_storeId_fkey";

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "isSubscribed",
ADD COLUMN     "chatApiKey" TEXT,
ADD COLUMN     "workflowApiKey" TEXT;

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "Knowledge";

-- DropTable
DROP TABLE "Subscription";
