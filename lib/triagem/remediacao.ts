// Remediação de um documento que falhou na triagem: registra um NOVO documento
// (reenvio de arquivo ou texto colado) substituindo o que falhou, e re-dispara a
// ingestão + consolidação. Limpar fact_bank_consolidated_at faz a consolidação
// rodar de novo quando o novo doc terminar (ver maybeTriggerConsolidation), e ao
// final ela reavalia o gate (lib/triagem/gate).

import { createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'
import { categorizeFile } from '@/lib/documentos/categorize'

type ResolucaoRemediacao = 'reenviado' | 'substituido' | 'texto_colado'

export async function registrarRemediacaoDoc(params: {
  analiseId:      string
  oldDocId:       string
  filePath:       string
  fileName:       string
  fileSizeBytes?: number
  resolucao:      ResolucaoRemediacao
  decididoPor:    string
}): Promise<{ newDocId: string }> {
  const admin = createAdminClient()
  const { analiseId, oldDocId, filePath, fileName, fileSizeBytes, resolucao, decididoPor } = params
  const now = new Date().toISOString()

  // 1) Novo documento (pending) que será processado.
  const { data: novo, error: insErr } = await admin
    .from('analise_documents')
    .insert({
      analise_id:      analiseId,
      file_path:       filePath,
      file_name:       fileName,
      file_size_bytes: fileSizeBytes ?? 0,
      file_category:   categorizeFile(fileName),
      status:          'pending',
    })
    .select('id')
    .single()
  if (insErr || !novo) throw new Error(`registrarRemediacaoDoc insert: ${insErr?.message ?? 'sem retorno'}`)

  // 2) Doc antigo: marcado como remediado (relevante + resolução), apontando o substituto.
  await admin.from('analise_documents')
    .update({
      relevancia:           'relevante',
      resolucao,
      substituido_por:      novo.id,
      triagem_decidida_em:  now,
      triagem_decidida_por: decididoPor,
    })
    .eq('id', oldDocId)

  // 3) +1 no total e LIMPA o marcador de consolidação → força re-consolidação ao fim.
  const { data: a } = await admin.from('analises').select('documents_total').eq('id', analiseId).single()
  await admin.from('analises')
    .update({
      documents_total:           (a?.documents_total ?? 0) + 1,
      fact_bank_consolidated_at: null,
      atualizado_em:             now,
    })
    .eq('id', analiseId)

  // 4) Processa o novo doc. Ao concluir, a consolidação re-dispara e reavalia o gate.
  await inngest.send({
    name: 'analise/document.process_requested',
    data: { analiseId, documentId: novo.id },
  })

  return { newDocId: novo.id }
}
