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
}
