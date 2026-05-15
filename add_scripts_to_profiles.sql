-- Adiciona campo de scripts personalizados para o head do checkout na tabela de perfis
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checkout_head_scripts TEXT;
