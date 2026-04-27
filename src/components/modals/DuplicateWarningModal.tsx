import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Bet } from '../../types';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Omit<Bet, 'id' | 'profit'> | null;
  onConfirm: (data: Omit<Bet, 'id' | 'profit'>) => void;
}

export function DuplicateWarningModal({
  isOpen,
  onClose,
  data,
  onConfirm
}: DuplicateWarningModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass-card max-w-sm w-full p-6 border border-white/10 shadow-2xl space-y-6"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-500 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tighter text-text-main">Aposta Duplicada</h3>
            <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Identificamos um registro idêntico</p>
          </div>
        </div>

        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1 truncate">{data.event}</p>
              <p className="text-[11px] font-bold text-text-main uppercase">{data.market}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-accent uppercase">{data.selection}</p>
              <p className="text-[10px] font-black text-text-main mt-1">
                @{data.odds} • {formatCurrency(Number(data.stake))}
              </p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-text-main/70 font-medium leading-relaxed text-center px-4">
          Esta entrada já existe em seu histórico. Deseja registrar novamente mesmo assim?
        </p>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-[9px] font-black uppercase tracking-widest text-text-dim hover:bg-white/5 transition-all"
          >
            Não, Cancelar
          </button>
          <button 
            onClick={() => onConfirm(data)}
            className="flex-1 py-3 rounded-xl bg-accent text-bg text-[9px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-accent/20 transition-all"
          >
            Sim, Manter
          </button>
        </div>
      </motion.div>
    </div>
  );
}
