'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Botões de disparo manual dos ETLs do Mapa do Mercado. Cada um chama o
// endpoint admin que envia o evento Inngest (carga roda em background).
// A execução real é acompanhada no painel do Inngest e na contagem da página.

interface Etl {
  key:    string
  titulo: string
  desc:   string
  ordem:  number
}

const ETLS: Etl[] = [
  { key: 'cvm',     titulo: 'ETL CVM (cadastro de fundos)', desc: 'Carrega ~60k fundos + gestoras/administradores/custodiantes. Base de tudo. Rode primeiro.', ordem: 1 },
  { key: 'receita', titulo: 'Enriquecimento Receita',       desc: 'Completa UF, município, CNAE e situação das entidades via BrasilAPI. Rode depois do CVM.', ordem: 2 },
  { key: 'embed',   titulo: 'Embeddings (busca semântica)', desc: 'Gera vetores voyage-3-large das entidades. Exige VOYAGE_API_KEY. Rode após Receita.', ordem: 3 },
  { key: 'bcb',     titulo: 'ETL BCB (bancos)',             desc: 'Métricas financeiras dos bancos (IF.data). Independente dos demais.', ordem: 4 },
]

export default function MapaMercadoTriggers() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ key: string; ok: boolean; texto: string } | null>(null)

  async function disparar(etl: Etl) {
    if (loading) return
    if (!window.confirm(`Disparar "${etl.titulo}" em produção agora?`)) return
    setLoading(etl.key)
    setMsg(null)
    try {
      const res = await fetch(`/api/mapa-mercado/etl/${etl.key}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ key: etl.key, ok: false, texto: data.error ?? 'Falha ao disparar.' })
      } else {
        setMsg({ key: etl.key, ok: true, texto: data.mensagem ?? 'Disparado em background.' })
        setTimeout(() => router.refresh(), 1500)
      }
    } catch (e) {
      setMsg({ key: etl.key, ok: false, texto: (e as Error).message })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ETLS.map(etl => (
        <div key={etl.key} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-2 text-ink-3 text-[11px] font-bold mr-1.5">{etl.ordem}</span>
              <span className="font-semibold text-[13px] text-ink">{etl.titulo}</span>
            </div>
          </div>
          <p className="text-[12px] text-ink-2 leading-snug">{etl.desc}</p>
          <button
            type="button"
            disabled={loading != null}
            onClick={() => disparar(etl)}
            className="mt-1 self-start rounded-md bg-accent-strong text-white px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:opacity-50"
          >
            {loading === etl.key ? 'Disparando…' : 'Disparar ETL'}
          </button>
          {msg?.key === etl.key && (
            <p className={`text-[11px] ${msg.ok ? 'text-ok' : 'text-warn'}`}>{msg.texto}</p>
          )}
        </div>
      ))}
    </div>
  )
}
