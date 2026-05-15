import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso | Mandor",
  description:
    "Termos e condições de uso da plataforma Mandor — deal intelligence para M&A e crédito estruturado.",
  alternates: { canonical: "/termos" },
};

const LAST_UPDATED = "14 de maio de 2026";
const CONTACT_EMAIL = "gestor@renanregonato.com.br";

export default function TermosPage() {
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
            Termos de Uso
          </h1>
          <p className="text-[14px] text-lp-ink-3">Última atualização: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-[800px] mx-auto px-6 py-14 lg:py-20">
        <div className="space-y-12">

          <section>
            <p className="text-[15px] text-lp-ink-2 leading-relaxed">
              Estes Termos de Uso regulam o acesso e a utilização da plataforma <strong>Mandor</strong>, operada
              pela <strong>RR7x Capital Hub</strong>. Ao acessar ou utilizar a plataforma, você concorda com estes
              Termos em sua totalidade. Se não concordar, não utilize o serviço.
            </p>
          </section>

          <T num="1" title="Aceitação dos termos">
            <p>
              O uso da plataforma Mandor constitui aceitação integral e irrestrita destes Termos e de nossa{" "}
              <Link href="/privacidade" className="text-lp-accent hover:underline">Política de Privacidade</Link>.
              Estes Termos formam o contrato vinculante entre você (ou o escritório que representa) e a RR7x Capital Hub.
            </p>
          </T>

          <T num="2" title="Descrição do serviço">
            <p>
              A Mandor é uma plataforma de deal intelligence que oferece, entre outros recursos:
            </p>
            <ul>
              <li>Análise de ativos para M&amp;A, crédito estruturado e preparação de mercado;</li>
              <li>Diagnóstico financeiro automatizado (DRE normalizada, EBITDA ajustado, valuation);</li>
              <li>Deal Readiness Score (DRS) e análise de riscos;</li>
              <li>Geração de documentos institucionais (blind teaser, pitchbook, relatórios);</li>
              <li>Pipeline de 9 módulos especializados de inteligência artificial executando em paralelo;</li>
              <li>Gestão de equipe, escritório e histórico de análises.</li>
            </ul>
            <p>
              O escopo exato dos serviços disponíveis depende do plano contratado.
            </p>
          </T>

          <T num="3" title="Cadastro e conta">
            <ul>
              <li>Você deve fornecer informações verdadeiras, precisas e atualizadas no momento do cadastro.</li>
              <li>É responsável por manter a confidencialidade das suas credenciais de acesso.</li>
              <li>É responsável por todas as atividades realizadas com sua conta.</li>
              <li>Deve notificar imediatamente qualquer acesso não autorizado à sua conta.</li>
              <li>Contas não podem ser transferidas, compartilhadas ou cedidas sem autorização prévia por escrito.</li>
              <li>A Mandor reserva-se o direito de suspender ou encerrar contas que violem estes Termos.</li>
            </ul>
          </T>

          <T num="4" title="Planos e pagamentos">
            <Ts title="4.1 Faturamento e renovação">
              <p>
                As assinaturas são cobradas mensalmente ou anualmente conforme o plano escolhido. As assinaturas
                são renovadas automaticamente ao final de cada período, salvo cancelamento anterior ao prazo de
                renovação.
              </p>
            </Ts>
            <Ts title="4.2 Análises avulsas">
              <p>
                O plano avulso é cobrado por análise concluída. O valor é debitado no momento da solicitação e
                não está sujeito a renovação automática.
              </p>
            </Ts>
            <Ts title="4.3 Reembolsos">
              <p>
                Para compras realizadas no ambiente digital, você tem direito a arrependimento e reembolso integral
                em até 7 (sete) dias corridos a partir da data da compra, conforme Art. 49 do Código de Defesa do
                Consumidor. Fora desse prazo, reembolsos são avaliados caso a caso.
              </p>
            </Ts>
            <Ts title="4.4 Alterações de preço">
              <p>
                A Mandor pode ajustar os preços com aviso prévio de 30 dias. A continuidade do uso após o aviso
                implica aceitação dos novos valores.
              </p>
            </Ts>
          </T>

          <T num="5" title="Uso aceitável">
            <p>É expressamente proibido:</p>
            <ul>
              <li>Utilizar a plataforma para fins ilegais, fraudulentos ou contrários à ordem pública;</li>
              <li>Tentar acessar contas de outros usuários, sistemas internos ou dados que não sejam de sua propriedade;</li>
              <li>Fazer engenharia reversa, descompilar ou tentar extrair o código-fonte da plataforma;</li>
              <li>Interferir no funcionamento dos servidores ou infraestrutura da Mandor;</li>
              <li>Transmitir malware, vírus ou qualquer código malicioso;</li>
              <li>Coletar dados de outros usuários de forma não autorizada;</li>
              <li>Revender, sublicenciar ou comercializar o acesso à plataforma sem autorização prévia por escrito;</li>
              <li>Usar ferramentas automatizadas (bots, scrapers) para acessar a plataforma de forma não autorizada;</li>
              <li>Publicar ou compartilhar conteúdo de terceiros em violação a direitos de propriedade intelectual;</li>
              <li>Enviar documentos falsos ou fabricados para análise.</li>
            </ul>
          </T>

          <T num="6" title="Propriedade intelectual">
            <Ts title="6.1 Direitos da Mandor">
              <p>
                Todo o conteúdo, tecnologia, interface, código-fonte, algoritmos, modelos de análise, marcas e
                denominações da plataforma Mandor são de propriedade exclusiva da RR7x Capital Hub, protegidos
                pela legislação de propriedade intelectual aplicável.
              </p>
            </Ts>
            <Ts title="6.2 Conteúdo do usuário">
              <p>
                Você retém a propriedade dos documentos e dados enviados para análise. Ao enviá-los, concede à
                Mandor uma licença não exclusiva, limitada ao estritamente necessário para a prestação do serviço
                contratado. Dados anonimizados e agregados podem ser utilizados para melhoria do produto, sem
                identificação de indivíduos ou escritórios.
              </p>
            </Ts>
            <Ts title="6.3 Relatórios gerados">
              <p>
                Os relatórios, diagnósticos e documentos gerados pela plataforma a partir dos dados do seu
                escritório são de sua propriedade. Você pode utilizá-los, compartilhá-los e distribuí-los
                conforme julgar necessário.
              </p>
            </Ts>
          </T>

          <T num="7" title="Inteligência artificial">
            <p>
              A Mandor utiliza modelos de inteligência artificial para processar documentos e gerar diagnósticos.
              É importante compreender que:
            </p>
            <ul>
              <li>Os resultados gerados por IA são sugestões e análises, não decisões definitivas;</li>
              <li>Todo output deve ser revisado por um profissional qualificado antes de uso em operações reais;</li>
              <li>A Mandor não garante precisão absoluta dos resultados e não se responsabiliza por decisões tomadas com base exclusiva nos relatórios gerados;</li>
              <li>Os relatórios não substituem assessoria jurídica, contábil ou financeira especializada.</li>
            </ul>
          </T>

          <T num="8" title="Disponibilidade do serviço">
            <p>
              Envidamos esforços para manter a plataforma disponível 24 horas por dia, 7 dias por semana. No
              entanto, o serviço pode ser interrompido temporariamente por:
            </p>
            <ul>
              <li>Manutenção programada (com aviso prévio quando possível);</li>
              <li>Atualizações e melhorias de sistema;</li>
              <li>Falhas técnicas ou de infraestrutura de terceiros;</li>
              <li>Situações de força maior.</li>
            </ul>
            <p>
              Não garantimos SLA específico de disponibilidade nos planos atuais. Interrupções planejadas não
              geram direito a reembolso proporcional.
            </p>
          </T>

          <T num="9" title="Limitação de responsabilidade">
            <p>
              Na máxima extensão permitida pela lei aplicável:
            </p>
            <ul>
              <li>A Mandor não se responsabiliza por danos indiretos, incidentais, especiais, consequenciais ou punitivos;</li>
              <li>A responsabilidade total da Mandor, independentemente da natureza da reclamação, limita-se ao valor pago pelo usuário nos últimos 12 meses;</li>
              <li>Não somos responsáveis por perdas decorrentes de decisões de investimento ou negócios tomadas com base nos relatórios da plataforma.</li>
            </ul>
          </T>

          <T num="10" title="Privacidade e proteção de dados">
            <p>
              O tratamento de dados pessoais é regido pela nossa{" "}
              <Link href="/privacidade" className="text-lp-accent hover:underline">Política de Privacidade</Link>,
              que é parte integrante destes Termos. Cumprimos a LGPD (Lei nº 13.709/2018) e demais normas aplicáveis.
            </p>
          </T>

          <T num="11" title="Suspensão e encerramento">
            <Ts title="11.1 Por iniciativa do usuário">
              <p>
                Você pode cancelar sua assinatura a qualquer momento. O cancelamento tem efeito ao final do período
                de cobrança vigente. Os dados permanecem acessíveis até o encerramento do período pago.
              </p>
            </Ts>
            <Ts title="11.2 Por iniciativa da Mandor">
              <p>
                Podemos suspender ou encerrar o acesso, com ou sem aviso prévio, em casos de: violação destes
                Termos, inadimplência, atividade fraudulenta, solicitação de autoridade competente ou encerramento
                do serviço. Em caso de encerramento do serviço, notificaremos com antecedência mínima de 30 dias.
              </p>
            </Ts>
          </T>

          <T num="12" title="Indenização">
            <p>
              Você concorda em indenizar, defender e isentar a Mandor e a RR7x Capital Hub de quaisquer
              reclamações, danos, custos e despesas (incluindo honorários advocatícios) decorrentes do seu uso
              indevido da plataforma ou de violação destes Termos.
            </p>
          </T>

          <T num="13" title="Alterações nos termos">
            <p>
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações materiais serão
              comunicadas por email ou por aviso na plataforma com pelo menos 15 dias de antecedência. O uso
              continuado após esse prazo constitui aceitação das alterações.
            </p>
          </T>

          <T num="14" title="Lei aplicável e foro">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
              comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes deste contrato, com
              renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </T>

          <T num="15" title="Disposições gerais">
            <ul>
              <li>Se qualquer cláusula destes Termos for considerada inválida, as demais permanecem em vigor.</li>
              <li>A tolerância de qualquer descumprimento não implica renúncia ao direito de exigir o cumprimento no futuro.</li>
              <li>Você não pode ceder seus direitos e obrigações decorrentes destes Termos sem consentimento prévio por escrito da Mandor.</li>
              <li>Estes Termos, juntamente com a Política de Privacidade, constituem o acordo integral entre as partes.</li>
            </ul>
          </T>

          <T num="16" title="Contato">
            <p>
              Para dúvidas sobre estes Termos:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href={`mailto:${CONTACT_EMAIL}`} className="text-lp-accent hover:underline">{CONTACT_EMAIL}</a></li>
              <li><strong>Formulário:</strong> <Link href="/contato" className="text-lp-accent hover:underline">mandor.com.br/contato</Link></li>
            </ul>
            <p className="text-[13px] text-lp-ink-3 mt-4">
              © {new Date().getFullYear()} RR7x Capital Hub. Todos os direitos reservados.
            </p>
          </T>

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

function T({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
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

function Ts({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-lp-ink mb-2">{title}</h3>
      <div className="text-[14px] text-lp-ink-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
