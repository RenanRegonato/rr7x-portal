import { getResumoMercado } from '@/lib/mapa-mercado/queries'
import { createAdminClient } from '@/lib/supabase-server'
import { formatDateTimeBR } from '@/lib/format-date'
import MapaMercadoTriggers from '@/components/admin/MapaMercadoTriggers'

export const dynamic = 'force-dynamic'

interface RunRow {
  fonte: string
  dataset: string
  status: string
  linhas_lidas: number | null
  linhas_gravadas: number | null
  iniciado_em: string
  finalizado_em: string | null
}

export default async function AdminMapaMercadoPage() {
  const resumo = await getResumoMercado()
  const admin = createAdminClient()
  const { data: runs } = await admin
    .from('mercado_ingestao_runs')
    .select('fonte, dataset, status, linhas_lidas, linhas_gravadas, iniciado_em, finalizado_em')
    .order('iniciado_em', { ascending: false })
    .limit(12)

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Mapa do Mercado — Ingestão</h1>
        <p className="text-ink-3 text-xs mt-0.5">
          Dispare manualmente os ETLs de dado público. A carga roda em background (Inngest);
          acompanhe o progresso pela contagem abaixo e pelo painel do Inngest.
        </p>
      </div>

      {/* Contadores ao vivo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">
        <Stat label="Entidades" value={resumo.total} hint="gestoras, admins, bancos…" />
        <Stat label="Veículos" value={resumo.veiculos} hint="fundos, FIDCs, FIIs…" />
        <Stat label="Tipos distintos" value={Object.keys(resumo.porTipo).length} hint="papéis cobertos" />
      </div>

      {/* Disparo */}
      <h2 className="text-sm font-semibold text-ink mb-3">Disparar ingestão</h2>
      <MapaMercadoTriggers />

      {/* Sequência recomendada */}
      <div className="mt-4 text-[12px] text-ink-2 bg-surface-2/50 border border-border rounded-lg px-4 py-3">
        Sequência: <strong>1 CVM</strong> → aguardar concluir → <strong>2 Receita</strong> → aguardar → <strong>3 Embeddings</strong>.
        O <strong>4 BCB</strong> é independente. Cada etapa drena em lotes; rode de novo se sobrar fila.
      </div>

      {/* Runs recentes */}
      <h2 className="text-sm font-semibold text-ink mt-8 mb-3">Execuções recentes</h2>
      {(!runs || runs.length === 0) ? (
        <p className="text-[13px] text-ink-3">Nenhuma execução registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-[12px]">
            <thead className="bg-surface-2 text-ink-3">
              <tr>
                <Th>Fonte</Th><Th>Dataset</Th><Th>Status</Th><Th>Lidas</Th><Th>Gravadas</Th><Th>Início</Th><Th>Fim</Th>
              </tr>
            </thead>
            <tbody>
              {(runs as RunRow[]).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <Td>{r.fonte}</Td>
                  <Td>{r.dataset}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td className="tabular-nums">{r.linhas_lidas ?? '—'}</Td>
                  <Td className="tabular-nums">{r.linhas_gravadas ?? '—'}</Td>
                  <Td>{formatDateTimeBR(r.iniciado_em)}</Td>
                  <Td>{r.finalizado_em ? formatDateTimeBR(r.finalizado_em) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className="text-2xl font-semibold text-ink tabular-nums mt-0.5">{value.toLocaleString('pt-BR')}</div>
      <div className="text-[11px] text-ink-3 mt-0.5">{hint}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'completed' ? 'bg-ok/15 text-ok border-ok/30'
    : status === 'failed' ? 'bg-warn/10 text-warn border-warn/30'
    : 'bg-sky/15 text-sky-700 border-sky/30'
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] ${cls}`}>{status}</span>
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2">{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-ink-2 ${className}`}>{children}</td>
}
