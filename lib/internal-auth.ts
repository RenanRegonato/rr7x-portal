/**
 * Internal server-to-server auth for the analysis pipeline.
 *
 * The Inngest orchestrator (`lib/analise/run-pipeline.ts`) calls the existing
 * pipeline endpoints (/step, /fact-extract, /consistency-check, ...) over HTTP.
 * Those endpoints normally require a logged-in user session, which the
 * orchestrator does not have. Instead it sends a shared secret in the
 * `x-internal-token` header; when it matches `INTERNAL_PIPELINE_TOKEN`, the
 * endpoint skips the user-auth/permission checks and proceeds with the admin
 * client (which it already builds).
 *
 * Safe default: if `INTERNAL_PIPELINE_TOKEN` is unset/empty, this always
 * returns false, so normal user authentication still applies.
 */
import { timingSafeEqual } from 'node:crypto'

export const INTERNAL_PIPELINE_TOKEN_HEADER = 'x-internal-token'

export function isInternalCall(req: Request): boolean {
  const expected = process.env.INTERNAL_PIPELINE_TOKEN
  if (!expected) return false
  const provided = req.headers.get(INTERNAL_PIPELINE_TOKEN_HEADER)
  if (!provided) return false

  // Constant-time compare: length-check first (timingSafeEqual exige buffers
  // do mesmo tamanho), depois timingSafeEqual. Sem o length-check vazaria o
  // tamanho do token. timingSafeEqual fecha o canal de timing pro conteúdo.
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
