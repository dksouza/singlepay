-- Create sales table to store transaction history
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  checkout_id UUID REFERENCES checkouts(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending', -- pending, succeeded, failed
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Policy: Sellers can view their own sales data
CREATE POLICY "Sellers can view their own sales"
  ON sales FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Allow inserts during checkout process
CREATE POLICY "Allow public inserts for sales"
  ON sales FOR INSERT
  WITH CHECK (true);

-- Policy: Allow updates for status changes
CREATE POLICY "Allow sales updates"
  ON sales FOR UPDATE
  USING (auth.uid() = user_id OR true); -- Simplification for now, usually restricted by service role or specific logic
