import { useState } from 'react';
import Topbar from './Topbar';
import AgentMark from './AgentMark';
import { IconArrowRight, IconDownload } from './Icons';

/**
 * DealDetail — tela de detalhe do deal processado.
 * Tabs: Resumo | Diagnóstico | M&A | Contratos | Originação | Teaser | Pitchbook
 */
export default function DealDetail({ onBack, dealName = 'Projeto Aurora' }) {
  const tabs = ['Resumo', 'Diagnóstico', 'M&A', 'Contratos', 'Originação', 'Teaser', 'Pitchbook'];
  const [tab, setTab] = useState('Resumo');

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        variant="context"
        title={dealName}
        badge={{ label: 'Pronto', kind: 'live' }}
        subtitle="· SaaS B2B · Sell-Side"
        onBack={onBack}
        right={
          <>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2">
              <IconDownload size={13}/> Exportar pacote
            </button>
            <button className="ml-2 px-4 py-2 rounded-[10px] bg-accent text-accent-ink font-semibold text-[13px] hover:bg-accent-strong hover:text-white">
              Aprovar e enviar
            </button>
          </>
        }
      />

      <nav className="px-8 border-b border-border flex gap-1 bg-bg sticky top-[61px] z-[5]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-3 text-[13px] font-medium border-b-2 transition-colors
              ${tab === t ? 'text-ink border-accent-strong' : 'text-ink-2 border-transparent hover:text-ink'}`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="p-8">
        {tab === 'Resumo'      && <ResumoTab/>}
        {tab === 'Diagnóstico' && <DiagnosticoTab/>}
        {tab === 'M&A'         && <MATab/>}
        {!['Resumo', 'Diagnóstico', 'M&A'].includes(tab) && <PlaceholderTab name={tab}/>}
      </div>
    </div>
  );
}

/* ============================================================
 *  ABA · RESUMO
 * ============================================================ */
function ResumoTab() {
  return (
    <div className="grid grid-cols-[1fr_360px] gap-7 items-start">
      <div className="flex flex-col gap-5">
        <DRSPanel/>
        <SnapshotPanel/>
        <DeliverablesPanel/>
      </div>
      <div className="flex flex-col gap-4">
        <NextActionsPanel/>
        <ReviewerPanel/>
      </div>
    </div>
  );
}

function DRSPanel() {
  const criteria = [
    { label: 'Mercado validado',      v: 4.5 },
    { label: 'Financeiro organizado', v: 4.2 },
    { label: 'Tese clara',            v: 4.4 },
    { label: 'Valuation definido',    v: 3.8 },
    { label: 'Documentação',          v: 4.1 },
  ];
  return (
    <Panel padded>
      <div className="flex items-baseline justify-between mb-[18px]">
        <div>
          <Eyebrow>Deal Readiness Score</Eyebrow>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-[56px] font-medium tracking-[-0.03em] leading-none">4.2</span>
            <span className="font-display text-[24px] text-ink-3">/5</span>
          </div>
        </div>
        <div className="text-right">
          <Eyebrow>Veredicto</Eyebrow>
          <div className="font-display text-[22px] font-medium text-ok mt-1.5">Pronto</div>
          <div className="text-[12px] text-ink-3">para roadshow</div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2.5">
        {criteria.map((c) => <DRSPill key={c.label} {...c}/>)}
      </div>
    </Panel>
  );
}

function DRSPill({ label, v }) {
  const color = v >= 4 ? 'oklch(0.6 0.1 155)' : v >= 3 ? 'oklch(0.7 0.13 75)' : 'oklch(0.6 0.16 25)';
  return (
    <div className="p-3.5 bg-bg-tint rounded-[10px] flex flex-col gap-1.5">
      <div className="text-[11px] text-ink-2 font-medium">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-[22px] font-medium" style={{ color }}>{v.toFixed(1)}</span>
        <span className="text-[11px] text-ink-3">/5</span>
      </div>
      <div className="h-[3px] bg-surface rounded-sm overflow-hidden">
        <div className="h-full" style={{ width: `${(v / 5) * 100}%`, background: color }}/>
      </div>
    </div>
  );
}

function SnapshotPanel() {
  const stats = [
    { label: 'ARR',           value: 'R$ 28.5M',     change: '+42% YoY' },
    { label: 'EBITDA norm.',  value: 'R$ 6.2M',      change: 'margem 22%' },
    { label: 'Valuation',     value: 'R$ 142–168M',  change: '5.0–5.9x ARR' },
    { label: 'Net retention', value: '118%',         change: 'top decil SaaS BR' },
  ];
  return (
    <Panel>
      <PanelTitle>Snapshot do ativo</PanelTitle>
      <div className="grid grid-cols-4 gap-6">
        {stats.map((s) => <Stat key={s.label} {...s}/>)}
      </div>
    </Panel>
  );
}

function Stat({ label, value, change }) {
  return (
    <div>
      <div className="text-[11px] text-ink-3 font-medium mb-1.5">{label}</div>
      <div className="font-display text-[24px] font-medium tracking-tight">{value}</div>
      <div className="text-[11px] text-ink-2 mt-0.5">{change}</div>
    </div>
  );
}

function DeliverablesPanel() {
  const outputs = [
    { name: 'Pesquisa de mercado',     author: 'Pedro Panorama',   pages: 8,  color: 'sky' },
    { name: 'Diagnóstico financeiro',  author: 'Davi Diagnóstico', pages: 12, color: 'sage' },
    { name: 'Análise de M&A',          author: 'Arthur Aquisição', pages: 6,  color: 'sand' },
    { name: 'Análise contratual',      author: 'Clara Cláusula',   pages: 5,  color: 'lilac' },
    { name: 'Estratégia de venda',     author: 'Victor Valor',     pages: 4,  color: 'cream' },
    { name: 'Veredicto de Maturidade', author: 'Paulo Preparo',    pages: 3,  color: 'sand' },
    { name: 'Blind Teaser',            author: 'Victor Valor',     pages: 2,  color: 'peach' },
    { name: 'Sell-Side Pitchbook',     author: 'Victor Valor',     pages: 18, color: 'peach' },
  ];
  return (
    <Panel>
      <div className="flex items-center justify-between mb-4">
        <PanelTitle className="m-0">Entregáveis do squad</PanelTitle>
        <span className="text-[11px] text-ink-3">9 documentos · 47 páginas</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {outputs.map((o) => <OutputRow key={o.name} {...o}/>)}
      </div>
    </Panel>
  );
}

function OutputRow({ name, author, pages, color }) {
  return (
    <div className="px-3.5 py-3 border border-border rounded-[10px] flex items-center gap-3 cursor-pointer hover:bg-surface-2">
      <AgentMark color={color} initial={author[0]} size="sm"/>
      <div className="flex-1">
        <div className="text-[13px] font-semibold">{name}</div>
        <div className="text-[11px] text-ink-3">{author} · {pages} pp</div>
      </div>
      <IconArrowRight size={14}/>
    </div>
  );
}

function NextActionsPanel() {
  const actions = [
    { n: '1', title: 'Revisar valuation',    sub: 'Davi sinalizou divergência de 8% no múltiplo de saída' },
    { n: '2', title: 'Aprovar Blind Teaser', sub: 'Pronto para envio aos 12 compradores priorizados' },
    { n: '3', title: 'Agendar checkpoint',   sub: 'Sócio sênior · revisão final do pitchbook' },
  ];
  return (
    <Panel padding="20px">
      <Eyebrow className="mb-3.5">Próximas ações</Eyebrow>
      {actions.map((a) => (
        <div key={a.n} className="flex gap-2.5 py-2.5 border-b border-border last:border-0">
          <div className="w-[22px] h-[22px] rounded-full bg-accent-soft text-accent-ink grid place-items-center text-[11px] font-semibold flex-none">{a.n}</div>
          <div>
            <div className="text-[13px] font-semibold">{a.title}</div>
            <div className="text-[11px] text-ink-3">{a.sub}</div>
          </div>
        </div>
      ))}
    </Panel>
  );
}

function ReviewerPanel() {
  return (
    <Panel padding="20px">
      <Eyebrow className="mb-3.5">Rafael Revisor</Eyebrow>
      <div className="flex items-center gap-2.5">
        <AgentMark color="sky" initial="R"/>
        <div>
          <div className="text-[13px] font-semibold">Consistência aprovada</div>
          <div className="text-[11px] text-ink-3">2 ressalvas menores</div>
        </div>
      </div>
      <p className="mt-3.5 p-3 bg-bg-tint rounded-lg text-[12px] text-ink-2 leading-relaxed">
        &quot;Diagnóstico financeiro e tese de M&A estão alinhados. Múltiplo de valuation
        cita 5.5x ARR no IM, mas tabela usa 5.0–5.9x. Recomendo padronizar.&quot;
      </p>
    </Panel>
  );
}

/* ============================================================
 *  ABA · DIAGNÓSTICO
 * ============================================================ */
function DiagnosticoTab() {
  const ebitda = [
    ['EBITDA reportado',                'R$ 5.4M'],
    ['(+) Despesa não-recorrente M&A',  'R$ 0.6M'],
    ['(+) Bonificação fundador one-off','R$ 0.4M'],
    ['(−) Receita extraordinária',      'R$ -0.2M'],
    ['EBITDA normalizado',              'R$ 6.2M', true],
  ];
  const valuations = [
    { method: 'Múltiplos comparáveis (ARR)', range: 'R$ 142M – R$ 168M', anchor: 65 },
    { method: 'DCF · WACC 14% · g 4%',       range: 'R$ 138M – R$ 162M', anchor: 58 },
    { method: 'Transações precedentes',      range: 'R$ 150M – R$ 175M', anchor: 72 },
  ];

  return (
    <div className="grid grid-cols-2 gap-5">
      <Panel>
        <AgentHeader color="sage" initial="D" name="Davi Diagnóstico" role="Financial Diagnostician"/>
        <h4 className="text-[13px] font-semibold mt-[18px] mb-2">EBITDA normalizado</h4>
        <table className="w-full text-[13px] border-collapse">
          <tbody>
            {ebitda.map(([k, v, bold], i) => (
              <tr key={i} className={i === 0 ? '' : 'border-t border-border'}>
                <td className={`py-2.5 ${bold ? 'text-ink font-semibold' : 'text-ink-2'}`}>{k}</td>
                <td className={`py-2.5 text-right font-mono ${bold ? 'font-semibold' : ''}`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel>
        <h4 className="text-[13px] font-semibold m-0 mb-3">Valuation triangulado</h4>
        <div className="flex flex-col gap-3">
          {valuations.map((m) => (
            <div key={m.method}>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-ink-2">{m.method}</span>
                <span className="font-mono font-semibold">{m.range}</span>
              </div>
              <div className="h-1.5 bg-bg-tint rounded-sm relative">
                <div className="absolute h-full bg-accent-soft rounded-sm" style={{ left: `${m.anchor - 12}%`, width: '24%' }}/>
                <div className="absolute w-0.5 h-2.5 bg-accent-strong -top-0.5" style={{ left: `${m.anchor}%` }}/>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 p-3.5 bg-bg-tint rounded-[10px]">
          <Eyebrow>Range consolidado</Eyebrow>
          <div className="font-display text-[24px] font-medium tracking-tight mt-1">R$ 142M – R$ 168M</div>
          <div className="text-[12px] text-ink-2 mt-0.5">5.0x – 5.9x ARR · 22.9x – 27.1x EBITDA</div>
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================
 *  ABA · M&A
 * ============================================================ */
function MATab() {
  const buyers = [
    { name: 'Comprador estratégico A', kind: 'ERP global · Brasil',          fit: 92 },
    { name: 'PE Fund B',                kind: 'Mid-market BR · R$ 800M AUM',  fit: 86 },
    { name: 'Comprador estratégico C', kind: 'SaaS vertical · LATAM',        fit: 81 },
    { name: 'Family Office D',          kind: 'Tech focus · São Paulo',       fit: 74 },
    { name: 'PE Fund E',                kind: 'Growth · R$ 2bi AUM',          fit: 68 },
  ];

  return (
    <div className="grid grid-cols-2 gap-5">
      <Panel>
        <AgentHeader color="sand" initial="A" name="Arthur Aquisição" role="M&A Architect"/>
        <h4 className="text-[13px] font-semibold mt-[18px] mb-3">Estrutura recomendada</h4>
        <div className="p-3.5 border border-accent bg-accent-soft rounded-[10px]">
          <div className="font-display text-[18px] font-medium text-accent-ink">Venda parcial · 60%</div>
          <div className="text-[12px] text-accent-ink mt-0.5">Earn-out 24 meses · 10% performance · cláusula drag-along</div>
        </div>
        <h4 className="text-[13px] font-semibold mt-5 mb-2">Tese de aquisição</h4>
        <ul className="m-0 pl-[18px] text-[13px] text-ink-2 leading-[1.7]">
          <li>Net retention 118% sustenta tese de plataforma</li>
          <li>4 anos de crescimento &gt;40% com burn neutralizando</li>
          <li>Top 10 clientes representam 38% da receita — diversificação saudável</li>
          <li>Fundador permanece 24m como CEO no earn-out</li>
        </ul>
      </Panel>

      <Panel>
        <h4 className="text-[13px] font-semibold m-0 mb-3">Pipeline de compradores</h4>
        <div className="text-[11px] text-ink-3 mb-3.5">12 compradores priorizados por Victor Valor</div>
        <div className="flex flex-col gap-2">
          {buyers.map((b) => (
            <div key={b.name} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{b.name}</div>
                <div className="text-[11px] text-ink-3">{b.kind}</div>
              </div>
              <div className="w-[120px] h-1 bg-bg-tint rounded-sm overflow-hidden">
                <div className="h-full" style={{ width: `${b.fit}%`, background: b.fit > 80 ? 'oklch(0.6 0.1 155)' : 'oklch(0.66 0.14 32)' }}/>
              </div>
              <div className="font-mono text-[11px] font-semibold w-8 text-right">{b.fit}%</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function PlaceholderTab({ name }) {
  return (
    <Panel padding="48px" className="text-center">
      <div className="font-display text-[22px] font-medium">{name}</div>
      <div className="text-[13px] text-ink-3 mt-1.5">Documento gerado pelo squad. Abra para ver o conteúdo completo.</div>
      <button className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2">
        <IconDownload size={13}/> Baixar PDF
      </button>
    </Panel>
  );
}

/* ---------- Building blocks ---------- */
function Panel({ children, padded, padding, className = '' }) {
  const p = padded ? 'p-7' : padding ? '' : 'p-6';
  return (
    <div
      className={`bg-surface border border-border rounded-[14px] shadow-soft-sm ${p} ${className}`}
      style={padding ? { padding } : undefined}
    >
      {children}
    </div>
  );
}
function PanelTitle({ children, className = '' }) {
  return <h3 className={`font-display font-medium text-[18px] m-0 mb-4 ${className}`}>{children}</h3>;
}
function Eyebrow({ children, className = '' }) {
  return <div className={`text-[11px] font-semibold uppercase tracking-wider text-ink-3 ${className}`}>{children}</div>;
}
function AgentHeader({ color, initial, name, role }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <AgentMark color={color} initial={initial}/>
      <div>
        <div className="font-display text-[18px] font-medium">{name}</div>
        <div className="text-[11px] text-ink-3">{role}</div>
      </div>
    </div>
  );
}
