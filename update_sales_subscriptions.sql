-- Update sales table to support subscriptions
ALTER TABLE sales ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Update products table to support payment modes (if not already there)
-- Note: We saw checkouts has payment_type, but having it on products is also good.
-- For now, we'll rely on checkouts.payment_type.
