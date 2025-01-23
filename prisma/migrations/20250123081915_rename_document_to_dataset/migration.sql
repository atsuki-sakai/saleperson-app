/*
  Warnings:

  - You are about to drop the `document` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DatasetIndexingStatus" AS ENUM ('PENDING', 'SYNCING', 'INDEXING', 'COMPLETED', 'ERROR');

-- DropForeignKey
ALTER TABLE "document" DROP CONSTRAINT "document_storeId_fkey";

-- DropTable
DROP TABLE "document";

-- DropEnum
DROP TYPE "DocumentStatus";

-- CreateTable
CREATE TABLE "dataset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "datasetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "batchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DatasetIndexingStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "dataset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dataset_storeId_idx" ON "dataset"("storeId");

-- AddForeignKey
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
