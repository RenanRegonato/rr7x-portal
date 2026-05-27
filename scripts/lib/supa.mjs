// Helper compartilhado pelos scripts: carrega .env.local e devolve um client
// admin (service role) do Supabase. Mesmo padrão de scripts/seed-deal-vitrine.mjs.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

export function loadEnv() {
  return Object.fromEntries(
    readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
      .split('\n').filter((l) => l && !l.startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')] }),
  )
}

export function adminClient() {
  const env = loadEnv()
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local')
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
