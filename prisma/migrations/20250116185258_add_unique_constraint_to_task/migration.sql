/*
  Warnings:

  - A unique constraint covering the columns `[storeId,type]` on the table `task` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "task_storeId_type_key" ON "task"("storeId", "type");
