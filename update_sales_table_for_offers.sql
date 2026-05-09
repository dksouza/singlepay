
-- Update sales table to support both checkouts and custom offers
ALTER TABLE sales ALTER COLUMN checkout_id DROP NOT NULL;
ALTER TABLE sales ADD COLUMN offer_id UUID REFERENCES offers(id);

-- Add a comment to explain the change
COMMENT ON COLUMN sales.checkout_id IS 'Reference to the checkout link used (nullable if via offer)';
COMMENT ON COLUMN sales.offer_id IS 'Reference to the custom offer used (nullable if via standard checkout)';
