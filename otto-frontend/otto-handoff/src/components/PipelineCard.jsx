import DRSBar from './DRSBar';
import Pill from './Pill';
import { IconX } from './Icons';

/**
 * PipelineCard — card individual do pipeline.
 */
export default function PipelineCard({ deal, onClick }) {
  const thumbBg = {
    peach: 'bg-peach',
    sage:  'bg-sage',
    sand:  'bg-sand',
    sky:   'bg-sky',
    lilac: 'bg-lilac',
    cream: 'bg-cream',
  }[deal.thumb] || 'bg-surface-2';

  return (
    <article
      onClick={onClick}
      className="bg-surface border border-border rounded-[14px] overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-soft-md hover:border-border-strong"
    >
      <div className={`h-[132px] grid place-items-center relative ${thumbBg}`}>
        {deal.featured ? (
          <span className="font-display font-normal italic text-[44px] tracking-tight text-[oklch(0.32_0.06_50/0.85)]">{deal.glyph}</span>
        ) : (
          <FolderGlyph/>
        )}
        {deal.featured && (
          <button
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 w-[18px] h-[18px] rounded grid place-items-center text-[oklch(0.3_0.02_50/0.5)] hover:bg-white/40 hover:text-ink"
          >
            <IconX size={11}/>
          </button>
        )}
      </div>

      <div className="p-[14px_16px_16px] border-t border-border flex flex-col gap-1">
        <div className="text-[14px] font-semibold tracking-tight">{deal.name}</div>
        <div className="text-[12px] text-ink-3 flex items-center gap-1.5">
          <span>{deal.subtitle}</span>
          {deal.status && <Pill kind={deal.statusKind}>{deal.status}</Pill>}
        </div>
        <div className="mt-2"><DRSBar value={deal.drs}/></div>
      </div>
    </article>
  );
}

function FolderGlyph() {
  return (
    <div className="relative w-14 h-11 rounded-[4px_4px_6px_6px] bg-white/55 border border-[oklch(0.4_0.02_50/0.15)]">
      <span className="absolute -top-[7px] left-0 w-[22px] h-[7px] bg-white/55 border border-[oklch(0.4_0.02_50/0.15)] border-b-0 rounded-t"/>
    </div>
  );
}
