// Auto-pull documental — Cadastro de CNPJ (Receita Federal via API pública)
//
// Primeira fonte do auto-pull: dado o CNPJ do detentor do ativo no intake,
// busca automaticamente o cadastro da empresa (razão social, situação,
// CNAE, capital social e QUADRO DE SÓCIOS/QSA) e injeta no prompt do agente
// de KYC & Compliance — o mesmo mecanismo de enriquecimento já usado por
// bcb-data.ts (juros), cvm-data.ts (comparáveis) e cade-check.ts (antitruste).
//
// Fonte: BrasilAPI (https://brasilapi.com.br) — proxy gratuito e sem chave
// sobre os dados públicos da Receita Federal. Best-effort: qualquer falha
// (sem CNPJ, fora do ar, rate limit) retorna um bloco informativo e NUNCA
// lança — o pipeline de análise não pode quebrar por causa de uma consulta.
//
// Próximo passo (não neste arquivo): plugar CBRdoc/Docket para certidões
// pagas (negativas, matrícula, ônus) atrás da MESMA interface de provider.
//
// IMPORTANTE: o campo cpfCnpjProprietario é PII criptografada em repouso
// (lib/crypto.ts). Decifra-se o intake aqui dentro antes de extrair o CNPJ;
// o resto do pipeline segue recebendo o intake como está. Só CNPJ (14 díg.,
// dado público de empresa) é consultado externamente — CPF (11 díg.) nunca.

import { decryptSensitiveFields } from '@/lib/crypto'
import type { DealIntake } from '@/lib/types'

const BRASILAPI_CNPJ = 'https://brasilapi.com.br/api/cnpj/v1'
const TIMEOUT_MS = 8000
const MAX_SOCIOS = 12

// Chaves do deal_intake onde um CNPJ pode aparecer, em ordem de prioridade.
const CNPJ_KEYS = [
  'cnpj', 'cnpjDetentor', 'cpfCnpjProprietario', 'cpfCnpjDetentor',
  'cpfCnpj', 'documento', 'documentoDetentor',
] as const

interface QSAItem {
  nome_socio?: string
  qualificacao_socio?: string
  faixa_etaria?: string
  data_entrada_sociedade?: string
}

interface CNPJResponse {
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string
  descricao_situacao_cadastral?: string
  data_situacao_cadastral?: string
  data_inicio_atividade?: string
  cnae_fiscal_descricao?: string
  natureza_juridica?: string
  capital_social?: number
  porte?: string
  descricao_porte?: string
  municipio?: string
  uf?: string
  qsa?: QSAItem[]
}

// Valida CNPJ pelos dígitos verificadores (módulo 11). Evita consultar lixo.
function isValidCNPJ(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false
  const calc = (slice: string, pesoIni: number): number => {
    let soma = 0
    let peso = pesoIni
    for (const ch of slice) {
      soma += parseInt(ch, 10) * peso
      peso = peso === 2 ? 9 : peso - 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  const d1 = calc(digits.slice(0, 12), 5)
  const d2 = calc(digits.slice(0, 13), 6)
  return d1 === parseInt(digits[12], 10) && d2 === parseInt(digits[13], 10)
}

// Decifra os campos PII do intake (incl. cpfCnpjProprietario) antes da
// extração. Se ENCRYPTION_KEY não estiver setada, devolve o intake como veio
// (graceful) — campos legados em texto puro também passam intactos.
function intakeDecrypted(intake: Record<string, string>): Record<string, string> {
  try {
    return decryptSensitiveFields(intake as unknown as DealIntake) as unknown as Record<string, string>
  } catch {
    return intake
  }
}

// Extrai o primeiro CNPJ válido do intake: testa as chaves conhecidas e,
// como fallback, varre todos os valores em busca de um padrão de CNPJ.
export function extractCNPJ(intake: Record<string, string>): string | null {
  for (const key of CNPJ_KEYS) {
    const digits = (intake[key] ?? '').replace(/\D/g, '')
    if (digits.length === 14 && isValidCNPJ(digits)) return digits
  }
  for (const val of Object.values(intake ?? {})) {
    if (typeof val !== 'string') continue
    const m = val.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) ?? []
    for (const hit of m) {
      const digits = hit.replace(/\D/g, '')
      if (digits.length === 14 && isValidCNPJ(digits)) return digits
    }
  }
  return null
}

function formatCNPJMask(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function formatBRL(n?: number): string {
  if (typeof n !== 'number' || isNaN(n)) return 'não informado'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

async function fetchCNPJ(cnpj: string): Promise<CNPJResponse | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BRASILAPI_CNPJ}/${cnpj}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as CNPJResponse
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export interface CNPJSnapshot {
  cnpj:         string
  situacao:     string   // descrição da situação cadastral, em maiúsculas
  razao_social: string
}

// Resultado do monitor, discriminado para diagnóstico: distingue "não há
// CNPJ no deal" de "há CNPJ mas a consulta falhou" (antes ambos viravam o
// mesmo 'skip', escondendo o motivo real).
export type CNPJMonitorResult =
  | { status: 'no_cnpj' }
  | { status: 'fetch_failed'; cnpj: string }
  | { status: 'ok'; snapshot: CNPJSnapshot }

// Versão estruturada usada pelo monitoramento contínuo. Decifra o intake,
// extrai o CNPJ e consulta a situação cadastral atual.
export async function getCNPJMonitor(intake: Record<string, string>): Promise<CNPJMonitorResult> {
  const cnpj = extractCNPJ(intakeDecrypted(intake))
  if (!cnpj) return { status: 'no_cnpj' }
  const data = await fetchCNPJ(cnpj)
  if (!data || !data.razao_social) return { status: 'fetch_failed', cnpj }
  return {
    status: 'ok',
    snapshot: {
      cnpj,
      situacao:     (data.descricao_situacao_cadastral ?? 'DESCONHECIDA').toUpperCase(),
      razao_social: data.razao_social,
    },
  }
}

// Ponto de entrada usado pelo pipeline (step route). Retorna um bloco de
// texto pronto para concatenar no user prompt do agente de KYC. Best-effort:
// sempre retorna string (nunca lança), com nota explícita quando não há dado.
export async function pullCNPJEnrichment(intake: Record<string, string>): Promise<string> {
  const cnpj = extractCNPJ(intakeDecrypted(intake))
  if (!cnpj) {
    return `
---
AUTO-PULL CADASTRAL (Receita Federal — automático):
⚪ Nenhum CNPJ válido identificado no intake do deal. Cadastro e quadro de sócios
não puderam ser puxados automaticamente. Solicite o CNPJ do detentor para o
screening de KYC completo.
---`
  }

  const data = await fetchCNPJ(cnpj)
  if (!data || !data.razao_social) {
    return `
---
AUTO-PULL CADASTRAL (Receita Federal — automático):
🟠 CNPJ ${formatCNPJMask(cnpj)} identificado, mas a consulta automática à base
pública falhou ou não retornou dados (fonte indisponível ou cadastro inexistente).
Confirme o cadastro manualmente antes de concluir o KYC.
---`
  }

  const socios = (data.qsa ?? []).slice(0, MAX_SOCIOS)
  const sociosTxt = socios.length
    ? socios.map(s => `  • ${s.nome_socio ?? 'nome não informado'}${s.qualificacao_socio ? ` (${s.qualificacao_socio})` : ''}`).join('\n')
    : '  (quadro de sócios não disponível na base pública)'
  const sociosExtra = (data.qsa?.length ?? 0) > MAX_SOCIOS
    ? `\n  ... e mais ${(data.qsa?.length ?? 0) - MAX_SOCIOS} sócio(s) não listados.`
    : ''

  const situacao = data.descricao_situacao_cadastral ?? 'não informada'
  const alertaSituacao = situacao.toUpperCase() !== 'ATIVA'
    ? ` ⚠️ ATENÇÃO: situação diferente de ATIVA — red flag de KYC, investigar.`
    : ''

  return `
---
AUTO-PULL CADASTRAL (Receita Federal — automático, via BrasilAPI):
🟢 Cadastro obtido para CNPJ ${formatCNPJMask(cnpj)}.
Razão social: ${data.razao_social}${data.nome_fantasia ? ` (fantasia: ${data.nome_fantasia})` : ''}
Situação cadastral: ${situacao}${data.data_situacao_cadastral ? ` desde ${data.data_situacao_cadastral}` : ''}.${alertaSituacao}
Natureza jurídica: ${data.natureza_juridica ?? 'não informada'} | Porte: ${data.descricao_porte ?? data.porte ?? 'não informado'}
Atividade principal (CNAE): ${data.cnae_fiscal_descricao ?? 'não informada'}
Início de atividade: ${data.data_inicio_atividade ?? 'não informado'} | Capital social: ${formatBRL(data.capital_social)}
Sede: ${data.municipio ?? '—'}/${data.uf ?? '—'}
Quadro societário (QSA):
${sociosTxt}${sociosExtra}

Use estes dados oficiais como base do screening de KYC: confronte os sócios
identificados com listas restritivas/PEP, verifique a situação cadastral e
sinalize divergências em relação ao que foi declarado no intake do deal.
---`
}
