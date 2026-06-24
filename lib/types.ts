export interface DealIntake {
  nomeAtivo: string
  tipoAtivo: string
  estagio: string
  objetivo: string
  // Opt-in do módulo premium Adequação à Reforma Tributária (Ferrante):
  // 'na' = não incluir; 'possui' = empresa já adequada; 'diagnosticar' = rodar Ferrante.
  reformaTributaria?: 'na' | 'possui' | 'diagnosticar'
  nivelInformacao: string
  operacaoEmAndamento?: string  // 'sim' | 'nao' — sinaliza projeto pré-operacional (early-stage)
  receitaCaixa?: string
  passivos?: string
  localizacao: string
  ticketEstimado: string
  informacoesAdicionais?: string
  resumoAtivo?: string
  linkDocumentos?: string
  // Estrutura de crédito — preenchidos só em deals de crédito estruturado
  // (FIDC / Securitização / Portfólio de Crédito). Alimentam o vocabulário dos
  // agentes de crédito (estruturação, KYC) com cedente, lastro e estrutura de cotas.
  cedente?: string
  tipoRecebivel?: string
  // Classificação do recebível conforme risco e exigibilidade (ANBIMA/CVM):
  // 'performado' = serviço/venda já ocorreu; 'a_performar' = ainda vai ocorrer;
  // 'vencido_nao_pago' = inadimplente (FIDC Não Padronizado — exige investidor profissional).
  statusRecebivel?: 'performado' | 'a_performar' | 'vencido_nao_pago' | ''
  // Estrutura cedente × sacado define onde reside o risco de crédito e como analisar.
  estruturaCedenteSacado?: 'monocedente_multisacados' | 'multicedentes_monosacado' | 'multicedentes_multisacados' | ''
  // Cedente investindo nas cotas subordinadas = alinhamento de interesses (boa prática).
  // Ausência é yellow flag para o agente de KYC.
  cedenteCotistaSubordinado?: 'sim' | 'nao' | 'nao_definido' | ''
  // Tipo de oferta define número máximo de investidores e requisitos de rating/prospecto.
  // ICVM 476: máx 75 investidores profissionais, sem prospecto/rating obrigatório.
  tipoOferta?: 'icvm_400' | 'icvm_476' | 'nao_definido' | ''
  estruturaCotas?: string
  serieEmissao?: string
  // Classificação ANBIMA — CRI (Certificados de Recebíveis Imobiliários)
  categoriaCri?: 'residencial' | 'corporativo' | 'hibrido' | ''
  concentracaoCri?: 'pulverizado' | 'concentrado' | ''
  segmentoImobiliario?: 'apartamento' | 'loteamento' | 'industrial' | 'logistico' | 'comercial' | 'shopping' | 'infraestrutura' | 'hotel' | 'outro' | ''
  // Classificação ANBIMA — CRA (Certificados de Recebíveis do Agronegócio)
  atividadeDevedor?: 'cooperativa' | 'produtor_rural' | 'terceiro_fornecedor' | 'terceiro_comprador' | ''
  revolvencia?: 'com_revolvencia' | 'sem_revolvencia' | ''
  segmentoAgro?: 'graos' | 'usina' | 'logistica' | 'hibrido' | 'outro' | ''
  // Proprietário
  nomeProprietario?: string
  cpfCnpjProprietario?: string
  telefoneProprietario?: string
  emailProprietario?: string
  obsProprietario?: string
  // Mandato
  assessorNome?: string
  assessorTelefone?: string
  assessorEmail?: string
  parceiroNome?: string
  parceiroTelefone?: string
  parceiroEmail?: string
  obsMandato?: string
  // Asset Preparation — diagnóstico de prontidão para captação
  assetPrepTipoAtivo?: 'imobiliario' | 'saas' | 'recebivel' | 'agro' | 'industrial' | 'infraestrutura' | 'outro' | ''
  assetPrepReceitaAnual?: string  // em milhões de BRL
  assetPrepEbitda?: string         // em milhões de BRL
  assetPrepPatrimonioLiquido?: string  // em milhões de BRL
  assetPrepAlavancagem?: string    // múltiplo (ex: "1.5x")
  assetPrepPosicaoMercado?: 'lider' | 'consolidada' | 'emergente' | 'startup' | ''
  assetPrepAtratividade?: 'alta' | 'media' | 'baixa' | ''
  assetPrepMaturidade?: 'pre_operacional' | 'ramp_up' | 'maduro' | 'estavel' | ''
  assetPrepTemGovernanca?: 'sim' | 'nao' | 'nao_definido' | ''
  assetPrepTemBoard?: 'sim' | 'nao' | 'nao_definido' | ''
  assetPrepHistoricoAnosOperacao?: string  // número de anos
  assetPrepObjetivoCapitacao?: 'crescimento' | 'refinanciamento' | 'aquisicao' | 'estruturacao' | 'outro' | ''
  assetPrepVolumeCapitacao?: string  // em milhões de BRL
  assetPrepHorizonteCapitacao?: 'imediato' | '3_meses' | '6_meses' | '12_meses' | ''
}

export interface PipelineOutputs {
  orchestration?: string
  pesquisa?: string
  diagnostico?: string
  analise_ma?: string
  contratos?: string
  originacao?: string
  estruturacao?: string
  maturidade?: string
  revisao?: string
  blind_teaser?: string
  sell_side_pitchbook?: string
  reforma_tributaria?: string
  asset_prep?: string
}
