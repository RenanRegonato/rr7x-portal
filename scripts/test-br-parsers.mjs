// Suíte de teste dos parsers determinísticos pt-BR. Roda: node scripts/test-br-parsers.mjs
// (Node 25 faz type-stripping do .ts importado.)
import {
  isValidCNPJ, findCNPJs, isValidCPF, findCPFs,
  parsePtBrNumber, parseMoneyBRL, findMoniesBRL, findAreas,
  parseDateBR, parsePercent,
} from '../lib/extract/br-parsers.ts'

let failed = 0
const eq = (got, exp, msg) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp)
  if (g !== e) { failed++; console.error(`  ✗ ${msg}\n      got ${g}\n      exp ${e}`) }
  else console.log(`  ✓ ${msg}`)
}
const ok = (cond, msg) => { if (!cond) { failed++; console.error(`  ✗ ${msg}`) } else console.log(`  ✓ ${msg}`) }

console.log('\n[CNPJ]')
// CNPJs REAIS do deal Resort Campo Alegre (do fact_bank) — devem validar.
ok(isValidCNPJ('43.549.734/0001-37'), 'CNPJ real (Castelo) válido')
ok(isValidCNPJ('13.518.624/0001-47'), 'CNPJ real (Phoenix) válido')
ok(isValidCNPJ('43549734000137'),     'CNPJ sem máscara válido')
ok(!isValidCNPJ('43.549.734/0001-38'), 'DV errado inválido')
ok(!isValidCNPJ('11.111.111/1111-11'), 'todos iguais inválido')
ok(!isValidCNPJ('123'),                'curto inválido')
const cnpjs = findCNPJs('Solicitante 43.549.734/0001-37 e um falso 00.000.000/0000-99 e 13.518.624/0001-47.')
eq(cnpjs.map(c => c.formatted), ['43.549.734/0001-37', '13.518.624/0001-47'], 'findCNPJs só os válidos')

console.log('\n[CPF]')
ok(isValidCPF('111.444.777-35'), 'CPF de teste válido')
ok(!isValidCPF('111.444.777-00'), 'CPF DV errado inválido')
ok(!isValidCPF('000.000.000-00'), 'CPF todos iguais inválido')

console.log('\n[número pt-BR]')
eq(parsePtBrNumber('1.234.567,89'), 1234567.89, '1.234.567,89')
eq(parsePtBrNumber('2,3'), 2.3, '2,3')
eq(parsePtBrNumber('2.300.000'), 2300000, '2.300.000 (milhar)')
eq(parsePtBrNumber('487,3'), 487.3, '487,3')
eq(parsePtBrNumber('1000'), 1000, '1000')

console.log('\n[moeda R$]')
eq(parseMoneyBRL('R$ 2,3 mi'), { amount: 2300000, unit: 'BRL' }, 'R$ 2,3 mi')
eq(parseMoneyBRL('R$ 1.234.567,89'), { amount: 1234567.89, unit: 'BRL' }, 'R$ 1.234.567,89')
eq(parseMoneyBRL('R$ 487,3 milhões'), { amount: 487300000, unit: 'BRL' }, 'R$ 487,3 milhões')
eq(parseMoneyBRL('2,3 bilhões'), { amount: 2300000000, unit: 'BRL' }, '2,3 bilhões')
eq(parseMoneyBRL('R$ 280 milhões'), { amount: 280000000, unit: 'BRL' }, 'R$ 280 milhões')
const monies = findMoniesBRL('captação de R$ 280 milhões e EBITDA ajustado de R$ 108,1 milhões em 2025')
eq(monies.map(m => m.amount), [280000000, 108100000], 'findMoniesBRL no texto')

console.log('\n[data pt-BR]')
eq(parseDateBR('15/03/2025')?.iso, '2025-03-15', '15/03/2025')
eq(parseDateBR('15 de março de 2025')?.iso, '2025-03-15', '15 de março de 2025')
eq(parseDateBR('março de 2025'), { iso: null, year: 2025, month: 3 }, 'março de 2025')
eq(parseDateBR('2024'), { iso: null, year: 2024 }, 'ano isolado 2024')
ok(parseDateBR('31/02/2025')?.iso === null, '31/02 sem iso válido')

console.log('\n[percentual / taxa]')
eq(parsePercent('12,5%'), { value: 12.5 }, '12,5%')
eq(parsePercent('CDI + 3,5%'), { value: 3.5, indexador: 'CDI' }, 'CDI + 3,5%')
eq(parsePercent('IPCA + 5%'), { value: 5, indexador: 'IPCA' }, 'IPCA + 5%')
eq(parsePercent('100% do CDI'), { value: 100, indexador: 'CDI' }, '100% do CDI')

console.log('\n[áreas]')
const areas = findAreas('Imóvel com 1.234,56 hectares, 350 m² construídos, 12 alqueires e 4 módulos fiscais.')
eq(areas.map(a => [a.amount, a.unit]), [[1234.56, 'ha'], [350, 'm2'], [12, 'alqueire'], [4, 'modulo_fiscal']], 'acha área+unidade')
eq(findAreas('população de 350 habitantes na região').length, 0, '"habitantes" não é unidade de área')

console.log(failed === 0 ? '\n✅ todos os testes passaram' : `\n❌ ${failed} teste(s) falharam`)
process.exit(failed === 0 ? 0 : 1)
