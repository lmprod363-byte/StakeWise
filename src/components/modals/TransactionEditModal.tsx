import React from 'react';
import { motion } from 'motion/react';
import { Pencil, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MODAL_VARIANTS, TRANSITIONS } from '../../constants';
import { InputGroup } from '../ui/InputGroup';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionForm: any;
  setTransactionForm: (val: any) => void;
  userBookmakers: string[];
  addTransaction: (val: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'loss') => void;
}

export function TransactionEditModal({
  isOpen,
  onClose,
  transactionForm,
  setTransactionForm,
  userBookmakers,
  addTransaction,
  showToast
}: TransactionEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div 
        variants={MODAL_VARIANTS}
        initial="overlay"
        animate="overlayAnimate"
        exit="overlay"
        onClick={onClose}
        className="absolute inset-0 bg-bg/95 backdrop-blur-xl"
      />
      <motion.div
        variants={MODAL_VARIANTS}
        initial="content"
        animate="contentAnimate"
        exit="contentExit"
        transition={TRANSITIONS.spring}
        className="w-full max-w-md glass-card p-0 overflow-hidden relative border-border bg-surface/50 shadow-2xl"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-bg/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Pencil className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Editar Transação</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-text-dim hover:text-text-main transition-colors p-2 hover:bg-surface rounded-full"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {['withdrawal', 'deposit', 'transfer', 'adjustment'].map((type) => (
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
                    {type === 'withdrawal' ? 'Saque' : type === 'deposit' ? 'Aporte' : type === 'adjustment' ? 'Ajuste' : 'Transfer.'}
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

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Notas</label>
              <textarea 
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold text-text-main focus:border-accent outline-none min-h-[80px]"
              />
            </div>
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
                toBookmaker: (transactionForm.type === 'withdrawal' || transactionForm.type === 'adjustment') ? undefined : transactionForm.toBookmaker,
                notes: transactionForm.notes
              });
            }}
            className="w-full bg-accent text-bg py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20"
          >
            Salvar Alterações
          </button>
        </div>
      </motion.div>
    </div>
  );
}
