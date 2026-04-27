import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';

interface DeleteBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteBetModal({ isOpen, onClose, onConfirm }: DeleteBetModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-bg/90 backdrop-blur-md p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-bg border border-border rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 bg-loss/10 text-loss rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Excluir Permanentes?</h3>
            <p className="text-text-dim text-[10px] font-black uppercase tracking-widest mb-8 opacity-60">
              Esta ação não pode ser desfeita. A aposta será removida para sempre.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={onConfirm}
                className="w-full py-4 bg-loss text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all"
              >
                Confirmar Exclusão
              </button>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-surface border border-border text-text-main rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
