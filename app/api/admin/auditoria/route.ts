import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

async function requireAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

// GET /api/admin/auditoria
// Query params:
//   event       — evento específico ou prefixo com '*' (ex: 'regeneracao.*')
//   user_id     — filtra por quem disparou o evento
//   target_id   — filtra por entidade-alvo (analise_id, pacote_id, regeneracao_id...)
//   from / to   — ISO date range (created_at)
//   limit       — default 50, max 100
//   offset      — default 0
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const event     = sp.get('event')     ?? ''
  const userId    = sp.get('user_id')   ?? ''
  const targetId  = sp.get('target_id') ?? ''
  const from      = sp.get('from')      ?? ''
  const to        = sp.get('to')        ?? ''
  const limit     = Math.min(parseInt(sp.get('limit')  ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, MAX_LIMIT)
  const offset    = Math.max(parseInt(sp.get('offset') ?? '0', 10) || 0, 0)

  const admin = createAdminClient()

  let query = admin
    .from('audit_logs')
    .select('id, event, user_id, target_id, metadata, ip, user_agent, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Filtro de evento: aceita prefixo com '*' (ex: 'regeneracao.*' → ilike 'regeneracao.%')
  if (event) {
    if (event.endsWith('*')) {
      query = query.like('event', event.slice(0, -1) + '%')
    } else if (event.endsWith('%')) {
      query = query.like('event', event)
    } else {
      query = query.eq('event', event)
    }
  }
  if (userId)   query = query.eq('user_id',   userId)
  if (targetId) query = query.eq('target_id', targetId)
  if (from)     query = query.gte('created_at', from)
  if (to)       query = query.lte('created_at', to)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquece com email do usuário (uma única listagem, cacheável por request)
  const userIds = Array.from(new Set((data ?? []).map(r => r.user_id).filter((u): u is string => !!u)))
  let emailMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers()
    emailMap = new Map(
      (users?.users ?? [])
        .filter(u => userIds.includes(u.id) && u.email)
        .map(u => [u.id, u.email!])
    )
  }

  const enriched = (data ?? []).map(r => ({
    ...r,
    user_email: r.user_id ? emailMap.get(r.user_id) ?? null : null,
  }))

  return NextResponse.json({
    logs:   enriched,
    total:  count ?? 0,
    limit,
    offset,
  })
}
