-- Adicionar coluna para rastrear tentativas de cobrança falhas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_failed_attempts INT DEFAULT 0;
