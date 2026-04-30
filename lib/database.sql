-- ============================================
-- RR7x Deal Intelligence Portal — Schema
-- Execute este SQL no Supabase: SQL Editor → New Query → Cole e rode
-- ============================================

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plano TEXT CHECK (plano IN ('avulso', 'recorrente', 'enterprise')) NOT NULL,
  analises_restantes INTEGER, -- NULL = ilimitado
  status TEXT CHECK (status IN ('ativo', 'cancelado', 'pendente')) DEFAULT 'pendente',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de análises
CREATE TABLE IF NOT EXISTS public.analises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_ativo TEXT NOT NULL,
  deal_intake JSONB NOT NULL,
  status TEXT CHECK (status IN ('processando', 'concluido', 'erro')) DEFAULT 'processando',
  outputs JSONB DEFAULT '{}',
  pdf_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analises ENABLE ROW LEVEL SECURITY;

-- Policies: usuário vê apenas seus próprios dados
CREATE POLICY "users_own_subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_analises" ON public.analises
  FOR ALL USING (auth.uid() = user_id);

-- Service role bypassa RLS (usado pelo webhook do Stripe e pela API de análise)
CREATE POLICY "service_role_subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_analises" ON public.analises
  FOR ALL TO service_role USING (true);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_analises_user_id ON public.analises(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- Tabela de aprendizados do administrador
-- Lida automaticamente por todos os agentes no início de cada análise
CREATE TABLE IF NOT EXISTS public.admin_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  texto TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_feedbacks ENABLE ROW LEVEL SECURITY;

-- Apenas service_role acessa (somente admin via API)
CREATE POLICY "service_role_feedbacks" ON public.admin_feedbacks
  FOR ALL TO service_role USING (true);
