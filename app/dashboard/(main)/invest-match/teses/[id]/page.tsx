import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { getTese, listMatches, listSugestoesMercado } from '@/lib/invest-match/match-service'
import {
  ESTAGIO_LABEL, TIPO_INVESTIDOR_LABEL, STATUS_MATCH, TIPO_DEAL_LABEL,
  formatBRL, scoreBg,
} from '@/lib/invest-match/labels'
import { IconArrowLeft, IconSparkle, IconHandshake, IconArrowRight } from '@/components/Icons'
import { TIPO_LABEL, type EntidadeTipo } from '@/lib/mapa-mercado/types'
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

  // Sugestões de Conexão de Mercado: participantes do Mapa do Mercado (dado
  // público) com aderência à tese. Geradas junto com o matching e persistidas.
  // Disponível para todos os planos — é o que dá valor a escritório com base
  // privada pequena. NÃO são matches confirmados.
  const sugestoes = await listSugestoesMercado(id, escritorioId)

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

      {/* Match Confirmado — base privada do escritório */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-ink">Match Confirmado ({matches.length})</h2>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-accent-strong border border-accent-strong/30 rounded-full px-2 py-0.5 font-semibold">
            <IconHandshake size={11}/> Rede privada
          </span>
        </div>
        <p className="text-[12px] text-ink-3 mb-3">
          Investidores cadastrados pelo seu escritório, cruzados com a tese. Relacionamento existente, alta probabilidade de abordagem imediata.
        </p>
        {matches.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-ink-2">
              Nenhum investidor da sua base bateu com esta tese ainda. Cadastre investidores com tese
              declarada compatível, ou veja as <strong>Sugestões de Conexão de Mercado</strong> abaixo.
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

      {/* Sugestões de Conexão de Mercado — Mapa do Mercado (dado público) */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-ink">Sugestões de Conexão de Mercado ({sugestoes.length})</h2>
          <span className="text-[10px] uppercase tracking-wider text-ink-3 border border-border rounded-full px-2 py-0.5 font-semibold">
            Mapa do Mercado
          </span>
        </div>
        <p className="text-[12px] text-ink-3 mb-2">
          Participantes do mercado com aderência à tese deste deal, identificados no Mapa do Mercado da Mandor (dado público).
        </p>
        <div className="text-[11px] text-ink-3 bg-bg/50 border border-border rounded-lg px-3 py-2 mb-4 leading-relaxed">
          Não fazem parte da sua rede privada · sem relacionamento validado · sem contato confirmado.
          É uma recomendação estratégica por aderência, não um match confirmado.
        </div>
        {sugestoes.length === 0 ? (
          <p className="text-sm text-ink-3">
            Nenhuma sugestão identificada ainda. Elas são geradas junto com o matching. Rode o matching ou
            verifique se o ETL do Mapa do Mercado já foi executado.
          </p>
        ) : (
          <ul className="bg-surface border border-border rounded-xl divide-y divide-border">
            {sugestoes.map(s => {
              const nomeS = s.nome_fantasia || s.razao_social
              const tipoEntidade = s.tipos[0] ?? 'gestora'
              const novoHref = `/dashboard/invest-match/investidores/novo?${new URLSearchParams({
                nome: s.razao_social, tipo: tipoEntidade, uf: s.uf ?? '',
              }).toString()}`
              return (
                <li key={s.id} className="py-3 px-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink truncate">{nomeS}</span>
                      <span
                        className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-ink-3/10 text-ink-2"
                        title="Aderência à tese — sugestão de mercado, não é score de match confirmado"
                      >
                        {Math.round(s.aderencia)}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-3 truncate">
                      {s.motivo || s.tipos.map(t => TIPO_LABEL[t as EntidadeTipo] ?? t).join(' · ')}
                      {s.uf ? ` · ${s.uf}` : ''}
                    </div>
                  </div>
                  <Link href={`/dashboard/mapa-inteligente/entidade/${s.entidade_id}`} className="text-xs text-ink-2 hover:text-ink hidden sm:inline">Ver no Mapa</Link>
                  <Link
                    href={novoHref}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-ink-2 text-xs font-medium hover:border-accent-strong/40 hover:text-accent-strong shrink-0"
                  >
                    <IconHandshake size={13}/> Adicionar à base <IconArrowRight size={12}/>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
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
