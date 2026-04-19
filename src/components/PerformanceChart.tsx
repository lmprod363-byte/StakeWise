/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatCurrency } from '../lib/utils';

interface PerformanceChartProps {
  data: { date: string; value: number }[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  return (
    <div className="bg-dark-surface p-8 rounded-sm border border-dark-border h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d4af37" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" strokeOpacity={0.5} />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#71717a', fontWeight: 500, letterSpacing: '0.05em' }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#71717a', fontWeight: 500 }}
            tickFormatter={(value) => `R$${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#121214', 
              border: '1px solid #27272a', 
              borderRadius: '2px',
              fontSize: '12px',
              color: '#f4f4f5'
            }}
            itemStyle={{ color: '#d4af37' }}
            cursor={{ stroke: '#d4af37', strokeWidth: 1 }}
            formatter={(value: number) => [formatCurrency(value), 'Banca']}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#d4af37" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
