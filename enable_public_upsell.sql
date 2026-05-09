
-- Allow public read access to upsell strategies so the public script can fetch them
CREATE POLICY "Allow public read access to upsell strategies"
    ON upsell_strategies
    FOR SELECT
    USING (true);

-- Also allow public read access to products and offers since they are linked
-- (Check if policies already exist for these, if not, add them)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Allow public read access to products'
    ) THEN
        CREATE POLICY "Allow public read access to products" ON products FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'offers' AND policyname = 'Allow public read access to offers'
    ) THEN
        CREATE POLICY "Allow public read access to offers" ON offers FOR SELECT USING (true);
    END IF;
END $$;
