-- Configurações globais da plataforma (key/value). Hoje usado para o modo
-- manutenção (liga/desliga sem redeploy). Apenas o service role (API admin)
-- escreve; a leitura da flag de manutenção é PÚBLICA porque o middleware precisa
-- decidir o gate antes mesmo da autenticação completa do usuário.
CREATE TABLE IF NOT EXISTS app_settings (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Reusa a função global set_updated_at() (criada em 20260513_blog_posts.sql).
DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública APENAS da flag de manutenção (não vaza outras configs).
DROP POLICY IF EXISTS "public_read_maintenance" ON app_settings;
CREATE POLICY "public_read_maintenance"
  ON app_settings FOR SELECT
  USING (key = 'maintenance');

-- Service role bypassa RLS — escrita pela API admin.

-- Seed do modo manutenção (desligado).
INSERT INTO app_settings (key, value)
VALUES ('maintenance', '{"enabled": false, "message": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
