import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  indexedDBLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Forçar persistência local para evitar deslogar em WebViews
if (typeof window !== 'undefined') {
  setPersistence(auth, indexedDBLocalPersistence).catch(console.error);
}

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (forceRedirect = false) => {
  try {
    const isIframe = window.self !== window.top;
    const isAPK = window.location.protocol === 'file:' || 
                  window.location.protocol.includes('app') || 
                  (typeof window !== 'undefined' && (window as any).AndroidShell);
    
    // Em WebViews (APK), o popup geralmente falha. Usamos Redirect.
    // No navegador (mesmo mobile) ou Iframe, o Popup é mais confiável.
    if (forceRedirect || (isAPK && !isIframe)) {
      console.log("Usando Redirecionamento de Auth...");
      return await signInWithRedirect(auth, googleProvider);
    }

    console.log("Usando Popup de Auth...");
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    const errorCode = error.code || '';
    const currentDomain = window.location.hostname || "seu-dominio.com";

    if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
      // Se voltarmos nulo, o App.tsx entende que não houve erro drástico, mas o login não ocorreu.
      // Vamos lançar um erro informativo apenas para que o usuário saiba que pode usar o link alternativo se o popup fechar sozinho.
      throw new Error('JANELA DE LOGIN FECHADA: Se você não fechou a janela propositalmente, o seu navegador pode estar bloqueando a autenticação. Tente o "Link Alternativo" abaixo.');
    }

    console.error("Erro detalhado na autenticação:", error);
    
    if (errorCode === 'auth/unauthorized-domain') {
      throw new Error(`DOMÍNIO NÃO AUTORIZADO: Adicione '${currentDomain}' na lista de 'Domínios Autorizados' no Console do Firebase (Authentication > Settings).`);
    }
    
    if (errorCode === 'auth/popup-blocked') {
      throw new Error('POPUP BLOQUEADO: O seu navegador bloqueou a janela de login. Por favor, permita popups para este site ou utilize o login por E-MAIL.');
    }

    if (errorCode === 'auth/operation-not-allowed') {
      throw new Error("PROVEDOR DESATIVADO: O login do Google não está ativado no seu Console do Firebase.");
    }

    if (errorCode === 'auth/network-request-failed') {
      throw new Error('ERRO DE CONEXÃO: O Firebase não conseguiu se comunicar com o servidor. Motivos comuns: Bloqueador de anúncios (AdBlock), VPN ativa, ou internet instável. Tente desativar extensões e recarregar.');
    }

    throw new Error(`Erro (${errorCode}): ${error.message}`);
  }
};
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export { getRedirectResult };
export const signOut = () => auth.signOut();
