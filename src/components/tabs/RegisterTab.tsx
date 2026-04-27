import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Loader2, 
  Edit3, 
  Target, 
  Zap, 
  Wallet, 
  Save, 
  History 
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn, safeNewDate } from '../../lib/utils';
import { Bet, Bankroll } from '../../types';
import { extractBetFromImage } from '../../services/geminiService';
import { InputGroup } from '../ui/InputGroup';

interface RegisterTabProps {
  user: any;
  bankroll: Bankroll;
  activeBankrollId: string | null;
  userBookmakers: string[];
  editingBetId: string | null;
  setEditingBetId: (id: string | null) => void;
  isRegistering: boolean;
  addBet: (data: Omit<Bet, 'id' | 'profit'>) => Promise<void>;
  updateBet: (id: string, data: Partial<Bet>) => Promise<void>;
  setActiveTab: (tab: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'loss') => void;
  predefinedMarkets: string[];
  predefinedSelections: string[];
}

export function RegisterTab({
  user,
  bankroll,
  activeBankrollId,
  userBookmakers,
  editingBetId,
  setEditingBetId,
  isRegistering,
  addBet,
  updateBet,
  setActiveTab,
  showToast,
  predefinedMarkets,
  predefinedSelections
}: RegisterTabProps) {
  const [betForm, setBetForm] = useState({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    sport: 'Futebol',
    league: '',
    event: '',
    market: '',
    selection: '',
    odds: '',
    stake: bankroll.unitSize.toString(),
    status: 'pending' as Bet['status'],
    cashoutValue: '',
    bookmaker: userBookmakers[0] || 'Bet365',
    betId: '',
    bankrollId: activeBankrollId || '',
    isLive: false
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [isManualBookmaker, setIsManualBookmaker] = useState(false);

  // Sync stake when bankroll unit size changes
  useEffect(() => {
    if (!editingBetId && !isScanning) {
      setBetForm(prev => ({ ...prev, stake: bankroll.unitSize.toString() }));
    }
  }, [bankroll.unitSize, editingBetId, isScanning]);

  const processFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    
    setIsScanning(true);
    setScanError('');
    
    try {
      const file = files[0];
      
      // Convert file to base64 for Gemini API
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64String = await base64Promise;
      const result = await extractBetFromImage(base64String);
      
      if (result) {
        setBetForm(prev => ({
          ...prev,
          date: result.date ? format(safeNewDate(result.date), "yyyy-MM-dd'T'HH:mm") : prev.date,
          sport: result.sport || prev.sport,
          league: result.league || prev.league,
          event: result.event || prev.event,
          market: result.market || prev.market,
          selection: result.selection || prev.selection,
          odds: result.odds?.toString() || prev.odds,
          stake: result.stake?.toString() || prev.stake,
          bookmaker: result.bookmaker || prev.bookmaker,
          isLive: result.isLive ?? prev.isLive
        }));
        showToast("Dados extraídos com sucesso!", "success");
      }
    } catch (error: any) {
      console.error("Erro no scanner:", error);
      setScanError(error.message || "Erro ao analisar imagem");
      showToast("Erro ao analisar imagem com IA", "loss");
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) processFiles(files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const betData = {
      date: safeNewDate(betForm.date).toISOString(),
      sport: betForm.sport,
      league: betForm.league,
      event: betForm.event,
      market: betForm.market,
      selection: betForm.selection,
      odds: Number(betForm.odds),
      stake: Number(betForm.stake),
      status: betForm.status,
      cashoutValue: betForm.cashoutValue ? Number(betForm.cashoutValue) : null,
      bookmaker: betForm.bookmaker,
      betId: betForm.betId,
      isLive: betForm.isLive,
      bankrollId: activeBankrollId || '',
    };
    
    if (editingBetId) {
      updateBet(editingBetId, betData);
    } else {
      addBet(betData);
    }
  };

  return (
    <motion.div 
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="max-w-4xl mx-auto pb-20"
    >
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12">
             <div 
                className={cn(
                   "glass-card p-12 border-dashed border-2 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-accent transition-all relative overflow-hidden backdrop-blur-xl bg-white/[0.03]",
                   isScanning ? "border-accent opacity-80" : "border-border"
                )}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   const files = e.dataTransfer.files;
                   if (files && files.length > 0) processFiles(files);
                }}
             >
                <div className={cn(
                   "absolute inset-0 bg-accent/5 transition-opacity duration-1000",
                   isScanning ? "opacity-100 animate-pulse" : "opacity-0 group-hover:opacity-100"
                )} />
                
                {isScanning ? (
                   <div className="relative z-10 flex flex-col items-center">
                      <div className="relative mb-6">
                         <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-20" />
                         <div className="bg-accent p-6 rounded-2xl shadow-2xl relative">
                            <Loader2 className="w-10 h-10 text-bg animate-spin" />
                         </div>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-accent">Analisando Print...</h3>
                      <p className="text-text-dim text-[10px] font-black uppercase tracking-widest animate-pulse">
                         Aguarde, estamos processando as informações da sua aposta
                      </p>
                   </div>
                ) : (
                   <div className="relative z-10">
                      <div className="bg-surface p-6 rounded-2xl mb-6 inline-block shadow-2xl border border-border group-hover:border-accent/50 group-hover:scale-110 transition-all">
                         <Camera className="w-10 h-10 text-accent" />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Escanear Aposta com IA</h3>
                      <p className="text-text-dim text-xs font-black uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                         Arraste um print, cole do clipboard (Ctrl+V) ou clique para automatizar o registro
                      </p>
                      <input 
                         type="file" 
                         multiple 
                         accept="image/*" 
                         onChange={handleImageUpload}
                         className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                   </div>
                )}
             </div>
          </div>

          <div className="lg:col-span-12">
             <form onSubmit={handleSubmit} className="glass-card p-6 md:p-10 space-y-10 relative overflow-hidden backdrop-blur-2xl bg-white/[0.02] border-white/5">
                {isScanning && (
                   <div className="absolute inset-0 z-20 bg-bg/40 backdrop-blur-[2px] cursor-wait flex items-center justify-center">
                      <div className="flex flex-col items-center gap-4">
                         <Loader2 className="w-8 h-8 animate-spin text-accent" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-accent">IA Analisando Rigorosamente...</span>
                      </div>
                   </div>
                )}
                
                <div className="flex items-center justify-between border-b border-border pb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center border border-accent/20">
                         <Edit3 className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                         <h3 className="text-xl font-black uppercase tracking-tighter">
                            {editingBetId ? 'Editar Detalhes' : 'Registro Detalhado'}
                         </h3>
                         <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Configuração manual e ajustes da IA</p>
                      </div>
                   </div>
                   {scanError && (
                      <div className="px-4 py-2 bg-loss/10 border border-loss/20 rounded-lg">
                         <p className="text-loss text-[9px] font-black uppercase tracking-widest leading-none">{scanError}</p>
                      </div>
                   )}
                </div>

                <div className="space-y-6">
                   <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Contexto do Evento</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <InputGroup 
                         label="Data e Hora" 
                         type="datetime-local" 
                         value={betForm.date} 
                         onChange={(e) => setBetForm({...betForm, date: e.target.value})} 
                         required 
                      />
                      <InputGroup 
                         label="Esporte" 
                         type="text" 
                         list="sports"
                         placeholder="Futebol..."
                         value={betForm.sport} 
                         onChange={(e) => setBetForm({...betForm, sport: e.target.value})} 
                         required 
                      />
                      <InputGroup 
                         label="Liga / Competição" 
                         type="text" 
                         placeholder="Ex: Premier League"
                         value={betForm.league} 
                         onChange={(e) => setBetForm({...betForm, league: e.target.value})} 
                      />
                   </div>
                   <InputGroup 
                      label="Nome do Evento (Times / Atletas)" 
                      type="text" 
                      placeholder="Ex: Real Madrid x Barcelona"
                      value={betForm.event} 
                      onChange={(e) => setBetForm({...betForm, event: e.target.value})} 
                      required 
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-6 border-t border-border/50">
                   <div className="md:col-span-12 space-y-6">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-accent" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Seleção e Estratégia</span>
                         </div>
                         <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            <span className="text-[9px] font-black text-accent uppercase tracking-tighter">Banca: {bankroll.name}</span>
                         </div>
                      </div>
                      <InputGroup 
                         label="Mercado / Detalhes da Aposta" 
                         type="text" 
                         list="markets"
                         placeholder="Ex: Real Madrid - Vencer • Ambas Marcam: Sim"
                         value={betForm.market} 
                         onChange={(e) => setBetForm({...betForm, market: e.target.value, selection: e.target.value})} 
                         required 
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputGroup 
                            label="Odds (Cotação)" 
                            type="number" 
                            step="0.01"
                            placeholder="1.90"
                            value={betForm.odds} 
                            onChange={(e) => setBetForm({...betForm, odds: e.target.value})} 
                            required 
                         />
                         <InputGroup 
                            label="Investimento (Stake)" 
                            type="number" 
                            step="0.01"
                            placeholder="R$ 50,00"
                            value={betForm.stake} 
                            onChange={(e) => setBetForm({...betForm, stake: e.target.value})} 
                            required 
                         />
                      </div>
                   </div>

                   <div className="md:col-span-4 space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                         <Wallet className="w-4 h-4 text-accent" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Plataforma</span>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest block">Casa de Aposta</label>
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
                                    "px-2 py-3 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all duration-300",
                                    betForm.bookmaker === b 
                                       ? "bg-accent text-bg border-accent shadow-lg shadow-accent/20" 
                                       : "bg-surface border-border text-text-dim hover:border-border-dim/50"
                                 )}
                              >
                                 {b}
                              </button>
                           ))}
                           <button
                              type="button"
                              onClick={() => setIsManualBookmaker(!isManualBookmaker)}
                              className={cn(
                                 "px-2 py-3 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all duration-300",
                                 isManualBookmaker ? "bg-accent/10 border-accent text-accent" : "bg-surface border-border text-text-dim"
                              )}
                           >
                              {isManualBookmaker ? 'Fechar' : 'Outra'}
                           </button>
                        </div>
                        {isManualBookmaker && (
                           <input
                              type="text"
                              autoFocus
                              value={betForm.bookmaker}
                              onChange={(e) => setBetForm(prev => ({...prev, bookmaker: e.target.value}))}
                              placeholder="Nome da plataforma..."
                              className="w-full px-4 py-3 bg-bg border border-accent/30 text-[10px] font-black uppercase tracking-tight rounded-lg focus:outline-none focus:border-accent"
                           />
                        )}
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-border/50">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Status Inicial</label>
                      <select 
                         className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-bold text-text-main transition-all"
                         value={betForm.status}
                         onChange={(e) => setBetForm({...betForm, status: e.target.value as Bet['status']})}
                      >
                         <option value="pending">Pendente</option>
                         <option value="won">Ganha (Green)</option>
                         <option value="lost">Perdida (Red)</option>
                         <option value="half_win">Meio Green</option>
                         <option value="half_loss">Meio Red</option>
                         <option value="void">Reembolsada</option>
                         <option value="cashout">Cash Out</option>
                      </select>
                   </div>

                   <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border">
                      <div className="flex-1">
                         <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Aposta Ao Vivo</label>
                         <p className="text-[9px] text-text-dim/60 font-medium">Evento em andamento</p>
                      </div>
                      <button
                         type="button"
                         onClick={() => setBetForm({...betForm, isLive: !betForm.isLive})}
                         className={cn(
                            "w-12 h-6 rounded-full transition-all relative border border-white/5",
                            betForm.isLive ? "bg-accent shadow-[0_0_15px_rgba(0,255,149,0.3)]" : "bg-border"
                         )}
                      >
                         <div className={cn(
                            "absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all",
                            betForm.isLive ? "right-1" : "left-1"
                         )} />
                      </button>
                   </div>

                   {betForm.status === 'cashout' && (
                      <InputGroup 
                         label="Valor Cash Out" 
                         type="number" 
                         step="0.01"
                         placeholder="0.00"
                         value={betForm.cashoutValue} 
                         onChange={(e) => setBetForm({...betForm, cashoutValue: e.target.value})} 
                         required 
                      />
                   )}
                </div>

                <div className="pt-8 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-border pb-2">
                   <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                       Certifique-se de que os dados conferem com sua aposta real.
                   </p>
                   <div className="flex gap-4 w-full md:w-auto">
                      <button 
                         type="button"
                         onClick={() => {
                            setActiveTab('dashboard');
                            setEditingBetId(null);
                         }}
                         className="flex-1 md:px-8 py-4 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface transition-all active:scale-95"
                      >
                         Cancelar
                      </button>
                      <button 
                         type="submit"
                         disabled={isRegistering}
                         className={cn(
                           "flex-[2] md:px-12 py-4 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-xl shadow-accent/20 active:scale-95 flex items-center justify-center gap-2",
                           isRegistering && "opacity-50 cursor-not-allowed"
                         )}
                      >
                         {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                         {editingBetId ? 'Salvar Alterações' : 'Confirmar e Registrar'}
                      </button>
                   </div>
                </div>

                <datalist id="sports">
                   <option value="Futebol" /><option value="Basquete" /><option value="Tênis" /><option value="E-Sports" /><option value="Vôlei" /><option value="MMA" />
                </datalist>
                <datalist id="markets">
                   {predefinedMarkets.map(m => <option key={m} value={m} />)}
                </datalist>
                <datalist id="selections">
                   {predefinedSelections.map(s => <option key={s} value={s} />)}
                </datalist>
             </form>
          </div>
       </div>
    </motion.div>
  );
}
