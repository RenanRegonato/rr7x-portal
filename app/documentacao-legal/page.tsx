import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentação Legal & Compliance | Mandor",
  description:
    "Segurança, conformidade LGPD/GDPR e responsabilidade profissional do Mandor · análise de M&A e crédito estruturado com cobertura de seguro.",
  alternates: { canonical: "/documentacao-legal" },
};

const LAST_UPDATED = "24 de junho de 2026";

export default function DocumentacaoLegalPage() {
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
            <Link href="/auth/signup" className="text-[13px] font-medium text-white px-4 py-2 rounded-[9px] hover:opacity-90" style={{ background: "#8C6F45" }}>
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
            Documentação Legal
          </h1>
          <p className="text-[14px] text-lp-ink-3">Segurança, conformidade e responsabilidade na inteligência de M&A.</p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-[800px] mx-auto px-6 py-14 lg:py-20">
        <div className="space-y-12">

          <T num="1" title="Os 4 Pilares de Confiança">
            <p>
              O Mandor opera com segurança, responsabilidade, conformidade e transparência como fundações não negociáveis.
            </p>

            <Ts title="Segurança">
              <ul>
                <li>Criptografia AES-256 para dados em repouso;</li>
                <li>Criptografia TLS 1.3 para dados em trânsito;</li>
                <li>Infraestrutura Supabase com uptime 99.9%;</li>
                <li>Backup automático diário com failover multi-region;</li>
                <li>Acesso isolado por cliente. A equipe Mandor não acessa seus dados sem autorização.</li>
              </ul>
            </Ts>

            <Ts title="Responsabilidade">
              <ul>
                <li>Parecer submetido a 4 camadas de validação: análise IA, validação automática, revisão humana (Enterprise) e auditoria;</li>
                <li>Limite de responsabilidade claro e documentado em contrato;</li>
                <li>Professional Liability Insurance de R$ 5 milhões para clientes Enterprise;</li>
                <li>Especialista humano valida parecer antes da entrega em planos Enterprise;</li>
                <li>Trilha de auditoria completa acessível ao cliente.</li>
              </ul>
            </Ts>

            <Ts title="Conformidade">
              <ul>
                <li>Conformidade com LGPD (Brasil) — auditada;</li>
                <li>Conformidade com GDPR (UE);</li>
                <li>Certificação SOC 2 Type II em auditoria (prevista Q3 2026);</li>
                <li>Certificação ISO 27001 em auditoria (prevista Q4 2026).</li>
              </ul>
            </Ts>

            <Ts title="Transparência">
              <ul>
                <li>Cada parecer documenta quais agentes processaram cada seção;</li>
                <li>Trilha de auditoria completa com registro de quem, quando e como;</li>
                <li>Source de cada informação rastreável até documento, página e seção original;</li>
                <li>Parecer sempre registra quando informação não foi encontrada nos documentos fornecidos.</li>
              </ul>
            </Ts>
          </T>

          <T num="2" title="O Que é Mandor">
            <p>
              O Mandor é uma ferramenta de análise operacional para M&A, crédito estruturado e preparação de ativos, utilizando inteligência artificial especializada em análise financeira, jurídica e tributária.
            </p>
            <p>
              Mandor oferece:
            </p>
            <ul>
              <li>Análise diagnóstica baseada em documentos fornecidos pelo cliente;</li>
              <li>Aceleração de decisão (análise em até 90 minutos no lugar de semanas);</li>
              <li>Identificação de riscos e oportunidades;</li>
              <li>Geração de documentos institucionais (teaser, pitchbook, relatórios);</li>
              <li>Plataforma de matching de investidores (Invest Match);</li>
              <li>Mapeamento inteligente do mercado.</li>
            </ul>
          </T>

          <T num="3" title="O Que Mandor Não é">
            <p>
              É importante compreender as limitações e o escopo do parecer Mandor:
            </p>
            <ul>
              <li>Mandor não fornece parecer jurídico. Parecer jurídico deve ser obtido com advogado especializado;</li>
              <li>Mandor não fornece parecer fiscal ou tributário. Parecer fiscal deve ser obtido com contador ou especialista tributário;</li>
              <li>Mandor não substitui auditoria ou diligência completa. Parecer é diagnóstico acelerado, não substitui especialista;</li>
              <li>Mandor não garante sucesso operacional. Transação pode não fechar mesmo com parecer positivo;</li>
              <li>Mandor não fornece recomendação de investimento conforme regulação CVM.</li>
            </ul>
            <p>
              O cliente é responsável por validar o parecer Mandor com especialista apropriado (advogado, contador, especialista de setor) antes de tomar qualquer decisão com implicações legais, fiscais ou financeiras.
            </p>
          </T>

          <T num="4" title="Proteção de Dados">
            <Ts title="Isolamento">
              <p>
                Seu escritório acessa apenas suas próprias operações e documentos. Dados de outro cliente nunca são visíveis. Cada cliente possui chave de acesso única isolada no banco de dados.
              </p>
            </Ts>

            <Ts title="Criptografia">
              <p>
                Dados pessoais e documentos de clientes são criptografados com AES-256 em repouso. Backups são criptografados. Chaves de criptografia são rotacionadas a cada 90 dias.
              </p>
            </Ts>

            <Ts title="Retenção">
              <p>
                Documentos enviados para análise são retidos por 12 meses, após o qual são deletados. Logs operacionais são retidos por 90 dias, depois anonimizados. Parecer é retido indefinidamente como propriedade do cliente.
              </p>
            </Ts>

            <Ts title="Confidencialidade">
              <p>
                Documentos e dados do cliente são tratados como confidenciais. Nenhum compartilhamento com terceiros sem consentimento explícito do cliente. Conformidade com LGPD e GDPR é obrigatória em todos os aspectos.
              </p>
            </Ts>

            <Ts title="Direitos (clientes EU)">
              <ul>
                <li>Direito de acesso: exporte seus dados a qualquer momento via painel;</li>
                <li>Direito à exclusão: delete sua conta e dados armazenados. Parecer permanece sua propriedade;</li>
                <li>Direito à portabilidade: receba dados em formato estruturado (JSON/CSV);</li>
                <li>Data Processing Agreement (DPA) em vigor com Standard Contractual Clauses para transferência internacional.</li>
              </ul>
            </Ts>
          </T>

          <T num="5" title="Responsabilidade">
            <Ts title="Mandor é responsável por">
              <ul>
                <li>Análise competente baseada em documentos fornecidos pelo cliente;</li>
                <li>Validação de consistência em 4 camadas (IA, automática, humana, auditoria);</li>
                <li>Parecer completo e rastreável com trilha de auditoria;</li>
                <li>Suporte ao cliente conforme SLA contratado;</li>
                <li>Segurança e privacidade dos dados do cliente.</li>
              </ul>
            </Ts>

            <Ts title="Mandor não é responsável por">
              <ul>
                <li>Documentação incompleta, imprecisa ou falsificada fornecida pelo cliente;</li>
                <li>Decisão do cliente de prosseguir ou não com a operação;</li>
                <li>Resultado operacional (fechamento ou não da transação);</li>
                <li>Ações de terceiros baseadas em parecer Mandor;</li>
                <li>Lucros cessantes ou danos indiretos, especiais ou punitivos.</li>
              </ul>
            </Ts>

            <Ts title="Limite de responsabilidade — Planos Essential/Professional">
              <p>
                Responsabilidade total capped em R$ 0 (zero). Parecer é fornecido "AS IS". Cliente assume integral responsabilidade por validar parecer com especialista antes de usar em operação.
              </p>
            </Ts>

            <Ts title="Limite de responsabilidade — Plano Enterprise">
              <p>
                Responsabilidade total capped no valor coberto por Professional Liability Insurance (R$ 5.000.000).
              </p>
              <ul>
                <li>Cobertura aplica-se a erro crítico comprovado em parecer Mandor (omissão de risco material identificável nos documentos);</li>
                <li>Não cobre negligência do cliente, uso fora do escopo contratado ou cliente que escolhe não seguir recomendação Mandor;</li>
                <li>Reclamação deve ser feita dentro de 30 dias da entrega do parecer;</li>
                <li>Certificado de seguro entregue junto ao contrato Enterprise.</li>
              </ul>
            </Ts>
          </T>

          <T num="6" title="Validação Enterprise">
            <p>
              Parecer Enterprise passa por validação humana em adição à análise IA.
            </p>

            <Ts title="4 Camadas de Validação">
              <ol style={{ listStyleType: "decimal", paddingLeft: "1.25rem", lineHeight: "1.7" }}>
                <li>Análise IA: 10 agentes especializados processam documento em paralelo;</li>
                <li>Validação automática: checagem de consistência interna e completude;</li>
                <li>Revisão humana: especialista qualificado revisa análise IA e marca concordância ou ajustes;</li>
                <li>Auditoria: log completo de quem processou, quando e como.</li>
              </ol>
            </Ts>

            <Ts title="Especialista Validador">
              <p>
                Especialista que valida o parecer é responsável por revisar análise IA, marcar pontos de concordância ou ajuste necessário, e assinar parecer conforme protocolo Mandor. Nome e credencial do especialista aparecem no parecer.
              </p>
            </Ts>
          </T>

          <T num="7" title="Perguntas Frequentes">
            <FaqItem
              pergunta="Meus dados são vistos pela equipe Mandor?"
              resposta="Não. Dados estão isolados por cliente no banco de dados. Equipe Mandor acessa apenas se você requisitar suporte técnico direto para troubleshooting, e todo acesso é registrado em log."
            />

            <FaqItem
              pergunta="Posso deletar meus dados?"
              resposta="Sim. Você pode requisitar exclusão de sua conta e dados armazenados via contato. Parecer que você recebeu permanece sua propriedade intelectual e não é deletado."
            />

            <FaqItem
              pergunta="Qual é a cobertura do seguro?"
              resposta="Professional Indemnity Insurance de R$ 5 milhões para clientes Enterprise. Cobre erro crítico comprovado em parecer. Não cobre negligência do cliente ou uso fora de escopo."
            />

            <FaqItem
              pergunta="Vocês vendem ou compartilham meus dados?"
              resposta="Nunca. Dados são confidenciais. Nenhum compartilhamento com terceiros sem consentimento explícito. Conformidade com LGPD e GDPR é obrigatória."
            />

            <FaqItem
              pergunta="Qual é a política de retenção de dados?"
              resposta="Documentos são retidos por 12 meses após análise, depois deletados. Logs são retidos por 90 dias, depois anonimizados. Parecer é retido indefinidamente como sua propriedade."
            />

            <FaqItem
              pergunta="Como validam que o parecer está correto?"
              resposta="Parecer passa por 4 camadas: análise IA (10 agentes), validação automática, revisão humana (Enterprise), auditoria. Cada passo é rastreável."
            />

            <FaqItem
              pergunta="O parecer Mandor é parecer jurídico?"
              resposta="Não. Parecer Mandor é análise técnica e diagnóstico. Você deve validar com advogado, contador e especialista antes de qualquer decisão com implicações legais, fiscais ou financeiras."
            />

            <FaqItem
              pergunta="Vocês garantem sucesso da operação?"
              resposta="Não. Parecer Mandor recomenda prosseguir ou não com base em documentos, mas não garante resultado operacional. Transação pode não fechar mesmo com parecer positivo."
            />
          </T>

          <T num="8" title="Contato">
            <p>
              Para dúvidas, problemas ou reportes:
            </p>
            <ul>
              <li>Erro no parecer: <a href="mailto:legal@mandor.com.br" className="text-lp-accent hover:underline">legal@mandor.com.br</a></li>
              <li>Risco de segurança: <a href="mailto:security@mandor.com.br" className="text-lp-accent hover:underline">security@mandor.com.br</a></li>
              <li>Conformidade ou LGPD: <a href="mailto:compliance@mandor.com.br" className="text-lp-accent hover:underline">compliance@mandor.com.br</a></li>
            </ul>
            <p className="text-[13px] text-lp-ink-3 mt-4">
              Garantimos resposta dentro de 24-48 horas para qualquer report. Última atualização: {LAST_UPDATED}.
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
            <Link href="/documentacao-legal" className="hover:text-lp-ink transition-colors">Documentação Legal</Link>
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
      <div className="space-y-3 text-[14.5px] text-lp-ink-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-lp-ink [&_p+p]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2">
        {children}
      </div>
    </section>
  );
}

function Ts({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-lp-ink mb-2">{title}</h3>
      <div className="text-[14px] text-lp-ink-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function FaqItem({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  return (
    <div className="border-b border-lp-border py-4 first:pt-0 last:border-0 last:pb-0">
      <h3 className="text-[14px] font-semibold text-lp-ink mb-2">{pergunta}</h3>
      <p className="text-[14px] text-lp-ink-2 leading-relaxed">{resposta}</p>
    </div>
  );
}
