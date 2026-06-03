# Guia de Publicação — Artigo Reforma Tributária 2025

## Visão Geral

Este artigo foi otimizado para SEO e conversão. Ele tem **2,847 palavras** (estimado 12 min de leitura), cobre as principais dúvidas sobre Reforma Tributária, inclui cases reais e encerra com CTA para Mandor.

## Checklist de Publicação

### 1. Preparar Cover Image

O artigo precisa de uma cover image para aparecer no blog com impacto visual.

**Especificações:**
- Tamanho: 1200x630px (OG image ratio)
- Estilo: Alinhado com design system Mandor (azul elétrico #1655E8, navy #0A0F20)
- Fonte: Inter (títulos) + DM Serif Display (subtítulos)
- Elementos recomendados:
  - Logo Mandor no canto inferior esquerdo
  - Título do artigo em branco/claro
  - Ícone representativo (ex: gráfico de receita, calculadora, documento)

**Processo:**
- Criar em Figma (template em `designs/blog-cover-template.figma`)
- OU usar `cover_pipeline.py` (script da squad editorial) para gerar automaticamente
- Upload para bucket `blog` no Supabase Storage com nome: `reforma-tributaria-2025-cover.jpg`
- Obter URL público (ex: `https://cdn.mandor.com.br/blog/reforma-tributaria-2025-cover.jpg`)

### 2. Inserir Post no Supabase

#### Opção A: Via Supabase Dashboard (Recomendado para Teste)

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione projeto Mandor
3. Vá para **SQL Editor** ou **Tables > blog_posts**
4. Insira um novo registro com:

```sql
INSERT INTO blog_posts (
  slug,
  title,
  excerpt,
  content,
  cover_image_url,
  category,
  author_name,
  author_slug,
  reading_time_minutes,
  tags,
  published,
  published_at,
  created_at
) VALUES (
  'reforma-tributaria-2025-guia-completo-adequacao-fiscal',
  'Reforma Tributária 2025: Guia Completo de Adequação Fiscal para Empresas',
  'A Reforma Tributária oferece oportunidade de reduzir carga fiscal em 5–20%. Guia completo sobre enquadramento tributário, planejamento fiscal e adequação para empresas.',
  '[COLE AQUI O CONTEÚDO MARKDOWN COMPLETO DO ARTIGO]',
  'https://cdn.mandor.com.br/blog/reforma-tributaria-2025-cover.jpg',
  'Reforma Tributária',
  'Mandor',
  'mandor',
  12,
  ARRAY['reforma-tributaria', 'enquadramento-tributario', 'planejamento-tributario', 'ibs', 'cbs', 'adequacao-fiscal', 'lucro-real', 'icms'],
  true,
  NOW(),
  NOW()
);
```

#### Opção B: Via API/Script (Para Produção)

Se houver script de seed ou admin CLI:

```bash
npm run seed:blog-post -- \
  --slug "reforma-tributaria-2025-guia-completo-adequacao-fiscal" \
  --title "Reforma Tributária 2025: Guia Completo de Adequação Fiscal para Empresas" \
  --content @docs/blog-articles/reforma-tributaria-2025-guia-completo.md \
  --cover-url "https://cdn.mandor.com.br/blog/reforma-tributaria-2025-cover.jpg" \
  --category "Reforma Tributária" \
  --tags "reforma-tributaria,enquadramento-tributario,planejamento-tributario,ibs,cbs,adequacao-fiscal,lucro-real,icms"
```

### 3. Validar Renderização

Após inserção:

1. Acesse [www.mandor.com.br/blog](https://www.mandor.com.br/blog)
2. Procure pelo artigo na lista (deve aparecer no topo, mais recente)
3. Clique no artigo
4. Verifique:
   - ✅ Cover image carrega corretamente
   - ✅ Título, excerpt e metadata aparecem
   - ✅ Conteúdo é renderizado em markdown corretamente
   - ✅ Links internos funcionam (ex: links para www.mandor.com.br)
   - ✅ CTA ao fim direciona para página de contato

### 4. Validação de SEO

#### On-Page
- [ ] Meta title (60 caracteres): `Reforma Tributária 2025: Guia Completo | Mandor`
- [ ] Meta description (155 caracteres): `Saiba como adequar sua empresa à Reforma Tributária. Guia completo sobre enquadramento, planejamento fiscal e casos reais.`
- [ ] H1 único (deve ser título do artigo)
- [ ] H2s bem estruturados (seções do artigo)
- [ ] Keywords principais espalhadas naturalmente:
  - reforma tributária (2–3% densidade)
  - enquadramento tributário (1–2%)
  - planejamento tributário (1–2%)
  - adequação fiscal (1–2%)
  - IBS, CBS, ICMS (mencionados 5+ vezes)

#### Off-Page
- [ ] Compartilhado internamente (Slack, newsletter)
- [ ] Linkado a partir de página relevante (ex: home > Insights > Blog)
- [ ] Indexado no Google Search Console
- [ ] Prompt para social media (LinkedIn, Twitter) com link

#### Técnico
- [ ] Open Graph (og:title, og:description, og:image) correto
- [ ] Canonical URL correto (self-referential)
- [ ] Hreflang (se houver versão em inglês)
- [ ] ISR cache configurado (revalidate=60s conforme settings do site)

### 5. Social Media & Distribuição

#### LinkedIn Post Template

```
🔔 Novo post no blog Mandor

A Reforma Tributária 2025 é uma oportunidade concreta:
✅ Reduzir carga tributária em 5–20%
✅ Estruturar regime correto (Lucro Real vs. RPF vs. Simples)
✅ Aproveitar créditos que estão sendo perdidos

Leia nosso guia completo sobre:
- O que mudou (IBS, CBS, Imposto Seletivo)
- Enquadramento tributário (os 3 erros mais caros)
- Planejamento fiscal estratégico
- Cases reais de economia (R$ 2M–R$ 6M/ano)

→ [LINK DO ARTIGO]

Marque seu CFO/Controller.
```

#### Email Newsletter

Enviar para lista de contatos Mandor com preview do artigo e CTA.

### 6. Monitoramento Pós-Publicação (2–4 semanas)

- [ ] Google Search Console: submeter URL manualmente
- [ ] Verificar indexação (site:mandor.com.br/blog/reforma-tributaria...)
- [ ] Monitorar posição de keywords principais (ferramenta: SEMrush, Ahrefs, etc.)
- [ ] Medir tráfego (Google Analytics: sessões, duração média, conversão)
- [ ] Solicitar backlinks (blogs de direito tributário, associações de crédito, etc.)

---

## Estrutura Esperada na Publicação

O artigo será renderizado assim:

```
┌─────────────────────────────────────────────┐
│  Cover Image (1200x630)                     │
│  [Logo Mandor] [Título Artigo]              │
└─────────────────────────────────────────────┘

Reforma Tributária 2025: Guia Completo...
════════════════════════════════════════

Mandor · 02/06/2026 · 12 min de leitura
Category: Reforma Tributária
Tags: [reforma-tributaria] [planejamento-tributario] ...

📖 CONTEÚDO PRINCIPAL
(Rendered markdown com H2s, bullets, quotes, etc.)

📞 CTA
"A Mandor oferece análise especializada de adequação fiscal.
Agende uma conversa: www.mandor.com.br"

📌 COMPARTILHAR
[Twitter] [LinkedIn] [Email] [Copy Link]
```

---

## Checklist Final

- [ ] Arquivo markdown criado: ✅ `/docs/blog-articles/reforma-tributaria-2025-guia-completo.md`
- [ ] Cover image preparada e uploaded
- [ ] Post inserido no Supabase (published=true)
- [ ] Renderização validada no browser
- [ ] SEO on-page validado
- [ ] Social media posts agendados
- [ ] Email newsletter enviado
- [ ] Google Search Console: URL submetida
- [ ] Analytics: rastreamento configurado
- [ ] Monitoramento 2–4 semanas

---

## Próximos Passos

1. **Hoje:** Upload de cover image + inserção no Supabase
2. **Amanhã:** Distribuição social + newsletter
3. **Semana 1:** Monitoramento de tráfego e ranking
4. **Semana 2+:** Otimizações se necessário (CTA, conteúdo, links internos)

---

## Links Úteis

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics](https://analytics.google.com)
- [Mandor Blog](https://www.mandor.com.br/blog)
- [SEMrush](https://semrush.com) (verificar ranking de keywords)
