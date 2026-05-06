import { useState } from 'react';
import Topbar from './Topbar';
import { IconArrowRight, IconSparkle } from './Icons';

/**
 * IntakeWizard — wizard de 8 etapas para o Deal Intake.
 */
export default function IntakeWizard({ onBack, onSubmit, dealName = 'Projeto Aurora' }) {
  const [step, setStep] = useState(0);

  const fields = [
    { key: 'asset',    label: 'Nome do ativo',                  kind: 'text',     placeholder: 'Aurora Tecnologia S.A.' },
    { key: 'sector',   label: 'Setor / sub-setor',              kind: 'text',     placeholder: 'SaaS B2B · ERP industrial' },
    { key: 'revenue',  label: 'Receita anual (ARR/Net Revenue)',kind: 'text',     placeholder: 'R$ 28.500.000' },
    { key: 'ebitda',   label: 'EBITDA estimado',                kind: 'text',     placeholder: 'R$ 6.200.000 (margem 22%)' },
    { key: 'goal',     label: 'Objetivo do mandato',            kind: 'textarea', placeholder: 'Venda de 60% para investidor estratégico' },
    { key: 'docs',     label: 'Documentação disponível',        kind: 'checks',   options: ['Demonstrações 3 anos','Cap table','Contratos com top clientes','Pipeline comercial','Due diligence prévia'] },
    { key: 'timeline', label: 'Timeline esperado',              kind: 'text',     placeholder: '90 dias para LOI' },
    { key: 'context',  label: 'Contexto adicional',             kind: 'textarea', placeholder: 'Sócio fundador busca liquidez parcial; empresa com 4 anos de crescimento >40% a.a.' },
  ];

  const total   = fields.length;
  const current = fields[step];
  const isLast  = step === total - 1;

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        variant="context"
        title={`Deal Intake · ${dealName}`}
        onBack={onBack}
        right={<span className="text-[12px] text-ink-3">Etapa {step + 1} de {total}</span>}
      />

      <div className="px-10 py-10 max-w-[880px] mx-auto w-full">
        <div className="flex gap-1.5 mb-8">
          {fields.map((_, i) => (
            <div key={i} className={`flex-1 h-[3px] rounded-sm transition-colors ${i <= step ? 'bg-accent-strong' : 'bg-border'}`}/>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-9">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">Parâmetro {step + 1}</div>
          <h1 className="font-display text-[32px] font-medium tracking-tight m-0 mb-7">{current.label}</h1>

          <FieldRenderer field={current}/>

          <div className="flex gap-3 mt-8 justify-end">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2"
              >
                Voltar
              </button>
            )}
            {isLast ? (
              <button
                onClick={onSubmit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-accent text-accent-ink font-semibold text-[13px] hover:bg-accent-strong hover:text-white"
              >
                <IconSparkle size={14}/> Ativar squad
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-accent text-accent-ink font-semibold text-[13px] hover:bg-accent-strong hover:text-white"
              >
                Próximo <IconArrowRight size={14}/>
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[12px] text-ink-3 mt-4">
          Otto valida o preenchimento e calcula o Deal Readiness Score antes de ativar os 9 especialistas.
        </p>
      </div>
    </div>
  );
}

function FieldRenderer({ field }) {
  if (field.kind === 'text') {
    return (
      <input
        className="w-full border border-border rounded-[10px] px-4 py-3.5 text-[16px] bg-surface outline-none focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)]"
        placeholder={field.placeholder}
      />
    );
  }
  if (field.kind === 'textarea') {
    return (
      <textarea
        rows={5}
        className="w-full border border-border rounded-[10px] px-4 py-3.5 text-[15px] bg-surface outline-none resize-y focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)]"
        placeholder={field.placeholder}
      />
    );
  }
  if (field.kind === 'checks') {
    return (
      <div className="flex flex-col gap-2">
        {field.options.map((o, i) => (
          <label key={i} className="flex items-center gap-2.5 px-3.5 py-3 border border-border rounded-[10px] cursor-pointer hover:bg-surface-2">
            <input type="checkbox" defaultChecked={i < 2}/>
            <span className="text-[14px]">{o}</span>
          </label>
        ))}
      </div>
    );
  }
  return null;
}
