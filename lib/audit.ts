import { createAdminClient } from './supabase-server'

export type AuditEvent =
  | 'analise.created'
  | 'analise.deleted'
  | 'share.created'
  | 'share.revoked'
  | 'share.accessed'
  | 'admin.plan_activated'
  | 'admin.plan_cancelled'
  | 'admin.user_searched'
  | 'invite.sent'
  | 'pacote.created'
  | 'pacote.updated'
  | 'pacote.deleted'
  | 'pacote.consumed'
  | 'regeneracao.solicitada'
  | 'regeneracao.avaliada'
  | 'regeneracao.executada'
  | 'regeneracao.cancelada'
  | 'regeneracao.cascade_avaliada'
  | 'regeneracao.cascade_step_executado'
  | 'fact.extracted'
  | 'benchmark.created'
  | 'benchmark.updated'
  | 'benchmark.archived'
  | 'claims.persisted'
  | 'consistency.checked'
  | 'risk.correlation_run'
  | 'mesa.revisao_run'
  | 'coverage.checked'

interface AuditParams {
  event:      AuditEvent
  userId?:    string | null
  targetId?:  string | null
  metadata?:  Record<string, unknown>
  ip?:        string | null
  userAgent?: string | null
}

/**
 * Extracts the real client IP from request headers.
 * Reads x-forwarded-for (Vercel/proxies) or x-real-ip as fallback.
 */
export function extractIp(headers: Headers): string | null {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    headers.get('x-real-ip') ??
    null
  )
}

/**
 * Inserts an audit event into audit_logs.
 * Never throws — logging must never break the main request flow.
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      event:      params.event,
      user_id:    params.userId    ?? null,
      target_id:  params.targetId  ?? null,
      metadata:   params.metadata  ?? null,
      ip:         params.ip        ?? null,
      user_agent: params.userAgent ?? null,
    })
  } catch (e) {
    console.error('[audit] failed to log event:', params.event, e)
  }
}
