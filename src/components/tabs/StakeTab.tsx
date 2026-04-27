import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { Bankroll, AllTimeStats } from '../../types';
import { PAGE_VARIANTS, TRANSITIONS } from '../../constants';

interface StakeTabProps {
  activeBankrollId: string | null;
  bankroll: Bankroll;
  allTimeStats: AllTimeStats;
  saveBankroll: (data: Partial<Bankroll>) => Promise<void>;
  setLocalUnit: (val: string) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'loss') => void;
}

export function StakeTab({
  activeBankrollId,
  bankroll,
  allTimeStats,
  saveBankroll,
  setLocalUnit,
  showToast
}: StakeTabProps) {
  return (
    <motion.div 
      key={`stake-${activeBankrollId}`}
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={TRANSITIONS.smooth}
      className="space-y-8"
    >
      {/* Seção de Sugestão de Stake */}
      <div className="glass-card p-8 border-indigo-500/20 bg-indigo-500/[0.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl">
                  <ShieldCheck className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Sugestão de Stake</h3>
                  <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => saveBankroll({ ...bankroll, stakeCalculationMode: 'initial' })}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            (bankroll.stakeCalculationMode || 'initial') === 'initial'
                                ? "bg-indigo-500 text-bg shadow-lg shadow-indigo-500/20"
                                : "bg-surface text-text-dim border border-border hover:border-indigo-500/50"
                        )}
                      >
                        Inicial (Base: {formatCurrency(bankroll.total)})
                      </button>
                      <button 
                        onClick={() => saveBankroll({ ...bankroll, stakeCalculationMode: 'current' })}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            bankroll.stakeCalculationMode === 'current'
                                ? "bg-indigo-500 text-bg shadow-lg shadow-indigo-500/20"
                                : "bg-surface text-text-dim border border-border hover:border-indigo-500/50"
                        )}
                      >
                        Real (Base: {formatCurrency(allTimeStats.currentBalance)})
                      </button>
                  </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-bg border border-border rounded-xl">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-dim mb-2">Configuração Atual (Fixa)</p>
                  <p className="text-xl font-black text-text-main">{formatCurrency(bankroll.unitSize)}</p>
                  <p className="text-[9px] font-bold text-text-dim/60 uppercase tracking-tighter mt-1">
                      {(bankroll.unitSize / (bankroll.stakeCalculationMode === 'current' ? allTimeStats.currentBalance : bankroll.total) * 100).toFixed(1)}% da {(bankroll.stakeCalculationMode === 'current' ? 'banca real' : 'banca inicial')}
                  </p>
                </div>
                <div className="p-4 bg-bg border border-indigo-500/30 rounded-xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Sugerida (Banca Atual)</p>
                  <p className="text-xl font-black text-indigo-400">{formatCurrency(allTimeStats.currentBalance * 0.02)}</p>
                  <p className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-tighter mt-1">Manutenção: 2% do saldo real</p>
                  <button 
                    onClick={() => {
                      const newVal = (allTimeStats.currentBalance * 0.02).toFixed(2);
                      saveBankroll({ ...bankroll, unitSize: parseFloat(newVal) });
                      setLocalUnit(newVal);
                      showToast("Unidade atualizada com base na banca atual!", "success");
                    }}
                    className="absolute bottom-2 right-2 p-1.5 bg-indigo-500 text-bg rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      title="Aplicar esta sugestão"
                    >
                      <Check className="w-3 h-3" />
                  </button>
                </div>
              </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
            {[0.001, 0.0025, 0.005, 0.0075, 0.01, 0.0125, 0.015, 0.0175, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05].map((pct) => {
                const baseValue = bankroll.stakeCalculationMode === 'current' ? allTimeStats.currentBalance : bankroll.total;
                const baseLabel = bankroll.stakeCalculationMode === 'current' ? 'Banca Real' : 'Banca Inicial';
                
                return (
                <button 
                    key={pct}
                    onClick={() => {
                        const newVal = (baseValue * pct).toFixed(2);
                        saveBankroll({ ...bankroll, unitSize: parseFloat(newVal) });
                        setLocalUnit(newVal);
                        showToast(`Unidade ajustada para ${(pct * 100).toFixed(2)}% da ${baseLabel.toLowerCase()}`, "success");
                    }}
                    className="p-4 bg-surface/50 border border-border rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
                >
                    <p className="text-[8px] font-black uppercase tracking-widest text-text-dim group-hover:text-indigo-400 transition-colors">{(pct * 100).toFixed(2)}% da {baseLabel}</p>
                    <p className="text-sm font-black text-text-main mt-1">{formatCurrency(baseValue * pct)}</p>
                </button>
                );
            })}
          </div>
      </div>
    </motion.div>
  );
}
