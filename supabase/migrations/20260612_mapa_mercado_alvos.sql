-- ============================================================
-- Mapa Inteligente do Mercado — RPC: alvos de captação (2026-06-12)
-- ============================================================
-- A partir do mandato de um deal (tipos de veículo: FIDC, FIP, FII, ...),
-- retorna GESTORAS que já operam aquele mandato no mercado, rankeadas por
-- experiência (nº de veículos no mandato) + score de relevância.
--
-- É o motor de originação assistida: "para quem levo este deal?".
-- Só dado aberto (CVM), redistribuível. NÃO é recomendação de investimento;
-- é um sinal de afinidade de mandato derivado do histórico público.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_alvos_captacao(
  p_tipos_veiculo text[],
  p_papeis        text[] DEFAULT ARRAY['gestor'],
  p_uf            text   DEFAULT NULL,
  p_limit         int    DEFAULT 20
)
RETURNS TABLE (
  entidade_id          uuid,
  razao_social         text,
  nome_fantasia        text,
  tipos                text[],
  uf                   text,
  score_relevancia     numeric,
  veiculos_no_mandato  bigint,
  total_veiculos       bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id, e.razao_social, e.nome_fantasia, e.tipos, e.uf, e.score_relevancia,
    count(DISTINCT vp.veiculo_id) FILTER (WHERE v.tipo = ANY(p_tipos_veiculo)) AS veiculos_no_mandato,
    count(DISTINCT vp.veiculo_id) AS total_veiculos
  FROM public.mercado_entidades e
  JOIN public.mercado_veiculo_prestadores vp
    ON vp.entidade_id = e.id AND vp.papel = ANY(p_papeis)
  JOIN public.mercado_veiculos v
    ON v.id = vp.veiculo_id AND v.redistribuivel = true
  WHERE e.redistribuivel = true
    AND (p_uf IS NULL OR e.uf = p_uf)
  GROUP BY e.id
  HAVING count(DISTINCT vp.veiculo_id) FILTER (WHERE v.tipo = ANY(p_tipos_veiculo)) > 0
  ORDER BY veiculos_no_mandato DESC, e.score_relevancia DESC NULLS LAST
  LIMIT p_limit;
$$;
