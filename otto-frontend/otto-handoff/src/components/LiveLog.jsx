/**
 * LiveLog — stream simulado dos eventos do squad.
 * Em produção, alimentar via WebSocket/SSE.
 */
export default function LiveLog({ progress }) {
  const lines = [
    { t: '00:02', a: 'Otto',   msg: 'Deal Intake validado · 8/8 parâmetros completos' },
    { t: '00:04', a: 'Otto',   msg: 'DRS preliminar calculado · 4.2/5' },
    { t: '00:05', a: 'Otto',   msg: 'Ativando 6 especialistas em paralelo' },
    { t: '00:08', a: 'Pedro',  msg: 'Coletando benchmarks de SaaS B2B BR · 12 comparáveis' },
    { t: '00:11', a: 'Davi',   msg: 'Normalizando EBITDA · ajustes one-off identificados' },
    { t: '00:14', a: 'Arthur', msg: 'Mapeando 8 perfis de comprador estratégico' },
    { t: '00:16', a: 'Clara',  msg: 'Revisão de NDAs e contratos top 5 clientes' },
    { t: '00:19', a: 'Victor', msg: 'Estruturando blind teaser · 2 páginas' },
    progress[1] >= 100 && { t: '00:24', a: 'Pedro', msg: '✓ Pesquisa de mercado entregue' },
    progress[2] >= 100 && { t: '00:27', a: 'Davi',  msg: '✓ Diagnóstico financeiro · valuation R$ 142–168M' },
    progress[7] > 0    && { t: '00:31', a: 'Paulo', msg: 'Calculando Veredicto de Maturidade...' },
  ].filter(Boolean);

  return (
    <div className="max-h-[260px] overflow-auto py-2 font-mono text-[11px]">
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[42px_60px_1fr] gap-2.5 px-[18px] py-[5px] text-ink-2">
          <span className="text-ink-3">{l.t}</span>
          <span className="text-accent-ink font-semibold">{l.a}</span>
          <span>{l.msg}</span>
        </div>
      ))}
    </div>
  );
}
