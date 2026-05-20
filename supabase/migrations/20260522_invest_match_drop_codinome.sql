-- ============================================================
-- Invest Match — Remoção do codinome/blind (2026-05-22)
-- ============================================================
-- A apresentação ao investidor é sempre feita manualmente fora da plataforma,
-- então o nome-código blind (empresa_codinome) e o flag is_blind não têm uso.
-- As telas internas mostram sempre o nome real (empresa_nome).
--
-- Esta migration:
--   1) Reescreve as 2 funções reversas para retornar empresa_nome (não codinome)
--   2) Remove as colunas empresa_codinome e is_blind de teses
--
-- Ordem importa: recriar as funções ANTES do DROP COLUMN (senão as versões
-- antigas, que fazem SELECT t.empresa_codinome, quebrariam ao perder a coluna).
-- ============================================================

CREATE OR REPLACE FUNCTION public.invest_match_buscar_teses_para_investidor(
  p_investidor_id  uuid,
  p_limit          integer DEFAULT 50,
  p_min_score      numeric DEFAULT 50.0
)
RETURNS TABLE (
  tese_id            uuid,
  empresa_nome       text,
  score_estruturado  numeric,
  passou_hard_filter boolean,
  motivos_bloqueio   text[],
  breakdown          jsonb
)
LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$
DECLARE
  v_inv  public.investidores%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.investidores WHERE id = p_investidor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investidor % não encontrado', p_investidor_id;
  END IF;

  RETURN QUERY
  WITH calc AS (
    SELECT
      t.id                            AS tese_id,
      t.empresa_nome                  AS empresa_nome,
      (
        (v_inv.ticket_min_brl IS NULL OR t.capital_buscado_brl >= v_inv.ticket_min_brl) AND
        (v_inv.ticket_max_brl IS NULL OR t.capital_buscado_brl <= v_inv.ticket_max_brl) AND
        NOT (t.setor_primario = ANY(v_inv.setores_excluidos)) AND
        NOT (v_inv.requer_esg AND NOT t.esg_compliant) AND
        NOT (v_inv.requer_pronto_para_dd AND NOT t.pronto_para_dd) AND
        (
          cardinality(v_inv.geografias_aceitas) = 0
          OR t.hq_estado = ANY(v_inv.geografias_aceitas)
          OR 'NACIONAL' = ANY(v_inv.geografias_aceitas)
        ) AND
        NOT (t.hq_estado IS NOT NULL AND t.hq_estado = ANY(v_inv.geografias_excluidas))
      ) AS passou_hard_filter,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN v_inv.ticket_min_brl IS NOT NULL AND t.capital_buscado_brl < v_inv.ticket_min_brl
             THEN 'ticket_abaixo_minimo' END,
        CASE WHEN v_inv.ticket_max_brl IS NOT NULL AND t.capital_buscado_brl > v_inv.ticket_max_brl
             THEN 'ticket_acima_maximo' END,
        CASE WHEN t.setor_primario = ANY(v_inv.setores_excluidos)
             THEN 'setor_excluido' END,
        CASE WHEN v_inv.requer_esg AND NOT t.esg_compliant
             THEN 'esg_nao_compliant' END,
        CASE WHEN v_inv.requer_pronto_para_dd AND NOT t.pronto_para_dd
             THEN 'projeto_nao_pronto_para_dd' END,
        CASE WHEN cardinality(v_inv.geografias_aceitas) > 0
             AND NOT (t.hq_estado = ANY(v_inv.geografias_aceitas))
             AND NOT ('NACIONAL' = ANY(v_inv.geografias_aceitas))
             THEN 'geografia_incompativel' END,
        CASE WHEN t.hq_estado IS NOT NULL AND t.hq_estado = ANY(v_inv.geografias_excluidas)
             THEN 'geografia_excluida' END
      ], NULL) AS motivos_bloqueio,
      (CASE
        WHEN t.setor_primario = ANY(v_inv.setores_alvo)                        THEN 100
        WHEN t.sub_setores && v_inv.sub_setores                                THEN 70
        WHEN t.vertical_tags && v_inv.vertical_tags                            THEN 50
        WHEN cardinality(v_inv.setores_alvo) = 0                               THEN 60
        ELSE 0
      END)::numeric AS s_setorial,
      (CASE
        WHEN v_inv.ticket_min_brl IS NULL OR v_inv.ticket_max_brl IS NULL      THEN 70
        WHEN t.capital_buscado_brl BETWEEN v_inv.ticket_min_brl AND v_inv.ticket_max_brl THEN
          GREATEST(70,
            100 - 30 * ABS(
              (t.capital_buscado_brl::numeric - (v_inv.ticket_min_brl + v_inv.ticket_max_brl)::numeric / 2)
              / NULLIF((v_inv.ticket_max_brl - v_inv.ticket_min_brl)::numeric / 2, 0)
            ))
        ELSE 0
      END)::numeric AS s_ticket,
      (CASE
        WHEN t.estagio = ANY(v_inv.estagios_aceitos)                           THEN 100
        WHEN cardinality(v_inv.estagios_aceitos) = 0                           THEN 50
        ELSE 20
      END)::numeric AS s_stage,
      (CASE
        WHEN v_inv.maturity_min_score IS NULL                                  THEN 70
        WHEN t.maturity_score IS NULL                                          THEN 40
        WHEN t.maturity_score >= v_inv.maturity_min_score                      THEN 100
        WHEN t.maturity_score >= v_inv.maturity_min_score * 0.8                THEN 70
        ELSE 30
      END)::numeric AS s_maturity,
      (CASE
        WHEN v_inv.governance_min_score IS NULL                                THEN 70
        WHEN t.governance_score IS NULL                                        THEN 40
        WHEN t.governance_score >= v_inv.governance_min_score                  THEN 100
        WHEN t.governance_score >= v_inv.governance_min_score * 0.8            THEN 70
        ELSE 30
      END)::numeric AS s_governance,
      (CASE
        WHEN v_inv.risk_max_score IS NULL                                      THEN 70
        WHEN t.risk_overall_score IS NULL                                      THEN 40
        WHEN t.risk_overall_score <= v_inv.risk_max_score                      THEN 100
        WHEN t.risk_overall_score <= v_inv.risk_max_score * 1.2                THEN 60
        ELSE 20
      END)::numeric AS s_risk,
      (CASE
        WHEN t.hq_estado IS NULL OR cardinality(v_inv.geografias_aceitas) = 0  THEN 70
        WHEN t.hq_estado = ANY(v_inv.geografias_aceitas)                       THEN 100
        WHEN 'NACIONAL' = ANY(v_inv.geografias_aceitas)                        THEN 80
        ELSE 30
      END)::numeric AS s_geography,
      (CASE
        WHEN v_inv.documentacao_min_score IS NULL                              THEN 70
        WHEN t.documentacao_score IS NULL                                      THEN 40
        WHEN t.documentacao_score >= v_inv.documentacao_min_score              THEN 100
        WHEN t.documentacao_score >= v_inv.documentacao_min_score * 0.8        THEN 65
        ELSE 25
      END)::numeric AS s_documentation,
      (CASE
        WHEN v_inv.horizonte_saida_min_anos IS NULL OR v_inv.horizonte_saida_max_anos IS NULL THEN 70
        WHEN t.horizonte_saida_anos IS NULL                                    THEN 50
        WHEN t.horizonte_saida_anos BETWEEN v_inv.horizonte_saida_min_anos AND v_inv.horizonte_saida_max_anos THEN 100
        ELSE 40
      END)::numeric AS s_exit_horizon,
      (CASE t.urgencia
        WHEN 'alta'  THEN 100
        WHEN 'media' THEN 80
        WHEN 'baixa' THEN 60
        ELSE 70
      END)::numeric AS s_urgency
    FROM public.teses t
    WHERE t.escritorio_id = v_inv.escritorio_id
      AND t.status NOT IN ('arquivado', 'suspenso', 'realizado')
  )
  SELECT
    c.tese_id,
    c.empresa_nome,
    ROUND((
      c.s_setorial * 0.20 + c.s_ticket * 0.15 + c.s_stage * 0.10 + c.s_maturity * 0.10 +
      c.s_governance * 0.10 + c.s_risk * 0.10 + c.s_geography * 0.05 + c.s_documentation * 0.10 +
      c.s_exit_horizon * 0.05 + c.s_urgency * 0.05
    )::numeric, 2) AS score_estruturado,
    c.passou_hard_filter,
    c.motivos_bloqueio,
    jsonb_build_object(
      'setorial',       jsonb_build_object('score', c.s_setorial,      'peso', 0.20),
      'ticket',         jsonb_build_object('score', c.s_ticket,        'peso', 0.15),
      'stage',          jsonb_build_object('score', c.s_stage,         'peso', 0.10),
      'maturity',       jsonb_build_object('score', c.s_maturity,      'peso', 0.10),
      'governance',     jsonb_build_object('score', c.s_governance,    'peso', 0.10),
      'risk',           jsonb_build_object('score', c.s_risk,          'peso', 0.10),
      'geography',      jsonb_build_object('score', c.s_geography,     'peso', 0.05),
      'documentation',  jsonb_build_object('score', c.s_documentation, 'peso', 0.10),
      'exit_horizon',   jsonb_build_object('score', c.s_exit_horizon,  'peso', 0.05),
      'urgency',        jsonb_build_object('score', c.s_urgency,       'peso', 0.05)
    ) AS breakdown
  FROM calc c
  WHERE c.passou_hard_filter = true
    AND (
      c.s_setorial * 0.20 + c.s_ticket * 0.15 + c.s_stage * 0.10 + c.s_maturity * 0.10 +
      c.s_governance * 0.10 + c.s_risk * 0.10 + c.s_geography * 0.05 + c.s_documentation * 0.10 +
      c.s_exit_horizon * 0.05 + c.s_urgency * 0.05
    ) >= p_min_score
  ORDER BY score_estruturado DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.invest_match_busca_semantica_teses(
  p_investidor_id     uuid,
  p_match_count       integer DEFAULT 20,
  p_similarity_min    double precision DEFAULT 0.5
)
RETURNS TABLE (
  tese_id          uuid,
  empresa_nome     text,
  similarity       double precision
)
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT
    t.id           AS tese_id,
    t.empresa_nome AS empresa_nome,
    1 - (t.tese_embedding <=> i.tese_embedding) AS similarity
  FROM public.teses t
  JOIN public.investidores i ON i.id = p_investidor_id
  WHERE t.escritorio_id = i.escritorio_id
    AND t.status NOT IN ('arquivado', 'suspenso', 'realizado')
    AND t.tese_embedding IS NOT NULL
    AND i.tese_embedding IS NOT NULL
    AND 1 - (t.tese_embedding <=> i.tese_embedding) >= p_similarity_min
  ORDER BY t.tese_embedding <=> i.tese_embedding
  LIMIT p_match_count;
$$;

-- Remove as colunas agora não-usadas
ALTER TABLE public.teses DROP COLUMN IF EXISTS empresa_codinome;
ALTER TABLE public.teses DROP COLUMN IF EXISTS is_blind;
