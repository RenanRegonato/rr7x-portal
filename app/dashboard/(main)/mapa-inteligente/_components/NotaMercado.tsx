// Disclaimer padrão do Mapa do Mercado. Usado em toda tela que rankeia
// participantes ou exibe score — deixa explícito que é sinal de mercado
// (histórico público CVM), não recomendação de investimento (atividade
// regulada). Componente de servidor (sem estado) — pode ser usado em qualquer
// página, inclusive fora do módulo (ex.: Invest Match).

export default function NotaMercado({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] text-ink-3 leading-relaxed ${className}`}>
      Sinal de afinidade de mandato e relevância de mercado, derivado do histórico
      público da CVM. Não é recomendação de investimento.
    </p>
  )
}
