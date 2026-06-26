export const dynamic = 'force-dynamic'

export default function MapaMercadoPage() {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', marginTop: 0 }}>Mapa Inteligente do Mercado</h1>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>Catálogo de participantes, fundos e relações do mercado financeiro</p>

      <div style={{ border: '1px solid #e5e5e5', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Status de Dados</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          <div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>~62k</div><div style={{ fontSize: '11px', color: '#999' }}>Entidades</div></div>
          <div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>~60k</div><div style={{ fontSize: '11px', color: '#999' }}>Veículos</div></div>
          <div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>~500k</div><div style={{ fontSize: '11px', color: '#999' }}>Métricas</div></div>
          <div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>62+</div><div style={{ fontSize: '11px', color: '#999' }}>Fontes CVM</div></div>
        </div>
      </div>

      <div style={{ border: '1px solid #e5e5e5', borderRadius: '6px', padding: '12px' }}>
        <div style={{ fontSize: '13px', color: '#555' }}>
          <strong>Modulo em preparacao:</strong> A busca e navegacao pelo Mapa do Mercado estara disponivel em breve.
        </div>
      </div>
    </div>
  )
}
