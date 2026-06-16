// Fonte única do ambiente em que o app roda. `NEXT_PUBLIC_APP_ENV` é embutida no
// bundle em build-time, então o badge de ambiente funciona no client. Default
// seguro: ausência ⇒ produção (homologação precisa setar a var explicitamente).

export type AppEnv = 'production' | 'homolog'

export const APP_ENV: AppEnv =
  (process.env.NEXT_PUBLIC_APP_ENV ?? '').toLowerCase() === 'homolog'
    ? 'homolog'
    : 'production'

export const IS_HOMOLOG    = APP_ENV === 'homolog'
export const IS_PRODUCTION = !IS_HOMOLOG

// URL base do app, centralizando o fallback antes repetido em vários módulos
// (run-pipeline, consolidate-fact-bank, invest-match/notify).
export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.mandor.com.br'
}
