// @ts-nocheck
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getEntidade } from '@/lib/mapa-mercado/queries'
import { canMapaCompleto } from '@/lib/mapa-mercado/access'
import { IconArrowLeft } from '@/components/Icons'
import GrafoConexoes from '../../../_components/GrafoConexoes'
import type { ConexaoVizinha } from '@/lib/mapa-mercado/types'

export const dynamic = 'force-dynamic'

export default async function GrafoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const resultado = await getEntidade(id)
  if (!resultado?.entidade) notFound()
  const entidade = resultado.entidade
  const nome = entidade.nome_fantasia || entidade.razao_social
  const podeMapa = await canMapaCompleto()

  // Buscar conexoes via origem_id e destino_id
  let vizinhos: ConexaoVizinha[] = []
  if (podeMapa) {
    const sbAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const [{ data: origemData }, { data: destinoData }] = await Promise.all([
      sbAdmin
        .from('mercado_conexoes')
        .select('destino_id, tipo, peso, mercado_entidades!mercado_conexoes_destino_id_fkey(id,razao_social,nome_fantasia,tipos,score_relevancia,cnpj,uf,municipio)')
        .eq('origem_id', id)
        .order('peso', { ascending: false })
        .limit(40),
      sbAdmin
        .from('mercado_conexoes')
        .select('origem_id, tipo, peso, mercado_entidades!mercado_conexoes_origem_id_fkey(id,razao_social,nome_fantasia,tipos,score_relevancia,cnpj,uf,municipio)')
        .eq('destino_id', id)
        .order('peso', { ascending: false })
        .limit(40),
    ])

    const visto = new Set<string>()
    const raw = [
      ...(origemData ?? []).map((c: any) => ({ entidade: c.mercado_entidades, tipo: c.tipo, força: c.peso ?? 1 })),
      ...(destinoData ?? []).map((c: any) => ({ entidade: c.mercado_entidades, tipo: c.tipo, força: c.peso ?? 1 })),
    ]
    for (const v of raw) {
      if (!v.entidade?.id || visto.has(v.entidade.id)) continue
      visto.add(v.entidade.id)
      vizinhos.push(v as ConexaoVizinha)
    }
    vizinhos.sort((a, b) => b.força - a.força)
    vizinhos = vizinhos.slice(0, 30) // max 30 nós para legibilidade
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/dashboard/mapa-inteligente/entidade/${id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <IconArrowLeft size={15}/> Voltar à ficha
        </Link>
        <Link href="/dashboard/mapa-inteligente/buscar" className="text-sm text-ink-2 hover:text-ink">Busca</Link>
      </div>

      <header>
        <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-1">Mapa de conexões</div>
        <h1 className="text-xl font-semibold text-ink">{nome}</h1>
        <p className="text-ink-2 text-sm mt-1">
          Participantes que atuam nos mesmos veículos. A espessura da linha indica a força do vínculo (veículos em comum).
        </p>
      </header>

      {!podeMapa ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-ink text-sm font-medium mb-1">Mapa de conexões — recurso do plano Professional</p>
          <p className="text-ink-3 text-sm max-w-md mx-auto">
            O grafo de relacionamentos faz parte do Mapa completo. Fale com o seu gestor para habilitar o plano Professional.
          </p>
        </div>
      ) : (
        <GrafoConexoes
          center={{ id, nome, tipos: entidade.tipos ?? [] }}
          vizinhos={vizinhos}
        />
      )}
    </div>
  )
}
