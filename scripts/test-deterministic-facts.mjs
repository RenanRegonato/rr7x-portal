// Teste do extrator determinístico de fatos. Roda: node scripts/test-deterministic-facts.mjs
import { extractDeterministicFacts } from '../lib/extract/deterministic-facts.ts'

let failed = 0
const ok = (cond, msg) => { if (!cond) { failed++; console.error(`  ✗ ${msg}`) } else console.log(`  ✓ ${msg}`) }

const find = (facts, type, keyPart) =>
  facts.find(f => f.fact_type === type && f.fact_key.includes(keyPart))

console.log('\n[financeiros rotulados]')
const t1 = 'A companhia fechou 2025 com receita líquida de R$ 487,3 milhões e EBITDA ajustado de R$ 108,1 milhões. A dívida líquida era de R$ 95 milhões.'
const f1 = extractDeterministicFacts(t1, { sourcePage: 3 })
const ebitda = find(f1, 'numero_financeiro', 'ebitda')
ok(ebitda && JSON.parse(ebitda.fact_value).amount === 108100000, 'EBITDA 108,1 mi rotulado')
// período só é capturado quando o ano vem logo APÓS o valor (precisão > recall)
const fp = extractDeterministicFacts('EBITDA de R$ 108,1 milhões em 2025')
const ep = fp.find(f => f.fact_key.includes('ebitda'))
ok(ep && JSON.parse(ep.fact_value).periodo === 2025, 'período (ano após valor) capturado')
ok(ep && ep.fact_key === 'ebitda_2025', 'chave inclui o período')
const rec = find(f1, 'numero_financeiro', 'receita_liquida')
ok(rec && JSON.parse(rec.fact_value).amount === 487300000, 'receita líquida 487,3 mi')
const div = find(f1, 'numero_financeiro', 'divida_liquida')
ok(div && JSON.parse(div.fact_value).amount === 95000000, 'dívida líquida 95 mi')
ok(f1.every(f => f.source_page === 3), 'source_page propagado')
ok(ebitda.confidence >= 0.9, 'confiança alta')

console.log('\n[valor sem rótulo NÃO vira fato]')
const f2 = extractDeterministicFacts('O imóvel custou R$ 1,2 milhão à vista naquele negócio.')
ok(f2.filter(f => f.fact_type === 'numero_financeiro').length === 0, 'R$ solto sem rótulo financeiro ignorado')

console.log('\n[CNPJ / CPF como fatos societários]')
const t3 = 'Por solicitação de Castelo Campo Alegre CNPJ 43.549.734/0001-37, sócio CPF 111.444.777-35.'
const f3 = extractDeterministicFacts(t3)
const cnpj = find(f3, 'estrutura_societaria', 'cnpj_')
ok(cnpj && JSON.parse(cnpj.fact_value).cnpj === '43.549.734/0001-37', 'CNPJ vira fato societário')
ok(cnpj.confidence === 0.99, 'CNPJ confiança 0.99')
const cpf = find(f3, 'estrutura_societaria', 'cpf_')
ok(cpf && JSON.parse(cpf.fact_value).cpf === '111.444.777-35', 'CPF vira fato societário')

console.log('\n[chave mais próxima vence]')
const t4 = 'Considerando o faturamento histórico, a receita líquida de R$ 200 milhões foi confirmada.'
const f4 = extractDeterministicFacts(t4)
const r4 = find(f4, 'numero_financeiro', 'receita_liquida')
ok(r4 && JSON.parse(r4.fact_value).amount === 200000000, 'rótulo mais próximo (receita líquida) vence faturamento')

console.log('\n[novos rótulos financeiros → habilitam liquidez no engine]')
const t5 = 'O ativo circulante de R$ 200 milhões e o passivo circulante de R$ 125 milhões.'
const f5 = extractDeterministicFacts(t5)
ok(find(f5, 'numero_financeiro', 'ativo_circulante') && JSON.parse(find(f5,'numero_financeiro','ativo_circulante').fact_value).amount === 200000000, 'ativo circulante rotulado')
ok(find(f5, 'numero_financeiro', 'passivo_circulante') && JSON.parse(find(f5,'numero_financeiro','passivo_circulante').fact_value).amount === 125000000, 'passivo circulante rotulado')

console.log('\n[áreas rotuladas como fato]')
const t6 = 'A reserva legal proposta é de 1.200,50 hectares; a área de APP soma 300 hectares; e há 8 módulos fiscais.'
const f6 = extractDeterministicFacts(t6)
ok(find(f6, 'numero_financeiro', 'area_reserva_legal') && JSON.parse(find(f6,'numero_financeiro','area_reserva_legal').fact_value).amount === 1200.5, 'área reserva legal')
ok(find(f6, 'numero_financeiro', 'area_app'), 'área APP')
ok(find(f6, 'numero_financeiro', 'modulos_fiscais') && JSON.parse(find(f6,'numero_financeiro','modulos_fiscais').fact_value).amount === 8, 'módulos fiscais auto-rotulado')

console.log(failed === 0 ? '\n✅ todos os testes passaram' : `\n❌ ${failed} teste(s) falharam`)
process.exit(failed === 0 ? 0 : 1)
