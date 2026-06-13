'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'

// Ajuda contextual por página. Montado uma única vez no layout do dashboard.
// Mostra uma explicação curta da página atual (com base na rota), num botão
// discreto no canto inferior direito. Para cobrir uma página nova, basta
// adicionar uma entrada em DICAS — não é preciso editar a página.

interface Dica { titulo: string; texto: string }

// Chave = prefixo da rota. A correspondência usa o prefixo MAIS LONGO que
// casa com o pathname (rota exata ou início de subrota), então rotas
// específicas têm prioridade sobre genéricas.
const DICAS: Record<string, Dica> = {
  '/dashboard': {
    titulo: 'Pipeline de análises',
    texto: 'Sua central de operações. Cada cartão é uma análise (crédito ou M&A). Abra para acompanhar as etapas, do envio dos documentos ao parecer da mesa. Use a busca e os filtros para achar um deal.',
  },
  '/dashboard/mapa-inteligente': {
    titulo: 'Mapa do Mercado',
    texto: 'O atlas do capital privado: gestoras, bancos, FIDCs, securitizadoras e mais. Busque por nome ou em linguagem natural (IA), filtre por tipo e UF, e clique numa instituição para ver a ficha e as conexões. Dado público (CVM, BCB, B3, Receita).',
  },
  '/dashboard/mapa-inteligente/buscar': {
    titulo: 'Busca no Mapa do Mercado',
    texto: 'Pesquise participantes do mercado. Marque "Busca inteligente (IA)" para perguntar em linguagem natural. Use os filtros de tipo e UF à esquerda. Clique num resultado para abrir a ficha completa.',
  },
  '/dashboard/mapa-inteligente/entidade': {
    titulo: 'Ficha do participante',
    texto: 'Perfil 360º da instituição: papéis, perfil de atuação, veículos em que opera, score de relevância de mercado e (para bancos) indicadores financeiros. Em "Ver mapa" você abre o grafo de conexões.',
  },
  '/dashboard/invest-match': {
    titulo: 'Invest Match',
    texto: 'Originação como processo: transforma análises em teses e cruza com sua base de investidores, gerando matches com score e justificativa. Acompanhe o funil e a fila de matches a curar.',
  },
  '/dashboard/escritorio/benchmarks': {
    titulo: 'Benchmarks',
    texto: 'Referências de mercado usadas nas análises. Ajuste parâmetros para o perfil do seu escritório, deixando as leituras mais aderentes à sua tese.',
  },
  '/dashboard/escritorio': {
    titulo: 'Seu escritório',
    texto: 'Dados do escritório, equipe e configurações. O logo e os dados aqui aparecem nos relatórios e materiais de captação gerados.',
  },
  '/dashboard/analise': {
    titulo: 'Página da análise',
    texto: 'Acompanhe a análise ao vivo: cada inteligência tem seu progresso, e os pareceres surgem em abas conforme ficam prontos. Quando concluída, baixe o PDF, compartilhe por link ou peça a regeneração de uma seção.',
  },
  '/dashboard/planos': {
    titulo: 'Planos',
    texto: 'Veja e gerencie o plano do escritório. Cada plano abre módulos e capacidade adicionais, da análise à rede de capital.',
  },
  '/dashboard/conta': {
    titulo: 'Minha conta',
    texto: 'Seus dados pessoais e senha. Mantenha a verificação em duas etapas ativa para proteger o acesso.',
  },
  '/dashboard/equipe': {
    titulo: 'Minha equipe',
    texto: 'Convide assessores por e-mail e acompanhe a equipe. Os convidados entram já vinculados ao seu escritório e operam na mesma carteira.',
  },
  '/dashboard/aprendizados': {
    titulo: 'Aprendizados do escritório',
    texto: 'Registre observações da tese do seu escritório. Elas passam a orientar as próximas análises e podem ser ativadas ou desativadas a qualquer momento.',
  },
  '/dashboard/consumo': {
    titulo: 'Consumo',
    texto: 'Acompanhe o uso do pacote: quantas análises foram usadas e quantas restam, com o histórico do período.',
  },
  '/dashboard/admin': {
    titulo: 'Administração',
    texto: 'Área da equipe Mandor: configuração de planos, custos e operação. Não interfere no conteúdo das análises dos escritórios.',
  },
}

function dicaDaRota(pathname: string): Dica | null {
  let melhor: { k: string; d: Dica } | null = null
  for (const [k, d] of Object.entries(DICAS)) {
    const casa = pathname === k || pathname.startsWith(k + '/')
    if (casa && (!melhor || k.length > melhor.k.length)) melhor = { k, d }
  }
  return melhor?.d ?? null
}

export default function DicaPagina() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const dica = dicaDaRota(pathname || '')
  if (!dica) return null

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {aberto && (
        <div className="w-[300px] bg-surface border border-border rounded-xl shadow-lg p-4">
          <div className="flex items-start justify-between gap-3 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Sobre esta página</span>
            <button onClick={() => setAberto(false)} className="text-ink-3 hover:text-ink text-sm leading-none" aria-label="Fechar">✕</button>
          </div>
          <h3 className="text-sm font-semibold text-ink mb-1.5">{dica.titulo}</h3>
          <p className="text-[13px] text-ink-2 leading-relaxed">{dica.texto}</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-label="Sobre esta página"
        title="Sobre esta página"
        className="w-10 h-10 rounded-full bg-accent-strong text-white shadow-lg grid place-items-center hover:opacity-90 transition"
      >
        {aberto
          ? <span className="text-base leading-none">✕</span>
          : <span className="text-[17px] font-serif leading-none" style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}>?</span>}
      </button>
    </div>
  )
}
