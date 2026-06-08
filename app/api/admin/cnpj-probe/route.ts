import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'

// GET /api/admin/cnpj-probe?cnpj=00000000000000
// Diagnóstico (admin): faz o fetch cru da BrasilAPI a partir da Vercel e
// devolve status/erro/tempo exatos — para distinguir rate-limit (429),
// bloqueio por User-Agent, timeout ou outro. Temporário, remover depois.
export const maxDuration = 30

const URL_BASE = 'https://brasilapi.com.br/api/cnpj/v1'

async function probe(cnpj: string, ua: string | null) {
  const started = Date.now()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (ua) headers['User-Agent'] = ua
  try {
    const res = await fetch(`${URL_BASE}/${cnpj}`, { headers })
    const body = await res.text()
    return {
      ua: ua ?? '(default do runtime)',
      status: res.status,
      ok: res.ok,
      ms: Date.now() - started,
      ratelimit_remaining: res.headers.get('x-ratelimit-remaining'),
      retry_after: res.headers.get('retry-after'),
      body_start: body.slice(0, 200),
    }
  } catch (e) {
    return {
      ua: ua ?? '(default do runtime)',
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      ms: Date.now() - started,
    }
  }
}

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  const cnpj = (req.nextUrl.searchParams.get('cnpj') ?? '42786793000166').replace(/\D/g, '')

  // Sequencial para não somar carga; dois cenários de User-Agent.
  const semUA = await probe(cnpj, null)
  const comUA = await probe(cnpj, 'Mandor/1.0 (+https://www.mandor.com.br)')

  return NextResponse.json({ cnpj, sem_user_agent: semUA, com_user_agent: comUA })
}
