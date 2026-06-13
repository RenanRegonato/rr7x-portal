'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TIPO_LABEL, CONEXAO_LABEL, type EntidadeTipo, type ConexaoVizinha } from '@/lib/mapa-mercado/types'

// Paleta de cores por tipo de participante (distinta, sóbria, profissional).
const COR_TIPO: Record<string, string> = {
  gestora:                        '#2563eb', // azul
  administrador:                  '#0d9488', // teal
  custodiante:                    '#7c3aed', // violeta
  distribuidor:                   '#d97706', // âmbar
  banco:                          '#dc2626', // vermelho
  securitizadora:                 '#db2777', // rosa
  controladoria:                  '#65a30d', // lima
  escritorio_credito_estruturado: '#0891b2', // ciano
  family_office:                  '#9333ea', // roxo
  boutique_investimento:          '#ea580c', // laranja
}
const COR_DEFAULT = '#64748b' // slate

function corDe(tipos: EntidadeTipo[]): string {
  for (const t of tipos) if (COR_TIPO[t]) return COR_TIPO[t]
  return COR_DEFAULT
}

function tipoPrincipal(tipos: EntidadeTipo[]): string {
  const t = tipos[0]
  return t ? (TIPO_LABEL[t] ?? t) : 'Participante'
}

// Largura da aresta proporcional (log) ao peso (nº de veículos em comum).
function larguraAresta(peso: number): number {
  return Math.max(1, Math.min(6, 1 + Math.log2(1 + peso)))
}

const W = 880
const H = 600
const CX = W / 2
const CY = H / 2
const R = 230 // raio onde ficam os vizinhos

interface Props {
  center: { id: string; nome: string; tipos: EntidadeTipo[] }
  vizinhos: ConexaoVizinha[]
}

export default function GrafoConexoes({ center, vizinhos }: Props) {
  const router = useRouter()
  const [hover, setHover] = useState<string | null>(null)

  // Posiciona vizinhos em círculo ao redor do centro.
  const nodes = vizinhos.map((v, i) => {
    const ang = (2 * Math.PI * i) / Math.max(vizinhos.length, 1) - Math.PI / 2
    return {
      ...v,
      x: CX + R * Math.cos(ang),
      y: CY + R * Math.sin(ang),
      ang,
    }
  })

  // Tipos presentes (para a legenda).
  const tiposPresentes = Array.from(
    new Set<string>([...center.tipos, ...vizinhos.flatMap(v => v.tipos)].filter(t => COR_TIPO[t])),
  )

  function irPara(id: string) {
    router.push(`/dashboard/mapa-inteligente/entidade/${id}/grafo`)
  }

  if (vizinhos.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-10 text-center">
        <p className="text-ink-2 text-sm">Esta entidade ainda não tem conexões mapeadas.</p>
        <p className="text-ink-3 text-xs mt-1">As conexões vêm dos prestadores de serviço em comum (dados da CVM).</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 600 }}>
        {/* Arestas (atrás dos nós) */}
        {nodes.map(n => {
          const ativo = hover === null || hover === n.entidade_id
          return (
            <line
              key={`e-${n.entidade_id}`}
              x1={CX} y1={CY} x2={n.x} y2={n.y}
              stroke={ativo ? COR_DEFAULT : '#cbd5e1'}
              strokeWidth={larguraAresta(n.peso)}
              strokeOpacity={ativo ? 0.55 : 0.15}
            />
          )
        })}

        {/* Nós vizinhos */}
        {nodes.map(n => {
          const ativo = hover === null || hover === n.entidade_id
          const r = 18 + Math.min(8, Math.log2(1 + n.peso) * 2)
          const labelDir = n.x >= CX ? 1 : -1
          return (
            <g
              key={n.entidade_id}
              style={{ cursor: 'pointer', opacity: ativo ? 1 : 0.35, transition: 'opacity .15s' }}
              onMouseEnter={() => setHover(n.entidade_id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => irPara(n.entidade_id)}
            >
              <circle cx={n.x} cy={n.y} r={r} fill={corDe(n.tipos)} fillOpacity={0.9} stroke="#fff" strokeWidth={2} />
              <text
                x={n.x + labelDir * (r + 6)}
                y={n.y + 4}
                textAnchor={labelDir === 1 ? 'start' : 'end'}
                fontSize={13}
                fill="var(--color-ink)"
                style={{ pointerEvents: 'none', fontWeight: 500 }}
              >
                {n.nome.length > 26 ? n.nome.slice(0, 25) + '…' : n.nome}
              </text>
              {/* peso + tipo de conexão no hover */}
              {hover === n.entidade_id && (
                <text
                  x={n.x + labelDir * (r + 6)}
                  y={n.y + 20}
                  textAnchor={labelDir === 1 ? 'start' : 'end'}
                  fontSize={11}
                  fill="var(--color-ink-3)"
                  style={{ pointerEvents: 'none' }}
                >
                  {CONEXAO_LABEL[n.tipo] ?? n.tipo} · {n.peso} veículo{n.peso === 1 ? '' : 's'}
                </text>
              )}
            </g>
          )
        })}

        {/* Nó central */}
        <g>
          <circle cx={CX} cy={CY} r={34} fill={corDe(center.tipos)} stroke="#fff" strokeWidth={3} />
          <text x={CX} y={CY + 52} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--color-ink)">
            {center.nome.length > 30 ? center.nome.slice(0, 29) + '…' : center.nome}
          </text>
        </g>
      </svg>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border">
        {tiposPresentes.map(t => (
          <span key={t} className="inline-flex items-center gap-1.5 text-[11px] text-ink-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_TIPO[t] }} />
            {TIPO_LABEL[t as EntidadeTipo] ?? t}
          </span>
        ))}
        <span className="text-[11px] text-ink-3 ml-auto">Clique num nó para explorar · espessura = veículos em comum</span>
      </div>
    </div>
  )
}
