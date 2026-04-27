import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XCircle, Wallet, Target, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AddBankrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  addBankroll: (name: string, total: number, unit: number) => void;
}

export function AddBankrollModal({
  isOpen,
  onClose,
  addBankroll
}: AddBankrollModalProps) {
  const [name, setName] = useState('');
  const [total, setTotal] = useState('1000');
  const [unit, setUnit] = useState('20');
  const [error, setError] = useState<string | null>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setName('');
      setTotal('1000');
      setUnit('20');
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!name.trim()) {
      setError("Dê um nome para a sua nova banca");
      return;
    }
    
    setError(null);
    const totalVal = parseFloat(total);
    const unitVal = parseFloat(unit);
    
    if (isNaN(totalVal) || totalVal <= 0) {
      setError("O valor total deve ser maior que zero");
      return;
    }

    addBankroll(
      name.trim(), 
      totalVal, 
      unitVal || totalVal * 0.02 // Fallback to 2% if invalid
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-surface border border-border rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-text-main">Nova Banca</h3>
                  <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mt-1">Crie um novo ambiente de gestão</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-dim hover:text-text-main">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2.5 block flex items-center gap-2">
                    Nome da Banca
                  </label>
                  <input 
                    autoFocus
                    className={cn(
                      "w-full px-5 py-4 bg-bg border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-bold text-text-main",
                      error?.includes("nome") ? "border-loss/50" : "border-border focus:border-accent"
                    )}
                    placeholder="Ex: Banca Principal, Futebol, High Stakes..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2.5 block flex items-center gap-2">
                          <Wallet className="w-3 h-3" />
                          Banca Inicial (R$)
                        </label>
                        <input 
                            type="number"
                            className="w-full px-5 py-4 bg-bg border border-border rounded-2xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-bold"
                            value={total}
                            onChange={(e) => setTotal(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2.5 block flex items-center gap-2">
                          <Target className="w-3 h-3" />
                          Unidade (R$)
                        </label>
                        <input 
                            type="number"
                            className="w-full px-5 py-4 bg-bg border border-border rounded-2xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-bold"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-loss/10 border border-loss/20 rounded-xl flex items-center gap-3 text-loss"
                  >
                    <Info className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-black uppercase leading-tight">{error}</p>
                  </motion.div>
                )}
                
                <div className="pt-4 flex flex-col gap-3">
                    <button 
                        onClick={handleConfirm}
                        className="w-full py-5 bg-accent text-bg rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:opacity-90 shadow-xl shadow-accent/20 transition-all active:scale-[0.98]"
                    >
                        Criar Banca Agora
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-4 text-text-dim rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-white/5 transition-all"
                    >
                        Voltar
                    </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

