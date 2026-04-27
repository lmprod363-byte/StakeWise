import React, { memo } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { 
  CheckSquare, 
  Square, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  DollarSign, 
  Settings2, 
  Trash2,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Pencil,
  Loader2
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Bet } from '../types';
import { StatusBadge } from './StatusBadge';
import { RenderEventWithScore } from './RenderEventWithScore';

interface BetComponentProps {
  bet: Bet;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  syncingBetId: string | null;
  isSyncingScores: boolean;
  isSyncingResults: boolean;
  onSyncOnlyScores: (bets: Bet[]) => void;
  onSyncResults: (bets: Bet[], isManual?: boolean) => void;
  onUpdateStatus: (id: string, status: Bet['status']) => void;
  onEdit: (bet: Bet) => void;
  onDelete: (id: string) => void;
  onCashout: (bet: Bet) => void;
  unitSize: number;
  getBookmakerStyle: (name: string) => any;
  safeNewDate: (val: any) => Date;
}

export const HistoryBetRow = memo(({ 
  bet, 
  selected, 
  onToggleSelect, 
  syncingBetId, 
  isSyncingScores, 
  isSyncingResults, 
  onSyncOnlyScores, 
  onSyncResults, 
  onUpdateStatus, 
  onEdit, 
  onDelete, 
  onCashout,
  unitSize,
  getBookmakerStyle,
  safeNewDate
}: BetComponentProps) => {
  const betDateFormatted = format(safeNewDate(bet.date), "HH:mm");
  const bmStyle = getBookmakerStyle(bet.bookmaker || 'Geral');
  
  return (
    <motion.tr 
      key={bet.id} 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-bg/90 backdrop-blur-xl border-2 transition-all duration-500 rounded-3xl overflow-hidden group relative mb-4 hover:scale-[1.005] hover:shadow-2xl hover:shadow-indigo-500/5",
        bet.status === 'won' || bet.status === 'half_win' ? "border border-accent shadow-[0_0_12px_rgba(0,255,149,0.15)] bg-accent/[0.01]" : 
        bet.status === 'lost' || bet.status === 'half_loss' ? "border border-loss shadow-[0_0_12px_rgba(255,62,62,0.15)] bg-loss/[0.01]" : 
        bet.status === 'void' ? "border border-refund shadow-[0_0_12px_rgba(255,184,0,0.15)] bg-refund/[0.01]" : 
        bet.status === 'cashout' ? "border-amber-500 border-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-amber-500/[0.02]" : "border border-border/60 bg-surface/40",
        bet.status !== 'pending' && "border",
        selected ? "ring-2 ring-accent border-accent" : ""
      )}
    >
      <td className="px-6 py-5 rounded-l-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/5 blur-[40px] rounded-full -translate-x-12 -translate-y-12" />
        <div className="relative z-10">
          <button 
            onClick={() => onToggleSelect(bet.id)}
            className="text-text-dim hover:text-accent transition-colors"
          >
            {selected ? (
              <CheckSquare className="w-5 h-5 text-accent" />
            ) : (
              <Square className="w-5 h-5 opacity-20" />
            )}
          </button>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-1 h-10 rounded-full shadow-[0_0_10px_currentColor]",
            (bet.status === 'won' || bet.status === 'half_win') ? "bg-accent text-accent" : 
            (bet.status === 'lost' || bet.status === 'half_loss') ? "bg-loss text-loss" : 
            bet.status === 'void' ? "bg-refund text-refund" : "bg-text-dim/20 text-transparent"
          )} />
          <div>
            <div className="font-black text-text-main text-sm uppercase tracking-tight flex items-center gap-2">
              {bet.market}
              {(bet.bookmaker || 'Geral') && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] leading-none border shadow-sm shrink-0",
                  bmStyle.bg,
                  bmStyle.border,
                  bmStyle.color
                )}>
                  {bet.bookmaker || 'Geral'}
                </span>
              )}
              <StatusBadge 
                status={bet.status} 
                isSyncing={bet.id === syncingBetId} 
              />
            </div>
            <div className="text-[10px] text-text-dim font-black uppercase mt-1 tracking-wider opacity-80 flex items-center gap-2 flex-wrap">
              {betDateFormatted} 
              • <RenderEventWithScore event={bet.event} score={bet.score} matchTime={bet.matchTime} />
              {bet.league && <span className="opacity-60">• {bet.league}</span>}
              {bet.betId && <span className="opacity-40 text-[8px]">• {bet.betId}</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 font-bold text-sm text-center">
        <div className="flex flex-col items-center">
          <span className="font-mono text-text-main">{(bet.stake / unitSize).toFixed(2)}u</span>
          <span className="text-[9px] font-black text-text-dim/60 uppercase tracking-widest leading-none mt-1">
            {formatCurrency(bet.stake)}
          </span>
        </div>
      </td>
      <td className="px-6 py-5 font-black font-mono text-sm text-accent text-center opacity-80">{bet.odds.toFixed(2)}</td>
      <td className="px-6 py-5 text-right">
        <div className={cn(
          "font-black text-sm font-mono",
          (bet.status === 'won' || bet.status === 'half_win') ? "text-accent" : 
          (bet.status === 'lost' || bet.status === 'half_loss') ? "text-loss" : 
          bet.status === 'void' ? "text-refund" : "text-text-dim"
        )}>
          {bet.status === 'pending' ? <span className="opacity-30">---</span> : formatCurrency(bet.stake + bet.profit)}
          {bet.status !== 'pending' && (
            <div className={cn(
              "text-[9px] font-black uppercase tracking-widest mt-0.5",
              (bet.status === 'won' || bet.status === 'half_win') ? "text-accent" : 
              (bet.status === 'lost' || bet.status === 'half_loss') ? "text-loss" : 
              bet.status === 'void' ? "text-refund" : "text-text-dim"
            )}>
              {(bet.profit > 0 ? '+' : '') + formatCurrency(bet.profit)}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-5 rounded-r-2xl text-right">
        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
            <div className="flex items-center gap-1 bg-surface/80 p-1 rounded-lg border border-border/50 backdrop-blur-sm shadow-xl">
              {bet.status === 'pending' && (
                <button 
                  onClick={() => onSyncOnlyScores([bet])}
                  disabled={isSyncingScores || isSyncingResults}
                  className={cn(
                    "p-1.5 rounded-md transition-all hover:scale-110 border border-transparent",
                    (syncingBetId === bet.id && isSyncingScores) ? "animate-spin text-accent" : "text-accent/60 hover:text-accent hover:border-accent/20"
                  )}
                  title="Buscar Placar Real"
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}
              
              <button 
                onClick={() => onSyncResults([bet], true)}
                disabled={isSyncingResults || isSyncingScores}
                className={cn(
                  "p-1.5 rounded-md transition-all hover:scale-110",
                  (syncingBetId === bet.id && isSyncingResults) ? "animate-spin text-accent" : "text-text-dim hover:text-accent"
                )}
                title="Conferir Resultado Final"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              
              <div className="w-px h-4 bg-border/40 mx-1" />
              
              <button 
                onClick={() => onUpdateStatus(bet.id, bet.status === 'won' ? 'pending' : 'won')}
                className={cn(
                  "p-1.5 rounded-md transition-all hover:scale-110",
                  bet.status === 'won' ? "bg-accent text-bg" : "text-text-dim hover:text-accent"
                )}
                title="Ganha"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onUpdateStatus(bet.id, bet.status === 'half_win' ? 'pending' : 'half_win')}
                className={cn(
                  "p-1.5 rounded-md transition-all hover:scale-110",
                  bet.status === 'half_win' ? "bg-accent text-bg" : "text-text-dim hover:text-accent"
                )}
                title="Meio Green"
              >
                <div className="text-[9px] font-black">½G</div>
              </button>
              <button 
                onClick={() => onUpdateStatus(bet.id, bet.status === 'lost' ? 'pending' : 'lost')}
                className={cn(
                  "p-1.5 rounded-md transition-all hover:scale-110",
                  bet.status === 'lost' ? "bg-loss text-white" : "text-text-dim hover:text-loss"
                )}
                title="Perdida"
              >
                <XCircle className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onUpdateStatus(bet.id, bet.status === 'half_loss' ? 'pending' : 'half_loss')}
                className={cn(
                  "p-1.5 rounded-md transition-all hover:scale-110",
                  bet.status === 'half_loss' ? "bg-loss text-white" : "text-text-dim hover:text-loss"
                )}
                title="Meio Red"
              >
                <div className="text-[9px] font-black">½R</div>
              </button>
              <button 
                onClick={() => onUpdateStatus(bet.id, bet.status === 'void' ? 'pending' : 'void')}
                className={cn(
                  "p-1.5 rounded-md transition-all hover:scale-110",
                  bet.status === 'void' ? "bg-refund text-white" : "text-text-dim hover:text-refund"
                )}
                title="Reembolsada"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onCashout(bet)}
                className={cn(
                  "p-1.5 rounded-md transition-all hover:scale-110",
                  bet.status === 'cashout' ? "bg-amber-500 text-bg" : "text-text-dim hover:text-amber-500"
                )}
                title="Encerrar"
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onEdit(bet)}
                className="p-1.5 text-text-dim hover:text-accent hover:bg-accent/5 rounded-md transition-all"
                title="Editar"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(bet.id)}
                className="p-1.5 text-text-dim hover:text-loss hover:bg-loss/5 rounded-md transition-all"
                title="Mover para Lixeira"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
        </div>
      </td>
    </motion.tr>
  );
});

export const HistoryBetCard = memo(({
  bet,
  selected,
  onToggleSelect,
  syncingBetId,
  isSyncingScores,
  isSyncingResults,
  onSyncOnlyScores,
  onSyncResults,
  onUpdateStatus,
  onEdit,
  onDelete,
  onCashout,
  unitSize,
  getBookmakerStyle,
  safeNewDate
}: BetComponentProps) => {
  const betDateFormatted = format(safeNewDate(bet.date), "HH:mm");
  const bmStyle = getBookmakerStyle(bet.bookmaker || 'Geral');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      key={bet.id}
      className={cn(
        "bg-bg/90 backdrop-blur-2xl border-2 p-6 rounded-[32px] space-y-4 shadow-2xl transition-all duration-500 active:scale-[0.99] relative overflow-hidden mb-6",
        (bet.status === 'won' || bet.status === 'half_win') ? "border-accent border-4 shadow-[0_0_15px_rgba(0,255,149,0.2)] bg-accent/[0.01]" : 
        (bet.status === 'lost' || bet.status === 'half_loss') ? "border-loss border-4 shadow-[0_0_15px_rgba(255,62,62,0.2)] bg-loss/[0.01]" : 
        bet.status === 'void' ? "border-refund border-4 shadow-[0_0_15px_rgba(255,184,0,0.2)] bg-refund/[0.01]" : 
        bet.status === 'cashout' ? "border-amber-500 border-4 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-amber-500/[0.02]" : "border-border/60 bg-surface/40",
        selected && "ring-2 ring-accent border-accent"
      )}
    >
       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full translate-x-12 -translate-y-12" />
       <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => onToggleSelect(bet.id)} className="transition-transform active:scale-90">
               {selected ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5 text-text-dim/30" />}
            </button>
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-text-main bg-bg px-2 py-1 rounded-lg border border-border/40 shadow-sm leading-none min-w-[50px]">
                {betDateFormatted}
              </span>
              {(bet.bookmaker || 'Geral') && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] leading-none border shadow-lg",
                  bmStyle.bg,
                  bmStyle.border,
                  bmStyle.color,
                  bmStyle.glow
                )}>
                  <div className={cn("w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]")} />
                  {bet.bookmaker || 'Geral'}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={bet.status} isSyncing={bet.id === syncingBetId} />
       </div>
       
       <div className="space-y-1">
         <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[9px] font-black uppercase tracking-widest text-accent/80">
              {bet.sport} • {betDateFormatted}
            </p>
            {bet.isLive && <Zap className="w-2.5 h-2.5 text-accent fill-accent" />}
         </div>
         <h4 className="text-base font-black uppercase text-text-main leading-tight py-1">{bet.market}</h4>
           <div className="space-y-1 pt-2">
              <p className="text-[11px] font-bold text-text-dim uppercase opacity-60 leading-tight">
                <RenderEventWithScore event={bet.event} score={bet.score} matchTime={bet.matchTime} mobile />
              </p>
            {(bet.league || bet.betId) && (
              <div className="flex items-center gap-3">
                {bet.league && <span className="text-[9px] font-black text-text-dim/60 uppercase tracking-widest">Liga: {bet.league}</span>}
                {bet.betId && <span className="text-[8px] font-bold text-text-dim/40 uppercase tracking-tighter">Ref: {bet.betId}</span>}
              </div>
            )}
         </div>
       </div>

       <div className="grid grid-cols-3 gap-2 border-t border-b border-border/30 py-3">
          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Stake</p>
            <p className="text-xs font-mono font-bold leading-none">{(bet.stake / unitSize).toFixed(1)}u</p>
            <p className="text-[8px] font-bold text-text-dim mt-1">{formatCurrency(bet.stake)}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Odd</p>
            <p className="text-xs font-mono font-bold text-accent">{bet.odds.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Retorno</p>
            <p className="text-xs font-mono font-bold text-text-main leading-none">
              {bet.status === 'pending' ? '-' : formatCurrency(bet.stake + bet.profit)}
            </p>
            {bet.status !== 'pending' && bet.profit !== 0 && (
              <p className={cn(
                 "text-[8px] font-bold mt-1",
                 bet.profit > 0 ? "text-accent" : "text-loss"
               )}>
                 {bet.profit > 0 ? '+' : ''}{formatCurrency(bet.profit)}
              </p>
            )}
          </div>
       </div>

       <div className="mt-8 space-y-3">
          <div className="bg-bg/60 backdrop-blur-2xl rounded-xl md:rounded-2xl p-1 flex items-center justify-between border border-white/5 shadow-xl">
             <div className="flex items-center gap-1 focus-within:ring-0 overflow-x-auto no-scrollbar">
               <button 
                 onClick={(e) => { e.stopPropagation(); onSyncOnlyScores([bet]); }}
                 disabled={isSyncingScores || isSyncingResults}
                 className={cn(
                   "p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all border shrink-0 outline-none active:scale-95",
                   (syncingBetId === bet.id && isSyncingScores)
                     ? "bg-blue-500 border-blue-500 text-white animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.4)]" 
                     : "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-sm hover:bg-blue-500/20 hover:scale-105"
                 )}
                 title="Buscar Placar Real"
               >
                 {syncingBetId === bet.id && isSyncingScores ? (
                   <Loader2 className="w-4 h-4 animate-spin" />
                 ) : (
                   <Zap className="w-4 h-4" />
                 )}
               </button>

               <button 
                 onClick={(e) => { e.stopPropagation(); onSyncResults([bet], true); }}
                 disabled={isSyncingResults || isSyncingScores}
                 className={cn(
                   "p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all border shrink-0 outline-none active:scale-95",
                   (syncingBetId === bet.id && isSyncingResults)
                     ? "bg-purple-500 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]" 
                     : "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:scale-105"
                 )}
                 title="Atualizar status da aposta"
               >
                 {syncingBetId === bet.id && isSyncingResults ? (
                   <Loader2 className="w-4 h-4 animate-spin" />
                 ) : (
                   <RefreshCw className="w-4 h-4" />
                 )}
               </button>
               
               <div className="w-px h-6 bg-border/20 mx-1 shrink-0" />

               <button 
                 onClick={(e) => { e.stopPropagation(); onUpdateStatus(bet.id, bet.status === 'won' ? 'pending' : 'won'); }}
                 className={cn(
                   "p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all border shrink-0 outline-none active:scale-95",
                   bet.status === 'won' 
                     ? "bg-accent border-accent text-bg shadow-[0_0_10px_rgba(0,255,149,0.4)]" 
                     : "bg-accent/10 border-accent/20 text-accent hover:bg-accent/20"
                 )}
                 title="Green"
               >
                 <CheckCircle2 className="w-4 h-4" />
               </button>
               <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(bet.id, bet.status === 'lost' ? 'pending' : 'lost'); }}
                  className={cn(
                    "p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all border shrink-0 outline-none active:scale-95",
                    bet.status === 'lost' 
                      ? "bg-loss border-loss text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]" 
                      : "bg-loss/10 border-loss/20 text-loss hover:bg-loss/20"
                  )}
                  title="Red"
               >
                 <XCircle className="w-4 h-4" />
               </button>
               <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(bet.id, bet.status === 'void' ? 'pending' : 'void'); }}
                  className={cn(
                    "p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all border shrink-0 outline-none active:scale-95",
                    bet.status === 'void' 
                      ? "bg-refund border-refund text-white shadow-[0_0_10px_rgba(255,184,0,0.4)]" 
                      : "bg-refund/10 border-refund/20 text-refund hover:bg-refund/20"
                  )}
                  title="Reembolso"
               >
                 <RotateCcw className="w-4 h-4" />
               </button>
             </div>

             <div className="flex items-center gap-1.5 ml-2 pr-2">
               <button 
                 onClick={(e) => { e.stopPropagation(); onEdit(bet); }}
                 className="p-2.5 bg-surface/80 text-text-dim hover:text-accent rounded-xl border border-border/50 transition-all hover:scale-105 active:scale-90"
               >
                 <Pencil className="w-4 h-4" />
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onDelete(bet.id); }}
                 className="p-2.5 bg-loss/5 text-loss/60 hover:text-loss rounded-xl border border-loss/10 transition-all hover:scale-105 active:scale-90"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
             </div>
          </div>
       </div>
    </motion.div>
  );
});
