import React from 'react';
import { motion } from 'motion/react';
import { Wallet, XCircle, Check, ChevronRight, Plus } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { MODAL_VARIANTS, TRANSITIONS } from '../../constants';
import { Bankroll } from '../../types';

interface BankrollMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankrolls: Bankroll[];
  activeBankrollId: string | null;
  setActiveBankrollId: (id: string) => void;
  setIsAddingBankroll: (val: boolean) => void;
  showToast: (msg: string) => void;
}

export function BankrollMenuModal({
  isOpen,
  onClose,
  bankrolls,
  activeBankrollId,
  setActiveBankrollId,
  setIsAddingBankroll,
  showToast
}: BankrollMenuModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        variants={MODAL_VARIANTS}
        initial="overlay"
        animate="overlayAnimate"
        exit="overlay"
        onClick={onClose}
        className="absolute inset-0 bg-bg/90 backdrop-blur-md"
      />
      <motion.div
        variants={MODAL_VARIANTS}
        initial="content"
        animate="contentAnimate"
        exit="contentExit"
        transition={TRANSITIONS.bounce}
        className="stat-card p-0 w-full max-sm mb-4 border-border bg-surface shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="p-6 border-b border-border bg-bg/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Wallet className="w-5 h-5 text-accent" />
              Minhas Bancas
            </h3>
            <button onClick={onClose} className="text-text-dim hover:text-text-main transition-colors p-1 hover:bg-surface rounded-full">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim mt-2 opacity-50">Escolha o ambiente de gestão</p>
        </div>
        
        <div className="p-4 max-h-[450px] overflow-y-auto no-scrollbar space-y-3">
          {bankrolls.map(b => (
            <motion.button
              key={b.id}
              whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.02)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveBankrollId(b.id);
                localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', b.id);
                onClose();
                showToast(`Banca "${b.name}" ativada!`);
              }}
              className={cn(
                "w-full p-5 rounded-2xl border flex items-center justify-between transition-all group overflow-hidden relative",
                b.id === activeBankrollId 
                  ? "bg-accent/10 border-accent shadow-[0_0_30px_-5px_rgba(34,197,94,0.1)]" 
                  : "bg-surface border-border hover:border-accent/40"
              )}
            >
              {b.id === activeBankrollId && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full" />
              )}
              <div className="flex flex-col items-start relative z-10">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-black uppercase tracking-tight",
                    b.id === activeBankrollId ? "text-accent" : "text-text-main"
                  )}>{b.name}</span>
                  {b.id === activeBankrollId && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent text-[7px] text-bg rounded-full font-black animate-pulse">
                      <Check className="w-2 h-2" />
                      ATIVA
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 opacity-60">
                  <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">
                    Unit: {formatCurrency(b.unitSize)}
                  </span>
                  <span className="w-1 h-1 bg-border rounded-full" />
                  <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">
                    {(b.total / b.unitSize).toFixed(0)}u
                  </span>
                </div>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 transition-all duration-300",
                b.id === activeBankrollId ? "text-accent translate-x-0 opacity-100" : "text-text-dim opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
              )} />
            </motion.button>
          ))}
        </div>

        <div className="p-4 bg-bg/40 border-t border-border">
          <button 
            onClick={() => {
              onClose();
              setIsAddingBankroll(true);
            }}
            className="w-full py-4 border-2 border-border border-dashed rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim hover:border-accent/50 hover:text-accent transition-all hover:bg-accent/5"
          >
            <Plus className="w-4 h-4" />
            Criar Novo Ambiente
          </button>
        </div>
      </motion.div>
    </div>
  );
}
