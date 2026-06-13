-- ============================================================
-- Mapa Inteligente do Mercado — Schema base (2026-06-12)
-- ============================================================
-- Painel proprietário de inteligência do mercado de capitais.
-- Catálogo de participantes (gestoras, administradores, distribuidores,
-- custodiantes, bancos, securitizadoras, escritórios de crédito estruturado,
-- boutiques, family offices) + veículos (FIDC, FII, CRI/CRA, debêntures) +
-- a malha de relacionamentos entre eles.
--
-- DIFERENÇA-CHAVE vs. invest_match: estes dados são REFERÊNCIA PÚBLICA
-- compartilhada entre todos os escritórios (não são multi-tenant por
-- escritorio_id). Por isso a leitura é liberada a qualquer usuário
-- autenticado, restrita às linhas com redistribuivel = true.
--
-- GOVERNANÇA DE LICENCIAMENTO (ver docs/estrategia/mapa-inteligente-mercado-*):
--   - Dado aberto (CVM Dados Abertos/ODbL, BCB, B3, Receita): redistribuivel = true
--     → exibível ao usuário final.
--   - Dado licenciado (ANBIMA Feed, Coponto): redistribuivel = false
--     → enriquecimento interno apenas; NUNCA servido na API pública do painel.
--   A coluna `redistribuivel` é o cumpridor técnico dessa regra. Toda query
--   pública filtra redistribuivel = true (ver lib/mapa-mercado/queries.ts).
--
-- Convenções (consistentes com migrations existentes da Mandor):
--   - snake_case em português
--   - uuid PK, gen_random_uuid()
--   - timestamptz criado_em / atualizado_em
--   - RLS habilitado; service_role ALL; leitura autenticada filtrada
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- 1) mercado_entidades — Participantes do mercado (fonte de verdade)
-- ============================================================
-- Uma linha = uma instituição (idealmente identificada por CNPJ).
-- Uma mesma instituição pode acumular vários papéis (é gestora E
-- administradora), por isso usamos um array `tipos`, não tabela por tipo.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_entidades (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            text        UNIQUE,          -- null = entidade sem CNPJ (ex.: estrangeira)
  razao_social    text        NOT NULL,        -- Receita/CVM
  nome_fantasia   text,                         -- nome comercial / como é conhecida
  tipos           text[]      NOT NULL DEFAULT '{}',
    -- gestora | administrador | distribuidor | custodiante | controladoria |
    -- banco | securitizadora | escritorio_credito_estruturado |
    -- boutique_investimento | family_office | asset | consultoria | plataforma
  situacao        text,                         -- ativa | cancelada | suspensa | ...
  cnae            text,
  uf              text,
  municipio       text,
  fundada_em      date,
  website         text,
  logo_url        text,                         -- logo curada de fonte oficial
  descricao       text,                         -- resumo (pode ser gerado por IA)
  score_relevancia numeric(5,2),                -- indicador proprietário 0-100 (calculado)
  fonte           text        NOT NULL DEFAULT 'cvm',
    -- cvm | bcb | b3 | receita | anbima_feed | coponto | seed | manual
  redistribuivel  boolean     NOT NULL DEFAULT true,
  busca_tsv       tsvector,                     -- full-text (preenchido por trigger)
  raw             jsonb,                        -- payload bruto da fonte (auditoria)
  visto_em        timestamptz NOT NULL DEFAULT now(),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mercado_entidades_cnpj      ON public.mercado_entidades (cnpj);
CREATE INDEX IF NOT EXISTS idx_mercado_entidades_tipos     ON public.mercado_entidades USING gin (tipos);
CREATE INDEX IF NOT EXISTS idx_mercado_entidades_tsv       ON public.mercado_entidades USING gin (busca_tsv);
CREATE INDEX IF NOT EXISTS idx_mercado_entidades_nome_trgm ON public.mercado_entidades USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mercado_entidades_score     ON public.mercado_entidades (score_relevancia DESC NULLS LAST)
  WHERE redistribuivel = true;


-- ============================================================
-- 2) mercado_veiculos — Fundos, FIDCs, securitizações, emissões
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_veiculos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            text,
  codigo_anbima   text,                         -- só via ANBIMA Feed → redistribuivel=false
  codigo_cvm      text,
  nome            text        NOT NULL,
  tipo            text        NOT NULL,
    -- FIDC | FII | FIP | FIF | ETF | FIAGRO | OFFSHORE | CRI | CRA |
    -- debenture | CCB | fundo_geral
  categoria_cvm   text,
  classe_anbima   text,
  situacao        text,
  esg             boolean,
  fonte           text        NOT NULL DEFAULT 'cvm',
  redistribuivel  boolean     NOT NULL DEFAULT true,
  raw             jsonb,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercado_veiculos_cnpj_tipo_uk UNIQUE (cnpj, tipo)
);

CREATE INDEX IF NOT EXISTS idx_mercado_veiculos_tipo      ON public.mercado_veiculos (tipo);
CREATE INDEX IF NOT EXISTS idx_mercado_veiculos_cnpj      ON public.mercado_veiculos (cnpj);
CREATE INDEX IF NOT EXISTS idx_mercado_veiculos_nome_trgm ON public.mercado_veiculos USING gin (nome gin_trgm_ops);


-- ============================================================
-- 3) mercado_veiculo_prestadores — quem faz o quê em cada veículo
-- ============================================================
-- É a base do grafo de conexões. Vem dos prestadores de serviço
-- declarados na CVM (administrador, gestor, custodiante) — dado aberto.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_veiculo_prestadores (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id    uuid        NOT NULL REFERENCES public.mercado_veiculos(id) ON DELETE CASCADE,
  entidade_id   uuid        NOT NULL REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  papel         text        NOT NULL,
    -- administrador | gestor | co_gestor | distribuidor | custodiante | controladoria
  fonte         text        NOT NULL DEFAULT 'cvm',
  ativo         boolean     NOT NULL DEFAULT true,
  vigente_de    date,
  vigente_ate   date,                           -- histórico de troca de prestador
  criado_em     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercado_prestador_uk UNIQUE (veiculo_id, entidade_id, papel)
);

CREATE INDEX IF NOT EXISTS idx_mercado_prestadores_entidade ON public.mercado_veiculo_prestadores (entidade_id, papel);
CREATE INDEX IF NOT EXISTS idx_mercado_prestadores_veiculo  ON public.mercado_veiculo_prestadores (veiculo_id);


-- ============================================================
-- 4) mercado_metricas — séries temporais (PL, captação, cotistas, carteira)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_metricas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id     uuid        REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  veiculo_id      uuid        REFERENCES public.mercado_veiculos(id) ON DELETE CASCADE,
  metrica         text        NOT NULL,
    -- pl | captacao | resgate | cotistas | carteira_pj | aum | num_veiculos
  competencia     date        NOT NULL,
  valor           numeric,
  unidade         text,                         -- BRL | qtd | pct
  fonte           text        NOT NULL DEFAULT 'cvm',
  redistribuivel  boolean     NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- Unicidade com COALESCE precisa ser índice único (constraint de tabela não
-- aceita expressões). Trata entidade_id/veiculo_id nulos como sentinela.
CREATE UNIQUE INDEX IF NOT EXISTS mercado_metrica_uk ON public.mercado_metricas (
  COALESCE(entidade_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(veiculo_id,  '00000000-0000-0000-0000-000000000000'::uuid),
  metrica, competencia, fonte
);

CREATE INDEX IF NOT EXISTS idx_mercado_metricas_entidade ON public.mercado_metricas (entidade_id, metrica, competencia DESC);
CREATE INDEX IF NOT EXISTS idx_mercado_metricas_veiculo  ON public.mercado_metricas (veiculo_id, metrica, competencia DESC);


-- ============================================================
-- 5) mercado_conexoes — grafo de relacionamentos (materializado)
-- ============================================================
-- Aresta derivada entre duas entidades. Pré-computada por job a partir
-- de mercado_veiculo_prestadores (co-serviço) e co-investimentos.
-- Materializada para o "mapa de conexões" responder rápido.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_conexoes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id     uuid        NOT NULL REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  destino_id    uuid        NOT NULL REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  tipo          text        NOT NULL,
    -- co_servico | co_investimento | distribui_para | mesmo_grupo
  peso          numeric     NOT NULL DEFAULT 1,  -- nº de veículos em comum / força
  evidencia     jsonb,                            -- ids dos veículos que sustentam a aresta
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercado_conexao_uk UNIQUE (origem_id, destino_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_mercado_conexoes_origem ON public.mercado_conexoes (origem_id, tipo, peso DESC);


-- ============================================================
-- 6) mercado_rankings — rankings proprietários (snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_rankings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave         text        NOT NULL,            -- gestoras_por_num_veiculos | admin_por_num_fidc | ...
  competencia   date        NOT NULL,
  entidade_id   uuid        REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,
  posicao       int         NOT NULL,
  valor         numeric,
  metadados     jsonb,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercado_ranking_uk UNIQUE (chave, competencia, entidade_id)
);

CREATE INDEX IF NOT EXISTS idx_mercado_rankings_chave ON public.mercado_rankings (chave, competencia, posicao);


-- ============================================================
-- 7) mercado_ingestao_runs — auditoria de ETL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mercado_ingestao_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte           text        NOT NULL,           -- cvm | bcb | b3 | receita
  dataset         text        NOT NULL,           -- fi_cad | inf_mensal_fidc | if_data | ...
  status          text        NOT NULL DEFAULT 'running', -- running | completed | failed
  linhas_lidas    int,
  linhas_gravadas int,
  linhas_falhas   int,
  competencia     date,
  error_message   text,
  iniciado_em     timestamptz NOT NULL DEFAULT now(),
  finalizado_em   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mercado_ingestao_runs ON public.mercado_ingestao_runs (fonte, dataset, iniciado_em DESC);


-- ============================================================
-- Trigger: busca_tsv (full-text) + atualizado_em
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_entidades_tsv()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.busca_tsv :=
    setweight(to_tsvector('portuguese', unaccent_safe(coalesce(NEW.nome_fantasia, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent_safe(coalesce(NEW.razao_social, ''))), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tipos, ' '), '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.municipio, '') || ' ' || coalesce(NEW.uf, '')), 'C');
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

-- unaccent pode não estar habilitado em todos os ambientes; wrapper seguro.
CREATE OR REPLACE FUNCTION public.unaccent_safe(t text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN public.unaccent(t);
EXCEPTION WHEN undefined_function THEN
  RETURN t;
END;
$$;

DROP TRIGGER IF EXISTS mercado_entidades_tsv_trg ON public.mercado_entidades;
CREATE TRIGGER mercado_entidades_tsv_trg
  BEFORE INSERT OR UPDATE ON public.mercado_entidades
  FOR EACH ROW EXECUTE FUNCTION public.mercado_entidades_tsv();


-- ============================================================
-- RPC: mercado_buscar — busca unificada (full-text + trigram + filtros)
-- ============================================================
-- Só retorna linhas redistribuíveis. Combina match full-text e similaridade
-- de nome (trigram) para tolerar erros de digitação.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_buscar(
  p_q       text DEFAULT NULL,
  p_tipos   text[] DEFAULT NULL,
  p_uf      text DEFAULT NULL,
  p_limit   int DEFAULT 30,
  p_offset  int DEFAULT 0
)
RETURNS TABLE (
  id               uuid,
  razao_social     text,
  nome_fantasia    text,
  tipos            text[],
  uf               text,
  municipio        text,
  logo_url         text,
  score_relevancia numeric,
  fonte            text,
  num_veiculos     bigint,
  rank             real
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.razao_social, e.nome_fantasia, e.tipos, e.uf, e.municipio,
    e.logo_url, e.score_relevancia, e.fonte,
    (SELECT count(*) FROM public.mercado_veiculo_prestadores p WHERE p.entidade_id = e.id) AS num_veiculos,
    CASE
      WHEN p_q IS NULL OR p_q = '' THEN 0
      ELSE GREATEST(
        ts_rank(e.busca_tsv, websearch_to_tsquery('portuguese', p_q)),
        similarity(coalesce(e.nome_fantasia, e.razao_social), p_q)
      )
    END AS rank
  FROM public.mercado_entidades e
  WHERE e.redistribuivel = true
    AND (p_tipos IS NULL OR e.tipos && p_tipos)
    AND (p_uf IS NULL OR e.uf = p_uf)
    AND (
      p_q IS NULL OR p_q = ''
      OR e.busca_tsv @@ websearch_to_tsquery('portuguese', p_q)
      OR (coalesce(e.nome_fantasia, e.razao_social) % p_q)
    )
  ORDER BY rank DESC, e.score_relevancia DESC NULLS LAST, e.razao_social
  LIMIT p_limit OFFSET p_offset;
$$;


-- ============================================================
-- RPC: mercado_rebuild_conexoes — materializa o grafo de co-serviço
-- ============================================================
-- Para cada par de entidades que atuam no mesmo veículo, cria/atualiza a
-- aresta 'co_servico' com peso = nº de veículos em comum. Base do mapa de
-- relacionamentos. Chamado pelo ETL após a carga (rebuildGrafoEScore).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_rebuild_conexoes()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.mercado_conexoes WHERE tipo = 'co_servico';
  INSERT INTO public.mercado_conexoes (origem_id, destino_id, tipo, peso, evidencia)
  SELECT a.entidade_id, b.entidade_id, 'co_servico',
         count(DISTINCT a.veiculo_id),
         jsonb_build_object('veiculos_em_comum', count(DISTINCT a.veiculo_id))
  FROM public.mercado_veiculo_prestadores a
  JOIN public.mercado_veiculo_prestadores b
    ON a.veiculo_id = b.veiculo_id AND a.entidade_id <> b.entidade_id
  GROUP BY a.entidade_id, b.entidade_id
  ON CONFLICT (origem_id, destino_id, tipo)
  DO UPDATE SET peso = EXCLUDED.peso, evidencia = EXCLUDED.evidencia, atualizado_em = now();
END;
$$;


-- ============================================================
-- RPC: mercado_recalcular_score — score de relevância proprietário
-- ============================================================
-- Heurística log sobre o nº de veículos em que a entidade atua. Só mexe em
-- entidades de fonte 'cvm' (preserva scores curados do seed/manual).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_recalcular_score()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.mercado_entidades e
  SET score_relevancia = LEAST(100, ROUND((20 + 15 * ln(1 + sub.cnt))::numeric, 1))
  FROM (
    SELECT entidade_id, count(DISTINCT veiculo_id) AS cnt
    FROM public.mercado_veiculo_prestadores
    GROUP BY entidade_id
  ) sub
  WHERE e.id = sub.entidade_id
    AND e.fonte = 'cvm';
END;
$$;


-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.mercado_entidades            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_veiculos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_veiculo_prestadores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_metricas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_conexoes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_rankings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_ingestao_runs        ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado vê SOMENTE linhas redistribuíveis.
-- (Dado licenciado, redistribuivel=false, só é acessível via service_role
--  em fluxos internos.)
CREATE POLICY "mercado_entidades_read_pub" ON public.mercado_entidades
  FOR SELECT TO authenticated USING (redistribuivel = true);
CREATE POLICY "mercado_veiculos_read_pub" ON public.mercado_veiculos
  FOR SELECT TO authenticated USING (redistribuivel = true);
CREATE POLICY "mercado_metricas_read_pub" ON public.mercado_metricas
  FOR SELECT TO authenticated USING (redistribuivel = true);
-- Tabelas de relação: leitura liberada a autenticados (as entidades já são gated).
CREATE POLICY "mercado_prestadores_read" ON public.mercado_veiculo_prestadores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mercado_conexoes_read" ON public.mercado_conexoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mercado_rankings_read" ON public.mercado_rankings
  FOR SELECT TO authenticated USING (true);

-- Escrita/ETL: apenas service_role.
CREATE POLICY "mercado_entidades_service"   ON public.mercado_entidades           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_veiculos_service"    ON public.mercado_veiculos            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_prestadores_service" ON public.mercado_veiculo_prestadores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_metricas_service"    ON public.mercado_metricas            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_conexoes_service"    ON public.mercado_conexoes            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_rankings_service"    ON public.mercado_rankings            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mercado_ingestao_service"    ON public.mercado_ingestao_runs       FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================
-- SEED de demonstração (dado aberto / público; idempotente)
-- ============================================================
-- Conjunto curado de participantes reais do mercado para o painel já
-- renderizar antes do primeiro ETL. fonte='seed', redistribuivel=true.
-- Pode ser apagado com: DELETE FROM public.mercado_entidades WHERE fonte='seed';
-- ============================================================
INSERT INTO public.mercado_entidades (razao_social, nome_fantasia, tipos, situacao, uf, municipio, fonte, score_relevancia)
VALUES
  ('BTG PACTUAL SERVICOS FINANCEIROS S.A. DTVM', 'BTG Pactual',        ARRAY['administrador','custodiante','banco','gestora'], 'ativa', 'RJ', 'Rio de Janeiro', 'seed', 96),
  ('XP INVESTIMENTOS CCTVM S.A.',                'XP Investimentos',   ARRAY['distribuidor','administrador','gestora'],         'ativa', 'SP', 'São Paulo',       'seed', 94),
  ('VORTX DTVM LTDA',                            'Vórtx',              ARRAY['administrador','custodiante'],                    'ativa', 'SP', 'São Paulo',       'seed', 88),
  ('SINGULARE CORRETORA DE TITULOS E VALORES MOBILIARIOS S.A.', 'Singulare', ARRAY['administrador','custodiante'],          'ativa', 'SP', 'São Paulo',       'seed', 82),
  ('OLIVEIRA TRUST DTVM S.A.',                   'Oliveira Trust',     ARRAY['administrador','custodiante','controladoria'],    'ativa', 'RJ', 'Rio de Janeiro', 'seed', 80),
  ('KINEA INVESTIMENTOS LTDA',                   'Kinea',              ARRAY['gestora'],                                        'ativa', 'SP', 'São Paulo',       'seed', 85),
  ('SPX GESTAO DE RECURSOS LTDA',                'SPX Capital',        ARRAY['gestora'],                                        'ativa', 'SP', 'São Paulo',       'seed', 83),
  ('CANVAS GESTAO DE RECURSOS LTDA',             'Canvas Capital',     ARRAY['gestora'],                                        'ativa', 'SP', 'São Paulo',       'seed', 72),
  ('TRUE SECURITIZADORA S.A.',                   'True Securitizadora',ARRAY['securitizadora'],                                 'ativa', 'SP', 'São Paulo',       'seed', 78),
  ('OPEA SECURITIZADORA S.A.',                   'Opea',               ARRAY['securitizadora'],                                 'ativa', 'SP', 'São Paulo',       'seed', 81),
  ('BANCO BTG PACTUAL S.A.',                     'Banco BTG Pactual',  ARRAY['banco'],                                          'ativa', 'RJ', 'Rio de Janeiro', 'seed', 95),
  ('EMPIRICA INVESTIMENTOS GESTAO DE RECURSOS LTDA','Empírica',        ARRAY['gestora','escritorio_credito_estruturado'],       'ativa', 'SP', 'São Paulo',       'seed', 76)
ON CONFLICT (cnpj) DO NOTHING;

-- Veículos demo + prestadores (formam o grafo de conexões da demo)
INSERT INTO public.mercado_veiculos (nome, tipo, categoria_cvm, situacao, fonte)
VALUES
  ('Kinea Crédito Estruturado FIDC',      'FIDC', 'FIDC', 'ativo', 'seed'),
  ('Empírica Recebíveis Multissetorial FIDC', 'FIDC', 'FIDC', 'ativo', 'seed'),
  ('Kinea Renda Imobiliária FII',         'FII',  'FII',  'ativo', 'seed')
ON CONFLICT (cnpj, tipo) DO NOTHING;

-- Liga prestadores aos veículos (apenas quando o seed acima foi inserido).
DO $seed$
DECLARE
  v_kinea_fidc   uuid; v_empirica_fidc uuid; v_kinea_fii uuid;
  e_kinea uuid; e_empirica uuid; e_vortx uuid; e_btg uuid; e_singulare uuid; e_xp uuid;
BEGIN
  SELECT id INTO v_kinea_fidc    FROM public.mercado_veiculos WHERE nome = 'Kinea Crédito Estruturado FIDC' AND fonte='seed';
  SELECT id INTO v_empirica_fidc FROM public.mercado_veiculos WHERE nome = 'Empírica Recebíveis Multissetorial FIDC' AND fonte='seed';
  SELECT id INTO v_kinea_fii     FROM public.mercado_veiculos WHERE nome = 'Kinea Renda Imobiliária FII' AND fonte='seed';
  SELECT id INTO e_kinea     FROM public.mercado_entidades WHERE nome_fantasia = 'Kinea' AND fonte='seed';
  SELECT id INTO e_empirica  FROM public.mercado_entidades WHERE nome_fantasia = 'Empírica' AND fonte='seed';
  SELECT id INTO e_vortx     FROM public.mercado_entidades WHERE nome_fantasia = 'Vórtx' AND fonte='seed';
  SELECT id INTO e_btg       FROM public.mercado_entidades WHERE nome_fantasia = 'BTG Pactual' AND fonte='seed';
  SELECT id INTO e_singulare FROM public.mercado_entidades WHERE nome_fantasia = 'Singulare' AND fonte='seed';
  SELECT id INTO e_xp        FROM public.mercado_entidades WHERE nome_fantasia = 'XP Investimentos' AND fonte='seed';

  IF v_kinea_fidc IS NOT NULL THEN
    INSERT INTO public.mercado_veiculo_prestadores (veiculo_id, entidade_id, papel, fonte) VALUES
      (v_kinea_fidc, e_kinea, 'gestor', 'seed'),
      (v_kinea_fidc, e_vortx, 'administrador', 'seed'),
      (v_kinea_fidc, e_btg, 'custodiante', 'seed'),
      (v_kinea_fidc, e_xp, 'distribuidor', 'seed'),
      (v_empirica_fidc, e_empirica, 'gestor', 'seed'),
      (v_empirica_fidc, e_singulare, 'administrador', 'seed'),
      (v_empirica_fidc, e_btg, 'custodiante', 'seed'),
      (v_kinea_fii, e_kinea, 'gestor', 'seed'),
      (v_kinea_fii, e_btg, 'administrador', 'seed')
    ON CONFLICT (veiculo_id, entidade_id, papel) DO NOTHING;
  END IF;
END
$seed$;
