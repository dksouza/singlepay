-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    product_ids UUID[] DEFAULT '{}',
    events TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own webhooks" 
    ON webhooks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhooks" 
    ON webhooks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" 
    ON webhooks FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks" 
    ON webhooks FOR DELETE 
    USING (auth.uid() = user_id);
