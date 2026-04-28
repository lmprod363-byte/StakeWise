import React from 'react';
import { 
  History, 
  RotateCcw, 
  Trash2, 
  ArrowRightLeft 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency, safeNewDate, getBookmakerStyle } from '../../lib/utils';
import { Bet, Transaction } from '../../types';
import { isToday, isYesterday } from 'date-fns';
import { BOOKMAKER_CONFIGS } from '../../constants';

interface TrashTabProps {
  groupedHistory: [string, { bets: Bet[], transactions: Transaction[] }][];
  restoreBet: (id: string) => Promise<void>;
  restoreTransaction: (id: string) => Promise<void>;
  setBetToDelete: (id: string | null) => void;
  permanentlyDeleteTransaction: (id: string) => Promise<void>;
}


export function TrashTab({
  groupedHistory,
  restoreBet,
  restoreTransaction,
  setBetToDelete,
  permanentlyDeleteTransaction
}: TrashTabProps) {
  return (
    <div className="space-y-6 pb-20">
       <div className="space-y-8">
        {groupedHistory.map(([date, group]) => (
          <div key={`trash-group-${date}`} className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="h-[1px] flex-1 bg-border" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                {isToday(safeNewDate(date + 'T00:00:00')) ? 'Hoje' : 
                 isYesterday(safeNewDate(date + 'T00:00:00')) ? 'Ontem' : 
                 format(safeNewDate(date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <div className="h-[1px] flex-1 bg-border" />
            </div>

            <div className="space-y-6">
              {/* Section: Bets */}
              {group.bets.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-4">
                    <History className="w-3 h-3 text-accent" />
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-text-dim">Apostas Excluídas</h4>
                  </div>
                  <div className="glass-card overflow-hidden border border-border">
                      <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-border/50">
                          {group.bets.map((bet) => (
                            <tr key={bet.id} className="hover:bg-zinc-800/10 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-bold text-text-main text-sm uppercase">{bet.selection}</div>
                                  {(bet.bookmaker || 'Geral') && (
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter leading-none border",
                                      getBookmakerStyle(bet.bookmaker || 'Geral').bg,
                                      getBookmakerStyle(bet.bookmaker || 'Geral').border,
                                      getBookmakerStyle(bet.bookmaker || 'Geral').color
                                    )}>
                                      {bet.bookmaker || 'Geral'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-text-dim font-bold uppercase mt-0.5">{bet.event}</div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => restoreBet(bet.id)}
                                    className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors"
                                    title="Restaurar"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setBetToDelete(bet.id)}
                                    className="p-2 hover:bg-loss/10 text-loss rounded-lg transition-colors"
                                    title="Excluir Permanentemente"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Transactions */}
              {group.transactions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-4">
                    <ArrowRightLeft className="w-3 h-3 text-accent" />
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-text-dim">Transações Excluídas</h4>
                  </div>
                  <div className="glass-card overflow-hidden border border-border">
                      <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-border/50">
                          {group.transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-zinc-800/10 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-text-main text-sm uppercase flex items-center gap-2">
                                  {t.type === 'withdrawal' ? 'Saque' : t.type === 'deposit' ? 'Aporte' : t.type === 'transfer' ? 'Transferência' : 'Ajuste'}
                                  <span className="text-[10px] opacity-60 tabular-nums">({formatCurrency(t.amount)})</span>
                                </div>
                                <div className="text-[10px] text-text-dim font-bold uppercase mt-0.5">
                                   {t.fromBookmaker || t.toBookmaker || 'Conta'}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => restoreTransaction(t.id)}
                                    className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors"
                                    title="Restaurar"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => permanentlyDeleteTransaction(t.id)}
                                    className="p-2 hover:bg-loss/10 text-loss rounded-lg transition-colors"
                                    title="Excluir Permanentemente"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {groupedHistory.length === 0 && (
          <div className="glass-card py-20 text-center text-zinc-500 border border-dashed border-border/50">
            <div className="flex flex-col items-center gap-2">
                <History className="w-12 h-12 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Lixeira vazia.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
