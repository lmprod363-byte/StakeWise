import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToastProps {
  message: string;
  type: 'success' | 'info' | 'loss';
  onClose?: () => void;
}

export function Toast({ message, type }: ToastProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20, x: '-50%' }}
      animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, scale: 0.9, y: 20, x: '-50%' }}
      className="fixed bottom-24 left-1/2 z-[100] pointer-events-none w-full max-w-xs px-4"
    >
      <div className={cn(
        "glass-card px-6 py-4 flex items-center gap-4 border-l-4",
        type === 'success' ? "border-accent shadow-accent/20" : 
        type === 'loss' ? "border-loss shadow-loss/20" :
        "border-text-dim shadow-black/40"
      )}>
        <div className={cn(
          "p-2 rounded-lg flex-shrink-0",
          type === 'success' ? "bg-accent text-bg" : 
          type === 'loss' ? "bg-loss text-white" :
          "bg-text-dim/10 text-text-dim"
        )}>
          {type === 'success' ? <TrendingUp className="w-5 h-5" /> : 
           type === 'loss' ? <TrendingDown className="w-5 h-5" /> :
           <CheckCircle2 className="w-5 h-5" />}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest leading-tight text-text-main">
          {message}
        </p>
      </div>
    </motion.div>
  );
}
