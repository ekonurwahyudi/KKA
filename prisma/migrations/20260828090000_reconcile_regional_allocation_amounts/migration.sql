-- Reconcile base regional allocations created before quarter edits also updated
-- their allocation rows. RRA deltas are intentionally left unchanged.
WITH allocation_weights AS (
  SELECT
    ra."id",
    ra."budgetId",
    ra."quarter",
    CASE ra."quarter"
      WHEN 1 THEN b."q1Amount"
      WHEN 2 THEN b."q2Amount"
      WHEN 3 THEN b."q3Amount"
      WHEN 4 THEN b."q4Amount"
    END AS quarter_amount,
    CASE
      WHEN SUM(ra."amount") OVER (PARTITION BY ra."budgetId", ra."quarter") > 0
        THEN ra."amount" / SUM(ra."amount") OVER (PARTITION BY ra."budgetId", ra."quarter")
      WHEN SUM(ra."percentage") OVER (PARTITION BY ra."budgetId", ra."quarter") > 0
        THEN ra."percentage" / SUM(ra."percentage") OVER (PARTITION BY ra."budgetId", ra."quarter")
      WHEN ROW_NUMBER() OVER (PARTITION BY ra."budgetId", ra."quarter" ORDER BY ra."id") = 1
        THEN 1
      ELSE 0
    END AS weight,
    ROW_NUMBER() OVER (PARTITION BY ra."budgetId", ra."quarter" ORDER BY ra."id" DESC) AS reverse_position
  FROM "RegionalAllocation" ra
  JOIN "Budget" b ON b."id" = ra."budgetId"
), preliminary AS (
  SELECT
    *,
    FLOOR(quarter_amount * weight) AS preliminary_amount
  FROM allocation_weights
), reconciled AS (
  SELECT
    "id",
    quarter_amount,
    CASE
      WHEN reverse_position = 1 THEN
        quarter_amount - SUM(CASE WHEN reverse_position > 1 THEN preliminary_amount ELSE 0 END)
          OVER (PARTITION BY "budgetId", "quarter")
      ELSE preliminary_amount
    END AS new_amount
  FROM preliminary
)
UPDATE "RegionalAllocation" ra
SET
  "amount" = reconciled.new_amount,
  "percentage" = CASE
    WHEN reconciled.quarter_amount > 0 THEN reconciled.new_amount / reconciled.quarter_amount * 100
    ELSE 0
  END
FROM reconciled
WHERE ra."id" = reconciled."id";
