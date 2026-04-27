import React from 'react';
import { motion } from 'motion/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check, Trash2, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Bankroll } from '../types';

interface SortableBankrollItemProps {
  b: Bankroll;
  activeBankrollId: string;
  setActiveBankrollId: (id: string) => void;
  deleteBankroll: (id: string) => void;
  showToast: (m: string) => void;
}

export function SortableBankrollItem({ 
  b, 
  activeBankrollId, 
  setActiveBankrollId, 
  deleteBankroll, 
  showToast 
}: SortableBankrollItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: b.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1
  };

  return (
    <motion.div 
        ref={setNodeRef}
        style={style}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
            "p-3 rounded-xl border flex items-center gap-3 transition-all group relative overflow-hidden",
            b.id === activeBankrollId 
              ? "bg-accent/[0.08] border-accent/50 shadow-lg shadow-accent/5" 
              : "bg-surface border-border hover:border-accent/30 hover:bg-white/[0.02]",
            isDragging && "opacity-100 z-50 bg-[#1A1D23] border-accent shadow-2xl scale-[1.03] shadow-accent/20 cursor-grabbing"
        )}
    >
        <button 
          {...attributes} 
          {...listeners}
          className="p-1.5 hover:bg-white/10 rounded-lg cursor-grab active:cursor-grabbing text-text-dim/30 hover:text-accent transition-all"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {b.id === activeBankrollId && (
           <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full translate-x-8 -translate-y-8" />
        )}

        <div onClick={() => {
            setActiveBankrollId(b.id);
            localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', b.id);
            showToast(`Banca "${b.name}" ativada!`);
        }} className="flex-1 cursor-pointer relative z-10 py-1">
            <div className="flex items-center gap-2">
                <p className="font-black text-sm uppercase">{b.name}</p>
                {b.id === activeBankrollId && (
                   <span className="text-[7px] bg-accent text-bg px-1.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                      <Check className="w-2 h-2" />
                      ATIVA
                   </span>
                )}
            </div>
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-0.5 opacity-60">
                Inicial: {formatCurrency(b.total)} • Unit: {formatCurrency(b.unitSize)}
            </p>
        </div>
        
        <div className="flex items-center gap-1 relative z-10">
            <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBankroll(b.id);
                }}
                className="p-2 text-text-dim hover:text-loss transition-colors hover:bg-loss/10 rounded-lg opacity-0 group-hover:opacity-100"
                title="Excluir Banca"
            >
                <Trash2 className="w-4 h-4" />
            </button>
            <ChevronRight className={cn(
               "w-4 h-4 transition-all duration-300",
               b.id === activeBankrollId ? "text-accent opacity-100" : "text-text-dim opacity-40 group-hover:opacity-100"
            )} />
        </div>
    </motion.div>
  );
}
