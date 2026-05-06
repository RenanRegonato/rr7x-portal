import { useState } from 'react';
import PipelineCard from './PipelineCard';
import { Segmented } from './NewDealForm';

/**
 * PipelineGrid — grid de PipelineCards com filtro.
 */
export default function PipelineGrid({ deals, onOpenDeal }) {
  const [filter, setFilter] = useState('Recentes');

  return (
    <section>
      <header className="flex items-center justify-between mb-[18px]">
        <h2 className="font-display font-medium text-[24px] tracking-tight m-0">Pipeline de deals</h2>
        <Segmented value={filter} onChange={setFilter} options={['Recentes', 'Meus deals', 'Escritório']}/>
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {deals.map((d) => (
          <PipelineCard key={d.id} deal={d} onClick={() => onOpenDeal(d)}/>
        ))}
      </div>
    </section>
  );
}
