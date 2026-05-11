-- =============================================
-- Migration: Allow multiple sales per PaymentIntent
-- =============================================
-- The sales table currently has a UNIQUE constraint on stripe_payment_intent_id
-- which prevents orderbump sales from being inserted (they share the same PI).
-- This migration removes that constraint and adds a non-unique index for performance.

-- 1. Remove UNIQUE constraint from stripe_payment_intent_id
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_stripe_payment_intent_id_key;

-- 2. Also remove NOT NULL since orderbump sales share the same PI
--    (NOT NULL stays — all sales must have a PI)

-- 3. Add a non-unique index for query performance
CREATE INDEX IF NOT EXISTS idx_sales_stripe_pi_id ON sales(stripe_payment_intent_id);
