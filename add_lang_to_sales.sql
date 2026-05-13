-- Add customer_lang column to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS customer_lang TEXT DEFAULT 'pt';

-- Add comment to column
COMMENT ON COLUMN public.sales.customer_lang IS 'Detected language of the customer (pt, en, es) for localized communication';
