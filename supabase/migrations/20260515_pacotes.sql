-- ============================================
-- Pacotes de Análises (Mandor)
-- Cada escritório pode ter múltiplos pacotes; o gestor (role=admin) gerencia.
-- Consumo: cada análise criada decrementa do pacote ativo mais antigo (FIFO).
-- ============================================

CREATE TABLE IF NOT EXISTS public.pacotes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id        uuid        REFERENCES public.escritorios(id) ON DELETE CASCADE NOT NULL,
  tipo                 text        NOT NULL CHECK (tipo IN ('pontual', 'institucional', 'corporativo')),
  analises_total       integer     NOT NULL CHECK (analises_total > 0),
  analises_consumidas  integer     NOT NULL DEFAULT 0 CHECK (analises_consumidas >= 0),
  status               text        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  observacoes          text,
  criado_por           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pacote_consumido_lte_total CHECK (analises_consumidas <= analises_total),
  CONSTRAINT institucional_max_20       CHECK (tipo <> 'institucional' OR analises_total <= 20)
);

CREATE INDEX IF NOT EXISTS idx_pacotes_escritorio
  ON public.pacotes (escritorio_id);

CREATE INDEX IF NOT EXISTS idx_pacotes_escritorio_ativo
  ON public.pacotes (escritorio_id, criado_em)
  WHERE status = 'ativo';

ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;

-- Membros do escritório (perfis.escritorio_id) podem ler pacotes do próprio escritório
CREATE POLICY "pacotes_read_escritorio_members" ON public.pacotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
      AND perfis.escritorio_id = pacotes.escritorio_id
    )
  );

-- Dono do escritório (escritorios.user_id) também pode ler
CREATE POLICY "pacotes_read_escritorio_owner" ON public.pacotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = pacotes.escritorio_id
      AND escritorios.user_id = auth.uid()
    )
  );

-- Service role tem acesso total (admin via API + consumo automático)
CREATE POLICY "pacotes_service_role" ON public.pacotes
  FOR ALL TO service_role USING (true);

-- Nota: atualizado_em é atualizado manualmente nas rotas API (padrão das outras
-- tabelas em português neste projeto). Não usamos trigger aqui.

-- ============================================
-- Vínculo análise → pacote consumido
-- ============================================

ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS pacote_id uuid REFERENCES public.pacotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analises_pacote
  ON public.analises (pacote_id);
