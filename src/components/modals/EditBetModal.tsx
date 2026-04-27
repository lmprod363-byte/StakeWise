import React from 'react';
import { motion } from 'motion/react';
import { Edit3, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MODAL_VARIANTS, TRANSITIONS } from '../../constants';
import { InputGroup } from '../ui/InputGroup';
import { Bet } from '../../types';

interface EditBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBetId: string | null;
  betForm: any;
  setBetForm: (val: any) => void;
  userBookmakers: string[];
  isManualBookmaker: boolean;
  setIsManualBookmaker: (val: boolean) => void;
  updateBet: (id: string, data: any) => void;
  safeNewDate: (val: any) => Date;
}

export function EditBetModal({
  isOpen,
  onClose,
  editingBetId,
  betForm,
  setBetForm,
  userBookmakers,
  isManualBookmaker,
  setIsManualBookmaker,
  updateBet,
  safeNewDate
}: EditBetModalProps) {
  if (!isOpen || !editingBetId) return null;

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
        className="w-full max-w-2xl glass-card p-0 overflow-hidden relative border-border bg-surface/50 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)]"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-bg/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Edit3 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Editar Aposta</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim opacity-50">Ajuste os detalhes do seu registro</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-text-dim hover:text-text-main transition-colors p-2 hover:bg-surface rounded-full"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <form onSubmit={(e) => {
            e.preventDefault();
            const betData = {
              date: safeNewDate(betForm.date).toISOString(),
              sport: betForm.sport,
              event: betForm.event,
              market: betForm.market,
              selection: betForm.selection,
              odds: Number(betForm.odds),
              stake: Number(betForm.stake),
              status: betForm.status,
              cashoutValue: betForm.cashoutValue ? Number(betForm.cashoutValue) : null,
              bookmaker: betForm.bookmaker,
              bankrollId: betForm.bankrollId
            };
            updateBet(editingBetId, betData);
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup 
                label="Data e Hora" 
                type="datetime-local" 
                value={betForm.date} 
                onChange={(e) => setBetForm({...betForm, date: e.target.value})} 
                required 
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Casa de Aposta</label>
                <div className="grid grid-cols-2 gap-2">
                  {userBookmakers.map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBetForm({...betForm, bookmaker: betForm.bookmaker === b ? '' : b});
                        setIsManualBookmaker(false);
                      }}
                      className={cn(
                        "px-2 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-tight transition-all duration-300",
                        betForm.bookmaker === b 
                          ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_-8px_rgba(34,197,94,0.5)]" 
                          : "bg-surface border-border text-text-dim hover:border-border-hover"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                  {isManualBookmaker ? (
                    <div className="relative col-span-2">
                      <input
                        type="text"
                        autoFocus
                        value={betForm.bookmaker}
                        onChange={(e) => setBetForm(prev => ({...prev, bookmaker: e.target.value}))}
                        placeholder="Digite a casa..."
                        className="w-full px-4 py-3 bg-surface border border-accent text-[10px] font-black uppercase tracking-tight rounded-lg focus:outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          setBetForm(prev => ({...prev, bookmaker: ''}));
                          setIsManualBookmaker(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-loss transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const isCustom = betForm.bookmaker !== '' && !userBookmakers.includes(betForm.bookmaker);
                        if (isCustom) {
                          setBetForm(prev => ({...prev, bookmaker: ''}));
                          setIsManualBookmaker(false);
                        } else {
                          setIsManualBookmaker(true);
                          setBetForm(prev => ({...prev, bookmaker: ''}));
                        }
                      }}
                      className={cn(
                        "px-2 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-tight transition-all duration-300",
                        (betForm.bookmaker !== '' && !userBookmakers.includes(betForm.bookmaker))
                          ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_-8px_rgba(34,197,94,0.5)]" 
                          : "bg-surface border-border text-text-dim hover:border-border-hover"
                      )}
                    >
                      {(betForm.bookmaker !== '' && !userBookmakers.includes(betForm.bookmaker)) ? betForm.bookmaker : "Outra"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup 
                label="Esporte" 
                type="text" 
                placeholder="Futebol, Basquete..."
                value={betForm.sport} 
                onChange={(e) => setBetForm({...betForm, sport: e.target.value})} 
                required 
              />
              <InputGroup 
                label="Evento" 
                type="text" 
                placeholder="Ex: Real Madrid x Barcelona"
                value={betForm.event} 
                onChange={(e) => setBetForm({...betForm, event: e.target.value})} 
                required 
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <InputGroup 
                label="Mercado / Detalhes da Aposta" 
                type="text" 
                placeholder="Ex: Resultado Final • Real Madrid"
                value={betForm.market} 
                onChange={(e) => setBetForm({...betForm, market: e.target.value})} 
                required 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup 
                label="Odd" 
                type="number" 
                step="0.01"
                value={betForm.odds} 
                onChange={(e) => setBetForm({...betForm, odds: e.target.value})} 
                required 
              />
              <InputGroup 
                label="Stake" 
                type="number" 
                step="0.01"
                value={betForm.stake} 
                onChange={(e) => setBetForm({...betForm, stake: e.target.value})} 
                required 
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Status da Aposta</label>
                <select 
                  className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-sm font-bold text-text-main"
                  value={betForm.status}
                  onChange={(e) => setBetForm({...betForm, status: e.target.value as Bet['status']})}
                >
                  <option value="pending">Pendente</option>
                  <option value="won">Ganha (Win)</option>
                  <option value="half_win">Meio Green (Half Win)</option>
                  <option value="lost">Perdida (Loss)</option>
                  <option value="half_loss">Meio Red (Half Loss)</option>
                  <option value="void">Reembolsada / Anulada (Void)</option>
                  <option value="cashout">Cash Out (Encerrada)</option>
                </select>
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-[2] py-4 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
