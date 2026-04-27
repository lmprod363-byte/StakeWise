import React, { useState } from 'react';
import { Sparkles, Loader2, TrendingUp, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Bet } from '../../types';
import { getAIInsights, AIInsight } from '../../services/geminiService';

interface InsightsTabProps {
  bets: Bet[];
}

export function InsightsTab({ bets }: InsightsTabProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const generateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const newInsights = await getAIInsights(bets);
      setInsights(newInsights);
    } catch (error) {
      console.error("Erro ao gerar insights:", error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
       <div className="glass-card p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/10 blur-[100px] rounded-full" />
          <div className="relative z-10">
             <div className="bg-accent/10 p-4 rounded-2xl inline-block mb-6 border border-accent/20">
                <Sparkles className="w-8 h-8 text-accent" />
             </div>
             <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">Insights de Performance com IA</h2>
             <p className="text-text-dim text-xs font-black uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                O Gemini analisa seu histórico para identificar pontos cego e otimizar sua estratégia
             </p>
             
             <button 
                onClick={generateInsights}
                disabled={isGeneratingInsights || bets.length < 5}
                className="mt-8 bg-accent text-bg px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 mx-auto shadow-xl shadow-accent/20"
             >
                {isGeneratingInsights ? (
                   <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analisando Padrões...
                   </>
                ) : (
                   <>
                      <TrendingUp className="w-4 h-4" />
                      Gerar Novos Insights
                   </>
                )}
             </button>
             {bets.length < 5 && <p className="text-[9px] font-black uppercase tracking-widest text-text-dim mt-4">Necessário ao menos 5 apostas registradas</p>}
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.length > 0 ? insights.map((insight, idx) => (
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={idx} 
                className={cn(
                   "glass-card p-6 border-l-4",
                   insight.type === 'positive' ? "border-accent" : insight.type === 'negative' ? "border-loss" : "border-text-dim"
                )}
             >
                <h4 className="text-sm font-black uppercase tracking-tight mb-3 text-text-main">{insight.title}</h4>
                <p className="text-xs font-bold text-text-dim leading-relaxed uppercase tracking-tight opacity-80">{insight.content}</p>
             </motion.div>
          )) : (
             <div className="md:col-span-3 py-20 text-center glass-card bg-transparent border-dashed">
                <BarChart3 className="w-12 h-12 text-text-dim opacity-10 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim/50">Clique no botão acima para iniciar a análise</p>
             </div>
          )}
       </div>
    </div>
  );
}
