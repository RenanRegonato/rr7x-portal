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
export const INTERNAL_PIPELINE_TOKEN_HEADER = 'x-internal-token'

export function isInternalCall(req: Request): boolean {
  const expected = process.env.INTERNAL_PIPELINE_TOKEN
  if (!expected) return false
  const provided = req.headers.get(INTERNAL_PIPELINE_TOKEN_HEADER)
  return !!provided && provided === expected
}
