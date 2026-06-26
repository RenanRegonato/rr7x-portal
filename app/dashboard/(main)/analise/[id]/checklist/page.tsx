import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { calcularCompletude } from '@/lib/documentos/completude'
import { LABEL_PILAR, type PilarOperacao } from '@/lib/documentos/checklist'
import ChecklistDocumentacao from '@/components/ChecklistDocumentacao'
import Topbar from '@/components/Topbar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

function resolverPilarLabel(tipoAtivo: string, pilarOperacao?: string): string {
  if (pilarOperacao === 'ma' || !pilarOperacao) return LABEL_PILAR.ma
  if (pilarOperacao === 'fidc') return LABEL_PILAR.fidc
  if (pilarOperacao === 'cri_cra') return LABEL_PILAR.cri_cra
  if (pilarOperacao === 'asset_prep') return LABEL_PILAR.asset_prep
  if (tipoAtivo?.includes('FIDC')) return LABEL_PILAR.fidc
  if (tipoAtivo?.includes('CRI') || tipoAtivo?.includes('CRA')) return LABEL_PILAR.cri_cra
  return LABEL_PILAR.ma
}

export default async function ChecklistPage({ params }: Props) {
  const { id } = await params

  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')

  const supabase = await createServerSupabaseClient()

  // Buscar a análise
  const { data: analise, error } = await supabase
    .from('analises')
    .select('id, deal_intake, status, escritorio_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !analise) notFound()

  // Verificar acesso (admin, ou pertence ao escritório do usuário)
  if (ctx.role !== 'admin' && analise.escritorio_id !== ctx.escritorioId) {
    redirect('/dashboard')
  }

  // Buscar documentos enviados
  const { data: docs } = await supabase
    .from('analise_documents')
    .select('nome_original, status, chunks_count')
    .eq('analise_id', id)
    .order('created_at', { ascending: true })

  const intake = analise.deal_intake as Record<string, string> ?? {}
  const tipoAtivo = intake.tipoAtivo ?? ''
  const pilarOperacao = intake.pilarOperacao as PilarOperacao | undefined

  const documentosEnviados = (docs ?? []).map(d => ({
    nome: d.nome_original ?? '',
    status: d.status as 'processing' | 'completed' | 'failed',
    chunks_count: d.chunks_count ?? 0,
  }))

  const resultado = calcularCompletude(tipoAtivo, pilarOperacao, documentosEnviados)
  const pilarLabel = resolverPilarLabel(tipoAtivo, pilarOperacao)

  return (
    <div className="min-h-screen bg-[#F5F2EC]">
      <Topbar
        title="Checklist de Documentação"
        subtitle={intake.nomeAtivo ? `· ${intake.nomeAtivo}` : undefined}
        onBack={undefined}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Link de volta à análise */}
        <Link
          href={`/dashboard/analise/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#8C6F45] hover:underline mb-6"
        >
          &larr; Voltar para a análise
        </Link>

        {/* Info do deal */}
        <div className="mb-6 bg-white border border-[#E8E3DB] rounded-xl px-5 py-4">
          <p className="text-[11px] text-[#9B9489] uppercase tracking-wider mb-0.5">Ativo</p>
          <p className="text-[15px] font-medium text-[#211F1A]">{intake.nomeAtivo ?? '—'}</p>
          {tipoAtivo && (
            <p className="text-[12px] text-[#9B9489] mt-0.5">{tipoAtivo}</p>
          )}
        </div>

        <ChecklistDocumentacao
          resultado={resultado}
          pilarLabel={pilarLabel}
          analiseId={id}
        />

        {/* Orientação final */}
        <div className="mt-8 bg-[#FAF8F4] border border-[#E8E3DB] rounded-xl px-5 py-5">
          <h3 className="text-[13px] font-semibold text-[#211F1A] mb-2">
            Como enviar documentos faltantes
          </h3>
          <ol className="space-y-1.5 text-[12px] text-[#6B6560]">
            <li className="flex gap-2"><span className="text-[#8C6F45] font-bold">1.</span>Acesse a página da análise e vá até a seção "Documentos"</li>
            <li className="flex gap-2"><span className="text-[#8C6F45] font-bold">2.</span>Clique em "Adicionar documento" e selecione o arquivo</li>
            <li className="flex gap-2"><span className="text-[#8C6F45] font-bold">3.</span>Aguarde o processamento (geralmente menos de 1 minuto)</li>
            <li className="flex gap-2"><span className="text-[#8C6F45] font-bold">4.</span>Retorne a esta página para ver a completude atualizada</li>
          </ol>
          <p className="text-[11px] text-[#9B9489] mt-3">
            Formatos aceitos: PDF, DOCX, XLS/XLSX, CSV, TXT, PNG, JPG, WEBP
          </p>
        </div>
      </div>
    </div>
  )
}
