ALTER TABLE products DROP COLUMN IF EXISTS extra_metadata;
ALTER TABLE products ADD COLUMN extra_metadata JSONB DEFAULT '[]'::jsonb;
