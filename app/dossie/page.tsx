/**
 * /dossie — pagina publica, sem autenticacao.
 * Enviada a clientes antes do cadastro na rede.
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dossie de Documentacao — Mandor',
  description:
    'Guia completo dos documentos necessarios para operacoes estruturadas: M&A, FIDC, CRI, CRA e Asset Preparation.',
}

const PILARES = [
  {
    sigla: 'M&A',
    titulo: 'Fusoes e Aquisicoes',
    itens: ['DRE dos ultimos 3 anos', 'Balanco Patrimonial', 'Contrato Social / Estatuto', 'Certidoes Negativas', 'Pitch Deck / IM'],
  },
  {
    sigla: 'FIDC',
    titulo: 'Fundos de Direitos Creditorios',
    itens: ['DRE e Balanco do Cedente', 'Historico de Inadimplencia', 'Mapa de Concentracao', 'Regulamento (minuta)', 'Estrutura de Cotas'],
  },
  {
    sigla: 'CRI',
    titulo: 'Certificado de Recebiveis Imobiliarios',
    itens: ['Contrato Imobiliario', 'Laudo / Avaliacao do Imovel', 'Matricula do Imovel', 'Documentacao do Cedente', 'Estrutura de Cotas'],
  },
  {
    sigla: 'CRA',
    titulo: 'Certificado de Recebiveis do Agronegocio',
    itens: ['Contrato Agricola', 'Cadastro do Produtor / Cooperativa', 'Ciclo Agricola / Calendario de Safra', 'Documentacao do Cedente', 'Seguro Rural (recomendado)'],
  },
  {
    sigla: 'Asset Prep',
    titulo: 'Preparacao para o Mercado',
    itens: ['DRE ou Demonstrativo Financeiro', 'Contrato Social / Estatuto', 'Apresentacao do Ativo'],
  },
]

export default function DossiePublicoPage() {
  return (
    <div className="min-h-screen bg-[#F5F2EC] font-sans">
      {/* Header minimalista */}
      <header className="border-b border-[#E8E3DB] bg-white px-6 py-4 flex items-center justify-between">
        <img src="/logo/mandor-horizontal.svg" alt="Mandor" height={24} className="h-6 w-auto" />
        <Link
          href="/auth/login"
          className="text-[13px] font-medium text-[#8C6F45] hover:underline"
        >
          Acessar a rede
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8C6F45] mb-3">
            Rede Cognitiva Mandor
          </p>
          <h1 className="text-[32px] font-display font-semibold text-[#211F1A] leading-tight mb-4">
            Dossie de Documentacao
          </h1>
          <p className="text-[15px] text-[#6B6560] leading-relaxed max-w-xl mx-auto mb-8">
            Guia tecnico dos documentos exigidos para analise de operacoes estruturadas.
            Use como referencia antes de iniciar qualquer processo na rede.
          </p>
          <a
            href="/api/dossie-publico"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#211F1A] hover:bg-[#3A3630] text-white text-[14px] font-semibold px-7 py-3.5 rounded-xl transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Baixar PDF institucional
          </a>
        </div>

        {/* Grid de pilares */}
        <div className="grid gap-4 mb-12">
          {PILARES.map(({ sigla, titulo, itens }) => (
            <div key={sigla} className="bg-white border border-[#E8E3DB] rounded-xl px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-[#8C6F45] px-2.5 py-1 rounded-md">
                  {sigla}
                </span>
                <h2 className="text-[14px] font-semibold text-[#211F1A]">{titulo}</h2>
              </div>
              <ul className="space-y-1.5">
                {itens.map(item => (
                  <li key={item} className="flex items-center gap-2 text-[13px] text-[#6B6560]">
                    <span className="w-1 h-1 rounded-full bg-[#C9A87A] flex-shrink-0"/>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA login */}
        <div className="bg-[#211F1A] rounded-2xl px-8 py-8 text-center">
          <h3 className="text-[18px] font-semibold text-white mb-2">
            Pronto para enviar seus documentos?
          </h3>
          <p className="text-[13px] text-[#C9A87A] mb-6">
            Cadastre-se na rede Mandor e inicie sua analise em minutos.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-[#8C6F45] hover:bg-[#7A5F38] text-white text-[14px] font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Acessar a rede
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#E8E3DB] px-6 py-6 text-center">
        <p className="text-[12px] text-[#9B9489]">
          Mandor — Rede Cognitiva para o Mercado Privado Brasileiro
        </p>
      </footer>
    </div>
  )
}
