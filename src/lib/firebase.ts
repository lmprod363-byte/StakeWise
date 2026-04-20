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

export const signInWithGoogle = async () => {
  try {
    const isMobileApp = /wv|Webview|Android|iPhone/i.test(navigator.userAgent) || 
                       (window.location.protocol === 'file:' || window.location.protocol.includes('app'));
    
    if (isMobileApp) {
      console.log("Detectado ambiente mobile/APK. Usando redirecionamento...");
      // Redirect costuma ser mais estável em WebViews que Popups
      return await signInWithRedirect(auth, googleProvider);
    }

    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Erro na autenticação:", error);
    
    if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname || "localhost";
      throw new Error(`Domínio não autorizado: ${currentDomain}. Adicione este endereço no Firebase > Authentication > Authorized Domains.`);
    }
    
    if (error.message.includes('missing initial state')) {
      throw new Error('Erro de Sessão: O Google bloqueia login em alguns aplicativos APK. Por favor, utilize o login por E-MAIL e SENHA para entrar no app instalado.');
    }

    throw new Error(`Erro: ${error.message || 'Falha na autenticação'}`);
  }
};
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const signOut = () => auth.signOut();
