import React from 'react';
import { ChevronDown, LogOut, TrendingDown, TrendingUp, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';

interface MobileHeaderProps {
  bankrollName: string;
  setIsBankrollMenuOpen: (v: boolean) => void;
  signOut: () => void;
  showBalanceFeedback: boolean;
  balanceDelta: number | null;
  currentBalance: number;
  setActiveTab: (t: string) => void;
}

export function MobileHeader({
  bankrollName,
  setIsBankrollMenuOpen,
  signOut,
  showBalanceFeedback,
  balanceDelta,
  currentBalance,
  setActiveTab
}: MobileHeaderProps) {
  return (
    <div className="lg:hidden h-20 bg-bg border-b border-border flex flex-col justify-center px-6 sticky top-0 z-20">
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <div className="text-accent font-black text-lg tracking-tighter uppercase leading-none">
            StakeWise.
          </div>
          <button 
            onClick={() => setIsBankrollMenuOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-text-dim mt-1 hover:text-accent transition-colors"
          >
            {bankrollName}
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={signOut}
            className="p-2 text-text-dim hover:text-loss transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="bg-surface px-3 py-1.5 rounded-lg border border-border flex flex-col items-center min-w-[80px] relative">
            <AnimatePresence>
              {showBalanceFeedback && balanceDelta !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.5 }}
                  animate={{ opacity: 1, y: -35, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "absolute top-0 right-0 font-black text-[10px] z-50 pointer-events-none whitespace-nowrap px-2 py-1 rounded-full border shadow-xl flex items-center gap-1",
                    balanceDelta < 0 ? "bg-loss text-white border-loss shadow-loss/20" : "bg-accent text-bg border-accent shadow-accent/20"
                  )}
                >
                  {balanceDelta < 0 ? <TrendingDown className="w-2 h-2" /> : <TrendingUp className="w-2 h-2" />}
                  {balanceDelta < 0 ? '-' : '+'} {formatCurrency(Math.abs(balanceDelta))}
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-[7px] font-black uppercase tracking-widest text-text-dim">Saldo</span>
            <motion.span 
              key={`mobile-balance-${currentBalance}`}
              animate={showBalanceFeedback ? { scale: [1, 1.2, 1], color: balanceDelta && balanceDelta < 0 ? ['#ef4444', '#10b981'] : undefined } : {}}
              className="text-[10px] font-black text-accent"
            >
              {formatCurrency(currentBalance)}
            </motion.span>
          </div>
          <button 
            onClick={() => setActiveTab('register')}
            className="bg-accent text-bg p-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
