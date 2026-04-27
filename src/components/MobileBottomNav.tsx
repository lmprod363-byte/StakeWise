import React from 'react';
import { LayoutDashboard, Plus, History, ArrowRightLeft, Menu } from 'lucide-react';
import { cn } from '../lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: MobileBottomNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-1 left-4 right-4 h-16 bg-bg/90 backdrop-blur-2xl border border-white/5 rounded-2xl flex items-center justify-between px-2 z-[100] shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
      <button 
        onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
        className={cn(
          "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
          activeTab === 'dashboard' ? "text-accent scale-110" : "text-text-dim"
        )}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[7px] font-black uppercase tracking-tight">Dash</span>
      </button>
      <button 
        onClick={() => { setActiveTab('register'); setIsMobileMenuOpen(false); }}
        className={cn(
          "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
          activeTab === 'register' ? "text-accent scale-110" : "text-text-dim"
        )}
      >
        <Plus className="w-5 h-5" />
        <span className="text-[7px] font-black uppercase tracking-tight">Novo</span>
      </button>
      <button 
        onClick={() => { setActiveTab('bets'); setIsMobileMenuOpen(false); }}
        className={cn(
          "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
          activeTab === 'bets' ? "text-accent scale-110" : "text-text-dim"
        )}
      >
        <History className="w-5 h-5" />
        <span className="text-[7px] font-black uppercase tracking-tight">Hist</span>
      </button>
      <button 
        onClick={() => { setActiveTab('transfers'); setIsMobileMenuOpen(false); }}
        className={cn(
          "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
          activeTab === 'transfers' ? "text-accent scale-110" : "text-text-dim"
        )}
      >
        <ArrowRightLeft className="w-5 h-5" />
        <span className="text-[7px] font-black uppercase tracking-tight">Transfs</span>
      </button>
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={cn(
          "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
          isMobileMenuOpen ? "text-accent scale-110" : "text-text-dim"
        )}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[7px] font-black uppercase tracking-tight">Mais</span>
      </button>
    </nav>
  );
}
