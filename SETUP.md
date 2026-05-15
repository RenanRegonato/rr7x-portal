# RR7x Deal Intelligence Portal — Guia de Setup

Siga este guia do início ao fim. Cada passo tem instruções exatas.

---

## PASSO 1 — Criar conta no Supabase

1. Acesse **supabase.com** e crie uma conta gratuita
2. Clique em **New Project**, escolha um nome (ex: `rr7x-portal`) e uma senha forte
3. Aguarde o projeto criar (~1 minuto)
4. Vá em **Settings → API**
5. Copie:
   - `Project URL` → cole em `NEXT_PUBLIC_SUPABASE_URL` no arquivo `.env.local`
   - `anon public` key → cole em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → cole em `SUPABASE_SERVICE_ROLE_KEY`
6. Vá em **SQL Editor → New Query**, cole o conteúdo do arquivo `lib/database.sql` e clique **Run**

---

## PASSO 2 — Criar conta no Stripe

1. Acesse **stripe.com** e crie uma conta
2. No menu esquerdo, vá em **Developers → API Keys**
3. Copie:
   - `Publishable key` → cole em `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → cole em `STRIPE_SECRET_KEY`
4. Vá em **Products → Add Product** e crie dois produtos:
   - **Produto 1**: Nome "Deal Intelligence Avulso" → One-time price → R$ 3.500 (BRL)
     - Copie o `Price ID` (começa com `price_`) → cole em `STRIPE_PRICE_AVULSO`
   - **Produto 2**: Nome "Deal Intelligence Recorrente" → Recurring → R$ 10.000/mês (BRL)
     - Copie o `Price ID` → cole em `STRIPE_PRICE_RECORRENTE`

---

## PASSO 3 — Criar conta no Resend (para emails)

1. Acesse **resend.com** e crie uma conta gratuita
2. Vá em **API Keys → Create API Key**
3. Cole a chave em `RESEND_API_KEY`
4. Em `RESEND_FROM_EMAIL` coloque `noreply@seudominio.com.br` (ou `onboarding@resend.dev` para testes)

---

## PASSO 4 — Configurar a chave da Anthropic

1. Acesse **console.anthropic.com → API Keys**
2. Copie sua chave e cole em `ANTHROPIC_API_KEY`

---

## PASSO 5 — Rodar localmente

Abra o terminal, navegue até a pasta do projeto e rode:

```bash
cd /Users/renan/Desktop/rr7x-portal
npm run dev
```

Acesse **http://localhost:3000** no navegador.

Teste o fluxo completo:
- [ ] Landing page aparece
- [ ] Criar conta → email de confirmação chega
- [ ] Login funciona → dashboard aparece
- [ ] Botão "Adquirir Plano" → vai para página de planos

---

## PASSO 6 — Deploy no Vercel

1. Crie uma conta em **vercel.com**
2. Instale o Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Na pasta do projeto, rode:
   ```bash
   vercel
   ```
4. Siga as perguntas: confirme o projeto, escolha a org, etc.
5. Após o primeiro deploy, acesse o **Vercel Dashboard**
6. Vá em **Settings → Environment Variables** e adicione todas as variáveis do `.env.local`
   - Importante: mude `NEXT_PUBLIC_APP_URL` para a URL de produção (ex: `https://www.mandor.com.br`)
7. Rode `vercel --prod` para o deploy final

---

## PASSO 7 — Configurar Webhook do Stripe (para produção)

1. No Stripe, vá em **Developers → Webhooks → Add endpoint**
2. URL: `https://seu-dominio.vercel.app/api/webhook`
3. Eventos a ouvir:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
4. Copie o **Signing secret** → cole em `STRIPE_WEBHOOK_SECRET` nas variáveis do Vercel
5. Faça redeploy: `vercel --prod`

---

## PASSO 8 — Configurar Supabase para produção

No Supabase, vá em **Authentication → URL Configuration**:
- Site URL: `https://seu-dominio.vercel.app`
- Redirect URLs: `https://seu-dominio.vercel.app/auth/callback`

---

## Pronto! O sistema está no ar.

Fluxo do cliente:
1. Acessa o portal → cria conta → verifica email
2. Escolhe plano → paga no Stripe → plano ativa automaticamente
3. Preenche Deal Intake (8 campos) → pipeline de 9 agentes roda
4. Aguarda 45–90 min → baixa os outputs completos

---

## Problemas comuns

**"Sem assinatura ativa"** ao tentar criar análise:
- Verifique se o webhook do Stripe está configurado e funcionando
- Em modo teste, use o cartão `4242 4242 4242 4242` no Stripe Checkout

**Email de confirmação não chega:**
- Verifique as configurações de SMTP do Supabase ou use o Magic Link

**Erro no pipeline:**
- Verifique se a `ANTHROPIC_API_KEY` está correta
- Verifique os logs em Vercel Dashboard → Functions
