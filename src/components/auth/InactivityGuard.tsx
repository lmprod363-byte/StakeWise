import { useEffect } from 'react';

interface InactivityGuardProps {
  user: any;
  signOut: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'info' | 'loss') => void;
}

export function InactivityGuard({ user, signOut, showToast }: InactivityGuardProps) {
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 3600000; // 1 hora em ms
    let timeoutId: any;

    const handleLogout = () => {
      signOut().then(() => {
        showToast("Sessão encerrada por inatividade.", "info");
      }).catch(err => console.error("Erro ao deslogar por inatividade:", err));
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const setupListeners = () => {
      events.forEach(event => {
        window.addEventListener(event, resetTimer);
      });
    };

    const cleanupListeners = () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };

    setupListeners();
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      cleanupListeners();
    };
  }, [user, signOut, showToast]);

  return null;
}
