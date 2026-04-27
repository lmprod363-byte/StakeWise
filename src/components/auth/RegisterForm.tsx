import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { registerWithEmail, signInWithGoogle } from '../../lib/firebase';
import { InputGroup } from '../ui/InputGroup';

interface RegisterFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  onToggleMode: () => void;
}

export function RegisterForm({ onSuccess, onError, onToggleMode }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerWithEmail(email, password);
      onSuccess();
    } catch (err: any) {
      const errorCode = err.code || '';
      if (errorCode === 'auth/unauthorized-domain' || err.message.includes('domínio não autorizado')) {
        const domain = window.location.hostname || "seu-dominio.com";
        onError(`DOMÍNIO NÃO AUTORIZADO: Adicione '${domain}' no Console do Firebase > Authentication > Settings > Authorized Domains.`);
      } else if (errorCode === 'auth/operation-not-allowed') {
        onError("PROVEDOR DESATIVADO: Ative 'E-mail/Senha' no Firebase em Authentication > Sign-in method.");
      } else {
        onError(err.message.includes('auth/email-already-in-use') ? 'Este email já está em uso.' : 
               err.message.includes('auth/weak-password') ? 'A senha deve ter pelo menos 6 caracteres.' :
               `Erro no Cadastro: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      onError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputGroup 
          label="Seu Email" 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <InputGroup 
          label="Sua Senha" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-bg py-4 px-6 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Criando Conta...' : 'Criar Conta Agora'}
        </button>
        
        <p className="text-[9px] text-text-dim font-bold uppercase tracking-widest text-center opacity-40 px-4">
          Ao continuar, você concorda com nossa <a href="/privacy.html" target="_blank" className="text-accent underline">Política de Privacidade</a>.
        </p>
      </form>

      <div className="relative flex items-center py-4">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-[9px] font-black text-text-dim uppercase tracking-widest">Ou continue com</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <button 
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-4 bg-surface border border-border text-text-main py-4 px-6 rounded-xl font-black uppercase text-xs tracking-widest hover:border-text-dim active:scale-95 transition-all"
      >
        <LogIn className="w-5 h-5 text-accent" />
        Entrar com Google
      </button>

      <div className="pt-4 text-center">
        <button 
          onClick={onToggleMode}
          className="text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
        >
          Já tem uma conta? Entrar
        </button>
      </div>
    </div>
  );
}
