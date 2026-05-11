import { createAdminClient } from './supabase-server'
import { NextResponse } from 'next/server'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
}

/**
 * Checks rate limit via Supabase RPC (atomic, works across all Vercel instances).
 * Fails open: if Supabase is unavailable, the request is allowed.
 *
 * Requires the `upsert_rate_limit` function and `rate_limits` table in the database.
 * See: lib/database-migrations/002_rate_limits.sql
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('upsert_rate_limit', {
      p_key: key,
      p_max: maxRequests,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('[rate-limit] rpc error:', error.message)
      return { allowed: true, remaining: maxRequests, resetIn: windowSeconds }
    }

    return {
      allowed:   data.allowed,
      remaining: data.remaining,
      resetIn:   data.reset_in,
    }
  } catch (e) {
    console.error('[rate-limit] unexpected error:', e)
    return { allowed: true, remaining: maxRequests, resetIn: windowSeconds }
  }
}

export function rateLimitResponse(resetIn: number) {
  return NextResponse.json(
    { error: 'Muitas requisições. Tente novamente em breve.' },
    {
      status: 429,
      headers: { 'Retry-After': String(resetIn) },
    }
  )
}
