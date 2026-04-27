import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash2, Settings2, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (t: string) => void;
  activeTab: string;
}

export function MobileDrawer({ isOpen, onClose, setActiveTab, activeTab }: MobileDrawerProps) {
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
            className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border rounded-t-[32px] p-6 pb-20 z-[95] lg:hidden shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setActiveTab('stake'); onClose(); }}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border",
                  activeTab === 'stake' ? "bg-accent/10 border-accent shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-surface/50 border-border"
                )}
              >
                <ShieldCheck className={cn("w-6 h-6", activeTab === 'stake' ? "text-accent" : "text-emerald-400")} />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-main">Gestão Stake</span>
              </button>

              <button 
                onClick={() => { setActiveTab('insights'); onClose(); }}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border",
                  activeTab === 'insights' ? "bg-accent/10 border-accent shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-surface/50 border-border"
                )}
              >
                <Sparkles className={cn("w-6 h-6", activeTab === 'insights' ? "text-accent" : "text-emerald-400")} />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-main">IA Insights</span>
              </button>

              <button 
                onClick={() => { setActiveTab('trash'); onClose(); }}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border",
                  activeTab === 'trash' ? "bg-loss/10 border-loss shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-surface/50 border-border"
                )}
              >
                <Trash2 className={cn("w-6 h-6", activeTab === 'trash' ? "text-loss" : "text-rose-400")} />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-main">Lixeira</span>
              </button>

              <button 
                onClick={() => { setActiveTab('settings'); onClose(); }}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border",
                  activeTab === 'settings' ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-surface/50 border-border"
                )}
              >
                <Settings2 className={cn("w-6 h-6", activeTab === 'settings' ? "text-indigo-400" : "text-indigo-400")} />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-main">Ajustes</span>
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-border/50 text-center">
               <p className="text-[8px] font-black uppercase tracking-[0.3em] text-text-dim opacity-30">StakeWise App v1.5.0</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
