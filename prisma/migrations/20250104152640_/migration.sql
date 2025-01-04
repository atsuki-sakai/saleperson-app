/*
  Warnings:

  - You are about to drop the column `metaFieldDescription` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `shippingInfo` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `storePolicy` on the `Store` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Store" DROP COLUMN "metaFieldDescription",
DROP COLUMN "shippingInfo",
DROP COLUMN "storePolicy",
ADD COLUMN     "blockingKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hasFaq" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasShippingInfo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasStorePolicy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storePrompt" TEXT,
ADD COLUMN     "tone" TEXT;
