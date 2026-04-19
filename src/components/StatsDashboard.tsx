/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BankrollStats } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';

interface StatsDashboardProps {
  stats: BankrollStats;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats }) => {
  const cards = [
    {
      label: 'ROI Global',
      value: (stats.roi >= 0 ? '+' : '') + formatPercent(stats.roi),
      color: stats.roi >= 0 ? 'text-accent-green' : 'text-accent-red',
    },
    {
      label: 'Lucro Total',
      value: (stats.totalProfit >= 0 ? '+' : '') + formatCurrency(stats.totalProfit),
      color: stats.totalProfit >= 0 ? 'text-accent-green' : 'text-accent-red',
    },
    {
      label: 'Win Rate',
      value: formatPercent(stats.winRate),
      color: 'text-dark-text-primary',
    },
    {
      label: 'Yield Média',
      value: formatPercent(stats.yield),
      color: 'text-dark-text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, i) => (
        <div key={i} className="bg-dark-surface border border-dark-border p-6 rounded-sm">
          <span className="label-caps block mb-3">
            {card.label}
          </span>
          <div className={`text-2xl font-medium tracking-tight ${card.color}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
};
