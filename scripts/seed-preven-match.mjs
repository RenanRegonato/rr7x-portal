// Seed de teste: cria tese da "Preven Obras" + investidor fictício compatível
// e gera o match entre eles, no escritório RR - Inv.
//
// Idempotente: re-rodar atualiza em vez de duplicar (tese por analise_id,
// investidor por nome, match por par investidor×tese).
//
// Uso: node --env-file=.env.local scripts/seed-preven-match.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const VOYAGE_KEY   = process.env.VOYAGE_API_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_KEY, VOYAGE_KEY, ANTHROPIC_KEY })) {
  if (!v) { console.error(`Falta env ${k}`); process.exit(1) }
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// --- Constantes do ambiente (da inspeção) ---
const ESCRITORIO_ID = 'cfd1727b-431e-4112-88df-764affb5c4e9' // RR - Inv
const OWNER_USER_ID = '16fc2589-0d2b-42ce-8151-ef6194a8c6fc' // dono do escritório
const PREVEN_ANALISE_ID = '731e30ad-31a1-4439-9ff6-4ec676ca25eb'

// ---------- Helpers de IA ----------
async function voyageEmbed(text) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${VOYAGE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, model: 'voyage-3-large', input_type: 'query' }),
  })
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  return json.data?.[0]?.embedding
}

async function judge(invNome, teseNome, scoreEstrut, scoreSem) {
  const prompt = `Você é analista sênior de M&A. Avalie a sinergia entre o investidor "${invNome}" e a empresa "${teseNome}" (construção/infraestrutura no interior de SP, buscando R$ 1,5M em equity para crescimento). Score estrutural calculado: ${scoreEstrut}; similaridade semântica: ${scoreSem}.
Retorne SOMENTE JSON: {"synergy_score":0-100,"llm_resumo":"1-2 frases","strengths":["..."],"concerns":["..."],"talking_points":["..."],"close_probability":0-100,"recommendation":"strong_match|review|skip"}`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const text = json.content?.find(b => b.type === 'text')?.text ?? '{}'
  const m = text.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : '{}')
}

// ---------- 1) Tese da Preven ----------
console.log('1) Criando/atualizando tese da Preven...')
const teseData = {
  escritorio_id: ESCRITORIO_ID,
  analise_id: PREVEN_ANALISE_ID,
  origem: 'manual',
  empresa_nome: 'Preven Obras',
  empresa_descricao_curta: 'Empresa de obras e infraestrutura em estruturação no interior de SP.',
  setor_primario: 'Infraestrutura',
  sub_setores: ['Construção', 'Obras'],
  modelos_negocio: ['Serviços PJ', 'Indústria'],
  vertical_tags: ['construção', 'infraestrutura', 'interior_sp'],
  estagio: 'growth',
  capital_buscado_brl: 1500000,
  capital_minimo_ticket_brl: 300000,
  tipo_deal: 'equity',
  controle_oferecido: 'minority',
  horizonte_saida_anos: 5,
  urgencia: 'media',
  hq_estado: 'SP',
  hq_cidade: 'Bauru',
  regioes_operacao: ['SP'],
  esg_compliant: false,
  pronto_para_dd: false,
  tese_investimento: 'Preven Obras atua em construção e infraestrutura no interior paulista, com operação estruturada e busca de R$ 1,5M em equity para acelerar crescimento e capacidade operacional.',
  value_proposition: 'Execução de obras com gestão estruturada e foco em prazo e segurança no interior de SP.',
  competitive_moat: 'Relacionamento regional consolidado e carteira de obras recorrente.',
  risk_narrative: 'Concentração geográfica no interior de SP e dependência de poucos contratos de maior porte.',
  exit_story: 'Saída via venda estratégica a grupo de construção/infra ou recompra societária em 5 anos.',
  status: 'lead',
  criado_por: OWNER_USER_ID,
}

const teseEmbedText = [
  `Setor: ${teseData.setor_primario}`,
  `Sub-setores: ${teseData.sub_setores.join(', ')}`,
  `Estágio: ${teseData.estagio}`,
  `Tese: ${teseData.tese_investimento}`,
  `Proposta de valor: ${teseData.value_proposition}`,
  `Moat: ${teseData.competitive_moat}`,
].join('\n')
teseData.tese_embedding = await voyageEmbed(teseEmbedText)
teseData.tese_embedding_model = 'voyage-3-large'
teseData.tese_embedding_at = new Date().toISOString()

const { data: teseExist } = await sb.from('teses').select('id').eq('analise_id', PREVEN_ANALISE_ID).maybeSingle()
let teseId
if (teseExist?.id) {
  await sb.from('teses').update(teseData).eq('id', teseExist.id)
  teseId = teseExist.id
  console.log(`   tese atualizada: ${teseId}`)
} else {
  const { data, error } = await sb.from('teses').insert({ ...teseData, criado_em: new Date().toISOString() }).select('id').single()
  if (error) throw new Error(`insert tese: ${error.message}`)
  teseId = data.id
  console.log(`   tese criada: ${teseId}`)
}

// ---------- 2) Investidor fictício compatível ----------
console.log('2) Criando/atualizando investidor fictício...')
const invData = {
  escritorio_id: ESCRITORIO_ID,
  nome: 'Fundo Interior SP Capital (TESTE)',
  tipo: 'fundo',
  email: 'teste-investidor@rr7x.local',
  cidade: 'São Paulo',
  estado: 'SP',
  setores_alvo: ['Infraestrutura', 'Imobiliário'],
  sub_setores: ['Construção', 'Obras', 'Real Estate'],
  modelos_negocio: ['Serviços PJ', 'Indústria'],
  vertical_tags: ['construção', 'infraestrutura', 'interior_sp'],
  estagios_aceitos: ['early_revenue', 'growth', 'mature'],
  ticket_min_brl: 500000,
  ticket_max_brl: 5000000,
  tipos_deal_aceitos: ['equity', 'growth_equity'],
  controle_aceito: ['minority', 'majority'],
  horizonte_saida_min_anos: 3,
  horizonte_saida_max_anos: 7,
  geografias_aceitas: ['SP', 'NACIONAL'],
  requer_esg: false,
  requer_audited_financials: false,
  requer_pronto_para_dd: false,
  tese_resumo: 'Investimos em empresas de construção e infraestrutura no interior de São Paulo, em estágio de crescimento, com ticket de R$ 500k a R$ 5M e foco em participação minoritária ou majoritária.',
  tese_completa: 'Tese focada em PMEs de obras, construção civil e infraestrutura no interior paulista com operação estruturada e potencial de consolidação regional. Buscamos negócios com carteira recorrente, gestão profissionalizável e horizonte de saída de 3 a 7 anos via venda estratégica.',
  exemplos_deals_passados: 'Participações em construtoras regionais e empresas de serviços de engenharia no estado de SP.',
  status: 'ativo',
  observacoes: 'Cadastro fictício para testes de matching (Preven Obras).',
  criado_por: OWNER_USER_ID,
}

const invEmbedText = [
  `Investidor: ${invData.nome} (${invData.tipo})`,
  `Setores: ${invData.setores_alvo.join(', ')}`,
  `Sub-setores: ${invData.sub_setores.join(', ')}`,
  `Estágios: ${invData.estagios_aceitos.join(', ')}`,
  `\nResumo da tese: ${invData.tese_resumo}`,
  `\nTese completa: ${invData.tese_completa}`,
  `\nDeals passados: ${invData.exemplos_deals_passados}`,
].join('\n')
invData.tese_embedding = await voyageEmbed(invEmbedText)
invData.tese_embedding_model = 'voyage-3-large'
invData.tese_embedding_at = new Date().toISOString()

const { data: invExist } = await sb.from('investidores').select('id').eq('escritorio_id', ESCRITORIO_ID).eq('nome', invData.nome).maybeSingle()
let investidorId
if (invExist?.id) {
  await sb.from('investidores').update(invData).eq('id', invExist.id)
  investidorId = invExist.id
  console.log(`   investidor atualizado: ${investidorId}`)
} else {
  const { data, error } = await sb.from('investidores').insert({ ...invData, criado_em: new Date().toISOString() }).select('id').single()
  if (error) throw new Error(`insert investidor: ${error.message}`)
  investidorId = data.id
  console.log(`   investidor criado: ${investidorId}`)
}

// ---------- 3) Scores reais via RPC ----------
console.log('3) Calculando scores (RPCs reais)...')
const { data: candidatos, error: candErr } = await sb.rpc('invest_match_buscar_candidatos', {
  p_tese_id: teseId, p_limit: 50, p_min_score: 0,
})
if (candErr) throw new Error(`RPC candidatos: ${candErr.message}`)
const cand = (candidatos ?? []).find(c => c.investidor_id === investidorId)
if (!cand) throw new Error('Investidor não passou no hard filter — verifique compatibilidade')

const { data: sem } = await sb.rpc('invest_match_busca_semantica', {
  p_tese_id: teseId, p_match_count: 50, p_similarity_min: 0,
})
const semItem = (sem ?? []).find(s => s.investidor_id === investidorId)
const scoreSemantico = semItem ? Math.round(semItem.similarity * 100 * 100) / 100 : null

console.log(`   estrutural=${cand.score_estruturado} | semântico=${scoreSemantico}`)

// ---------- 4) Judge (Camada 4) ----------
console.log('4) Gerando explicação (Claude)...')
const v = await judge(invData.nome, teseData.empresa_nome, cand.score_estruturado, scoreSemantico ?? 0)
const synergy = typeof v.synergy_score === 'number' ? v.synergy_score : 80

// ---------- 5) Score composto + match ----------
const scoreFinal = scoreSemantico != null
  ? Math.round((cand.score_estruturado * 0.5 + scoreSemantico * 0.2 + synergy * 0.3) * 100) / 100
  : Math.round((cand.score_estruturado * 0.65 + synergy * 0.35) * 100) / 100
const status = scoreFinal >= 85 ? 'aprovado_auto' : 'sugerido'

const matchPayload = {
  investidor_id: investidorId,
  tese_id: teseId,
  analise_id: PREVEN_ANALISE_ID,
  escritorio_id: ESCRITORIO_ID,
  score_final: scoreFinal,
  score_estruturado: cand.score_estruturado,
  score_semantico: scoreSemantico,
  score_llm: synergy,
  score_breakdown: { ...cand.breakdown, _semantic: { score: scoreSemantico ?? 0, peso: 0.2 }, _llm: { score: synergy, peso: 0.3 } },
  passou_hard_filter: true,
  motivos_bloqueio: [],
  llm_recommendation: v.recommendation ?? 'review',
  llm_strengths: Array.isArray(v.strengths) ? v.strengths : [],
  llm_concerns: Array.isArray(v.concerns) ? v.concerns : [],
  llm_talking_points: Array.isArray(v.talking_points) ? v.talking_points : [],
  llm_close_probability: typeof v.close_probability === 'number' ? v.close_probability : null,
  llm_resumo: v.llm_resumo ?? 'Match de teste entre fundo de infraestrutura e Preven Obras.',
  llm_model_id: 'claude-sonnet-4-6',
  status,
  calculado_em: new Date().toISOString(),
  motor_versao: 'v2.0-seed',
  atualizado_em: new Date().toISOString(),
}

const { error: matchErr } = await sb.from('matches').upsert(matchPayload, { onConflict: 'investidor_id,tese_id' })
if (matchErr) throw new Error(`upsert match: ${matchErr.message}`)

console.log('\n=== ✓ SEED CONCLUÍDO ===')
console.log(`  Tese:        ${teseId} (Preven Obras)`)
console.log(`  Investidor:  ${investidorId} (${invData.nome})`)
console.log(`  Score final: ${scoreFinal} → status ${status}`)
console.log(`  Ver em: /dashboard/invest-match/teses/${teseId}`)
console.log('')
