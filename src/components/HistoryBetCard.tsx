import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Clock, Check, X, Undo2 } from 'lucide-react';
import { Bet } from '../types';
import { formatCurrency, getBookmakerStyle, cn } from '../lib/utils';

interface HistoryBetCardProps {
  bet: Bet;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export function HistoryBetCard({ bet, selected, onToggleSelect }: HistoryBetCardProps) {
  const style = getBookmakerStyle(bet.bookmaker || '');
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onToggleSelect(bet.id)}
      className={cn(
        "p-4 rounded-xl border transition-all active:scale-[0.98]",
        selected ? "bg-accent/10 border-accent shadow-lg shadow-accent/5" : "bg-bg-dark border-border/50"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {selected ? (
            <CheckCircle2 className="w-4 h-4 text-accent" />
          ) : (
            <Circle className="w-4 h-4 text-text-dim" />
          )}
          <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-md border", style.bg, style.border, style.color)}>
            {bet.bookmaker || 'Outra'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-text-dim">{new Date(bet.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-[8px] font-medium text-text-dim/60 uppercase tracking-tighter">{bet.sport}</span>
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <h4 className="text-sm font-black text-text-main line-clamp-1">{bet.event}</h4>
        <p className="text-[10px] font-bold text-text-dim italic">{bet.league}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-bg/50 rounded-lg border border-border/30 mb-4">
        <div>
          <p className="text-[7px] font-black uppercase tracking-widest text-text-dim mb-1">Mercado</p>
          <p className="text-[10px] font-bold text-text-main line-clamp-1">{bet.market}</p>
        </div>
        <div>
          <p className="text-[7px] font-black uppercase tracking-widest text-text-dim mb-1">Seleção</p>
          <p className="text-[10px] font-bold text-accent">{bet.selection}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/20">
        <div className="flex gap-4">
          <div>
            <p className="text-[7px] font-black uppercase text-text-dim">Stake</p>
            <p className="text-xs font-black text-text-main">{formatCurrency(bet.stake)}</p>
          </div>
          <div>
            <p className="text-[7px] font-black uppercase text-text-dim">ODDS</p>
            <p className="text-xs font-black text-text-main">{bet.odds.toFixed(2)}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[7px] font-black uppercase text-text-dim">Resultado</p>
          <div className="flex items-center gap-1 justify-end">
            {bet.status === 'won' && <Check className="w-3 h-3 text-green-500" />}
            {bet.status === 'lost' && <X className="w-3 h-3 text-red-500" />}
            {bet.status === 'void' && <Undo2 className="w-3 h-3 text-blue-400" />}
            {bet.status === 'pending' && <Clock className="w-3 h-3 text-yellow-500" />}
            <span className={cn(
              "text-xs font-black tabular-nums",
              bet.profit > 0 ? "text-green-500" : bet.profit < 0 ? "text-red-500" : "text-text-dim"
            )}>
              {formatCurrency(bet.profit)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
