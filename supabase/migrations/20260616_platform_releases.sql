-- Notas de versão voltadas ao CLIENTE ("Plataforma Atualizada"). O admin cria e
-- publica; o app mostra a última release publicada UMA VEZ por usuário, rastreando
-- a versão vista em user_metadata (mesmo padrão do onboarding). É deliberadamente
-- separada do changelog técnico (Backup/Mandor_Arquivo_Ancora_Mestre.md).
CREATE TABLE IF NOT EXISTS platform_releases (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  version       text        UNIQUE NOT NULL,        -- ex.: "2026.06" ou "1.4.0"
  title         text        NOT NULL DEFAULT 'Plataforma atualizada',
  release_date  date        NOT NULL DEFAULT now(),
  improvements  text[]      NOT NULL DEFAULT '{}',  -- melhorias
  new_features  text[]      NOT NULL DEFAULT '{}',  -- novos recursos
  fixes         text[]      NOT NULL DEFAULT '{}',  -- correções
  published     boolean     NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Listagem da última release publicada (ordenada por data de publicação).
CREATE INDEX IF NOT EXISTS platform_releases_published_idx
  ON platform_releases (published, published_at DESC);

-- Reusa a função global set_updated_at() (criada em 20260513_blog_posts.sql).
DROP TRIGGER IF EXISTS platform_releases_updated_at ON platform_releases;
CREATE TRIGGER platform_releases_updated_at
  BEFORE UPDATE ON platform_releases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE platform_releases ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário (mesmo anônimo) pode ler releases publicadas.
DROP POLICY IF EXISTS "public_read_published_releases" ON platform_releases;
CREATE POLICY "public_read_published_releases"
  ON platform_releases FOR SELECT
  USING (published = true);

-- Service role bypassa RLS — criação/edição/publicação pela API admin.
