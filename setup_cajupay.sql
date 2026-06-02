-- Create CajuPay Configs Table
CREATE TABLE IF NOT EXISTS cajupay_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  public_key TEXT,
  secret_key TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE cajupay_configs ENABLE ROW LEVEL SECURITY;

-- Policies for cajupay_configs
CREATE POLICY "Users can insert their own cajupay_config" 
ON cajupay_configs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cajupay_config" 
ON cajupay_configs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own cajupay_config" 
ON cajupay_configs FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cajupay_config" 
ON cajupay_configs FOR DELETE 
USING (auth.uid() = user_id);

-- Update products table to support multiple gateways
ALTER TABLE products ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'stripe';
