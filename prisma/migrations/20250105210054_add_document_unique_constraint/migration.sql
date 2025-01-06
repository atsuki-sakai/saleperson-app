-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "datasetId" TEXT;

-- CreateIndex
CREATE INDEX "Document_storeId_idx" ON "Document"("storeId");
