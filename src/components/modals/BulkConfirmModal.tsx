import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Loader2, 
  Save 
} from 'lucide-react';
import { cn, formatCurrency, safeNewDate } from '../../lib/utils';
import { MODAL_VARIANTS } from '../../constants';
import { Bet } from '../../types';

interface BulkConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulkQueue: Omit<Bet, 'id' | 'profit'>[];
  setBulkQueue: (queue: Omit<Bet, 'id' | 'profit'>[]) => void;
  bets: Bet[];
  userBookmakers: string[];
  addBet: (bet: any, force?: boolean) => Promise<void>;
  isScanning: boolean;
  setIsScanning: (val: boolean) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'loss') => void;
  setActiveTab: (tab: string) => void;
}

export function BulkConfirmModal({
  isOpen,
  onClose,
  bulkQueue,
  setBulkQueue,
  bets,
  userBookmakers,
  addBet,
  isScanning,
  setIsScanning,
  showToast,
  setActiveTab
}: BulkConfirmModalProps) {
  if (!isOpen || bulkQueue.length === 0) return null;

  const handleConfirmBulk = async () => {
    setIsScanning(true);
    try {
      let added = 0;
      let skipped = 0;
      
      for (const bet of bulkQueue) {
        // Local duplicate check using same improved logic
        const isDup = bets.some(b => {
          if (b.deleted) return false;
          const normalize = (s: string) => (s || '').toLowerCase().replace(/\s*[xv]\.?s\s*/g, ' x ').replace(/[^a-z0-9]/g, '').trim();
          const sameEvent = normalize(b.event) === normalize(bet.event);
          const samePick = normalize(b.selection) === normalize(bet.selection) || 
                           normalize(b.selection) === normalize(bet.market) ||
                           normalize(b.market) === normalize(bet.selection);
          const bDate = safeNewDate(b.date);
          const nDate = safeNewDate(bet.date);
          const sameDay = bDate.getFullYear() === nDate.getFullYear() &&
                          bDate.getMonth() === nDate.getMonth() &&
                          bDate.getDate() === nDate.getDate();
          const sameOdds = Math.abs(Number(b.odds) - Number(bet.odds)) < 0.01;
          const sameStake = Math.abs(Number(b.stake) - Number(bet.stake)) < 0.01;
          return (sameEvent && samePick && (sameDay || (sameOdds && sameStake)));
        });

        if (!isDup) {
          await addBet(bet, true);
          added++;
        } else {
          skipped++;
        }
      }
      
      if (skipped > 0) {
        showToast(`${added} registradas, ${skipped} duplicadas ignoradas.`, "info");
      } else {
        showToast(`${added} apostas registradas com sucesso!`, "success");
      }
      
      setBulkQueue([]);
      setActiveTab('bets');
    } catch (err) {
      showToast("Erro ao registrar algumas apostas.", "loss");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4 items-start pt-10">
      <motion.div 
        variants={MODAL_VARIANTS}
        initial="content"
        animate="contentAnimate"
        exit="contentExit"
        className="bg-bg border border-border rounded-2xl shadow-2xl overflow-hidden w-full relative z-10 max-w-4xl"
      >
        <div className="flex flex-col max-h-[85vh]">
          <div className="p-8 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Confirmar Lote</h2>
              <p className="text-text-dim text-xs font-bold tracking-widest uppercase mt-1">
                {bulkQueue.length} {bulkQueue.length === 1 ? 'aposta detectada' : 'apostas detectadas'} pela IA
              </p>
              {bulkQueue.some(b => b.isLive) && (
                <p className="text-[10px] font-black text-accent uppercase tracking-widest mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Algumas entradas identificadas como "Ao Vivo"
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 bg-surface/50 p-3 rounded-2xl border border-border">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Aplicar a todos:</span>
                <div className="flex items-center gap-2">
                  <select 
                    className="bg-bg border border-border rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-text-main focus:border-accent outline-none"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setBulkQueue(bulkQueue.map(b => ({ ...b, bookmaker: val })));
                    }}
                  >
                    <option value="">Casa de Aposta...</option>
                    {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                  </select>
                  <select 
                    className="bg-bg border border-border rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-text-main focus:border-accent outline-none"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setBulkQueue(bulkQueue.map(b => ({ ...b, status: val as any })));
                    }}
                  >
                    <option value="">Status...</option>
                    <option value="pending">Pendente</option>
                    <option value="won">Ganha</option>
                    <option value="lost">Perdida</option>
                    <option value="void">Reembolsada</option>
                  </select>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6 text-text-dim" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {bulkQueue.map((bet, idx) => {
              const isDup = bets.some(b => {
                if (b.deleted) return false;
                const normalize = (s: string) => (s || '').toLowerCase().replace(/\s*[xv]\.?s\s*/g, ' x ').replace(/[^a-z0-9]/g, '').trim();
                const sameEvent = normalize(b.event) === normalize(bet.event);
                const samePick = normalize(b.selection) === normalize(bet.selection) || 
                                 normalize(b.selection) === normalize(bet.market) ||
                                 normalize(b.market) === normalize(bet.selection);
                const bDate = safeNewDate(b.date);
                const nDate = safeNewDate(bet.date);
                const sameDay = bDate.getFullYear() === nDate.getFullYear() &&
                                bDate.getMonth() === nDate.getMonth() &&
                                bDate.getDate() === nDate.getDate();
                const sameOdds = Math.abs(Number(b.odds) - Number(bet.odds)) < 0.01;
                const sameStake = Math.abs(Number(b.stake) - Number(bet.stake)) < 0.01;
                return (sameEvent && samePick && (sameDay || (sameOdds && sameStake)));
              });

              return (
                <div key={idx} className={cn(
                  "bg-surface border rounded-2xl p-5 flex flex-col gap-5 relative overflow-hidden group transition-all shadow-xl bg-white/[0.01]",
                  isDup ? "border-loss/40 bg-loss/5" : "border-border hover:border-accent/30"
                )}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[40px] rounded-full translate-x-16 -translate-y-16" />
                  
                  {isDup && (
                    <div className="flex items-center gap-2 py-1.5 px-3 bg-loss/10 border border-loss/20 rounded-lg relative z-20">
                      <AlertTriangle className="w-3.5 h-3.5 text-loss" />
                      <span className="text-[9px] font-black uppercase text-loss tracking-widest">Aposta já registrada no seu histórico</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Esporte</p>
                          <input 
                            className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black uppercase text-accent focus:border-accent outline-none shadow-sm"
                            value={bet.sport}
                            onChange={(e) => {
                              const newQueue = [...bulkQueue];
                              newQueue[idx].sport = e.target.value;
                              setBulkQueue(newQueue);
                            }}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Evento (Jogo)</p>
                          <input 
                            className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-main focus:border-accent outline-none uppercase shadow-sm"
                            value={bet.event}
                            onChange={(e) => {
                              const newQueue = [...bulkQueue];
                              newQueue[idx].event = e.target.value;
                              setBulkQueue(newQueue);
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Liga / Comp.</p>
                          <input 
                            className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-main focus:border-accent outline-none uppercase shadow-sm"
                            value={bet.league || ''}
                            placeholder="Ex: Brasileirão"
                            onChange={(e) => {
                              const newQueue = [...bulkQueue];
                              newQueue[idx].league = e.target.value;
                              setBulkQueue(newQueue);
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Mercado / Detalhes</p>
                          <input 
                            className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-main focus:border-accent outline-none uppercase shadow-sm"
                            value={bet.market}
                            onChange={(e) => {
                              const newQueue = [...bulkQueue];
                              newQueue[idx].market = e.target.value;
                              newQueue[idx].selection = e.target.value;
                              setBulkQueue(newQueue);
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">ID Aposta</p>
                          <input 
                            className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-dim focus:border-accent outline-none uppercase shadow-sm"
                            value={bet.betId || ''}
                            placeholder="N/A"
                            onChange={(e) => {
                              const newQueue = [...bulkQueue];
                              newQueue[idx].betId = e.target.value;
                              setBulkQueue(newQueue);
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                           <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Tipo</p>
                           <button
                              type="button"
                              onClick={() => {
                                const newQueue = [...bulkQueue];
                                newQueue[idx].isLive = !newQueue[idx].isLive;
                                setBulkQueue(newQueue);
                              }}
                              className={cn(
                                 "flex-1 px-3 py-1.5 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                 bet.isLive ? "bg-accent/10 border-accent text-accent" : "bg-bg border-border text-text-dim"
                              )}
                           >
                              <Zap className={cn("w-3 h-3", bet.isLive ? "fill-accent" : "")} />
                              <span className="text-[9px] font-black uppercase tracking-tighter">{bet.isLive ? 'Ao Vivo' : 'Pré-Jogo'}</span>
                           </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 ml-4">
                       <button 
                         type="button"
                         onClick={() => {
                           const newQueue = bulkQueue.filter((_, i) => i !== idx);
                           setBulkQueue(newQueue);
                         }}
                         className="p-3 bg-loss/10 text-loss rounded-xl hover:bg-loss hover:text-white transition-all shadow-sm"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
                    <div>
                       <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Data / Hora</p>
                       <input 
                         type="datetime-local"
                         className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[10px] font-black text-text-main focus:border-accent outline-none shadow-sm"
                         value={new Date(new Date(bet.date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                         onChange={(e) => {
                           const newQueue = [...bulkQueue];
                           newQueue[idx].date = new Date(e.target.value).toISOString();
                           newQueue[idx].isLive = false;
                           setBulkQueue(newQueue);
                         }}
                       />
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Casa</p>
                       <select 
                         className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase text-text-main focus:border-accent outline-none shadow-sm"
                         value={bet.bookmaker || ''}
                         onChange={(e) => {
                           const newQueue = [...bulkQueue];
                           newQueue[idx].bookmaker = e.target.value;
                           setBulkQueue(newQueue);
                         }}
                       >
                         <option value="">Principal</option>
                         {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                       </select>
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Status</p>
                       <select 
                         className={cn(
                           "w-full border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none shadow-sm",
                           bet.status === 'won' ? "bg-accent/10 border-accent/20 text-accent" : 
                           bet.status === 'lost' ? "bg-loss/10 border-loss/20 text-loss" : 
                           "bg-bg border-border text-text-main focus:border-accent"
                         )}
                         value={bet.status}
                         onChange={(e) => {
                           const newQueue = [...bulkQueue];
                           newQueue[idx].status = e.target.value as any;
                           setBulkQueue(newQueue);
                         }}
                       >
                         <option value="pending">Pendente</option>
                         <option value="won">Ganha</option>
                         <option value="lost">Perdida</option>
                         <option value="void">Reembolso</option>
                       </select>
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Stake (R$)</p>
                       <input 
                         type="number"
                         step="0.01"
                         className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[10px] font-black text-text-main focus:border-accent outline-none shadow-sm"
                         value={bet.stake}
                         onChange={(e) => {
                           const newQueue = [...bulkQueue];
                           newQueue[idx].stake = Number(e.target.value);
                           setBulkQueue(newQueue);
                         }}
                       />
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Odd</p>
                       <input 
                         type="number"
                         step="0.01"
                         className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[10px] font-black text-accent focus:border-accent outline-none shadow-sm"
                         value={bet.odds}
                         onChange={(e) => {
                           const newQueue = [...bulkQueue];
                           newQueue[idx].odds = Number(e.target.value);
                           setBulkQueue(newQueue);
                         }}
                       />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 border-t border-border bg-surface flex gap-3">
            <button 
              onClick={() => setBulkQueue([])}
              className="flex-1 py-4 px-6 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface transition-all"
            >
              Descartar Tudo
            </button>
            <button 
              onClick={handleConfirmBulk}
              disabled={isScanning}
              className="flex-none md:flex-3 py-4 px-6 bg-accent text-bg rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Confirmar {bulkQueue.length} {bulkQueue.length === 1 ? 'Aposta' : 'Apostas'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
