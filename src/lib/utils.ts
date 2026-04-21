import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
