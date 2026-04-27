import React from 'react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-accent font-black text-xl animate-pulse uppercase tracking-[0.5em]">Carregando...</div>
    </div>
  );
}
