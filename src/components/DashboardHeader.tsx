import React from 'react';

interface DashboardHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function DashboardHeader({ activeTab, setActiveTab }: DashboardHeaderProps) {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'stake': return 'Gestão de Stake';
      case 'bets': return 'Histórico de Apostas';
      case 'trash': return 'Lixeira (Arquivadas)';
      case 'register': return 'Registrar Aposta';
      case 'insights': return 'Insights com IA';
      case 'transfers': return 'Transferências e Unidades';
      default: return 'Gestão de Banca';
    }
  };

  return (
    <header className="hidden lg:flex h-24 bg-bg border-b border-border items-center justify-between px-10 sticky top-0 z-10">
      <h1 className="text-2xl font-black uppercase tracking-tighter">
        {getTabTitle()}
      </h1>
      {activeTab !== 'register' && (
        <button 
          onClick={() => setActiveTab('register')}
          className="bg-accent hover:opacity-90 text-bg px-6 py-3 rounded-lg font-black uppercase text-xs tracking-widest transition-all active:scale-95"
        >
          Registrar Nova Aposta
        </button>
      )}
    </header>
  );
}
