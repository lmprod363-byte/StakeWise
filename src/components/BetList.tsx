/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bet } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Trash2 } from 'lucide-react';

interface BetListProps {
  bets: Bet[];
  onDelete: (id: string) => void;
}

export const BetList: React.FC<BetListProps> = ({ bets, onDelete }) => {
  const getStatusClasses = (result: string) => {
    switch (result) {
      case 'WIN': return 'bg-accent-green/10 text-accent-green';
      case 'LOSS': return 'bg-accent-red/10 text-accent-red';
      case 'VOID': return 'bg-dark-text-secondary/10 text-dark-text-secondary';
      default: return 'bg-accent-gold/10 text-accent-gold';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="border-b border-dark-border">
          <tr>
            <th className="label-caps py-6 pr-6">Data</th>
            <th className="label-caps py-6 pr-6">Evento / Mercado</th>
            <th className="label-caps py-6 pr-6">Stake</th>
            <th className="label-caps py-6 pr-6">Odd</th>
            <th className="label-caps py-6 pr-6">Status</th>
            <th className="label-caps py-6 pr-6 text-right">Resultado</th>
            <th className="label-caps py-6 pl-6 text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-border/50">
          {bets.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-dark-text-secondary italic font-serif">
                O histórico de registros está vazio.
              </td>
            </tr>
          ) : (
            bets.map((bet) => (
              <tr key={bet.id} className="group hover:bg-dark-surface/30 transition-colors">
                <td className="py-5 pr-6 whitespace-nowrap text-dark-text-secondary font-mono text-[13px]">
                  {new Date(bet.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="py-5 pr-6">
                  <div className="font-medium text-dark-text-primary mb-0.5">{bet.description}</div>
                  <div className="text-[11px] text-dark-text-secondary uppercase tracking-[0.05em]">{bet.sport} • {bet.market}</div>
                </td>
                <td className="py-5 pr-6 text-dark-text-primary font-mono text-[13px]">
                  {formatCurrency(bet.stake)}
                </td>
                <td className="py-5 pr-6 text-dark-text-primary font-mono text-[13px]">
                  {bet.odds.toFixed(2)}
                </td>
                <td className="py-5 pr-6">
                  <span className={cn(
                    "px-2.5 py-1 rounded-sm text-[10px] uppercase font-bold tracking-wider",
                    getStatusClasses(bet.result)
                  )}>
                    {bet.result}
                  </span>
                </td>
                <td className={cn(
                  "py-5 pr-6 text-right font-mono text-[13px] font-semibold",
                  bet.profit > 0 ? "text-accent-green" : bet.profit < 0 ? "text-accent-red" : "text-dark-text-secondary"
                )}>
                  {bet.profit !== 0 ? (bet.profit > 0 ? '+' : '') + formatCurrency(bet.profit) : '-'}
                </td>
                <td className="py-5 pl-6 text-center">
                  <button
                    onClick={() => onDelete(bet.id)}
                    className="p-1 px-2 text-dark-text-secondary hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
