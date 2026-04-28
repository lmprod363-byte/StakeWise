import React from 'react';
import { 
  Filter, 
  X, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  RotateCcw, 
  Trash2, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  ChevronDown, 
  CheckSquare, 
  Square, 
  Zap, 
  Pencil 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency, safeNewDate, getBookmakerStyle } from '../../lib/utils';
import { Bet, Bankroll } from '../../types';
import { PAGE_VARIANTS, TRANSITIONS, STAGGER_CONTAINER, STAGGER_ITEM, BOOKMAKER_CONFIGS } from '../../constants';
import { HistoryBetRow, HistoryBetCard } from '../HistoryBetItem';

interface BetsTabProps {
  activeBankrollId: string | null;
  historySearchTerm: string;
  setHistorySearchTerm: (val: string) => void;
  selectedBetIds: Set<string>;
  setSelectedBetIds: (ids: Set<string>) => void;
  updateStatusForSelected: (status: Bet['status']) => void;
  userBookmakers: string[];
  bets: Bet[];
  updateBookmakerForSelected: (bm: string) => void;
  restoreSelectedBets: () => Promise<void>;
  permanentlyDeleteSelectedBets: () => Promise<void>;
  syncResults: (betsToSync?: Bet[], isManual?: boolean) => Promise<void>;
  isSyncingResults: boolean;
  deleteSelectedBets: () => Promise<void>;
  historyStatusFilter: string;
  setHistoryStatusFilter: (val: string) => void;
  historyBookmakerFilter: string[];
  setHistoryBookmakerFilter: (val: string[] | ((prev: string[]) => string[])) => void;
  manualSyncProgress: number;
  groupedHistory: [string, any][];
  collapsedDates: Set<string>;
  toggleDateCollapse: (date: string) => void;
  toggleSelectAll: (bets: Bet[]) => void;
  toggleSelectBet: (id: string) => void;
  syncingBetId: string | null;
  isSyncingScores: boolean;
  syncOnlyScores: (bets: Bet[]) => void;
  updateStatus: (id: string, status: Bet['status'], cashout?: number) => void;
  setEditingBetId: (id: string | null) => void;
  setIsManualBookmaker: (val: boolean) => void;
  setBetForm: (form: any) => void;
  setShowEditModal: (val: boolean) => void;
  deleteBet: (id: string) => void;
  setCashoutBetId: (id: string | null) => void;
  setCashoutAmount: (val: string) => void;
  bankroll: Bankroll;
  activeTab: string;
}


export function BetsTab({
  activeBankrollId,
  historySearchTerm,
  setHistorySearchTerm,
  selectedBetIds,
  setSelectedBetIds,
  updateStatusForSelected,
  userBookmakers,
  bets,
  updateBookmakerForSelected,
  restoreSelectedBets,
  permanentlyDeleteSelectedBets,
  syncResults,
  isSyncingResults,
  deleteSelectedBets,
  historyStatusFilter,
  setHistoryStatusFilter,
  historyBookmakerFilter,
  setHistoryBookmakerFilter,
  manualSyncProgress,
  groupedHistory,
  collapsedDates,
  toggleDateCollapse,
  toggleSelectAll,
  toggleSelectBet,
  syncingBetId,
  isSyncingScores,
  syncOnlyScores,
  updateStatus,
  setEditingBetId,
  setIsManualBookmaker,
  setBetForm,
  setShowEditModal,
  deleteBet,
  setCashoutBetId,
  setCashoutAmount,
  bankroll,
  activeTab
}: BetsTabProps) {
  return (
    <motion.div 
      key={`history-${activeBankrollId}`}
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={TRANSITIONS.smooth}
      className="space-y-6 pb-20"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative w-full lg:max-w-sm">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input 
            type="text" 
            placeholder="Filtrar por evento ou mercado..."
            value={historySearchTerm}
            onChange={(e) => setHistorySearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent text-sm font-bold text-text-main placeholder:text-text-dim/50 uppercase tracking-tight"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AnimatePresence mode="wait">
            {selectedBetIds.size > 0 ? (
              <div key="floating-bar" className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
                <motion.div 
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="pointer-events-auto flex flex-wrap items-stretch gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 bg-surface/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-4xl overflow-hidden"
                >
                   {/* Count Section */}
                   <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 bg-bg/40 rounded-xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-accent hidden sm:block">Selecionados</span>
                        <span className="text-sm sm:text-lg font-mono font-bold text-text-main leading-tight">{selectedBetIds.size.toString().padStart(2, '0')}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedBetIds(new Set())}
                        className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all text-text-dim hover:text-white"
                        title="Limpar seleção"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                   </div>

                   {/* Status Section */}
                   <div className="flex items-center gap-1 px-1.5 bg-bg/40 rounded-xl border border-white/5">
                      <button 
                        onClick={() => updateStatusForSelected('won')} 
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-accent hover:bg-accent/10 rounded-lg transition-all group relative"
                      >
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button 
                        onClick={() => updateStatusForSelected('lost')} 
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-loss hover:bg-loss/10 rounded-lg transition-all group relative"
                      >
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button 
                        onClick={() => updateStatusForSelected('void')} 
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-zinc-400 hover:bg-white/10 rounded-lg transition-all group relative"
                      >
                        <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                   </div>

                   <div className="relative flex items-center bg-bg/40 rounded-xl border border-white/5 overflow-hidden flex-1 min-w-[200px] max-w-full">
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2 w-full max-h-[120px] overflow-y-auto no-scrollbar">
                        {userBookmakers.map(bm => {
                          const style = getBookmakerStyle(bm);
                          const selected = bets.filter(b => selectedBetIds.has(b.id));
                          const isActive = selected.length > 0 && selected.every(b => b.bookmaker === bm);
                          
                          return (
                            <button 
                              key={bm} 
                              onClick={() => updateBookmakerForSelected(bm)} 
                              className={cn(
                                "bm-chip flex-shrink-0 flex items-center gap-2 transition-all",
                                isActive 
                                  ? "bg-accent/20 border-accent/40 shadow-[0_0_10px_rgba(0,255,149,0.1)] ring-1 ring-accent/30" 
                                  : "bg-white/5 hover:bg-accent/10 border-white/5 hover:border-accent/20",
                                isActive ? style.color : "text-text-dim"
                              )} 
                              title={isActive ? `Remover ${bm} das apostas` : `Mover para ${bm}`}
                            >
                               <span className={cn(
                                 "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                                 isActive ? "bg-accent" : "bg-text-dim/40"
                               )} />
                               {bm}
                            </button>
                          );
                        })}
                      </div>
                      {/* Fade Indicators */}
                      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0A0B0E]/80 to-transparent pointer-events-none" />
                      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0A0B0E]/80 to-transparent pointer-events-none" />
                   </div>

                   {/* Final Actions */}
                   <div className="flex items-center gap-2 ml-auto">
                      {activeTab === 'trash' ? (
                        <>
                          <button 
                            onClick={() => restoreSelectedBets()}
                            className="flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">Restaurar Seleção</span>
                          </button>

                          <button 
                            onClick={() => permanentlyDeleteSelectedBets()}
                            className="w-12 h-12 flex items-center justify-center bg-loss/10 text-loss hover:bg-loss hover:text-white rounded-xl transition-all active:scale-90"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              const selectedBets = bets.filter(b => selectedBetIds.has(b.id));
                              syncResults(selectedBets);
                            }}
                            disabled={isSyncingResults}
                            className={cn(
                                "flex items-center gap-2 px-4 sm:px-6 py-3 bg-accent text-bg rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20 disabled:opacity-50",
                                isSyncingResults && "animate-pulse"
                            )}
                          >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">SINCRONIZAR</span>
                          </button>

                          <button 
                            onClick={() => deleteSelectedBets()}
                            className="w-12 h-12 flex items-center justify-center bg-loss/10 text-loss hover:bg-loss hover:text-white rounded-xl transition-all active:scale-90"
                            title="Mover para lixeira"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                   </div>
                </motion.div>
              </div>
            ) : (
              <motion.button 
                key="sync-all-btn"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => syncResults()}
                disabled={isSyncingResults}
                className={cn(
                    "flex items-center justify-center gap-2 px-5 py-3 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed",
                    isSyncingResults && "animate-pulse"
                )}
              >
                {isSyncingResults ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sincronizando...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        Sincronizar Pendentes
                    </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Status:</span>
            <select 
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="text-[10px] font-black uppercase tracking-widest bg-surface border border-border rounded-lg px-4 py-2 outline-none focus:border-accent text-text-main"
            >
              <option>Todos</option>
              <option>Ganha</option>
              <option>Meio Ganha</option>
              <option>Perdida</option>
              <option>Meio Perdida</option>
              <option>Pendente</option>
              <option>Reembolsada</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Casa:</span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-md bg-surface/50 p-1 rounded-lg border border-border/40">
               <button
                 onClick={() => setHistoryBookmakerFilter([])}
                 className={cn(
                   "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                   historyBookmakerFilter.length === 0 ? "bg-accent text-bg" : "text-text-dim hover:text-text-main"
                 )}
               >
                 Todas
               </button>
               {Array.from(new Set(bets.map(b => b.bookmaker || 'Outra'))).map(bm => (
                 <button
                   key={bm}
                   onClick={() => {
                     setHistoryBookmakerFilter(prev => 
                       prev.includes(bm) ? prev.filter(x => x !== bm) : [...prev, bm]
                     );
                   }}
                   className={cn(
                     "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                     historyBookmakerFilter.includes(bm) 
                       ? "bg-accent/20 text-accent border border-accent/20" 
                       : "text-text-dim hover:text-text-main"
                   )}
                 >
                   {bm}
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div 
        variants={STAGGER_CONTAINER}
        initial="initial"
        animate="animate"
        className="space-y-12"
      >
        {isSyncingResults && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-accent/5 border border-accent/20 rounded-2xl p-6 mb-8 relative overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <div className="relative">
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    <Sparkles className="w-2.5 h-2.5 text-accent absolute -top-1 -right-1" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-text-main">Sincronizando Apostas</h3>
                  <p className="text-[10px] text-text-dim/70 font-medium">Extraindo placares e resultados reais com inteligência artificial...</p>
                </div>
              </div>
              <span className="text-sm font-black font-mono text-accent">{Math.round(manualSyncProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${manualSyncProgress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-accent shadow-[0_0_20px_rgba(0,255,149,0.5)]"
              />
            </div>
          </motion.div>
        )}
        {groupedHistory.map(([date, group]: [string, any]) => {
          const isCollapsed = collapsedDates.has(date);
          
          return (
            <motion.div variants={STAGGER_ITEM} key={`group-${date}`} className="space-y-4">
              <div 
                onClick={() => toggleDateCollapse(date)}
                className="flex flex-col md:flex-row md:items-center gap-4 px-2 group/header cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs transition-all backdrop-blur-md",
                    isCollapsed ? "bg-white/[0.02] border-white/5 text-text-dim" : "bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_rgba(0,255,149,0.1)]"
                  )}>
                    {format(safeNewDate(date + 'T00:00:00'), 'dd')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-main">
                        {isToday(safeNewDate(date + 'T00:00:00')) ? 'Hoje' : 
                         isYesterday(safeNewDate(date + 'T00:00:00')) ? 'Ontem' : 
                         format(safeNewDate(date + 'T00:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      <span className="hidden md:inline-flex items-center gap-2 bg-bg/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                        <span className="text-accent text-[10px] font-black uppercase tracking-widest border-r border-white/10 pr-2">
                          {group.bets.length} {group.bets.length === 1 ? 'entrada' : 'entradas'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                           {Object.entries(group.bookmakerCounts).map(([bm, count]: [string, any]) => {
                              const style = getBookmakerStyle(bm);
                              return (
                                <div key={`bm-badge-top-${bm}`} className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm transition-all hover:scale-105 group/bm cursor-default",
                                  style.bg, style.border, style.color
                                )}>
                                   <div className={cn("w-4 h-4 flex items-center justify-center rounded-md bg-bg/40 text-[10px] font-black", style.color)}>
                                      {count}
                                   </div>
                                   <span className="text-[7px] font-black uppercase tracking-widest pr-1">
                                      {bm}
                                   </span>
                                </div>
                              );
                           })}
                        </div>
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-white/20" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-accent" />
                      )}
                    </div>
                    <div className="md:hidden mt-3 flex flex-wrap items-center gap-1.5">
                        {Object.entries(group.bookmakerCounts).map(([bm, count]: [string, any]) => {
                          const style = getBookmakerStyle(bm);
                          return (
                            <span key={`bm-badge-details-${bm}`} className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm",
                              style.bg, style.border, style.color
                            )}>
                              <span className="text-[10px] font-black leading-none bg-bg/20 min-w-4 h-4 px-1 flex items-center justify-center rounded-md">{count}</span>
                              <span className="text-[9px] font-black uppercase tracking-tighter pr-0.5">{bm}</span>
                            </span>
                          );
                        })}
                     </div>
                  </div>
                </div>

                <div className="h-[1px] hidden md:block flex-1 bg-gradient-to-r from-border to-transparent" />
                
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-text-dim uppercase tracking-widest">Investimento</span>
                    <span className="text-xs font-mono font-bold text-text-main">{formatCurrency(group.totalStake)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-text-dim uppercase tracking-widest">Lucro do Dia</span>
                    <span className={cn(
                      "text-xs font-mono font-bold",
                      group.totalProfit > 0 ? "text-accent" : group.totalProfit < 0 ? "text-loss" : "text-text-dim"
                    )}>
                      {group.totalProfit > 0 ? '+' : ''}{formatCurrency(group.totalProfit)}
                    </span>
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="glass-card overflow-hidden border-none bg-transparent pt-2">
                    <div className="overflow-x-auto hidden md:block px-1">
                      <table className="w-full text-left border-separate border-spacing-y-3">
                        <thead>
                          <tr className="text-text-dim/50">
                            <th className="px-6 py-2 w-10">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectAll(group.bets);
                                }}
                                className="text-text-dim hover:text-accent transition-colors"
                              >
                                {selectedBetIds.size === group.bets.length && group.bets.length > 0 ? (
                                  <CheckSquare className="w-4 h-4 text-accent" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em]">Detalhes da Aposta</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-center">Unidades</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-center">Odd</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-right">Retorno Total</th>
                            <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-right">Ações Rápidas</th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence mode="popLayout">
                            {group.bets.map((bet: Bet) => (
                              <HistoryBetRow 
                                key={`bet-row-${bet.id}`}
                                bet={bet}
                                selected={selectedBetIds.has(bet.id)}
                                onToggleSelect={toggleSelectBet}
                                syncingBetId={syncingBetId}
                                isSyncingScores={isSyncingScores}
                                isSyncingResults={isSyncingResults}
                                onSyncOnlyScores={syncOnlyScores}
                                onSyncResults={syncResults}
                                onUpdateStatus={updateStatus}
                                onEdit={(b) => {
                                  setEditingBetId(b.id);
                                  const isCustom = b.bookmaker !== '' && !userBookmakers.includes(b.bookmaker);
                                  setIsManualBookmaker(isCustom);
                                  setBetForm({
                                      date: format(safeNewDate(b.date), "yyyy-MM-dd'T'HH:mm"),
                                      sport: b.sport,
                                      event: b.event,
                                      market: b.market,
                                      selection: b.selection,
                                      odds: b.odds.toString(),
                                      stake: b.stake.toString(),
                                      status: b.status,
                                      cashoutValue: b.cashoutValue?.toString() || '',
                                      bookmaker: b.bookmaker || 'Bet365',
                                      bankrollId: b.bankrollId || activeBankrollId || '',
                                      isLive: b.isLive,
                                      betId: b.betId || '',
                                      league: b.league || ''
                                  });
                                  setShowEditModal(true);
                                }}
                                onDelete={deleteBet}
                                onCashout={(b) => {
                                  if (b.status === 'cashout') {
                                    updateStatus(b.id, 'pending');
                                  } else {
                                    setCashoutBetId(b.id);
                                    setCashoutAmount(b.stake.toString());
                                  }
                                }}
                                unitSize={bankroll.unitSize}
                                getBookmakerStyle={getBookmakerStyle}
                                safeNewDate={safeNewDate}
                              />
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                    </div>

                    <div className="md:hidden space-y-6 px-2 mt-4">
                      {group.bets.map((bet: Bet) => (
                        <HistoryBetCard
                          key={`bet-card-${bet.id}`}
                          bet={bet}
                          selected={selectedBetIds.has(bet.id)}
                          onToggleSelect={toggleSelectBet}
                          syncingBetId={syncingBetId}
                          isSyncingScores={isSyncingScores}
                          isSyncingResults={isSyncingResults}
                          onSyncOnlyScores={syncOnlyScores}
                          onSyncResults={syncResults}
                          onUpdateStatus={updateStatus}
                          onEdit={(b) => {
                            setEditingBetId(b.id);
                            const isCustom = b.bookmaker !== '' && !userBookmakers.includes(b.bookmaker);
                            setIsManualBookmaker(isCustom);
                            setBetForm({
                                date: format(safeNewDate(b.date), "yyyy-MM-dd'T'HH:mm"),
                                sport: b.sport,
                                event: b.event,
                                market: b.market,
                                selection: b.selection,
                                odds: b.odds.toString(),
                                stake: b.stake.toString(),
                                status: b.status,
                                cashoutValue: b.cashoutValue?.toString() || '',
                                bookmaker: b.bookmaker || 'Bet365',
                                bankrollId: b.bankrollId || activeBankrollId || '',
                                isLive: b.isLive,
                                betId: b.betId || '',
                                league: b.league || ''
                            });
                            setShowEditModal(true);
                          }}
                          onDelete={deleteBet}
                          onCashout={(b) => {
                            if (b.status === 'cashout') {
                              updateStatus(b.id, 'pending');
                            } else {
                              setCashoutBetId(b.id);
                              setCashoutAmount(b.stake.toString());
                            }
                          }}
                          unitSize={bankroll.unitSize}
                          getBookmakerStyle={getBookmakerStyle}
                          safeNewDate={safeNewDate}
                        />
                      ))}
                    </div> 
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {groupedHistory.length === 0 && (
          <motion.div variants={STAGGER_ITEM} className="glass-card py-20 text-center text-zinc-500 border border-dashed border-border/50">
            <div className="flex flex-col items-center gap-2">
                <History className="w-12 h-12 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Nenhuma aposta encontrada com estes filtros.</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
