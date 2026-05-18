import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Mandor",
  description:
    "Saiba como a Mandor coleta, usa e protege seus dados pessoais e corporativos em conformidade com a LGPD.",
  alternates: { canonical: "/privacidade" },
};

const LAST_UPDATED = "14 de maio de 2026";
const CONTACT_EMAIL = "mandor@rr7x.com.br";

export default function PrivacidadePage() {
  return (
    <div className="bg-lp-canvas text-lp-ink font-sans antialiased min-h-screen">
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b border-lp-border"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      >
        <nav className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden sm:block text-[13px] text-lp-ink-2 hover:text-lp-ink px-4 py-2 transition-colors">
              Entrar
            </Link>
            <Link href="/auth/signup" className="text-[13px] font-medium text-white px-4 py-2 rounded-[9px] hover:opacity-90" style={{ background: "#1655E8" }}>
              Solicitar acesso
            </Link>
          </div>
        </nav>
      </header>

      {/* Header */}
      <section className="border-b border-lp-border bg-lp-fog">
        <div className="max-w-[800px] mx-auto px-6 py-14 lg:py-20">
          <p className="text-[11.5px] font-medium text-lp-accent uppercase tracking-widest mb-4">Legal</p>
          <h1 className="font-display text-[40px] sm:text-[52px] leading-[1.1] tracking-tight text-lp-ink mb-4">
            Política de Privacidade
          </h1>
          <p className="text-[14px] text-lp-ink-3">Última atualização: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-[800px] mx-auto px-6 py-14 lg:py-20">
        <div className="prose-mandor space-y-12">

          <section>
            <p className="text-[15px] text-lp-ink-2 leading-relaxed">
              A <strong>Mandor</strong>, operada pela <strong>RR7x Capital Hub</strong>, tem o compromisso de proteger
              a privacidade e a confidencialidade dos dados de seus usuários. Esta Política descreve quais dados
              coletamos, como os utilizamos e quais são os seus direitos conforme a Lei Geral de Proteção de Dados
              (LGPD — Lei nº 13.709/2018) e demais normas aplicáveis.
            </p>
          </section>

          <Section num="1" title="Quem somos">
            <p>
              <strong>Controlador de dados:</strong> RR7x Capital Hub, com email de contato{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-lp-accent hover:underline">{CONTACT_EMAIL}</a>.
              A plataforma Mandor presta serviços de deal intelligence para escritórios de M&amp;A e crédito estruturado.
            </p>
          </Section>

          <Section num="2" title="Dados que coletamos">
            <Subsection title="2.1 Dados fornecidos diretamente por você">
              <ul>
                <li><strong>Cadastro:</strong> nome completo, email profissional, nome do escritório e cargo.</li>
                <li><strong>Análise de deals:</strong> documentos financeiros e societários enviados para processamento (DRE, balanços, contratos, etc.).</li>
                <li><strong>Comunicação:</strong> conteúdo de mensagens enviadas ao nosso suporte.</li>
                <li><strong>Pagamento:</strong> dados de cobrança processados diretamente pelo gateway de pagamento; não armazenamos dados de cartão.</li>
              </ul>
            </Subsection>
            <Subsection title="2.2 Dados coletados automaticamente">
              <ul>
                <li>Endereço IP, tipo de navegador e sistema operacional.</li>
                <li>Páginas acessadas, tempo de sessão e ações na plataforma (logs de auditoria).</li>
                <li>Cookies de sessão e preferências (detalhes na seção 8).</li>
              </ul>
            </Subsection>
            <Subsection title="2.3 Dados que não coletamos">
              <p>
                Não coletamos dados sensíveis (como origem racial, religião, biometria ou dados de saúde).
                Não compartilhamos dados com plataformas de publicidade ou analytics de terceiros.
              </p>
            </Subsection>
          </Section>

          <Section num="3" title="Para que usamos seus dados">
            <table className="w-full text-[13.5px] border-collapse">
              <thead>
                <tr className="border-b border-lp-border">
                  <th className="text-left py-2 pr-4 font-semibold text-lp-ink">Finalidade</th>
                  <th className="text-left py-2 font-semibold text-lp-ink">Base legal (LGPD)</th>
                </tr>
              </thead>
              <tbody className="text-lp-ink-2">
                {[
                  ["Prestação do serviço de análise de deals", "Execução de contrato (Art. 7º, V)"],
                  ["Autenticação e controle de acesso", "Legítimo interesse (Art. 7º, IX)"],
                  ["Comunicações sobre a conta e atualizações do produto", "Execução de contrato / Legítimo interesse"],
                  ["Segurança, prevenção de fraudes e auditoria", "Legítimo interesse (Art. 7º, IX)"],
                  ["Cumprimento de obrigações legais e fiscais", "Obrigação legal (Art. 7º, II)"],
                  ["Melhoria do produto (dados anonimizados e agregados)", "Legítimo interesse (Art. 7º, IX)"],
                  ["Marketing e novidades (com opt-out disponível)", "Consentimento (Art. 7º, I)"],
                ].map(([fin, base]) => (
                  <tr key={fin} className="border-b border-lp-border/50">
                    <td className="py-2 pr-4">{fin}</td>
                    <td className="py-2">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section num="4" title="Compartilhamento de dados">
            <p>
              Não vendemos, alugamos ou comercializamos seus dados pessoais. Podemos compartilhá-los apenas nas
              seguintes situações:
            </p>
            <ul>
              <li><strong>Fornecedores de infraestrutura:</strong> Supabase (banco de dados e autenticação), Vercel (hospedagem) e Anthropic/OpenAI (processamento de IA) — todos sujeitos a contratos de processamento de dados e obrigações de confidencialidade.</li>
              <li><strong>Gateway de pagamento:</strong> processamento seguro de cobranças, sem acesso a dados de deal.</li>
              <li><strong>Obrigação legal:</strong> quando exigido por lei, regulação ou ordem judicial.</li>
              <li><strong>Proteção de direitos:</strong> para prevenir fraudes ou proteger a segurança da plataforma.</li>
            </ul>
            <p>
              Os documentos enviados para análise (DRE, contratos, etc.) são processados exclusivamente para geração
              do relatório do seu escritório e <strong>nunca são utilizados para treinar modelos de IA</strong> nem
              compartilhados com outros usuários da plataforma.
            </p>
          </Section>

          <Section num="5" title="Segurança dos dados">
            <p>Adotamos as seguintes medidas técnicas e organizacionais:</p>
            <ul>
              <li><strong>Isolamento por escritório:</strong> cada conta opera em ambiente isolado via Row Level Security (RLS). Nenhum outro usuário tem acesso aos seus dados.</li>
              <li><strong>Criptografia em repouso e em trânsito:</strong> todos os dados são criptografados no armazenamento e transmitidos via TLS 1.3.</li>
              <li><strong>Autenticação segura:</strong> suporte a autenticação em dois fatores (2FA), tokens JWT com expiração e bloqueio automático de tentativas suspeitas.</li>
              <li><strong>Controle de acesso:</strong> permissões granulares por usuário — cada membro da equipe acessa apenas o que precisa.</li>
              <li><strong>Logs de auditoria:</strong> registro completo de acessos e ações para rastreabilidade.</li>
              <li><strong>Backups regulares:</strong> cópias de segurança automatizadas com retenção configurável.</li>
            </ul>
          </Section>

          <Section num="6" title="Retenção de dados">
            <p>
              Mantemos seus dados pelo período necessário para a prestação do serviço e cumprimento de obrigações
              legais. Especificamente:
            </p>
            <ul>
              <li><strong>Conta ativa:</strong> dados mantidos enquanto a conta estiver ativa.</li>
              <li><strong>Após encerramento:</strong> dados operacionais excluídos em até 90 dias; registros fiscais e contábeis retidos pelo prazo legal (5 anos).</li>
              <li><strong>Documentos de análise:</strong> arquivos enviados podem ser excluídos a qualquer momento pelo titular da conta.</li>
            </ul>
          </Section>

          <Section num="7" title="Seus direitos (LGPD)">
            <p>Conforme a Lei nº 13.709/2018, você tem direito a:</p>
            <ul>
              <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e obter cópia deles.</li>
              <li><strong>Correção:</strong> solicitar atualização de dados incompletos, inexatos ou desatualizados.</li>
              <li><strong>Eliminação:</strong> pedir a exclusão dos dados tratados com base em consentimento.</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado e legível por máquina.</li>
              <li><strong>Revogação de consentimento:</strong> retirar o consentimento dado a qualquer momento.</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento baseado em legítimo interesse.</li>
              <li><strong>Informação:</strong> saber com quem compartilhamos seus dados.</li>
            </ul>
            <p>
              Para exercer qualquer desses direitos, entre em contato pelo email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-lp-accent hover:underline">{CONTACT_EMAIL}</a>.
              Respondemos em até 15 dias úteis.
            </p>
          </Section>

          <Section num="8" title="Cookies">
            <p>Utilizamos cookies estritamente necessários para:</p>
            <ul>
              <li>Manter sua sessão autenticada (cookie de sessão Supabase).</li>
              <li>Lembrar preferências de interface.</li>
              <li>Garantir a segurança da conta (tokens CSRF).</li>
            </ul>
            <p>
              Não utilizamos cookies de rastreamento publicitário, pixels de terceiros (como Meta Pixel ou Google
              Analytics) nem ferramentas de heatmap. Você pode desativar cookies nas configurações do navegador,
              mas isso pode afetar o funcionamento da plataforma.
            </p>
          </Section>

          <Section num="9" title="Transferência internacional de dados">
            <p>
              Alguns de nossos fornecedores de infraestrutura (Vercel, Supabase, Anthropic) são baseados nos
              Estados Unidos. Essas transferências ocorrem com base em cláusulas contratuais padrão e mecanismos
              equivalentes que garantem nível adequado de proteção, em conformidade com o Art. 33 da LGPD.
            </p>
          </Section>

          <Section num="10" title="Menores de idade">
            <p>
              A plataforma Mandor é destinada exclusivamente a profissionais e empresas. Não coletamos
              conscientemente dados de menores de 18 anos. Se identificarmos tal situação, excluiremos os dados
              imediatamente.
            </p>
          </Section>

          <Section num="11" title="Alterações nesta política">
            <p>
              Podemos atualizar esta Política periodicamente. Quando houver alterações materiais, notificaremos
              por email ou por aviso em destaque na plataforma. O uso continuado após a notificação constitui
              aceitação das alterações.
            </p>
          </Section>

          <Section num="12" title="Contato e Encarregado de Dados (DPO)">
            <p>
              Para dúvidas, solicitações ou reclamações relacionadas a esta Política ou ao tratamento dos seus dados:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href={`mailto:${CONTACT_EMAIL}`} className="text-lp-accent hover:underline">{CONTACT_EMAIL}</a></li>
              <li><strong>Plataforma:</strong> <Link href="/contato" className="text-lp-accent hover:underline">mandor.com.br/contato</Link></li>
            </ul>
            <p>
              Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) em{" "}
              <span className="text-lp-ink-2">gov.br/anpd</span>.
            </p>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-lp-border mt-4">
        <div className="max-w-[800px] mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/">
            <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity" />
          </Link>
          <div className="flex items-center gap-6 text-[12px] text-lp-ink-3">
            <Link href="/privacidade" className="hover:text-lp-ink transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-lp-ink transition-colors">Termos de Uso</Link>
            <Link href="/contato" className="hover:text-lp-ink transition-colors">Contato</Link>
          </div>
          <p className="text-[12px] text-lp-ink-3">© {new Date().getFullYear()} RR7x Capital Hub</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[22px] font-medium tracking-tight text-lp-ink mb-4 pb-3 border-b border-lp-border">
        <span className="text-lp-ink-3 font-mono text-[15px] mr-2">{num}.</span>
        {title}
      </h2>
      <div className="space-y-3 text-[14.5px] text-lp-ink-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-lp-ink [&_p+p]:mt-3">
        {children}
      </div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-lp-ink mb-2">{title}</h3>
      <div className="text-[14px] text-lp-ink-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
