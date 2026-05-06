export interface DealIntake {
  nomeAtivo: string
  tipoAtivo: string
  estagio: string
  objetivo: string
  nivelInformacao: string
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
}
