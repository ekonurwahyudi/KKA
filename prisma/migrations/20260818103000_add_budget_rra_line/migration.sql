-- CreateTable
CREATE TABLE "BudgetRraLine" (
    "id" TEXT NOT NULL,
    "rraLogId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "regionalCode" TEXT NOT NULL,
    "costCenter" TEXT,
    "regionalName" TEXT,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "beforeAmount" DOUBLE PRECISION NOT NULL,
    "rraAmount" DOUBLE PRECISION NOT NULL,
    "afterAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetRraLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetRraLine_rraLogId_idx" ON "BudgetRraLine"("rraLogId");

-- CreateIndex
CREATE INDEX "BudgetRraLine_side_idx" ON "BudgetRraLine"("side");

-- CreateIndex
CREATE INDEX "BudgetRraLine_budgetId_idx" ON "BudgetRraLine"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetRraLine_regionalCode_idx" ON "BudgetRraLine"("regionalCode");

-- AddForeignKey
ALTER TABLE "BudgetRraLine" ADD CONSTRAINT "BudgetRraLine_rraLogId_fkey" FOREIGN KEY ("rraLogId") REFERENCES "BudgetRraLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRraLine" ADD CONSTRAINT "BudgetRraLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
