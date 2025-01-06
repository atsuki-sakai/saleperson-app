/*
  Warnings:

  - You are about to drop the column `hasMediaMetaField` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `hasShippingInfo` on the `Store` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Store" DROP COLUMN "hasMediaMetaField",
DROP COLUMN "hasShippingInfo",
ADD COLUMN     "hasMetaField" BOOLEAN NOT NULL DEFAULT false;
