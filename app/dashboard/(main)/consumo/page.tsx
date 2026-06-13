import { redirect } from 'next/navigation'
import { formatDateBR } from '@/lib/format-date'
import Link from 'next/link'
import { getUserContext } from '@/lib/get-role'
import { createAdminClient } from '@/lib/supabase-server'
import { resolveEntitlements, PLANO_LABEL, MODULO_KEYS, MODULO_LABEL, type Entitlements } from '@/lib/entitlements-presets'

// Painel de Consumo e Licenciamento do escritório (gestor).
// Mostra total/usado/restante de análises por pacote, tipo de plano, alerta de
// limite baixo e histórico de consumo. Dados vêm da tabela `pacotes` (fonte real
// do controle de consumo) e de `analises.pacote_id` (histórico).
// Modelo é por consumo (pacote esgota), não recorrente — por isso não há "renovação".

export const dynamic = 'force-dynamic'

type Pacote = {
  id:                  string
  tipo:                string
  analises_total:      number
  analises_consumidas: number
  status:              string
  observacoes:         string | null
  criado_em:           string
}

type Analise = {
  id:         string
  nome_ativo: string
  status:     string
  criado_em:  string
}

const TIPO_LABEL: Record<string, string> = {
  pontual:       'Pontual',
  institucional: 'Institucional',
  corporativo:   'Corporativo',
}

const STATUS_PACOTE: Record<string, { label: string; cls: string }> = {
  ativo:     { label: 'Ativo',     cls: 'text-ok bg-ok/10 border-ok/30' },
  pausado:   { label: 'Pausado',   cls: 'text-warn bg-warn/10 border-warn/30' },
  encerrado: { label: 'Encerrado', cls: 'text-ink-3 bg-surface-2 border-border' },
}

const STATUS_ANALISE: Record<string, { label: string; cls: string }> = {
  concluido:   { label: 'Concluída',   cls: 'text-ok' },
  processando: { label: 'Processando', cls: 'text-accent-strong' },
  erro:        { label: 'Erro',        cls: 'text-warn' },
}

function fmtData(iso: string): string {
  try { return formatDateBR(iso, { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return '—' }
}

export default async function ConsumoPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  // Apenas gestores (e admin) acompanham o licenciamento da conta.
  if (ctx.role !== 'gerente' && ctx.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  let pacotes: Pacote[] = []
  let historico: Analise[] = []
  let ent: Entitlements | null = null

  if (ctx.escritorioId) {
    const { data: escritorio } = await admin
      .from('escritorios')
      .select('plano, preco_mensal_brl, entitlements, invest_match_enabled, reforma_tributaria_enabled')
      .eq('id', ctx.escritorioId)
      .maybeSingle()
    if (escritorio) ent = resolveEntitlements(escritorio)

    const { data: pacotesData } = await admin
      .from('pacotes')
      .select('id, tipo, analises_total, analises_consumidas, status, observacoes, criado_em')
      .eq('escritorio_id', ctx.escritorioId)
      .order('criado_em', { ascending: false })
    pacotes = (pacotesData ?? []) as Pacote[]

    const pacoteIds = pacotes.map(p => p.id)
    if (pacoteIds.length > 0) {
      const { data: analisesData } = await admin
        .from('analises')
        .select('id, nome_ativo, status, criado_em')
        .in('pacote_id', pacoteIds)
        .order('criado_em', { ascending: false })
        .limit(200)
      historico = (analisesData ?? []) as Analise[]
    }
  }

  const ativos    = pacotes.filter(p => p.status === 'ativo')
  const total      = ativos.reduce((s, p) => s + (p.analises_total ?? 0), 0)
  const consumido  = ativos.reduce((s, p) => s + (p.analises_consumidas ?? 0), 0)
  const restante   = Math.max(0, total - consumido)
  const pctUso     = total > 0 ? Math.round((consumido / total) * 100) : 0

  // Alerta de limite baixo: esgotado, ou <= 20% restante.
  const esgotado    = total > 0 && restante === 0
  const limiteBaixo = total > 0 && restante > 0 && restante <= Math.max(1, Math.ceil(total * 0.2))

  const barColor = pctUso >= 100 ? 'bg-[oklch(0.62_0.2_25)]' : pctUso >= 80 ? 'bg-warn' : 'bg-accent-strong'

  return (
    <div className="px-6 sm:px-10 py-10 max-w-[1080px] mx-auto w-full">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">Escritório</p>
        <h1 className="font-display text-[28px] sm:text-[32px] font-medium tracking-tight">Consumo e Licenciamento</h1>
        <p className="text-[13px] text-ink-3 mt-1">Acompanhe o plano, o licenciamento e o uso de análises do seu escritório.</p>
      </div>

      {/* Plano e licenciamento (entitlements do escritório) */}
      {ent && (
        <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">Plano atual</p>
              <div className="flex items-center gap-2">
                <span className="text-[20px] font-display font-medium text-ink">{PLANO_LABEL[ent.plano]}</span>
                {ent.preco_mensal_brl != null && (
                  <span className="text-[12px] text-ink-3">· R$ {ent.preco_mensal_brl.toLocaleString('pt-BR')}/mês</span>
                )}
              </div>
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2.5">Licenciamento (módulos)</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {MODULO_KEYS.map(k => {
              const on = ent!.modulos[k]
              return (
                <div key={k} className={`flex items-center gap-2 text-[13px] ${on ? 'text-ink' : 'text-ink-3'}`}>
                  <span className={`text-[12px] font-bold ${on ? 'text-accent-strong' : 'text-border-strong'}`}>{on ? '✓' : '—'}</span>
                  {MODULO_LABEL[k]}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sem escritório / sem pacote */}
      {!ctx.escritorioId || total === 0 ? (
        <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-8 text-center">
          <p className="text-[14px] font-medium text-ink mb-1">
            {pacotes.length === 0 ? 'Nenhum pacote habilitado' : 'Nenhum pacote ativo no momento'}
          </p>
          <p className="text-[13px] text-ink-3 mb-5 max-w-[460px] mx-auto">
            Para rodar análises, o escritório precisa de um pacote ativo. Solicite a habilitação de um pacote para começar.
          </p>
          <Link
            href="/dashboard/planos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-accent-strong text-white font-semibold text-[13px] hover:opacity-90"
          >
            Ver planos e contratar
          </Link>
        </div>
      ) : (
        <>
          {/* Alerta de limite */}
          {(esgotado || limiteBaixo) && (
            <div className={`mb-6 rounded-[12px] border px-5 py-4 flex items-start gap-3 ${
              esgotado ? 'bg-[oklch(0.62_0.2_25)]/8 border-[oklch(0.62_0.2_25)]/30' : 'bg-warn/10 border-warn/30'
            }`}>
              <span className="text-[18px] leading-none mt-0.5">{esgotado ? '⛔' : '⚠️'}</span>
              <div>
                <p className={`text-[13.5px] font-semibold ${esgotado ? 'text-[oklch(0.55_0.2_25)]' : 'text-warn'}`}>
                  {esgotado ? 'Pacote esgotado' : `Limite baixo: ${restante} análise(s) restante(s)`}
                </p>
                <p className="text-[12.5px] text-ink-2 mt-0.5">
                  {esgotado
                    ? 'Todas as análises do plano foram utilizadas. Contrate um novo pacote para continuar.'
                    : 'Você está chegando ao limite do plano. Considere contratar um pacote adicional para não interromper as análises.'}
                </p>
              </div>
            </div>
          )}

          {/* Cards resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Disponível no plano" value={total} hint="total contratado" />
            <SummaryCard label="Utilizadas" value={consumido} hint={`${pctUso}% do plano`} />
            <SummaryCard label="Restantes" value={restante} hint="ainda disponíveis" emphasis={restante === 0 ? 'danger' : limiteBaixo ? 'warn' : 'ok'} />
            <SummaryCard label="Pacote de consumo" valueText={ativos.map(p => TIPO_LABEL[p.tipo] ?? p.tipo).join(', ') || '—'} hint="sem prazo: válido até esgotar" />
          </div>

          {/* Barra de uso */}
          <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-ink-2 uppercase tracking-wider">Uso do plano</span>
              <span className="text-[12px] text-ink-3 tabular-nums">{consumido} / {total} ({pctUso}%)</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pctUso)}%` }} />
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-[12.5px] text-ink-3">Precisa de mais análises?</p>
              <Link
                href="/dashboard/planos"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ink text-bg font-semibold text-[12.5px] hover:opacity-90"
              >
                Fazer upgrade de pacote
              </Link>
            </div>
          </div>

          {/* Pacotes */}
          <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-display text-[16px] font-medium">Pacotes do escritório</h2>
            </div>
            <div className="divide-y divide-border">
              {pacotes.map(p => {
                const rest = Math.max(0, (p.analises_total ?? 0) - (p.analises_consumidas ?? 0))
                const cfg  = STATUS_PACOTE[p.status] ?? STATUS_PACOTE.encerrado
                return (
                  <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[14px] text-ink">{TIPO_LABEL[p.tipo] ?? p.tipo}</span>
                        <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                      </div>
                      <p className="text-[12px] text-ink-3 mt-0.5">Habilitado em {fmtData(p.criado_em)}</p>
                    </div>
                    <div className="text-right flex-none">
                      <p className="text-[14px] font-semibold text-ink tabular-nums">{p.analises_consumidas} / {p.analises_total}</p>
                      <p className="text-[11.5px] text-ink-3">{rest} restante(s)</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Histórico de consumo */}
          <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-[16px] font-medium">Histórico de consumo</h2>
              <span className="text-[11.5px] text-ink-3">{historico.length} análise(s)</span>
            </div>
            {historico.length === 0 ? (
              <p className="px-6 py-8 text-center text-[13px] text-ink-3">Nenhuma análise consumida ainda.</p>
            ) : (
              <div className="divide-y divide-border">
                {historico.map(a => {
                  const st = STATUS_ANALISE[a.status] ?? { label: a.status, cls: 'text-ink-3' }
                  return (
                    <div key={a.id} className="px-6 py-3 flex items-center justify-between gap-4">
                      <Link href={`/dashboard/analise/${a.id}`} className="text-[13.5px] text-ink hover:text-accent-strong truncate">
                        {a.nome_ativo || 'Análise sem nome'}
                      </Link>
                      <div className="flex items-center gap-4 flex-none">
                        <span className={`text-[12px] font-medium ${st.cls}`}>{st.label}</span>
                        <span className="text-[12px] text-ink-3 tabular-nums w-[78px] text-right">{fmtData(a.criado_em)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  label, value, valueText, hint, emphasis = 'neutral',
}: {
  label:      string
  value?:     number
  valueText?: string
  hint?:      string
  emphasis?:  'neutral' | 'ok' | 'warn' | 'danger'
}) {
  const valueColor = {
    neutral: 'text-ink',
    ok:      'text-ink',
    warn:    'text-warn',
    danger:  'text-[oklch(0.55_0.2_25)]',
  }[emphasis]
  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">{label}</p>
      {valueText !== undefined
        ? <p className={`text-[18px] font-semibold leading-tight ${valueColor}`}>{valueText}</p>
        : <p className={`text-[30px] font-semibold leading-none tabular-nums ${valueColor}`}>{value}</p>}
      {hint && <p className="text-[11.5px] text-ink-3 mt-1.5">{hint}</p>}
    </div>
  )
}
