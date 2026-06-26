'use client'

import { useMemo } from 'react'
import type { ResultadoCompletude, ItemStatus } from '@/lib/documentos/completude'
import { nivelConfianca } from '@/lib/documentos/completude'

interface Props {
  resultado: ResultadoCompletude
  pilarLabel: string
  analiseId: string
}

const COR_CONFIANCA = {
  verde:    { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', barra: 'bg-[#10B981]' },
  amarelo:  { bg: 'bg-[#FEF9C3]', text: 'text-[#713F12]', barra: 'bg-[#EAB308]' },
  laranja:  { bg: 'bg-[#FFEDD5]', text: 'text-[#7C2D12]', barra: 'bg-[#F97316]' },
  vermelho: { bg: 'bg-[#FEE2E2]', text: 'text-[#7F1D1D]', barra: 'bg-[#EF4444]' },
}

const LABEL_SEV: Record<string, string> = {
  critico:    'Obrigatório',
  alto:       'Recomendado',
  recomendado: 'Complementar',
}

const COR_SEV: Record<string, string> = {
  critico:    'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]',
  alto:       'bg-[#FEF9C3] text-[#713F12] border border-[#FEF08A]',
  recomendado: 'bg-[#F0F9FF] text-[#075985] border border-[#BAE6FD]',
}

function BadgeSev({ sev }: { sev: string }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${COR_SEV[sev] ?? ''}`}>
      {LABEL_SEV[sev] ?? sev}
    </span>
  )
}

function ItemRow({ item }: { item: ItemStatus }) {
  return (
    <div className={`flex items-start gap-3 py-3 border-b border-[#F3F0EB] last:border-0 ${item.encontrado ? 'opacity-100' : 'opacity-90'}`}>
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        item.encontrado ? 'bg-[#10B981] text-white' : 'border-2 border-[#D4C5A9] bg-transparent'
      }`}>
        {item.encontrado && (
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[13px] font-medium ${item.encontrado ? 'text-[#211F1A]' : 'text-[#6B6560]'}`}>
            {item.doc.nome}
          </span>
          <BadgeSev sev={item.doc.severidade} />
        </div>
        <p className="text-[12px] text-[#9B9489] mt-0.5 leading-relaxed">{item.doc.finalidade}</p>
        {item.encontrado && item.nomeArquivo && (
          <p className="text-[11px] text-[#10B981] mt-1">
            Arquivo identificado: {item.nomeArquivo}
          </p>
        )}
        {!item.encontrado && item.doc.dica && (
          <p className="text-[11px] text-[#C9913A] mt-1 italic">{item.doc.dica}</p>
        )}
      </div>
    </div>
  )
}

function SecaoChecklist({ titulo, itens }: { titulo: string; itens: ItemStatus[] }) {
  if (itens.length === 0) return null
  const encontrados = itens.filter(i => i.encontrado).length
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-semibold text-[#211F1A] uppercase tracking-wider">{titulo}</h3>
        <span className="text-[12px] text-[#9B9489]">{encontrados}/{itens.length}</span>
      </div>
      <div className="bg-white border border-[#E8E3DB] rounded-lg px-4">
        {itens.map(item => <ItemRow key={item.doc.id} item={item} />)}
      </div>
    </div>
  )
}

export default function ChecklistDocumentacao({ resultado, pilarLabel, analiseId }: Props) {
  const confianca = useMemo(() => nivelConfianca(resultado.percentual), [resultado.percentual])
  const cores = COR_CONFIANCA[confianca.cor]

  const critPendentes = resultado.criticos.filter(i => !i.encontrado).length

  return (
    <div className="space-y-6">
      {/* Header — completude e confiança */}
      <div className="bg-[#FAF8F4] border border-[#E8E3DB] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[18px] font-display font-semibold text-[#211F1A]">
              Checklist de Documentação
            </h2>
            <p className="text-[13px] text-[#9B9489] mt-0.5">{pilarLabel}</p>
          </div>
          <a
            href="/api/dossie"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] text-[#8C6F45] border border-[#8C6F45] rounded px-3 py-1.5 hover:bg-[#8C6F45] hover:text-white transition-colors flex-shrink-0"
          >
            ↓ Baixar dossiê PDF
          </a>
        </div>

        {/* Barra de progresso */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-medium text-[#211F1A]">
              Completude da documentação
            </span>
            <span className="text-[22px] font-bold text-[#211F1A]">
              {resultado.percentual}%
            </span>
          </div>
          <div className="h-2.5 bg-[#E8E3DB] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cores.barra}`}
              style={{ width: `${resultado.percentual}%` }}
            />
          </div>
        </div>

        {/* Nível de confiança */}
        <div className={`rounded-lg px-4 py-3 ${cores.bg}`}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[13px] font-semibold ${cores.text}`}>{confianca.label}</span>
          </div>
          <p className={`text-[12px] ${cores.text} opacity-80`}>{confianca.descricao}</p>
        </div>

        {/* Alerta de críticos pendentes */}
        {critPendentes > 0 && (
          <div className="mt-3 flex items-start gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3">
            <span className="text-[#DC2626] flex-shrink-0 mt-0.5 text-[14px]">⚠</span>
            <p className="text-[12px] text-[#7F1D1D]">
              {critPendentes === 1
                ? '1 documento obrigatório ainda não foi enviado.'
                : `${critPendentes} documentos obrigatórios ainda não foram enviados.`}
              {' '}Sem eles, a análise pode ter seções inconclusivas.
            </p>
          </div>
        )}
      </div>

      {/* Resumo numérico */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Obrigatórios', itens: resultado.criticos, cor: '#991B1B', bg: '#FEE2E2' },
          { label: 'Recomendados', itens: resultado.altos, cor: '#713F12', bg: '#FEF9C3' },
          { label: 'Complementares', itens: resultado.recomendados, cor: '#075985', bg: '#F0F9FF' },
        ].map(({ label, itens, cor, bg }) => (
          <div key={label} className="rounded-lg border border-[#E8E3DB] bg-white p-3 text-center">
            <div className="text-[20px] font-bold" style={{ color: cor }}>
              {itens.filter(i => i.encontrado).length}/{itens.length}
            </div>
            <div className="text-[11px] text-[#9B9489] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Listas por severidade */}
      <SecaoChecklist titulo="Documentos Obrigatórios" itens={resultado.criticos} />
      <SecaoChecklist titulo="Documentos Recomendados" itens={resultado.altos} />
      <SecaoChecklist titulo="Documentos Complementares" itens={resultado.recomendados} />

      {/* Documentos não identificados */}
      {resultado.naoIdentificados.length > 0 && (
        <div className="bg-[#FAF8F4] border border-[#E8E3DB] rounded-lg p-4">
          <h3 className="text-[12px] font-semibold text-[#9B9489] uppercase tracking-wider mb-2">
            Documentos enviados sem categoria identificada
          </h3>
          <ul className="space-y-1">
            {resultado.naoIdentificados.map(nome => (
              <li key={nome} className="text-[12px] text-[#6B6560] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9913A] flex-shrink-0" />
                {nome}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[#9B9489] mt-2">
            Estes arquivos foram lidos e processados, mas seu conteúdo foi categorizando automaticamente pelo sistema.
          </p>
        </div>
      )}
    </div>
  )
}
