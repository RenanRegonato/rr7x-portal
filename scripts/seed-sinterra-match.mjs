// Seed da demo Invest Match para a Sinterra (Projeto Cobalto), no escritório
// RR7x - Capita Hub. Cria a tese (espelha a análise Mandor a9388a50), uma
// carteira de investidores fictícios compatíveis, calcula os scores reais
// (RPCs + judge Claude) e grava os matches. Também liga invest_match_enabled.
//
// Idempotente: re-rodar atualiza (tese por analise_id, investidor por nome,
// match por par investidor×tese).
//
// Uso: node --env-file=.env.local scripts/seed-sinterra-match.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const VOYAGE_KEY    = process.env.VOYAGE_API_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_KEY, VOYAGE_KEY, ANTHROPIC_KEY })) {
  if (!v) { console.error(`Falta env ${k}`); process.exit(1) }
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// --- Constantes do ambiente ---
const ESCRITORIO_ID    = 'cfd1727b-431e-4112-88df-764affb5c4e9' // RR7x - Capita Hub
const OWNER_USER_ID    = '16fc2589-0d2b-42ce-8151-ef6194a8c6fc' // dono do escritório
const SINTERRA_ANALISE = 'a9388a50-a2f6-43da-b53e-6fe06118fee9'

// ---------- Helpers de IA ----------
async function voyageEmbed(text) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${VOYAGE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, model: 'voyage-3-large', input_type: 'query' }),
  })
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).data?.[0]?.embedding
}

async function judge(invNome, scoreEstrut, scoreSem) {
  const prompt = `Você é analista sênior de M&A e crédito estruturado. Avalie a sinergia entre o investidor "${invNome}" e a empresa "Sinterra Especialidades Químicas" (indústria química de especialidades de performance em Jundiaí/SP; duas plantas; receita R$ 487M e EBITDA R$ 108M em 2025; madura, aprovada com ressalvas pela mesa de crédito; busca R$ 280M em operação de crédito estruturado, com possível componente de M&A/buy-and-build). Score estrutural calculado: ${scoreEstrut}; similaridade semântica: ${scoreSem}.
Retorne SOMENTE JSON: {"synergy_score":0-100,"llm_resumo":"1-2 frases em português","strengths":["..."],"concerns":["..."],"talking_points":["..."],"close_probability":0-100,"recommendation":"strong_match|review|skip"}`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200, temperature: 0.2, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const text = (await res.json()).content?.find(b => b.type === 'text')?.text ?? '{}'
  const m = text.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : '{}')
}

// ========== 0) Liga o módulo Invest Match no escritório ==========
console.log('0) Habilitando invest_match_enabled no RR7x - Capita Hub...')
await sb.from('escritorios').update({ invest_match_enabled: true }).eq('id', ESCRITORIO_ID)

// ========== 1) Tese da Sinterra (espelha a análise Mandor) ==========
console.log('1) Criando/atualizando tese da Sinterra...')
const tese = {
  escritorio_id: ESCRITORIO_ID,
  analise_id: SINTERRA_ANALISE,
  origem: 'mandor',
  empresa_nome: 'Sinterra Especialidades Químicas',
  empresa_descricao_curta: 'Fabricante de especialidades químicas de performance para tintas, adesivos e tratamento de água. Duas plantas em SP, receita de R$ 487M e EBITDA de R$ 108M em 2025.',
  setor_primario: 'Indústria Química',
  sub_setores: ['Especialidades Químicas', 'Performance Chemicals', 'Tintas e Adesivos', 'Tratamento de Água'],
  modelos_negocio: ['Indústria', 'B2B'],
  vertical_tags: ['quimica', 'industria', 'especialidades_quimicas', 'manufatura', 'sp'],
  estagio: 'mature',
  maturity_score: 84,
  anos_operacao: 24,
  receita_anual_brl: 487000000,
  ebitda_brl: 108000000,
  margem_ebitda_pct: 22,
  crescimento_yoy_pct: 14,
  capital_buscado_brl: 280000000,
  capital_minimo_ticket_brl: 50000000,
  uso_capital: 'Crédito estruturado para refinanciamento, capex de expansão das duas plantas e funding de estratégia buy-and-build no setor de especialidades químicas.',
  valuation_pre_money_brl: 815000000,
  equity_oferecido_pct: null,
  governance_score: 80,
  tem_conselho: true,
  tem_auditoria: true,
  nivel_compliance: 'alto',
  risk_overall_score: 32,
  risk_factors: ['Concentração em poucos clientes âncora', 'Exposição a preço de matéria-prima petroquímica', 'Imposto Seletivo a monitorar na transição da Reforma Tributária'],
  operational_score: 82,
  team_size: 640,
  key_dependencies: ['Fornecimento de insumos petroquímicos', 'Licenças ambientais das plantas'],
  hq_estado: 'SP',
  hq_cidade: 'Jundiaí',
  regioes_operacao: ['SP', 'NACIONAL'],
  tipo_deal: 'credito_estruturado',
  controle_oferecido: 'minority',
  horizonte_saida_anos: 5,
  urgencia: 'media',
  documentacao_score: 86,
  pronto_para_dd: true,
  tipos_investidor_excluidos: [],
  esg_compliant: true,
  tese_investimento: 'Sinterra é uma indústria de especialidades químicas madura e rentável (EBITDA R$ 108M, margem 22%) no interior de SP, com governança estruturada e aprovação da mesa de crédito com ressalvas. Busca R$ 280M em crédito estruturado para refinanciar passivo, financiar capex e sustentar uma tese de consolidação (buy-and-build) em performance chemicals.',
  value_proposition: 'Plataforma de especialidades químicas de alto valor agregado, com receita recorrente B2B, duas plantas industriais e posição de liderança em nichos de tintas, adesivos e tratamento de água.',
  competitive_moat: 'Portfólio técnico difícil de replicar, homologações junto a grandes clientes industriais e ativos físicos com barreira de entrada regulatória/ambiental.',
  risk_narrative: 'Riscos principais: concentração de clientes âncora, exposição a custo de matéria-prima petroquímica e necessidade de monitorar o Imposto Seletivo na transição da Reforma Tributária. Mitigados por contratos de longo prazo e diversificação de aplicações.',
  exit_story: 'Saída via venda estratégica a grupo químico global, IPO de plataforma consolidada de specialty chemicals, ou amortização programada do crédito estruturado em 5 anos.',
  status: 'lead',
  criado_por: OWNER_USER_ID,
}
tese.tese_embedding = await voyageEmbed([
  `Setor: ${tese.setor_primario}`,
  `Sub-setores: ${tese.sub_setores.join(', ')}`,
  `Estágio: ${tese.estagio}`,
  `Tese: ${tese.tese_investimento}`,
  `Proposta de valor: ${tese.value_proposition}`,
  `Moat: ${tese.competitive_moat}`,
].join('\n'))
tese.tese_embedding_model = 'voyage-3-large'
tese.tese_embedding_at = new Date().toISOString()

const { data: teseExist } = await sb.from('teses').select('id').eq('analise_id', SINTERRA_ANALISE).maybeSingle()
let teseId
if (teseExist?.id) {
  await sb.from('teses').update(tese).eq('id', teseExist.id); teseId = teseExist.id
  console.log(`   tese atualizada: ${teseId}`)
} else {
  const { data, error } = await sb.from('teses').insert({ ...tese, criado_em: new Date().toISOString() }).select('id').single()
  if (error) throw new Error(`insert tese: ${error.message}`)
  teseId = data.id; console.log(`   tese criada: ${teseId}`)
}

// ========== 2) Carteira de investidores fictícios ==========
// Defaults compartilhados; cada investidor sobrescreve o que o diferencia.
const base = {
  escritorio_id: ESCRITORIO_ID,
  status: 'ativo',
  estado: 'SP', cidade: 'São Paulo',
  geografias_aceitas: ['SP', 'NACIONAL'],
  geografias_excluidas: [],
  setores_excluidos: [],
  requer_esg: false, requer_audited_financials: false, requer_pronto_para_dd: false,
  horizonte_saida_min_anos: 3, horizonte_saida_max_anos: 8,
  criado_por: OWNER_USER_ID,
}
const investidores = [
  { nome: 'Pátria Crédito Estruturado FIDC', tipo: 'fundo_credito',
    setores_alvo: ['Indústria Química', 'Indústria', 'Infraestrutura'],
    sub_setores: ['Especialidades Químicas', 'Manufatura'], vertical_tags: ['quimica', 'industria', 'credito'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 100000000, ticket_max_brl: 600000000,
    tipos_deal_aceitos: ['credito_estruturado', 'divida'], controle_aceito: ['none', 'minority'],
    maturity_min_score: 70, governance_min_score: 70, risk_max_score: 55, documentacao_min_score: 70,
    tese_resumo: 'Crédito estruturado para indústrias maduras e rentáveis, tickets de R$ 100M a R$ 600M, com garantias reais e cessão de recebíveis.',
    tese_completa: 'FIDC focado em dívida estruturada para empresas industriais consolidadas no Brasil, com EBITDA acima de R$ 50M, garantias robustas e fluxo de caixa previsível. Apetite por química, manufatura e infraestrutura.' },

  { nome: 'Itaú BBA Debt Capital Markets', tipo: 'banco',
    setores_alvo: ['Indústria Química', 'Indústria', 'Energia', 'Infraestrutura'],
    sub_setores: ['Especialidades Químicas', 'Petroquímica'], vertical_tags: ['quimica', 'industria', 'debenture'],
    estagios_aceitos: ['mature'], ticket_min_brl: 200000000, ticket_max_brl: 1000000000,
    tipos_deal_aceitos: ['credito_estruturado', 'debenture', 'divida'], controle_aceito: ['none'],
    maturity_min_score: 75, governance_min_score: 72, risk_max_score: 50, documentacao_min_score: 75,
    tese_resumo: 'Estruturação de debêntures e crédito corporativo para companhias maduras, tickets a partir de R$ 200M.',
    tese_completa: 'Mesa de DCM que estrutura debêntures, CRIs e crédito estruturado para emissores industriais de grande porte com rating implícito sólido, governança e demonstrações auditadas.' },

  { nome: 'Vinci Partners Special Situations', tipo: 'gestora',
    setores_alvo: ['Indústria Química', 'Indústria', 'Bens de Consumo'],
    sub_setores: ['Especialidades Químicas', 'Performance Chemicals'], vertical_tags: ['quimica', 'industria', 'special_situations'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 150000000, ticket_max_brl: 800000000,
    tipos_deal_aceitos: ['credito_estruturado', 'equity', 'mezzanine'], controle_aceito: ['minority', 'majority'],
    maturity_min_score: 70, governance_min_score: 70, risk_max_score: 55, documentacao_min_score: 70,
    tese_resumo: 'Capital flexível (dívida e equity) para situações especiais em indústrias com ativos reais e geração de caixa.',
    tese_completa: 'Estratégia de special situations que combina crédito estruturado, mezzanine e equity para empresas industriais maduras com tese de consolidação setorial e potencial de buy-and-build.' },

  { nome: 'Kinea Crédito Estruturado', tipo: 'gestora',
    setores_alvo: ['Indústria Química', 'Indústria'],
    sub_setores: ['Especialidades Químicas', 'Manufatura'], vertical_tags: ['quimica', 'industria', 'credito'],
    estagios_aceitos: ['mature'], ticket_min_brl: 100000000, ticket_max_brl: 500000000,
    tipos_deal_aceitos: ['credito_estruturado', 'divida'], controle_aceito: ['none', 'minority'],
    maturity_min_score: 72, governance_min_score: 70, risk_max_score: 55, documentacao_min_score: 72,
    tese_resumo: 'Crédito privado estruturado para empresas líderes em seus nichos, com garantias e covenants.',
    tese_completa: 'Fundo de crédito estruturado que financia capex e refinanciamento de companhias industriais maduras, priorizando margens resilientes e estrutura de garantias sólida.' },

  { nome: 'Bradesco Asset Crédito Privado', tipo: 'asset',
    setores_alvo: ['Indústria Química', 'Indústria', 'Infraestrutura'],
    sub_setores: ['Petroquímica', 'Manufatura'], vertical_tags: ['industria', 'credito', 'quimica'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 150000000, ticket_max_brl: 700000000,
    tipos_deal_aceitos: ['credito_estruturado', 'debenture'], controle_aceito: ['none'],
    maturity_min_score: null, governance_min_score: 70, risk_max_score: 55, documentacao_min_score: null,
    tese_resumo: 'Crédito privado para emissores corporativos de médio e grande porte, tickets de R$ 150M a R$ 700M.',
    tese_completa: 'Asset de crédito privado com foco em debêntures e crédito estruturado de companhias industriais com fluxo previsível e governança adequada.' },

  { nome: 'BNDES Mercado de Capitais', tipo: 'institucional',
    setores_alvo: ['Indústria Química', 'Indústria', 'Infraestrutura', 'Energia'],
    sub_setores: ['Especialidades Químicas', 'Manufatura'], vertical_tags: ['industria', 'quimica', 'desenvolvimento'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 200000000, ticket_max_brl: 2000000000,
    tipos_deal_aceitos: ['credito_estruturado', 'debenture', 'equity'], controle_aceito: ['none', 'minority'],
    maturity_min_score: null, governance_min_score: null, risk_max_score: 60, documentacao_min_score: null,
    requer_audited_financials: true,
    tese_resumo: 'Apoio a investimentos industriais de grande porte com impacto em produtividade e capex, via crédito e capital.',
    tese_completa: 'Atuação em mercado de capitais para projetos industriais relevantes, com tickets elevados, exigência de demonstrações auditadas e foco em modernização e expansão produtiva.' },

  { nome: 'XP Asset Indústria & Infra', tipo: 'asset',
    setores_alvo: ['Indústria', 'Infraestrutura'],
    sub_setores: ['Especialidades Químicas', 'Manufatura'], vertical_tags: ['industria', 'manufatura'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 80000000, ticket_max_brl: 400000000,
    tipos_deal_aceitos: ['credito_estruturado', 'equity'], controle_aceito: ['none', 'minority'],
    maturity_min_score: 90, governance_min_score: 85, risk_max_score: 40, documentacao_min_score: 90,
    tese_resumo: 'Capital para indústria e infraestrutura de médio porte, tickets de R$ 80M a R$ 400M.',
    tese_completa: 'Estratégia industrial diversificada com apetite por manufatura e ativos reais; critérios mais exigentes de maturidade, governança e risco.' },

  { nome: 'Crescera Capital Growth', tipo: 'private_equity',
    setores_alvo: ['Indústria', 'Saúde', 'Bens de Consumo'],
    sub_setores: ['Especialidades Químicas', 'Performance Chemicals'], vertical_tags: ['industria', 'growth'],
    estagios_aceitos: ['growth', 'mature'], ticket_min_brl: 100000000, ticket_max_brl: 450000000,
    tipos_deal_aceitos: ['equity', 'growth_equity'], controle_aceito: ['minority', 'majority'],
    maturity_min_score: 75, governance_min_score: 78, risk_max_score: 45, documentacao_min_score: 75,
    tese_resumo: 'Growth equity para empresas líderes com tese de consolidação, tickets de R$ 100M a R$ 450M.',
    tese_completa: 'Private equity de crescimento que apoia plataformas de buy-and-build em setores resilientes, incluindo nichos industriais de alto valor agregado.' },

  { nome: 'Vasconcelos Family Office', tipo: 'family_office',
    setores_alvo: ['Indústria Química', 'Indústria', 'Imobiliário'],
    sub_setores: ['Especialidades Químicas'], vertical_tags: ['quimica', 'industria', 'sp'],
    estagios_aceitos: ['mature'], ticket_min_brl: 50000000, ticket_max_brl: 300000000,
    tipos_deal_aceitos: ['credito_estruturado', 'equity', 'co_investimento'], controle_aceito: ['minority'],
    maturity_min_score: null, governance_min_score: null, risk_max_score: null, documentacao_min_score: null,
    tese_resumo: 'Co-investimento de longo prazo em indústrias maduras do interior de SP, tickets de R$ 50M a R$ 300M.',
    tese_completa: 'Family office com horizonte longo e apetite por co-investir em companhias industriais consolidadas, especialmente no setor químico paulista.' },

  // Propositalmente INCOMPATÍVEL (ticket pequeno + setor fora): o motor filtra,
  // demonstrando o funil real (aparece na carteira, sem match).
  { nome: 'SP Ventures AgTech Fund', tipo: 'venture_capital',
    setores_alvo: ['AgTech', 'Tecnologia'],
    sub_setores: ['Software', 'Agro'], vertical_tags: ['agtech', 'saas'],
    estagios_aceitos: ['seed', 'early_revenue'], ticket_min_brl: 5000000, ticket_max_brl: 30000000,
    tipos_deal_aceitos: ['equity'], controle_aceito: ['minority'],
    tese_resumo: 'Venture capital early-stage em AgTech e software B2B, tickets de R$ 5M a R$ 30M.',
    tese_completa: 'VC focado em startups de tecnologia para o agronegócio em estágio inicial; fora do perfil de crédito estruturado industrial de grande porte.' },
]

console.log(`2) Criando/atualizando ${investidores.length} investidores...`)
const invIds = {}
for (const it of investidores) {
  const inv = { ...base, ...it }
  inv.tese_embedding = await voyageEmbed([
    `Investidor: ${inv.nome} (${inv.tipo})`,
    `Setores: ${inv.setores_alvo.join(', ')}`,
    `Sub-setores: ${(inv.sub_setores || []).join(', ')}`,
    `Estágios: ${inv.estagios_aceitos.join(', ')}`,
    `\nResumo da tese: ${inv.tese_resumo}`,
    `\nTese completa: ${inv.tese_completa}`,
  ].join('\n'))
  inv.tese_embedding_model = 'voyage-3-large'
  inv.tese_embedding_at = new Date().toISOString()

  const { data: ex } = await sb.from('investidores').select('id').eq('escritorio_id', ESCRITORIO_ID).eq('nome', inv.nome).maybeSingle()
  if (ex?.id) { await sb.from('investidores').update(inv).eq('id', ex.id); invIds[inv.nome] = ex.id }
  else {
    const { data, error } = await sb.from('investidores').insert({ ...inv, criado_em: new Date().toISOString() }).select('id').single()
    if (error) throw new Error(`insert investidor ${inv.nome}: ${error.message}`)
    invIds[inv.nome] = data.id
  }
  console.log(`   ok: ${inv.nome}`)
}

// ========== 3) Scores reais (RPCs) ==========
console.log('3) Calculando candidatos (hard filter + structured) e semântica...')
const { data: candidatos, error: candErr } = await sb.rpc('invest_match_buscar_candidatos', { p_tese_id: teseId, p_limit: 100, p_min_score: 0 })
if (candErr) throw new Error(`RPC candidatos: ${candErr.message}`)
const { data: sem } = await sb.rpc('invest_match_busca_semantica', { p_tese_id: teseId, p_match_count: 100, p_similarity_min: 0 })
const semBy = Object.fromEntries((sem ?? []).map(s => [s.investidor_id, Math.round(s.similarity * 100 * 100) / 100]))

console.log(`   candidatos que passaram o hard filter: ${candidatos?.length ?? 0} de ${investidores.length}`)

// ========== 4+5) Judge + score composto + match ==========
let auto = 0, sug = 0
for (const cand of (candidatos ?? [])) {
  const scoreSem = semBy[cand.investidor_id] ?? null
  const v = await judge(cand.nome, cand.score_estruturado, scoreSem ?? 0)
  const synergy = typeof v.synergy_score === 'number' ? v.synergy_score : 80
  const scoreFinal = scoreSem != null
    ? Math.round((cand.score_estruturado * 0.5 + scoreSem * 0.2 + synergy * 0.3) * 100) / 100
    : Math.round((cand.score_estruturado * 0.65 + synergy * 0.35) * 100) / 100
  const status = scoreFinal >= 85 ? 'aprovado_auto' : 'sugerido'
  if (status === 'aprovado_auto') auto++; else sug++

  const payload = {
    investidor_id: cand.investidor_id, tese_id: teseId, analise_id: SINTERRA_ANALISE, escritorio_id: ESCRITORIO_ID,
    score_final: scoreFinal, score_estruturado: cand.score_estruturado, score_semantico: scoreSem, score_llm: synergy,
    score_breakdown: { ...cand.breakdown, _semantic: { score: scoreSem ?? 0, peso: 0.2 }, _llm: { score: synergy, peso: 0.3 } },
    passou_hard_filter: true, motivos_bloqueio: [],
    llm_recommendation: v.recommendation ?? 'review',
    llm_strengths: Array.isArray(v.strengths) ? v.strengths : [],
    llm_concerns: Array.isArray(v.concerns) ? v.concerns : [],
    llm_talking_points: Array.isArray(v.talking_points) ? v.talking_points : [],
    llm_close_probability: typeof v.close_probability === 'number' ? v.close_probability : null,
    llm_resumo: v.llm_resumo ?? `Match entre ${cand.nome} e Sinterra (Projeto Cobalto).`,
    llm_model_id: 'claude-sonnet-4-6',
    status, calculado_em: new Date().toISOString(), motor_versao: 'v2.0-seed', atualizado_em: new Date().toISOString(),
  }
  const { error: mErr } = await sb.from('matches').upsert(payload, { onConflict: 'investidor_id,tese_id' })
  if (mErr) throw new Error(`upsert match ${cand.nome}: ${mErr.message}`)
  console.log(`   match ${cand.nome}: estrut=${cand.score_estruturado} sem=${scoreSem} llm=${synergy} → final=${scoreFinal} (${status})`)
}

console.log('\n=== ✓ SEED SINTERRA CONCLUÍDO ===')
console.log(`  Tese:        ${teseId} (Sinterra / Projeto Cobalto)`)
console.log(`  Investidores: ${investidores.length} | Matches: ${auto + sug} (auto ${auto} / sugeridos ${sug})`)
console.log(`  Ver em: /dashboard/invest-match/teses/${teseId}`)
console.log('')
