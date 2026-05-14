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
