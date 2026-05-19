-- Create the billing history table to track automated or manual Stripe charges
CREATE TABLE IF NOT EXISTS public.billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
    stripe_payment_intent_id TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own billing history" ON public.billing_history;
DROP POLICY IF EXISTS "Service role can manage billing history" ON public.billing_history;

-- Create Policy: Users can only read their own billing history records
CREATE POLICY "Users can view their own billing history" ON public.billing_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Create Policy: Service role client (used in API routes) can perform any operation
CREATE POLICY "Service role can manage billing history" ON public.billing_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
