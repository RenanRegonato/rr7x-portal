import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

// Resolve os dados do escritório responsável por uma análise — usado para
// montar o branding institucional dos PDFs (logo, nome, tagline, site).
// O escritório é o do DONO da análise (quem originou o lead), não o do leitor.
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data: analise } = await admin
    .from('analises')
    .select('user_id, deal_intake')
    .eq('id', id)
    .single()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Resolve o escritório do dono: perfis.escritorio_id primeiro, depois fallback
  // para o escritório de propriedade direta (caso admin/gestor).
  const ownerId = analise.user_id as string
  let escritorioId: string | null = null

  const { data: perfil } = await admin
    .from('perfis')
    .select('escritorio_id')
    .eq('user_id', ownerId)
    .maybeSingle()
  escritorioId = perfil?.escritorio_id ?? null

  if (!escritorioId) {
    const { data: owned } = await admin
      .from('escritorios')
      .select('id')
      .eq('user_id', ownerId)
      .maybeSingle()
    escritorioId = owned?.id ?? null
  }

  let escritorio: {
    nome: string
    logoUrl: string | null
    tagline: string | null
    site: string | null
    cidadeUf: string | null
  } | null = null

  if (escritorioId) {
    const { data } = await admin
      .from('escritorios')
      .select('nome, logo_url, tagline, site, cidade_uf')
      .eq('id', escritorioId)
      .single()
    if (data?.nome) {
      escritorio = {
        nome:     data.nome,
        logoUrl:  data.logo_url ?? null,
        tagline:  data.tagline ?? null,
        site:     data.site ?? null,
        cidadeUf: data.cidade_uf ?? null,
      }
    }
  }

  // Fallback: nome livre digitado no deal intake (sem logo).
  const intake = (analise.deal_intake ?? {}) as Record<string, string>
  if (!escritorio && intake.escritorio) {
    escritorio = { nome: intake.escritorio, logoUrl: null, tagline: null, site: null, cidadeUf: null }
  }

  return NextResponse.json({ escritorio })
}
