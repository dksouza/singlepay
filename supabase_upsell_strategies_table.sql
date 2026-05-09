
-- Create upsell_strategies table
CREATE TABLE IF NOT EXISTS upsell_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Upsell',
    upsell_page_url TEXT,
    upsell_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    upsell_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    accept_url TEXT,
    decline_url TEXT,
    accept_text TEXT DEFAULT 'Sim, eu quero comprar!',
    accept_bg_color TEXT DEFAULT '#5CCE5E',
    accept_text_color TEXT DEFAULT '#000000',
    decline_text TEXT DEFAULT 'Não, eu não quero comprar!',
    decline_bg_color TEXT DEFAULT '#DC2626',
    decline_text_color TEXT DEFAULT '#FFFFFF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE upsell_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own upsell strategies"
    ON upsell_strategies
    FOR ALL
    USING (auth.uid() = user_id);
