-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own offers" ON public.offers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own offers" ON public.offers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offers" ON public.offers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offers" ON public.offers
    FOR DELETE USING (auth.uid() = user_id);
