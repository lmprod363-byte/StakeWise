import React, { useState } from 'react';
import { 
  Plus, 
  Save, 
  Trash2, 
  Target, 
  BarChart3, 
  RotateCcw, 
  Share, 
  Copy, 
  Sparkles,
  GripVertical,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { serverTimestamp, doc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn, formatCurrency } from '../../lib/utils';
import { Bankroll } from '../../types';
import { openApiKeySelector } from '../../services/geminiService';

interface SettingsTabProps {
  user: any;
  bankroll: Bankroll;
  bankrolls: Bankroll[];
  activeBankrollId: string | null;
  setActiveBankrollId: (id: string) => void;
  saveBankroll: (data: Partial<Bankroll>) => Promise<void>;
  deleteBankroll: (id: string) => Promise<void>;
  handleDragEndBankrolls: (event: DragEndEvent) => Promise<void>;
  setIsAddingBankroll: (val: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'loss') => void;
  auditReport: { total: number; duplicates: number; orphans: number };
  fixOrphanedBets: () => Promise<void>;
  removeDuplicates: () => Promise<void>;
  setActiveTab: (tab: any) => void;
  allTimeStats: { totalProfit: number; pendingStake: number };
}

function SortableBankrollItem({ b, activeBankrollId, setActiveBankrollId, deleteBankroll, showToast }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: b.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        activeBankrollId === b.id 
          ? "bg-accent/10 border-accent/40 shadow-sm" 
          : "bg-surface border-border hover:border-text-dim/30"
      )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-bg/50 rounded"
      >
        <GripVertical className="w-4 h-4 text-text-dim" />
      </div>

      <button 
        onClick={() => setActiveBankrollId(b.id)}
        className="flex-1 text-left"
      >
        <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-tight text-text-main">{b.name}</span>
            {activeBankrollId === b.id && (
                <span className="text-[8px] px-1.5 py-0.5 bg-accent text-bg rounded font-black uppercase">Ativa</span>
            )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] font-bold text-text-dim">{formatCurrency(b.total)}</span>
            <span className="text-[10px] font-bold text-text-dim flex items-center gap-1">
                <Target className="w-2.5 h-2.5" />
                Unidade: {formatCurrency(b.unitSize)}
            </span>
        </div>
      </button>

      {b.id !== 'default' && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Excluir a banca "${b.name}"? As apostas vinculadas ficarão sem banca.`)) {
                deleteBankroll(b.id);
            }
          }}
          className="p-2 text-text-dim hover:text-loss transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function SettingsTab({
  user,
  bankroll,
  bankrolls,
  activeBankrollId,
  setActiveBankrollId,
  saveBankroll,
  deleteBankroll,
  handleDragEndBankrolls,
  setIsAddingBankroll,
  showToast,
  auditReport,
  fixOrphanedBets,
  removeDuplicates,
  setActiveTab,
  allTimeStats
}: SettingsTabProps) {
  const [localTotal, setLocalTotal] = useState(bankroll.total.toString());
  const [localUnit, setLocalUnit] = useState(bankroll.unitSize.toString());
  const [localStopLoss, setLocalStopLoss] = useState(bankroll.dailyStopLoss?.toString() || '');
  const [localStopGreen, setLocalStopGreen] = useState(bankroll.dailyStopGreen?.toString() || '');
  const [localWeeklyGoal, setLocalWeeklyGoal] = useState(bankroll.weeklyGoal?.toString() || '');
  const [localMonthlyGoal, setLocalMonthlyGoal] = useState(bankroll.monthlyGoal?.toString() || '');
  const [localWorkingCapital, setLocalWorkingCapital] = useState(bankroll.workingCapitalPct?.toString() || '');
  const [localActualBalance, setLocalActualBalance] = useState('');
  const [localStakeCalculationMode, setLocalStakeCalculationMode] = useState<'initial' | 'current'>(bankroll.stakeCalculationMode || 'initial');
  const [showAllPercentages, setShowAllPercentages] = useState(false);
  const [manualAiKey, setManualAiKey] = useState(localStorage.getItem('STAKEWISE_CUSTOM_GEMINI_KEY') || '');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveLocalSettings = () => {
    const total = parseFloat(localTotal) || bankroll.total || 0;
    const unitSize = parseFloat(localUnit) || bankroll.unitSize || 0;
    const dailyStopLoss = parseFloat(localStopLoss) || bankroll.dailyStopLoss || 0;
    const dailyStopGreen = parseFloat(localStopGreen) || bankroll.dailyStopGreen || 0;
    const weeklyGoal = parseFloat(localWeeklyGoal) || bankroll.weeklyGoal || 0;
    const monthlyGoal = parseFloat(localMonthlyGoal) || bankroll.monthlyGoal || 0;
    const workingCapitalPct = parseFloat(localWorkingCapital) || bankroll.workingCapitalPct || 0;
    const stakeCalculationMode = localStakeCalculationMode;
    
    saveBankroll({ 
      total, 
      unitSize, 
      dailyStopLoss, 
      dailyStopGreen, 
      weeklyGoal, 
      monthlyGoal, 
      workingCapitalPct,
      stakeCalculationMode
    });
    
    setLocalStopLoss('');
    setLocalStopGreen('');
    setLocalWeeklyGoal('');
    setLocalMonthlyGoal('');
    setLocalWorkingCapital('');
    showToast("Configurações salvas!", "success");
  };

  const syncBalanceAction = () => {
    const val = localActualBalance.replace(',', '.');
    const target = parseFloat(val);
    if (isNaN(target)) {
      showToast("Insira um valor válido", "info");
      return;
    }
    
    // Banca Inicial = Saldo Alvo - Lucro Acumulado + Apostas em Aberto
    const newTotal = target - allTimeStats.totalProfit + allTimeStats.pendingStake;
    
    saveBankroll({ total: newTotal, unitSize: bankroll.unitSize });
    showToast("Saldo sincronizado com sucesso!", "success");
    setLocalActualBalance('');
  };

  return (
    <div className="max-w-xl space-y-8 pb-20">
        {/* Mobile Quick Links */}
        <div className="lg:hidden grid grid-cols-2 gap-4">
            <button 
                onClick={() => setActiveTab('insights')}
                className="flex flex-col items-center justify-center gap-2 p-6 bg-accent/10 border border-accent/20 rounded-2xl transition-all active:scale-95"
            >
                <Sparkles className="w-8 h-8 text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Insights IA</span>
            </button>
            <button 
                onClick={() => setActiveTab('trash')}
                className="flex flex-col items-center justify-center gap-2 p-6 bg-loss/10 border border-loss/20 rounded-2xl transition-all active:scale-95"
            >
                <Trash2 className="w-8 h-8 text-loss" />
                <span className="text-[10px] font-black uppercase tracking-widest text-loss">Lixeira</span>
            </button>
        </div>

        <div className="glass-card p-6 border-accent/20 bg-accent/5">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black uppercase tracking-tighter">Gerenciar Bancas</h3>
                <button 
                    onClick={() => setIsAddingBankroll(true)}
                    className="bg-accent text-bg px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
                >
                    <Plus className="w-3 h-3" />
                    Nova Banca
                </button>
            </div>

            <div className="space-y-3">
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndBankrolls}
                >
                    <SortableContext 
                        items={bankrolls.map(b => b.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {bankrolls.map(b => (
                            <SortableBankrollItem 
                                key={b.id} 
                                b={b} 
                                activeBankrollId={activeBankrollId}
                                setActiveBankrollId={setActiveBankrollId}
                                deleteBankroll={deleteBankroll}
                                showToast={showToast}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>

        <div className="glass-card p-6 border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.05)]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black uppercase tracking-tighter">Configuração da Banca</h3>
                <button 
                    onClick={saveLocalSettings}
                    className="bg-accent text-bg px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
                >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Alterações
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Nome da Banca</label>
                    <input 
                        type="text"
                        value={bankroll.name}
                        onChange={(e) => saveBankroll({ ...bankroll, name: e.target.value })}
                        className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                        placeholder="Altere o nome da sua banca..."
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Banca Inicial</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                        <input 
                            type="text" 
                            inputMode="decimal"
                            value={localTotal}
                            onChange={(e) => setLocalTotal(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                        />
                    </div>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mt-2">O valor depositado inicialmente para começar a operar.</p>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Valor da Unidade (Staking)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                        <input 
                            type="text" 
                            inputMode="decimal"
                            value={localUnit}
                            onChange={(e) => setLocalUnit(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                        />
                    </div>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mt-2">Recomendado entre 1% a 3% da banca total.</p>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Modo de Sugestão de Stake</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => setLocalStakeCalculationMode('initial')}
                            className={cn(
                                "py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                (localStakeCalculationMode || bankroll.stakeCalculationMode || 'initial') === 'initial'
                                    ? "bg-accent text-bg border-accent shadow-lg shadow-accent/20"
                                    : "bg-surface text-text-dim border-border hover:border-text-dim"
                            )}
                        >
                            Banca Inicial
                        </button>
                        <button 
                            onClick={() => setLocalStakeCalculationMode('current')}
                            className={cn(
                                "py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                (localStakeCalculationMode === 'current' || (!localStakeCalculationMode && bankroll.stakeCalculationMode === 'current'))
                                    ? "bg-accent text-bg border-accent shadow-lg shadow-accent/20"
                                    : "bg-surface text-text-dim border-border hover:border-text-dim"
                            )}
                        >
                            Banca Atual
                        </button>
                    </div>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mt-2">
                        Define qual base de cálculo você prefere ver como referência principal para suas unidades.
                    </p>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-lg border border-border border-dashed">
                        <p className="text-[10px] uppercase font-black text-text-dim mb-1 tracking-widest">Total de Unidades</p>
                        <p className="text-2xl font-black text-accent">{(bankroll.total / bankroll.unitSize).toFixed(0)}u</p>
                    </div>
                    <div className="bg-surface p-4 rounded-lg border border-border border-dashed">
                        <p className="text-[10px] uppercase font-black text-text-dim mb-1 tracking-widest">% por Unidade</p>
                        <p className="text-2xl font-black text-accent">{((bankroll.unitSize / bankroll.total) * 100).toFixed(1)}%</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="glass-card p-6 border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.05)]">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Target className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">Metas e Gestão</h3>
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Defina seus limites de parada e objetivos</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Stop Green (Meta Diária)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                placeholder={bankroll.dailyStopGreen?.toString() || "0.00"}
                                value={localStopGreen}
                                onChange={(e) => setLocalStopGreen(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Stop Loss (Limite Diário)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                placeholder={bankroll.dailyStopLoss?.toString() || "0.00"}
                                value={localStopLoss}
                                onChange={(e) => setLocalStopLoss(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors border-loss/20 focus:border-loss"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Meta Semanal</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                placeholder={bankroll.weeklyGoal?.toString() || "0.00"}
                                value={localWeeklyGoal}
                                onChange={(e) => setLocalWeeklyGoal(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Meta Mensal</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                placeholder={bankroll.monthlyGoal?.toString() || "0.00"}
                                value={localMonthlyGoal}
                                onChange={(e) => setLocalMonthlyGoal(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Gordura para Operar (%)</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            inputMode="decimal"
                            placeholder={bankroll.workingCapitalPct?.toString() || "0"}
                            value={localWorkingCapital}
                            onChange={(e) => setLocalWorkingCapital(e.target.value)}
                            className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm">% do Lucro</span>
                    </div>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mt-2">Corresponde a quanto do seu lucro você aceita arriscar para alavancar ("gordura").</p>
                </div>

                <button 
                    onClick={saveLocalSettings}
                    className="w-full bg-accent text-bg py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                >
                    <Save className="w-3.5 h-3.5" />
                    Atualizar Metas e Gestão
                </button>
            </div>
        </div>

        <div className="glass-card p-6 border-accent/20 bg-accent/5">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/20 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter">Relatório de Integridade</h3>
                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Estado atual da sua base de dados</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-bg/40 rounded-xl border border-border">
                    <span className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-1">Apostas Totais</span>
                    <span className="text-xl font-black text-text-main">{auditReport.total}</span>
                </div>
                <div className={cn("p-4 rounded-xl border", auditReport.duplicates > 0 ? "bg-loss/10 border-loss/20" : "bg-bg/40 border-border")}>
                    <span className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-1">Duplicadas</span>
                    <span className={cn("text-xl font-black", auditReport.duplicates > 0 ? "text-loss" : "text-text-main")}>{auditReport.duplicates}</span>
                </div>
                <div className={cn("p-4 rounded-xl border", auditReport.orphans > 0 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-bg/40 border-border")}>
                    <span className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-1">Sem Banca</span>
                    <span className={cn("text-xl font-black", auditReport.orphans > 0 ? "text-yellow-500" : "text-text-main")}>{auditReport.orphans}</span>
                </div>
            </div>
        </div>

        <div className="glass-card p-6 border-red-500/20">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500/10 rounded-lg">
                    <RotateCcw className="w-5 h-5 text-red-500" />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">Centro de Resgate</h3>
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Corrija problemas com apostas 'perdidas' ou órfãs</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-bg/50 border border-border rounded-xl">
                    <h4 className="text-xs font-black uppercase tracking-widest mb-2">Resgatar Apostas Órfãs</h4>
                    <p className="text-[9px] text-text-dim mb-4 leading-relaxed font-bold uppercase tracking-wider">Busca apostas que pertenciam a bancas excluídas e as move para a banca atual ('{bankroll.name}').</p>
                    <button 
                        onClick={fixOrphanedBets}
                        className="w-full py-3 bg-surface border border-border hover:border-accent hover:text-accent transition-all rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                        Procurar Órfãs ({auditReport.orphans})
                    </button>
                </div>
                
                <div className="p-4 bg-bg/50 border border-border rounded-xl">
                    <h4 className="text-xs font-black uppercase tracking-widest mb-2">Remover Duplicatas</h4>
                    <p className="text-[9px] text-text-dim mb-4 leading-relaxed font-bold uppercase tracking-wider">Identifica entradas idênticas (mesmo evento, odd e hora) e remove as cópias indesejadas.</p>
                    <button 
                        onClick={removeDuplicates}
                        className="w-full py-3 bg-surface border border-border hover:border-accent hover:text-accent transition-all rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                        Limpar Duplicatas ({auditReport.duplicates})
                    </button>
                </div>
            </div>
        </div>

        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black uppercase tracking-tighter">Sugestões de Stake</h3>
                <button 
                    onClick={() => setShowAllPercentages(!showAllPercentages)}
                    className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/5 px-3 py-1.5 rounded border border-accent/20 hover:bg-accent/10"
                >
                    {showAllPercentages ? 'Ver Menos' : 'Ver Mais Opções'}
                </button>
            </div>
            <p className="text-text-dim text-xs mb-6 font-bold uppercase tracking-widest">Baseado em {formatCurrency(bankroll.total)}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(showAllPercentages 
                  ? [5, 3, 2, 1.5, 1.25, 1, 0.75, 0.5, 0.35, 0.25, 0.2, 0.15, 0.1, 0.05]
                  : [2, 1.5, 1, 0.5, 0.25, 0.15, 0.1, 0.05]
                ).map((pct) => {
                    const value = bankroll.total * (pct / 100);
                    return (
                        <motion.div 
                            key={pct} 
                            whileTap={{ scale: 0.98 }}
                            className="flex flex-col p-4 bg-surface/50 border border-border rounded-xl group hover:border-accent transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 blur-2xl rounded-full translate-x-8 -translate-y-8" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-text-dim mb-1">{pct}%</span>
                            <span className="text-sm font-black font-mono text-accent mb-3">{formatCurrency(value)}</span>
                            <button 
                                onClick={() => saveBankroll({ ...bankroll, unitSize: value })}
                                className="w-full py-2 bg-surface text-[9px] font-black uppercase tracking-widest text-text-main rounded border border-border hover:border-accent hover:text-accent transition-all relative z-10"
                            >
                                Salvar como Unidade
                            </button>
                        </motion.div>
                    );
                })}
            </div>
        </div>

        <motion.div 
            whileTap={{ scale: 0.99 }}
            className="glass-card p-6 border-accent/20 bg-accent/5 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[60px] rounded-full translate-x-12 -translate-y-12" />
            <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-accent relative z-10">Sincronizar Saldo Real</h3>
            <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mb-6 relative z-10">
                Use esta opção para ajustar sua banca de forma que o "Saldo Atual" do app fique idêntico ao saldo disponível na sua casa de apostas agora.
            </p>
            
            <div className="space-y-4 relative z-10">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Seu Saldo Disponível Hoje (já sem as abertas)</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                placeholder="Ex: 494.27"
                                value={localActualBalance}
                                onChange={(e) => setLocalActualBalance(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                            />
                        </div>
                        <button 
                            onClick={syncBalanceAction}
                            className="bg-accent text-bg px-6 rounded-lg font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all shadow-lg shadow-accent/20"
                        >
                            Sincronizar
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>

        <div className="glass-card p-6 border-accent/20 bg-accent/5">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent/20 rounded-lg">
                    <Share className="w-5 h-5 text-accent" />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">Instalar no iPhone (iOS)</h3>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider opacity-60">Adicione à tela de início</p>
                </div>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                   <div className="flex items-center gap-3 text-[11px] font-bold text-text-main opacity-80">
                      <span className="w-5 h-5 flex items-center justify-center bg-accent/20 rounded-full text-[10px] text-accent">1</span>
                      <span>Abra este Link no <span className="text-accent underline font-black tracking-tight">SAFARI</span></span>
                   </div>
                   <div className="flex items-center gap-3 text-[11px] font-bold text-text-main opacity-80">
                      <span className="w-5 h-5 flex items-center justify-center bg-accent/20 rounded-full text-[10px] text-accent">2</span>
                      <span>Toque no botão de <span className="text-accent font-black tracking-tight">COMPARTILHAR</span> (ícone central)</span>
                   </div>
                   <div className="flex items-center gap-3 text-[11px] font-bold text-text-main opacity-80">
                      <span className="w-5 h-5 flex items-center justify-center bg-accent/20 rounded-full text-[10px] text-accent">3</span>
                      <span>Selecione <span className="text-accent font-black tracking-tight">ADICIONAR À TELA DE INÍCIO</span></span>
                   </div>
                </div>

                <div className="p-3 bg-surface rounded-lg border border-border">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-dim mb-2">Link de Instalação:</p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-[10px] font-mono truncate text-text-main">{window.location.origin}</code>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.origin);
                                showToast("Link copiado!", "info");
                            }}
                            className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded transition-colors"
                        >
                            <Copy className="w-3.5 h-3.5 text-accent" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="glass-card p-6 border-accent/20">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-accent">Inteligência Artificial (Gemini)</h3>
            <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mb-6">O scanner de imagens e análise de apostas utiliza a tecnologia Google Gemini.</p>
            
            <div className="flex flex-col gap-4">
                <button 
                    onClick={async () => {
                        try {
                            await openApiKeySelector();
                            showToast('AI Ativada com Sucesso', 'success');
                        } catch (e) {
                            showToast('Erro ao abrir seletor', 'info');
                        }
                    }}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-accent text-bg font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
                >
                    <Sparkles className="w-5 h-5" />
                    Ativar / Atualizar AI
                </button>
                
                <div className="p-4 bg-surface/50 border border-border rounded-lg space-y-4">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-3">Modo de Emergência (Entrada Manual)</h4>
                        <p className="text-[9px] text-text-dim font-bold uppercase tracking-tight mb-3">Se o botão acima não funcionar no seu celular, cole sua chave aqui:</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="password" 
                                    placeholder="Cole sua Gemini API Key aqui..."
                                    value={manualAiKey}
                                    onChange={(e) => setManualAiKey(e.target.value)}
                                    className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-mono text-xs transition-colors pr-10"
                                />
                                {manualAiKey && manualAiKey.length > 20 && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={async () => {
                                        if (manualAiKey.trim().length > 20) {
                                            const key = manualAiKey.trim();
                                            localStorage.setItem('STAKEWISE_CUSTOM_GEMINI_KEY', key);
                                            
                                            if (user) {
                                                try {
                                                    await setDoc(doc(db, 'users', user.uid), {
                                                        geminiKey: key,
                                                        updatedAt: serverTimestamp()
                                                    }, { merge: true });
                                                    showToast('Configuração Salva na Nuvem!', 'success');
                                                } catch (e) {
                                                    console.error("Erro ao salvar na nuvem:", e);
                                                    showToast('Salvo Localmente (Erro na Nuvem)', 'info');
                                                }
                                            } else {
                                                showToast('Configuração Salva Localmente!', 'success');
                                            }
                                        } else {
                                            showToast('Chave inválida ou muito curta', 'info');
                                        }
                                    }}
                                    className="flex-1 sm:flex-initial px-6 py-3 bg-surface border border-border text-accent rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent/10 transition-colors"
                                >
                                    Salvar
                                </button>
                                {manualAiKey && (
                                    <button 
                                        onClick={async () => {
                                            if (confirm('Deseja remover a chave salva permanentemente?')) {
                                                localStorage.removeItem('STAKEWISE_CUSTOM_GEMINI_KEY');
                                                setManualAiKey('');
                                                
                                                if (user) {
                                                    try {
                                                        await setDoc(doc(db, 'users', user.uid), {
                                                            geminiKey: deleteField(),
                                                            updatedAt: serverTimestamp()
                                                        }, { merge: true });
                                                    } catch (e) {
                                                        console.error("Erro ao deletar da nuvem:", e);
                                                    }
                                                }
                                                showToast('Chave removida', 'info');
                                            }
                                        }}
                                        className="px-4 bg-bg border border-border rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                        title="Limpar Chave"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="text-[9px] text-text-dim font-bold uppercase tracking-tight leading-relaxed">
                        <span className="text-accent underline">Sobre Limites:</span> O Gemini possui um limite de requisições por minuto na versão gratuita (aproximadamente 15 por minuto). Se o scanner parar de responder rapidamente, aguarde 1 minuto.
                    </p>
                </div>

                <button 
                    onClick={() => {
                        if (confirm('Isso irá limpar o cache do app e reiniciar. Seus dados do Firebase continuam salvos. Continuar?')) {
                            localStorage.clear();
                            window.location.href = window.location.origin + '/?v=' + Date.now();
                        }
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all"
                >
                    <RotateCcw className="w-3 h-3" />
                    Limpar App e Forçar Atualização
                </button>
            </div>
        </div>

        <div className="p-8 bg-surface border border-border rounded-xl">
            <h3 className="text-xs font-black uppercase tracking-widest mb-3 text-accent transition-colors">Dica de Gestão</h3>
            <p className="text-sm text-text-dim font-bold leading-relaxed uppercase tracking-tight">
                Manter uma unidade fixa ajuda a evitar perdas emocionais. Tente nunca apostar mais do que sua unidade padrão a menos que tenha uma estratégia de confiança validada.
            </p>
        </div>

        <div className="pt-8 pb-12 flex flex-col items-center gap-2 opacity-30 select-none">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">StakeWise App</p>
            <div className="flex items-center gap-2">
                <span className="h-[1px] w-4 bg-primary/20"></span>
                <p className="text-[9px] font-bold font-mono text-primary">v1.5.0 (AI & Cloud Update)</p>
                <span className="h-[1px] w-4 bg-primary/20"></span>
            </div>
            <a href="/privacy.html" target="_blank" className="text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-accent mt-2 transition-colors">
                Política de Privacidade
            </a>
        </div>
    </div>
  );
}
