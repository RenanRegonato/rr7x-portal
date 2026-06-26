/**
 * Registro Mestre de Documentos do Mandor
 *
 * Fonte única de verdade para o Dossiê de Documentação e o Checklist Inteligente.
 * Cobre todos os pilares: M&A, FIDC, CRI/CRA, Asset Prep e Geral.
 *
 * Regras:
 * - `severidade` define peso no cálculo de completude (critico=3, alto=2, recomendado=1)
 * - `matchPatterns` são usados para identificar o doc pelo nome do arquivo enviado
 * - `pilares` determina em qual(is) pilar(es) o doc aparece
 * - `subtipos` restringe o doc a subtipos específicos dentro do pilar
 */

export type PilarOperacao = 'ma' | 'fidc' | 'cri_cra' | 'asset_prep' | 'geral'
export type SeveridadeDoc = 'critico' | 'alto' | 'recomendado'
export type CategoriaDoc = 'financeiro' | 'juridico' | 'tecnico' | 'estrutura' | 'compliance' | 'comercial'

export interface ItemChecklist {
  id: string
  nome: string
  categoria: CategoriaDoc
  descricao: string
  finalidade: string
  severidade: SeveridadeDoc
  pilares: PilarOperacao[]
  /** Restringe ao subtipo de lastro (FIDC) ou tipo de ativo (Asset Prep / CRI-CRA) */
  subtipos?: string[]
  exemplo?: string
  dica?: string
  /** Padrões de nome de arquivo para identificação automática */
  matchPatterns: RegExp[]
}

// ─── DOCUMENTAÇÃO GERAL ────────────────────────────────────────────────────────

export const DOCS_GERAL: ItemChecklist[] = [
  {
    id: 'geral_contrato_social',
    nome: 'Contrato Social / Estatuto',
    categoria: 'juridico',
    descricao: 'Documento constitutivo da empresa com estrutura societária vigente',
    finalidade: 'Confirma existência jurídica, composição acionária e poderes dos representantes',
    severidade: 'critico',
    pilares: ['ma', 'fidc', 'cri_cra', 'asset_prep', 'geral'],
    exemplo: 'Contrato social consolidado, estatuto social, ata de constituição',
    dica: 'Deve ser a versão mais recente com todas as alterações. Se consolidado, melhor ainda.',
    matchPatterns: [/contrato.{0,8}social/i, /estatuto.{0,8}social/i, /ata.{0,8}constitui/i, /alterac.{0,6}o.{0,8}contrat/i],
  },
  {
    id: 'geral_cnpj',
    nome: 'Comprovante de CNPJ / Situação Cadastral',
    categoria: 'compliance',
    descricao: 'Extrato de CNPJ emitido pela Receita Federal',
    finalidade: 'Confirma situação ativa e dados cadastrais da empresa junto à Receita',
    severidade: 'alto',
    pilares: ['ma', 'fidc', 'cri_cra', 'asset_prep', 'geral'],
    exemplo: 'Extrato do CNPJ (receita.fazenda.gov.br), Comprovante de Inscrição e Situação Cadastral',
    matchPatterns: [/cnpj/i, /situac.{0,6}o.{0,8}cadastral/i, /comprovante.{0,8}inscri/i, /receita.{0,8}federal/i],
  },
  {
    id: 'geral_docs_socios',
    nome: 'Documentos dos Sócios / Controladores',
    categoria: 'compliance',
    descricao: 'RG, CPF ou CNH dos sócios com participação relevante (≥ 10%)',
    finalidade: 'Obrigatório para KYC e screening de PEP, sanções e antecedentes',
    severidade: 'alto',
    pilares: ['ma', 'fidc', 'cri_cra', 'asset_prep', 'geral'],
    exemplo: 'RG + CPF de cada sócio, CNH, passaporte (estrangeiros)',
    dica: 'Para sócio PJ (holding), enviar documentos da holding e da pessoa física controladora.',
    matchPatterns: [/rg.{0,10}(s.cios?|controlad|s.cio)/i, /cpf.{0,10}(s.cios?|controlad)/i, /documentos.{0,8}s.cios/i, /\bkyc\b/i, /identidade.{0,8}s.cio/i],
  },
]

// ─── M&A ──────────────────────────────────────────────────────────────────────

export const DOCS_MA: ItemChecklist[] = [
  {
    id: 'ma_dre',
    nome: 'DRE — Demonstração de Resultado do Exercício',
    categoria: 'financeiro',
    descricao: 'Resultado econômico da empresa nos últimos 3 exercícios',
    finalidade: 'Base para cálculo de EBITDA normalizado, margens, tendência de receita e comparação com benchmarks de mercado',
    severidade: 'critico',
    pilares: ['ma'],
    exemplo: 'DRE anual auditada, DRE gerencial dos últimos 3 anos, Demonstração de Resultados',
    dica: 'Auditada é ideal. Gerencial também é aceita — explique na Tese do Deal e o sistema registra como ressalva, não como red flag.',
    matchPatterns: [/\bdre\b/i, /demonstra.{0,6}o.{0,8}result/i, /resultado.{0,8}exerc/i, /demostr.{0,6}o.{0,8}result/i],
  },
  {
    id: 'ma_balanco',
    nome: 'Balanço Patrimonial',
    categoria: 'financeiro',
    descricao: 'Posição de ativos, passivos e patrimônio líquido nos últimos 2-3 exercícios',
    finalidade: 'Avalia solidez patrimonial, endividamento, liquidez e estrutura de capital da empresa',
    severidade: 'critico',
    pilares: ['ma'],
    exemplo: 'Balanço dos últimos 2 exercícios (auditado ou contábil), Balancete',
    dica: 'Divergências entre DRE e balanço são detectadas automaticamente. Explique na Tese se houver.',
    matchPatterns: [/balan[çc]o/i, /balancete/i, /patrimonial/i, /\bbp\b/i],
  },
  {
    id: 'ma_dfc',
    nome: 'DFC — Demonstrativo de Fluxo de Caixa',
    categoria: 'financeiro',
    descricao: 'Geração e consumo de caixa operacional, investimentos e financiamentos',
    finalidade: 'Revela a capacidade real de geração de caixa, independente do resultado contábil',
    severidade: 'critico',
    pilares: ['ma'],
    exemplo: 'DFC anual, Fluxo de caixa operacional, Projeção de caixa',
    matchPatterns: [/\bdfc\b/i, /fluxo.{0,8}caixa/i, /cash.{0,5}flow/i],
  },
  {
    id: 'ma_cnd',
    nome: 'Certidões Negativas (CND)',
    categoria: 'compliance',
    descricao: 'Situação fiscal, previdenciária e trabalhista da empresa',
    finalidade: 'Identifica passivos tributários, trabalhistas e previdenciários que impactam o valuation e a transação',
    severidade: 'critico',
    pilares: ['ma'],
    exemplo: 'CND Federal (Receita Federal), PGFN, CND Estadual, CND Trabalhista (TST), Certidão FGTS (CEF)',
    dica: 'Pendências conhecidas devem ser explicadas na Tese para contextualizar. Não bloqueiam a análise, mas são apontadas.',
    matchPatterns: [/\bcnd\b/i, /certid[ãa]o.{0,8}negativ/i, /receita.{0,8}federal.{0,8}cert/i, /pgfn/i, /certid[ãa]o.{0,8}fiscal/i, /certid[ãa]o.{0,8}trabalhist/i, /\bfgts\b/i],
  },
  {
    id: 'ma_pitch',
    nome: 'Apresentação do Negócio (Pitch Deck / IM)',
    categoria: 'comercial',
    descricao: 'Visão geral da empresa, produto/serviço, mercado-alvo e estratégia',
    finalidade: 'Fornece contexto estratégico para os agentes de M&A e estruturação da transação',
    severidade: 'alto',
    pilares: ['ma'],
    exemplo: 'Pitch deck, Information Memorandum (IM), Apresentação institucional, Teaser de venda',
    matchPatterns: [/pitch/i, /information.{0,8}memorandum/i, /\bim\b.{0,8}(empresa|ativo|deal)/i, /apresenta.{0,6}o.{0,8}(negocio|empresa|ativo)/i, /teaser/i],
  },
  {
    id: 'ma_projecao',
    nome: 'Projeção Financeira',
    categoria: 'financeiro',
    descricao: 'Estimativa de receitas, despesas e resultados para os próximos 3-5 anos',
    finalidade: 'Base para cálculo de valuation por fluxo de caixa descontado (DCF) e análise de cenários',
    severidade: 'alto',
    pilares: ['ma'],
    exemplo: 'Modelo financeiro em Excel, Projeção de 5 anos, Financial model',
    matchPatterns: [/proje.{0,6}[aã]o.{0,8}financ/i, /financial.{0,8}model/i, /modelo.{0,8}financ/i, /forecast/i, /budget/i],
  },
  {
    id: 'ma_clientes',
    nome: 'Relação de Clientes Principais',
    categoria: 'comercial',
    descricao: 'Lista dos principais clientes com receita, contratos e prazo de relacionamento',
    finalidade: 'Avalia concentração de receita, risco de churning e qualidade da carteira comercial',
    severidade: 'alto',
    pilares: ['ma'],
    exemplo: 'Lista top 10 clientes, Contratos de clientes âncora, Relatório de receita por cliente',
    matchPatterns: [/clientes.{0,8}(principais|lista|rela.{0,6}[aã]o|top)/i, /rela.{0,6}[aã]o.{0,8}clientes/i, /carteira.{0,8}clientes/i],
  },
  {
    id: 'ma_acordo_acionistas',
    nome: 'Acordo de Acionistas / Quotistas',
    categoria: 'juridico',
    descricao: 'Direitos e obrigações entre sócios, cláusulas de tag-along, drag-along e veto',
    finalidade: 'Identifica restrições à transferência de participação e obrigações que afetam a transação',
    severidade: 'alto',
    pilares: ['ma'],
    exemplo: 'Shareholders Agreement (SHA), Acordo de quotistas, Acordo parassocial',
    dica: 'Se não houver acordo formal, sinalize na Tese do Deal.',
    matchPatterns: [/acordo.{0,8}(acionistas|quotistas|s.cios)/i, /shareholders/i, /sha.{0,5}(acordo|contrat)/i, /parassocial/i, /tag.{0,5}along/i],
  },
  {
    id: 'ma_contingencias',
    nome: 'Relatório de Contingências',
    categoria: 'juridico',
    descricao: 'Processos judiciais, administrativos e passivos contingentes relevantes',
    finalidade: 'Mapeia risco jurídico que pode impactar o valuation ou gerar obrigações pós-fechamento',
    severidade: 'alto',
    pilares: ['ma'],
    exemplo: 'Relatório de contingências, Lista de processos judiciais, Notas explicativas do balanço',
    matchPatterns: [/conting[eê]ncia/i, /processos.{0,8}(judicial|trabalhist|tributar)/i, /passivo.{0,8}conting/i, /litigi/i],
  },
  {
    id: 'ma_propriedade_intelectual',
    nome: 'Propriedade Intelectual (marcas, patentes, software)',
    categoria: 'juridico',
    descricao: 'Registros de marcas, patentes, domínios e licenças de software',
    finalidade: 'Compõe o ativo intangível e pode ser determinante no valuation de empresas tech/consumo',
    severidade: 'recomendado',
    pilares: ['ma'],
    exemplo: 'Certificados de marca (INPI), Patentes, Contratos de licença de software, Registros de domínio',
    matchPatterns: [/propriedade.{0,8}intelectual/i, /marca.{0,8}(registr|inpi)/i, /patente/i, /\binpi\b/i],
  },
  {
    id: 'ma_licencas',
    nome: 'Licenças e Alvarás de Funcionamento',
    categoria: 'compliance',
    descricao: 'Autorizações regulatórias, alvarás e licenças setoriais necessárias para operar',
    finalidade: 'Garante que o negócio está regularizado e não há risco de suspensão por falta de licença',
    severidade: 'recomendado',
    pilares: ['ma'],
    exemplo: 'Alvará de funcionamento, Licença ambiental (LO/LI), Autorização da ANVISA, CVM, BACEN',
    matchPatterns: [/alvar[aá]/i, /licen[cç]a.{0,8}(funcio|ambiental|operar|operar)/i, /autoriza.{0,6}[aã]o.{0,8}(anvisa|cvm|bacen)/i],
  },
]

// ─── FIDC ─────────────────────────────────────────────────────────────────────

export const DOCS_FIDC: ItemChecklist[] = [
  // Cedente — obrigatório para qualquer FIDC
  {
    id: 'fidc_dre_cedente',
    nome: 'DRE do Cedente (últimos 3 anos)',
    categoria: 'financeiro',
    descricao: 'Resultado econômico do originador dos recebíveis',
    finalidade: 'Avalia saúde financeira do cedente e capacidade de originação sustentável da carteira',
    severidade: 'critico',
    pilares: ['fidc'],
    exemplo: 'DRE anual dos últimos 3 exercícios do cedente (empresa originadora)',
    matchPatterns: [/\bdre\b/i, /demonstra.{0,6}o.{0,8}result/i, /resultado.{0,8}exerc/i],
  },
  {
    id: 'fidc_balanco_cedente',
    nome: 'Balanço Patrimonial do Cedente (últimos 3 anos)',
    categoria: 'financeiro',
    descricao: 'Posição patrimonial do originador',
    finalidade: 'Avalia solidez, endividamento e patrimônio líquido do cedente — garante capacidade de suportar recompra em caso de inadimplência',
    severidade: 'critico',
    pilares: ['fidc'],
    exemplo: 'Balanço auditado ou contábil dos últimos 3 anos',
    matchPatterns: [/balan[çc]o/i, /balancete/i, /patrimonial/i, /\bbp\b/i],
  },
  {
    id: 'fidc_historico_inadimplencia',
    nome: 'Histórico de Inadimplência da Carteira',
    categoria: 'financeiro',
    descricao: 'Taxa de inadimplência, atrasos e perdas dos últimos 12-24 meses',
    finalidade: 'Dimensiona risco de crédito real da carteira e serve de base para o subordinação mínima',
    severidade: 'critico',
    pilares: ['fidc'],
    exemplo: 'Relatório de inadimplência mensal, Aging da carteira, Default rate histórico',
    dica: 'Mínimo: últimos 12 meses. Ideal: 24 meses para capturar ciclos de inadimplência.',
    matchPatterns: [/inadimpl[eê]ncia/i, /default.{0,8}(rate|histor)/i, /aging/i, /atraso.{0,8}(carteira|portf)/i],
  },
  {
    id: 'fidc_concentracao_sacados',
    nome: 'Mapa de Concentração por Sacado / Devedor',
    categoria: 'financeiro',
    descricao: 'Distribuição da carteira pelos principais devedores',
    finalidade: 'Identifica concentração de risco — FIDC Não Padronizado (NP) exige maior subordinação se concentrado',
    severidade: 'critico',
    pilares: ['fidc'],
    exemplo: 'Planilha com % de cada devedor na carteira, Top 10 sacados, Análise de concentração',
    dica: 'Se um único sacado representa > 15% da carteira, isso exige menção explícita e estrutura de proteção.',
    matchPatterns: [/concentra.{0,6}[aã]o.{0,8}(sacado|devedor|carteira)/i, /sacado.{0,8}(top|principal|map)/i, /devedor.{0,8}(concentra|map)/i],
  },
  {
    id: 'fidc_projecao_originacao',
    nome: 'Projeção de Originação de Recebíveis (12 meses)',
    categoria: 'financeiro',
    descricao: 'Estimativa de volume e prazo dos recebíveis que serão cedidos ao FIDC',
    finalidade: 'Valida viabilidade do FIDC — o fundo precisa de fluxo constante para remunerar os cotistas',
    severidade: 'alto',
    pilares: ['fidc'],
    exemplo: 'Projeção mensal de originação, Pipeline de recebíveis, Forecast de cessões',
    matchPatterns: [/proje.{0,6}[aã]o.{0,8}(originac|cessão|cedido|receb)/i, /originac.{0,6}[aã]o.{0,8}(prevista|estimada)/i],
  },
  {
    id: 'fidc_regulamento',
    nome: 'Regulamento do FIDC (minuta)',
    categoria: 'estrutura',
    descricao: 'Documento que rege o funcionamento do fundo, política de investimento e critérios de elegibilidade',
    finalidade: 'Define o arcabouço legal e operacional do FIDC — necessário para avaliação de compliance CVM 175/22',
    severidade: 'alto',
    pilares: ['fidc'],
    exemplo: 'Minuta do regulamento, Regulamento aprovado pela CVM, Instrução normativa do fundo',
    matchPatterns: [/regulamento.{0,8}(fidc|fundo)/i, /regulamento.{0,8}fund/i, /pol[íi]tica.{0,8}investimento/i],
  },
  {
    id: 'fidc_contrato_cessao',
    nome: 'Contrato de Cessão de Recebíveis (minuta)',
    categoria: 'juridico',
    descricao: 'Instrumento que formaliza a transferência dos recebíveis do cedente para o FIDC',
    finalidade: 'Garante a validade jurídica da cessão e a propriedade dos recebíveis pelo fundo',
    severidade: 'alto',
    pilares: ['fidc'],
    exemplo: 'Minuta do contrato de cessão, Instrumento de cessão fiduciária, Contrato de securitização',
    matchPatterns: [/contrato.{0,8}cess[aã]o/i, /cess[aã]o.{0,8}(receb|crédito|direito)/i, /fidu[cç]i[aá]ria/i],
  },
  {
    id: 'fidc_estrutura_cotas',
    nome: 'Estrutura de Cotas (Sênior / Mezanino / Subordinada)',
    categoria: 'estrutura',
    descricao: 'Percentual e características de cada classe de cota do fundo',
    finalidade: 'Define a proteção dos cotistas sênior e a subordinação mínima exigida pela CVM 175/22',
    severidade: 'alto',
    pilares: ['fidc'],
    exemplo: 'Tabela com % das cotas (ex: Sênior 70% / Sub 30%), Memorando de estruturação',
    dica: 'Para FIDC Padronizado pulverizado: subordinação mínima de 25%. Concentrado: 40%.',
    matchPatterns: [/estrutura.{0,8}cotas/i, /cotas?.{0,8}(s[êe]nior|subordinad|mezanino)/i, /subordina[çc][aã]o/i],
  },
  // Por tipo de lastro — Duplicatas
  {
    id: 'fidc_amostra_duplicatas',
    nome: 'Amostra de Duplicatas / Notas Fiscais',
    categoria: 'tecnico',
    descricao: 'Amostra representativa dos títulos que serão cedidos',
    finalidade: 'Valida a existência e qualidade dos recebíveis; verifica conformidade dos títulos',
    severidade: 'critico',
    pilares: ['fidc'],
    subtipos: ['duplicatas', 'nota_fiscal', 'nota_comercial'],
    exemplo: 'Amostra de 20-50 duplicatas, Notas fiscais de referência, Cópia dos títulos',
    matchPatterns: [/duplicata/i, /nota.{0,8}fiscal/i, /nota.{0,8}comercial/i, /amostra.{0,8}(t[íi]tulo|receb)/i],
  },
  // Por tipo de lastro — Cartão
  {
    id: 'fidc_contrato_adquirente',
    nome: 'Contrato com Adquirente / Bandeira (Cartão)',
    categoria: 'juridico',
    descricao: 'Contrato de credenciamento com a adquirente (Cielo, Rede, Stone etc.)',
    finalidade: 'Confirma o volume de transações e a relação contratual que origina os recebíveis de cartão',
    severidade: 'critico',
    pilares: ['fidc'],
    subtipos: ['cartao', 'cartao_credito'],
    exemplo: 'Contrato com Cielo, Rede, Stone, GetNet; comprovante de credenciamento',
    matchPatterns: [/adquirente/i, /cielo|getnet|stone|rede.{0,5}(contrat|credenc)/i, /contrato.{0,8}(cart[aã]o|bandeira)/i],
  },
  // Por tipo de lastro — Consignado
  {
    id: 'fidc_contrato_consignado',
    nome: 'Contrato de Consignação em Folha',
    categoria: 'juridico',
    descricao: 'Acordo com empregador, INSS ou órgão público para desconto em folha',
    finalidade: 'Comprova o lastro do crédito consignado e a fonte de pagamento direto na folha',
    severidade: 'critico',
    pilares: ['fidc'],
    subtipos: ['consignado'],
    exemplo: 'Convênio com INSS, contrato com prefeitura/estado, convênio com empresa privada',
    matchPatterns: [/consignado/i, /consigna[çc][aã]o/i, /desconto.{0,8}(folha|holerite)/i, /conv[eê]nio.{0,8}(inss|empregador)/i],
  },
]

// ─── CRI / CRA ────────────────────────────────────────────────────────────────

export const DOCS_CRI: ItemChecklist[] = [
  {
    id: 'cri_contrato_imobiliario',
    nome: 'Contrato Imobiliário (Compra-Venda / Locação / Financiamento)',
    categoria: 'juridico',
    descricao: 'Documento que origina o crédito imobiliário a ser securitizado',
    finalidade: 'É o lastro do CRI — sem ele não há crédito para securitizar',
    severidade: 'critico',
    pilares: ['cri_cra'],
    subtipos: ['cri', 'imobiliario'],
    exemplo: 'Escritura de compra e venda, contrato de locação, contrato de financiamento imobiliário',
    matchPatterns: [/contrato.{0,8}(compra|loca[çc][aã]o|financiamento).{0,8}imob/i, /escritura.{0,8}compra/i, /compromisso.{0,8}compra/i],
  },
  {
    id: 'cri_matricula',
    nome: 'Matrícula do Imóvel',
    categoria: 'juridico',
    descricao: 'Registro imobiliário atual no Cartório de Registro de Imóveis',
    finalidade: 'Comprova titularidade, ônus reais e situação jurídica do imóvel que lastreia o CRI',
    severidade: 'critico',
    pilares: ['cri_cra'],
    subtipos: ['cri', 'imobiliario'],
    exemplo: 'Certidão de matrícula atualizada (máx. 30 dias), inteiro teor do imóvel',
    dica: 'Ônus de primeira ordem não impedem — mas devem ser mencionados. Ônus que impedem cessão exigem quitação prévia.',
    matchPatterns: [/matr[íi]cula/i, /registro.{0,8}im[óo]vel/i, /cart[óo]rio/i, /certid[aã]o.{0,8}(imov|matricul)/i],
  },
  {
    id: 'cri_laudo',
    nome: 'Laudo de Avaliação do Imóvel (ABNT NBR 14653)',
    categoria: 'tecnico',
    descricao: 'Avaliação técnica do valor do imóvel por engenheiro ou perito habilitado',
    finalidade: 'Define o valor do colateral — base para o LTV (Loan-to-Value) do CRI',
    severidade: 'critico',
    pilares: ['cri_cra'],
    subtipos: ['cri', 'imobiliario'],
    exemplo: 'Laudo ABNT NBR 14653, avaliação da Caixa, laudo AMC (Avaliador de Máquinas e Equipamentos)',
    dica: 'Data máxima: 12 meses. Laudo desatualizado é registrado como pendência.',
    matchPatterns: [/laudo.{0,8}(avalia[çc][aã]o|imov|nbre?\.?\s*14653)/i, /avalia[çc][aã]o.{0,8}imov/i, /per[íi]cia.{0,8}imov/i],
  },
  {
    id: 'cri_cedente_docs',
    nome: 'Documentação do Cedente (CNPJ, balanços, contrato social)',
    categoria: 'compliance',
    descricao: 'Documentação completa de quem origina os créditos imobiliários',
    finalidade: 'KYC e elegibilidade do cedente — necessário para estruturação da securitização',
    severidade: 'critico',
    pilares: ['cri_cra'],
    subtipos: ['cri', 'imobiliario'],
    exemplo: 'CNPJ, extrato Receita Federal, contrato social, balanços dos últimos 2 anos',
    matchPatterns: [/cedente.{0,8}(cnpj|balan[çc]o|contrato|doc)/i, /documenta[çc][aã]o.{0,8}cedente/i],
  },
  {
    id: 'cri_termo_securitizacao',
    nome: 'Termo de Securitização (minuta)',
    categoria: 'estrutura',
    descricao: 'Instrumento que formaliza a emissão dos CRI e vincula os créditos imobiliários',
    finalidade: 'Documento legal central da securitização — define direitos dos investidores e condições da emissão',
    severidade: 'alto',
    pilares: ['cri_cra'],
    subtipos: ['cri'],
    exemplo: 'Minuta do Termo de Securitização, TS aprovado pela CVM, draft da emissão',
    matchPatterns: [/termo.{0,8}securitiza[çc][aã]o/i, /\bts\b.{0,8}(cri|imob)/i, /securitiza[çc][aã]o.{0,8}(termo|imob)/i],
  },
  {
    id: 'cri_certidoes_imovel',
    nome: 'Certidões de Ônus e Pessoais do Imóvel',
    categoria: 'juridico',
    descricao: 'Certidões negativas de ônus reais, hipotecas e ações pessoais sobre o imóvel',
    finalidade: 'Confirma que não há impedimentos legais à cessão do crédito imobiliário',
    severidade: 'alto',
    pilares: ['cri_cra'],
    subtipos: ['cri'],
    exemplo: 'Certidão negativa de ônus reais (cartório), certidão de ações pessoais e reipersecutórias',
    matchPatterns: [/certid[aã]o.{0,8}([oô]nus|pessoal|reipersecutor)/i, /[oô]nus.{0,8}reais/i],
  },
]

export const DOCS_CRA: ItemChecklist[] = [
  {
    id: 'cra_contrato_agricola',
    nome: 'Contrato Agrícola (Compra / Financiamento / Custódia)',
    categoria: 'juridico',
    descricao: 'Documento que origina o crédito do agronegócio',
    finalidade: 'É o lastro do CRA — define a obrigação do devedor (produtor/cooperativa)',
    severidade: 'critico',
    pilares: ['cri_cra'],
    subtipos: ['cra', 'agricola', 'agro'],
    exemplo: 'Contrato de compra de grão, contrato de financiamento agrícola, contrato de custódia de safra',
    matchPatterns: [/contrato.{0,8}(agr[íi]cola|compra.{0,5}gr[aã]o|financiamento.{0,5}agr)/i, /cpr\b/i, /cédula.{0,8}produto.{0,8}rural/i],
  },
  {
    id: 'cra_cadastro_produtor',
    nome: 'Cadastro do Produtor / Cooperativa',
    categoria: 'compliance',
    descricao: 'Registro e habilitação do devedor junto ao MAPA, OAC ou cooperativa',
    finalidade: 'Valida elegibilidade do devedor para CRA conforme exigência regulatória da CVM',
    severidade: 'critico',
    pilares: ['cri_cra'],
    subtipos: ['cra', 'agricola', 'agro'],
    exemplo: 'Cadastro MAPA (Ministério da Agricultura), certificado OAC, CNPJ da cooperativa',
    matchPatterns: [/cadastro.{0,8}(produtor|mapa|agr[íi]cola|cooperativ)/i, /\bmapa\b.{0,8}(cert|cadastr|reg)/i, /\boac\b/i],
  },
  {
    id: 'cra_calendario_safra',
    nome: 'Calendário de Safra / Ciclo Agrícola',
    categoria: 'tecnico',
    descricao: 'Cronograma de plantio, colheita e comercialização da safra',
    finalidade: 'Essencial para modelar o fluxo de caixa do CRA e a periodicidade de pagamento dos cotistas',
    severidade: 'critico',
    pilares: ['cri_cra'],
    subtipos: ['cra', 'agricola', 'agro'],
    exemplo: 'Calendário agrícola, cronograma de safra, planejamento de colheita',
    matchPatterns: [/calend[aá]rio.{0,8}(safra|agr[íi]cola|colheita)/i, /ciclo.{0,8}agr[íi]cola/i, /safra.{0,8}(cronog|plano|calendário)/i],
  },
  {
    id: 'cra_car',
    nome: 'Cadastro Ambiental Rural (CAR)',
    categoria: 'compliance',
    descricao: 'Registro obrigatório da propriedade rural no Sistema Nacional de Cadastro Ambiental Rural',
    finalidade: 'Confirma regularidade ambiental da propriedade — exigência regulatória do CRA',
    severidade: 'alto',
    pilares: ['cri_cra'],
    subtipos: ['cra', 'agricola', 'agro'],
    exemplo: 'Recibo de inscrição do CAR, comprovante SICAR',
    matchPatterns: [/\bcar\b.{0,8}(imov|rural|propriedade|sicar)/i, /cadastro.{0,8}ambiental.{0,8}rural/i, /sicar/i],
  },
  {
    id: 'cra_seguro_rural',
    nome: 'Apólice de Seguro Rural / Hedge de Commodity',
    categoria: 'tecnico',
    descricao: 'Proteção contra risco climático (PROAGRO/seguro privado) ou risco de preço (NDF, futuros)',
    finalidade: 'Mitiga os principais riscos de um CRA — clima e preço da commodity',
    severidade: 'recomendado',
    pilares: ['cri_cra'],
    subtipos: ['cra', 'agricola', 'agro'],
    exemplo: 'Apólice PROAGRO, apólice de seguro rural privado, contrato de NDF, comprovante de futuros',
    matchPatterns: [/proagro/i, /seguro.{0,8}(rural|agr[íi]col)/i, /\bndf\b/i, /hedge.{0,8}(commodity|gr[aã]o|agro)/i, /futuros.{0,8}(cbot|b3|bmf)/i],
  },
]

// ─── ASSET PREP ───────────────────────────────────────────────────────────────

export const DOCS_ASSET_PREP: ItemChecklist[] = [
  {
    id: 'ap_dre',
    nome: 'DRE ou Demonstrativo Financeiro',
    categoria: 'financeiro',
    descricao: 'Qualquer dado financeiro disponível — auditado, gerencial, parcial ou projetado',
    finalidade: 'Base para o diagnóstico de prontidão financeira e posicionamento no mercado de capitais',
    severidade: 'critico',
    pilares: ['asset_prep'],
    exemplo: 'DRE gerencial, planilha de receitas e despesas, projeção financeira, P&L',
    dica: 'Mesmo que incompleto, envie o que tiver. O diagnóstico se adapta ao nível de informação disponível.',
    matchPatterns: [/\bdre\b/i, /demonstra.{0,6}o.{0,8}result/i, /resultado.{0,8}exerc/i, /p&l|profit.{0,5}loss/i, /financeiro.{0,8}(gerencial|resultado)/i],
  },
  {
    id: 'ap_pitch',
    nome: 'Apresentação do Ativo',
    categoria: 'comercial',
    descricao: 'Qualquer documento que descreva o ativo, negócio ou oportunidade',
    finalidade: 'Permite à IA compreender a natureza e o posicionamento estratégico do ativo para diagnóstico de prontidão',
    severidade: 'alto',
    pilares: ['asset_prep'],
    exemplo: 'Pitch deck, apresentação comercial, one-pager, memorando de estruturação',
    matchPatterns: [/pitch/i, /one.{0,5}pager/i, /apresenta[çc][aã]o.{0,8}(ativo|empresa|negocio)/i, /memorando/i],
  },
  // Asset Prep Imobiliário
  {
    id: 'ap_matricula',
    nome: 'Matrícula do Imóvel',
    categoria: 'juridico',
    descricao: 'Registro imobiliário que comprova titularidade do ativo imobiliário',
    finalidade: 'Necessário para diagnóstico de prontidão imobiliária e avaliação de garantias',
    severidade: 'critico',
    pilares: ['asset_prep'],
    subtipos: ['imobiliario'],
    exemplo: 'Certidão de matrícula atualizada, inteiro teor',
    matchPatterns: [/matr[íi]cula/i, /registro.{0,8}im[óo]vel/i],
  },
  {
    id: 'ap_contratos_locacao',
    nome: 'Contratos de Locação Ativos',
    categoria: 'comercial',
    descricao: 'Contratos dos inquilinos ou arrendatários do imóvel',
    finalidade: 'Comprova geração de renda do ativo imobiliário — base para valuation por cap rate',
    severidade: 'alto',
    pilares: ['asset_prep'],
    subtipos: ['imobiliario'],
    exemplo: 'Contratos de locação comercial / residencial, contratos de arrendamento',
    matchPatterns: [/contrato.{0,8}loca[çc][aã]o/i, /loca[çc][aã]o.{0,8}(comercial|residencial)/i, /arrendamento/i, /inquilino/i],
  },
  // Asset Prep SaaS / Tech
  {
    id: 'ap_mrr_dashboard',
    nome: 'Dashboard MRR / Métricas SaaS',
    categoria: 'financeiro',
    descricao: 'Histórico de MRR, ARR, churn rate e crescimento mensais',
    finalidade: 'Métricas SaaS são o principal driver de valuation para empresas de software',
    severidade: 'critico',
    pilares: ['asset_prep'],
    subtipos: ['saas', 'tech', 'software'],
    exemplo: 'Planilha de MRR mensal, relatório ChartMogul/Stripe, dashboard de KPIs',
    matchPatterns: [/\bmrr\b/i, /\barr\b/i, /churn/i, /saas.{0,8}(metric|dashboard|kpi)/i, /receita.{0,8}recorrente/i],
  },
  {
    id: 'ap_contratos_clientes_saas',
    nome: 'Amostra de Contratos de Clientes',
    categoria: 'comercial',
    descricao: 'Contratos dos principais clientes para evidenciar receita recorrente',
    finalidade: 'Valida a qualidade da receita — contratos de longo prazo aumentam o valor de saída',
    severidade: 'alto',
    pilares: ['asset_prep'],
    subtipos: ['saas', 'tech', 'software'],
    exemplo: 'Top 5 contratos de clientes, MSA (Master Services Agreement), SaaS Agreement',
    matchPatterns: [/contrato.{0,8}clientes/i, /msa\b/i, /saas.{0,8}agreement/i, /clientes.{0,8}(contrato|amostra)/i],
  },
  // Asset Prep Agro
  {
    id: 'ap_historico_safra',
    nome: 'Histórico de Safra (3 anos)',
    categoria: 'financeiro',
    descricao: 'Produção, produtividade e receita das últimas 3 safras',
    finalidade: 'Base para valuation de ativo agrícola e avaliação de capacidade de pagamento',
    severidade: 'critico',
    pilares: ['asset_prep'],
    subtipos: ['agro', 'agricola'],
    exemplo: 'Relatório de produção por safra, nota fiscal de venda da produção, comprovante de entrega',
    matchPatterns: [/hist[óo]rico.{0,8}safra/i, /produ[çc][aã]o.{0,8}(safra|agr[íi]col)/i, /safra.{0,8}(20\d\d|histor)/i],
  },
]

// ─── REGISTRO COMPLETO ────────────────────────────────────────────────────────

export const TODOS_DOCS: ItemChecklist[] = [
  ...DOCS_GERAL,
  ...DOCS_MA,
  ...DOCS_FIDC,
  ...DOCS_CRI,
  ...DOCS_CRA,
  ...DOCS_ASSET_PREP,
]

/**
 * Retorna os documentos relevantes para um pilar e subtipo específicos.
 * Exclui documentos de outro pilar; inclui os de Geral sempre.
 */
export function getChecklistPorPilar(
  pilar: PilarOperacao,
  subtipo?: string
): ItemChecklist[] {
  return TODOS_DOCS.filter(doc => {
    if (!doc.pilares.includes(pilar) && !doc.pilares.includes('geral')) return false
    if (doc.pilares.includes('geral') && pilar !== 'geral') {
      // Documentos gerais só aparecem quando chamados explicitamente ou como fallback
      return false
    }
    if (doc.subtipos && doc.subtipos.length > 0 && subtipo) {
      return doc.subtipos.some(s => subtipo.toLowerCase().includes(s))
    }
    if (doc.subtipos && doc.subtipos.length > 0 && !subtipo) {
      return false // doc restrito a subtipo, mas subtipo não informado
    }
    return true
  })
}

/**
 * Retorna o conjunto canônico de documentos para um pilar,
 * incluindo os gerais + os específicos do pilar (sem filtro por subtipo).
 */
export function getChecklistCompleto(pilar: PilarOperacao): ItemChecklist[] {
  return TODOS_DOCS.filter(doc =>
    doc.pilares.includes(pilar) ||
    (doc.pilares.includes('geral') && !doc.pilares.some(p => p !== 'geral'))
  )
}

/** Agrupa documentos por categoria para exibição no dossiê */
export function agruparPorCategoria(docs: ItemChecklist[]): Record<CategoriaDoc, ItemChecklist[]> {
  const map: Partial<Record<CategoriaDoc, ItemChecklist[]>> = {}
  for (const doc of docs) {
    if (!map[doc.categoria]) map[doc.categoria] = []
    map[doc.categoria]!.push(doc)
  }
  return map as Record<CategoriaDoc, ItemChecklist[]>
}

export const LABEL_CATEGORIA: Record<CategoriaDoc, string> = {
  financeiro:  'Documentação Financeira',
  juridico:    'Documentação Jurídica',
  tecnico:     'Documentação Técnica',
  estrutura:   'Estrutura da Operação',
  compliance:  'Compliance e Regularidade',
  comercial:   'Documentação Comercial',
}

export const LABEL_PILAR: Record<PilarOperacao, string> = {
  ma:         'M&A e Aquisições',
  fidc:       'FIDC / Crédito Estruturado',
  cri_cra:    'CRI / CRA (Securitização)',
  asset_prep: 'Preparação de Ativo para Mercado',
  geral:      'Documentação Geral',
}
