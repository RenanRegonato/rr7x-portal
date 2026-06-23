import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import InvestidorForm from '@/components/invest-match/InvestidorForm'
import { IconArrowLeft } from '@/components/Icons'
import type { Investidor } from '@/lib/invest-match/types'

export const dynamic = 'force-dynamic'

// Mapa Inteligente do Mercado → tipo de investidor (Invest Match).
// Usado quando o cadastro é originado a partir de um participante do Mapa.
const MAPA_TIPO_PARA_INVESTIDOR: Record<string, string> = {
  gestora:                        'gestora',
  asset:                          'gestora',
  boutique_investimento:          'gestora',
  banco:                          'financeira',
  family_office:                  'family_office',
  securitizadora:                 'securitizadora',
  escritorio_credito_estruturado: 'administradora_fiduciaria',
  consultoria:                    'pj',
}

export default async function NovoInvestidorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) redirect('/dashboard/invest-match')

  // Pré-preenchimento opcional vindo do Mapa do Mercado (querystring).
  const sp = await searchParams
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const mapaTipo = str(sp.tipo)
  const veioDoMapa = !!str(sp.nome)
  const prefill: Partial<Investidor> = {
    nome:   str(sp.nome) || undefined,
    tipo:   (MAPA_TIPO_PARA_INVESTIDOR[mapaTipo] as Investidor['tipo']) || undefined,
    cidade: str(sp.cidade) || undefined,
    estado: str(sp.uf) || undefined,
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invest-match/investidores" className="p-1.5 rounded-md hover:bg-surface-hover text-ink-2">
          <IconArrowLeft size={18}/>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink">Novo investidor</h1>
          <p className="text-ink-3 text-xs mt-0.5">Preencha a tese declarada para receber matches qualificados.</p>
        </div>
      </div>

      {veioDoMapa && (
        <div className="mb-4 text-[12px] text-ink-2 bg-accent-soft/60 border border-border rounded-lg px-3 py-2">
          Pré-preenchido a partir do <strong>Mapa do Mercado</strong>. Complete a tese declarada abaixo.
        </div>
      )}

      <InvestidorForm mode="create" initial={prefill}/>
    </div>
  )
}
