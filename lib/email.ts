import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const ADMIN  = 'gestor@renanregonato.com.br'

export async function sendCompletionEmail(params: {
  to:          string
  nomeAtivo:   string
  analiseId:   string
  baseUrl:     string
}) {
  const url = `${params.baseUrl}/dashboard/analise/${params.analiseId}`
  await resend.emails.send({
    from:    FROM,
    to:      params.to,
    subject: `✅ Análise concluída — ${params.nomeAtivo}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1208">
        <h2 style="font-size:20px;margin-bottom:8px">Análise concluída</h2>
        <p style="color:#5a4e42;line-height:1.6">
          O pipeline Deal Intelligence para <strong>${params.nomeAtivo}</strong> foi concluído com sucesso.
          Todos os especialistas entregaram seus relatórios.
        </p>
        <a href="${url}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#c04a2a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Ver análise completa →
        </a>
        <p style="margin-top:32px;font-size:11px;color:#8a7a68">RR7x Capital Hub · Deal Intelligence</p>
      </div>
    `,
  })
}

export async function sendIngestionCompleteEmail(params: {
  to:           string
  nomeAtivo:    string
  analiseId:    string
  totalDocs:    number
  totalFacts:   number
  baseUrl:      string
}) {
  const url = `${params.baseUrl}/dashboard/analise/${params.analiseId}`
  // Resend SDK retorna { data, error } sem throw. Checamos manualmente e propagamos
  // o erro pra cima pra que o caller possa lidar (logging, retry, etc).
  const result = await resend.emails.send({
    from:    FROM,
    to:      params.to,
    subject: `📄 Documentos processados — ${params.nomeAtivo}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1208">
        <h2 style="font-size:20px;margin-bottom:8px">Ingestão de documentos concluída</h2>
        <p style="color:#5a4e42;line-height:1.6">
          Os <strong>${params.totalDocs} documento${params.totalDocs === 1 ? '' : 's'}</strong> da análise <strong>${params.nomeAtivo}</strong> foram lidos integralmente e processados.
          O sistema extraiu <strong>${params.totalFacts} fato${params.totalFacts === 1 ? '' : 's'} estruturado${params.totalFacts === 1 ? '' : 's'}</strong>.
        </p>
        <p style="color:#5a4e42;line-height:1.6">
          Agora você já pode iniciar o pipeline de análise dos especialistas.
        </p>
        <a href="${url}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#c04a2a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Iniciar análise →
        </a>
        <p style="margin-top:32px;font-size:11px;color:#8a7a68">RR7x Capital Hub · Deal Intelligence</p>
      </div>
    `,
  })
  if (result.error) {
    throw new Error(`Resend API: ${result.error.name} — ${result.error.message}`)
  }
}

export async function sendDealMatchesEmail(params: {
  to:            string
  nomeAtivo:     string
  teseId:        string
  totalMatches:  number
  autoAprovados: number
  baseUrl:       string
}) {
  const url = `${params.baseUrl}/dashboard/invest-match/teses/${params.teseId}`
  const plural = params.totalMatches === 1 ? 'match' : 'matches'
  const autoLine = params.autoAprovados > 0
    ? `<p style="color:#5a4e42;line-height:1.6"><strong>${params.autoAprovados}</strong> ${params.autoAprovados === 1 ? 'foi classificado' : 'foram classificados'} como aderência alta (score ≥ 85).</p>`
    : ''

  const result = await resend.emails.send({
    from:    FROM,
    to:      params.to,
    subject: `🤝 ${params.totalMatches} ${plural} para ${params.nomeAtivo}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1208">
        <div style="height:3px;background:linear-gradient(90deg,#36b0d5,#4b4de4);border-radius:3px;margin-bottom:24px"></div>
        <h2 style="font-size:20px;margin-bottom:8px">Novos matches identificados</h2>
        <p style="color:#5a4e42;line-height:1.6">
          O motor do Invest Match cruzou a tese de <strong>${escapeHtml(params.nomeAtivo)}</strong>
          com a base de investidores e encontrou <strong>${params.totalMatches}</strong> ${plural} qualificado${params.totalMatches === 1 ? '' : 's'}.
        </p>
        ${autoLine}
        <a href="${url}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#4b4de4;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Revisar matches →
        </a>
        <p style="margin-top:32px;font-size:11px;color:#8a7a68">RR7x Capital · Invest Match</p>
      </div>
    `,
  })
  if (result.error) {
    throw new Error(`Resend API: ${result.error.name} — ${result.error.message}`)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendErrorNotification(params: {
  nomeAtivo:  string
  analiseId:  string
  baseUrl:    string
}) {
  const url = `${params.baseUrl}/dashboard/analise/${params.analiseId}`
  await resend.emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `⚠️ Erro no pipeline — ${params.nomeAtivo}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1208">
        <h2 style="font-size:20px;margin-bottom:8px">Pipeline interrompido</h2>
        <p style="color:#5a4e42;line-height:1.6">
          O pipeline para <strong>${params.nomeAtivo}</strong> (ID: <code>${params.analiseId}</code>)
          encontrou um erro e foi interrompido.
        </p>
        <a href="${url}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#c04a2a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Ver análise →
        </a>
        <p style="margin-top:32px;font-size:11px;color:#8a7a68">RR7x Capital Hub · Deal Intelligence</p>
      </div>
    `,
  })
}
