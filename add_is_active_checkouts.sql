-- Add is_active column to checkouts table
ALTER TABLE public.checkouts 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
