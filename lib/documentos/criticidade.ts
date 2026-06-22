// Heurística leve: o NOME do arquivo sugere um documento essencial à análise?
//
// Usada para PRÉ-SINALIZAR uma falha como "provável crítico" na triagem (a UI
// já marca como relevante por padrão). O usuário SEMPRE tem a palavra final —
// isto não bloqueia nada sozinho, apenas reduz o risco de alguém liberar a
// análise sem perceber que um balanço/DRE/matrícula ficou de fora.

const CRITICOS: { rotulo: string; re: RegExp }[] = [
  { rotulo: 'DRE',              re: /\bdre\b|demonstra.{0,4}result|resultado do exerc/i },
  { rotulo: 'Balanço',          re: /balan(ç|c)o|balancete|patrimonial|\bbp\b/i },
  { rotulo: 'Matrícula',        re: /matr(í|i)cula|registro de im(ó|o)vel|cart(ó|o)rio/i },
  { rotulo: 'Laudo / Avaliação',re: /laudo|avalia(ç|c).{0,4}o|per(í|i)cia/i },
  { rotulo: 'Contrato',         re: /contrato|instrumento particular|escritura/i },
  { rotulo: 'CPR',              re: /\bcpr\b|c(é|e)dula.{0,6}produto.{0,6}rural/i },
  { rotulo: 'POF',              re: /\bpof\b/i },
  { rotulo: 'Fluxo de caixa',   re: /fluxo de caixa|\bdfc\b|cash[ -]?flow/i },
]

export function classificarCriticidade(fileName: string): { provavelCritico: boolean; rotulo: string | null } {
  const nome = fileName ?? ''
  for (const c of CRITICOS) {
    if (c.re.test(nome)) return { provavelCritico: true, rotulo: c.rotulo }
  }
  return { provavelCritico: false, rotulo: null }
}
