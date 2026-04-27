import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { signInWithGoogle } from '../../lib/firebase';

interface AuthScreenProps {
  onSuccess: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'loss') => void;
}

export function AuthScreen({ onSuccess, showToast }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  const handleError = (err: string) => {
    setError(err);
  };

  const handleGoogleLoginAlternative = async () => {
    setError('');
    try {
      await signInWithGoogle(true); // Force Redirect
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-text-main">
      <div className="max-w-md w-full glass-card overflow-hidden">
        <div className="p-8 border-b border-border text-center">
          <div className="text-accent font-black text-4xl tracking-tighter mb-2 uppercase">StakeWise.</div>
          <p className="text-text-dim text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Gestão de banca na nuvem v1.5.0
          </p>
        </div>

        <div className="p-8">
          {mode === 'login' ? (
            <LoginForm 
              onSuccess={onSuccess} 
              onError={handleError} 
              onToggleMode={() => { setMode('register'); setError(''); }} 
            />
          ) : (
            <RegisterForm 
              onSuccess={onSuccess} 
              onError={handleError} 
              onToggleMode={() => { setMode('login'); setError(''); }} 
            />
          )}

          {error && (
            <div className="mt-6 space-y-3">
              <div className="bg-loss/10 border border-loss/20 p-4 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-loss text-center">
                  {error}
                </p>
                
                {error.includes('DOMÍNIO NÃO AUTORIZADO') && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.hostname);
                      showToast("Domínio copiado!", "info");
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-loss text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:opacity-90"
                  >
                    Copiar Domínio p/ Console Firebase
                  </button>
                )}
              </div>

              <button 
                onClick={handleGoogleLoginAlternative}
                className="w-full text-[9px] font-black uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
              >
                Problemas com o Popup? Tente este link alternativo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
