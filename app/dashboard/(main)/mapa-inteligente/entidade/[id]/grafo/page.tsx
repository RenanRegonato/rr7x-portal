// Mapa Inteligente do Mercado — Grafo de conexões (mapa de relacionamentos)
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getEntidade, getConexoes } from '@/lib/mapa-mercado/queries'
import { canMapaCompleto } from '@/lib/mapa-mercado/access'
import { IconArrowLeft } from '@/components/Icons'
import GrafoConexoes from '../../../_components/GrafoConexoes'

export const dynamic = 'force-dynamic'

export default async function GrafoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const entidade = await getEntidade(id)
  if (!entidade) notFound()

  const nome = entidade.nome_fantasia || entidade.razao_social
  const podeMapa = await canMapaCompleto()

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
        center={{ id: entidade.id, nome, tipos: entidade.tipos }}
        vizinhos={await getConexoes(id, 40)}
      />
      )}
    </div>
  )
}
