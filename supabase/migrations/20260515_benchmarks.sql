-- ============================================
-- Benchmark Registry (Mandor) — Fase 7 — 2026-05-15
-- Regras de mercado versionadas para validação quantitativa de elegibilidade.
-- Substitui hardcode/alucinação por base auditável e editável pelo gestor.
-- ============================================

CREATE TABLE IF NOT EXISTS public.market_benchmarks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de instrumento financeiro / operação
  -- Convenção (texto livre, mas usar estes valores quando possível):
  -- 'FIDC' | 'CRI' | 'CRA' | 'CCB' | 'DEBENTURE' | 'DEBENTURE_INCENTIVADA'
  -- 'M_A_PME' | 'M_A_MEDIO' | 'M_A_TECH' | 'CREDITO_BANCARIO'
  instrument    text        NOT NULL,

  -- Parâmetro avaliado
  -- 'ticket_minimo' | 'ticket_maximo' | 'patrimonio_minimo_cedente'
  -- 'prazo_minimo_meses' | 'prazo_maximo_meses' | 'prazo_tipico_meses'
  -- 'spread_senior_pct_cdi' | 'spread_subordinado_pct_cdi'
  -- 'num_devedores_minimo' | 'concentracao_maxima_pct'
  -- 'multiplo_ebitda_min' | 'multiplo_ebitda_max'
  -- 'loan_to_value_maximo_pct' | 'custo_estruturacao_pct'
  parameter     text        NOT NULL,

  -- Range esperado (mínimo/máximo). Se for valor único, preencher os dois iguais.
  value_min     numeric     NOT NULL,
  value_max     numeric     NOT NULL CHECK (value_max >= value_min),

  -- Unidade: 'BRL' | 'pct' | 'multiplo' | 'meses' | 'qtd' | 'pct_cdi'
  unit          text        NOT NULL,

  -- Descrição em PT pra UI e prompts
  descricao     text,
  notes         text,
  source        text,        -- referência regulatória, paper, prática de mercado

  -- Versionamento temporal
  valid_from    date        NOT NULL DEFAULT current_date,
  valid_to      date,        -- NULL = ainda vigente

  -- Soft delete
  ativo         boolean     NOT NULL DEFAULT true,

  criado_por    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_instrument
  ON public.market_benchmarks (instrument)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_benchmarks_instrument_parameter
  ON public.market_benchmarks (instrument, parameter)
  WHERE ativo = true;

ALTER TABLE public.market_benchmarks ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode LER benchmarks ativos
-- (agentes precisam consultar; assessores podem ver o porquê de um veredicto)
CREATE POLICY "benchmarks_read_authenticated" ON public.market_benchmarks
  FOR SELECT USING (auth.role() = 'authenticated' AND ativo = true);

-- Service role tem acesso total (escritas via API admin)
CREATE POLICY "benchmarks_service" ON public.market_benchmarks
  FOR ALL TO service_role USING (true);

-- ============================================
-- SEED: benchmarks iniciais
-- Baseado em práticas de mercado brasileiras (2024-2026).
-- Gestor pode editar via /dashboard/admin/benchmarks.
-- ============================================

INSERT INTO public.market_benchmarks (instrument, parameter, value_min, value_max, unit, descricao, source) VALUES
-- FIDC
('FIDC', 'ticket_minimo',              5000000,   10000000,  'BRL',    'Ticket mínimo típico para FIDC institucional',                     'Prática de mercado'),
('FIDC', 'patrimonio_minimo_cedente',  2000000,   2000000,   'BRL',    'Patrimônio líquido mínimo do cedente para originação relevante',   'CVM 175/22'),
('FIDC', 'prazo_tipico_meses',         36,        60,        'meses',  'Prazo típico de FIDC',                                             'Prática de mercado'),
('FIDC', 'num_devedores_minimo',       10,        10,        'qtd',    'Número mínimo de devedores para evitar concentração crítica',     'Prática de mercado'),
('FIDC', 'concentracao_maxima_pct',    20,        25,        'pct',    'Concentração máxima por devedor (% do PL)',                       'CVM 175/22'),
('FIDC', 'spread_senior_pct_cdi',      1.5,       3.5,       'pct_cdi','Spread típico da cota sênior sobre CDI',                          'Prática de mercado'),
('FIDC', 'spread_subordinado_pct_cdi', 5,         12,        'pct_cdi','Spread típico da cota subordinada sobre CDI',                     'Prática de mercado'),
('FIDC', 'custo_estruturacao_pct',     0.5,       2.0,       'pct',    'Custo de estruturação como % do ticket',                          'Prática de mercado'),

-- CRI (Crédito imobiliário)
('CRI', 'ticket_minimo',               10000000,  20000000,  'BRL',    'Ticket mínimo para CRI viável',                                    'Prática de mercado'),
('CRI', 'prazo_tipico_meses',          60,        180,       'meses',  'Prazo típico de CRI',                                              'Prática de mercado'),
('CRI', 'loan_to_value_maximo_pct',    70,        80,        'pct',    'LTV máximo aceito por instituições',                              'Prática de mercado'),

-- CRA (Crédito agronegócio)
('CRA', 'ticket_minimo',               10000000,  20000000,  'BRL',    'Ticket mínimo para CRA viável',                                    'Prática de mercado'),
('CRA', 'prazo_tipico_meses',          36,        120,       'meses',  'Prazo típico de CRA',                                              'Prática de mercado'),

-- CCB (Cédula de crédito bancário)
('CCB', 'ticket_minimo',               500000,    1000000,   'BRL',    'Ticket mínimo prático para CCB estruturada',                       'Prática de mercado'),
('CCB', 'prazo_minimo_meses',          6,         6,         'meses',  'Prazo mínimo prático',                                             'Prática de mercado'),
('CCB', 'prazo_maximo_meses',          60,        84,        'meses',  'Prazo máximo típico',                                              'Prática de mercado'),

-- Debênture (não incentivada)
('DEBENTURE', 'ticket_minimo',         50000000,  100000000, 'BRL',    'Ticket mínimo para emissão pública via ICVM 476',                  'CVM 476/09'),
('DEBENTURE', 'spread_tipico_pct_cdi', 1,         3,         'pct_cdi','Spread típico sobre CDI',                                          'Prática de mercado'),

-- Debênture incentivada (Lei 12.431)
('DEBENTURE_INCENTIVADA', 'ticket_minimo',       100000000, 200000000, 'BRL',   'Ticket mínimo prático',                                    'Lei 12.431/11'),
('DEBENTURE_INCENTIVADA', 'prazo_minimo_meses',  48,        48,        'meses', 'Prazo mínimo regulatório',                                  'Lei 12.431/11'),

-- M&A PME (small cap)
('M_A_PME', 'multiplo_ebitda_min',     3,         3,         'multiplo','Múltiplo EBITDA mínimo típico em PMEs',                            'Prática de mercado'),
('M_A_PME', 'multiplo_ebitda_max',     7,         8,         'multiplo','Múltiplo EBITDA máximo típico em PMEs',                            'Prática de mercado'),

-- M&A médio porte
('M_A_MEDIO', 'multiplo_ebitda_min',   5,         5,         'multiplo','Múltiplo EBITDA mínimo em médias empresas',                        'Prática de mercado'),
('M_A_MEDIO', 'multiplo_ebitda_max',   10,        12,        'multiplo','Múltiplo EBITDA máximo em médias empresas',                        'Prática de mercado'),

-- M&A tech / SaaS
('M_A_TECH', 'multiplo_ebitda_min',    8,         10,        'multiplo','Múltiplo EBITDA mínimo em tech/SaaS com tração',                   'Prática de mercado'),
('M_A_TECH', 'multiplo_ebitda_max',    20,        30,        'multiplo','Múltiplo EBITDA máximo em tech com alta tração',                   'Prática de mercado'),
('M_A_TECH', 'multiplo_receita_arr',   5,         15,        'multiplo','Múltiplo de receita (ARR) para SaaS',                              'Prática de mercado'),

-- Crédito bancário garantido
('CREDITO_BANCARIO', 'spread_pct_cdi',    1,      5,         'pct_cdi','Spread típico de crédito bancário garantido',                      'Prática de mercado'),
('CREDITO_BANCARIO', 'prazo_maximo_meses',60,     84,        'meses',  'Prazo máximo típico',                                              'Prática de mercado');
