-- Adiciona a coluna back_redirect na tabela de checkouts
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS back_redirect TEXT;
