/*
  Warnings:

  - A unique constraint covering the columns `[shopId]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Store_shopId_key" ON "Store"("shopId");
