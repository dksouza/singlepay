-- Create appsell_configs table
CREATE TABLE IF NOT EXISTS appsell_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    api_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE appsell_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own appsell config" 
    ON appsell_configs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appsell config" 
    ON appsell_configs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appsell config" 
    ON appsell_configs FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appsell config" 
    ON appsell_configs FOR DELETE 
    USING (auth.uid() = user_id);
