// Traduz erros do Supabase Auth para mensagens claras em português.
// O Supabase retorna mensagens em inglês (ex.: "User already registered"),
// que não devem vazar para o usuário final. Nunca retorna o texto bruto do erro.

interface SupabaseAuthError {
  message?: string
  code?:    string
  status?:  number
}

export function traduzErroSupabase(error: SupabaseAuthError | null | undefined): string {
  if (!error) return 'Ocorreu um erro. Tente novamente.'
  const msg  = (error.message ?? '').toLowerCase()
  const code = (error.code ?? '').toLowerCase()

  if (code.includes('user_already_exists') || msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already')) {
    return 'Este e-mail já está cadastrado. Faça login ou use "Esqueci minha senha".'
  }
  if (code.includes('weak_password') || (msg.includes('password') && (msg.includes('weak') || msg.includes('at least') || msg.includes('should be')))) {
    return 'Senha muito fraca. Use ao menos 8 caracteres, combinando letras e números.'
  }
  if (code.includes('over_email_send_rate_limit') || code.includes('over_request_rate_limit') || msg.includes('rate limit') || msg.includes('too many')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
  }
  if (code.includes('email_address_invalid') || msg.includes('unable to validate email') || (msg.includes('invalid') && msg.includes('email'))) {
    return 'E-mail inválido. Verifique o endereço e tente novamente.'
  }
  if (code.includes('signup_disabled') || msg.includes('signups not allowed') || msg.includes('signup is disabled')) {
    return 'Os cadastros estão temporariamente indisponíveis. Fale com o suporte.'
  }

  // Fallback: não vaza mensagem em inglês do Supabase.
  return 'Não foi possível concluir o cadastro. Verifique os dados e tente novamente.'
}
