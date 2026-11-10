-- CreateIndex
CREATE INDEX "Task_ownerId_createdAt_id_idx" ON "Task"("ownerId", "createdAt" DESC, "id" DESC);
