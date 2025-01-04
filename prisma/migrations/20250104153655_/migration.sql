-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "chatColor" TEXT,
ALTER COLUMN "blockingKeywords" DROP NOT NULL,
ALTER COLUMN "blockingKeywords" DROP DEFAULT,
ALTER COLUMN "blockingKeywords" SET DATA TYPE TEXT;
