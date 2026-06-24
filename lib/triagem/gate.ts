// Gate de documentos críticos — AUTORIDADE única sobre se a análise pode rodar.
//
// Regra de negócio: a análise nunca deve produzir score/parecer com um documento
// RELEVANTE ausente por falha técnica. Quando a ingestão termina com falhas, o
// pipeline é SEGURADO (não disparado) até a triagem do usuário resolver cada
// pendência. Chamado por:
//   - lib/ingestion/consolidate-fact-bank (no fim da consolidação, no lugar do kickoff direto)
//   - app/api/analise/[id]/documentos/triagem (após o usuário decidir/justificar)
// Remediações que adicionam conteúdo (reenvio/texto colado) limpam
// fact_bank_consolidated_at e re-disparam a consolidação, que volta a chamar aqui.

import { createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'
import { getDocsCriticos, identifyDocCritico } from '@/lib/documentos/criticidade-cri-cra'

export type RelevanciaDoc = 'relevante' | 'nao_relevante'
export type ResolucaoDoc  = 'reenviado' | 'substituido' | 'texto_colado' | 'justificado'

export interface DocTriagem {
  id:            string
  file_name:     string
  status:        string
  total_chunks:  number | null
  error_message: string | null
  relevancia:    RelevanciaDoc | null
  resolucao:     ResolucaoDoc  | null
  justificativa: string | null
}

// Documento que NÃO entrou na análise: falhou de vez (status='failed') OU subiu
// mas não gerou conteúdo útil (completed com 0 chunks = leitura vazia/ilegível).
export function isPendencia(d: { status: string; total_chunks: number | null }): boolean {
  if (d.status === 'failed') return true
  if (d.status === 'completed' && (d.total_chunks ?? 0) === 0) return true
  return false
}

// Pendência já tratada pelo usuário: marcada irrelevante, ou remediada/justificada.
export function isResolvida(d: { relevancia: string | null; resolucao: string | null }): boolean {
  if (d.relevancia === 'nao_relevante') return true
  if (d.resolucao) return true // reenviado | substituido | texto_colado | justificado
  return false
}

// Pendência que ainda BLOQUEIA a análise.
export function isBloqueante(d: DocTriagem): boolean {
  return isPendencia(d) && !isResolvida(d)
}

const SELECT_DOC = 'id, file_name, status, total_chunks, error_message, relevancia, resolucao, justificativa'

export interface GateResult {
  triagem_status: 'pendente' | 'liberada'
  bloqueantes:    number
  kickedOff:      boolean
}

/**
 * Reavalia o gate de uma análise e, se não houver pendência bloqueante, libera
 * (dispara o pipeline UMA vez). Idempotente: não re-dispara se já 'liberada'.
 */
export async function evaluateTriagemGate(analiseId: string): Promise<GateResult> {
  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('triagem_docs_status')
    .eq('id', analiseId)
    .single()

  const { data: docs } = await admin
    .from('analise_documents')
    .select(SELECT_DOC)
    .eq('analise_id', analiseId)

  const all = (docs ?? []) as DocTriagem[]
  const bloqueantes = all.filter(isBloqueante)
  const now = new Date().toISOString()

  if (bloqueantes.length > 0) {
    if (analise?.triagem_docs_status !== 'pendente') {
      await admin.from('analises')
        .update({ triagem_docs_status: 'pendente', atualizado_em: now })
        .eq('id', analiseId)
    }
    return { triagem_status: 'pendente', bloqueantes: bloqueantes.length, kickedOff: false }
  }

  // Sem bloqueios — libera. Só dispara o pipeline na transição (idempotência).
  if (analise?.triagem_docs_status === 'liberada') {
    return { triagem_status: 'liberada', bloqueantes: 0, kickedOff: false }
  }
  await admin.from('analises')
    .update({ triagem_docs_status: 'liberada', triagem_docs_resolvida_em: now, atualizado_em: now })
    .eq('id', analiseId)
  await inngest.send({ name: 'analise/pipeline.run_requested', data: { analiseId } })
  return { triagem_status: 'liberada', bloqueantes: 0, kickedOff: true }
}

/**
 * Extensão: valida documentos críticos específicos de CRI/CRA.
 *
 * Quando tipo_ativo = Securitização (CRI/CRA), verifica se há documentos
 * críticos (ex.: "Contrato Imobiliário", "Avaliação Imóvel") entre os uploads.
 * Se nenhum doc crítico foi identificado, marca como bloqueante.
 *
 * Heurística: procura no arquivo_nome por keywords do documento crítico.
 * Ex.: "contrato_imovel.pdf" combina com "Contrato Imobiliário".
 *
 * Retorna lista de docs críticos NÃO encontrados.
 */
export async function checkDocsCriticosCRICRA(
  analiseId: string,
): Promise<{ criticos_ausentes: string[]; bloqueante: boolean }> {
  const admin = createAdminClient()

  // Lê tipo_ativo do intake
  const { data: analise } = await admin
    .from('analises')
    .select('deal_intake')
    .eq('id', analiseId)
    .single()

  const tipoAtivo = (analise?.deal_intake as Record<string, string> | undefined)?.tipoAtivo ?? ''

  // Se não é Securitização, não aplica
  if (!tipoAtivo.includes('Securitização')) {
    return { criticos_ausentes: [], bloqueante: false }
  }

  // Pega lista de docs críticos esperados
  const docsCriticos = getDocsCriticos(tipoAtivo)
  if (docsCriticos.length === 0) {
    return { criticos_ausentes: [], bloqueante: false }
  }

  // Lê documentos já enviados (sucesso: status='completed' com chunks > 0)
  const { data: docsEnviados } = await admin
    .from('analise_documents')
    .select('file_name, status, total_chunks')
    .eq('analise_id', analiseId)
    .eq('status', 'completed')

  const docsSucesso = (docsEnviados ?? []) as Array<{ file_name: string; status: string; total_chunks: number | null }>
  const docsSucessoComConteudo = docsSucesso.filter(d => (d.total_chunks ?? 0) > 0)

  // Tenta identificar docs críticos enviados
  const criticosIdentificados = new Set<string>()
  for (const doc of docsSucessoComConteudo) {
    const identificado = identifyDocCritico(doc.file_name, tipoAtivo)
    if (identificado) {
      criticosIdentificados.add(identificado)
    }
  }

  // Docs críticos NÃO encontrados
  const criticosAusentes = docsCriticos
    .filter(dc => dc.severidade === 'critico')
    .map(dc => dc.nome)
    .filter(nome => !criticosIdentificados.has(nome))

  return {
    criticos_ausentes: criticosAusentes,
    bloqueante: criticosAusentes.length > 0,
  }
}
