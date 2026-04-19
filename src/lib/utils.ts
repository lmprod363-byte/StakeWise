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

  switch (status) {
    case 'won':
      return s * (o - 1);
    case 'lost':
      return -s;
    case 'half_win':
      return (s / 2) * (o - 1);
    case 'half_loss':
      return -(s / 2);
    case 'void':
      return 0;
    case 'cashout':
      return c - s;
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
