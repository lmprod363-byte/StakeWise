import { ptBR } from 'date-fns/locale';

export const TRANSITIONS = {
  spring: { type: "spring", stiffness: 300, damping: 30 },
  smooth: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
  bounce: { type: "spring", stiffness: 400, damping: 17 }
};

export const PAGE_VARIANTS = {
  initial: { opacity: 0, x: 10, filter: "blur(4px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -10, filter: "blur(4px)" }
};

export const MODAL_VARIANTS = {
  overlay: { opacity: 0 },
  overlayAnimate: { opacity: 1 },
  content: { scale: 0.95, opacity: 0, y: 10 },
  contentAnimate: { scale: 1, opacity: 1, y: 0 },
  contentExit: { scale: 0.95, opacity: 0, y: 10 }
};

export const STAGGER_CONTAINER = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const STAGGER_ITEM = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 }
};

export const BOOKMAKER_CONFIGS: Record<string, { color: string, bg: string, border: string, glow: string }> = {
  'Bet365': { color: 'text-[#00ff95]', bg: 'bg-[#00ff95]/10', border: 'border-[#00ff95]/40', glow: 'shadow-[0_0_15px_rgba(0,255,149,0.2)]' },
  'SuperBet': { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/40', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
  'Betano': { color: 'text-[#ff7300]', bg: 'bg-[#ff7300]/10', border: 'border-[#ff7300]/40', glow: 'shadow-[0_0_15px_rgba(255,115,0,0.2)]' },
  'EsportivaBet': { color: 'text-[#00a2ff]', bg: 'bg-[#00a2ff]/10', border: 'border-[#00a2ff]/40', glow: 'shadow-[0_0_15px_rgba(0,162,255,0.2)]' },
  'Geral': { color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/40', glow: 'shadow-[0_0_15px_rgba(129,140,248,0.2)]' },
  'Outra': { color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/40', glow: 'shadow-[0_0_15px_rgba(129,140,248,0.2)]' },
};

export const DATE_LOCALE = ptBR;

export const PREDEFINED_MARKETS = [
  'Resultado Final (1X2)', 'Ambos Marcam (BTTS)', 'Over 2.5 Gols', 'Under 2.5 Gols', 
  'Handicap Asiático', 'DNB (Empate Anula)', 'Dupla Chance', 'Escanteios Over 9.5',
  'Total de Gols', 'Resultado Exato', 'E-Sports Vencedor', 'Tênis Vencedor'
];

export const PREDEFINED_SELECTIONS = [
  'Vencedor Casa', 'Vencedor Fora', 'Empate', 'Over 2.5', 'Under 2.5',
  'BTTS Sim', 'BTTS Não', 'Casa +0.5 AH', 'Fora +0.5 AH'
];
