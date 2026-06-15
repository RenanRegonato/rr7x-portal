import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/get-role'
import { hasModulo } from '@/lib/entitlements'

// Aprendizados é diferencial de plano (módulo 'aprendizados') e gerido pelo
// gerente do escritório. Bloqueia acesso direto por URL de quem não tem.
export default async function AprendizadosLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'gerente') redirect('/dashboard')
  if (!(await hasModulo(ctx.escritorioId, 'aprendizados'))) redirect('/dashboard')
  return <>{children}</>
}
