/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BetResult } from '../types';
import { PlusCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BetFormProps {
  onAdd: (bet: {
    description: string;
    sport: string;
    market: string;
    stake: number;
    odds: number;
    result: BetResult;
    date: string;
  }) => void;
}

export const BetForm: React.FC<BetFormProps> = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    sport: '',
    market: '',
    stake: '',
    odds: '',
    result: 'PENDING' as BetResult,
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      description: formData.description,
      sport: formData.sport,
      market: formData.market,
      stake: parseFloat(formData.stake),
      odds: parseFloat(formData.odds),
      result: formData.result,
      date: formData.date,
    });
    setFormData({
      description: '',
      sport: '',
      market: '',
      stake: '',
      odds: '',
      result: 'PENDING',
      date: new Date().toISOString().split('T')[0],
    });
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="gold-button"
      >
        + Nova Entrada
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-dark-bg/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-dark-surface border border-dark-border w-full max-w-lg shadow-2xl relative z-10 overflow-hidden rounded-sm"
            >
              <div className="flex items-center justify-between p-8 border-b border-dark-border">
                <h2 className="text-xl font-serif text-accent-gold italic">Registrar Nova Entrada</h2>
                <button onClick={() => setIsOpen(false)} className="text-dark-text-secondary hover:text-dark-text-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="label-caps block mb-2">Evento / Descrição</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Real Madrid vs Man City"
                      className="w-full bg-dark-bg border border-dark-border rounded-sm px-4 py-3 outline-none focus:border-accent-gold transition-all text-dark-text-primary placeholder:text-dark-text-secondary/30"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-caps block mb-2">Esporte</label>
                    <input
                      required
                      type="text"
                      placeholder="Futebol, Tênis..."
                      className="w-full bg-dark-bg border border-dark-border rounded-sm px-4 py-3 outline-none focus:border-accent-gold transition-all text-dark-text-primary placeholder:text-dark-text-secondary/30"
                      value={formData.sport}
                      onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-caps block mb-2">Mercado</label>
                    <input
                      required
                      type="text"
                      placeholder="Vencedor, Over 2.5..."
                      className="w-full bg-dark-bg border border-dark-border rounded-sm px-4 py-3 outline-none focus:border-accent-gold transition-all text-dark-text-primary placeholder:text-dark-text-secondary/30"
                      value={formData.market}
                      onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-caps block mb-2">Stake (Investimento)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="R$ 0,00"
                      className="w-full bg-dark-bg border border-dark-border rounded-sm px-4 py-3 outline-none focus:border-accent-gold transition-all text-dark-text-primary font-mono"
                      value={formData.stake}
                      onChange={(e) => setFormData({ ...formData, stake: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-caps block mb-2">Odd</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="1.00"
                      className="w-full bg-dark-bg border border-dark-border rounded-sm px-4 py-3 outline-none focus:border-accent-gold transition-all text-dark-text-primary font-mono"
                      value={formData.odds}
                      onChange={(e) => setFormData({ ...formData, odds: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-caps block mb-2">Data</label>
                    <input
                      required
                      type="date"
                      className="w-full bg-dark-bg border border-dark-border rounded-sm px-4 py-3 outline-none focus:border-accent-gold transition-all text-dark-text-primary"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-caps block mb-2">Status</label>
                    <select
                      className="w-full bg-dark-bg border border-dark-border rounded-sm px-4 py-3 outline-none focus:border-accent-gold transition-all text-dark-text-primary appearance-none cursor-pointer"
                      value={formData.result}
                      onChange={(e) => setFormData({ ...formData, result: e.target.value as BetResult })}
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="WIN">Vencedora (Green)</option>
                      <option value="LOSS">Perdedora (Red)</option>
                      <option value="VOID">Reembolsada</option>
                    </select>
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="gold-button w-full py-4 mt-2"
                >
                  Confirmar Registro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
