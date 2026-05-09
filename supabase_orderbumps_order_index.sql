
-- Add order_index column to orderbumps
ALTER TABLE orderbumps ADD COLUMN order_index INTEGER DEFAULT 0;

-- Update existing orderbumps to have an incremental order_index
WITH numbered_bumps AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at ASC) - 1 as new_order
  FROM orderbumps
)
UPDATE orderbumps
SET order_index = numbered_bumps.new_order
FROM numbered_bumps
WHERE orderbumps.id = numbered_bumps.id;
