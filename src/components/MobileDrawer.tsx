import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash2, Settings2 } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (t: string) => void;
}

export function MobileDrawer({ isOpen, onClose, setActiveTab }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[90] lg:hidden"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border rounded-t-[32px] p-8 z-[95] lg:hidden shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-8" />
            <div className="grid grid-cols-3 gap-6">
              <button 
                onClick={() => { setActiveTab('insights'); onClose(); }}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/50 border border-border"
              >
                <Sparkles className="w-6 h-6 text-accent" />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-main">IA Insights</span>
              </button>
              <button 
                onClick={() => { setActiveTab('trash'); onClose(); }}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/50 border border-border"
              >
                <Trash2 className="w-6 h-6 text-loss" />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-main">Lixeira</span>
              </button>
              <button 
                onClick={() => { setActiveTab('settings'); onClose(); }}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/50 border border-border"
              >
                <Settings2 className="w-6 h-6 text-indigo-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-main">Ajustes</span>
              </button>
            </div>
            <div className="mt-8 pt-8 border-t border-border/50 text-center">
               <p className="text-[8px] font-black uppercase tracking-[0.3em] text-text-dim opacity-30">StakeWise App v1.5.0</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
