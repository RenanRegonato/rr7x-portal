import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { isAdminViewer } from '@/lib/get-role'

// Cliente Resend lazy — instanciado só no envio, não no carregamento do módulo,
// para o `next build` não quebrar quando RESEND_API_KEY falta (ex.: preview).
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
const FROM     = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

function extractNdaSection(contratosOutput: string): string {
  const ndaMatch = contratosOutput.match(/##?\s*(?:NDA|Acordo de Confidencialidade|Non-Disclosure)[^\n]*([\s\S]+?)(?=^##|\Z)/im)
  if (ndaMatch) return ndaMatch[0].trim()
  // Fallback: primeiros 3000 chars do relatório de contratos
  return contratosOutput.slice(0, 3000)
}

function buildNdaEmail(params: {
  nomeAtivo:   string
  tipoAtivo:   string
  escritorio:  string
  ndaContent:  string
  recipientName: string
}): string {
  const { nomeAtivo, tipoAtivo, escritorio, ndaContent, recipientName } = params

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>NDA — ${nomeAtivo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8FAFC; margin: 0; padding: 40px 20px; color: #0F172A; }
    .container { max-width: 640px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .header { background: #0F172A; padding: 32px 40px; }
    .header-accent { width: 40px; height: 4px; background: #06B6D4; border-radius: 2px; margin-bottom: 16px; }
    .header h1 { color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0; letter-spacing: -0.3px; }
    .header p { color: #94A3B8; font-size: 13px; margin: 6px 0 0; }
    .body { padding: 32px 40px; }
    .greeting { font-size: 15px; color: #0F172A; margin-bottom: 20px; }
    .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .info-row { display: flex; gap: 12px; margin-bottom: 8px; font-size: 13px; }
    .info-label { color: #64748B; min-width: 80px; font-weight: 500; }
    .info-value { color: #0F172A; }
    .nda-section { background: #F1F5F9; border-left: 3px solid #06B6D4; border-radius: 0 8px 8px 0; padding: 20px; margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.7; white-space: pre-wrap; max-height: 400px; overflow: hidden; }
    .cta { margin: 24px 0; }
    .cta p { font-size: 14px; color: #334155; margin-bottom: 12px; }
    .disclaimer { font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 24px; line-height: 1.6; }
    .footer { background: #F8FAFC; padding: 16px 40px; font-size: 11px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-accent"></div>
      <h1>${escritorio}</h1>
      <p>Acordo de Confidencialidade — ${nomeAtivo}</p>
    </div>
    <div class="body">
      <p class="greeting">Prezado(a) <strong>${recipientName}</strong>,</p>
      <p style="font-size:14px;color:#334155;line-height:1.7;margin-bottom:20px;">
        Conforme alinhado, segue o Acordo de Confidencialidade (NDA) referente à oportunidade <strong>${nomeAtivo}</strong>
        ${tipoAtivo ? `(${tipoAtivo})` : ''}.
        Solicitamos a revisão e assinatura do documento para prosseguimento da análise.
      </p>

      <div class="info-box">
        <div class="info-row"><span class="info-label">Ativo</span><span class="info-value">${nomeAtivo}</span></div>
        ${tipoAtivo ? `<div class="info-row"><span class="info-label">Tipo</span><span class="info-value">${tipoAtivo}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Assessoria</span><span class="info-value">${escritorio}</span></div>
        <div class="info-row"><span class="info-label">Classificação</span><span class="info-value">CONFIDENCIAL — Uso Restrito</span></div>
      </div>

      <p style="font-size:13px;font-weight:600;color:#0F172A;margin-bottom:8px;">Termos do NDA</p>
      <div class="nda-section">${ndaContent.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/#{1,4}\s+(.+)/g, '<strong>$1</strong>')}</div>

      <div class="cta">
        <p>Para confirmar o recebimento e aceite, responda este email ou entre em contato diretamente com a assessoria.</p>
      </div>

      <div class="disclaimer">
        Este email e seus anexos são destinados exclusivamente ao(s) destinatário(s) identificado(s) acima.
        As informações contidas neste email são confidenciais e protegidas por lei. Se você recebeu este email por engano,
        por favor notifique o remetente imediatamente e apague todas as cópias.
        Elaborado em conformidade com o Código ANBIMA para Atividades de Fusões e Aquisições.
      </div>
    </div>
    <div class="footer">
      ${escritorio} · CONFIDENCIAL — USO RESTRITO · Distribuição restrita a Investidores Profissionais (ICVM 554/2014)
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { analiseId, recipientEmail, recipientName } = await req.json()
  if (!analiseId || !recipientEmail) {
    return NextResponse.json({ error: 'analiseId e recipientEmail obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: analise } = await admin
    .from('analises')
    .select('nome_ativo, deal_intake, outputs, user_id')
    .eq('id', analiseId)
    .single()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && !(await isAdminViewer(user.id))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const intake   = (analise.deal_intake ?? {}) as Record<string, string>
  const outputs  = (analise.outputs    ?? {}) as Record<string, string>

  const contratosOutput = outputs['contratos'] ?? ''
  if (!contratosOutput) {
    return NextResponse.json({ error: 'Análise contratual (Clara Cláusula) ainda não foi gerada' }, { status: 400 })
  }

  const { data: escritorioData } = await admin
    .from('perfis')
    .select('escritorio_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let escritorioNome = 'Assessoria Confidencial'
  let escritorioEmail: string | undefined

  if (escritorioData?.escritorio_id) {
    const { data: esc } = await admin
      .from('escritorios')
      .select('nome, email_contato')
      .eq('id', escritorioData.escritorio_id)
      .single()
    if (esc?.nome) escritorioNome = esc.nome
    if (esc?.email_contato) escritorioEmail = esc.email_contato
  }

  const ndaContent = extractNdaSection(contratosOutput)
  const htmlBody   = buildNdaEmail({
    nomeAtivo:     analise.nome_ativo ?? 'Ativo',
    tipoAtivo:     intake.tipoAtivo ?? '',
    escritorio:    escritorioNome,
    ndaContent,
    recipientName: recipientName ?? recipientEmail.split('@')[0],
  })

  const { data: emailData, error: emailError } = await getResend().emails.send({
    from:    FROM,
    to:      [recipientEmail],
    replyTo: escritorioEmail ? [escritorioEmail] : undefined,
    subject: `NDA — ${analise.nome_ativo ?? 'Oportunidade Confidencial'} | ${escritorioNome}`,
    html:    htmlBody,
  })

  if (emailError) {
    console.error('[nda-email] Resend error:', emailError)
    return NextResponse.json({ error: emailError.message }, { status: 500 })
  }

  // Registrar envio no pipeline de eventos
  try {
    await admin.from('deal_pipeline_events').insert({
      analise_id: analiseId,
      user_id:    user.id,
      user_email: user.email,
      tipo:       'comment',
      comentario: `NDA enviado para ${recipientEmail} via email`,
    })
  } catch { /* silencia erros de log */ }

  return NextResponse.json({ ok: true, emailId: emailData?.id })
}
