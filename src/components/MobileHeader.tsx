import React from 'react';
import { ChevronDown, LogOut, TrendingDown, TrendingUp, Plus, RotateCcw, XCircle } from 'lucide-react';
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
  bookmakerBalances: [string, number][];
  getBookmakerStyle: (bm: string) => any;
  setAdjustingBookmaker: (bm: string | null) => void;
  setAdjustmentValue: (val: string) => void;
}

export function MobileHeader({
  bankrollName,
  setIsBankrollMenuOpen,
  signOut,
  showBalanceFeedback,
  balanceDelta,
  currentBalance,
  setActiveTab,
  bookmakerBalances,
  getBookmakerStyle,
  setAdjustingBookmaker,
  setAdjustmentValue
}: MobileHeaderProps) {
  const [showBalanceDetails, setShowBalanceDetails] = React.useState(false);

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
          
          <button 
            onClick={() => setShowBalanceDetails(true)}
            className="bg-surface px-3 py-1.5 rounded-lg border border-border flex flex-col items-center min-w-[80px] relative active:scale-95 transition-all"
          >
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
          </button>

          <button 
            onClick={() => setActiveTab('register')}
            className="bg-accent text-bg p-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Balance Details Modal (Mobile) */}
      <AnimatePresence>
        {showBalanceDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[9999] flex items-end justify-center p-4"
            onClick={() => setShowBalanceDetails(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-bg border border-border w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">Distribuição de Banca</h3>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider">Saldos por Casa</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBalanceDetails(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5 text-text-dim" />
                </button>
              </div>
              
              <div className="p-6 space-y-3">
                {bookmakerBalances.map(([bm, amount]) => {
                  const style = getBookmakerStyle(bm);
                  return (
                    <div 
                      key={`mobile-bal-${bm}`} 
                      className={cn("flex items-center justify-between p-4 rounded-2xl border backdrop-blur-md", style.bg, style.border)}
                    >
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", style.color)}>{bm}</span>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-lg font-black tabular-nums tracking-tighter", style.color)}>
                          {formatCurrency(amount)}
                        </span>
                        <button 
                          onClick={() => {
                            setAdjustingBookmaker(bm);
                            setAdjustmentValue(amount.toFixed(2));
                            setShowBalanceDetails(false);
                          }}
                          className="p-2 bg-bg/20 hover:bg-bg/40 rounded-xl transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-current opacity-60" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                <div className="bg-accent/5 p-5 rounded-2xl border border-accent/20 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Patrimônio Total</span>
                    <span className="text-2xl font-black tracking-tighter text-accent">
                      {formatCurrency(currentBalance)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 pt-0 pb-10 sm:pb-6">
                <button
                  onClick={() => setShowBalanceDetails(false)}
                  className="w-full py-4 bg-surface border border-border text-text-main rounded-2xl text-xs font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
