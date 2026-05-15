-- Habilita o RLS na tabela profiles (caso não esteja)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se houver para evitar conflitos (opcional)
-- DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Permite que usuários vejam seus próprios perfis
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Permite que usuários atualizem seus próprios perfis
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Permite que usuários insiram seus próprios perfis (necessário para o upsert)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
