import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    // Detect if we are in a WebView/Mobile environment where popups might fail
    const isWebView = /wv|Webview/i.test(navigator.userAgent) || 
                     (window.location.protocol === 'file:' || window.location.protocol.includes('app'));
    
    if (isWebView && !window.location.hostname.includes('run.app')) {
      console.warn("Ambiente WebView detectado. Popups podem falhar. Tentando redirecionamento...");
    }

    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Erro na autenticação:", error);
    
    if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname || "localhost";
      throw new Error(`Domínio não autorizado: ${currentDomain}. Você precisa adicionar este endereço no Firebase > Authentication > Settings > Authorized Domains.`);
    }
    
    if (error.code === 'auth/popup-blocked') {
      throw new Error('O navegador bloqueou o popup de login. Por favor, permita popups para este site.');
    }

    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('O login com Google não está ativado no seu projeto Firebase.');
    }

    throw new Error(`Erro: ${error.message || 'Falha na autenticação'}`);
  }
};
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const signOut = () => auth.signOut();
