// Formatação de data/hora SEMPRE no fuso de Brasília (America/Sao_Paulo).
//
// Por quê: timestamps são gravados em UTC (timestamptz). Sem fixar o timeZone,
// `toLocaleString` usa o fuso de quem renderiza — no servidor (Vercel = UTC) os
// horários saíam ~3h adiantados, e no browser variavam conforme a máquina.
// Fixar America/Sao_Paulo garante exibição correta e consistente em qualquer
// ambiente (server ou client). Brasil não tem mais horário de verão (desde 2019),
// então o offset é fixo -03:00.

export const TZ_BR = 'America/Sao_Paulo'

type DateInput = string | number | Date

/** Data + hora, ex.: "04/06/2026, 16:01". Aceita opções extras (mescladas). */
export function formatDateTimeBR(value: DateInput, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: TZ_BR,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...opts,
  })
}

/** Só a data, ex.: "04/06/2026". */
export function formatDateBR(value: DateInput, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: TZ_BR, ...opts })
}

/** Só a hora, ex.: "16:01". */
export function formatTimeBR(value: DateInput, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(value).toLocaleTimeString('pt-BR', { timeZone: TZ_BR, ...opts })
}

/**
 * Converte uma data de <input type="date"> (YYYY-MM-DD, interpretada como dia
 * de Brasília) no instante ISO correspondente em UTC. `end=true` pega o fim do
 * dia. Usado em filtros de período para casar com o dia local, não UTC.
 */
export function brDateToInstantISO(date: string, end = false): string {
  if (!date) return ''
  // -03:00 fixo (Brasil sem DST). new Date normaliza para UTC no .toISOString().
  return new Date(`${date}T${end ? '23:59:59.999' : '00:00:00.000'}-03:00`).toISOString()
}
