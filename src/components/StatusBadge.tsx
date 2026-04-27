import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Bet } from '../types';

interface StatusBadgeProps {
  status: Bet['status'];
  isSyncing?: boolean;
}

export function StatusBadge({ status, isSyncing }: StatusBadgeProps) {
  if (isSyncing) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-[0.12em] bg-accent/20 text-accent border border-accent/40 shadow-[0_0_10px_rgba(0,255,149,0.1)] animate-pulse uppercase backdrop-blur-md">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Sync...
      </span>
    );
  }

  const configs = {
    won: { 
      label: 'GREEN', 
      bg: 'bg-accent/15',
      text: 'text-accent',
      border: 'border-accent/30',
      shadow: 'shadow-[0_0_15px_rgba(0,255,149,0.08)]',
      dotColor: 'bg-accent shadow-[0_0_6px_currentColor]'
    },
    half_win: { 
      label: '½ GREEN', 
      bg: 'bg-accent/10',
      text: 'text-accent/90',
      border: 'border-accent/20',
      shadow: 'shadow-[0_0_10px_rgba(0,255,149,0.04)]',
      dotColor: 'bg-accent/80'
    },
    lost: { 
      label: 'RED', 
      bg: 'bg-loss/15',
      text: 'text-loss',
      border: 'border-loss/30',
      shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.08)]',
      dotColor: 'bg-loss shadow-[0_0_6px_currentColor]'
    },
    half_loss: { 
      label: '½ RED', 
      bg: 'bg-loss/10',
      text: 'text-loss/90',
      border: 'border-loss/20',
      shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.04)]',
      dotColor: 'bg-loss/80'
    },
    void: { 
      label: 'VOIDED', 
      bg: 'bg-refund/15',
      text: 'text-refund',
      border: 'border-refund/30',
      shadow: 'shadow-[0_0_15px_rgba(255,184,0,0.08)]',
      dotColor: 'bg-refund shadow-[0_0_6px_currentColor]'
    },
    pending: { 
      label: 'PENDING', 
      bg: 'bg-white/5',
      text: 'text-text-dim',
      border: 'border-white/10',
      shadow: 'shadow-none',
      dotColor: 'bg-text-dim/30'
    },
    cashout: { 
      label: 'CASH OUT', 
      bg: 'bg-amber-500/20',
      text: 'text-amber-500',
      border: 'border-amber-500/40',
      shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      dotColor: 'bg-amber-500 shadow-[0_0_8px_currentColor] animate-pulse'
    },
  };
  
  const config = configs[status] || configs.pending;

  return (
    <span className={cn(
      "relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.12em] border backdrop-blur-xl transition-all duration-300 cursor-default select-none group",
      config.bg, config.text, config.border, config.shadow
    )}>
      {/* Glossy overlay effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
      
      <div className={cn("w-1 h-1 rounded-full shrink-0 transition-transform group-hover:scale-125", config.dotColor)} />
      <span className="relative z-10">{config.label}</span>
    </span>
  );
}
