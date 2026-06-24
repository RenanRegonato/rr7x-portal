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
            <p>O Mandor opera com segurança, responsabilidade, conformidade e transparência como fundações não negociáveis.</p>

            <Ts title="🔐 Segurança">
              <ul>
                <li><strong>AES-256</strong> criptografia (dados em repouso)</li>
                <li><strong>TLS 1.3</strong> criptografia (dados em trânsito)</li>
                <li><strong>Supabase</strong> infrastructure (uptime 99.9%)</li>
                <li>Backup automático diário + failover multi-region</li>
                <li>Acesso isolado por cliente — nem a equipe Mandor vê seus dados sem autorização</li>
              </ul>
            </Ts>

            <Ts title="⚖️ Responsabilidade">
              <ul>
                <li>Parecer com <strong>4 camadas de validação</strong> (IA + automático + human + auditoria)</li>
                <li>Limite de responsabilidade claro e documentado em contrato</li>
                <li><strong>Professional Liability Insurance</strong> de R$ 5M para clientes Enterprise</li>
                <li>Especialista humano valida parecer antes de entregar (Enterprise)</li>
                <li>Trilha de auditoria completa: quem fez, quando, como e por quê</li>
              </ul>
            </Ts>

            <Ts title="🏛️ Conformidade">
              <ul>
                <li>✅ <strong>LGPD compliant</strong> (Brasil) — auditado</li>
                <li>✅ <strong>GDPR ready</strong> (EU) — em compliance</li>
                <li>🔄 <strong>SOC 2 Type II</strong> (em audit, Q3 2026)</li>
                <li>🔄 <strong>ISO 27001</strong> (em audit, Q4 2026)</li>
              </ul>
            </Ts>

            <Ts title="📝 Transparência">
              <ul>
                <li>Cada parecer documenta qual agente fez o quê</li>
                <li>Trilha de auditoria acessível: quem, quando, como</li>
                <li>Source de cada afirmação marcado (documento + página + seção)</li>
                <li>Sempre dizemos "não encontrado" se falta informação — sem omissões silenciosas</li>
              </ul>
            </Ts>
          </T>

          <T num="2" title="O Que é Mandor (e O Que Não é)">
            <p>Entenda exatamente as capacidades e limitações da plataforma.</p>

            <Ts title="✅ MANDOR É:">
              <ul>
                <li>Ferramenta de análise operacional (M&A, crédito, diagnóstico)</li>
                <li>IA especializada em financeiro, jurídico e tributário</li>
                <li>Acelerador de decisão (reduz semanas a 90 minutos)</li>
                <li>Identificadora de riscos e oportunidades</li>
                <li>Geradora de documentos de captação (teasers, pitchbooks)</li>
                <li>Plataforma de matching de investidores</li>
                <li>Mapeamento inteligente de mercado</li>
                <li>Parecer com trilha de auditoria completa</li>
              </ul>
            </Ts>

            <Ts title="❌ MANDOR NÃO É:">
              <ul>
                <li>Parecer jurídico (você precisa de advogado)</li>
                <li>Parecer fiscal/tributário (você precisa validar com contador)</li>
                <li>Auditoria ou diligência completa</li>
                <li>Garantia de sucesso operacional</li>
                <li>Recomendação de investimento regulada</li>
                <li>Conselheiro de M&A ou investimento</li>
                <li>Substituto de especialista humano</li>
                <li>Certificação de viabilidade</li>
              </ul>
            </Ts>

            <p className="text-[14px] text-lp-ink-2 leading-relaxed bg-lp-fog p-4 rounded-[12px] border border-lp-border">
              <strong>Responsabilidade do Cliente:</strong> Parecer Mandor é opinião técnica baseada em documentos fornecidos. Você é responsável por validar parecer com especialista apropriado (advogado, contador, especialista de setor) antes de tomar qualquer decisão.
            </p>
          </T>

          <T num="3" title="Como Protegemos Seus Dados">
            <Ts title="Isolamento de Dados">
              <p>Seu escritório vê apenas suas operações. Dados de outro cliente <strong>nunca</strong> vão para você. Cada cliente tem chave de acesso única e isolada no banco de dados.</p>
            </Ts>

            <Ts title="Criptografia">
              <p>Dados são criptografados com <strong>AES-256</strong> em repouso. Backups são automaticamente criptografados. Chaves são rotacionadas a cada 90 dias.</p>
            </Ts>

            <Ts title="Retenção de Dados">
              <ul>
                <li><strong>Documentos:</strong> retidos 12 meses (depois deletado)</li>
                <li><strong>Logs operacionais:</strong> retidos 90 dias (depois anonimizados)</li>
                <li><strong>Parecer:</strong> retido indefinidamente (é sua propriedade)</li>
              </ul>
            </Ts>

            <Ts title="Direitos GDPR (Clientes EU)">
              <ul>
                <li><strong>Direito ao acesso:</strong> exporte seus dados a qualquer momento</li>
                <li><strong>Direito à exclusão:</strong> delete sua conta e dados (parecer permanece como seu)</li>
                <li><strong>Direito à portabilidade:</strong> receba dados em formato estruturado</li>
                <li><strong>DPA em vigor:</strong> Standard Contractual Clauses com Supabase e processadores</li>
              </ul>
            </Ts>

            <p className="text-[14px] text-lp-ink-2 leading-relaxed bg-lp-fog p-4 rounded-[12px] border border-lp-border">
              <strong>Confidencialidade:</strong> Mandor trata documentos do cliente como confidencial. Nenhum compartilhamento com terceiros sem consentimento explícito. Conformidade LGPD + GDPR em todos os aspectos.
            </p>
          </T>

          <T num="4" title="Responsabilidade & Limitações">
            <Ts title="✓ Mandor É Responsável Por:">
              <ul>
                <li>Análise competente baseada em documentos fornecidos</li>
                <li>Validação de consistência em 4 camadas</li>
                <li>Parecer completo com trilha de auditoria</li>
                <li>Suporte ao cliente conforme SLA contratado</li>
                <li>Segurança e privacidade dos seus dados</li>
              </ul>
            </Ts>

            <Ts title="✗ Mandor NÃO É Responsável Por:">
              <ul>
                <li>Documentação incompleta ou imprecisa fornecida por você</li>
                <li>Sua decisão de avançar ou não com a operação</li>
                <li>Resultado da operação (fechar ou não)</li>
                <li>Ações de terceiros baseadas em parecer Mandor</li>
                <li>Lucros cessantes, danos indiretos ou punitivos</li>
                <li>Validação que você não fez com especialista apropriado</li>
              </ul>
            </Ts>

            <Ts title="Essential / Professional">
              <p>Responsabilidade <strong>capped at R$ 0 (zero)</strong>. Parecer fornecido "AS IS". Você é integralmente responsável por validar parecer com especialista antes de usar.</p>
            </Ts>

            <Ts title="Enterprise">
              <p>Responsabilidade <strong>capped at Professional Liability Insurance (R$ 5.000.000)</strong>.</p>
              <ul>
                <li><strong>Cobre:</strong> Erro crítico comprovado em parecer Mandor (risco material omitido)</li>
                <li><strong>Não cobre:</strong> Negligência do cliente, uso fora escopo, cliente ignorar recomendação</li>
                <li><strong>Prazo:</strong> Reclamação deve ser feita dentro 30 dias da entrega parecer</li>
                <li><strong>Prova:</strong> Certificado de seguro entregue com contrato</li>
              </ul>
            </Ts>
          </T>

          <T num="5" title="Validação & Assurance (Enterprise)">
            <p>Clientes Enterprise recebem parecer validado por especialista humano, em adição à análise de IA.</p>

            <Ts title="4 Camadas de Validação">
              <ol style={{ listStyleType: "decimal", paddingLeft: "1.25rem", lineHeight: "1.7" }}>
                <li><strong>Análise de IA</strong> — 10 agentes especializados processam em paralelo</li>
                <li><strong>Validação automática</strong> — checagem de consistência e completude</li>
                <li><strong>Review humano</strong> — especialista valida análise IA</li>
                <li><strong>Auditoria</strong> — trilha completa de quem fez o quê e quando</li>
              </ol>
            </Ts>

            <Ts title="Responsabilidade do Especialista Validador">
              <p>Especialista humano que valida o parecer é responsável por revisar análise IA, marcar concordância ou ajustes necessários, e assinar parecer conforme protocolo Mandor. Seu nome e credencial aparecem no parecer.</p>
            </Ts>
          </T>

          <T num="6" title="Perguntas Frequentes">
            <FaqItem
              pergunta="Meus dados são vistos pela equipe Mandor?"
              resposta="Não. Dados são isolados por cliente no banco de dados. A equipe Mandor pode acessar apenas se você solicitar suporte direto para troubleshooting, e todo acesso é loggado e auditado."
            />

            <FaqItem
              pergunta="Posso deletar meus dados?"
              resposta="Sim. Você pode requisitar exclusão de sua conta e dados armazenados. O parecer que você recebeu fica em seu poder (é sua propriedade intelectual)."
            />

            <FaqItem
              pergunta="Qual é a cobertura de seguro?"
              resposta="Professional Indemnity Insurance de R$ 5.000.000 para clientes Enterprise. Cobre erros críticos comprovados em parecer Mandor. Não cobre negligência do cliente ou uso fora do escopo contratado."
            />

            <FaqItem
              pergunta="Vocês vendem meus dados?"
              resposta="Nunca. Dados são confidenciais por padrão. Não compartilhamos com terceiros. Conformidade LGPD + GDPR é obrigatória."
            />

            <FaqItem
              pergunta="Qual é a política de retenção?"
              resposta="Documentos: 12 meses. Logs operacionais: 90 dias. Parecer: indefinido (é sua propriedade). Você pode requisitar exclusão a qualquer momento."
            />

            <FaqItem
              pergunta="Como validam que parecer está correto?"
              resposta="4 camadas: (1) Análise IA por 10 agentes paralelos, (2) Validação automática de consistência, (3) Human review (Enterprise), (4) Auditoria completa. Cada passo é rastreável."
            />

            <FaqItem
              pergunta="O parecer Mandor é parecer jurídico?"
              resposta="Não. Parecer Mandor é opinião técnica e análise diagnóstica. Você deve validar com advogado, contador e especialista de setor antes de tomar qualquer decisão com implicações legais, fiscais ou financeiras."
            />

            <FaqItem
              pergunta="Vocês avalizam o sucesso da operação?"
              resposta="Não. Parecer Mandor recomenda ação (vai/não vai) com base em documentos, mas não garante resultado operacional. Operação pode não fechar mesmo com parecer positivo, e isso é risco do mercado, não de Mandor."
            />
          </T>

          <T num="7" title="Contato e Reportes">
            <p>Para dúvidas ou problemas, entre em contato através dos canais apropriados:</p>
            <ul>
              <li><strong>Erro no parecer:</strong> <a href="mailto:legal@mandor.com.br" className="text-lp-accent hover:underline">legal@mandor.com.br</a></li>
              <li><strong>Risco de segurança:</strong> <a href="mailto:security@mandor.com.br" className="text-lp-accent hover:underline">security@mandor.com.br</a> (confidencial)</li>
              <li><strong>Compliance:</strong> <a href="mailto:compliance@mandor.com.br" className="text-lp-accent hover:underline">compliance@mandor.com.br</a></li>
            </ul>
            <p className="text-[13px] text-lp-ink-3 mt-4">
              <strong>SLA:</strong> Garantimos resposta nas próximas 24-48 horas para qualquer report. Última atualização: {LAST_UPDATED}.
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
