import MapaMercadoTriggers from '@/components/admin/MapaMercadoTriggers'

export default function AdminMapaMercadoPage() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-ink mb-1">Mapa do Mercado — Admin</h1>
      <p className="text-sm text-ink-2 mb-6">Gerenciamento de ETLs e dados do Mapa Inteligente do Mercado</p>
      <MapaMercadoTriggers />
    </div>
  )
}
