import { Resend } from 'resend'
import { IS_HOMOLOG } from './env'

// Cliente Resend instanciado de forma lazy: criado só na primeira vez que um
// e-mail é enviado, nunca no carregamento do módulo. Evita que o `next build`
// quebre quando RESEND_API_KEY não está presente no ambiente (ex.: preview).
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// Ponto único de envio. Em HOMOLOGAÇÃO, todo e-mail é redirecionado para a caixa
// do ADMIN (nunca para o destinatário real), preservando o fluxo de teste sem
// risco de tocar um cliente. O assunto carrega o destinatário original.
type SendPayload = Parameters<ReturnType<typeof getResend>['emails']['send']>[0]
async function sendMail(payload: SendPayload) {
  if (IS_HOMOLOG) {
    const orig = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to
    payload = { ...payload, to: ADMIN, subject: `[HOMOLOG → ${orig}] ${payload.subject ?? ''}` }
  }
  return getResend().emails.send(payload)
}
// Fallback é um remetente de domínio VERIFICADO no Resend (mandor.com.br), não o
// sandbox 'onboarding@resend.dev', que só entrega para o dono da conta. Assim os
// e-mails do app chegam em clientes mesmo se RESEND_FROM_EMAIL não estiver setada.
const FROM   = process.env.RESEND_FROM_EMAIL || 'Mandor <noreply@mandor.com.br>'
const ADMIN  = 'contato@mandor.com.br'
// Caixa comercial que recebe contatos do site e avisos de novos cadastros.
const NOTIFY = 'contato@mandor.com.br'

export async function sendCompletionEmail(params: {
  to:          string
  nomeAtivo:   string
  analiseId:   string
  baseUrl:     string
}) {
  const url = `${params.baseUrl}/dashboard/analise/${params.analiseId}`
  await sendMail({
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
  const result = await sendMail({
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

  const result = await sendMail({
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

// Mensagem do formulário de contato do site → caixa comercial.
export async function sendContactEmail(params: {
  nome:       string
  email:      string
  escritorio?: string
  assunto?:   string
  mensagem:   string
}) {
  const assunto = params.assunto?.trim() || 'Contato via site — Mandor'
  const result = await sendMail({
    from:    FROM,
    to:      NOTIFY,
    replyTo: params.email,
    subject: `📨 Contato site: ${assunto}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0A0F20">
        <div style="height:3px;background:#1655E8;border-radius:3px;margin-bottom:24px"></div>
        <h2 style="font-size:20px;margin-bottom:16px">Nova mensagem pelo site</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374A6E">
          <tr><td style="padding:6px 0;width:120px;color:#6E82A8">Nome</td><td style="padding:6px 0"><strong>${escapeHtml(params.nome)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6E82A8">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(params.email)}" style="color:#1655E8">${escapeHtml(params.email)}</a></td></tr>
          ${params.escritorio ? `<tr><td style="padding:6px 0;color:#6E82A8">Escritório</td><td style="padding:6px 0">${escapeHtml(params.escritorio)}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#6E82A8">Assunto</td><td style="padding:6px 0">${escapeHtml(assunto)}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#F5F8FC;border-radius:10px;white-space:pre-wrap;line-height:1.6;color:#0A0F20">${escapeHtml(params.mensagem)}</div>
        <p style="margin-top:24px;font-size:12px;color:#6E82A8">Responda este e-mail para falar diretamente com ${escapeHtml(params.nome)}.</p>
        <p style="margin-top:8px;font-size:11px;color:#9AAAC5">Mandor · RR7x Capital Hub</p>
      </div>
    `,
  })
  if (result.error) {
    throw new Error(`Resend API: ${result.error.name} — ${result.error.message}`)
  }
}

// Aviso de novo cadastro (escritório self-signup ou gestor) → caixa comercial.
export async function sendNewSignupNotification(params: {
  tipo:           'escritorio' | 'gestor'
  email:          string
  nome?:          string | null
  escritorioNome?: string | null
  role:           string
  baseUrl:        string
}) {
  const titulo = params.tipo === 'escritorio'
    ? 'Novo escritório cadastrado'
    : 'Novo gestor cadastrado'
  const result = await sendMail({
    from:    FROM,
    to:      NOTIFY,
    replyTo: params.email,
    subject: `🆕 ${titulo} — Mandor`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0A0F20">
        <div style="height:3px;background:#1655E8;border-radius:3px;margin-bottom:24px"></div>
        <h2 style="font-size:20px;margin-bottom:16px">${titulo}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374A6E">
          ${params.nome ? `<tr><td style="padding:6px 0;width:120px;color:#6E82A8">Nome</td><td style="padding:6px 0"><strong>${escapeHtml(params.nome)}</strong></td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#6E82A8">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(params.email)}" style="color:#1655E8">${escapeHtml(params.email)}</a></td></tr>
          ${params.escritorioNome ? `<tr><td style="padding:6px 0;color:#6E82A8">Escritório</td><td style="padding:6px 0">${escapeHtml(params.escritorioNome)}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#6E82A8">Perfil</td><td style="padding:6px 0">${escapeHtml(params.role)}</td></tr>
        </table>
        <a href="${params.baseUrl}/dashboard/admin/escritorios" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#1655E8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Ver no painel →
        </a>
        <p style="margin-top:24px;font-size:12px;color:#6E82A8">Responda este e-mail para falar diretamente com o novo usuário.</p>
        <p style="margin-top:8px;font-size:11px;color:#9AAAC5">Mandor · RR7x Capital Hub</p>
      </div>
    `,
  })
  if (result.error) {
    throw new Error(`Resend API: ${result.error.name} — ${result.error.message}`)
  }
}

export async function sendErrorNotification(params: {
  nomeAtivo:  string
  analiseId:  string
  baseUrl:    string
}) {
  const url = `${params.baseUrl}/dashboard/analise/${params.analiseId}`
  await sendMail({
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
