-- Add tracking columns to sales table for better integration (Utmify, etc.)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS src TEXT,
ADD COLUMN IF NOT EXISTS sck TEXT,
ADD COLUMN IF NOT EXISTS customer_ip TEXT;

-- Add comment to columns
COMMENT ON COLUMN public.sales.utm_source IS 'UTM Source parameter from URL';
COMMENT ON COLUMN public.sales.utm_medium IS 'UTM Medium parameter from URL';
COMMENT ON COLUMN public.sales.utm_campaign IS 'UTM Campaign parameter from URL';
COMMENT ON COLUMN public.sales.utm_content IS 'UTM Content parameter from URL';
COMMENT ON COLUMN public.sales.utm_term IS 'UTM Term parameter from URL';
COMMENT ON COLUMN public.sales.src IS 'Source (src) parameter from URL';
COMMENT ON COLUMN public.sales.sck IS 'Source Check (sck) parameter from URL';
COMMENT ON COLUMN public.sales.customer_ip IS 'Visitor IP address captured during checkout';
