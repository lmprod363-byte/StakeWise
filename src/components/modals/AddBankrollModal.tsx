import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XCircle } from 'lucide-react';

interface AddBankrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  addBankroll: (name: string, total: number, unit: number) => void;
  newBankrollName: string;
  setNewBankrollName: (v: string) => void;
  newBankrollTotal: string;
  setNewBankrollTotal: (v: string) => void;
  newBankrollUnit: string;
  setNewBankrollUnit: (v: string) => void;
}

export function AddBankrollModal({
  isOpen,
  onClose,
  addBankroll,
  newBankrollName,
  setNewBankrollName,
  newBankrollTotal,
  setNewBankrollTotal,
  newBankrollUnit,
  setNewBankrollUnit
}: AddBankrollModalProps) {
  const handleConfirm = () => {
    if (!newBankrollName.trim()) {
      alert("Dê um nome para a banca");
      return;
    }
    addBankroll(
      newBankrollName, 
      parseFloat(newBankrollTotal) || 1000, 
      parseFloat(newBankrollUnit) || 20
    );
    onClose();
    setNewBankrollName('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-bg border border-border rounded-2xl shadow-2xl p-8 w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Nova Banca</h3>
              <button onClick={onClose} className="text-text-dim hover:text-text-main">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Nome da Banca</label>
                <input 
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent text-text-main font-bold"
                  placeholder="Ex: Banca Tênis, Gestão 2..."
                  value={newBankrollName}
                  onChange={(e) => setNewBankrollName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Banca Inicial (R$)</label>
                      <input 
                          type="number"
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent font-bold"
                          value={newBankrollTotal}
                          onChange={(e) => setNewBankrollTotal(e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Vlr. Unidade (R$)</label>
                      <input 
                          type="number"
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent font-bold"
                          value={newBankrollUnit}
                          onChange={(e) => setNewBankrollUnit(e.target.value)}
                      />
                  </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                  <button 
                      onClick={onClose}
                      className="flex-1 py-4 border border-border text-text-dim rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-surface transition-all"
                  >
                      Cancelar
                  </button>
                  <button 
                      onClick={handleConfirm}
                      className="flex-1 py-4 bg-accent text-bg rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 shadow-lg shadow-accent/20 transition-all"
                  >
                      Criar Banca
                  </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
