import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { getTese, listMatches } from '@/lib/invest-match/match-service'
import {
  ESTAGIO_LABEL, TIPO_INVESTIDOR_LABEL, STATUS_MATCH, TIPO_DEAL_LABEL,
  formatBRL, scoreBg,
} from '@/lib/invest-match/labels'
import { IconArrowLeft, IconSparkle, IconHandshake, IconArrowRight } from '@/components/Icons'
import { getAlvosCaptacao } from '@/lib/mapa-mercado/queries'
import { canMapaCompleto } from '@/lib/mapa-mercado/access'
import { TIPO_LABEL } from '@/lib/mapa-mercado/types'
import MatchActions from '@/components/invest-match/MatchActions'
import ScoreBreakdown from '@/components/invest-match/ScoreBreakdown'
import RematchButton from '@/components/invest-match/RematchButton'
import FeedbackForm from '@/components/invest-match/FeedbackForm'
import DeleteButton from '@/components/invest-match/DeleteButton'
import type { StatusMatch } from '@/lib/invest-match/types'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function TeseDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  const tese = await getTese(id, escritorioId)
  if (!tese) notFound()

  const { rows: matches } = await listMatches({ escritorioId, teseId: id, limit: 100, offset: 0 })

  // Alvos de captação no mercado: gestoras que operam o mandato deste deal.
  // Recurso do Mapa completo (Professional+); admin tem acesso irrestrito.
  const podeMapa = await canMapaCompleto()
  const tiposVeiculo = veiculosDoMandato(tese.tipo_deal, tese.setor_primario, tese.sub_setores)
  const alvos = podeMapa ? await getAlvosCaptacao(tiposVeiculo, { limit: 12 }) : []

  const nome = tese.empresa_nome

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/invest-match/teses" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2 mt-1">
            <IconArrowLeft size={18}/>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink">{nome}</h1>
              {tese.origem === 'mandor' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-accent-strong border border-accent-strong/30 rounded-full px-2 py-0.5">
                  <IconSparkle size={11}/> Mandor
                </span>
              )}
            </div>
            <p className="text-ink-3 text-sm mt-1">
              {tese.setor_primario} · {ESTAGIO_LABEL[tese.estagio] ?? tese.estagio} · busca {formatBRL(tese.capital_buscado_brl)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RematchButton teseId={id}/>
          <DeleteButton
            endpoint={`/api/invest-match/teses/${id}`}
            entityLabel="tese"
            name={nome}
            cascadeNote="Os matches gerados a partir desta tese e seus históricos de feedback também serão removidos em definitivo."
            redirectTo="/dashboard/invest-match/teses"
            confirmWord="EXCLUIR"
          />
        </div>
      </div>

      {/* Resumo da tese */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-surface border border-border rounded-xl p-5 space-y-4">
          {tese.tese_investimento && <Field label="Tese de investimento" value={tese.tese_investimento}/>}
          {tese.value_proposition && <Field label="Proposta de valor" value={tese.value_proposition}/>}
          {tese.competitive_moat  && <Field label="Moat competitivo" value={tese.competitive_moat}/>}
          {tese.risk_narrative    && <Field label="Riscos" value={tese.risk_narrative}/>}
          {tese.exit_story        && <Field label="Hipótese de saída" value={tese.exit_story}/>}
          {!tese.tese_investimento && !tese.value_proposition && (
            <p className="text-sm text-ink-3">Sem narrativa estruturada para esta tese.</p>
          )}
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3 text-sm">
          <DataRow label="Receita anual"   value={formatBRL(tese.receita_anual_brl)}/>
          <DataRow label="EBITDA"          value={formatBRL(tese.ebitda_brl)}/>
          <DataRow label="Crescimento YoY" value={tese.crescimento_yoy_pct != null ? `${tese.crescimento_yoy_pct}%` : '—'}/>
          <DataRow label="Valuation"       value={formatBRL(tese.valuation_pre_money_brl)}/>
          <DataRow label="Equity ofertado" value={tese.equity_oferecido_pct != null ? `${tese.equity_oferecido_pct}%` : '—'}/>
          <DataRow label="Tipo de deal"    value={tese.tipo_deal ? (TIPO_DEAL_LABEL[tese.tipo_deal] ?? tese.tipo_deal) : '—'}/>
          <DataRow label="Sede"            value={tese.hq_estado ?? '—'}/>
          <DataRow label="Pronto p/ DD"    value={tese.pronto_para_dd ? 'Sim' : 'Não'}/>
        </div>
      </div>

      {/* Alvos de captação no mercado (Mapa → originação) */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-ink">Alvos de captação no mercado ({alvos.length})</h2>
          <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Mapa do Mercado</span>
        </div>
        <p className="text-[12px] text-ink-3 mb-4">
          Gestoras que já operam o mandato deste deal ({tiposVeiculo.join(', ')}), do mais experiente ao menos.
          Derivado do histórico público da CVM. Não é recomendação de investimento.
        </p>
        {!podeMapa ? (
          <p className="text-sm text-ink-3">
            Alvos de captação fazem parte do <strong>Mapa completo</strong> (plano Professional). Fale com o seu gestor para habilitar.
          </p>
        ) : alvos.length === 0 ? (
          <p className="text-sm text-ink-3">
            Nenhum alvo identificado para este mandato. Verifique se o ETL do Mapa do Mercado já rodou.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {alvos.map(a => {
              const nomeA = a.nome_fantasia || a.razao_social
              const novoHref = `/dashboard/invest-match/investidores/novo?${new URLSearchParams({
                nome: a.razao_social, tipo: 'gestora', uf: a.uf ?? '',
              }).toString()}`
              return (
                <li key={a.entidade_id} className="py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink truncate">{nomeA}</span>
                      {a.score_relevancia != null && (
                        <span className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-accent-soft text-accent-ink">{Math.round(a.score_relevancia)}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-3 truncate">
                      {a.tipos.map(t => TIPO_LABEL[t] ?? t).join(' · ')}{a.uf ? ` · ${a.uf}` : ''}
                      {' · '}<span className="text-ink-2 font-medium">{a.veiculos_no_mandato}</span> veículos no mandato
                      {' '}(de {a.total_veiculos})
                    </div>
                  </div>
                  <Link href={`/dashboard/mapa-inteligente/entidade/${a.entidade_id}/grafo`} className="text-xs text-ink-2 hover:text-ink hidden sm:inline">Conexões</Link>
                  <Link
                    href={novoHref}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-strong/40 text-accent-ink text-xs font-medium hover:bg-accent-soft/50 shrink-0"
                  >
                    <IconHandshake size={13}/> Cadastrar <IconArrowRight size={12}/>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Matches */}
      <div>
        <h2 className="text-sm font-semibold text-ink mb-3">
          Matches ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-ink-2">
              Nenhum match ainda. Clique em <strong>Rodar matching</strong> ou cadastre mais investidores
              com tese declarada compatível.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(m => (
              <div key={m.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{m.investidor?.nome ?? 'Investidor'}</span>
                      <span className="text-[11px] text-ink-3">
                        {m.investidor ? (TIPO_INVESTIDOR_LABEL[m.investidor.tipo] ?? m.investidor.tipo) : ''}
                      </span>
                    </div>
                    {m.llm_resumo && <p className="text-sm text-ink-2 mt-1 max-w-2xl">{m.llm_resumo}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full border text-lg font-bold tabular-nums ${scoreBg(m.score_final)}`}>
                      {Math.round(m.score_final)}
                    </span>
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${STATUS_MATCH[m.status as StatusMatch]?.cls ?? ''}`}>
                      {STATUS_MATCH[m.status as StatusMatch]?.label ?? m.status}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {/* Esquerda: breakdown */}
                  <ScoreBreakdown
                    scoreFinal={m.score_final}
                    scoreEstruturado={m.score_estruturado}
                    scoreSemantico={m.score_semantico}
                    scoreLlm={m.score_llm}
                    breakdown={m.score_breakdown as Record<string, unknown>}
                  />

                  {/* Direita: explicação do Judge */}
                  <div className="space-y-3 text-sm">
                    {m.llm_strengths?.length > 0 && (
                      <ExplBlock title="Pontos fortes" items={m.llm_strengths} tone="ok"/>
                    )}
                    {m.llm_concerns?.length > 0 && (
                      <ExplBlock title="Pontos de atenção" items={m.llm_concerns} tone="warn"/>
                    )}
                    {m.llm_talking_points?.length > 0 && (
                      <ExplBlock title="Pauta da 1ª reunião" items={m.llm_talking_points} tone="neutral"/>
                    )}
                    {m.llm_close_probability != null && (
                      <div className="text-[11px] text-ink-3">
                        Probabilidade de fechamento estimada:{' '}
                        <span className="font-semibold text-ink-2">{m.llm_close_probability}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
                  <Link
                    href={`/dashboard/invest-match/investidores/${m.investidor_id}`}
                    className="text-xs text-ink-3 hover:text-accent-strong"
                  >
                    Ver investidor →
                  </Link>
                  <MatchActions matchId={m.id!} status={m.status as StatusMatch}/>
                </div>
                <div className="mt-3">
                  <FeedbackForm matchId={m.id!}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


// Mapeia o tipo de deal + setor para os tipos de veículo CVM que costumam
// financiar/estruturar aquele mandato. Base dos "alvos de captação".
// Foco no instrumento real do mandato (FIDC p/ crédito estruturado, FIP p/
// equity) em vez de fundo genérico — senão a lista vira "as maiores gestoras".
const DEAL_PARA_VEICULOS: Record<string, string[]> = {
  debt:                ['FIDC'],
  convertible:         ['FIDC', 'FIP'],
  special_situations:  ['FIDC', 'FIP'],
  earn_out:            ['FIP'],
  equity:              ['FIP'],
  growth_equity:       ['FIP'],
  m_and_a_sale:        ['FIP'],
  m_and_a_acquisition: ['FIP'],
}

function veiculosDoMandato(tipoDeal: string | null, setor: string, subSetores: string[]): string[] {
  const base = new Set<string>(DEAL_PARA_VEICULOS[tipoDeal ?? ''] ?? ['FIDC', 'FIP'])
  const txt = `${setor} ${(subSetores ?? []).join(' ')}`.toLowerCase()
  if (txt.includes('imob') || txt.includes('real estate')) base.add('FII')
  if (txt.includes('agro')) base.add('FIAGRO')
  return [...base]
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">{label}</div>
      <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-3 text-xs">{label}</span>
      <span className="text-ink tabular-nums">{value}</span>
    </div>
  )
}

function ExplBlock({ title, items, tone }: { title: string; items: string[]; tone: 'ok' | 'warn' | 'neutral' }) {
  const dot = tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-ink-3'
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1.5">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-ink-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 shrink-0`}/>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
