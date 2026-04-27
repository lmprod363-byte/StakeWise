import React from 'react';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Plus, 
  Sparkles, 
  History, 
  Trash2, 
  Settings2, 
  ArrowRightLeft, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Bankroll, AllTimeStats } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  bankroll: Bankroll;
  allTimeStats: AllTimeStats;
  bookmakerExposure: [string, number][];
  bookmakerBalances: [string, number][];
  getBookmakerStyle: (bm: string) => any;
  showBalanceFeedback: boolean;
  balanceDelta: number | null;
  setAdjustingBookmaker: (bm: string | null) => void;
  setAdjustmentValue: (val: string) => void;
  setIsBankrollMenuOpen: (val: boolean) => void;
  signOut: () => Promise<void>;
  formatCurrency: (val: number) => string;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  bankroll,
  allTimeStats,
  bookmakerExposure,
  bookmakerBalances,
  getBookmakerStyle,
  showBalanceFeedback,
  balanceDelta,
  setAdjustingBookmaker,
  setAdjustmentValue,
  setIsBankrollMenuOpen,
  signOut,
  formatCurrency
}: SidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 bg-bg text-text-dim p-8 flex-col border-r border-border h-screen sticky top-0 overflow-y-auto no-scrollbar">
      <div className="text-accent font-black text-2xl tracking-tighter mb-10 px-2 uppercase">
        StakeWise.
      </div>

      <nav className="space-y-4 flex-1">
        <div className="mb-6 group">
           <p className="text-[10px] font-black uppercase tracking-widest text-text-dim px-2 mb-2">Banca Ativa</p>
           <button 
              onClick={() => setIsBankrollMenuOpen(true)}
              className="w-full bg-surface/40 hover:bg-surface/80 border border-border group-hover:border-accent rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-300 backdrop-blur-md group"
           >
              <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-[11px] font-black text-text-main uppercase truncate max-w-[140px] tracking-tight">{bankroll.name}</span>
                  <span className="text-[8px] font-black text-accent uppercase tracking-widest opacity-80">Selecionar Banca</span>
              </div>
              <div className="bg-bg/50 p-1.5 rounded-lg border border-border/50 group-hover:border-accent/30 transition-all">
                <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-accent transition-colors" />
              </div>
           </button>
        </div>
        
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
            activeTab === 'dashboard' ? "text-text-main" : "hover:text-text-main text-text-dim"
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('stake')}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
            activeTab === 'stake' ? "text-text-main" : "hover:text-text-main text-text-dim"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Gestão de Stake
        </button>
        <button 
          onClick={() => setActiveTab('register')}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
            activeTab === 'register' ? "text-text-main" : "hover:text-text-main text-text-dim"
          )}
        >
          <Plus className="w-4 h-4" />
          Nova Aposta
        </button>
        <button 
          onClick={() => setActiveTab('insights')}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
            activeTab === 'insights' ? "text-text-main" : "hover:text-text-main text-text-dim"
          )}
        >
          <Sparkles className="w-4 h-4" />
          Insights AI
        </button>
        <button 
          onClick={() => setActiveTab('bets')}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
            activeTab === 'bets' ? "text-text-main" : "hover:text-text-main text-text-dim"
          )}
        >
          <History className="w-4 h-4" />
          Histórico
        </button>
        <button 
          onClick={() => setActiveTab('trash')}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
            activeTab === 'trash' ? "text-text-main" : "hover:text-text-main text-text-dim"
          )}
        >
          <Trash2 className="w-4 h-4" />
          Lixeira
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
            activeTab === 'settings' ? "text-text-main" : "hover:text-text-main text-text-dim"
          )}
        >
          <Settings2 className="w-4 h-4" />
          Configurações
        </button>
        <button 
          onClick={() => setActiveTab('transfers')}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
            activeTab === 'transfers' ? "text-text-main" : "hover:text-text-main text-text-dim"
          )}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Transferências
        </button>
      </nav>

      <div className="pt-6 space-y-4 text-text-dim">
        {bookmakerExposure.length > 0 && (
          <div className="pb-2">
             <p className="text-[10px] font-black uppercase tracking-widest px-2 mb-2">Investido por Casa</p>
             <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                {bookmakerExposure.map(([bm, amount]) => {
                  const style = getBookmakerStyle(bm);
                  return (
                    <div key={`exposure-${bm}`} className={cn("flex items-center justify-between px-3 py-2 rounded-lg border backdrop-blur-sm transition-all", style.bg, style.border)}>
                        <span className={cn("text-[9px] font-black uppercase tracking-tight truncate max-w-[80px]", style.color)}>{bm}</span>
                        <span className={cn("text-[10px] font-bold tabular-nums", style.color)}>{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('settings')}
          className="stat-card p-6 border-border group relative cursor-pointer bg-surface/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-[40px] rounded-full translate-x-12 -translate-y-12" />
          
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-dim text-[10px] font-black uppercase tracking-widest">Banca Atual</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
              <span className="text-[8px] font-black uppercase text-accent tracking-widest">Ativa</span>
            </div>
          </div>

          <div className="relative">
            <motion.p 
              key={`sidebar-balance-${allTimeStats.currentBalance}`}
              initial={{ scale: 1.1, filter: 'brightness(1.5)' }}
              animate={{ scale: 1, filter: 'brightness(1)' }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-text-main text-2xl font-extrabold tracking-tight relative z-10 mb-1"
            >
              {formatCurrency(allTimeStats.currentBalance)}
            </motion.p>
          </div>

          <AnimatePresence>
            {showBalanceFeedback && balanceDelta !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className={cn(
                  "relative z-20 overflow-hidden rounded-full border py-1 px-3 mb-3 flex items-center justify-center gap-2 backdrop-blur-md mx-auto w-fit",
                  balanceDelta < 0 
                    ? "bg-loss/10 border-loss/20 text-loss shadow-[0_2px_10px_rgba(239,68,68,0.1)]" 
                    : "bg-accent/10 border-accent/20 text-accent shadow-[0_2px_10px_rgba(16,185,129,0.1)]"
                )}
              >
                {balanceDelta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                <span className="text-[10px] font-black tabular-nums tracking-tighter leading-none">
                  {balanceDelta < 0 ? '-' : '+'} {formatCurrency(Math.abs(balanceDelta))}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bookmaker breakdown in Balance Card */}
          <div className="space-y-1 relative z-10 border-t border-border/10 pt-4">
             {bookmakerBalances.map(([bm, amount]) => {
                const style = getBookmakerStyle(bm);
                return (
                  <div key={`balance-${bm}`} className="flex items-center justify-between group/bm">
                     <span className={cn("text-[9px] font-black uppercase tracking-tight", style.color)}>{bm}</span>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tabular-nums text-text-main">{formatCurrency(amount)}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdjustingBookmaker(bm);
                            setAdjustmentValue(amount.toFixed(2));
                          }}
                          className="opacity-0 group-hover/bm:opacity-100 p-0.5 hover:bg-white/5 rounded transition-all"
                          title="Ajustar Saldo"
                        >
                          <RotateCcw className="w-2.5 h-2.5 text-text-dim" />
                        </button>
                     </div>
                  </div>
                );
             })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/10 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-text-dim/60 group-hover:text-accent transition-colors">
            <span>Gerenciar Gestão</span>
            <Settings2 className="w-3 h-3" />
          </div>
        </motion.div>
        
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-loss transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </button>
      </div>
    </aside>
  );
}
