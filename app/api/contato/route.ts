import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendContactEmail } from '@/lib/email'

const ContatoSchema = z.object({
  nome:       z.string().trim().min(1, 'Nome obrigatório').max(120),
  email:      z.string().trim().email('Email inválido').max(160),
  escritorio: z.string().trim().max(160).optional().or(z.literal('')),
  assunto:    z.string().trim().max(160).optional().or(z.literal('')),
  mensagem:   z.string().trim().min(1, 'Mensagem obrigatória').max(5000),
  // Honeypot anti-spam: campo oculto que humanos não preenchem.
  website:    z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = ContatoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Honeypot preenchido → provável bot. Finge sucesso e descarta.
  if (parsed.data.website && parsed.data.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  try {
    await sendContactEmail({
      nome:       parsed.data.nome,
      email:      parsed.data.email,
      escritorio: parsed.data.escritorio || undefined,
      assunto:    parsed.data.assunto || undefined,
      mensagem:   parsed.data.mensagem,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const err = e as Error
    console.error('[contato.POST]', err)
    return NextResponse.json({ error: 'Falha ao enviar a mensagem. Tente novamente.' }, { status: 500 })
  }
}
