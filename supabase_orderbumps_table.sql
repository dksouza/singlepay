
-- Create orderbumps table
CREATE TABLE orderbumps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL, -- Main product
  bump_product_id UUID REFERENCES products(id) NOT NULL, -- The product being offered
  bump_offer_id UUID REFERENCES offers(id), -- Specific offer for the bump
  call_to_action TEXT,
  title TEXT,
  description TEXT,
  show_image BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE orderbumps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own orderbumps"
  ON orderbumps FOR ALL
  USING (auth.uid() = user_id);
