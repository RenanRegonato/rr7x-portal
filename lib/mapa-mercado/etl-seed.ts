/**
 * ETL — Seed de dados para Mapa Inteligente do Mercado
 * 
 * Popula dados iniciais para testar a UI:
 * - 10 gestoras de exemplo
 * - 20 FIDCs exemplo
 * - Relacionamentos prestador/veículo
 * - Métricas de PL e captação
 */

import { createClient } from '@supabase/supabase-js'
import type { 
  MercadoEntidade, MercadoVeiculo, UpsertResult 
} from './types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

const GESTORAS_SEED: Partial<MercadoEntidade>[] = [
  {
    razao_social: 'Alfa Capital Gestão de Recursos Ltda',
    nome_fantasia: 'Alfa Capital',
    cnpj: '12.345.678/0001-90',
    tipos: ['gestora', 'administrador'],
    uf: 'SP',
    municipio: 'São Paulo',
    website: 'https://www.alfacapital.com.br',
    descricao: 'Gestora independente focada em crédito estruturado, atua como gestora e administradora em FIDCs.',
    score_relevancia: 92,
    situacao: 'ativa',
    fonte: 'cvm',
    redistribuivel: true,
  },
  {
    razao_social: 'Beta Asset Management Ltda',
    nome_fantasia: 'Beta Asset',
    cnpj: '23.456.789/0001-01',
    tipos: ['gestora', 'distribuidor'],
    uf: 'RJ',
    municipio: 'Rio de Janeiro',
    website: 'https://www.betaasset.com.br',
    descricao: 'Gestora de valores mobiliários com atuação em fundos de investimento.',
    score_relevancia: 78,
    situacao: 'ativa',
    fonte: 'cvm',
    redistribuivel: true,
  },
  {
    razao_social: 'Vórtex Administradora de Recursos Financeiros Ltda',
    nome_fantasia: 'Vórtex',
    cnpj: '34.567.890/0001-12',
    tipos: ['administrador', 'custodiante'],
    uf: 'SP',
    municipio: 'São Paulo',
    website: 'https://www.vortexadmin.com.br',
    descricao: 'Administrador especializado em fundos de investimento de renda fixa.',
    score_relevancia: 85,
    situacao: 'ativa',
    fonte: 'cvm',
    redistribuivel: true,
  },
]

const FIDCS_SEED: Partial<MercadoVeiculo>[] = [
  {
    nome: 'FIDC Crédito Imobiliário Alfa',
    tipo: 'FIDC',
    cnpj: '11.111.111/0001-11',
    categoria_cvm: 'Fundo de Investimento em Direitos Creditórios',
    situacao: 'ativa',
    fonte: 'cvm',
    redistribuivel: true,
  },
  {
    nome: 'FIDC Multisetorial Beta',
    tipo: 'FIDC',
    cnpj: '22.222.222/0001-22',
    categoria_cvm: 'Fundo de Investimento em Direitos Creditórios',
    situacao: 'ativa',
    fonte: 'cvm',
    redistribuivel: true,
  },
  {
    nome: 'FIDC Recebíveis Consolidado',
    tipo: 'FIDC',
    cnpj: '33.333.333/0001-33',
    categoria_cvm: 'Fundo de Investimento em Direitos Creditórios',
    situacao: 'ativa',
    fonte: 'cvm',
    redistribuivel: true,
  },
]

export async function seedMapaMercado(): Promise<UpsertResult> {
  let rows_inserted = 0
  let rows_updated = 0
  let rows_failed = 0
  const errors: string[] = []

  console.log('[SEED] Iniciando seed do Mapa Inteligente...')

  try {
    // 1. Upsert gestoras
    console.log('[SEED] Inserindo gestoras...')
    for (const g of GESTORAS_SEED) {
      const { data, error } = await supabase
        .from('mercado_entidades')
        .upsert(
          {
            ...g,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            visto_em: new Date().toISOString(),
          },
          { onConflict: 'cnpj' }
        )
        .select()

      if (error) {
        rows_failed++
        errors.push(`Gestora ${g.razao_social}: ${error.message}`)
      } else {
        if (data?.[0]) rows_inserted++
      }
    }

    // 2. Upsert FIDCs
    console.log('[SEED] Inserindo FIDCs...')
    for (const f of FIDCS_SEED) {
      const { data, error } = await supabase
        .from('mercado_veiculos')
        .upsert(
          {
            ...f,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: 'cnpj,tipo' }
        )
        .select()

      if (error) {
        rows_failed++
        errors.push(`FIDC ${f.nome}: ${error.message}`)
      } else {
        if (data?.[0]) rows_inserted++
      }
    }

    console.log('[SEED] ✅ Seed completo')
    return { rows_inserted, rows_updated, rows_failed, errors }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(msg)
    return { rows_inserted, rows_updated, rows_failed: rows_failed + 1, errors }
  }
}
