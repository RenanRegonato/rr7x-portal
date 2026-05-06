import { useState } from 'react';
import { IconPlus } from './Icons';

/**
 * NewDealForm — painel de criação de deal.
 * Estado controlado internamente; emite onSubmit({ name, type, sector, mode }).
 */
export default function NewDealForm({ onSubmit }) {
  const [mode, setMode]     = useState('Ativo');
  const [name, setName]     = useState('');
  const [type, setType]     = useState('M&A Sell-Side');
  const [sector, setSector] = useState('SaaS B2B');

  const submit = () => onSubmit?.({ name, type, sector, mode });

  return (
    <section className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-[22px]">
      <h3 className="font-display text-[18px] font-medium tracking-tight m-0">Novo deal</h3>
      <p className="text-[12px] text-ink-3 mt-1 mb-[18px]">Otto orquestra os 9 especialistas em até 12h.</p>

      <Segmented value={mode} onChange={setMode} options={['Ativo', 'Lead', 'Mandato']} fullWidth/>

      <Field label="Nome do projeto">
        <Input placeholder="Ex.: Projeto Aurora" value={name} onChange={(e) => setName(e.target.value)}/>
      </Field>

      <Field label="Tipo de operação">
        <Select value={type} onChange={(e) => setType(e.target.value)} glyph="○">
          <option>M&A Sell-Side</option>
          <option>M&A Buy-Side</option>
          <option>Estruturação de Crédito</option>
          <option>Preparação de Ativo</option>
        </Select>
      </Field>

      <Field label="Setor do ativo">
        <Select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option>SaaS B2B</option>
          <option>Indústria</option>
          <option>Agronegócio</option>
          <option>Varejo</option>
          <option>Serviços financeiros</option>
          <option>Saúde</option>
        </Select>
      </Field>

      <button
        onClick={submit}
        className="mt-[18px] w-full flex items-center justify-center gap-2 px-4 py-[11px] rounded-[10px] bg-accent text-accent-ink font-semibold text-[13px] hover:bg-accent-strong hover:text-white active:translate-y-px transition-colors"
      >
        <IconPlus size={14}/> Iniciar Deal Intake
      </button>

      <p className="text-center text-[11px] text-ink-3 mt-3.5">Apenas você e seu escritório veem este deal.</p>
    </section>
  );
}

/* ---------- Form primitives compartilhados ---------- */
export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink-2 mt-3.5 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow
                 focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)]"
    />
  );
}

export function Select({ children, glyph, ...props }) {
  return (
    <div className="relative">
      {glyph && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-md bg-accent-soft grid place-items-center text-[11px] font-display font-semibold text-accent-ink">
          {glyph}
        </span>
      )}
      <select
        {...props}
        className={`w-full appearance-none border border-border rounded-[10px] py-2.5 text-[13px] bg-surface outline-none
                    focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)]
                    ${glyph ? 'pl-[42px] pr-9' : 'pl-3 pr-9'}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-2 w-1.5 h-1.5 border-r-[1.5px] border-b-[1.5px] border-ink-2 rotate-45"/>
    </div>
  );
}

export function Segmented({ value, onChange, options, fullWidth = false }) {
  return (
    <div className={`inline-flex bg-surface-2 border border-border rounded-full p-[3px] ${fullWidth ? 'flex w-full' : ''}`}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`${fullWidth ? 'flex-1' : ''} px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors
            ${value === opt ? 'bg-surface text-ink shadow-soft-sm' : 'text-ink-2 hover:text-ink'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
