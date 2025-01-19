/*
  Warnings:

  - You are about to drop the column `cursor` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `progressCount` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `totalCount` on the `task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "task" DROP COLUMN "cursor",
DROP COLUMN "errorMessage",
DROP COLUMN "progressCount",
DROP COLUMN "totalCount",
ADD COLUMN     "datasetId" TEXT;
