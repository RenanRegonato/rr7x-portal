import { createHmac } from 'crypto'

const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(): string {
  const secret = process.env.SHARE_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('SHARE_TOKEN_SECRET environment variable is not set')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createShareToken(analiseId: string): string {
  const exp     = Date.now() + TTL_MS
  const payload = `${analiseId}:${exp}`
  const sig     = sign(payload)
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export type TokenResult =
  | { ok: true;  analiseId: string }
  | { ok: false; reason: 'expired' | 'invalid' }

export function verifyShareToken(token: string): TokenResult {
  try {
    const raw     = Buffer.from(token, 'base64url').toString()
    const parts   = raw.split(':')
    if (parts.length < 3) return { ok: false, reason: 'invalid' }

    const sig       = parts[parts.length - 1]
    const exp       = Number(parts[parts.length - 2])
    const analiseId = parts.slice(0, parts.length - 2).join(':')
    const payload   = `${analiseId}:${exp}`

    if (sign(payload) !== sig)  return { ok: false, reason: 'invalid'  }
    if (Date.now() > exp)       return { ok: false, reason: 'expired'  }

    return { ok: true, analiseId }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}
