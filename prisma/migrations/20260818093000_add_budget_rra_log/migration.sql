-- CreateTable
CREATE TABLE "BudgetRraLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sourceBudgetId" TEXT NOT NULL,
    "sourceRegionalCode" TEXT,
    "sourceCostCenter" TEXT,
    "targetBudgetId" TEXT NOT NULL,
    "targetRegionalCode" TEXT,
    "targetCostCenter" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "sourceBeforeAmount" DOUBLE PRECISION NOT NULL,
    "targetBeforeAmount" DOUBLE PRECISION NOT NULL,
    "sourceRraAmount" DOUBLE PRECISION NOT NULL,
    "targetRraAmount" DOUBLE PRECISION NOT NULL,
    "sourceAfterAmount" DOUBLE PRECISION NOT NULL,
    "targetAfterAmount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetRraLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetRraLog_year_idx" ON "BudgetRraLog"("year");

-- CreateIndex
CREATE INDEX "BudgetRraLog_type_idx" ON "BudgetRraLog"("type");

-- CreateIndex
CREATE INDEX "BudgetRraLog_sourceBudgetId_idx" ON "BudgetRraLog"("sourceBudgetId");

-- CreateIndex
CREATE INDEX "BudgetRraLog_targetBudgetId_idx" ON "BudgetRraLog"("targetBudgetId");

-- CreateIndex
CREATE INDEX "BudgetRraLog_createdAt_idx" ON "BudgetRraLog"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "BudgetRraLog" ADD CONSTRAINT "BudgetRraLog_sourceBudgetId_fkey" FOREIGN KEY ("sourceBudgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRraLog" ADD CONSTRAINT "BudgetRraLog_targetBudgetId_fkey" FOREIGN KEY ("targetBudgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
