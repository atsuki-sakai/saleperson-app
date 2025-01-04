-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "hasOrderKnowledge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasProductKnowledge" BOOLEAN NOT NULL DEFAULT false;
