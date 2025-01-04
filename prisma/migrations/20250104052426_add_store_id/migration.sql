/*
  Warnings:

  - You are about to drop the column `shopId` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `shop` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the `Dataset` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `storeId` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_storeId_fkey";

-- DropIndex
DROP INDEX "Store_shopId_idx";

-- DropIndex
DROP INDEX "Store_shopId_key";

-- DropIndex
DROP INDEX "Subscription_shop_idx";

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "shopId",
ADD COLUMN     "isSubscribed" BOOLEAN DEFAULT false,
ADD COLUMN     "storeId" TEXT NOT NULL,
ADD COLUMN     "systemPrompt" TEXT;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "shop",
ADD COLUMN     "storeId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Dataset";

-- CreateTable
CREATE TABLE "Knowledge" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Knowledge_storeId_idx" ON "Knowledge"("storeId");

-- CreateIndex
CREATE INDEX "Document_storeId_idx" ON "Document"("storeId");

-- CreateIndex
CREATE INDEX "Store_storeId_idx" ON "Store"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeId_key" ON "Store"("storeId");

-- CreateIndex
CREATE INDEX "Subscription_storeId_idx" ON "Subscription"("storeId");

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
