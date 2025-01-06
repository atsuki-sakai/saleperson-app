/*
  Warnings:

  - You are about to drop the column `faqContent` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `hasFaq` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `hasMetaField` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `hasOrderKnowledge` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `hasProductKnowledge` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `hasStorePolicy` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `metaFieldDescription` on the `Store` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('products', 'orders', 'policy', 'faq', 'meta_fields');

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "faqContent",
DROP COLUMN "hasFaq",
DROP COLUMN "hasMetaField",
DROP COLUMN "hasOrderKnowledge",
DROP COLUMN "hasProductKnowledge",
DROP COLUMN "hasStorePolicy",
DROP COLUMN "metaFieldDescription";

-- CreateTable
CREATE TABLE "Knowledge" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "KnowledgeType" NOT NULL,
    "datasetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Knowledge_storeId_idx" ON "Knowledge"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Knowledge_storeId_type_key" ON "Knowledge"("storeId", "type");

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
