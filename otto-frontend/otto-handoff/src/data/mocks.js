/**
 * Otto — sample data (mocks).
 * Substituir por chamadas ao back-end em produção.
 */

export const DEALS = [
  { id: 'aurora', name: 'Projeto Aurora',      subtitle: 'SaaS B2B · Sell-Side',     thumb: 'peach', featured: true, glyph: 'A', drs: 4.2, status: 'Em revisão',  statusKind: 'live'  },
  { id: 'baobab', name: 'Baobá Agroindústria', subtitle: 'Agro · CRA R$ 80M',        thumb: 'sage',                   glyph: 'B', drs: 3.4, status: 'Squad ativo', statusKind: 'live'  },
  { id: 'cedro',  name: 'Cedro Incorporadora', subtitle: 'Real estate · CRI',        thumb: 'sand',                              drs: 2.8, status: 'Atenção',     statusKind: 'warn'  },
  { id: 'delta',  name: 'Delta Saúde',         subtitle: 'Saúde · Buy-Side',         thumb: 'sky',                               drs: 3.9, status: 'Pronto',      statusKind: 'live'  },
  { id: 'eolo',   name: 'Éolo Energia',        subtitle: 'Renováveis · Debênture',   thumb: 'lilac',                             drs: 3.1, status: 'Draft',       statusKind: 'draft' },
  { id: 'flora',  name: 'Flora Cosméticos',    subtitle: 'Consumo · Series B',       thumb: 'cream',                             drs: 4.5, status: 'Pronto',      statusKind: 'live'  },
  { id: 'gaia',   name: 'Gaia Logística',      subtitle: 'Logística · FIDC',         thumb: 'sand',                              drs: 2.4, status: 'Não pronto',  statusKind: 'warn'  },
  { id: 'helio',  name: 'Hélio Tech',          subtitle: 'SaaS B2B · Series A',      thumb: 'peach',                             drs: 3.7, status: 'Em revisão',  statusKind: 'live'  },
];

export const AGENTS = [
  { id: 'otto',   name: 'Otto Orquestra',    role: 'Deal Orchestrator',          initial: 'O', color: 'peach', emoji: '🎛', deliverable: 'Deal Readiness Score + ativação dos agentes' },
  { id: 'pedro',  name: 'Pedro Panorama',    role: 'Market Researcher',          initial: 'P', color: 'sky',   emoji: '🔭', deliverable: 'Pesquisa mercadológica e benchmarks' },
  { id: 'davi',   name: 'Davi Diagnóstico',  role: 'Financial Diagnostician',    initial: 'D', color: 'sage',  emoji: '🩺', deliverable: 'DRE, fluxo de caixa, valuation, EBITDA normalizado' },
  { id: 'arthur', name: 'Arthur Aquisição',  role: 'M&A Architect',              initial: 'A', color: 'sand',  emoji: '🏗', deliverable: 'Tese de M&A e estrutura da transação' },
  { id: 'clara',  name: 'Clara Cláusula',    role: 'Contractualist',             initial: 'C', color: 'lilac', emoji: '⚖', deliverable: 'NDA, SHA, LOI, passivos jurídicos' },
  { id: 'victor', name: 'Victor Valor',      role: 'Deal Originator',            initial: 'V', color: 'cream', emoji: '🎯', deliverable: 'Teaser, IM, pitch deck e pipeline de compradores' },
  { id: 'estela', name: 'Estela Estrutura',  role: 'Operation Structure Advisor', initial:'E', color: 'sage',  emoji: '🗺', deliverable: 'Ranking de operações de crédito' },
  { id: 'paulo',  name: 'Paulo Preparo',     role: 'Deal Preparator',            initial: 'P', color: 'sand',  emoji: '📋', deliverable: 'Veredicto de Maturidade + roadmap' },
  { id: 'rafael', name: 'Rafael Revisor',    role: 'Quality Reviewer',           initial: 'R', color: 'sky',   emoji: '✅', deliverable: 'Revisão cruzada e consistência' },
];
