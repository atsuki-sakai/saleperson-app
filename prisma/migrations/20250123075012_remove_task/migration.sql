/*
  Warnings:

  - You are about to drop the `task` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'SYNCING', 'INDEXING', 'COMPLETED', 'ERROR');

-- AlterTable
ALTER TABLE "document" ADD COLUMN     "batchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "task";

-- DropEnum
DROP TYPE "TaskStatus";
