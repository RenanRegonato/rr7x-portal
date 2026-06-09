// Máscaras de digitação para o intake (puras, client-safe — sem I/O, sem LLM).
//
// Objetivo: travar o que entra nos campos numéricos enquanto o usuário digita —
// descartar não-dígitos (letra não entra) e limitar o comprimento. A VALIDAÇÃO
// (dígito verificador de CPF/CNPJ) fica no schema Zod; aqui é só apresentação.

const onlyDigits = (s: string): string => s.replace(/\D/g, '')

// CPF (11 díg.) → 000.000.000-00 ; CNPJ (14 díg.) → 00.000.000/0000-00.
// Alterna dinamicamente conforme a quantidade de dígitos: até 11 formata como
// CPF, a partir do 12º vira CNPJ. Trava em 14 dígitos.
export function maskCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    let out = d.slice(0, 3)
    if (d.length > 3) out += '.' + d.slice(3, 6)
    if (d.length > 6) out += '.' + d.slice(6, 9)
    if (d.length > 9) out += '-' + d.slice(9, 11)
    return out
  }
  let out = d.slice(0, 2)
  out += '.' + d.slice(2, 5)
  out += '.' + d.slice(5, 8)
  out += '/' + d.slice(8, 12)
  if (d.length > 12) out += '-' + d.slice(12, 14)
  return out
}

// Telefone BR → (11) 9999-9999 (fixo, 10 díg.) ou (11) 99999-9999 (celular, 11).
// Trava em 11 dígitos.
export function maskTelefone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
