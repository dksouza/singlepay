-- Update profiles table with billing and plan fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS fee_percentage DECIMAL(5,2) DEFAULT 4.9,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '15 days');

-- Update sales table with platform fee fields
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_fee_billed BOOLEAN DEFAULT FALSE;

-- Ensure existing admins have 0 fee (optional safeguard)
UPDATE public.profiles SET fee_percentage = 0 WHERE is_admin = true;
