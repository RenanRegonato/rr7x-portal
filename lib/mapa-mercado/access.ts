// Acesso ao "Mapa completo" (busca IA, grafo de conexões, alvos de captação).
// A consulta básica do Mapa (busca por nome, fichas, filtros) é aberta a todos
// os usuários autenticados; os recursos avançados exigem o módulo mapa_completo
// (Professional+). Admin (Gestor Geral) tem acesso irrestrito.
import { getUserContext } from '@/lib/get-role'
import { hasModulo } from '@/lib/entitlements'

export async function canMapaCompleto(): Promise<boolean> {
  const ctx = await getUserContext()
  if (!ctx) return false
  if (ctx.role === 'admin') return true
  return hasModulo(ctx.escritorioId, 'mapa_completo')
}
