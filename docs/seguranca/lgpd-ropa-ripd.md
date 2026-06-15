# Mandor: ROPA e RIPD (LGPD)

> Documento de conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
> Registro das Operações de Tratamento (ROPA) e Relatório de Impacto à Proteção de Dados (RIPD).
> Fonte: levantamento do código em 15/06/2026. Atualizar a cada mudança que afete tratamento de dados pessoais.

## Identificação

- **Controlador:** RRX CAPITAL HUB LTDA, CNPJ 59.073.078/0001-89 (marca: O Mandor, www.mandor.com.br).
- **Encarregado (DPO):** Renan Luciano Regonato. Canal do titular: contato@rr7x.com.br.
- **Operação:** rede cognitiva de inteligência institucional para M&A, crédito estruturado e preparação de ativos. Recebe documentos de um ativo e entrega parecer institucional.

## Princípios aplicados

- **Minimização:** dados pessoais do intake são filtrados antes de irem à IA (só campos não-pessoais do ativo seguem ao LLM).
- **Segurança em repouso:** PII do proprietário e do assessor/parceiro cifrada com AES-256-GCM (`lib/crypto.ts`).
- **Isolamento:** RLS no Supabase por usuário/escritório; nenhum escritório vê dados de outro.
- **Dado público:** enriquecimento cadastral usa apenas CNPJ (dado público da Receita); CPF nunca é enviado a terceiros.

---

## 1. ROPA (Registro das Operações de Tratamento)

| # | Operação / Finalidade | Categorias de titulares | Categorias de dados | Base legal (LGPD) | Destinatários / Subprocessadores | Transf. internacional | Retenção |
|---|---|---|---|---|---|---|---|
| 1 | Cadastro e autenticação | Usuários do escritório (gestor, assessor) | Nome, e-mail profissional, escritório, cargo, role, IP, user-agent | Execução de contrato (7º, V) + legítimo interesse (segurança) | Supabase, Vercel | EUA | Enquanto conta ativa |
| 2 | Intake do ativo (mandato) | Proprietário do ativo, assessor, parceiro (podem ser terceiros não-contratantes) | Nome, CPF/CNPJ, telefone, e-mail, observações | Execução de contrato; legítimo interesse (exige LIA) para terceiros | Supabase (cifrado em repouso) | EUA | Até exclusão do deal |
| 3 | Processamento de documentos + pipeline de IA | Pessoas citadas nos documentos (sócios, terceiros) | Conteúdo de DRE, contratos, atos societários (pode conter PII) | Execução de contrato | Anthropic (Claude), Voyage (embeddings), Jina (validação de URL), Supabase Storage | EUA | Até exclusão do deal |
| 4 | Enriquecimento cadastral (auto-pull CNPJ) | Sócios da empresa-alvo | CNPJ (público); retorna QSA com nomes de sócios (público) | Legítimo interesse | BrasilAPI / Receita Federal | Brasil | Persistido no output |
| 5 | Compartilhamento de parecer por link | Destinatário do link | Nome do ativo + outputs (sem PII do intake) | Legítimo interesse / consentimento do dono | Portador do link (token HMAC, 7 dias) | n/a | Token expira em 7 dias; revogável |
| 6 | Cobrança / assinatura | Usuário pagante | E-mail, ID de cliente Stripe (sem dados de cartão) | Execução de contrato | Stripe | EUA | Prazo fiscal/legal |
| 7 | Monitoramento contínuo do deal | Empresa-alvo | CNPJ, situação cadastral | Legítimo interesse | BrasilAPI, cron Inngest | EUA/Brasil | Enquanto deal ativo |
| 8 | Observabilidade e auditoria | Usuários | user_id, IP, user-agent, eventos; texto livre de busca (mapa_buscas_log) | Legítimo interesse (segurança) | Supabase | EUA | audit_logs: a definir; mapa_buscas_log: 60 dias (expurgo) |

### Campos do intake e tratamento de PII (referência de código)

- Cifrados em repouso (`lib/crypto.ts`, AES-256-GCM): `nomeProprietario`, `cpfCnpjProprietario`, `telefoneProprietario`, `emailProprietario`, `obsProprietario`, `assessorNome`, `assessorTelefone`, `assessorEmail`, `parceiroNome`, `parceiroTelefone`, `parceiroEmail`.
- Não cifrado (usado como contexto analítico do mandato): `obsMandato`. Ver follow-up na seção 3.
- Enviado ao LLM (filtrado por `formatIntake`): apenas campos não-pessoais do ativo (`nomeAtivo`, `tipoAtivo`, `estagio`, `objetivo`, `nivelInformacao`, `operacaoEmAndamento`, `localizacao`, `ticketEstimado`, `resumoAtivo`, `informacoesAdicionais`).

### Subprocessadores

| Subprocessador | Função | Dado tratado | País |
|---|---|---|---|
| Supabase | Banco, autenticação, storage | Todos (intake cifrado) | EUA |
| Vercel | Hospedagem | Logs, IP, user-agent | EUA |
| Anthropic (Claude) | Análise por IA | Campos não-pessoais do intake + documentos | EUA |
| Voyage AI | Embeddings | Trechos de documentos | EUA |
| Jina AI | Leitura de URL pública do Drive | URL fornecida pelo usuário | Verificar |
| Inngest | Orquestração de jobs | Apenas IDs | EUA |
| BrasilAPI | Consulta CNPJ público | CNPJ (nunca CPF) | Brasil |
| Stripe | Pagamento | E-mail, ID de cliente | EUA/global |

---

## 2. RIPD (Relatório de Impacto) dos fluxos de maior risco

### 2.1 Documentos do deal enviados à Claude API (RISCO ALTO)

- **Fluxo:** no step de ingestão (`app/api/analise/[id]/step/route.ts`), documentos enviados pelo usuário (PDF/imagem) vão em base64 para a Anthropic. Se o documento contém CPF/CNPJ de sócios, a PII trafega sem mascaramento.
- **Mitigações existentes:** a PII estruturada do intake é filtrada e nunca enviada; o modo fact-bank reduz o reenvio de documentos brutos.
- **Mitigações recomendadas:** detecção/mascaramento de CPF antes do envio; consentimento informado no upload; cláusula de processamento de dados (DPA) com a Anthropic, incluindo a garantia de não-treinamento de modelos.

### 2.2 Auto-pull CNPJ retornando QSA ao prompt (RISCO MÉDIO)

- **Fluxo:** `lib/auto-pull/cnpj.ts` consulta CNPJ na BrasilAPI e injeta o quadro societário (nomes de sócios, dado público) no prompt. CPF nunca é enviado.
- **Avaliação:** dado público de terceiro; risco baixo a médio. Registrar a finalidade no ROPA (feito).

### 2.3 Compartilhamento de parecer por link (RISCO BAIXO/MÉDIO)

- **Fluxo:** token HMAC-SHA256 com expiração de 7 dias (`lib/share-token.ts`), revogável (`share_revocations`), expõe outputs do parecer e nome do ativo, sem PII do intake (`app/view/[token]`).
- **Avaliação:** bem desenhado. Manter auditoria de criação/acesso/revogação (já existe em `audit_logs`).

### 2.4 Log de busca com texto livre (RISCO MÉDIO, MITIGADO em 15/06/2026)

- **Fluxo:** `mapa_buscas_log.q` grava o termo de busca cru, que pode conter nome de pessoa.
- **Mitigação aplicada:** RLS por escritório + expurgo de 60 dias (migration `20260615_mapa_buscas_log_rls.sql`).
- **Follow-up opcional:** deixar de gravar o termo cru (a contagem mensal não usa `q`).

---

## 3. Lacunas e follow-ups

| Item | Status | Ação |
|---|---|---|
| PII de assessor/parceiro não cifrada | RESOLVIDO (15/06) | Campos adicionados a `SENSITIVE_FIELDS`; detecção de cifrado endurecida |
| `mapa_buscas_log` sem RLS + texto livre | RESOLVIDO (15/06, migration aplicada em prod) | RLS + expurgo de 60 dias |
| `obsMandato` não cifrado | EM ABERTO | É consumido como contexto analítico (Invest Match, regeneração). Cifrar exige descriptografar nos consumidores antes |
| Retenção automática de `audit_logs` | EM ABERTO | `pg_cron` está comentado em `003_audit_logs.sql`; definir política e ativar |
| Mascaramento de CPF em documentos antes do LLM | EM ABERTO | Decisão de produto; por ora cobrir por contrato + consentimento |
| Encarregado (DPO) nomeado + canal | RESOLVIDO (15/06) | Renan Luciano Regonato, contato@rr7x.com.br, publicado na Política |
| Razão social + CNPJ da controladora | RESOLVIDO (15/06) | RRX CAPITAL HUB LTDA, CNPJ 59.073.078/0001-89, publicado na Política |
| DPAs / cláusulas-padrão com subprocessadores | PENDENTE | Firmar/arquivar com Supabase, Vercel, Anthropic, Voyage, Stripe |

---

## Changelog

| Data | Mudança |
|---|---|
| 15/06/2026 | Criação do documento. Mapa de tratamento, ROPA, subprocessadores e RIPD. Fixes aplicados: cifragem de assessor/parceiro e RLS + expurgo do log de busca. |
