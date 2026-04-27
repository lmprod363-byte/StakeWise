import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  X, 
  Settings2, 
  Pencil, 
  Trash2, 
  ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency, safeNewDate } from '../../lib/utils';
import { Transaction } from '../../types';
import { PAGE_VARIANTS, TRANSITIONS } from '../../constants';
import { InputGroup } from '../ui/InputGroup';

interface TransfersTabProps {
  activeBankrollId: string | null;
  userBookmakers: string[];
  bookmakerBalances: [string, number][];
  removeBookmaker: (bm: string) => void;
  addBookmaker: (name?: string) => void;
  newBookmakerName: string;
  setNewBookmakerName: (name: string) => void;
  isAddingNewBookmaker: boolean;
  setIsAddingNewBookmaker: (val: boolean) => void;
  setAdjustingBookmaker: (bm: string | null) => void;
  setAdjustmentValue: (val: string) => void;
  addTransaction: (data: Omit<Transaction, 'id' | 'bankrollId' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  historyTransactions: Transaction[];
  groupedTransactions: [string, Transaction[]][];
  toggleTransactionGroup: (date: string) => void;
  expandedTransactionGroups: Set<string>;
  setShowTransactionEditModal: (val: boolean) => void;
  setEditingTransactionId: (id: string | null) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'loss') => void;
  getBookmakerLogo: (name: string) => React.ReactNode;
}

export function TransfersTab({
  activeBankrollId,
  userBookmakers,
  bookmakerBalances,
  removeBookmaker,
  addBookmaker,
  newBookmakerName,
  setNewBookmakerName,
  isAddingNewBookmaker,
  setIsAddingNewBookmaker,
  setAdjustingBookmaker,
  setAdjustmentValue,
  addTransaction,
  deleteTransaction,
  historyTransactions,
  groupedTransactions,
  toggleTransactionGroup,
  expandedTransactionGroups,
  setShowTransactionEditModal,
  setEditingTransactionId,
  showToast,
  getBookmakerLogo
}: TransfersTabProps) {
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'withdrawal' as Transaction['type'],
    fromBookmaker: userBookmakers[0] || 'Bet365',
    toBookmaker: userBookmakers[1] || userBookmakers[0] || 'Betano',
    notes: ''
  });

  const [editingLocalTransactionId, setEditingLocalTransactionId] = useState<string | null>(null);

  const resetForm = () => {
    setTransactionForm({
      amount: '',
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      type: 'withdrawal',
      fromBookmaker: userBookmakers[0] || 'Bet365',
      toBookmaker: userBookmakers[1] || userBookmakers[0] || 'Betano',
      notes: ''
    });
    setEditingLocalTransactionId(null);
  };

  return (
    <motion.div 
      key={`transfers-${activeBankrollId}`}
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={TRANSITIONS.smooth}
      className="space-y-8"
    >
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userBookmakers.map((bm) => {
            const balance = bookmakerBalances.find(([b]) => b === bm)?.[1] || 0;
            return (
              <div key={bm} className="glass-card p-6 border-border bg-surface relative overflow-hidden group">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className={cn(
                         "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                         balance > 0 ? "bg-accent/10 border-accent/20 text-accent" : "bg-bg border-border text-text-dim"
                       )}>
                          {getBookmakerLogo(bm)}
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase text-text-main">{bm}</h4>
                          <p className="text-[9px] font-bold text-text-dim uppercase opacity-60">Saldo em Conta</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => removeBookmaker(bm)}
                      className="p-2 text-text-dim hover:text-loss transition-colors opacity-0 group-hover:opacity-100"
                      title="Remover das favoritas"
                    >
                      <X className="w-3 h-3" />
                    </button>
                 </div>
                 <div className="space-y-1">
                    <p className="text-2xl font-black tabular-nums text-text-main">
                       {formatCurrency(balance)}
                    </p>
                 </div>
                 <div className="mt-4 pt-4 border-t border-border/50">
                    <button 
                      onClick={() => {
                        setAdjustingBookmaker(bm);
                        setAdjustmentValue(balance.toFixed(2));
                      }}
                      className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent hover:brightness-110 transition-all"
                    >
                      <Settings2 className="w-3 h-3" />
                      Sincronizar Saldo
                    </button>
                 </div>
              </div>
            );
         })}

         <div className="glass-card border-dashed border-2 border-border/40 hover:border-accent/40 bg-surface/20 flex flex-col items-center justify-center p-6 gap-3 group transition-all">
            {isAddingNewBookmaker ? (
              <div className="w-full space-y-3">
                 <input 
                   type="text" 
                   placeholder="Nome da Casa..."
                   value={newBookmakerName}
                   onChange={(e) => setNewBookmakerName(e.target.value)}
                   className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase outline-none focus:border-accent"
                   autoFocus
                   onKeyDown={(e) => e.key === 'Enter' && addBookmaker()}
                 />
                 <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setIsAddingNewBookmaker(false)} className="py-2 text-[9px] font-black uppercase tracking-widest text-text-dim">Voltar</button>
                    <button onClick={() => addBookmaker()} className="py-2 bg-accent text-bg rounded-lg text-[9px] font-black uppercase tracking-widest">Salvar</button>
                 </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingNewBookmaker(true)}
                className="flex flex-col items-center gap-1 text-text-dim group-hover:text-accent transition-all"
              >
                 <Plus className="w-8 h-8 opacity-20 group-hover:opacity-80 transition-all" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Adicionar Casa</span>
              </button>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 border-border bg-surface/50 backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-accent mb-6 flex items-center justify-between">
               <span className="flex items-center gap-2">
                 <ArrowRightLeft className="w-4 h-4" />
                 {editingLocalTransactionId ? 'Editar Movimentação' : 'Nova Movimentação'}
               </span>
               {editingLocalTransactionId && (
                 <button 
                   onClick={resetForm}
                   className="text-loss hover:underline"
                 >
                   Cancelar
                 </button>
               )}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Tipo de Operação</label>
                <div className="grid grid-cols-3 gap-2">
                   {['withdrawal', 'deposit', 'transfer'].map((type) => (
                     <button
                       key={type}
                       onClick={() => setTransactionForm({ ...transactionForm, type: type as any })}
                       className={cn(
                         "py-2 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border",
                         transactionForm.type === type 
                            ? "bg-accent/10 border-accent text-accent" 
                            : "bg-surface border-border text-text-dim hover:border-text-dim/40"
                       )}
                     >
                       {type === 'withdrawal' ? 'Saque' : type === 'deposit' ? 'Aporte' : 'Transfer.'}
                     </button>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <InputGroup 
                   label="Valor (R$)" 
                   type="number" 
                   value={transactionForm.amount} 
                   onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})} 
                 />
                 <InputGroup 
                   label="Data" 
                   type="datetime-local" 
                   value={transactionForm.date} 
                   onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})} 
                 />
              </div>

              {transactionForm.type === 'transfer' ? (
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Origem</label>
                     <select 
                       value={transactionForm.fromBookmaker}
                       onChange={(e) => setTransactionForm({...transactionForm, fromBookmaker: e.target.value})}
                       className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                     >
                       {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Destino</label>
                     <select 
                       value={transactionForm.toBookmaker}
                       onChange={(e) => setTransactionForm({...transactionForm, toBookmaker: e.target.value})}
                       className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                     >
                       {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                     </select>
                   </div>
                </div>
              ) : (
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Casa de Aposta</label>
                   <select 
                     value={transactionForm.type === 'deposit' ? transactionForm.toBookmaker : transactionForm.fromBookmaker}
                      onChange={(e) => {
                        if (transactionForm.type === 'deposit') {
                          setTransactionForm({...transactionForm, toBookmaker: e.target.value});
                        } else {
                          setTransactionForm({...transactionForm, fromBookmaker: e.target.value});
                        }
                      }}
                      className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                    >
                      {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                   </select>
                </div>
              )}

              <div className="pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Notas / Observações</label>
                <textarea 
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  placeholder="Ex: Saque para conta pessoal..."
                  className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold text-text-main focus:border-accent outline-none min-h-[80px]"
                />
              </div>

              <button 
                onClick={() => {
                   if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
                     showToast("Informe um valor válido", "info");
                     return;
                   }
                   addTransaction({
                     amount: parseFloat(transactionForm.amount),
                     date: transactionForm.date,
                     type: transactionForm.type,
                     fromBookmaker: transactionForm.type === 'deposit' ? undefined : transactionForm.fromBookmaker,
                     toBookmaker: transactionForm.type === 'withdrawal' ? undefined : transactionForm.toBookmaker,
                     notes: transactionForm.notes
                   });
                   resetForm();
                }}
                className="w-full bg-accent text-bg py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20"
              >
                {editingLocalTransactionId ? 'Salvar Alterações' : 'Registrar Movimentação'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <div className="glass-card border-border bg-surface/30 overflow-hidden">
              <div className="p-6 border-b border-border/50 flex items-center justify-between">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-text-dim">Histórico de Transações</h3>
                 <span className="text-[9px] font-black uppercase tracking-widest text-text-dim/60 bg-bg px-2 py-1 rounded-md">{historyTransactions.length} registros</span>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                 {groupedTransactions.map(([date, group]) => (
                   <div key={`transfer-group-${date}`} className="border-b border-border/30 last:border-0">
                     <button 
                       onClick={() => toggleTransactionGroup(date)}
                       className="w-full flex items-center justify-between px-6 py-4 bg-bg/20 hover:bg-bg/40 transition-colors group"
                     >
                        <div className="flex items-center gap-3">
                           <div className={cn(
                             "w-6 h-6 rounded-md border border-border/50 flex items-center justify-center transition-transform duration-300",
                             expandedTransactionGroups.has(date) ? "rotate-0" : "-rotate-90"
                           )}>
                              <ChevronDown className="w-3.5 h-3.5 text-text-dim" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                              {isToday(safeNewDate(date + 'T00:00:00')) ? 'Hoje' : 
                               isYesterday(safeNewDate(date + 'T00:00:00')) ? 'Ontem' : 
                               format(safeNewDate(date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                           </span>
                        </div>
                        <span className="text-[9px] font-black text-text-dim/40 uppercase tracking-widest">{group.length} transações</span>
                     </button>

                     <AnimatePresence>
                       {expandedTransactionGroups.has(date) && (
                         <motion.div 
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           className="overflow-hidden"
                         >
                           <div className="divide-y divide-border/20">
                             {group.map((t: Transaction) => (
                               <div key={t.id} className="p-6 hover:bg-white/[0.02] transition-all group/item">
                      <div className="flex items-center justify-between">
                         <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                              t.type === 'withdrawal' ? "bg-loss/10 border-loss/30 text-loss" : 
                              t.type === 'deposit' ? "bg-accent/10 border-accent/30 text-accent" : 
                              "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                            )}>
                               {t.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> : 
                                t.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : 
                                <ArrowRightLeft className="w-5 h-5" />}
                            </div>
                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                  <span className="text-sm font-black text-text-main tabular-nums">{formatCurrency(t.amount)}</span>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                    t.type === 'withdrawal' ? "bg-loss/10 border-loss/20 text-loss" : 
                                    t.type === 'deposit' ? "bg-accent/10 border-accent/20 text-accent" : 
                                    "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                  )}>
                                    {t.type === 'withdrawal' ? 'Saque' : t.type === 'deposit' ? 'Aporte' : 'Transferência'}
                                  </span>
                               </div>
                               <div className="text-[10px] text-text-dim font-bold uppercase tracking-tight flex items-center gap-2">
                                  {format(safeNewDate(t.date), "dd/MM/yyyy HH:mm")}
                                  {t.type === 'transfer' ? (
                                    <>
                                      <span className="opacity-40">•</span>
                                      <span className="text-text-main">{t.fromBookmaker}</span>
                                      <ArrowRightLeft className="w-2.5 h-2.5 opacity-40" />
                                      <span className="text-text-main">{t.toBookmaker}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="opacity-40">•</span>
                                      <span className="text-text-main">{t.fromBookmaker || t.toBookmaker || 'Conta'}</span>
                                    </>
                                  )}
                               </div>
                               {t.notes && (
                                 <p className="mt-2 text-[10px] text-text-dim/80 italic leading-relaxed max-w-md">{t.notes}</p>
                               )}
                            </div>
                         </div>
                         <div className="flex items-center gap-1">
                           <button 
                             onClick={() => {
                               setEditingTransactionId(t.id);
                               setTransactionForm({
                                 amount: t.amount.toString(),
                                 date: format(safeNewDate(t.date), "yyyy-MM-dd'T'HH:mm"),
                                 type: t.type,
                                 fromBookmaker: t.fromBookmaker || 'Bet365',
                                 toBookmaker: t.toBookmaker || 'Betano',
                                 notes: t.notes || ''
                               });
                               setEditingLocalTransactionId(t.id);
                               setShowTransactionEditModal(true);
                             }}
                             className="p-2 text-text-dim hover:text-accent opacity-0 group-hover/item:opacity-100 transition-all hover:bg-accent/5 rounded-lg"
                           >
                              <Pencil className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => deleteTransaction(t.id)}
                             className="p-2 text-text-dim hover:text-loss opacity-0 group-hover/item:opacity-100 transition-all hover:bg-loss/5 rounded-lg"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                      </div>
                   </div>
                 ))}
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                 ))}

                 {historyTransactions.length === 0 && (
                   <div className="py-20 text-center space-y-3 opacity-30">
                      <ArrowRightLeft className="w-12 h-12 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
