# Segredos & Variáveis de Ambiente — rr7x-portal (Mandor)

> Este documento **não contém valores**. Só descreve **quais** segredos existem,
> **onde** os valores reais ficam e **como** rotacioná-los. Os valores moram em:
> 1. **Vercel** → Settings → Environment Variables (fonte de verdade em produção)
> 2. **.env.local** (local, gitignored)
> 3. **Cofre de senhas** (cópia de recuperação — 1Password/Bitwarden)

## Regra de ouro

- **Nunca** commitar valores no git, subir para o Drive em texto puro, nem colar no Arquivo Âncora/zip.
- O `.env.example` (versionado) tem só os **nomes**. Para recuperar: copie para `.env.local` e preencha do cofre.
- Backup off-site dos valores deve ser **criptografado** (ver seção "Backup criptografado").

## Inventário

| Variável | Tipo | Para que serve | Onde obter / rotacionar |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto Supabase | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | chave anônima (RLS protege) | Supabase → API |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` | público | base URL do app | config (www.mandor.com.br) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | público | checkout client | Stripe → Developers → API keys |
| `RESEND_FROM_EMAIL` | config | remetente dos e-mails | config |
| `STRIPE_PRICE_AVULSO` / `STRIPE_PRICE_RECORRENTE` | config | IDs de preço | Stripe → Products |
| `ANTHROPIC_MODEL_OVERRIDE` / `INGESTION_WATCHDOG_GRACE_MIN` / `USD_BRL_RATE` | config | tuning opcional | config |
| `SUPABASE_SERVICE_ROLE_KEY` | **SEGREDO** | acesso total ao banco (bypassa RLS) | Supabase → API → rotacionar lá |
| `ENCRYPTION_KEY` | **SEGREDO CRÍTICO** | cifra a PII do intake no banco | **Se perder, a PII cifrada fica irrecuperável.** Não rotacionar sem migrar os dados. |
| `INTERNAL_PIPELINE_TOKEN` | **SEGREDO** | auth server-to-server do pipeline | gerar novo (random 32+ bytes) e atualizar na Vercel |
| `SHARE_TOKEN_SECRET` | **SEGREDO** | assina links de compartilhamento | rotacionar invalida links existentes |
| `NEXTAUTH_SECRET` | **SEGREDO** | sessão/JWT | gerar novo (`openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | **SEGREDO** | Claude (LLM) | console.anthropic.com → API Keys |
| `VOYAGE_API_KEY` | **SEGREDO** | embeddings | dash.voyageai.com |
| `MISTRAL_API_KEY` | **SEGREDO** | OCR | console.mistral.ai |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | **SEGREDO** | jobs/cron | app.inngest.com → keys |
| `RESEND_API_KEY` | **SEGREDO** | envio de e-mail | resend.com → API Keys |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | **SEGREDO** | pagamentos / webhook | Stripe → API keys / Webhooks |

## ⚠️ `ENCRYPTION_KEY` — o mais importante

Cifra a PII (CPF/CNPJ/dados sensíveis) gravada no banco. Diferente de uma API key,
**não pode ser simplesmente recriada**: se for perdida, os dados já cifrados no banco
não podem mais ser decifrados. Garanta que o valor esteja **no cofre de senhas**.

## Como recuperar o ambiente do zero

1. `cp .env.example .env.local`
2. Preencher os valores a partir do cofre (ou da Vercel → Environment Variables).
3. `npm install && npm run dev` (ou `vercel pull` para puxar as vars da Vercel).

## Backup criptografado dos valores (opcional, off-site)

Se quiser uma cópia dos valores no Drive, ela precisa estar **criptografada**.
Rode você mesmo no Terminal (a senha nunca passa por aqui):

```bash
# criptografa o .env.local com uma senha que só você sabe:
openssl enc -aes-256-cbc -pbkdf2 -salt -in .env.local -out env.local.enc
# o env.local.enc pode ir para o Drive com segurança.

# para restaurar:
openssl enc -d -aes-256-cbc -pbkdf2 -in env.local.enc -out .env.local
```

Guarde a **senha do openssl** no cofre. Sem ela, o arquivo é inútil (essa é a ideia).
