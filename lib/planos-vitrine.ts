// ============================================================
// Planos — fonte única de apresentação (vitrine)
// ============================================================
// Conteúdo canônico dos planos Essential/Professional/Enterprise usado nas
// superfícies React (home pública e /dashboard/planos). Os materiais estáticos
// (apresentação e pitch em HTML) replicam este conteúdo manualmente.
//
// Regras: volume é controlado pelo PACOTE de créditos (não há teto mensal de
// plano). Preços NÃO são publicados aqui (Fase 5 — publicar quando validados).
// Itens ainda não implementados levam o sufixo "(em evolução)".

export type PlanoId = 'essential' | 'professional' | 'enterprise'

export interface PlanoVitrine {
  id:             PlanoId
  nome:           string
  posicionamento: string
  destaque:       boolean
  features:       string[]   // incluídos no plano (✓)
  naoIncluidos:   string[]   // aparecem apagados (—); incluídos no plano superior
  volume:         string
  usuarios:       string
}

export const PLANOS_VITRINE: PlanoVitrine[] = [
  {
    id:             'essential',
    nome:           'Essential',
    posicionamento: 'O parecer institucional completo, pronto para decidir se a operação avança.',
    destaque:       false,
    features: [
      'Pipeline completo de diligência (todos os agentes)',
      'Parecer rastreável + trilha de auditoria',
      'Documentos de captação (Blind Teaser e Pitchbook)',
      'Auto-pull de CNPJ + monitoramento contínuo',
      'Mapa do Mercado — consulta (busca e fichas)',
      'Exportação em PDF, Excel e PowerPoint',
    ],
    naoIncluidos: [
      'Adequação à Reforma Tributária',
      'Invest Match',
    ],
    volume:   'Pacote básico',
    usuarios: 'Até 3 usuários',
  },
  {
    id:             'professional',
    nome:           'Professional',
    posicionamento: 'Inteligência aplicada: tributário, originação interna e aprendizado do escritório.',
    destaque:       true,
    features: [
      'Tudo do Essential',
      'Adequação à Reforma Tributária (agente dedicado)',
      'Aprendizados do escritório (inteligência acumulada)',
      'Invest Match: originação interna (teses + matching na sua base)',
      'Mapa do Mercado completo: busca IA, grafo e alvos de captação',
      'Regeneração e refinamento com briefing',
      'Identidade do escritório nos relatórios',
    ],
    naoIncluidos: [
      'Invest Match em Rede (fontes de capital ampliadas)',
      'API e integrações',
    ],
    volume:   'Volume ampliado',
    usuarios: 'Até 17 usuários',
  },
  {
    id:             'enterprise',
    nome:           'Enterprise',
    posicionamento: 'A rede de capital e a escala corporativa, com governança avançada.',
    destaque:       false,
    features: [
      'Tudo do Professional',
      'Invest Match em Rede: fontes de capital ampliadas (em evolução)',
      'Originação reversa + insights de calibração',
      'API e integrações (em evolução)',
      'Personalização de agentes',
      'Governança e suporte estratégico dedicado',
      'SSO e isolamento dedicado (em evolução)',
      'Gerente dedicado',
    ],
    naoIncluidos: [],
    volume:   'Ilimitado / instância dedicada',
    usuarios: 'Usuários ilimitados',
  },
]
