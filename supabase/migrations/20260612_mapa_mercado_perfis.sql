-- ============================================================
-- Mapa Inteligente do Mercado — Classificação por nome (2026-06-12)
-- ============================================================
-- A CVM classifica papéis (gestor/admin/custodiante), não modelo de negócio.
-- Esta RPC marca, por heurística de NOME, perfis de negócio sobre quem já está
-- na base (tipicamente como gestora):
--   - family_office       : family offices / wealth / gestão de patrimônio
--   - boutique_investimento: boutiques de M&A/assessoria (partners/advisor/...)
--   - escritorio_credito_estruturado: crédito estruturado (raro na fonte aberta)
-- Append idempotente (não duplica), preserva os demais papéis. Re-aplicável
-- (chamada no pós-processamento do ETL p/ sobreviver ao cron semanal).
-- NÃO usa "CAPITAL" (genérico demais → super-marcaria).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_classificar_por_nome()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- family_office
  UPDATE public.mercado_entidades e
  SET tipos = (SELECT array_agg(DISTINCT t) FROM unnest(e.tipos || ARRAY['family_office']) t)
  WHERE NOT ('family_office' = ANY(e.tipos))
    AND upper(coalesce(e.nome_fantasia,'') || ' ' || e.razao_social) ~
        '(FAMILY OFFICE|MULTI[ -]?FAMILY|WEALTH MANAG|GEST.O DE PATRIM|GEST.O PATRIMONIAL|GEST.O DE FORTUNA)';

  -- boutique_investimento
  UPDATE public.mercado_entidades e
  SET tipos = (SELECT array_agg(DISTINCT t) FROM unnest(e.tipos || ARRAY['boutique_investimento']) t)
  WHERE NOT ('boutique_investimento' = ANY(e.tipos))
    AND upper(coalesce(e.nome_fantasia,'') || ' ' || e.razao_social) ~
        '(PARTNERS|ADVISOR|INVESTMENT BANK|ASSESSORIA|M&A|MERGERS)';

  -- escritorio_credito_estruturado (raro: maioria não é registrada na CVM)
  UPDATE public.mercado_entidades e
  SET tipos = (SELECT array_agg(DISTINCT t) FROM unnest(e.tipos || ARRAY['escritorio_credito_estruturado']) t)
  WHERE NOT ('escritorio_credito_estruturado' = ANY(e.tipos))
    AND upper(coalesce(e.nome_fantasia,'') || ' ' || e.razao_social) ~
        '(CR.DITO ESTRUTURAD|ESTRUTURA..O DE CR.DITO)';
END;
$$;

-- Aplica imediatamente.
SELECT public.mercado_classificar_por_nome();
