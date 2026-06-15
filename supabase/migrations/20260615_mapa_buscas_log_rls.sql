-- ============================================================
-- LGPD: RLS + retenção no mapa_buscas_log (2026-06-15)
-- ============================================================
-- O log de buscas IA do Mapa grava o termo de busca cru (coluna q),
-- que pode conter dados pessoais (ex.: nome de uma pessoa pesquisada).
-- Esta migration fecha duas lacunas de proteção de dados:
--   1) RLS: a tabela não tinha Row Level Security. Passa a ter.
--      Leitura/escrita pelo app já usam service_role (bypassa RLS),
--      então o registro (registrarBuscaIa) e a contagem mensal
--      (mercado_buscas_ia_mes_count) seguem funcionando.
--   2) Retenção: a contagem mensal só precisa das linhas do mês
--      corrente. Linhas antigas viram apenas resíduo de dado pessoal.
--      Adiciona função de expurgo (minimização de dados, Art. 6º LGPD).
-- ============================================================

ALTER TABLE public.mapa_buscas_log ENABLE ROW LEVEL SECURITY;

-- service_role: acesso total (usado pelo app para registrar e contar).
DROP POLICY IF EXISTS "mapa_buscas_log_service" ON public.mapa_buscas_log;
CREATE POLICY "mapa_buscas_log_service" ON public.mapa_buscas_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Gestor/membro autenticado: pode LER apenas as buscas do próprio escritório
-- (auditoria; nenhum acesso a logs de outro escritório).
DROP POLICY IF EXISTS "mapa_buscas_log_own_escritorio" ON public.mapa_buscas_log;
CREATE POLICY "mapa_buscas_log_own_escritorio" ON public.mapa_buscas_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.user_id = auth.uid()
        AND p.escritorio_id = mapa_buscas_log.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios e
      WHERE e.id = mapa_buscas_log.escritorio_id
        AND e.user_id = auth.uid()
    )
  );

-- ============================================================
-- Retenção: expurga buscas com mais de 60 dias (mantém folga sobre
-- a janela mensal usada na contagem). Minimização de dados (LGPD).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mapa_buscas_log_purge(p_retention_days int DEFAULT 60)
RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.mapa_buscas_log
  WHERE criado_em < now() - make_interval(days => p_retention_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Agendamento diário do expurgo (apenas se a extensão pg_cron existir).
-- Em Supabase sem pg_cron, o expurgo pode ser disparado por um cron de
-- aplicação (Inngest) chamando a RPC mapa_buscas_log_purge.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'mapa-buscas-log-purge',
      '0 4 * * *',
      $cron$ SELECT public.mapa_buscas_log_purge(60); $cron$
    );
  END IF;
END;
$$;
