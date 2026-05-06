import { useState } from 'react';
import { DEALS } from './data/mocks';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import NewDealForm from './components/NewDealForm';
import PipelineGrid from './components/PipelineGrid';
import IntakeWizard from './components/IntakeWizard';
import SquadView from './components/SquadView';
import DealDetail from './components/DealDetail';

/**
 * App — root + roteamento por estado local.
 * Em produção, trocar por React Router (já incluído no package.json).
 */
export default function App() {
  const [view, setView] = useState({ name: 'home' });
  const navCurrent = ['detail', 'intake', 'squad'].includes(view.name) ? 'pipeline' : view.name;

  const goHome     = () => setView({ name: 'home' });
  const openDeal   = (deal) => setView({ name: 'detail', deal });
  const newDeal    = () => setView({ name: 'intake' });
  const startSquad = () => setView({ name: 'squad' });
  const finish     = () => setView({ name: 'detail', deal: { name: 'Projeto Aurora' } });

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]" data-screen-label={`Otto · ${view.name}`}>
      <Sidebar current={navCurrent} onNav={(id) => setView({ name: id })}/>
      <main className="flex flex-col min-h-screen">
        {(view.name === 'home' || view.name === 'pipeline') && (
          <HomeView onOpenDeal={openDeal} onNewDeal={newDeal}/>
        )}
        {view.name === 'intake' && <IntakeWizard onBack={goHome} onSubmit={startSquad}/>}
        {view.name === 'squad'  && <SquadView   onBack={goHome} onComplete={finish}/>}
        {view.name === 'detail' && <DealDetail  onBack={goHome} dealName={view.deal?.name}/>}
        {view.name === 'docs'        && <EmptyView title="Documentos" sub="Pacotes gerados pelo squad ficam disponíveis aqui."/>}
        {view.name === 'frameworks'  && <EmptyView title="Frameworks" sub="Templates proprietários do escritório."/>}
      </main>
    </div>
  );
}

function HomeView({ onOpenDeal, onNewDeal }) {
  const [topTab, setTopTab] = useState('Deals');
  const tabs = [
    { id: 'Deals',      label: 'Deals' },
    { id: 'Templates',  label: 'Templates' },
    { id: 'Frameworks', label: 'Frameworks' },
  ];
  return (
    <>
      <Topbar tabs={tabs} tab={topTab} onTab={setTopTab}/>
      <div className="grid grid-cols-[320px_1fr] gap-7 p-8 items-start">
        <NewDealForm onSubmit={onNewDeal}/>
        <PipelineGrid deals={DEALS} onOpenDeal={onOpenDeal}/>
      </div>
    </>
  );
}

function EmptyView({ title, sub }) {
  return (
    <>
      <Topbar variant="context" title={title}/>
      <div className="px-8 py-20 text-center text-ink-3">
        <div className="font-display text-[32px] text-ink mb-2">{title}</div>
        <div>{sub}</div>
      </div>
    </>
  );
}
