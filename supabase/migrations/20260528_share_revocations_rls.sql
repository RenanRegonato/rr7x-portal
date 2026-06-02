-- ============================================
-- share_revocations — defesa em profundidade (RLS) — 2026-05-28
--
-- A tabela é usada por:
--   - app/api/analise/share/route.ts (upsert revogação por owner via admin client)
--   - app/view/[token]/page.tsx (lê revogação via admin client antes de servir)
--
-- Hoje TODO acesso é via service-role (admin client) então RLS desabilitada
-- "funcionaria". MAS defesa em profundidade: qualquer leitura/escrita acidental
-- pelo anon client (bug futuro) precisa ser barrada.
--
-- Esta migration é IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS) — pode
-- ser aplicada mesmo se a tabela já tiver sido criada manualmente no SQL editor.
-- ============================================

CREATE TABLE IF NOT EXISTS public.share_revocations (
  analise_id  uuid        PRIMARY KEY REFERENCES public.analises(id) ON DELETE CASCADE,
  revoked_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_revocations ENABLE ROW LEVEL SECURITY;

-- service_role: passe livre (todos os call-sites legítimos usam admin client).
DROP POLICY IF EXISTS "share_revocations_service" ON public.share_revocations;
CREATE POLICY "share_revocations_service" ON public.share_revocations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Usuário autenticado: pode ler/escrever revogações APENAS das suas análises.
-- Hoje o código não usa anon client pra essa tabela, mas se um dia usar (bug
-- ou refactor), o RLS limita ao owner da análise vinculada.
DROP POLICY IF EXISTS "share_revocations_owner_select" ON public.share_revocations;
CREATE POLICY "share_revocations_owner_select" ON public.share_revocations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = share_revocations.analise_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "share_revocations_owner_write" ON public.share_revocations;
CREATE POLICY "share_revocations_owner_write" ON public.share_revocations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = share_revocations.analise_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = share_revocations.analise_id AND a.user_id = auth.uid()
    )
  );
