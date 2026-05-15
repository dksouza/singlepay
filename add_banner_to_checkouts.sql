-- Adiciona campos de banner à tabela de checkouts
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS show_banner BOOLEAN DEFAULT false;
