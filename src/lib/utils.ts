import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BOOKMAKER_CONFIGS } from '../constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBookmakerStyle(name: string = 'Outra') {
  if (BOOKMAKER_CONFIGS[name]) {
    return BOOKMAKER_CONFIGS[name];
  }

  // Use explicit strings so Tailwind scanner finds these classes
  const colorOptions = [
    { name: 'blue', hex: '#60a5fa', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/40', rgb: '96,165,250' },
    { name: 'emerald', hex: '#34d399', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/40', rgb: '52,211,153' },
    { name: 'rose', hex: '#fb7185', color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/40', rgb: '251,113,133' },
    { name: 'amber', hex: '#fbbf24', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/40', rgb: '251,191,36' },
    { name: 'violet', hex: '#a78bfa', color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/40', rgb: '167,139,250' },
    { name: 'cyan', hex: '#22d3ee', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/40', rgb: '34,211,238' },
    { name: 'orange', hex: '#fb923c', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/40', rgb: '251,146,60' },
    { name: 'pink', hex: '#f472b6', color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/40', rgb: '244,114,182' },
    { name: 'indigo', hex: '#818cf8', color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/40', rgb: '129,140,248' },
    { name: 'sky', hex: '#38bdf8', color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/40', rgb: '56,189,248' },
    { name: 'fuchsia', hex: '#e879f9', color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/40', rgb: '232,121,249' },
    { name: 'teal', hex: '#2dd4bf', color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/40', rgb: '45,212,191' },
    { name: 'lime', hex: '#a3e635', color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/40', rgb: '163,230,53' },
    { name: 'purple', hex: '#c084fc', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/40', rgb: '192,132,252' },
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colorOptions.length;
  const opt = colorOptions[index];

  return {
    color: opt.color,
    bg: opt.bg,
    border: opt.border,
    glow: `shadow-[0_0_15px_rgba(${opt.rgb},0.2)]`
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function calculateProfit(stake: number | undefined | null, odds: number | undefined | null, status: string, cashoutValue?: number | null): number {
  const s = Number(stake) || 0;
  const o = Number(odds) || 0;
  const c = Number(cashoutValue) || 0;

  const round = (val: number) => Math.round(val * 100) / 100;

  switch (status) {
    case 'won':
      // Return = Round(Stake * Odds)
      // Profit = Return - Stake
      return round(round(s * o) - s);
    case 'lost':
      return -s;
    case 'half_win':
      // Half stake wins at odds, half stake is returned
      // Return = Round((Stake/2) * Odds) + (Stake/2)
      return round(round((s / 2) * o) + (s / 2) - s);
    case 'half_loss':
      return -(s / 2);
    case 'void':
      return 0;
    case 'cashout':
      return round(c - s);
    default:
      return 0;
  }
}

export function safeNewDate(dateVal?: any): Date {
  if (!dateVal) return new Date();
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function isMatchOngoing(date: string) {
  const start = safeNewDate(date).getTime();
  const now = Date.now();
  return start <= now && (now - start) < (105 * 60 * 1000); // 105 min timeout
}

export function getBookmakerLogo(name: string) {
  // Retorna a primeira letra da casa estilizada
  return name.charAt(0).toUpperCase();
}

export function safeFormat(dateVal: any, formatStr: string, options?: any): string {
  const d = safeNewDate(dateVal);
  try {
    // Note: format from date-fns is usually imported in the file using this
    // We will handle the actual utility usage in the component
    return d.toISOString(); // Placeholder, we'll use this as a logic base
  } catch {
    return new Date().toISOString();
  }
}
