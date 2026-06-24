// Sugestões de Conexão de Mercado
// ============================================================
// Diferente do matching PRIVADO (tabela `matches`, "Match Confirmado"), aqui
// cruzamos a tese contra o Mapa do Mercado (dado público redistribuível) para
// sugerir participantes do mercado com aderência ao deal. NÃO é relacionamento
// validado nem contato confirmado — é recomendação estratégica.
//
// Combina dois sinais:
//   semantico  → similaridade vetorial tese × entidade (reusa o embedding da tese)
//   estrutural → entidade opera o veículo do mandato (FIDC/FIP) no histórico CVM
//
// O estrutural é o sinal forte (opera o mandato de verdade); o semântico abre o
// leque para entidades não capturadas estruturalmente, com desconto para não
// superprometer (o perfil da entidade no Mapa é pobre: nome + CNAE + tipos).

import { createAdminClient } from '@/lib/supabase-server'
import { getAlvosCaptacao } from '@/lib/mapa-mercado/queries'
import { TIPO_LABEL, type EntidadeTipo } from '@/lib/mapa-mercado/types'

// Tipos de entidade do Mapa que se comportam como "investidor/capital".
const TIPOS_INVESTIDOR: EntidadeTipo[] = [
  'gestora', 'asset', 'family_office', 'boutique_investimento',
  'securitizadora', 'banco', 'escritorio_credito_estruturado',
]

const LIMITE_SUGESTOES = 12

// Subset de TeseRow que o gerador precisa.
export interface TeseParaSugestao {
  id:             string
  escritorio_id:  string
  setor_primario: string
  sub_setores:    string[] | null
  tipo_deal:      string | null
  tese_embedding: number[] | null
}

// Mandato → tipos de veículo CVM que costumam financiar/estruturar o deal.
const DEAL_PARA_VEICULOS: Record<string, string[]> = {
  credito_estruturado: ['FIDC'],
  debt:                ['FIDC'],
  convertible:         ['FIDC', 'FIP'],
  special_situations:  ['FIDC', 'FIP'],
  earn_out:            ['FIP'],
  equity:              ['FIP'],
  growth_equity:       ['FIP'],
  m_and_a_sale:        ['FIP'],
  m_and_a_acquisition: ['FIP'],
}

export function veiculosDoMandato(tipoDeal: string | null, setor: string, subSetores: string[] | null): string[] {
  const base = new Set<string>(DEAL_PARA_VEICULOS[tipoDeal ?? ''] ?? ['FIDC', 'FIP'])
  const txt = `${setor} ${(subSetores ?? []).join(' ')}`.toLowerCase()
  if (txt.includes('imob') || txt.includes('real estate')) base.add('FII')
  if (txt.includes('agro')) base.add('FIAGRO')
  return [...base]
}

interface SemanticoRow {
  id:               string
  razao_social:     string
  nome_fantasia:    string | null
  tipos:            EntidadeTipo[]
  uf:               string | null
  score_relevancia: number | null
  similaridade:     number
}

interface SugestaoAgregada {
  entidade_id:         string
  razao_social:        string
  nome_fantasia:       string | null
  tipos:               EntidadeTipo[]
  uf:                  string | null
  sim:                 number | null   // 0-1 (semântico)
  veiculos_no_mandato: number | null   // estrutural
}

type LoggerLike = { info: (m: string, meta?: Record<string, unknown>) => void }

// Gera (regenera) as sugestões de mercado de uma tese e persiste em
// mercado_sugestoes. Idempotente: apaga as anteriores da tese e reinsere.
export async function gerarSugestoesMercado(args: {
  tese:    TeseParaSugestao
  logger?: LoggerLike
}): Promise<number> {
  const { tese } = args
  const admin = createAdminClient()
  const log = (m: string, meta?: Record<string, unknown>) => args.logger?.info(m, meta)

  const agg = new Map<string, SugestaoAgregada>()

  // 1) Sinal semântico — reusa o embedding que a tese já tem (custo ~zero).
  if (tese.tese_embedding) {
    const { data, error } = await admin.rpc('mercado_busca_semantica', {
      p_query_embedding: tese.tese_embedding as unknown as string,
      p_tipos:           TIPOS_INVESTIDOR,
      p_uf:              null,
      p_limit:           20,
      p_min:             0.35,
    })
    if (error) {
      log('[sugestoes-mercado] semântica falhou', { error: error.message })
    } else {
      for (const r of (data ?? []) as SemanticoRow[]) {
        agg.set(r.id, {
          entidade_id: r.id, razao_social: r.razao_social, nome_fantasia: r.nome_fantasia,
          tipos: r.tipos ?? [], uf: r.uf, sim: r.similaridade, veiculos_no_mandato: null,
        })
      }
    }
  }

  // 2) Sinal estrutural — gestoras que operam o veículo do mandato (CVM).
  const tiposVeiculo = veiculosDoMandato(tese.tipo_deal, tese.setor_primario, tese.sub_setores)
  const alvos = await getAlvosCaptacao(tiposVeiculo, { limit: 20 })
  for (const a of alvos) {
    const cur = agg.get(a.entidade_id)
    if (cur) {
      cur.veiculos_no_mandato = a.veiculos_no_mandato
    } else {
      agg.set(a.entidade_id, {
        entidade_id: a.entidade_id, razao_social: a.razao_social, nome_fantasia: a.nome_fantasia,
        tipos: a.tipos ?? [], uf: a.uf, sim: null, veiculos_no_mandato: a.veiculos_no_mandato,
      })
    }
  }

  // Sempre regenera do zero: apaga as anteriores da tese.
  await admin.from('mercado_sugestoes').delete().eq('tese_id', tese.id)

  if (agg.size === 0) {
    log('[sugestoes-mercado] nenhuma sugestão', { tese_id: tese.id })
    return 0
  }

  const setor = tese.setor_primario
  // O peso do sinal estrutural ("opera o veículo do mandato") depende do mandato.
  // Em CRÉDITO (financiado por FIDC), operar o veículo do mandato é o sinal MAIS
  // relevante: é quem de fato estrutura/funda a operação, então o estrutural ganha
  // peso e pode liderar. Em equity/M&A (FIP), a tese (semântico) segue como driver
  // e o estrutural fica como bônus limitado, para a lista não saturar com "os
  // maiores administradores de FIDC" afogando o sinal de tese.
  const isCredito = ['credito_estruturado', 'debt', 'special_situations', 'convertible'].includes(tese.tipo_deal ?? '')
  const estrutCap      = isCredito ? 35 : 18
  const estrutMult     = isCredito ? 7  : 4
  const baseEstrutOnly = isCredito ? 58 : 40
  const linhas = [...agg.values()]
    .map(s => {
      const semScore  = s.sim != null ? s.sim * 100 : 0
      const temEstrut = s.veiculos_no_mandato != null && s.veiculos_no_mandato > 0
      const estrutBonus = temEstrut
        ? Math.min(estrutCap, Math.log1p(s.veiculos_no_mandato as number) * estrutMult)
        : 0

      const origem: string[] = []
      if (s.sim != null) origem.push('semantico')
      if (temEstrut)     origem.push('estrutural')

      let aderencia: number
      if (s.sim != null) {
        // Semântico + bônus estrutural (maior em crédito).
        aderencia = semScore + estrutBonus
      } else {
        // Só estrutural: em crédito, opera o veículo do mandato e merece destaque;
        // em equity/M&A, entra como pista de mercado, abaixo da tese.
        aderencia = baseEstrutOnly + estrutBonus
      }
      aderencia = Math.max(0, Math.min(100, Math.round(aderencia * 100) / 100))

      const partes: string[] = []
      const tiposTxt = s.tipos.map(t => TIPO_LABEL[t] ?? t).slice(0, 2).join(' · ')
      if (tiposTxt) partes.push(tiposTxt)
      if (temEstrut) partes.push(`opera ${s.veiculos_no_mandato} veículo(s) do mandato (${tiposVeiculo.join('/')})`)
      if (s.sim != null) partes.push(`aderência setorial à tese (${setor})`)

      return {
        tese_id:       tese.id,
        escritorio_id: tese.escritorio_id,
        entidade_id:   s.entidade_id,
        razao_social:  s.razao_social,
        nome_fantasia: s.nome_fantasia,
        tipos:         s.tipos,
        uf:            s.uf,
        aderencia,
        origem_sinal:  origem,
        motivo:        partes.join(' · '),
      }
    })
    .sort((a, b) => b.aderencia - a.aderencia)
    .slice(0, LIMITE_SUGESTOES)

  const { error: insErr } = await admin.from('mercado_sugestoes').insert(linhas)
  if (insErr) {
    log('[sugestoes-mercado] insert falhou', { error: insErr.message })
    return 0
  }
  log('[sugestoes-mercado] geradas', { tese_id: tese.id, count: linhas.length })
  return linhas.length
}
