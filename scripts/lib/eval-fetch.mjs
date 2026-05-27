// Puxa do Supabase os sinais de uma análise e monta o objeto-gabarito.
// Usado tanto pelo snapshot (grava gabarito) quanto pelo score (lê candidate).
import { buildGabarito } from './goldenset.mjs'

export async function fetchAndBuild(admin, analiseId, slug) {
  const { data: analise, error: aErr } = await admin
    .from('analises').select('*').eq('id', analiseId).maybeSingle()
  if (aErr) throw new Error(`analises: ${aErr.message}`)
  if (!analise) throw new Error(`Análise ${analiseId} não encontrada`)

  const ativo = analise.nome_ativo ?? analise.deal_intake?.nome ?? null
  const coverageCheck = analise.coverage_check ?? null

  // Os fatos consolidados vivem em analises.fact_bank.facts (shape:
  // { key, value, sources:[{doc_name,page,quote,doc_id}], fact_type, confidence }).
  // A tabela analise_facts (truth layer) costuma estar vazia, então é só fallback.
  let facts = []
  const fb = analise.fact_bank
  if (fb && Array.isArray(fb.facts) && fb.facts.length > 0) {
    facts = fb.facts.map((f) => ({
      fact_type: f.fact_type,
      key: f.key,
      value: f.value,
      confidence: f.confidence,
      source_doc: Array.isArray(f.sources) && f.sources[0] ? (f.sources[0].doc_name ?? null) : null,
    }))
  } else {
    const { data, error: fErr } = await admin
      .from('analise_facts')
      .select('fact_type, key, value, confidence, source_doc')
      .eq('analise_id', analiseId)
    if (fErr) throw new Error(`analise_facts: ${fErr.message}`)
    facts = data ?? []
  }

  const { data: claims, error: cErr } = await admin
    .from('agent_claims')
    .select('step_key, claim_type, assertion, fact_ids, benchmark_ids, confidence')
    .eq('analise_id', analiseId)
  if (cErr) throw new Error(`agent_claims: ${cErr.message}`)

  const { data: issues, error: iErr } = await admin
    .from('consistency_issues')
    .select('severidade, tipo, resolvido')
    .eq('analise_id', analiseId)
  if (iErr) throw new Error(`consistency_issues: ${iErr.message}`)

  return buildGabarito({
    analiseId, slug, ativo,
    facts: facts ?? [], claims: claims ?? [], issues: issues ?? [], coverageCheck,
  })
}
