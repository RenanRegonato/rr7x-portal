import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/get-role'
import Topbar from '@/components/Topbar'

export const dynamic = 'force-dynamic'

export default async function DossiePage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-[#F5F2EC]">
      <Topbar title="Dossie de Documentacao" />

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-display font-semibold text-[#211F1A] mb-2">
            Dossie de Documentacao
          </h1>
          <p className="text-[14px] text-[#6B6560] leading-relaxed">
            Guia completo dos documentos necessarios para cada tipo de operacao estruturada.
            Baixe o PDF institucional e compartilhe com seus clientes antes do cadastro.
          </p>
        </div>

        {/* Card de download */}
        <div className="bg-[#211F1A] rounded-2xl p-8 mb-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-[#8C6F45] flex items-center justify-center mx-auto mb-4">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 18 15 15"/>
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-white mb-2">
            Mandor — Dossie de Documentacao
          </h2>
          <p className="text-[13px] text-[#C9A87A] mb-6">
            PDF institucional com checklist completo para M&A, FIDC, CRI, CRA e Asset Preparation
          </p>
          <a
            href="/api/dossie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#8C6F45] hover:bg-[#7A5F38] text-white text-[14px] font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Baixar PDF
          </a>
        </div>

        {/* O que esta incluso */}
        <div className="bg-white border border-[#E8E3DB] rounded-xl px-6 py-6 mb-4">
          <h3 className="text-[14px] font-semibold text-[#211F1A] mb-4">O que esta incluso</h3>
          <ul className="space-y-3">
            {[
              { pilar: 'Geral', desc: 'Documentos basicos exigidos em qualquer operacao' },
              { pilar: 'M&A', desc: 'DRE, Balanco, Contrato Social, CNDs, Pitch Deck e mais' },
              { pilar: 'FIDC', desc: 'Cedente, inadimplencia, concentracao, regulamento e estrutura de cotas' },
              { pilar: 'CRI', desc: 'Contrato imobiliario, laudo, matricula e estrutura' },
              { pilar: 'CRA', desc: 'Contrato agricola, cadastro do produtor, ciclo de safra' },
              { pilar: 'Asset Preparation', desc: 'Diagnostico de prontidao para o mercado de capitais' },
            ].map(({ pilar, desc }) => (
              <li key={pilar} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-[#EDE9E5] flex items-center justify-center flex-shrink-0">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#8C6F45" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                <div>
                  <span className="text-[13px] font-medium text-[#211F1A]">{pilar}</span>
                  <span className="text-[13px] text-[#9B9489]"> — {desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Link publico */}
        <div className="bg-[#FAF8F4] border border-[#E8E3DB] rounded-xl px-5 py-4">
          <p className="text-[12px] text-[#9B9489] mb-1">Link publico para clientes</p>
          <p className="text-[13px] text-[#6B6560]">
            Compartilhe a pagina{' '}
            <span className="font-mono text-[#8C6F45]">mandor.com.br/dossie</span>{' '}
            com clientes antes do cadastro. O PDF pode ser baixado sem necessidade de login.
          </p>
        </div>
      </div>
    </div>
  )
}
