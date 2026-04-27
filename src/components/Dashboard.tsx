import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, Loader2, Play, History, BarChart3, 
  TrendingUp, Target, Clock, DollarSign, Zap, BookOpen, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip } from 'recharts';
import type { Bet, Bankroll } from '../types';

// Auxiliar components
const GoalProgressBar = memo(({ 
  label, current, target, isLoss = false, className, formatCurrency 
}: { 
  label: string, 
  current: number, 
  target: number, 
  isLoss?: boolean, 
  className?: string,
  formatCurrency: (val: number) => string
}) => {
  const percent = target !== 0 ? Math.min((Math.max(0, isLoss ? (current < 0 ? -current : 0) : (current > 0 ? current : 0)) / Math.abs(target)) * 100, 100) : 0;
  const isTargetMet = target !== 0 && (isLoss ? current <= target : current >= target);
  
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between items-end">
        <span className="text-[9px] font-black uppercase tracking-widest text-text-dim">{label}</span>
        <span className={cn("text-[10px] font-black tabular-nums font-mono uppercase tracking-tighter", 
          isTargetMet ? (isLoss ? "text-loss" : "text-accent") : "text-text-main"
        )}>
          {formatCurrency(current)} <span className="text-[8px] text-text-dim/50 font-sans mx-1">/</span> {formatCurrency(target)}
        </span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={cn("h-full transition-all duration-1000", 
            isLoss 
              ? (current <= target ? "bg-loss shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-loss/30") 
              : (current >= target ? "bg-accent shadow-[0_0_8px_rgba(0,255,149,0.4)]" : "bg-accent/30")
          )}
        />
      </div>
    </div>
  );
});

function StatsCard({ 
  title, value, trend, icon, transition 
}: { 
  title: string, 
  value: string, 
  trend?: 'up' | 'down', 
  icon: React.ReactNode,
  transition: any
}) {
  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      transition={transition}
      className="stat-card"
    >
      <p className="text-text-dim text-[11px] font-black uppercase tracking-widest mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className={cn(
            "text-3xl font-black tracking-tighter",
            trend === 'up' ? "text-accent" : trend === 'down' ? "text-loss" : "text-text-main"
        )}>{value}</h4>
      </div>
    </motion.div>
  );
}

interface DashboardProps {
  activeBankrollId: string | null;
  bankroll: Bankroll | undefined;
  stats: any;
  allTimeStats: any;
  goalStats: any;
  chartData: any[];
  chartRange: any;
  timeRange: string;
  setTimeRange: (range: 'all' | '30d' | '7d' | '24h') => void;
  showSyncBanner: boolean;
  setShowSyncBanner: (show: boolean) => void;
  isSyncingResults: boolean;
  syncResults: (specificBets?: Bet[], silent?: boolean) => Promise<void>;
  bookmakerExposure: [string, number][];
  getBookmakerStyle: (bm: string) => any;
  formatCurrency: (val: number) => string;
  variants: {
    page: any;
    stagger: any;
    item: any;
  };
  transitions: any;
}

export function Dashboard({
  activeBankrollId,
  bankroll,
  stats,
  allTimeStats,
  goalStats,
  chartData,
  chartRange,
  timeRange,
  setTimeRange,
  showSyncBanner,
  setShowSyncBanner,
  isSyncingResults,
  syncResults,
  bookmakerExposure,
  getBookmakerStyle,
  formatCurrency,
  variants,
  transitions
}: DashboardProps) {
  const [showBookmakerModal, setShowBookmakerModal] = React.useState(false);

  if (!bankroll) return null;

  return (
    <motion.div 
      key={`dashboard-${activeBankrollId}`}
      variants={variants.page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transitions.smooth}
      className="space-y-8"
    >
      <AnimatePresence>
        {showSyncBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-4 border-accent/20 bg-accent/5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <RefreshCw className={cn("w-4 h-4 text-accent", isSyncingResults && "animate-spin")} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-main">Resultados Pendentes</p>
                <p className="text-[9px] text-text-dim uppercase tracking-tight">Existem partidas no seu histórico aguardando resultado.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSyncBanner(false)}
                className="px-3 py-1.5 text-[9px] font-black uppercase text-text-dim hover:text-text-main"
              >
                Agora não
              </button>
              <button 
                onClick={() => syncResults(undefined, true)}
                disabled={isSyncingResults}
                className="bg-accent text-bg px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                {isSyncingResults ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Sincronizar Agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Range Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-text-dim">Período de Análise</h2>
        </div>
        <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Tudo' },
            { id: '30d', label: '30 Dias' },
            { id: '7d', label: '7 Dias' },
            { id: '24h', label: '24h' },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id as any)}
              className={cn(
                "px-4 py-1.5 text-[10px] whitespace-nowrap font-black uppercase tracking-widest rounded-md transition-all",
                timeRange === range.id ? "bg-surface text-accent border border-border" : "text-text-dim hover:text-text-main"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Summary Grid */}
      <motion.div 
        variants={variants.stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4"
      >
        <motion.div variants={variants.item}><StatsCard transition={transitions.spring} title="Total Entradas" value={`${stats.totalBets}`} icon={<History />} /></motion.div>
        <motion.div variants={variants.item}><StatsCard transition={transitions.spring} title="Lucro Total" value={formatCurrency(stats.totalProfit)} trend={stats.totalProfit >= 0 ? 'up' : 'down'} icon={<BarChart3 />} /></motion.div>
        <motion.div variants={variants.item}><StatsCard transition={transitions.spring} title="Lucro s/ Banca" value={`${stats.profitPercentage.toFixed(1)}%`} trend={stats.profitPercentage >= 0 ? 'up' : 'down'} icon={<TrendingUp />} /></motion.div>
        <motion.div variants={variants.item}><StatsCard transition={transitions.spring} title="Taxa de Acerto" value={`${stats.winRate.toFixed(1)}%`} icon={<History />} /></motion.div>
        <motion.div variants={variants.item}><StatsCard transition={transitions.spring} title="ROI" value={`${stats.roi.toFixed(1)}%`} icon={<TrendingUp />} /></motion.div>
        <motion.div variants={variants.item}><StatsCard transition={transitions.spring} title="Lucro em Unidades" value={`${stats.unitsWon.toFixed(1)}u`} icon={<Target />} /></motion.div>
      </motion.div>

      {/* Bookmaker Exposure (Mobile friendly) */}
      {bookmakerExposure.length > 0 && (
        <div 
          className="glass-card p-6 border-border bg-surface/30 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => setShowBookmakerModal(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Investido por Casa de Aposta</h3>
            <span className="text-[9px] font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full block sm:hidden">Toque para ver</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {bookmakerExposure.map(([bm, amount]) => {
                const style = getBookmakerStyle(bm);
                return (
                  <div key={`dashboard-exposure-${bm}`} className={cn("px-4 py-3 rounded-xl border backdrop-blur-md flex flex-col min-w-[120px] transition-all hover:scale-105", style.bg, style.border)}>
                    <span className={cn("text-[9px] font-black uppercase tracking-widest mb-1", style.color)}>{bm}</span>
                    <span className={cn("text-base font-black tabular-nums", style.color)}>{formatCurrency(amount)}</span>
                  </div>
                );
            })}
          </div>
        </div>
      )}

      {/* Bookmaker Exposure Modal (Mobile) */}
      <AnimatePresence>
        {showBookmakerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowBookmakerModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-bg border border-border w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/20 rounded-lg">
                    <BookOpen className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">Investimento Detalhado</h3>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider">Por Casa de Aposta</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBookmakerModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-text-dim" />
                </button>
              </div>
              
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                {bookmakerExposure.map(([bm, amount]) => {
                  const style = getBookmakerStyle(bm);
                  return (
                    <div 
                      key={`modal-exposure-${bm}`} 
                      className={cn("flex items-center justify-between p-4 rounded-2xl border backdrop-blur-md", style.bg, style.border)}
                    >
                      <div className="flex flex-col">
                        <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-0.5", style.color)}>{bm}</span>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-pulse" />
                           <span className="text-[8px] font-black uppercase tracking-widest text-text-dim/60">Posições Abertas</span>
                        </div>
                      </div>
                      <span className={cn("text-xl font-black tabular-nums tracking-tighter", style.color)}>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  );
                })}
                
                <div className="bg-surface/30 p-4 rounded-2xl border border-border mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Total Pendente</span>
                    <span className="text-lg font-black tracking-tighter text-text-main">
                      {formatCurrency(allTimeStats.pendingStake)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 pt-0 pb-10 sm:pb-6">
                <button
                  onClick={() => setShowBookmakerModal(false)}
                  className="w-full py-4 bg-surface border border-border text-text-main rounded-2xl text-xs font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Bets Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full translate-x-12 -translate-y-12" />
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-2">Apostas Pendentes</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tighter text-text-main line-height-none">{allTimeStats.pendingCount}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Entradas em andamento</span>
              </div>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform relative z-10">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
        </div>

        <div className="glass-card p-6 border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full translate-x-12 -translate-y-12" />
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60 mb-2">Total Comprometido</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tighter text-text-main line-height-none">{formatCurrency(allTimeStats.pendingStake)}</span>
              </div>
            </div>
            <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 group-hover:scale-110 transition-transform relative z-10">
              <DollarSign className="w-5 h-5 text-indigo-500" />
            </div>
        </div>
      </div>

      {/* Sistema de Metas e Gestão de Gordura */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card p-6 border-white/5 bg-white/[0.02] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Metas de Performance</h3>
                  <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider">Acompanhamento de Stop e Objetivos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                <div className="space-y-6">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-text-dim border-b border-white/5 pb-2">Ciclo Diário</h4>
                  <div className="space-y-5">
                      <GoalProgressBar 
                        label="Stop Green (Meta)" 
                        current={goalStats.dayProfit} 
                        target={bankroll.dailyStopGreen || 0} 
                        formatCurrency={formatCurrency}
                      />
                      <GoalProgressBar 
                        label="Stop Loss (Limite)" 
                        current={goalStats.dayProfit} 
                        target={-(bankroll.dailyStopLoss || 0)} 
                        isLoss
                        formatCurrency={formatCurrency}
                      />
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-text-dim border-b border-white/5 pb-2">Objetivos Longo Prazo</h4>
                  <div className="space-y-5">
                      <GoalProgressBar 
                        label="Meta Semanal" 
                        current={goalStats.weekProfit} 
                        target={bankroll.weeklyGoal || 0} 
                        formatCurrency={formatCurrency}
                      />
                      <GoalProgressBar 
                        label="Meta Mensal" 
                        current={goalStats.monthProfit} 
                        target={bankroll.monthlyGoal || 0} 
                        formatCurrency={formatCurrency}
                      />
                  </div>
                </div>
            </div>
          </div>

          <div className="glass-card p-6 border-amber-500/20 bg-amber-500/[0.03] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full translate-x-10 translate-y-10" />
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Gordura (Excedente)</h3>
                </div>
                
                <div className="space-y-1 mb-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Disponível para Alavancagem Hoje</p>
                  <p className="text-4xl font-black text-amber-500 tracking-tighter">
                      {formatCurrency(goalStats.dailyGordura)}
                  </p>
                  <p className="text-[9px] font-bold text-text-dim/60 uppercase tracking-tight">
                      Lucro acima da meta diária ({formatCurrency(bankroll.dailyStopGreen || 0)})
                  </p>
                </div>
            </div>

            <div className="relative z-10 p-4 bg-bg/40 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Status do Dia</span>
                  <span className="text-[9px] font-black text-amber-500">
                      {goalStats.dayProfit > (bankroll.dailyStopGreen || 0) ? 'META BATIDA +' : 'EM BUSCA DA META'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-amber-500/50" 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (goalStats.dayProfit / (bankroll.dailyStopGreen || 1)) * 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-[8px] leading-relaxed text-text-dim/80 font-bold uppercase tracking-wider">
                  Todo valor que ultrapassa sua meta diária é considerado "gordura" para operações de maior risco ou alavancagem.
                </p>
            </div>
          </div>
      </div>

      {/* Chart Section */}
      <div className="glass-card p-6 min-h-[500px] border-border bg-[#0B0D11] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim/60 mb-1">P/L ACUMULADO</h3>
            <div className="flex items-baseline gap-3">
              <p className={cn(
                "text-4xl font-black tracking-tighter",
                stats.totalProfit >= 0 ? "text-[#00FF95]" : "text-[#FF3E3E]"
              )}>
                {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#15181F] rounded-full border border-white/5 shadow-inner">
            <TrendingUp className="w-3.5 h-3.5 text-[#00FF95]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00FF95]">{stats.totalBets} tips</span>
          </div>
        </div>

        <div className="h-[380px] w-full mt-6 relative z-10">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={chartRange.off} stopColor="#00FF95" stopOpacity={0.25}/>
                    <stop offset={chartRange.off} stopColor="#FF3E3E" stopOpacity={0.25}/>
                  </linearGradient>
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={chartRange.off} stopColor="#00FF95" stopOpacity={1}/>
                    <stop offset={chartRange.off} stopColor="#FF3E3E" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#FFFFFF" opacity={0.03} />
                <ReferenceLine y={0} stroke="#FFFFFF" strokeOpacity={0.1} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#7C828D', fontWeight: 600 }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#7C828D', fontWeight: 600 }} 
                  tickFormatter={(val) => `R$ ${val}`} 
                  dx={-10}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value as number;
                      return (
                        <div className="bg-[#15181F] border border-white/10 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md">
                          <p className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-1.5 opacity-50">{label}</p>
                          <p className={cn(
                            "text-lg font-black tracking-tighter",
                            val >= 0 ? "text-[#00FF95]" : "text-[#FF3E3E]"
                          )}>
                            {val >= 0 ? '+' : ''}{formatCurrency(val)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="url(#strokeGradient)" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#profitGradient)" 
                  animationDuration={2000}
                  baseLine={0}
                  activeDot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const fill = payload.profit >= 0 ? '#00FF95' : '#FF3E3E';
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={4} 
                        fill={fill} 
                        stroke="#0B0D11" 
                        strokeWidth={1} 
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-text-dim">
              <BarChart3 className="w-12 h-12 mb-2 opacity-10" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sem dados suficientes para gerar o gráfico</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
