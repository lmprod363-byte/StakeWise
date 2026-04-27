import React from 'react';
import { motion } from 'motion/react';
import { MODAL_VARIANTS, TRANSITIONS } from '../../constants';

interface BalanceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustingBookmaker: string | null;
  adjustmentValue: string;
  setAdjustmentValue: (val: string) => void;
  handleBalanceAdjustment: () => void;
}

export function BalanceAdjustmentModal({
  isOpen,
  onClose,
  adjustingBookmaker,
  adjustmentValue,
  setAdjustmentValue,
  handleBalanceAdjustment
}: BalanceAdjustmentModalProps) {
  if (!isOpen || !adjustingBookmaker) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        variants={MODAL_VARIANTS}
        initial="overlay"
        animate="overlayAnimate"
        exit="overlay"
        onClick={onClose}
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
      />
      <motion.div 
        variants={MODAL_VARIANTS}
        initial="content"
        animate="contentAnimate"
        exit="contentExit"
        transition={TRANSITIONS.spring}
        className="relative bg-surface border border-border p-8 rounded-2xl w-full max-w-md shadow-2xl z-10"
      >
        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Ajustar Saldo Real</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-6">
          Ajustando banca na <span className="text-accent">{adjustingBookmaker}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1 block">Saldo Atual na Casa (R$)</label>
            <input 
              type="number"
              step="0.01"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg p-4 text-xl font-black tabular-nums focus:border-accent outline-none"
              autoFocus
            />
            <p className="text-[9px] text-text-dim/60 italic mt-2">
              O sistema criará um registro de ajuste para igualar o saldo informado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              onClick={onClose}
              className="py-3 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest text-text-dim hover:text-text-main transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleBalanceAdjustment}
              className="py-3 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest text-bg bg-accent hover:brightness-110 transition-all shadow-lg shadow-accent/20"
            >
              Confirmar Ajuste
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
