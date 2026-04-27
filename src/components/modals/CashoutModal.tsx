import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, XCircle } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { MODAL_VARIANTS, TRANSITIONS } from '../../constants';
import { InputGroup } from '../ui/InputGroup';
import { Bet } from '../../types';

interface CashoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bet: Bet | null;
  cashoutAmount: string;
  setCashoutAmount: (val: string) => void;
  onConfirm: () => void;
}

export function CashoutModal({
  isOpen,
  onClose,
  bet,
  cashoutAmount,
  setCashoutAmount,
  onConfirm
}: CashoutModalProps) {
  if (!isOpen || !bet) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div 
        variants={MODAL_VARIANTS}
        initial="overlay"
        animate="overlayAnimate"
        exit="overlay"
        onClick={onClose}
        className="absolute inset-0 bg-bg/95 backdrop-blur-xl"
      />
      <motion.div
        variants={MODAL_VARIANTS}
        initial="content"
        animate="contentAnimate"
        exit="contentExit"
        transition={TRANSITIONS.spring}
        className="w-full max-w-md glass-card p-0 overflow-hidden relative border-border bg-surface/50 shadow-2xl"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-bg/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Encerrar Aposta</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-text-dim hover:text-text-main transition-colors p-2 hover:bg-surface rounded-full"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-bg/40 p-4 rounded-xl border border-border/50">
             <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">{bet.event}</p>
             <p className="text-xs font-bold text-text-main uppercase">{bet.market}</p>
             <div className="mt-3 flex justify-between items-end">
                <span className="text-[10px] font-black text-text-dim uppercase">Investimento:</span>
                <span className="text-sm font-black text-text-main">{formatCurrency(bet.stake)}</span>
             </div>
          </div>

          <InputGroup 
            label="Valor do Cash Out (R$)" 
            type="number" 
            step="0.01"
            autoFocus
            value={cashoutAmount} 
            onChange={(e) => setCashoutAmount(e.target.value)} 
          />

          <button 
            onClick={onConfirm}
            className="w-full bg-amber-500 text-bg py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
          >
            Confirmar Encerramento
          </button>
        </div>
      </motion.div>
    </div>
  );
}
