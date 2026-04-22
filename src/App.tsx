import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  History, 
  Filter, 
  Settings2,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  RotateCcw,
  HelpCircle,
  Clock,
  Edit3,
  LayoutDashboard,
  Target,
  LogOut,
  LogIn,
  Pencil,
  ImagePlus,
  Loader2,
  Camera,
  Sparkles,
  Square,
  CheckSquare,
  DollarSign,
  Share,
  Copy,
  Zap,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  GripVertical,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';
import { format, isAfter, subDays, subHours, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleAd } from './components/GoogleAd';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  getDocs,
  getDocFromServer,
  deleteField,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, signInWithGoogle, signOut, loginWithEmail, registerWithEmail, getRedirectResult } from './lib/firebase';
import { cn, formatCurrency, calculateProfit, safeNewDate } from './lib/utils';
import { Bet, Bankroll, Stats, Transaction } from './types';
import { extractBetFromImage, checkBetResult, getAIInsights, AIInsight, openApiKeySelector } from './services/geminiService';

const BOOKMAKER_CONFIGS: Record<string, { color: string, bg: string, border: string, glow: string }> = {
  'Bet365': { color: 'text-[#00ff95]', bg: 'bg-[#00ff95]/10', border: 'border-[#00ff95]/40', glow: 'shadow-[0_0_15px_rgba(0,255,149,0.2)]' },
  'SuperBet': { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/40', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
  'Betano': { color: 'text-[#ff7300]', bg: 'bg-[#ff7300]/10', border: 'border-[#ff7300]/40', glow: 'shadow-[0_0_15px_rgba(255,115,0,0.2)]' },
  'EsportivaBet': { color: 'text-[#00a2ff]', bg: 'bg-[#00a2ff]/10', border: 'border-[#00a2ff]/40', glow: 'shadow-[0_0_15px_rgba(0,162,255,0.2)]' },
  'Geral': { color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/40', glow: 'shadow-[0_0_15px_rgba(129,140,248,0.2)]' },
  'Outra': { color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/40', glow: 'shadow-[0_0_15px_rgba(129,140,248,0.2)]' },
};

const getBookmakerStyle = (name: string = 'Outra') => {
  return BOOKMAKER_CONFIGS[name] || BOOKMAKER_CONFIGS['Outra'];
};

const getBookmakerLogo = (name: string) => {
  // Retorna a primeira letra da casa estilizada
  return <span className="font-black text-sm uppercase">{name.charAt(0)}</span>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankrolls, setBankrolls] = useState<Bankroll[]>([]);
  const [activeBankrollId, setActiveBankrollId] = useState<string | null>(localStorage.getItem('STAKEWISE_ACTIVE_BANKROLL_ID'));
  const [loading, setLoading] = useState(true);
  const [bankrollsLoading, setBankrollsLoading] = useState(true);

  const bankroll = useMemo(() => {
    return bankrolls.find(b => b.id === activeBankrollId) || bankrolls[0] || { id: 'default', name: 'Principal', total: 1000, unitSize: 20, userId: '', createdAt: null };
  }, [bankrolls, activeBankrollId]);

  useEffect(() => {
    if (bankroll.id !== 'default' && bankroll.id !== activeBankrollId) {
      setActiveBankrollId(bankroll.id);
      localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', bankroll.id);
    }
  }, [bankroll.id, activeBankrollId]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bets' | 'register' | 'insights' | 'settings' | 'trash' | 'transfers'>('dashboard');
  const [viewAllBankrolls, setViewAllBankrolls] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<null | { confirmed: boolean, data: Omit<Bet, 'id' | 'profit'> }>(null);
  const [isSyncingResults, setIsSyncingResults] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [syncingBetId, setSyncingBetId] = useState<string | null>(null);
  const [selectedBetIds, setSelectedBetIds] = useState<Set<string>>(new Set());
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(historySearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [historySearchTerm]);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('Todos');
  const [historyBookmakerFilter, setHistoryBookmakerFilter] = useState<string[]>([]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [showTransactionEditModal, setShowTransactionEditModal] = useState(false);
  const [expandedTransactionGroups, setExpandedTransactionGroups] = useState<Set<string>>(new Set());
  const [adjustingBookmaker, setAdjustingBookmaker] = useState<string | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'withdrawal' as Transaction['type'],
    fromBookmaker: 'Bet365',
    toBookmaker: 'Betano',
    notes: ''
  });

  // AI Insights State
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Email Auth State
  const [isAuthRegistering, setIsAuthRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Local settings state for inputs (fixes jumpy bug)
  const [localTotal, setLocalTotal] = useState('');
  const [localUnit, setLocalUnit] = useState('');
  const [localActualBalance, setLocalActualBalance] = useState('');
  const [showAllPercentages, setShowAllPercentages] = useState(false);
  const [manualAiKey, setManualAiKey] = useState(localStorage.getItem('STAKEWISE_CUSTOM_GEMINI_KEY') || '');
  const [isAddingBankroll, setIsAddingBankroll] = useState(false);
  const [newBankrollName, setNewBankrollName] = useState('');
  const [newBankrollTotal, setNewBankrollTotal] = useState('1000');
  const [newBankrollUnit, setNewBankrollUnit] = useState('20');

  // AI Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ current: number, total: number } | null>(null);
  const [bulkQueue, setBulkQueue] = useState<Omit<Bet, 'id' | 'profit'>[]>([]);
  const [isManualBookmaker, setIsManualBookmaker] = useState(false);
  const [successToast, setSuccessToast] = useState<{ message: string, type: 'success' | 'info' | 'loss' } | null>(null);
  const [cashoutBetId, setCashoutBetId] = useState<string | null>(null);
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [isBankrollMenuOpen, setIsBankrollMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const showToast = (message: string, type: 'success' | 'info' | 'loss' = 'success') => {
    setSuccessToast({ message, type });
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Auth Effect
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          showToast("Login realizado com sucesso!", "success");
        }
      } catch (err: any) {
        console.error("Erro no redirect auth:", err);
        if (err.code === 'auth/unauthorized-domain') {
          const domain = window.location.hostname || "seu-dominio.com";
          setAuthError(`DOMÍNIO NÃO AUTORIZADO: Adicione '${domain}' no Console do Firebase > Authentication > Settings > Authorized Domains.`);
        } else if (err.code === 'auth/popup-blocked') {
          setAuthError("POPUP BLOQUEADO: O navegador bloqueou a janela de login.");
        } else {
          setAuthError(`Erro no retorno do Google: ${err.message}`);
        }
      }
    };

    checkRedirect();

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  // Effect 1: Sync Bankrolls & Migration
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if(error?.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    if (!user) {
      setBankrolls([]);
      setBankrollsLoading(false);
      return;
    }

    // Fetch account-level API Key
    const fetchUserSettings = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const cloudKey = userDoc.data().geminiKey;
          if (cloudKey && cloudKey.length > 20) {
            localStorage.setItem('STAKEWISE_CUSTOM_GEMINI_KEY', cloudKey);
            setManualAiKey(cloudKey);
          }
        } else {
          // Initialize user doc if it doesn't exist to avoid permission gaps
          await setDoc(userRef, {
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (e: any) {
        // Only log if it's not a missing document issue
        if (!e?.message?.includes('permissions')) {
          console.error("Erro ao carregar configurações da nuvem:", e);
        } else {
          console.warn("Usuário ainda não possui perfil na nuvem. Criando...");
        }
      }
    };
    fetchUserSettings();

    const bankrollsQuery = query(
      collection(db, 'bankrolls'),
      where('userId', '==', user.uid)
    );

    const unsubscribeBankrolls = onSnapshot(bankrollsQuery, async (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Bankroll[];

      // Sort locally to handle documents without 'order' field
      list.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        // Fallback to createdAt if order is the same (or missing)
        const dateA = (a.createdAt as any)?.seconds ?? 0;
        const dateB = (b.createdAt as any)?.seconds ?? 0;
        return dateA - dateB;
      });

      if (list.length === 0) {
        if (localStorage.getItem(`MIGRATING_${user.uid}`)) return;
        localStorage.setItem(`MIGRATING_${user.uid}`, 'true');

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : { total: 1000, unitSize: 20 };
        
        try {
          const newBankrollRef = await addDoc(collection(db, 'bankrolls'), {
            name: 'Principal',
            total: userData.total ?? 1000,
            unitSize: userData.unitSize ?? 20,
            userId: user.uid,
            createdAt: serverTimestamp()
          });

          setActiveBankrollId(newBankrollRef.id);
          localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', newBankrollRef.id);
          
          const allBetsRef = collection(db, 'bets');
          const legacyBetsQuery = query(allBetsRef, where('userId', '==', user.uid));
          const legacyBetsSnap = await getDocs(legacyBetsQuery);
          
          const { writeBatch } = await import('firebase/firestore');
          let batch = writeBatch(db);
          let count = 0;

          for (const betDoc of legacyBetsSnap.docs) {
            if (!betDoc.data().bankrollId) {
              batch.update(doc(db, 'bets', betDoc.id), { bankrollId: newBankrollRef.id });
              count++;
              if (count === 499) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
              }
            }
          }
          if (count > 0) await batch.commit();
          localStorage.removeItem(`MIGRATING_${user.uid}`);
        } catch (err) {
          console.error("Erro na migração:", err);
          localStorage.removeItem(`MIGRATING_${user.uid}`);
        }
      } else {
        setBankrolls(list);
        // Ensure we have an active bankroll
        const storedId = localStorage.getItem('STAKEWISE_ACTIVE_BANKROLL_ID');
        if (!activeBankrollId || !list.find(b => b.id === activeBankrollId)) {
          const targetId = list.find(b => b.id === storedId) ? storedId! : list[0].id;
          setActiveBankrollId(targetId);
          localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', targetId);
        }
      }
      setBankrollsLoading(false);
    });

    return () => unsubscribeBankrolls();
  }, [user]);

  // Effect 2: Sync Bets (Depends on Bankrolls and Active ID)
  useEffect(() => {
    if (!user) {
      setBets([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const betsQuery = query(
      collection(db, 'bets'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeBets = onSnapshot(betsQuery, (snapshot) => {
      const allBets = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Bet[];

      // Migration check: Assign bankrollId to bets that don't have one (legacy ONLY)
      if (bankrolls.length > 0) {
        const legacyBets = allBets.filter(b => !b.bankrollId || b.bankrollId === "");
        if (legacyBets.length > 0) {
          const primaryBankroll = bankrolls.find(b => b.name === 'Principal') || bankrolls[0];
          if (primaryBankroll) {
            const batch = writeBatch(db);
            legacyBets.forEach(b => {
              batch.update(doc(db, 'bets', b.id), { bankrollId: primaryBankroll.id });
            });
            batch.commit().catch(e => console.error("Legacy migration error:", e));
          }
        }
      }

      const filtered = allBets.filter(bet => {
        if (viewAllBankrolls) return true;
        return bet.bankrollId === activeBankrollId;
      });

      setBets(filtered);
      setLoading(false);
    });

    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Transaction[];

      const filtered = list.filter(t => {
        if (viewAllBankrolls) return true;
        return t.bankrollId === activeBankrollId;
      });
      setTransactions(filtered);
    });

    return () => {
      unsubscribeBets();
      unsubscribeTransactions();
    };
  }, [user, activeBankrollId, bankrolls]);

  const saveLocalSettings = () => {
    const total = parseFloat(localTotal) || bankroll.total;
    const unitSize = parseFloat(localUnit) || bankroll.unitSize;
    saveBankroll({ total, unitSize });
  };

  const syncBalanceAction = () => {
    const val = localActualBalance.replace(',', '.');
    const target = parseFloat(val);
    if (isNaN(target)) {
      showToast("Insira um valor válido", "info");
      return;
    }
    
    // Banca Inicial = Saldo Alvo - Lucro Acumulado + Apostas em Aberto
    const newTotal = target - allTimeStats.totalProfit + allTimeStats.totalPendingStakes;
    
    saveBankroll({ total: newTotal, unitSize: bankroll.unitSize });
    showToast("Saldo sincronizado com sucesso!", "success");
    setLocalActualBalance('');
  };

  // Modal Form State
  const [betForm, setBetForm] = useState({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    sport: 'Futebol',
    league: '',
    event: '',
    market: '',
    selection: '',
    odds: '',
    stake: bankroll.unitSize.toString(),
    status: 'pending' as Bet['status'],
    cashoutValue: '',
    bookmaker: 'Bet365',
    betId: '',
    bankrollId: activeBankrollId || '',
    isLive: false
  });

  const DEFAULT_BOOKMAKERS = ['Bet365', 'SuperBet', 'Betano', 'EsportivaBet'];
  const [userBookmakers, setUserBookmakers] = useState<string[]>(() => {
    const saved = localStorage.getItem('STAKEWISE_USER_BOOKMAKERS');
    return saved ? JSON.parse(saved) : DEFAULT_BOOKMAKERS;
  });

  useEffect(() => {
    localStorage.setItem('STAKEWISE_USER_BOOKMAKERS', JSON.stringify(userBookmakers));
  }, [userBookmakers]);

  const [newBookmakerName, setNewBookmakerName] = useState('');
  const [isAddingNewBookmaker, setIsAddingNewBookmaker] = useState(false);

  const addBookmaker = () => {
    if (!newBookmakerName.trim()) return;
    if (userBookmakers.includes(newBookmakerName.trim())) {
      showToast("Esta casa já existe na lista", "info");
      return;
    }
    setUserBookmakers([...userBookmakers, newBookmakerName.trim()]);
    setNewBookmakerName('');
    setIsAddingNewBookmaker(false);
    showToast("Casa adicionada com sucesso!");
  };

  const removeBookmaker = (name: string) => {
    const balance = bookmakerBalances.find(([bm]) => bm === name)?.[1] || 0;
    if (Math.abs(balance) > 0.01) {
      if (!window.confirm(`Esta casa possui saldo (${formatCurrency(balance)}). Deseja realmente removê-la da lista de seleção?`)) {
        return;
      }
    }
    setUserBookmakers(userBookmakers.filter(bm => bm !== name));
    showToast("Casa removida da lista ativa.");
  };

  // Keep date updated when register tab opens
  useEffect(() => {
    if (activeTab === 'register' && !editingBetId) {
      setBetForm(prev => ({ 
        ...prev, 
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        stake: bankroll.unitSize.toString() 
      }));
      setDuplicateWarning(null);
    }
  }, [activeTab, bankroll.unitSize, editingBetId]);

  const PREDEFINED_MARKETS = [
    'Resultado Final',
    'Ambas Marcam',
    'Over 2.5 Gols',
    'Under 2.5 Gols',
    'Handicap Asiático',
    'Escanteios',
    'Dupla Chance',
    'Empate Anula (DNB)',
    'Intervalo (HT)',
    'Gols Par/Ímpar'
  ];

  const PREDEFINED_SELECTIONS = [
    'Casa', 'Empate', 'Fora',
    'Casa (Vence)', 'Fora (Vence)',
    'Sim', 'Não',
    'Over 2.5', 'Under 2.5',
    'Over 1.5', 'Under 1.5',
    'Over 0.5 HT', 'Under 0.5 HT',
    'Handicap +0.5', 'Handicap -0.5',
    'Handicap 0.0',
    'Mais de 9.5 Escanteios', 'Menos de 9.5 Escanteios'
  ];

  const QUICKET_UNITS = [0.25, 0.5, 1, 1.5, 2];

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.7 for good balance of size and legibility
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setScanError("Apenas arquivos de imagem são suportados.");
      return;
    }

    setIsScanning(true);
    setScanError('');
    
    const isMultiple = fileArray.length > 1;
    if (isMultiple) {
      setBulkProgress({ current: 0, total: fileArray.length });
    }

    try {
      const newBetsQueue: Omit<Bet, 'id' | 'profit'>[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (isMultiple) {
          setBulkProgress({ current: i + 1, total: fileArray.length });
        }

        const base64 = await compressImage(file);
        // Since compressImage returns image/jpeg for standardized compression
        const data = await extractBetFromImage(base64, 'image/jpeg');

        const sanitizedLeague = data.league && !['n/a', 'indefinido', 'desconhecido', 'unknown', 'não encontrado', 'not found'].includes(data.league.toLowerCase().trim()) ? data.league : '';
        const sanitizedBetId = data.betId && !['n/a', 'indefinido', 'desconhecido', 'unknown', 'não encontrado', 'not found'].includes(data.betId.toLowerCase().trim()) ? data.betId : '';

        const combinedMarket = [data.market, data.selection].filter(Boolean).join(' • ');

        const betData = {
          userId: user?.uid || '',
          bankrollId: activeBankrollId || '',
          date: data.date ? safeNewDate(data.date).toISOString() : new Date().toISOString(),
          sport: data.sport || 'Futebol',
          league: sanitizedLeague,
          event: data.event || '',
          market: data.market || combinedMarket,
          selection: data.selection || '',
          odds: data.odds || 0,
          stake: data.stake || bankroll.unitSize,
          status: (data.status || 'pending') as Bet['status'],
          bookmaker: data.bookmaker || 'Bet365',
          betId: sanitizedBetId,
          isLive: data.isLive || false,
          cashoutValue: data.cashoutValue || null,
          deleted: false,
          createdAt: new Date().toISOString()
        };

        const finalProfit = calculateProfit(betData.stake, betData.odds, betData.status, betData.cashoutValue || undefined);
        const betToSave = { ...betData, profit: finalProfit };

        // Pre-check for exact duplicates...
        const isDuplicateInState = bets.some(b => 
           !b.deleted && 
           b.date === betToSave.date && 
           b.event.toLowerCase() === betToSave.event.toLowerCase() && 
           b.market.toLowerCase() === betToSave.market.toLowerCase() &&
           Math.abs(b.odds - betToSave.odds) < 0.0001
        );
        const isDuplicateInQueue = newBetsQueue.some(b => 
           b.date === betToSave.date && 
           b.event.toLowerCase() === betToSave.event.toLowerCase() && 
           b.market.toLowerCase() === betToSave.market.toLowerCase() &&
           Math.abs(b.odds - betToSave.odds) < 0.0001
        );

        if (isDuplicateInState || isDuplicateInQueue) {
           console.warn("Skipping duplicate bet in bulk scan batch");
        } else {
           if (isMultiple) {
             newBetsQueue.push(betToSave);
           } else {
             setBetForm(prev => ({
               ...prev,
               date: data.date ? format(safeNewDate(data.date), "yyyy-MM-dd'T'HH:mm") : prev.date,
               sport: betToSave.sport,
               league: betToSave.league,
               event: betToSave.event,
               market: betToSave.market,
               selection: betToSave.selection,
               odds: betToSave.odds.toString(),
               stake: betToSave.stake.toString(),
               status: betToSave.status,
               bookmaker: betToSave.bookmaker,
               betId: betToSave.betId,
               isLive: betToSave.isLive,
               cashoutValue: betToSave.cashoutValue?.toString() || ''
             }));
           }
        }
      }
      
      if (isMultiple) {
        setBulkQueue(newBetsQueue);
      }
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || "Erro ao processar imagem.");
    } finally {
      setIsScanning(false);
      setBulkProgress(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) processFiles(files);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'register' || isScanning) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) processFiles([file]);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab, isScanning]);

  const filteredBets = useMemo(() => {
    const now = new Date();
    return bets.filter(bet => {
      // Ignore deleted bets in standard views
      if (activeTab !== 'trash' && bet.deleted) return false;
      if (activeTab === 'trash' && !bet.deleted) return false;

      // ALWAYS filter by bankroll in standard views unless special toggle is active
      // (Dashboard and Stats should always be context-aware)
      if (bet.bankrollId !== activeBankrollId) return false;

      const betDate = safeNewDate(bet.date);
      if (timeRange === '24h') return isAfter(betDate, subHours(now, 24));
      if (timeRange === '7d') return isAfter(betDate, subDays(now, 7));
      if (timeRange === '30d') return isAfter(betDate, subDays(now, 30));
      return true;
    });
  }, [bets, timeRange, activeTab, activeBankrollId]);

  const historyBets = useMemo(() => {
    return bets.filter(bet => {
        // Handle Trash vs History view
        if (activeTab === 'trash' && !bet.deleted) return false;
        if (activeTab !== 'trash' && bet.deleted) return false;

        // Bankroll Filter
        if (!viewAllBankrolls && bet.bankrollId !== activeBankrollId) return false;

        // Status Filter
        if (historyStatusFilter !== 'Todos') {
            const statusMap: Record<string, Bet['status']> = {
                'Ganha': 'won',
                'Perdida': 'lost',
                'Pendente': 'pending',
                'Reembolsada': 'void',
                'Meio Ganha': 'half_win',
                'Meio Perdida': 'half_loss'
            };
            if (bet.status !== statusMap[historyStatusFilter]) return false;
        }

        // Bookmaker Filter
        if (historyBookmakerFilter.length > 0) {
          if (!historyBookmakerFilter.includes(bet.bookmaker || 'Geral')) return false;
        }

        // Search Filter
        if (debouncedSearchTerm) {
            const search = debouncedSearchTerm.toLowerCase();
            return (
                bet.event.toLowerCase().includes(search) ||
                bet.market.toLowerCase().includes(search) ||
                bet.selection.toLowerCase().includes(search)
            );
        }

        return true;
    });
  }, [bets, debouncedSearchTerm, historyStatusFilter, historyBookmakerFilter, activeTab, viewAllBankrolls, activeBankrollId]);

  const groupedHistory = useMemo(() => {
    const groups: { 
      [key: string]: { 
        bets: Bet[], 
        transactions: Transaction[], 
        totalStake: number, 
        totalProfit: number,
        bookmakerCounts: { [bm: string]: number }
      } 
    } = {};
    
    historyBets.forEach(bet => {
        const dateKey = format(safeNewDate(bet.date), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
            groups[dateKey] = { bets: [], transactions: [], totalStake: 0, totalProfit: 0, bookmakerCounts: {} };
        }
        groups[dateKey].bets.push(bet);
        
        const bm = bet.bookmaker || 'Geral';
        groups[dateKey].bookmakerCounts[bm] = (groups[dateKey].bookmakerCounts[bm] || 0) + 1;

        if (bet.status !== 'pending') {
            groups[dateKey].totalStake += bet.stake;
            groups[dateKey].totalProfit += bet.profit;
        }
    });

    if (activeTab === 'trash') {
      transactions.filter(t => t.deleted).forEach(t => {
        const dateKey = format(safeNewDate(t.date), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = { bets: [], transactions: [], totalStake: 0, totalProfit: 0, bookmakerCounts: {} };
        }
        groups[dateKey].transactions.push(t);
      });
    }
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [historyBets, transactions, activeTab]);

  const stats = useMemo((): Stats => {
    const settledBets = filteredBets.filter(b => b.status !== 'pending');
    const wonBets = filteredBets.filter(b => b.status === 'won' || b.status === 'half_win');
    const totalProfit = settledBets.reduce((acc, b) => acc + b.profit, 0);
    const totalStake = settledBets.reduce((acc, b) => acc + b.stake, 0);
    
    return {
      totalBets: filteredBets.length,
      winRate: settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0,
      totalProfit,
      roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
      unitsWon: totalProfit / bankroll.unitSize,
      profitPercentage: bankroll.total > 0 ? (totalProfit / bankroll.total) * 100 : 0
    };
  }, [filteredBets, bankroll.unitSize, bankroll.total]);

  const bookmakerBalancesRaw = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Process actions that affect balance
    const activeBankrollBets = bets.filter(b => !b.deleted && b.bankrollId === activeBankrollId);
    const activeBankrollTransactions = transactions.filter(t => t.bankrollId === activeBankrollId && !t.deleted);

    // Apply bets impact
    activeBankrollBets.forEach(b => {
      const bm = b.bookmaker || 'Geral';
      if (b.status === 'pending') {
        balances[bm] = (balances[bm] || 0) - b.stake;
      } else {
        balances[bm] = (balances[bm] || 0) + b.profit;
      }
    });

    // Apply transactions 
    activeBankrollTransactions.forEach(t => {
      if (t.type === 'deposit') {
        const bm = t.toBookmaker || 'Geral';
        balances[bm] = (balances[bm] || 0) + t.amount;
      } else if (t.type === 'withdrawal') {
        const bm = t.fromBookmaker || 'Geral';
        balances[bm] = (balances[bm] || 0) - t.amount;
      } else if (t.type === 'transfer') {
        if (t.fromBookmaker) {
          balances[t.fromBookmaker] = (balances[t.fromBookmaker] || 0) - t.amount;
        }
        if (t.toBookmaker) {
          balances[t.toBookmaker] = (balances[t.toBookmaker] || 0) + t.amount;
        }
      } else if (t.type === 'adjustment') {
        const bm = t.fromBookmaker || 'Geral';
        balances[bm] = (balances[bm] || 0) + t.amount;
      }
    });

    return balances;
  }, [bets, transactions, activeBankrollId]);

  const bookmakerBalances = useMemo(() => {
    return (Object.entries(bookmakerBalancesRaw) as [string, number][])
      .filter(([_, amount]) => Math.abs(amount) > 0.001)
      .sort((a, b) => b[1] - a[1]);
  }, [bookmakerBalancesRaw]);

  // All-time stats specifically for "Banca Atual" (ignores timeRange/filters)
  const allTimeStats = useMemo(() => {
    const activeBets = bets.filter(b => !b.deleted && b.bankrollId === activeBankrollId);
    const settledBets = activeBets.filter(b => b.status !== 'pending');
    const pendingBets = activeBets.filter(b => b.status === 'pending');
    
    const totalProfit = settledBets.reduce((acc, b) => acc + b.profit, 0);
    const totalPendingStakes = pendingBets.reduce((acc, b) => acc + b.stake, 0);

    // CRITICAL FIX: The Top Balance is now STICKLY the sum of the VISIBLE lines below it
    const currentBalance = (bookmakerBalances as [string, number][]).reduce((acc, [_, bal]) => acc + bal, 0);
    
    return {
      totalProfit,
      pendingCount: pendingBets.length,
      pendingStake: totalPendingStakes,
      currentBalance
    };
  }, [bets, bookmakerBalances, activeBankrollId]);

  const prevBankrollIdRef = useRef<string | null>(null);
  const prevBalanceRef = useRef<number | null>(null);
  const [balanceDelta, setBalanceDelta] = useState<number | null>(null);
  const [showBalanceFeedback, setShowBalanceFeedback] = useState(false);

  useEffect(() => {
    // If we changed bankrolls, just sync the balance and don't show feedback
    if (prevBankrollIdRef.current !== activeBankrollId) {
      prevBankrollIdRef.current = activeBankrollId;
      prevBalanceRef.current = allTimeStats.currentBalance;
      setShowBalanceFeedback(false);
      return;
    }

    if (prevBalanceRef.current !== null && Math.abs(allTimeStats.currentBalance - prevBalanceRef.current) > 0.001) {
      const delta = allTimeStats.currentBalance - prevBalanceRef.current;
      setBalanceDelta(delta);
      setShowBalanceFeedback(true);
      const timer = setTimeout(() => setShowBalanceFeedback(false), 2500);
      return () => clearTimeout(timer);
    }
    prevBalanceRef.current = allTimeStats.currentBalance;
  }, [allTimeStats.currentBalance, activeBankrollId]);

  const historyTransactions = useMemo(() => {
    return transactions.filter(t => !t.deleted);
  }, [transactions]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    historyTransactions.forEach(t => {
      const dateKey = format(safeNewDate(t.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    
    const sortedGroups = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    
    // Initialize all groups as expanded initially if they are new
    if (expandedTransactionGroups.size === 0 && sortedGroups.length > 0) {
      setExpandedTransactionGroups(new Set(sortedGroups.map(([date]) => date)));
    }
    
    return sortedGroups;
  }, [historyTransactions]);

  const toggleTransactionGroup = (date: string) => {
    const newExpanded = new Set(expandedTransactionGroups);
    if (newExpanded.has(date)) newExpanded.delete(date);
    else newExpanded.add(date);
    setExpandedTransactionGroups(newExpanded);
  };

  const bookmakerExposure = useMemo(() => {
    const exposure: Record<string, number> = {};
    bets.filter(b => b.status === 'pending' && !b.deleted && b.bankrollId === activeBankrollId).forEach(b => {
      const bm = b.bookmaker || 'Geral';
      exposure[bm] = (exposure[bm] || 0) + b.stake;
    });
    return Object.entries(exposure).sort((a, b) => b[1] - a[1]);
  }, [bets]);

  const chartData = useMemo(() => {
    let cumulative = 0;
    return filteredBets
      .filter(b => b.status !== 'pending')
      .sort((a, b) => safeNewDate(a.date).getTime() - safeNewDate(b.date).getTime())
      .map(b => {
        cumulative += b.profit;
        return {
          date: timeRange === '24h' ? format(safeNewDate(b.date), 'HH:mm') : format(safeNewDate(b.date), 'dd/MM'),
          profit: cumulative
        };
      });
  }, [filteredBets]);

  const chartRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, off: 0 };
    const values = chartData.map(d => d.profit);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    if (max === min) return { min, max, off: 0 };
    return { min, max, off: max / (max - min) };
  }, [chartData]);

  const addBet = async (newBet: Omit<Bet, 'id' | 'profit'>, force = false) => {
    if (!user || !activeBankrollId || isRegistering) return;

    // Check for exact duplicates (prevent re-registering the same ticket)
    const isExactDuplicate = bets.some(b => 
      !b.deleted &&
      b.event.toLowerCase() === newBet.event.toLowerCase() &&
      b.market.toLowerCase() === newBet.market.toLowerCase() &&
      b.selection.toLowerCase() === newBet.selection.toLowerCase() &&
      Math.abs(b.odds - newBet.odds) < 0.0001 &&
      Math.abs(b.stake - newBet.stake) < 0.0001 &&
      b.date === newBet.date
    );

    if (isExactDuplicate) {
      console.warn("Exact duplicate bet detected, skipping registration.");
      return;
    }

    // Check for similar duplicates for warning
    const isDuplicate = bets.some(b => 
      !b.deleted &&
      b.event.toLowerCase() === newBet.event.toLowerCase() &&
      b.market.toLowerCase() === newBet.market.toLowerCase() &&
      b.selection.toLowerCase() === newBet.selection.toLowerCase() &&
      Math.abs(b.odds - newBet.odds) < 0.01 &&
      Math.abs(b.stake - newBet.stake) < 0.01
    );

    if (isDuplicate && !force) {
      setDuplicateWarning({ confirmed: false, data: newBet });
      return;
    }

    const profit = calculateProfit(newBet.stake, newBet.odds, newBet.status, newBet.cashoutValue);
    
    setIsRegistering(true);
    try {
      await addDoc(collection(db, 'bets'), {
        ...newBet,
        userId: user.uid,
        bankrollId: activeBankrollId,
        profit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deleted: false
      });
      showToast("Aposta registrada com sucesso!");
      setIsManualBookmaker(false);
      if (activeTab === 'register') {
        setBetForm({
          date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          sport: 'Futebol',
          event: '',
          market: '',
          selection: '',
          odds: '',
          stake: bankroll.unitSize.toString(),
          status: 'pending' as Bet['status'],
          cashoutValue: '',
          bookmaker: 'Bet365',
          league: '',
          betId: '',
          isLive: false,
          bankrollId: activeBankrollId || ''
        });
      }
      setDuplicateWarning(null);
    } catch (error) {
      console.error("Erro ao salvar aposta:", error);
      showToast("Erro ao salvar aposta.", "info");
    } finally {
      setIsRegistering(false);
    }
  };

  const deleteBet = async (id: string) => {
    if (!user || !activeBankrollId) return;
    try {
      showToast("Movendo para a lixeira...", "info");
      const bet = bets.find(b => b.id === id);
      const data: any = {
        deleted: true,
        updatedAt: serverTimestamp()
      };
      // Auto-migrate legacy bets
      if (bet && !bet.bankrollId) data.bankrollId = activeBankrollId;
      if (bet && !bet.userId) data.userId = user.uid;

      await updateDoc(doc(db, 'bets', id), data);
      showToast("Aposta movida para a lixeira!");
    } catch (error) {
      console.error("Erro ao deletar aposta:", error);
      showToast("Erro ao arquivar aposta.", "info");
    }
  };

  const restoreBet = async (id: string) => {
    if (!user || !activeBankrollId) return;
    try {
      const bet = bets.find(b => b.id === id);
      const data: any = {
        deleted: false,
        updatedAt: serverTimestamp()
      };
      // Auto-migrate legacy bets
      if (bet && !bet.bankrollId) data.bankrollId = activeBankrollId;
      if (bet && !bet.userId) data.userId = user.uid;

      await updateDoc(doc(db, 'bets', id), data);
      showToast("Aposta restaurada com sucesso!", "success");
    } catch (error: any) {
      console.error("Erro ao restaurar aposta:", error);
      alert("Erro ao restaurar: " + error.message);
    }
  };

  const [betToDelete, setBetToDelete] = useState<string | null>(null);

  const permanentlyDeleteBet = async (id: string) => {
    if (!user || !id) return;
    try {
      await deleteDoc(doc(db, 'bets', id));
      setBetToDelete(null);
      showToast("Aposta excluída permanentemente!", "info");
    } catch (error: any) {
      console.error("Erro ao excluir permanentemente:", error);
      alert("Erro ao excluir: " + (error.code || error.message));
    }
  };

  const toggleSelectBet = (id: string) => {
    setSelectedBetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (betsOnView: Bet[]) => {
    if (selectedBetIds.size === betsOnView.length && betsOnView.length > 0) {
      setSelectedBetIds(new Set());
    } else {
      setSelectedBetIds(new Set(betsOnView.map(b => b.id)));
    }
  };

  const syncResults = async (specificBets?: Bet[]) => {
    if (!user || isSyncingResults) return;
    
    // If specificBets provided, use them; otherwise, use all pending/non-deleted ones
    const betsToSync = specificBets || bets.filter(b => b.status === 'pending' && !b.deleted);
    
    if (betsToSync.length === 0) {
      alert("Não há apostas selecionadas ou pendentes para sincronizar.");
      return;
    }

    setIsSyncingResults(true);
    try {
      for (const bet of betsToSync) {
        setSyncingBetId(bet.id);
        const result = await checkBetResult(bet.event, bet.market, bet.selection, bet.date);
        if (result.status !== 'pending') {
          await updateStatus(bet.id, result.status);
        }
        setSyncingBetId(null);
      }
      setSelectedBetIds(new Set()); // Limpa seleção após sincronizar
      alert("Sincronização concluída!");
    } catch (error) {
      console.error("Erro na sincronização:", error);
      alert("Erro ao sincronizar. Verifique sua conexão ou tente novamente.");
    } finally {
      setIsSyncingResults(false);
      setSyncingBetId(null);
    }
  };

  const updateBet = async (id: string, updatedData: Partial<Bet>) => {
    if (!user || !activeBankrollId) {
      if (!user) return;
      showToast("Selecione ou crie uma banca primeiro.", "info");
      return;
    }
    const bet = bets.find(b => b.id === id);
    if (!bet) return;

    const finalStake = updatedData.stake ?? bet.stake;
    const finalOdds = updatedData.odds ?? bet.odds;
    const finalStatus = updatedData.status ?? bet.status;
    const finalCashout = updatedData.cashoutValue !== undefined ? updatedData.cashoutValue : bet.cashoutValue;

    try {
      const dataToUpdate: any = {
        ...updatedData,
        profit: calculateProfit(finalStake, finalOdds, finalStatus, finalCashout),
        updatedAt: serverTimestamp()
      };

      // Garantir que apostas legadas recebam o bankrollId e userId
      if (!bet.bankrollId) {
        dataToUpdate.bankrollId = activeBankrollId;
      }
      if (!bet.userId) {
        dataToUpdate.userId = user.uid;
      }

      // Lista de campos permitidos pelas regras ATUAIS (sem a atualização do setup)
      const allowedFields = [
        'status', 'profit', 'updatedAt', 'odds', 'stake', 
        'selection', 'market', 'event', 'sport', 'league', 'date', 
        'deleted', 'cashoutValue', 'notes', 'bookmaker', 'bankrollId', 'userId',
        'betId', 'isLive'
      ];

      // Só envia o que mudou E o que as regras permitem
      Object.entries(updatedData).forEach(([key, value]) => {
        if (allowedFields.includes(key) && value !== (bet as any)[key]) {
          dataToUpdate[key] = value;
        }
      });

      // Remova undefined para evitar erro do Firestore
      Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

      if (Object.keys(dataToUpdate).length <= 2) { // Apenas profit e updatedAt? Nada mudou.
        setEditingBetId(null);
        return;
      }

      await updateDoc(doc(db, 'bets', id), dataToUpdate);
      showToast("Aposta atualizada com sucesso!", "info");
      setEditingBetId(null);
      setIsManualBookmaker(false);
      setShowEditModal(false);
    } catch (error) {
      console.error("Erro ao atualizar aposta:", error);
      if (error instanceof Error && error.message.includes('permissions')) {
         showToast("Erro de permissão no Firebase. Tente reconfigurar o App nos Ajustes.", "info");
      }
    }
  };

  const deleteSelectedBets = async () => {
    // 1. Reação Visual Imediata
    console.log("DEBUG: Clique em excluir detectado");
    
    if (!user) {
      showToast("Ops! Você precisa estar logado.", "info");
      return;
    }
    
    const count = selectedBetIds.size;
    if (count === 0) {
      showToast("Selecione alguma aposta primeiro.", "info");
      return;
    }
    
    // 2. Confirmação (pode ser o que está bloqueando em alguns navegadores se o confirm for desativado)
    const proceed = window.confirm(`Deseja mover ${count} aposta(s) para a lixeira?`);
    if (!proceed) return;
    
    try {
      showToast(`Processando ${count} exclusões...`, "info");
      const ids = Array.from(selectedBetIds) as string[];
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const id of ids) {
        if (!id || typeof id !== 'string') continue;
        
        // Buscamos a aposta no estado local para reaproveitar dados se necessário
        const bet = bets.find(b => b.id === id);
        
        // Dados mínimos para exclusão lógica (soft delete)
        const updateData: any = {
          deleted: true,
          updatedAt: serverTimestamp(),
          userId: user.uid // Garante que o userId exista para as regras de segurança
        };
        
        // Preserva a banca se existir
        if (bet && bet.bankrollId) updateData.bankrollId = bet.bankrollId;
        else if (activeBankrollId) updateData.bankrollId = activeBankrollId;

        const docRef = doc(db, 'bets', id);
        batch.update(docRef, updateData);
        batchCount++;

        // Limite de lote do Firestore é 500
        if (batchCount === 490) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }
      
      // Sucesso total
      setSelectedBetIds(new Set());
      showToast(`${count} apostas movidas para a lixeira!`, "success");
      console.log("DEBUG: Lote de exclusão finalizado com sucesso");
    } catch (error: any) {
      console.error("ERRO NO LOTE DE EXCLUSÃO:", error);
      const msg = error.message || "Erro desconhecido";
      showToast("Falha ao excluir: " + msg.substring(0, 50), "info");
    }
  };

  const restoreSelectedBets = async () => {
    if (!user || selectedBetIds.size === 0) return;
    try {
      showToast("Restaurando apostas...", "info");
      const ids = Array.from(selectedBetIds) as string[];
      let batch = writeBatch(db);
      let count = 0;

      for (const id of ids) {
        batch.update(doc(db, 'bets', id), {
          deleted: false,
          updatedAt: serverTimestamp()
        });
        count++;
        if (count === 499) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      setSelectedBetIds(new Set());
      showToast("Apostas restauradas com sucesso!");
    } catch (error) {
      console.error("Erro ao restaurar apostas em lote:", error);
      showToast("Erro ao restaurar apostas.", "info");
    }
  };

  const permanentlyDeleteSelectedBets = async () => {
    if (!user) return;
    const countSize = selectedBetIds.size;
    if (countSize === 0) return;
    
    if (!window.confirm(`ATENÇÃO: Deseja excluir permanentemente ${countSize} aposta(s)? Esta ação não pode ser desfeita.`)) return;
    
    try {
      showToast("Excluindo permanentemente...", "info");
      const ids = Array.from(selectedBetIds) as string[];
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const id of ids) {
        if (!id) continue;
        batch.delete(doc(db, 'bets', id));
        batchCount++;
        if (batchCount === 490) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      if (batchCount > 0) await batch.commit();
      
      setSelectedBetIds(new Set());
      showToast(`${countSize} apostas excluídas permanentemente!`, "success");
    } catch (error: any) {
      console.error("Erro na exclusão permanente:", error);
      showToast("Falha na exclusão: " + (error.message || ""), "info");
    }
  };

  const updateStatusForSelected = async (status: Bet['status']) => {
    if (!user || selectedBetIds.size === 0) return;
    
    try {
      const ids = Array.from(selectedBetIds) as string[];
      for (const id of ids) {
        const bet = bets.find(b => b.id === id);
        if (bet) {
          const data: any = {
            status,
            profit: calculateProfit(bet.stake, bet.odds, status, bet.cashoutValue),
            updatedAt: serverTimestamp()
          };
          // Auto-migrate
          if (!bet.bankrollId && activeBankrollId) data.bankrollId = activeBankrollId;
          if (!bet.userId) data.userId = user.uid;

          await updateDoc(doc(db, 'bets', id), data);
        }
      }
      setSelectedBetIds(new Set());
      showToast(`Status das apostas alterado para ${status === 'won' ? 'Ganha' : status === 'lost' ? 'Perdida' : status === 'void' ? 'Reembolsada' : 'Pendente'}`);
    } catch (error) {
      console.error("Erro ao atualizar status em massa:", error);
    }
  };

  const updateBookmakerForSelected = async (bookmaker: string) => {
    if (!user || selectedBetIds.size === 0) return;
    try {
      const ids = Array.from(selectedBetIds) as string[];
      const selected = bets.filter(b => selectedBetIds.has(b.id));
      const allMatch = selected.every(b => b.bookmaker === bookmaker);
      const targetBookmaker = allMatch ? '' : bookmaker;

      const batch = writeBatch(db);
      for (const id of ids) {
        batch.update(doc(db, 'bets', id), {
          bookmaker: targetBookmaker,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      setSelectedBetIds(new Set());
      showToast(targetBookmaker === '' ? 'Casa de aposta removida' : `Casa de aposta alterada para ${bookmaker}`);
    } catch (error) {
      console.error("Erro ao atualizar casa em massa:", error);
    }
  };

  const updateStatus = async (id: string, status: Bet['status'], cashoutValue?: number) => {
    if (!user || !activeBankrollId) {
      if (!user) return;
      showToast("Selecione uma banca ativa primeiro.", "info");
      return;
    }
    const bet = bets.find(b => b.id === id);
    if (!bet) return;

    try {
      const finalCashout = cashoutValue !== undefined ? cashoutValue : bet.cashoutValue;
      const data: any = {
        status,
        profit: calculateProfit(bet.stake, bet.odds, status, finalCashout),
        updatedAt: serverTimestamp()
      };
      
      // Auto-migrate legacy bets
      if (!bet.bankrollId) data.bankrollId = activeBankrollId;
      if (!bet.userId) data.userId = user.uid;
      
      if (cashoutValue !== undefined) data.cashoutValue = cashoutValue;

      await updateDoc(doc(db, 'bets', id), data);

      if (status !== 'pending') {
        const labels: Record<string, string> = {
          'won': 'GANHA',
          'lost': 'PERDIDA',
          'half_win': 'MEIO GANHA',
          'half_loss': 'MEIO PERDIDA',
          'void': 'REEMBOLSADA',
          'cashout': 'CASHOUT'
        };
        const impact = data.profit;
        showToast(`${labels[status] || 'ATUALIZADA'}: ${impact >= 0 ? '+' : ''}${formatCurrency(impact)}`, impact >= 0 ? 'success' : 'loss');
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndBankrolls = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
       const oldIndex = bankrolls.findIndex((b) => b.id === active.id);
       const newIndex = bankrolls.findIndex((b) => b.id === over.id);
       const newOrder = arrayMove(bankrolls as Bankroll[], oldIndex, newIndex);
       
       try {
         const batch = writeBatch(db);
         newOrder.forEach((b: Bankroll, index: number) => {
           batch.update(doc(db, 'bankrolls', b.id), { order: index });
         });
         await batch.commit();
       } catch (err) {
         console.error("Error updating bankroll order:", err);
       }
    }
  };

  const saveBankroll = async (data: Partial<Bankroll>) => {
    if (!user || !activeBankrollId) return;
    try {
      await updateDoc(doc(db, 'bankrolls', activeBankrollId), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
    }
  };

  const addBankroll = async (name: string, total: number, unitSize: number) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'bankrolls'), {
        name,
        total,
        unitSize,
        userId: user.uid,
        order: bankrolls.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setActiveBankrollId(docRef.id);
      localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', docRef.id);
      showToast("Nova banca criada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar banca:", error);
    }
  };

  const deleteBankroll = async (id: string) => {
    if (!user || bankrolls.length <= 1) {
      alert("Você deve ter pelo menos uma banca.");
      return;
    }
    if (!window.confirm("Deseja realmente excluir esta banca e todas as suas apostas? Esta ação é irreversível.")) return;
    
    try {
      showToast("Excluindo banca e dados relacionados...", "info");
      
      // Fetch ALL bets for this bankroll across ALL states by querying Firestore directly
      const q = query(collection(db, 'bets'), where('userId', '==', user.uid), where('bankrollId', '==', id));
      const snap = await getDocs(q);
      
      let batch = writeBatch(db);
      let count = 0;

      for (const betDoc of snap.docs) {
        batch.delete(betDoc.ref);
        count++;
        if (count === 499) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) await batch.commit();

      // Same for transactions
      const tQ = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('bankrollId', '==', id));
      const tSnap = await getDocs(tQ);
      batch = writeBatch(db);
      count = 0;
      for (const tDoc of tSnap.docs) {
        batch.delete(tDoc.ref);
        count++;
        if (count === 499) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();

      await deleteDoc(doc(db, 'bankrolls', id));
      const other = bankrolls.find(b => b.id !== id);
      if (other) {
        setActiveBankrollId(other.id);
        localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', other.id);
      }
      showToast("Banca e dados excluídos com sucesso!", "info");
    } catch (error) {
      console.error("Erro ao excluir banca:", error);
    }
  };

  const fixOrphanedBets = async () => {
    if (!user || !activeBankrollId) return;
    if (!window.confirm("Isso irá mover todas as apostas que não pertencem a nenhuma das suas bancas atuais para a banca '"+bankroll.name+"'. Deseja continuar?")) return;
    
    try {
      const q = query(collection(db, 'bets'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const validBankrollIds = new Set(bankrolls.map(b => b.id));
      
      let batch = writeBatch(db);
      let count = 0;
      
      for (const betDoc of snap.docs) {
        const bId = betDoc.data().bankrollId;
        if (!validBankrollIds.has(bId)) {
          batch.update(betDoc.ref, { bankrollId: activeBankrollId });
          count++;
          if (count === 499) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      
      if (count > 0) await batch.commit();
      showToast(`${count} apostas órfãs foram restauradas!`, "success");
    } catch (err) {
      console.error("Rescue error:", err);
      showToast("Erro ao resgatar apostas.", "info");
    }
  };

  const consolidateAllBets = async () => {
    if (!user || !activeBankrollId) return;
    if (!window.confirm("ATENÇÃO: Todas as apostas de TODAS as suas bancas serão movidas para a banca '"+bankroll.name+"'. Esta ação não pode ser desfeita. Continuar?")) return;

    try {
      const q = query(collection(db, 'bets'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      
      let batch = writeBatch(db);
      let count = 0;
      
      for (const betDoc of snap.docs) {
        batch.update(betDoc.ref, { bankrollId: activeBankrollId });
        count++;
        if (count === 499) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) await batch.commit();
      showToast(`${count} apostas consolidadas com sucesso!`, "success");
    } catch (err) {
      console.error("Consolidation error:", err);
      showToast("Erro ao consolidar apostas.", "info");
    }
  };

  const removeDuplicates = async () => {
    if (!user) return;
    
    const activeBets = bets.filter(b => !b.deleted);
    const groups: { [key: string]: string[] } = {};
    
    activeBets.forEach(b => {
      // Normalizar data para comparação (YYYY-MM-DD HH:mm)
      const dateStr = format(new Date(b.date), "yyyy-MM-dd HH:mm");
      const key = `${dateStr}_${b.event.toLowerCase()}_${b.market.toLowerCase()}_${b.selection.toLowerCase()}_${b.odds}_${b.stake}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b.id);
    });
    
    const toDelete: string[] = [];
    Object.values(groups).forEach(ids => {
      if (ids.length > 1) {
        toDelete.push(...ids.slice(1));
      }
    });

    if (toDelete.length === 0) {
      showToast("Nenhuma duplicata encontrada.", "info");
      return;
    }

    if (!window.confirm(`Encontramos ${toDelete.length} apostas idênticas (duplicadas). Deseja excluí-las permanentemente para limpar sua base de dados?`)) return;

    try {
      showToast("Limpando duplicatas...", "info");
      let batch = writeBatch(db);
      let count = 0;
      for (const id of toDelete) {
        batch.delete(doc(db, 'bets', id));
        count++;
        if (count === 499) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      showToast(`${toDelete.length} duplicatas removidas com sucesso!`, "success");
    } catch (err) {
      console.error("Deduplication error:", err);
      showToast("Erro ao remover duplicatas.", "info");
    }
  };

  const auditReport = useMemo(() => {
    const activeBets = bets.filter(b => !b.deleted);
    const activeTrans = transactions.filter(t => !t.deleted);
    
    const orphans = activeBets.filter(b => !bankrolls.some(bk => bk.id === b.bankrollId));
    const orphanTrans = activeTrans.filter(t => !bankrolls.some(bk => bk.id === t.bankrollId));
    
    const seen = new Set();
    let duplicates = 0;
    activeBets.forEach(b => {
      const dateStr = format(safeNewDate(b.date), "yyyy-MM-dd HH:mm");
      const key = `${dateStr}_${b.event.toLowerCase()}_${b.market.toLowerCase()}_${b.selection.toLowerCase()}_${b.odds}_${b.stake}`;
      if (seen.has(key)) duplicates++;
      else seen.add(key);
    });

    return {
      total: activeBets.length,
      orphans: orphans.length + orphanTrans.length,
      duplicates
    };
  }, [bets, bankrolls, transactions]);
  const addTransaction = async (data: Omit<Transaction, 'id' | 'userId' | 'bankrollId' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !activeBankrollId) return;
    try {
      // Remove undefined values to avoid Firestore issues
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      if (editingTransactionId) {
        await updateDoc(doc(db, 'transactions', editingTransactionId), {
          ...cleanData,
          updatedAt: serverTimestamp()
        });
        showToast("Registro atualizado com sucesso!");
        setEditingTransactionId(null);
        setShowTransactionEditModal(false);
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...cleanData,
          userId: user.uid,
          bankrollId: activeBankrollId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showToast("Registro realizado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao registrar transação:", error);
    }
  };

  const handleBalanceAdjustment = async () => {
    if (!user || !activeBankrollId || !adjustingBookmaker || adjustmentValue === '') return;
    
    const newVal = parseFloat(adjustmentValue.replace(',', '.'));
    if (isNaN(newVal)) {
      showToast("Insira um valor numérico válido", "info");
      return;
    }

    const currVal = bookmakerBalances.find(([bm]) => bm === adjustingBookmaker)?.[1] || 0;
    const diff = newVal - currVal;
    
    if (Math.abs(diff) < 0.01) {
      setAdjustingBookmaker(null);
      return;
    }

    // Check if new total exceeds bankroll (using the corrected currentBalance)
    const newTotal = allTimeStats.currentBalance + diff;
    if (newTotal > bankroll.total * 2) {
      if (!window.confirm(`Alerta: O novo saldo total (${formatCurrency(newTotal)}) parece muito alto comparado à banca inicial (${formatCurrency(bankroll.total)}). Deseja completar o ajuste?`)) {
        return;
      }
    }

    try {
      await addDoc(collection(db, 'transactions'), {
        amount: diff,
        date: new Date().toISOString(),
        type: 'adjustment',
        fromBookmaker: adjustingBookmaker,
        userId: user.uid,
        bankrollId: activeBankrollId,
        notes: `Ajuste manual de saldo: de ${formatCurrency(currVal)} para ${formatCurrency(newVal)}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      showToast("Saldo ajustado com sucesso!");
      setAdjustingBookmaker(null);
      setAdjustmentValue('');
    } catch (e) {
      console.error("Erro ao ajustar saldo:", e);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'transactions', id), {
        deleted: true,
        updatedAt: serverTimestamp()
      });
      showToast("Registro movido para a lixeira.", "info");
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
    }
  };

  const restoreTransaction = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'transactions', id), {
        deleted: false,
        updatedAt: serverTimestamp()
      });
      showToast("Registro restaurado com sucesso!");
    } catch (error) {
      console.error("Erro ao restaurar transação:", error);
    }
  };

  const permanentlyDeleteTransaction = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Deseja realmente excluir permanentemente este registro?")) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
      showToast("Registro excluído permanentemente.");
    } catch (error) {
      console.error("Erro ao excluir transação permanentemente:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-accent font-black text-xl animate-pulse uppercase tracking-[0.5em]">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full glass-card overflow-hidden">
          <div className="p-8 border-b border-border text-center">
            <div className="text-accent font-black text-4xl tracking-tighter mb-2 uppercase">StakeWise.</div>
            <p className="text-text-dim text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Gestão de banca na nuvem v1.5.0
            </p>
          </div>

          <div className="p-8 space-y-6">
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError('');
                try {
                  if (isAuthRegistering) {
                    await registerWithEmail(email, password);
                  } else {
                    await loginWithEmail(email, password);
                  }
                } catch (err: any) {
                  const errorCode = err.code || '';
                  if (errorCode === 'auth/unauthorized-domain' || err.message.includes('domínio não autorizado')) {
                    const domain = window.location.hostname || "seu-dominio.com";
                    setAuthError(`DOMÍNIO NÃO AUTORIZADO: Adicione '${domain}' no Console do Firebase > Authentication > Settings > Authorized Domains.`);
                  } else if (errorCode === 'auth/operation-not-allowed') {
                    setAuthError("PROVEDOR DESATIVADO: Ative 'E-mail/Senha' no Firebase em Authentication > Sign-in method.");
                  } else {
                    setAuthError(err.message.includes('auth/invalid-credential') || err.message.includes('auth/wrong-password') ? 'Email ou senha incorretos.' : 
                                 err.message.includes('auth/email-already-in-use') ? 'Este email já está em uso.' : 
                                 err.message.includes('auth/weak-password') ? 'A senha deve ter pelo menos 6 caracteres.' :
                                 `Erro de Login: ${err.message}`);
                  }
                }
              }}
              className="space-y-4"
            >
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
                className="w-full bg-accent text-bg py-4 px-6 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 active:scale-95 transition-all"
              >
                {isAuthRegistering ? 'Criar Conta' : 'Entrar na Plataforma'}
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
              onClick={async () => {
                setAuthError('');
                try {
                  await signInWithGoogle();
                } catch (err: any) {
                  setAuthError(err.message);
                }
              }}
              className="w-full flex items-center justify-center gap-4 bg-surface border border-border text-text-main py-4 px-6 rounded-xl font-black uppercase text-xs tracking-widest hover:border-text-dim active:scale-95 transition-all"
            >
              <LogIn className="w-5 h-5 text-accent" />
              Entrar com Google
            </button>

            {authError && (
              <div className="space-y-3">
                <div className="bg-loss/10 border border-loss/20 p-4 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-loss text-center">
                    {authError}
                  </p>
                  
                  {authError.includes('DOMÍNIO NÃO AUTORIZADO') && (
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
                  onClick={async () => {
                    setAuthError('');
                    try {
                      await signInWithGoogle(true); // Force Redirect
                    } catch (err: any) {
                      setAuthError(err.message);
                    }
                  }}
                  className="w-full text-[9px] font-black uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
                >
                  Problemas com o Popup? Tente este link alternativo
                </button>
              </div>
            )}
          </div>

          <div className="p-6 bg-surface/50 border-t border-border text-center">
            <button 
              onClick={() => {
                setIsAuthRegistering(!isAuthRegistering);
                setAuthError('');
              }}
              className="text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
            >
              {isAuthRegistering ? 'Já tenho uma conta? Entrar' : 'Não tem uma conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-text-main bg-bg font-sans">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-bg text-text-dim p-8 flex-col border-r border-border h-screen sticky top-0 overflow-y-auto no-scrollbar">
        <div className="text-accent font-black text-2xl tracking-tighter mb-10 px-2 uppercase">
          StakeWise.
        </div>

        <nav className="space-y-4 flex-1">
          <div className="mb-6 group">
             <p className="text-[10px] font-black uppercase tracking-widest text-text-dim px-2 mb-2">Banca Ativa</p>
             <button 
                onClick={() => setIsBankrollMenuOpen(true)}
                className="w-full bg-surface/40 hover:bg-surface/80 border border-border group-hover:border-accent rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-300 backdrop-blur-md group"
             >
                <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-[11px] font-black text-text-main uppercase truncate max-w-[140px] tracking-tight">{bankroll.name}</span>
                    <span className="text-[8px] font-black text-accent uppercase tracking-widest opacity-80">Selecionar Banca</span>
                </div>
                <div className="bg-bg/50 p-1.5 rounded-lg border border-border/50 group-hover:border-accent/30 transition-all">
                  <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-accent transition-colors" />
                </div>
             </button>
          </div>
          
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
              activeTab === 'dashboard' ? "text-text-main" : "hover:text-text-main"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
              activeTab === 'register' ? "text-text-main" : "hover:text-text-main"
            )}
          >
            <Plus className="w-4 h-4" />
            Nova Aposta
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
              activeTab === 'insights' ? "text-text-main" : "hover:text-text-main"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Insights AI
          </button>
          <button 
            onClick={() => setActiveTab('bets')}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
              activeTab === 'bets' ? "text-text-main" : "hover:text-text-main"
            )}
          >
            <History className="w-4 h-4" />
            Histórico
          </button>
          <button 
            onClick={() => setActiveTab('trash')}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
              activeTab === 'trash' ? "text-text-main" : "hover:text-text-main"
            )}
          >
            <Trash2 className="w-4 h-4" />
            Lixeira
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
              activeTab === 'settings' ? "text-text-main" : "hover:text-text-main"
            )}
          >
            <Settings2 className="w-4 h-4" />
            Configurações
          </button>
          <button 
            onClick={() => setActiveTab('transfers')}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1 text-sm font-bold uppercase tracking-wider transition-all",
              activeTab === 'transfers' ? "text-text-main" : "hover:text-text-main"
            )}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transferências
          </button>
        </nav>

        <div className="pt-6 space-y-4">
          {bookmakerExposure.length > 0 && (
            <div className="pb-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-text-dim px-2 mb-2">Investido por Casa</p>
               <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {bookmakerExposure.map(([bm, amount]) => {
                    const style = getBookmakerStyle(bm);
                    return (
                      <div key={bm} className={cn("flex items-center justify-between px-3 py-2 rounded-lg border backdrop-blur-sm transition-all", style.bg, style.border)}>
                          <span className={cn("text-[9px] font-black uppercase tracking-tight truncate max-w-[80px]", style.color)}>{bm}</span>
                          <span className={cn("text-[10px] font-bold tabular-nums", style.color)}>{formatCurrency(amount)}</span>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('settings')}
            className="stat-card p-6 border-border group relative cursor-pointer bg-surface/50 backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-[40px] rounded-full translate-x-12 -translate-y-12" />
            
            <div className="flex items-center justify-between mb-2">
              <p className="text-text-dim text-[10px] font-black uppercase tracking-widest">Banca Atual</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
                <span className="text-[8px] font-black uppercase text-accent tracking-widest">Ativa</span>
              </div>
            </div>

            <div className="relative">
              <motion.p 
                key={allTimeStats.currentBalance}
                initial={{ scale: 1.1, filter: 'brightness(1.5)' }}
                animate={{ scale: 1, filter: 'brightness(1)' }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-text-main text-2xl font-extrabold tracking-tight relative z-10 mb-1"
              >
                {formatCurrency(allTimeStats.currentBalance)}
              </motion.p>
            </div>

            <AnimatePresence>
              {showBalanceFeedback && balanceDelta !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  className={cn(
                    "relative z-20 overflow-hidden rounded-full border py-1 px-3 mb-3 flex items-center justify-center gap-2 backdrop-blur-md mx-auto w-fit",
                    balanceDelta < 0 
                      ? "bg-loss/10 border-loss/20 text-loss shadow-[0_2px_10px_rgba(239,68,68,0.1)]" 
                      : "bg-accent/10 border-accent/20 text-accent shadow-[0_2px_10px_rgba(16,185,129,0.1)]"
                  )}
                >
                  {balanceDelta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  <span className="text-[10px] font-black tabular-nums tracking-tighter leading-none">
                    {balanceDelta < 0 ? '-' : '+'} {formatCurrency(Math.abs(balanceDelta))}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bookmaker breakdown in Balance Card */}
            <div className="space-y-1 relative z-10 border-t border-border/10 pt-4">
               {bookmakerBalances.map(([bm, amount]) => {
                  const style = getBookmakerStyle(bm);
                  return (
                    <div key={bm} className="flex items-center justify-between group/bm">
                       <span className={cn("text-[9px] font-black uppercase tracking-tight", style.color)}>{bm}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black tabular-nums text-text-main">{formatCurrency(amount)}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdjustingBookmaker(bm);
                              setAdjustmentValue(amount.toFixed(2));
                            }}
                            className="opacity-0 group-hover/bm:opacity-100 p-0.5 hover:bg-white/5 rounded transition-all"
                            title="Ajustar Saldo"
                          >
                            <RotateCcw className="w-2.5 h-2.5 text-text-dim" />
                          </button>
                       </div>
                    </div>
                  );
               })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/10 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-text-dim/60 group-hover:text-accent transition-colors">
              <span>Gerenciar Gestão</span>
              <Settings2 className="w-3 h-3" />
            </div>
          </motion.div>
          
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-loss transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden h-20 bg-bg border-b border-border flex flex-col justify-center px-6 sticky top-0 z-20">
        <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
                <div className="text-accent font-black text-lg tracking-tighter uppercase leading-none">
                  StakeWise.
                </div>
                <button 
                  onClick={() => setIsBankrollMenuOpen(true)}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-text-dim mt-1 hover:text-accent transition-colors"
                >
                  {bankroll.name}
                  <ChevronDown className="w-3 h-3" />
                </button>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={signOut}
                    className="p-2 text-text-dim hover:text-loss transition-colors"
                    title="Sair"
                >
                    <LogOut className="w-5 h-5" />
                </button>
                <div className="bg-surface px-3 py-1.5 rounded-lg border border-border flex flex-col items-center min-w-[80px] relative">
                    <AnimatePresence>
                      {showBalanceFeedback && balanceDelta !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.5 }}
                          animate={{ opacity: 1, y: -35, scale: 1.1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "absolute top-0 right-0 font-black text-[10px] z-50 pointer-events-none whitespace-nowrap px-2 py-1 rounded-full border shadow-xl flex items-center gap-1",
                            balanceDelta < 0 ? "bg-loss text-white border-loss shadow-loss/20" : "bg-accent text-bg border-accent shadow-accent/20"
                          )}
                        >
                          {balanceDelta < 0 ? <TrendingDown className="w-2 h-2" /> : <TrendingUp className="w-2 h-2" />}
                          {balanceDelta < 0 ? '-' : '+'} {formatCurrency(Math.abs(balanceDelta))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className="text-[7px] font-black uppercase tracking-widest text-text-dim">Saldo</span>
                    <motion.span 
                      key={allTimeStats.currentBalance}
                      animate={showBalanceFeedback ? { scale: [1, 1.2, 1], color: balanceDelta && balanceDelta < 0 ? ['#ef4444', '#10b981'] : undefined } : {}}
                      className="text-[10px] font-black text-accent"
                    >
                      {formatCurrency(allTimeStats.currentBalance)}
                    </motion.span>
                </div>
                <button 
                    onClick={() => setActiveTab('register')}
                    className="bg-accent text-bg p-2 rounded-lg"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-bg pb-20 lg:pb-0">
        <header className="hidden lg:flex h-24 bg-bg border-b border-border items-center justify-between px-10 sticky top-0 z-10">
          <h1 className="text-2xl font-black uppercase tracking-tighter">
            {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'bets' ? 'Histórico de Apostas' : activeTab === 'trash' ? 'Lixeira (Arquivadas)' : activeTab === 'register' ? 'Registrar Aposta' : activeTab === 'insights' ? 'Insights com IA' : activeTab === 'transfers' ? 'Transferências e Unidades' : 'Gestão de Banca'}
          </h1>
          {activeTab !== 'register' && (
            <button 
              onClick={() => setActiveTab('register')}
              className="bg-accent hover:opacity-90 text-bg px-6 py-3 rounded-lg font-black uppercase text-xs tracking-widest transition-all active:scale-95"
            >
              Registrar Nova Aposta
            </button>
          )}
        </header>

        <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-[calc(100vh-6rem)]">
          {activeTab === 'dashboard' && (
            <motion.div 
              key={`dashboard-${activeBankrollId}`}
              initial={{ opacity: 0, x: -30, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ 
                duration: 0.5, 
                ease: [0.23, 1, 0.32, 1] 
              }}
              className="space-y-8"
            >
              {/* Range Selectors */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-text-dim">Período de Análise</h2>
                </div>
                <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'Tudo' },
                    { id: '30d', label: '30 Dias' },
                    { id: '7d', label: '7 Dias' },
                    { id: '24h', label: '24h' },
                  ].map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setTimeRange(range.id as any)}
                      className={cn(
                        "px-4 py-1.5 text-[10px] whitespace-nowrap font-black uppercase tracking-widest rounded-md transition-all",
                        timeRange === range.id ? "bg-surface text-accent border border-border" : "text-text-dim hover:text-text-main"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
                <StatsCard title="Total Entradas" value={`${stats.totalBets}`} icon={<History />} />
                <StatsCard title="Lucro Total" value={formatCurrency(stats.totalProfit)} trend={stats.totalProfit >= 0 ? 'up' : 'down'} icon={<BarChart3 />} />
                <StatsCard title="Lucro s/ Banca" value={`${stats.profitPercentage.toFixed(1)}%`} trend={stats.profitPercentage >= 0 ? 'up' : 'down'} icon={<TrendingUp />} />
                <StatsCard title="Taxa de Acerto" value={`${stats.winRate.toFixed(1)}%`} icon={<History />} />
                <StatsCard title="ROI" value={`${stats.roi.toFixed(1)}%`} icon={<TrendingUp />} />
                <StatsCard title="Lucro em Unidades" value={`${stats.unitsWon.toFixed(1)}u`} icon={<Target />} />
              </div>

              {/* Bookmaker Exposure (Mobile friendly) */}
              {bookmakerExposure.length > 0 && (
                <div className="glass-card p-6 border-border bg-surface/30">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim mb-4">Investido por Casa de Aposta</h3>
                  <div className="flex flex-wrap gap-3">
                    {bookmakerExposure.map(([bm, amount]) => {
                       const style = getBookmakerStyle(bm);
                       return (
                         <div key={bm} className={cn("px-4 py-3 rounded-xl border backdrop-blur-md flex flex-col min-w-[120px] transition-all hover:scale-105", style.bg, style.border)}>
                           <span className={cn("text-[9px] font-black uppercase tracking-widest mb-1", style.color)}>{bm}</span>
                           <span className={cn("text-base font-black tabular-nums", style.color)}>{formatCurrency(amount)}</span>
                         </div>
                       );
                    })}
                  </div>
                </div>
              )}

              {/* Pending Bets Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5 flex items-center justify-between group overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full translate-x-12 -translate-y-12" />
                   <div className="relative z-10">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-2">Apostas Pendentes</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter text-text-main line-height-none">{allTimeStats.pendingCount}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Entradas em andamento</span>
                      </div>
                   </div>
                   <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform relative z-10">
                      <Clock className="w-5 h-5 text-amber-500" />
                   </div>
                </div>

                <div className="glass-card p-6 border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between group overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full translate-x-12 -translate-y-12" />
                   <div className="relative z-10">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60 mb-2">Total Comprometido</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter text-text-main line-height-none">{formatCurrency(allTimeStats.pendingStake)}</span>
                      </div>
                   </div>
                   <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 group-hover:scale-110 transition-transform relative z-10">
                      <DollarSign className="w-5 h-5 text-indigo-500" />
                   </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="glass-card p-6 min-h-[500px] border-border bg-[#0B0D11] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim/60 mb-1">P/L ACUMULADO</h3>
                    <div className="flex items-baseline gap-3">
                      <p className={cn(
                        "text-4xl font-black tracking-tighter",
                        stats.totalProfit >= 0 ? "text-[#00FF95]" : "text-[#FF3E3E]"
                      )}>
                        {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#15181F] rounded-full border border-white/5 shadow-inner">
                    <TrendingUp className="w-3.5 h-3.5 text-[#00FF95]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00FF95]">{stats.totalBets} tips</span>
                  </div>
                </div>

                <div className="h-[380px] w-full mt-6 relative z-10">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={chartRange.off} stopColor="#00FF95" stopOpacity={0.25}/>
                            <stop offset={chartRange.off} stopColor="#FF3E3E" stopOpacity={0.25}/>
                          </linearGradient>
                          <linearGradient id="strokeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={chartRange.off} stopColor="#00FF95" stopOpacity={1}/>
                            <stop offset={chartRange.off} stopColor="#FF3E3E" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#FFFFFF" opacity={0.03} />
                        <ReferenceLine y={0} stroke="#FFFFFF" strokeOpacity={0.1} strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#7C828D', fontWeight: 600 }} 
                          dy={15}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#7C828D', fontWeight: 600 }} 
                          tickFormatter={(val) => `R$ ${val}`} 
                          dx={-10}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const val = payload[0].value as number;
                              return (
                                <div className="bg-[#15181F] border border-white/10 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md">
                                  <p className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-1.5 opacity-50">{label}</p>
                                  <p className={cn(
                                    "text-lg font-black tracking-tighter",
                                    val >= 0 ? "text-[#00FF95]" : "text-[#FF3E3E]"
                                  )}>
                                    {val >= 0 ? '+' : ''}{formatCurrency(val)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="profit" 
                          stroke="url(#strokeGradient)" 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#profitGradient)" 
                          animationDuration={2000}
                          baseLine={0}
                          activeDot={{ r: 4, fill: (data: any) => data.payload.profit >= 0 ? '#00FF95' : '#FF3E3E', stroke: '#0B0D11', strokeWidth: 1 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-text-dim">
                      <BarChart3 className="w-12 h-12 mb-2 opacity-10" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Sem dados suficientes para gerar o gráfico</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'register' && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="max-w-4xl mx-auto"
            >
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-12">
                     <div 
                        className={cn(
                           "glass-card p-12 border-dashed border-2 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-accent transition-all relative overflow-hidden backdrop-blur-xl bg-white/[0.03]",
                           isScanning ? "border-accent opacity-80" : "border-border"
                        )}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           const files = e.dataTransfer.files;
                           if (files && files.length > 0) processFiles(files);
                        }}
                     >
                        <div className={cn(
                           "absolute inset-0 bg-accent/5 transition-opacity duration-1000",
                           isScanning ? "opacity-100 animate-pulse" : "opacity-0 group-hover:opacity-100"
                        )} />
                        
                        {isScanning ? (
                           <div className="relative z-10 flex flex-col items-center">
                              <div className="relative mb-6">
                                 <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-20" />
                                 <div className="bg-accent p-6 rounded-2xl shadow-2xl relative">
                                    <Loader2 className="w-10 h-10 text-bg animate-spin" />
                                 </div>
                              </div>
                              <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-accent">Analisando Print...</h3>
                              <p className="text-text-dim text-[10px] font-black uppercase tracking-widest animate-pulse">
                                 Aguarde, estamos processando as informações da sua aposta
                              </p>
                           </div>
                        ) : (
                           <div className="relative z-10">
                              <div className="bg-surface p-6 rounded-2xl mb-6 inline-block shadow-2xl border border-border group-hover:border-accent/50 group-hover:scale-110 transition-all">
                                 <Camera className="w-10 h-10 text-accent" />
                              </div>
                              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Escanear Aposta com IA</h3>
                              <p className="text-text-dim text-xs font-black uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                                 Arraste um print, cole do clipboard (Ctrl+V) ou clique para automatizar o registro
                              </p>
                              <input 
                                 type="file" 
                                 multiple 
                                 accept="image/*" 
                                 onChange={handleImageUpload}
                                 className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="lg:col-span-12">
                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const betData = {
                           date: safeNewDate(betForm.date).toISOString(),
                           sport: betForm.sport,
                           league: betForm.league,
                           event: betForm.event,
                           market: betForm.market,
                           selection: betForm.selection,
                           odds: Number(betForm.odds),
                           stake: Number(betForm.stake),
                           status: betForm.status,
                           cashoutValue: betForm.cashoutValue ? Number(betForm.cashoutValue) : null,
                           bookmaker: betForm.bookmaker,
                           betId: betForm.betId,
                           isLive: betForm.isLive,
                           bankrollId: activeBankrollId || '',
                        };
                        if (editingBetId) {
                           updateBet(editingBetId, betData);
                        } else {
                           addBet(betData);
                        }
                     }} className="glass-card p-6 md:p-10 space-y-10 relative overflow-hidden backdrop-blur-2xl bg-white/[0.02] border-white/5">
                        {isScanning && (
                           <div className="absolute inset-0 z-20 bg-bg/40 backdrop-blur-[2px] cursor-wait flex items-center justify-center">
                              <div className="flex flex-col items-center gap-4">
                                 <Loader2 className="w-8 h-8 animate-spin text-accent" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-accent">IA Preenchendo Automático...</span>
                              </div>
                           </div>
                        )}
                        
                        <div className="flex items-center justify-between border-b border-border pb-6">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center border border-accent/20">
                                 <Edit3 className="w-6 h-6 text-accent" />
                              </div>
                              <div>
                                 <h3 className="text-xl font-black uppercase tracking-tighter">
                                    {editingBetId ? 'Editar Detalhes' : 'Registro Detalhado'}
                                 </h3>
                                 <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Configuração manual e ajustes da IA</p>
                              </div>
                           </div>
                           {scanError && (
                              <div className="px-4 py-2 bg-loss/10 border border-loss/20 rounded-lg">
                                 <p className="text-loss text-[9px] font-black uppercase tracking-widest leading-none">{scanError}</p>
                              </div>
                           )}
                        </div>

                        {/* Event Context Section */}
                        <div className="space-y-6">
                           <div className="flex items-center gap-2 mb-2">
                              <Target className="w-4 h-4 text-accent" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Contexto do Evento</span>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <InputGroup 
                                 label="Data e Hora" 
                                 type="datetime-local" 
                                 value={betForm.date} 
                                 onChange={(e) => setBetForm({...betForm, date: e.target.value})} 
                                 required 
                              />
                              <InputGroup 
                                 label="Esporte" 
                                 type="text" 
                                 list="sports"
                                 placeholder="Futebol..."
                                 value={betForm.sport} 
                                 onChange={(e) => setBetForm({...betForm, sport: e.target.value})} 
                                 required 
                              />
                              <InputGroup 
                                 label="Liga / Competição" 
                                 type="text" 
                                 placeholder="Ex: Premier League"
                                 value={betForm.league} 
                                 onChange={(e) => setBetForm({...betForm, league: e.target.value})} 
                              />
                           </div>
                           <InputGroup 
                              label="Nome do Evento (Times / Atletas)" 
                              type="text" 
                              placeholder="Ex: Real Madrid x Barcelona"
                              value={betForm.event} 
                              onChange={(e) => setBetForm({...betForm, event: e.target.value})} 
                              required 
                           />
                        </div>

                        {/* Selection & Odds Section */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-6 border-t border-border/50">
                           <div className="md:col-span-12 space-y-6">
                              <div className="flex items-center justify-between mb-2">
                                 <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-accent" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Seleção e Estratégia</span>
                                 </div>
                                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    <span className="text-[9px] font-black text-accent uppercase tracking-tighter">Banca: {bankroll.name}</span>
                                 </div>
                              </div>
                              <InputGroup 
                                 label="Mercado / Detalhes da Aposta" 
                                 type="text" 
                                 list="markets"
                                 placeholder="Ex: Real Madrid - Vencer • Ambas Marcam: Sim"
                                 value={betForm.market} 
                                 onChange={(e) => setBetForm({...betForm, market: e.target.value, selection: e.target.value})} 
                                 required 
                              />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <InputGroup 
                                    label="Odds (Cotação)" 
                                    type="number" 
                                    step="0.01"
                                    placeholder="1.90"
                                    value={betForm.odds} 
                                    onChange={(e) => setBetForm({...betForm, odds: e.target.value})} 
                                    required 
                                 />
                                 <InputGroup 
                                    label="Investimento (Stake)" 
                                    type="number" 
                                    step="0.01"
                                    placeholder="R$ 50,00"
                                    value={betForm.stake} 
                                    onChange={(e) => setBetForm({...betForm, stake: e.target.value})} 
                                    required 
                                 />
                              </div>
                           </div>

                           <div className="md:col-span-4 space-y-6">
                              <div className="flex items-center gap-2 mb-2">
                                 <Wallet className="w-4 h-4 text-accent" />
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Plataforma</span>
                              </div>
                              <div className="space-y-4">
                                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest block">Casa de Aposta</label>
                                <div className="grid grid-cols-2 gap-2">
                                   {userBookmakers.map(b => (
                                      <button
                                         key={b}
                                         type="button"
                                         onClick={() => {
                                            setBetForm({...betForm, bookmaker: betForm.bookmaker === b ? '' : b});
                                            setIsManualBookmaker(false);
                                         }}
                                         className={cn(
                                            "px-2 py-3 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all duration-300",
                                            betForm.bookmaker === b 
                                               ? "bg-accent text-bg border-accent shadow-lg shadow-accent/20" 
                                               : "bg-surface border-border text-text-dim hover:border-border-dim/50"
                                         )}
                                      >
                                         {b}
                                      </button>
                                   ))}
                                   <button
                                      type="button"
                                      onClick={() => setIsManualBookmaker(!isManualBookmaker)}
                                      className={cn(
                                         "px-2 py-3 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all duration-300",
                                         isManualBookmaker ? "bg-accent/10 border-accent text-accent" : "bg-surface border-border text-text-dim"
                                      )}
                                   >
                                      {isManualBookmaker ? 'Fechar' : 'Outra'}
                                   </button>
                                </div>
                                {isManualBookmaker && (
                                   <input
                                      type="text"
                                      autoFocus
                                      value={betForm.bookmaker}
                                      onChange={(e) => setBetForm(prev => ({...prev, bookmaker: e.target.value}))}
                                      placeholder="Nome da plataforma..."
                                      className="w-full px-4 py-3 bg-bg border border-accent/30 text-[10px] font-black uppercase tracking-tight rounded-lg focus:outline-none focus:border-accent"
                                   />
                                )}
                              </div>
                           </div>
                        </div>

                        {/* Status & Options Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-border/50">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Status Inicial</label>
                              <select 
                                 className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-bold text-text-main transition-all"
                                 value={betForm.status}
                                 onChange={(e) => setBetForm({...betForm, status: e.target.value as Bet['status']})}
                              >
                                 <option value="pending">Pendente</option>
                                 <option value="won">Ganha (Green)</option>
                                 <option value="lost">Perdida (Red)</option>
                                 <option value="half_win">Meio Green</option>
                                 <option value="half_loss">Meio Red</option>
                                 <option value="void">Reembolsada</option>
                                 <option value="cashout">Cash Out</option>
                              </select>
                           </div>

                           <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border">
                              <div className="flex-1">
                                 <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Aposta Ao Vivo</label>
                                 <p className="text-[9px] text-text-dim/60 font-medium">Evento em andamento</p>
                              </div>
                              <button
                                 type="button"
                                 onClick={() => setBetForm({...betForm, isLive: !betForm.isLive})}
                                 className={cn(
                                    "w-12 h-6 rounded-full transition-all relative border border-white/5",
                                    betForm.isLive ? "bg-accent shadow-[0_0_15px_rgba(0,255,149,0.3)]" : "bg-border"
                                 )}
                              >
                                 <div className={cn(
                                    "absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all",
                                    betForm.isLive ? "right-1" : "left-1"
                                 )} />
                              </button>
                           </div>

                           {betForm.status === 'cashout' && (
                              <InputGroup 
                                 label="Valor Cash Out" 
                                 type="number" 
                                 step="0.01"
                                 placeholder="0.00"
                                 value={betForm.cashoutValue} 
                                 onChange={(e) => setBetForm({...betForm, cashoutValue: e.target.value})} 
                                 required 
                              />
                           )}
                        </div>

                        <div className="pt-8 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-border pb-2">
                           <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                              Certifique-se de que os dados conferem com sua aposta real.
                           </p>
                           <div className="flex gap-4 w-full md:w-auto">
                              <button 
                                 type="button"
                                 onClick={() => {
                                    setActiveTab('dashboard');
                                    setEditingBetId(null);
                                 }}
                                 className="flex-1 md:px-8 py-4 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface transition-all active:scale-95"
                              >
                                 Cancelar
                              </button>
                              <button 
                                 type="submit"
                                 disabled={isRegistering}
                                 className={cn(
                                   "flex-[2] md:px-12 py-4 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-xl shadow-accent/20 active:scale-95 flex items-center justify-center gap-2",
                                   isRegistering && "opacity-50 cursor-not-allowed"
                                 )}
                              >
                                 {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                 {editingBetId ? 'Salvar Alterações' : 'Confirmar e Registrar'}
                              </button>
                           </div>
                        </div>

                        <datalist id="sports">
                           <option value="Futebol" /><option value="Basquete" /><option value="Tênis" /><option value="E-Sports" /><option value="Vôlei" /><option value="MMA" />
                        </datalist>
                        <datalist id="markets">
                           {PREDEFINED_MARKETS.map(m => <option key={m} value={m} />)}
                        </datalist>
                        <datalist id="selections">
                           {PREDEFINED_SELECTIONS.map(s => <option key={s} value={s} />)}
                        </datalist>
                     </form>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <div className="max-w-4xl mx-auto space-y-8">
               <div className="glass-card p-10 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/10 blur-[100px] rounded-full" />
                  <div className="relative z-10">
                     <div className="bg-accent/10 p-4 rounded-2xl inline-block mb-6 border border-accent/20">
                        <Sparkles className="w-8 h-8 text-accent" />
                     </div>
                     <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">Insights de Performance com IA</h2>
                     <p className="text-text-dim text-xs font-black uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                        O Gemini analisa seu histórico para identificar pontos cego e otimizar sua estratégia
                     </p>
                     
                     <button 
                        onClick={async () => {
                           setIsGeneratingInsights(true);
                           const newInsights = await getAIInsights(bets);
                           setInsights(newInsights);
                           setIsGeneratingInsights(false);
                        }}
                        disabled={isGeneratingInsights || bets.length < 5}
                        className="mt-8 bg-accent text-bg px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 mx-auto shadow-xl shadow-accent/20"
                     >
                        {isGeneratingInsights ? (
                           <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Analisando Padrões...
                           </>
                        ) : (
                           <>
                              <TrendingUp className="w-4 h-4" />
                              Gerar Novos Insights
                           </>
                        )}
                     </button>
                     {bets.length < 5 && <p className="text-[9px] font-black uppercase tracking-widest text-text-dim mt-4">Necessário ao menos 5 apostas registradas</p>}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {insights.length > 0 ? insights.map((insight, idx) => (
                     <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={idx} 
                        className={cn(
                           "glass-card p-6 border-l-4",
                           insight.type === 'positive' ? "border-accent" : insight.type === 'negative' ? "border-loss" : "border-text-dim"
                        )}
                     >
                        <h4 className="text-sm font-black uppercase tracking-tight mb-3 text-text-main">{insight.title}</h4>
                        <p className="text-xs font-bold text-text-dim leading-relaxed uppercase tracking-tight opacity-80">{insight.content}</p>
                     </motion.div>
                  )) : (
                     <div className="md:col-span-3 py-20 text-center glass-card bg-transparent border-dashed">
                        <BarChart3 className="w-12 h-12 text-text-dim opacity-10 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim/50">Clique no botão acima para iniciar a análise</p>
                     </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'bets' && (
            <motion.div 
              key={`history-${activeBankrollId}`}
              initial={{ opacity: 0, x: 30, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ 
                duration: 0.5, 
                ease: [0.23, 1, 0.32, 1] 
              }}
              className="space-y-6"
            >
              <GoogleAd />
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="relative w-full lg:max-w-sm">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por evento ou mercado..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent text-sm font-bold text-text-main placeholder:text-text-dim/50 uppercase tracking-tight"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <AnimatePresence mode="wait">
                    {selectedBetIds.size > 0 ? (
                      <div key="floating-bar" className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
                        <motion.div 
                          initial={{ y: 100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 100, opacity: 0 }}
                          className="pointer-events-auto flex flex-wrap items-stretch gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 bg-surface/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-4xl overflow-hidden"
                        >
                           {/* Count Section */}
                           <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 bg-bg/40 rounded-xl border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-accent hidden sm:block">Selecionados</span>
                                <span className="text-sm sm:text-lg font-mono font-bold text-text-main leading-tight">{selectedBetIds.size.toString().padStart(2, '0')}</span>
                              </div>
                              <button 
                                onClick={() => setSelectedBetIds(new Set())}
                                className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all text-text-dim hover:text-white"
                                title="Limpar seleção"
                              >
                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                           </div>

                           {/* Status Section */}
                           <div className="flex items-center gap-1 px-1.5 bg-bg/40 rounded-xl border border-white/5">
                              <button 
                                onClick={() => updateStatusForSelected('won')} 
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-accent hover:bg-accent/10 rounded-lg transition-all group relative"
                              >
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button 
                                onClick={() => updateStatusForSelected('lost')} 
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-loss hover:bg-loss/10 rounded-lg transition-all group relative"
                              >
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button 
                                onClick={() => updateStatusForSelected('void')} 
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-zinc-400 hover:bg-white/10 rounded-lg transition-all group relative"
                              >
                                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                           </div>

                           <div className="relative flex items-center bg-bg/40 rounded-xl border border-white/5 overflow-hidden flex-1 min-w-[200px] max-w-full">
                              <div className="flex flex-wrap items-center gap-2 px-3 py-2 w-full max-h-[120px] overflow-y-auto no-scrollbar">
                                {userBookmakers.map(bm => {
                                  const style = getBookmakerStyle(bm);
                                  const selected = bets.filter(b => selectedBetIds.has(b.id));
                                  const isActive = selected.length > 0 && selected.every(b => b.bookmaker === bm);
                                  
                                  return (
                                    <button 
                                      key={bm} 
                                      onClick={() => updateBookmakerForSelected(bm)} 
                                      className={cn(
                                        "bm-chip flex-shrink-0 flex items-center gap-2 transition-all",
                                        isActive 
                                          ? "bg-accent/20 border-accent/40 shadow-[0_0_10px_rgba(0,255,149,0.1)] ring-1 ring-accent/30" 
                                          : "bg-white/5 hover:bg-accent/10 border-white/5 hover:border-accent/20",
                                        isActive ? style.color : "text-text-dim"
                                      )} 
                                      title={isActive ? `Remover ${bm} das apostas` : `Mover para ${bm}`}
                                    >
                                       <span className={cn(
                                         "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                                         isActive ? "bg-accent" : "bg-text-dim/40"
                                       )} />
                                       {bm}
                                    </button>
                                  );
                                })}
                              </div>
                              {/* Fade Indicators */}
                              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0A0B0E]/80 to-transparent pointer-events-none" />
                              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0A0B0E]/80 to-transparent pointer-events-none" />
                           </div>

                           {/* Final Actions */}
                           <div className="flex items-center gap-2 ml-auto">
                              {activeTab === 'trash' ? (
                                <>
                                  <button 
                                    onClick={() => restoreSelectedBets()}
                                    className="flex items-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    <span className="hidden sm:inline">Restaurar Seleção</span>
                                  </button>

                                  <button 
                                    onClick={() => permanentlyDeleteSelectedBets()}
                                    className="w-12 h-12 flex items-center justify-center bg-loss/10 text-loss hover:bg-loss hover:text-white rounded-xl transition-all active:scale-90"
                                    title="Excluir Permanentemente"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => {
                                      const selectedBets = bets.filter(b => selectedBetIds.has(b.id));
                                      syncResults(selectedBets);
                                    }}
                                    disabled={isSyncingResults}
                                    className={cn(
                                        "flex items-center gap-2 px-4 sm:px-6 py-3 bg-accent text-bg rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20 disabled:opacity-50",
                                        isSyncingResults && "animate-pulse"
                                    )}
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    <span className="hidden sm:inline">SINCRONIZAR</span>
                                  </button>

                                  <button 
                                    onClick={() => deleteSelectedBets()}
                                    className="w-12 h-12 flex items-center justify-center bg-loss/10 text-loss hover:bg-loss hover:text-white rounded-xl transition-all active:scale-90"
                                    title="Mover para lixeira"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                           </div>
                        </motion.div>
                      </div>
                    ) : (
                      <motion.button 
                        key="sync-all-btn"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        onClick={() => syncResults()}
                        disabled={isSyncingResults}
                        className={cn(
                            "flex items-center justify-center gap-2 px-5 py-3 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed",
                            isSyncingResults && "animate-pulse"
                        )}
                      >
                        {isSyncingResults ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sincronizando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Sincronizar Pendentes
                            </>
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Status:</span>
                    <select 
                        value={historyStatusFilter}
                        onChange={(e) => setHistoryStatusFilter(e.target.value)}
                        className="text-[10px] font-black uppercase tracking-widest bg-surface border border-border rounded-lg px-4 py-2 outline-none focus:border-accent text-text-main"
                    >
                      <option>Todos</option>
                      <option>Ganha</option>
                      <option>Meio Ganha</option>
                      <option>Perdida</option>
                      <option>Meio Perdida</option>
                      <option>Pendente</option>
                      <option>Reembolsada</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Casa:</span>
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-md bg-surface/50 p-1 rounded-lg border border-border/40">
                       <button
                         onClick={() => setHistoryBookmakerFilter([])}
                         className={cn(
                           "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                           historyBookmakerFilter.length === 0 ? "bg-accent text-bg" : "text-text-dim hover:text-text-main"
                         )}
                       >
                         Todas
                       </button>
                       {Array.from(new Set(bets.map(b => b.bookmaker || 'Outra'))).map(bm => (
                         <button
                           key={bm}
                           onClick={() => {
                             setHistoryBookmakerFilter(prev => 
                               prev.includes(bm) ? prev.filter(x => x !== bm) : [...prev, bm]
                             );
                           }}
                           className={cn(
                             "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                             historyBookmakerFilter.includes(bm) 
                               ? "bg-accent/20 text-accent border border-accent/20" 
                               : "text-text-dim hover:text-text-main"
                           )}
                         >
                           {bm}
                         </button>
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                {groupedHistory.map(([date, group]: [string, any]) => {
                  const isCollapsed = collapsedDates.has(date);
                  
                  return (
                    <div key={date} className="space-y-4">
                      <div 
                        onClick={() => toggleDateCollapse(date)}
                        className="flex flex-col md:flex-row md:items-center gap-4 px-2 group/header cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs transition-all backdrop-blur-md",
                            isCollapsed ? "bg-white/[0.02] border-white/5 text-text-dim" : "bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_rgba(0,255,149,0.1)]"
                          )}>
                            {format(safeNewDate(date + 'T00:00:00'), 'dd')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-main">
                                {isToday(safeNewDate(date + 'T00:00:00')) ? 'Hoje' : 
                                 isYesterday(safeNewDate(date + 'T00:00:00')) ? 'Ontem' : 
                                 format(safeNewDate(date + 'T00:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                              </h3>
                              <span className="hidden md:inline-flex items-center gap-2 bg-bg/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                                <span className="text-accent text-[10px] font-black uppercase tracking-widest border-r border-white/10 pr-2">
                                  {group.bets.length} {group.bets.length === 1 ? 'entrada' : 'entradas'}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                   {Object.entries(group.bookmakerCounts).map(([bm, count]) => {
                                      const style = getBookmakerStyle(bm);
                                      return (
                                        <div key={bm} className={cn(
                                          "flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm transition-all hover:scale-105 group/bm cursor-default",
                                          style.bg, style.border, style.color
                                        )}>
                                           <div className={cn("w-4 h-4 flex items-center justify-center rounded-md bg-bg/40 text-[10px] font-black", style.color)}>
                                              {count}
                                           </div>
                                           <span className="text-[7px] font-black uppercase tracking-widest pr-1">
                                              {bm}
                                           </span>
                                        </div>
                                      );
                                   })}
                                </div>
                              </span>
                              {isCollapsed ? (
                                <ChevronRight className="w-3 h-3 text-white/20" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-accent" />
                              )}
                            </div>
                            <div className="md:hidden mt-3 flex flex-wrap items-center gap-1.5">
                                {Object.entries(group.bookmakerCounts).map(([bm, count]) => {
                                  const style = getBookmakerStyle(bm);
                                  return (
                                    <span key={bm} className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm",
                                      style.bg, style.border, style.color
                                    )}>
                                      <span className="text-[10px] font-black leading-none bg-bg/20 w-4 h-4 flex items-center justify-center rounded-md">{count}</span>
                                      <span className="text-[7px] font-black uppercase tracking-tighter pr-0.5">{bm}</span>
                                    </span>
                                  );
                                })}
                             </div>
                          </div>
                        </div>

                        <div className="h-[1px] hidden md:block flex-1 bg-gradient-to-r from-border to-transparent" />
                        
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-text-dim uppercase tracking-widest">Investimento</span>
                            <span className="text-xs font-mono font-bold text-text-main">{formatCurrency(group.totalStake)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-text-dim uppercase tracking-widest">Lucro do Dia</span>
                            <span className={cn(
                              "text-xs font-mono font-bold",
                              group.totalProfit > 0 ? "text-accent" : group.totalProfit < 0 ? "text-loss" : "text-text-dim"
                            )}>
                              {group.totalProfit > 0 ? '+' : ''}{formatCurrency(group.totalProfit)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="glass-card overflow-hidden border-none bg-transparent pt-2">
                            <div className="overflow-x-auto hidden md:block px-1">
                              <table className="w-full text-left border-separate border-spacing-y-3">
                                <thead>
                                  <tr className="text-text-dim/50">
                                    <th className="px-6 py-2 w-10">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSelectAll(group.bets);
                                        }}
                                        className="text-text-dim hover:text-accent transition-colors"
                                      >
                                        {selectedBetIds.size === group.bets.length && group.bets.length > 0 ? (
                                          <CheckSquare className="w-4 h-4 text-accent" />
                                        ) : (
                                          <Square className="w-4 h-4" />
                                        )}
                                      </button>
                                    </th>
                                    <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em]">Detalhes da Aposta</th>
                                    <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-center">Unidades</th>
                                    <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-center">Odd</th>
                                    <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-right">Retorno Total</th>
                                    <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-right">Ações Rápidas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <AnimatePresence mode="popLayout">
                                    {group.bets.map((bet: Bet) => (
                                      <motion.tr 
                                        key={bet.id} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                         className={cn(
                                           "bg-bg/90 backdrop-blur-xl border-2 transition-all duration-500 rounded-3xl overflow-hidden group relative mb-4 hover:scale-[1.005] hover:shadow-2xl hover:shadow-indigo-500/5",
                                           bet.status === 'won' || bet.status === 'half_win' ? "border border-accent shadow-[0_0_12px_rgba(0,255,149,0.15)] bg-accent/[0.01]" : 
                                           bet.status === 'lost' || bet.status === 'half_loss' ? "border border-loss shadow-[0_0_12px_rgba(255,62,62,0.15)] bg-loss/[0.01]" : 
                                           bet.status === 'void' ? "border border-refund shadow-[0_0_12px_rgba(255,184,0,0.15)] bg-refund/[0.01]" : "border border-border/60 bg-surface/40",
                                           bet.status !== 'pending' && "border",
                                           selectedBetIds.has(bet.id) ? "ring-2 ring-accent border-accent" : ""
                                        )}
                                      >
                                        <td className="px-6 py-5 rounded-l-3xl relative overflow-hidden">
                                           {/* Designer ambient highlight */}
                                           <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/5 blur-[40px] rounded-full -translate-x-12 -translate-y-12" />
                                           <div className="relative z-10">
                                              <button 
                                                onClick={() => toggleSelectBet(bet.id)}
                                                className="text-text-dim hover:text-accent transition-colors"
                                              >
                                                {selectedBetIds.has(bet.id) ? (
                                                  <CheckSquare className="w-5 h-5 text-accent" />
                                                ) : (
                                                  <Square className="w-5 h-5 opacity-20" />
                                                )}
                                              </button>
                                           </div>
                                        </td>
                                        <td className="px-6 py-5">
                                          <div className="flex items-start gap-3">
                                            <div className={cn(
                                              "w-1 h-10 rounded-full shadow-[0_0_10px_currentColor]",
                                              (bet.status === 'won' || bet.status === 'half_win') ? "bg-accent text-accent" : 
                                              (bet.status === 'lost' || bet.status === 'half_loss') ? "bg-loss text-loss" : 
                                              bet.status === 'void' ? "bg-refund text-refund" : "bg-text-dim/20 text-transparent"
                                            )} />
                                            <div>
                                              <div className="font-black text-text-main text-sm uppercase tracking-tight flex items-center gap-2">
                                                {bet.market}
                                                <StatusBadge 
                                                  status={bet.status} 
                                                  isSyncing={bet.id === syncingBetId} 
                                                />
                                              </div>
                                              <div className="text-[10px] text-text-dim font-black uppercase mt-1 tracking-wider opacity-80 flex items-center gap-2 flex-wrap">
                                                {format(safeNewDate(bet.date), "HH:mm")} 
                                                {bet.isLive && <Zap className="w-2.5 h-2.5 text-accent fill-accent" />}
                                                • {bet.event} 
                                                {bet.league && <span className="opacity-60">• {bet.league}</span>}
                                                {bet.betId && <span className="opacity-40 text-[8px]">• {bet.betId}</span>}
                                                {(bet.bookmaker || 'Geral') && (
                                                  <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-105 shadow-xl",
                                                    getBookmakerStyle(bet.bookmaker || 'Geral').bg,
                                                    getBookmakerStyle(bet.bookmaker || 'Geral').border,
                                                    getBookmakerStyle(bet.bookmaker || 'Geral').color,
                                                    getBookmakerStyle(bet.bookmaker || 'Geral').glow
                                                  )}>
                                                    <div className={cn("w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor] bg-current")} />
                                                    {bet.bookmaker || 'Geral'}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-5 font-bold text-sm text-center">
                                          <div className="flex flex-col items-center">
                                            <span className="font-mono text-text-main">{(bet.stake / bankroll.unitSize).toFixed(2)}u</span>
                                            <span className="text-[9px] font-black text-text-dim/60 uppercase tracking-widest leading-none mt-1">
                                              {formatCurrency(bet.stake)}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-5 font-black font-mono text-sm text-accent text-center opacity-80">{bet.odds.toFixed(2)}</td>
                                        <td className="px-6 py-5 text-right">
                                          <div className={cn(
                                            "font-black text-sm font-mono",
                                            (bet.status === 'won' || bet.status === 'half_win') ? "text-accent" : 
                                            (bet.status === 'lost' || bet.status === 'half_loss') ? "text-loss" : 
                                            bet.status === 'void' ? "text-refund" : "text-text-dim"
                                          )}>
                                            {bet.status === 'pending' ? <span className="opacity-30">---</span> : formatCurrency(bet.stake + bet.profit)}
                                            {bet.status !== 'pending' && (
                                              <div className={cn(
                                                "text-[9px] font-black uppercase tracking-widest mt-0.5",
                                                (bet.status === 'won' || bet.status === 'half_win') ? "text-accent" : 
                                                (bet.status === 'lost' || bet.status === 'half_loss') ? "text-loss" : 
                                                bet.status === 'void' ? "text-refund" : "text-text-dim"
                                              )}>
                                                {(bet.profit > 0 ? '+' : '') + formatCurrency(bet.profit)}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-6 py-5 rounded-r-2xl text-right">
                                          <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                              <div className="flex items-center gap-1 bg-surface/80 p-1 rounded-lg border border-border/50 backdrop-blur-sm shadow-xl">
                                                <button 
                                                  onClick={() => updateStatus(bet.id, bet.status === 'won' ? 'pending' : 'won')}
                                                  className={cn(
                                                    "p-1.5 rounded-md transition-all hover:scale-110",
                                                    bet.status === 'won' ? "bg-accent text-bg" : "text-text-dim hover:text-accent"
                                                  )}
                                                  title="Ganha"
                                                >
                                                  <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                  onClick={() => updateStatus(bet.id, bet.status === 'half_win' ? 'pending' : 'half_win')}
                                                  className={cn(
                                                    "p-1.5 rounded-md transition-all hover:scale-110",
                                                    bet.status === 'half_win' ? "bg-accent text-bg" : "text-text-dim hover:text-accent"
                                                  )}
                                                  title="Meio Green"
                                                >
                                                  <div className="text-[9px] font-black">½G</div>
                                                </button>
                                                <button 
                                                  onClick={() => updateStatus(bet.id, bet.status === 'lost' ? 'pending' : 'lost')}
                                                  className={cn(
                                                    "p-1.5 rounded-md transition-all hover:scale-110",
                                                    bet.status === 'lost' ? "bg-loss text-white" : "text-text-dim hover:text-loss"
                                                  )}
                                                  title="Perdida"
                                                >
                                                  <XCircle className="w-4 h-4" />
                                                </button>
                                                <button 
                                                  onClick={() => updateStatus(bet.id, bet.status === 'half_loss' ? 'pending' : 'half_loss')}
                                                  className={cn(
                                                    "p-1.5 rounded-md transition-all hover:scale-110",
                                                    bet.status === 'half_loss' ? "bg-loss text-white" : "text-text-dim hover:text-loss"
                                                  )}
                                                  title="Meio Red"
                                                >
                                                  <div className="text-[9px] font-black">½R</div>
                                                </button>
                                                <button 
                                                  onClick={() => updateStatus(bet.id, bet.status === 'void' ? 'pending' : 'void')}
                                                  className={cn(
                                                    "p-1.5 rounded-md transition-all hover:scale-110",
                                                    bet.status === 'void' ? "bg-refund text-white" : "text-text-dim hover:text-refund"
                                                  )}
                                                  title="Reembolsada"
                                                >
                                                  <HelpCircle className="w-4 h-4" />
                                                </button>
                                                <button 
                                                  onClick={() => {
                                                    if (bet.status === 'cashout') {
                                                      updateStatus(bet.id, 'pending');
                                                    } else {
                                                      setCashoutBetId(bet.id);
                                                      setCashoutAmount(bet.stake.toString());
                                                    }
                                                  }}
                                                  className={cn(
                                                    "p-1.5 rounded-md transition-all hover:scale-110",
                                                    bet.status === 'cashout' ? "bg-amber-500 text-bg" : "text-text-dim hover:text-amber-500"
                                                  )}
                                                  title="Encerrar"
                                                >
                                                  <DollarSign className="w-4 h-4" />
                                                </button>
                                                <button 
                                                  onClick={() => {
                                                      setEditingBetId(bet.id);
                                                      const isCustom = bet.bookmaker !== '' && !userBookmakers.includes(bet.bookmaker);
                                                      setIsManualBookmaker(isCustom);
                                                      setBetForm({
                                                          date: format(safeNewDate(bet.date), "yyyy-MM-dd'T'HH:mm"),
                                                          sport: bet.sport,
                                                          event: bet.event,
                                                          market: bet.market,
                                                          selection: bet.selection,
                                                          odds: bet.odds.toString(),
                                                          stake: bet.stake.toString(),
                                                          status: bet.status,
                                                          cashoutValue: bet.cashoutValue?.toString() || '',
                                                          bookmaker: bet.bookmaker || 'Bet365'
                                                      });
                                                      setShowEditModal(true);
                                                  }}
                                                  className="p-1.5 text-text-dim hover:text-accent hover:bg-accent/5 rounded-md transition-all"
                                                  title="Editar"
                                                >
                                                  <Settings2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                  onClick={() => deleteBet(bet.id)}
                                                  className="p-1.5 text-text-dim hover:text-loss hover:bg-loss/5 rounded-md transition-all"
                                                  title="Mover para Lixeira"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                          </div>
                                        </td>
                                      </motion.tr>
                                    ))}
                                  </AnimatePresence>
                                </tbody>
                              </table>
                            </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-6 px-2 mt-4">
                              {group.bets.map((bet: Bet) => (
                                <motion.div 
                                  layout
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  key={bet.id}
                                  className={cn(
                                    "bg-bg/90 backdrop-blur-2xl border-2 p-6 rounded-[32px] space-y-4 shadow-2xl transition-all duration-500 active:scale-[0.99] relative overflow-hidden mb-6",
                                    (bet.status === 'won' || bet.status === 'half_win') ? "border-accent border-4 shadow-[0_0_15px_rgba(0,255,149,0.2)] bg-accent/[0.01]" : 
                                    (bet.status === 'lost' || bet.status === 'half_loss') ? "border-loss border-4 shadow-[0_0_15px_rgba(255,62,62,0.2)] bg-loss/[0.01]" : 
                                    bet.status === 'void' ? "border-refund border-4 shadow-[0_0_15px_rgba(255,184,0,0.2)] bg-refund/[0.01]" : "border-border/60 bg-surface/40",
                                    selectedBetIds.has(bet.id) && "ring-2 ring-accent border-accent"
                                  )}
                                >
                                   {/* Designer ambient highlight */}
                                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full translate-x-12 -translate-y-12" />
                                   <div className="flex justify-between items-start mb-4">
                                      <div className="flex items-center gap-3">
                                        <button onClick={() => toggleSelectBet(bet.id)} className="transition-transform active:scale-90">
                                           {selectedBetIds.has(bet.id) ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5 text-text-dim/30" />}
                                        </button>
                                        <div className="flex flex-col gap-1.5">
                                          <span className="inline-flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-text-main bg-bg px-2 py-1 rounded-lg border border-border/40 shadow-sm leading-none min-w-[50px]">
                                            {format(safeNewDate(bet.date), "HH:mm")}
                                          </span>
                                          {(bet.bookmaker || 'Geral') && (
                                            <span className={cn(
                                              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest leading-none border shadow-lg",
                                              getBookmakerStyle(bet.bookmaker || 'Geral').bg,
                                              getBookmakerStyle(bet.bookmaker || 'Geral').border,
                                              getBookmakerStyle(bet.bookmaker || 'Geral').color,
                                              getBookmakerStyle(bet.bookmaker || 'Geral').glow
                                            )}>
                                              <div className={cn("w-1.5 h-1.5 rounded-full bg-current")} />
                                              {bet.bookmaker || 'Geral'}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <StatusBadge status={bet.status} isSyncing={bet.id === syncingBetId} />
                                   </div>
                                   
                                   <div className="space-y-1">
                                     <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-accent/80">
                                          {bet.sport} • {format(safeNewDate(bet.date), "HH:mm")}
                                        </p>
                                        {bet.isLive && <Zap className="w-2.5 h-2.5 text-accent fill-accent" />}
                                     </div>
                                     <h4 className="text-base font-black uppercase text-text-main leading-tight py-1">{bet.market}</h4>
                                     <div className="space-y-1 pt-2">
                                        <p className="text-[11px] font-bold text-text-dim uppercase opacity-60 leading-tight">{bet.event}</p>
                                        {(bet.league || bet.betId) && (
                                          <div className="flex items-center gap-3">
                                            {bet.league && <span className="text-[9px] font-black text-text-dim/60 uppercase tracking-widest">Liga: {bet.league}</span>}
                                            {bet.betId && <span className="text-[8px] font-bold text-text-dim/40 uppercase tracking-tighter">Ref: {bet.betId}</span>}
                                          </div>
                                        )}
                                     </div>
                                   </div>

                                   <div className="grid grid-cols-3 gap-2 border-t border-b border-border/30 py-3">
                                      <div className="text-center">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Stake</p>
                                        <p className="text-xs font-mono font-bold leading-none">{(bet.stake / bankroll.unitSize).toFixed(1)}u</p>
                                        <p className="text-[8px] font-bold text-text-dim mt-1">{formatCurrency(bet.stake)}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Odd</p>
                                        <p className="text-xs font-mono font-bold text-accent">{bet.odds.toFixed(2)}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Retorno</p>
                                        <p className="text-xs font-mono font-bold text-text-main leading-none">
                                          {bet.status === 'pending' ? '-' : formatCurrency(bet.stake + bet.profit)}
                                        </p>
                                        {bet.status !== 'pending' && bet.profit !== 0 && (
                                          <p className={cn(
                                            "text-[8px] font-bold mt-1",
                                            bet.profit > 0 ? "text-accent" : "text-loss"
                                          )}>
                                            {bet.profit > 0 ? '+' : ''}{formatCurrency(bet.profit)}
                                          </p>
                                        )}
                                      </div>
                                   </div>

                                   <div className="flex items-center gap-1 justify-between">
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => {
                                            if (bet.status === 'cashout') {
                                              updateStatus(bet.id, 'pending');
                                            } else {
                                              setCashoutBetId(bet.id);
                                              setCashoutAmount(bet.stake.toString());
                                            }
                                          }}
                                          className={cn(
                                            "p-2 rounded-lg border border-border bg-surface text-amber-500 transition-all",
                                            bet.status === 'cashout' && "bg-amber-500/10 border-amber-500/20"
                                          )}
                                        >
                                          <DollarSign className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => updateStatus(bet.id, bet.status === 'won' ? 'pending' : 'won')} className="p-2 bg-accent/5 text-accent rounded-lg border border-accent/10"><CheckCircle2 className="w-4 h-4" /></button>
                                        <button onClick={() => updateStatus(bet.id, bet.status === 'lost' ? 'pending' : 'lost')} className="p-2 bg-loss/5 text-loss rounded-lg border border-loss/10"><XCircle className="w-4 h-4" /></button>
                                      </div>
                                      <div className="flex items-center gap-1">
                                         <button onClick={() => {
                                            setEditingBetId(bet.id);
                                            const isCustom = bet.bookmaker !== '' && !userBookmakers.includes(bet.bookmaker);
                                            setIsManualBookmaker(isCustom);
                                            setBetForm({
                                                date: format(safeNewDate(bet.date), "yyyy-MM-dd'T'HH:mm"),
                                                sport: bet.sport,
                                                event: bet.event,
                                                market: bet.market,
                                                selection: bet.selection,
                                                odds: bet.odds.toString(),
                                                stake: bet.stake.toString(),
                                                status: bet.status,
                                                cashoutValue: bet.cashoutValue?.toString() || '',
                                                bookmaker: bet.bookmaker || 'Bet365'
                                            });
                                            setShowEditModal(true);
                                        }} className="p-2 bg-surface rounded-lg border border-border"><Settings2 className="w-4 h-4" /></button>
                                        <button onClick={() => deleteBet(bet.id)} className="p-2 bg-loss/5 text-loss rounded-lg border border-loss/10"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                   </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {groupedHistory.length === 0 && (
                  <div className="glass-card py-20 text-center text-zinc-500 border border-dashed border-border/50">
                    <div className="flex flex-col items-center gap-2">
                        <History className="w-12 h-12 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Nenhuma aposta encontrada com estes filtros.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'transfers' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* As casas de aposta representam partes da banca total. O remanescente fica na gestão central (oculta para simplificar) */}
                  
                  {userBookmakers.map((bm) => {
                    const balance = bookmakerBalances.find(([b]) => b === bm)?.[1] || 0;
                    return (
                      <div key={bm} className="glass-card p-6 border-border bg-surface relative overflow-hidden group">
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                               <div className={cn(
                                 "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                                 balance > 0 ? "bg-accent/10 border-accent/20 text-accent" : "bg-bg border-border text-text-dim"
                               )}>
                                  {getBookmakerLogo(bm)}
                               </div>
                               <div>
                                  <h4 className="text-sm font-black uppercase text-text-main">{bm}</h4>
                                  <p className="text-[9px] font-bold text-text-dim uppercase opacity-60">Saldo em Conta</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => removeBookmaker(bm)}
                              className="p-2 text-text-dim hover:text-loss transition-colors opacity-0 group-hover:opacity-100"
                              title="Remover das favoritas"
                            >
                              <X className="w-3 h-3" />
                            </button>
                         </div>
                         <div className="space-y-1">
                            <p className="text-2xl font-black tabular-nums text-text-main">
                               {formatCurrency(balance)}
                            </p>
                         </div>
                         <div className="mt-4 pt-4 border-t border-border/50">
                            <button 
                              onClick={() => {
                                setAdjustingBookmaker(bm);
                                setAdjustmentValue(balance.toFixed(2));
                              }}
                              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent hover:brightness-110 transition-all"
                            >
                              <Settings2 className="w-3 h-3" />
                              Sincronizar Saldo
                            </button>
                         </div>
                      </div>
                    );
                 })}

                 {/* Add New House Button/Card */}
                 <div className="glass-card border-dashed border-2 border-border/40 hover:border-accent/40 bg-surface/20 flex flex-col items-center justify-center p-6 gap-3 group transition-all">
                    {isAddingNewBookmaker ? (
                      <div className="w-full space-y-3">
                         <input 
                           type="text" 
                           placeholder="Nome da Casa..."
                           value={newBookmakerName}
                           onChange={(e) => setNewBookmakerName(e.target.value)}
                           className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase outline-none focus:border-accent"
                           autoFocus
                           onKeyDown={(e) => e.key === 'Enter' && addBookmaker()}
                         />
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setIsAddingNewBookmaker(false)} className="py-2 text-[9px] font-black uppercase tracking-widest text-text-dim">Voltar</button>
                            <button onClick={addBookmaker} className="py-2 bg-accent text-bg rounded-lg text-[9px] font-black uppercase tracking-widest">Salvar</button>
                         </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsAddingNewBookmaker(true)}
                        className="flex flex-col items-center gap-1 text-text-dim group-hover:text-accent transition-all"
                      >
                         <Plus className="w-8 h-8 opacity-20 group-hover:opacity-80 transition-all" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em]">Adicionar Casa</span>
                      </button>
                    )}
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="glass-card p-6 border-border bg-surface/50 backdrop-blur-md">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-accent mb-6 flex items-center justify-between">
                       <span className="flex items-center gap-2">
                         <ArrowRightLeft className="w-4 h-4" />
                         {editingTransactionId ? 'Editar Movimentação' : 'Nova Movimentação'}
                       </span>
                       {editingTransactionId && (
                         <button 
                           onClick={() => {
                             setEditingTransactionId(null);
                             setTransactionForm({
                               amount: '',
                               date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                               type: 'withdrawal',
                               fromBookmaker: userBookmakers[0] || '',
                               toBookmaker: userBookmakers[1] || userBookmakers[0] || '',
                               notes: ''
                             });
                           }}
                           className="text-loss hover:underline"
                         >
                           Cancelar
                         </button>
                       )}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Tipo de Operação</label>
                        <div className="grid grid-cols-3 gap-2">
                           {['withdrawal', 'deposit', 'transfer'].map((type) => (
                             <button
                               key={type}
                               onClick={() => setTransactionForm({ ...transactionForm, type: type as any })}
                               className={cn(
                                 "py-2 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border",
                                 transactionForm.type === type 
                                    ? "bg-accent/10 border-accent text-accent" 
                                    : "bg-surface border-border text-text-dim hover:border-text-dim/40"
                               )}
                             >
                               {type === 'withdrawal' ? 'Saque' : type === 'deposit' ? 'Aporte' : 'Transfer.'}
                             </button>
                           ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <InputGroup 
                           label="Valor (R$)" 
                           type="number" 
                           value={transactionForm.amount} 
                           onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})} 
                         />
                         <InputGroup 
                           label="Data" 
                           type="datetime-local" 
                           value={transactionForm.date} 
                           onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})} 
                         />
                      </div>

                      {transactionForm.type === 'transfer' ? (
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Origem</label>
                             <select 
                               value={transactionForm.type === 'deposit' ? transactionForm.toBookmaker : transactionForm.fromBookmaker}
                              onChange={(e) => {
                                if (transactionForm.type === 'deposit') {
                                  setTransactionForm({...transactionForm, toBookmaker: e.target.value});
                                } else {
                                  setTransactionForm({...transactionForm, fromBookmaker: e.target.value});
                                }
                              }}
                              className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                            >
                              {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                             </select>
                           </div>
                           <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Destino</label>
                             <select 
                               value={transactionForm.toBookmaker}
                               onChange={(e) => setTransactionForm({...transactionForm, toBookmaker: e.target.value})}
                               className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                             >
                               {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                             </select>
                           </div>
                        </div>
                      ) : (
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Casa de Aposta</label>
                           <select 
                             value={transactionForm.type === 'deposit' ? transactionForm.toBookmaker : transactionForm.fromBookmaker}
                              onChange={(e) => {
                                if (transactionForm.type === 'deposit') {
                                  setTransactionForm({...transactionForm, toBookmaker: e.target.value});
                                } else {
                                  setTransactionForm({...transactionForm, fromBookmaker: e.target.value});
                                }
                              }}
                              className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                            >
                              {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                           </select>
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Notas / Observações</label>
                        <textarea 
                          value={transactionForm.notes}
                          onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                          placeholder="Ex: Saque para conta pessoal..."
                          className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold text-text-main focus:border-accent outline-none min-h-[80px]"
                        />
                      </div>

                      <button 
                        onClick={() => {
                           if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
                             showToast("Informe um valor válido", "info");
                             return;
                           }
                           addTransaction({
                             amount: parseFloat(transactionForm.amount),
                             date: transactionForm.date,
                             type: transactionForm.type,
                             fromBookmaker: transactionForm.type === 'deposit' ? undefined : transactionForm.fromBookmaker,
                             toBookmaker: transactionForm.type === 'withdrawal' ? undefined : transactionForm.toBookmaker,
                             notes: transactionForm.notes
                           });
                           setTransactionForm({
                             amount: '',
                             date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                             type: 'withdrawal',
                             fromBookmaker: userBookmakers[0] || '',
                             toBookmaker: userBookmakers[1] || userBookmakers[0] || '',
                             notes: ''
                           });
                        }}
                        className="w-full bg-accent text-bg py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                      >
                        {editingTransactionId ? 'Salvar Alterações' : 'Registrar Movimentação'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* List Column */}
                <div className="lg:col-span-2 space-y-6">
                   <div className="glass-card border-border bg-surface/30 overflow-hidden">
                      <div className="p-6 border-b border-border/50 flex items-center justify-between">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-text-dim">Histórico de Transações</h3>
                         <span className="text-[9px] font-black uppercase tracking-widest text-text-dim/60 bg-bg px-2 py-1 rounded-md">{historyTransactions.length} registros</span>
                      </div>
                      
                      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                         {groupedTransactions.map(([date, group]) => (
                           <div key={date} className="border-b border-border/30 last:border-0">
                             <button 
                               onClick={() => toggleTransactionGroup(date)}
                               className="w-full flex items-center justify-between px-6 py-4 bg-bg/20 hover:bg-bg/40 transition-colors group"
                             >
                                <div className="flex items-center gap-3">
                                   <div className={cn(
                                     "w-6 h-6 rounded-md border border-border/50 flex items-center justify-center transition-transform duration-300",
                                     expandedTransactionGroups.has(date) ? "rotate-0" : "-rotate-90"
                                   )}>
                                      <ChevronDown className="w-3.5 h-3.5 text-text-dim" />
                                   </div>
                                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                                      {isToday(safeNewDate(date + 'T00:00:00')) ? 'Hoje' : 
                                       isYesterday(safeNewDate(date + 'T00:00:00')) ? 'Ontem' : 
                                       format(safeNewDate(date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                                   </span>
                                </div>
                                <span className="text-[9px] font-black text-text-dim/40 uppercase tracking-widest">{group.length} transações</span>
                             </button>

                             <AnimatePresence>
                               {expandedTransactionGroups.has(date) && (
                                 <motion.div 
                                   initial={{ height: 0, opacity: 0 }}
                                   animate={{ height: 'auto', opacity: 1 }}
                                   exit={{ height: 0, opacity: 0 }}
                                   className="overflow-hidden"
                                 >
                                   <div className="divide-y divide-border/20">
                                     {group.map((t: Transaction) => (
                                       <div key={t.id} className="p-6 hover:bg-white/[0.02] transition-all group/item">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-start gap-4">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                                      t.type === 'withdrawal' ? "bg-loss/10 border-loss/30 text-loss shadow-[0_0_15px_rgba(239,68,68,0.1)]" : 
                                      t.type === 'deposit' ? "bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_rgba(34,197,94,0.1)]" : 
                                      "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                                    )}>
                                       {t.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> : 
                                        t.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : 
                                        <ArrowRightLeft className="w-5 h-5" />}
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-3 mb-1">
                                          <span className="text-sm font-black text-text-main tabular-nums">{formatCurrency(t.amount)}</span>
                                          <span className={cn(
                                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                            t.type === 'withdrawal' ? "bg-loss/10 border-loss/20 text-loss" : 
                                            t.type === 'deposit' ? "bg-accent/10 border-accent/20 text-accent" : 
                                            "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                          )}>
                                            {t.type === 'withdrawal' ? 'Saque' : t.type === 'deposit' ? 'Aporte' : 'Transferência'}
                                          </span>
                                       </div>
                                       <div className="text-[10px] text-text-dim font-bold uppercase tracking-tight flex items-center gap-2">
                                          {format(safeNewDate(t.date), "dd/MM/yyyy HH:mm")}
                                          {t.type === 'transfer' ? (
                                            <>
                                              <span className="opacity-40">•</span>
                                              <span className="text-text-main">{t.fromBookmaker}</span>
                                              <ArrowRightLeft className="w-2.5 h-2.5 opacity-40" />
                                              <span className="text-text-main">{t.toBookmaker}</span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="opacity-40">•</span>
                                              <span className="text-text-main">{t.fromBookmaker || t.toBookmaker || 'Conta'}</span>
                                            </>
                                          )}
                                       </div>
                                       {t.notes && (
                                         <p className="mt-2 text-[10px] text-text-dim/80 italic leading-relaxed max-w-md">{t.notes}</p>
                                       )}
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-1">
                                   <button 
                                     onClick={() => {
                                       setEditingTransactionId(t.id);
                                       setTransactionForm({
                                         amount: t.amount.toString(),
                                         date: format(safeNewDate(t.date), "yyyy-MM-dd'T'HH:mm"),
                                         type: t.type,
                                         fromBookmaker: t.fromBookmaker || 'Bet365',
                                         toBookmaker: t.toBookmaker || 'Betano',
                                         notes: t.notes || ''
                                       });
                                       setShowTransactionEditModal(true);
                                     }}
                                     className="p-2 text-text-dim hover:text-accent opacity-0 group-hover/item:opacity-100 transition-all hover:bg-accent/5 rounded-lg"
                                   >
                                      <Pencil className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={() => deleteTransaction(t.id)}
                                     className="p-2 text-text-dim hover:text-loss opacity-0 group-hover/item:opacity-100 transition-all hover:bg-loss/5 rounded-lg"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                              </div>
                           </div>
                         ))}
                                   </div>
                                 </motion.div>
                               )}
                             </AnimatePresence>
                           </div>
                         ))}

                         {historyTransactions.length === 0 && (
                           <div className="py-20 text-center space-y-3 opacity-30">
                              <ArrowRightLeft className="w-12 h-12 mx-auto" />
                              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'trash' && (
            <div className="space-y-6">
               <div className="space-y-8">
                {groupedHistory.map(([date, group]: [string, any]) => (
                  <div key={date} className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                      <div className="h-[1px] flex-1 bg-border" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                        {isToday(safeNewDate(date + 'T00:00:00')) ? 'Hoje' : 
                         isYesterday(safeNewDate(date + 'T00:00:00')) ? 'Ontem' : 
                         format(safeNewDate(date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      <div className="h-[1px] flex-1 bg-border" />
                    </div>

                    <div className="space-y-6">
                      {/* Section: Bets */}
                      {group.bets.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 px-4">
                            <History className="w-3 h-3 text-accent" />
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-text-dim">Apostas Excluídas</h4>
                          </div>
                          <div className="glass-card overflow-hidden border border-border">
                              <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <tbody className="divide-y divide-border/50">
                                  {group.bets.map((bet: Bet) => (
                                    <tr key={bet.id} className="hover:bg-zinc-800/10 transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="font-bold text-text-main text-sm uppercase">{bet.selection}</div>
                                        <div className="text-[10px] text-text-dim font-bold uppercase mt-0.5">{bet.event}</div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button 
                                            onClick={() => restoreBet(bet.id)}
                                            className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors"
                                            title="Restaurar"
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => setBetToDelete(bet.id)}
                                            className="p-2 hover:bg-loss/10 text-loss rounded-lg transition-colors"
                                            title="Excluir Permanentemente"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section: Transactions */}
                      {group.transactions.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 px-4">
                            <ArrowRightLeft className="w-3 h-3 text-accent" />
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-text-dim">Transações Excluídas</h4>
                          </div>
                          <div className="glass-card overflow-hidden border border-border">
                              <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <tbody className="divide-y divide-border/50">
                                  {group.transactions.map((t: Transaction) => (
                                    <tr key={t.id} className="hover:bg-zinc-800/10 transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="font-bold text-text-main text-sm uppercase flex items-center gap-2">
                                          {t.type === 'withdrawal' ? 'Saque' : t.type === 'deposit' ? 'Aporte' : t.type === 'transfer' ? 'Transferência' : 'Ajuste'}
                                          <span className="text-[10px] opacity-60 tabular-nums">({formatCurrency(t.amount)})</span>
                                        </div>
                                        <div className="text-[10px] text-text-dim font-bold uppercase mt-0.5">
                                           {t.fromBookmaker || t.toBookmaker || 'Conta'}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button 
                                            onClick={() => restoreTransaction(t.id)}
                                            className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors"
                                            title="Restaurar"
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => permanentlyDeleteTransaction(t.id)}
                                            className="p-2 hover:bg-loss/10 text-loss rounded-lg transition-colors"
                                            title="Excluir Permanentemente"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {groupedHistory.length === 0 && (
                  <div className="glass-card py-20 text-center text-zinc-500 border border-dashed border-border/50">
                    <div className="flex flex-col items-center gap-2">
                        <History className="w-12 h-12 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Lixeira vazia.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-8 pb-20">
                {/* Mobile Quick Links */}
                <div className="lg:hidden grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => setActiveTab('insights')}
                     className="flex flex-col items-center justify-center gap-2 p-6 bg-accent/10 border border-accent/20 rounded-2xl transition-all active:scale-95"
                   >
                     <Sparkles className="w-8 h-8 text-accent" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-accent">Insights IA</span>
                   </button>
                   <button 
                     onClick={() => setActiveTab('trash')}
                     className="flex flex-col items-center justify-center gap-2 p-6 bg-loss/10 border border-loss/20 rounded-2xl transition-all active:scale-95"
                   >
                     <Trash2 className="w-8 h-8 text-loss" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-loss">Lixeira</span>
                   </button>
                </div>

                <div className="glass-card p-6 border-accent/20 bg-accent/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black uppercase tracking-tighter">Gerenciar Bancas</h3>
                        <button 
                            onClick={() => setIsAddingBankroll(true)}
                            className="bg-accent text-bg px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" />
                            Nova Banca
                        </button>
                    </div>

                    <div className="space-y-3">
                        <DndContext 
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEndBankrolls}
                        >
                          <SortableContext 
                            items={bankrolls.map(b => b.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {bankrolls.map(b => (
                              <SortableBankrollItem 
                                key={b.id} 
                                b={b} 
                                activeBankrollId={activeBankrollId}
                                setActiveBankrollId={setActiveBankrollId}
                                deleteBankroll={deleteBankroll}
                                showToast={showToast}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                    </div>
                </div>

                <div className="glass-card p-6 border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.05)]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-black uppercase tracking-tighter">Configuração da Banca</h3>
                      <button 
                        onClick={saveLocalSettings}
                        className="bg-accent text-bg px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Salvar Alterações
                      </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Nome da Banca</label>
                            <input 
                                type="text"
                                value={bankroll.name}
                                onChange={(e) => saveBankroll({ ...bankroll, name: e.target.value })}
                                className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                                placeholder="Altere o nome da sua banca..."
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Banca Inicial</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="decimal"
                                    value={localTotal}
                                    onChange={(e) => setLocalTotal(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                                />
                            </div>
                            <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mt-2">O valor depositado inicialmente para começar a operar.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Valor da Unidade (Staking)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="decimal"
                                    value={localUnit}
                                    onChange={(e) => setLocalUnit(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                                />
                            </div>
                            <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mt-2">Recomendado entre 1% a 3% da banca total.</p>
                        </div>

                        <div className="pt-4 grid grid-cols-2 gap-4">
                            <div className="bg-surface p-4 rounded-lg border border-border border-dashed">
                                <p className="text-[10px] uppercase font-black text-text-dim mb-1 tracking-widest">Total de Unidades</p>
                                <p className="text-2xl font-black text-accent">{(bankroll.total / bankroll.unitSize).toFixed(0)}u</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg border border-border border-dashed">
                                <p className="text-[10px] uppercase font-black text-text-dim mb-1 tracking-widest">% por Unidade</p>
                                <p className="text-2xl font-black text-accent">{((bankroll.unitSize / bankroll.total) * 100).toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-accent/20 bg-accent/5">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/20 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter">Relatório de Integridade</h3>
                                <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Estado atual da sua base de dados</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-bg/40 rounded-xl border border-border">
                            <span className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-1">Apostas Totais</span>
                            <span className="text-xl font-black text-text-main">{auditReport.total}</span>
                        </div>
                        <div className={cn("p-4 rounded-xl border", auditReport.duplicates > 0 ? "bg-loss/10 border-loss/20" : "bg-bg/40 border-border")}>
                            <span className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-1">Duplicadas</span>
                            <span className={cn("text-xl font-black", auditReport.duplicates > 0 ? "text-loss" : "text-text-main")}>{auditReport.duplicates}</span>
                        </div>
                        <div className={cn("p-4 rounded-xl border", auditReport.orphans > 0 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-bg/40 border-border")}>
                            <span className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-1">Sem Banca</span>
                            <span className={cn("text-xl font-black", auditReport.orphans > 0 ? "text-yellow-500" : "text-text-main")}>{auditReport.orphans}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-red-500/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <RotateCcw className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tighter">Centro de Resgate</h3>
                            <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Corrija problemas com apostas 'perdidas' ou órfãs</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-bg/50 border border-border rounded-xl">
                            <h4 className="text-xs font-black uppercase tracking-widest mb-2">Resgatar Apostas Órfãs</h4>
                            <p className="text-[9px] text-text-dim mb-4 leading-relaxed font-bold uppercase tracking-wider">Busca apostas que pertenciam a bancas excluídas e as move para a banca atual ('{bankroll.name}').</p>
                            <button 
                                onClick={fixOrphanedBets}
                                className="w-full py-3 bg-surface border border-border hover:border-accent hover:text-accent transition-all rounded-lg text-[10px] font-black uppercase tracking-widest"
                            >
                                Procurar Órfãs ({auditReport.orphans})
                            </button>
                        </div>
                        
                        <div className="p-4 bg-bg/50 border border-border rounded-xl">
                            <h4 className="text-xs font-black uppercase tracking-widest mb-2">Remover Duplicatas</h4>
                            <p className="text-[9px] text-text-dim mb-4 leading-relaxed font-bold uppercase tracking-wider">Identifica entradas idênticas (mesmo evento, odd e hora) e remove as cópias indesejadas.</p>
                            <button 
                                onClick={removeDuplicates}
                                className="w-full py-3 bg-surface border border-border hover:border-accent hover:text-accent transition-all rounded-lg text-[10px] font-black uppercase tracking-widest"
                            >
                                Limpar Duplicatas ({auditReport.duplicates})
                            </button>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black uppercase tracking-tighter">Sugestões de Stake</h3>
                        <button 
                            onClick={() => setShowAllPercentages(!showAllPercentages)}
                            className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/5 px-3 py-1.5 rounded border border-accent/20 hover:bg-accent/10"
                        >
                            {showAllPercentages ? 'Ver Menos' : 'Ver Mais Opções'}
                        </button>
                    </div>
                    <p className="text-text-dim text-xs mb-6 font-bold uppercase tracking-widest">Baseado em {formatCurrency(bankroll.total)}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(showAllPercentages 
                          ? [5, 3, 2, 1.5, 1.25, 1, 0.75, 0.5, 0.35, 0.25, 0.2, 0.15, 0.1, 0.05]
                          : [2, 1.5, 1, 0.5, 0.25, 0.15, 0.1, 0.05]
                        ).map((pct) => {
                            const value = bankroll.total * (pct / 100);
                            return (
                                <motion.div 
                                    key={pct} 
                                    whileTap={{ scale: 0.98 }}
                                    className="flex flex-col p-4 bg-surface/50 border border-border rounded-xl group hover:border-accent transition-all relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 blur-2xl rounded-full translate-x-8 -translate-y-8" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-dim mb-1">{pct}%</span>
                                    <span className="text-sm font-black font-mono text-accent mb-3">{formatCurrency(value)}</span>
                                    <button 
                                        onClick={() => saveBankroll({ ...bankroll, unitSize: value })}
                                        className="w-full py-2 bg-surface text-[9px] font-black uppercase tracking-widest text-text-main rounded border border-border hover:border-accent hover:text-accent transition-all relative z-10"
                                    >
                                        Salvar como Unidade
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                <motion.div 
                    whileTap={{ scale: 0.99 }}
                    className="glass-card p-6 border-accent/20 bg-accent/5 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[60px] rounded-full translate-x-12 -translate-y-12" />
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-accent relative z-10">Sincronizar Saldo Real</h3>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mb-6 relative z-10">
                        Use esta opção para ajustar sua banca de forma que o "Saldo Atual" do app fique idêntico ao saldo disponível na sua casa de apostas agora.
                    </p>
                    
                    <div className="space-y-4 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Seu Saldo Disponível Hoje (já sem as abertas)</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim font-bold text-sm leading-none">R$</span>
                                    <input 
                                        type="text" 
                                        inputMode="decimal"
                                        placeholder="Ex: 494.27"
                                        value={localActualBalance}
                                        onChange={(e) => setLocalActualBalance(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-black text-lg transition-colors"
                                    />
                                </div>
                                <button 
                                    onClick={syncBalanceAction}
                                    className="bg-accent text-bg px-6 rounded-lg font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all shadow-lg shadow-accent/20"
                                >
                                    Sincronizar
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="glass-card p-6 border-accent/20 bg-accent/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-accent/20 rounded-lg">
                            <Share className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Instalar no iPhone (iOS)</h3>
                            <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider opacity-60">Adicione à tela de início</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                           <div className="flex items-center gap-3 text-[11px] font-bold text-text-main opacity-80">
                              <span className="w-5 h-5 flex items-center justify-center bg-accent/20 rounded-full text-[10px] text-accent">1</span>
                              <span>Abra este Link no <span className="text-accent underline font-black tracking-tight">SAFARI</span></span>
                           </div>
                           <div className="flex items-center gap-3 text-[11px] font-bold text-text-main opacity-80">
                              <span className="w-5 h-5 flex items-center justify-center bg-accent/20 rounded-full text-[10px] text-accent">2</span>
                              <span>Toque no botão de <span className="text-accent font-black tracking-tight">COMPARTILHAR</span> (ícone central)</span>
                           </div>
                           <div className="flex items-center gap-3 text-[11px] font-bold text-text-main opacity-80">
                              <span className="w-5 h-5 flex items-center justify-center bg-accent/20 rounded-full text-[10px] text-accent">3</span>
                              <span>Selecione <span className="text-accent font-black tracking-tight">ADICIONAR À TELA DE INÍCIO</span></span>
                           </div>
                        </div>

                        <div className="p-3 bg-surface rounded-lg border border-border">
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-dim mb-2">Link de Instalação:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-[10px] font-mono truncate text-text-main">{window.location.origin}</code>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.origin);
                                        showToast("Link copiado!", "info");
                                    }}
                                    className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded transition-colors"
                                >
                                    <Copy className="w-3.5 h-3.5 text-accent" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-accent/20">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-accent">Inteligência Artificial (Gemini)</h3>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mb-6">O scanner de imagens e análise de apostas utiliza a tecnologia Google Gemini.</p>
                    
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={async () => {
                                try {
                                    await openApiKeySelector();
                                    showToast('AI Ativada com Sucesso', 'success');
                                } catch (e) {
                                    showToast('Erro ao abrir seletor', 'info');
                                }
                            }}
                            className="flex items-center justify-center gap-3 w-full py-4 bg-accent text-bg font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
                        >
                            <Sparkles className="w-5 h-5" />
                            Ativar / Atualizar AI
                        </button>
                        
                        <div className="p-4 bg-surface/50 border border-border rounded-lg space-y-4">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-3">Modo de Emergência (Entrada Manual)</h4>
                                <p className="text-[9px] text-text-dim font-bold uppercase tracking-tight mb-3">Se o botão acima não funcionar no seu celular, cole sua chave aqui:</p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="password" 
                                            placeholder="Cole sua Gemini API Key aqui..."
                                            value={manualAiKey}
                                            onChange={(e) => setManualAiKey(e.target.value)}
                                            className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-text-main font-mono text-xs transition-colors pr-10"
                                        />
                                        {manualAiKey && manualAiKey.length > 20 && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={async () => {
                                                if (manualAiKey.trim().length > 20) {
                                                    const key = manualAiKey.trim();
                                                    localStorage.setItem('STAKEWISE_CUSTOM_GEMINI_KEY', key);
                                                    
                                                    // Save to Cloud
                                                    if (user) {
                                                        try {
                                                            await setDoc(doc(db, 'users', user.uid), {
                                                                geminiKey: key,
                                                                updatedAt: serverTimestamp()
                                                            }, { merge: true });
                                                            showToast('Configuração Salva na Nuvem!', 'success');
                                                        } catch (e) {
                                                            console.error("Erro ao salvar na nuvem:", e);
                                                            showToast('Salvo Localmente (Erro na Nuvem)', 'info');
                                                        }
                                                    } else {
                                                        showToast('Configuração Salva Localmente!', 'success');
                                                    }
                                                } else {
                                                    showToast('Chave inválida ou muito curta', 'info');
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial px-6 py-3 bg-surface border border-border text-accent rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent/10 transition-colors"
                                        >
                                            Salvar
                                        </button>
                                        {manualAiKey && (
                                            <button 
                                                onClick={async () => {
                                                    if (confirm('Deseja remover a chave salva permanentemente?')) {
                                                        localStorage.removeItem('STAKEWISE_CUSTOM_GEMINI_KEY');
                                                        setManualAiKey('');
                                                        
                                                        if (user) {
                                                            try {
                                                                await setDoc(doc(db, 'users', user.uid), {
                                                                    geminiKey: deleteField(),
                                                                    updatedAt: serverTimestamp()
                                                                }, { merge: true });
                                                            } catch (e) {
                                                                console.error("Erro ao deletar da nuvem:", e);
                                                            }
                                                        }
                                                        showToast('Chave removida', 'info');
                                                    }
                                                }}
                                                className="px-4 bg-bg border border-border rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Limpar Chave"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="text-[9px] text-text-dim font-bold uppercase tracking-tight leading-relaxed">
                                <span className="text-accent underline">Sobre Limites:</span> O Gemini possui um limite de requisições por minuto na versão gratuita (aproximadamente 15 por minuto). Se o scanner parar de responder rapidamente, aguarde 1 minuto.
                            </p>
                        </div>

                        <button 
                            onClick={() => {
                                if (confirm('Isso irá limpar o cache do app e reiniciar. Seus dados do Firebase continuam salvos. Continuar?')) {
                                    localStorage.clear();
                                    window.location.href = window.location.origin + '/?v=' + Date.now();
                                }
                            }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Limpar App e Forçar Atualização
                        </button>
                    </div>
                </div>

                <div className="p-8 bg-surface border border-border rounded-xl">
                    <h3 className="text-xs font-black uppercase tracking-widest mb-3 text-accent transition-colors">Dica de Gestão</h3>
                    <p className="text-sm text-text-dim font-bold leading-relaxed uppercase tracking-tight">
                        Manter uma unidade fixa ajuda a evitar perdas emocionais. Tente nunca apostar mais do que sua unidade padrão a menos que tenha uma estratégia de confiança validada.
                    </p>
                </div>

                <div className="pt-8 pb-12 flex flex-col items-center gap-2 opacity-30 select-none">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">StakeWise App</p>
                    <div className="flex items-center gap-2">
                        <span className="h-[1px] w-4 bg-primary/20"></span>
                        <p className="text-[9px] font-bold font-mono text-primary">v1.5.0 (AI & Cloud Update)</p>
                        <span className="h-[1px] w-4 bg-primary/20"></span>
                    </div>
                    <a href="/privacy.html" target="_blank" className="text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-accent mt-2 transition-colors">
                        Política de Privacidade
                    </a>
                </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-1 left-4 right-4 h-16 bg-bg/90 backdrop-blur-2xl border border-white/5 rounded-2xl flex items-center justify-between px-2 z-[100] shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
            activeTab === 'dashboard' ? "text-accent scale-110" : "text-text-dim"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-tight">Dash</span>
        </button>
        <button 
          onClick={() => { setActiveTab('register'); setIsMobileMenuOpen(false); }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
            activeTab === 'register' ? "text-accent scale-110" : "text-text-dim"
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-tight">Novo</span>
        </button>
        <button 
          onClick={() => { setActiveTab('bets'); setIsMobileMenuOpen(false); }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
            activeTab === 'bets' ? "text-accent scale-110" : "text-text-dim"
          )}
        >
          <History className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-tight">Hist</span>
        </button>
        <button 
          onClick={() => { setActiveTab('transfers'); setIsMobileMenuOpen(false); }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
            activeTab === 'transfers' ? "text-accent scale-110" : "text-text-dim"
          )}
        >
          <ArrowRightLeft className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-tight">Transfs</span>
        </button>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 transition-all border-none bg-transparent outline-none py-1",
            isMobileMenuOpen ? "text-accent scale-110" : "text-text-dim"
          )}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase tracking-tight">Mais</span>
        </button>
      </nav>

      {/* Mobile Drawer (Gaveta) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[90] lg:hidden"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border rounded-t-[32px] p-8 z-[95] lg:hidden shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-8" />
              <div className="grid grid-cols-3 gap-6">
                <button 
                  onClick={() => { setActiveTab('insights'); setIsMobileMenuOpen(false); }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/50 border border-border"
                >
                  <Sparkles className="w-6 h-6 text-accent" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-main">IA Insights</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('trash'); setIsMobileMenuOpen(false); }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/50 border border-border"
                >
                  <Trash2 className="w-6 h-6 text-loss" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-main">Lixeira</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/50 border border-border"
                >
                  <Settings2 className="w-6 h-6 text-indigo-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-main">Ajustes</span>
                </button>
              </div>
              <div className="mt-8 pt-8 border-t border-border/50 text-center">
                 <p className="text-[8px] font-black uppercase tracking-[0.3em] text-text-dim opacity-30">StakeWise App v1.5.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {isAddingBankroll && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-bg border border-border rounded-2xl shadow-2xl p-8 w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Nova Banca</h3>
                <button onClick={() => setIsAddingBankroll(false)} className="text-text-dim hover:text-text-main">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Nome da Banca</label>
                  <input 
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent text-text-main font-bold"
                    placeholder="Ex: Banca Tênis, Gestão 2..."
                    value={newBankrollName}
                    onChange={(e) => setNewBankrollName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Banca Inicial (R$)</label>
                        <input 
                            type="number"
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent font-bold"
                            value={newBankrollTotal}
                            onChange={(e) => setNewBankrollTotal(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Vlr. Unidade (R$)</label>
                        <input 
                            type="number"
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent font-bold"
                            value={newBankrollUnit}
                            onChange={(e) => setNewBankrollUnit(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                    <button 
                        onClick={() => setIsAddingBankroll(false)}
                        className="flex-1 py-4 border border-border text-text-dim rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-surface transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => {
                            if (!newBankrollName.trim()) {
                                alert("Dê um nome para a banca");
                                return;
                            }
                            addBankroll(
                                newBankrollName, 
                                parseFloat(newBankrollTotal) || 1000, 
                                parseFloat(newBankrollUnit) || 20
                            );
                            setIsAddingBankroll(false);
                            setNewBankrollName('');
                        }}
                        className="flex-1 py-4 bg-accent text-bg rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 shadow-lg shadow-accent/20 transition-all"
                    >
                        Criar Banca
                    </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {betToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-bg/90 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-bg border border-border rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 bg-loss/10 text-loss rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Excluir Permanentes?</h3>
              <p className="text-text-dim text-[10px] font-black uppercase tracking-widest mb-8 opacity-60">
                Esta ação não pode ser desfeita. A aposta será removida para sempre.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => permanentlyDeleteBet(betToDelete)}
                  className="w-full py-4 bg-loss text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all"
                >
                  Confirmar Exclusão
                </button>
                <button 
                  onClick={() => setBetToDelete(null)}
                  className="w-full py-4 bg-surface border border-border text-text-main rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {cashoutBetId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-bg border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black uppercase tracking-tighter">Encerrar Aposta</h3>
                <button onClick={() => setCashoutBetId(null)} className="text-text-dim hover:text-text-main">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">
                    Valor Recebido (R$)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    autoFocus
                    value={cashoutAmount}
                    onChange={(e) => setCashoutAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat(cashoutAmount.replace(',', '.'));
                        updateStatus(cashoutBetId, 'cashout', val || 0);
                        setCashoutBetId(null);
                      }
                    }}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-accent text-lg font-bold text-text-main"
                    placeholder="0.00"
                  />
                </div>
                
                <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest leading-relaxed">
                  Informe o valor que você recebeu ao encerrar a aposta antes do final do evento.
                </p>
                
                <button 
                  onClick={() => {
                    const val = parseFloat(cashoutAmount.replace(',', '.'));
                    updateStatus(cashoutBetId, 'cashout', val || 0);
                    setCashoutBetId(null);
                  }}
                  className="w-full py-4 bg-accent text-bg rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-accent/20 hover:opacity-95 transition-all"
                >
                  Confirmar Cash Out
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {bulkQueue.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4 items-start pt-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-bg border border-border rounded-2xl shadow-2xl overflow-hidden w-full relative z-10 max-w-4xl"
            >
                <div className="flex flex-col max-h-[85vh]">
                  <div className="p-8 border-b border-border flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter">Confirmar Lote</h2>
                      <p className="text-text-dim text-xs font-bold tracking-widest uppercase mt-1">
                        {bulkQueue.length} {bulkQueue.length === 1 ? 'aposta detectada' : 'apostas detectadas'} pela IA
                    </p>
                    {bulkQueue.some(b => b.isLive) && (
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest mt-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Algumas entradas identificadas como "Ao Vivo"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 bg-surface/50 p-3 rounded-2xl border border-border">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Aplicar a todos:</span>
                      <div className="flex items-center gap-2">
                        <select 
                          className="bg-bg border border-border rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-text-main focus:border-accent outline-none"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            setBulkQueue(bulkQueue.map(b => ({ ...b, bookmaker: val })));
                          }}
                        >
                          <option value="">Casa de Aposta...</option>
                          {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                        </select>
                        <select 
                          className="bg-bg border border-border rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-text-main focus:border-accent outline-none"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            setBulkQueue(bulkQueue.map(b => ({ ...b, status: val as any })));
                          }}
                        >
                          <option value="">Status...</option>
                          <option value="pending">Pendente</option>
                          <option value="won">Ganha</option>
                          <option value="lost">Perdida</option>
                          <option value="void">Reembolsada</option>
                        </select>
                      </div>
                    </div>
                  </div>
                    <button 
                      onClick={() => setBulkQueue([])}
                      className="p-2 hover:bg-surface rounded-full transition-colors"
                    >
                      <XCircle className="w-6 h-6 text-text-dim" />
                    </button>
                  </div>

                    <div className="overflow-y-auto flex-1 p-6 space-y-6">
                      {bulkQueue.map((bet: any, idx) => (
                        <div key={idx} className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-5 relative overflow-hidden group hover:border-accent/30 transition-all shadow-xl bg-white/[0.01]">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[40px] rounded-full translate-x-16 -translate-y-16" />
                          
                          <div className="flex items-start justify-between relative z-10">
                            <div className="flex-1 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Esporte</p>
                                  <input 
                                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black uppercase text-accent focus:border-accent outline-none shadow-sm"
                                    value={bet.sport}
                                    onChange={(e) => {
                                      const newQueue = [...bulkQueue];
                                      newQueue[idx].sport = e.target.value;
                                      setBulkQueue(newQueue);
                                    }}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Evento (Jogo)</p>
                                  <input 
                                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-main focus:border-accent outline-none uppercase shadow-sm"
                                    value={bet.event}
                                    onChange={(e) => {
                                      const newQueue = [...bulkQueue];
                                      newQueue[idx].event = e.target.value;
                                      setBulkQueue(newQueue);
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Liga / Comp.</p>
                                  <input 
                                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-main focus:border-accent outline-none uppercase shadow-sm"
                                    value={bet.league || ''}
                                    placeholder="Ex: Brasileirão"
                                    onChange={(e) => {
                                      const newQueue = [...bulkQueue];
                                      newQueue[idx].league = e.target.value;
                                      setBulkQueue(newQueue);
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-2">
                                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Mercado / Detalhes</p>
                                  <input 
                                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-main focus:border-accent outline-none uppercase shadow-sm"
                                    value={bet.market}
                                    onChange={(e) => {
                                      const newQueue = [...bulkQueue];
                                      newQueue[idx].market = e.target.value;
                                      newQueue[idx].selection = e.target.value;
                                      setBulkQueue(newQueue);
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">ID Aposta</p>
                                  <input 
                                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-[10px] font-black text-text-dim focus:border-accent outline-none uppercase shadow-sm"
                                    value={bet.betId || ''}
                                    placeholder="N/A"
                                    onChange={(e) => {
                                      const newQueue = [...bulkQueue];
                                      newQueue[idx].betId = e.target.value;
                                      setBulkQueue(newQueue);
                                    }}
                                  />
                                </div>
                                <div className="flex flex-col">
                                   <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Tipo</p>
                                   <button
                                      type="button"
                                      onClick={() => {
                                        const newQueue = [...bulkQueue];
                                        newQueue[idx].isLive = !newQueue[idx].isLive;
                                        setBulkQueue(newQueue);
                                      }}
                                      className={cn(
                                         "flex-1 px-3 py-1.5 rounded-xl border flex items-center justify-center gap-2 transition-all",
                                         bet.isLive ? "bg-accent/10 border-accent text-accent" : "bg-bg border-border text-text-dim"
                                      )}
                                   >
                                      <Zap className={cn("w-3 h-3", bet.isLive ? "fill-accent" : "")} />
                                      <span className="text-[9px] font-black uppercase tracking-tighter">{bet.isLive ? 'Ao Vivo' : 'Pré-Jogo'}</span>
                                   </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 ml-4">
                               <button 
                                 type="button"
                                 onClick={() => {
                                   const newQueue = bulkQueue.filter((_, i) => i !== idx);
                                   setBulkQueue(newQueue);
                                 }}
                                 className="p-3 bg-loss/10 text-loss rounded-xl hover:bg-loss hover:text-white transition-all shadow-sm"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
                            <div>
                               <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Data / Hora</p>
                               <input 
                                 type="datetime-local"
                                 className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[10px] font-black text-text-main focus:border-accent outline-none shadow-sm"
                                 value={new Date(new Date(bet.date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                 onChange={(e) => {
                                   const newQueue = [...bulkQueue];
                                   newQueue[idx].date = new Date(e.target.value).toISOString();
                                   newQueue[idx].isLive = false;
                                   setBulkQueue(newQueue);
                                 }}
                               />
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Casa</p>
                               <select 
                                 className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase text-text-main focus:border-accent outline-none shadow-sm"
                                 value={bet.bookmaker || ''}
                                 onChange={(e) => {
                                   const newQueue = [...bulkQueue];
                                   newQueue[idx].bookmaker = e.target.value;
                                   setBulkQueue(newQueue);
                                 }}
                               >
                                 <option value="">Principal</option>
                                 {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                               </select>
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Status</p>
                               <select 
                                 className={cn(
                                   "w-full border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none shadow-sm",
                                   bet.status === 'won' ? "bg-accent/10 border-accent/20 text-accent" : 
                                   bet.status === 'lost' ? "bg-loss/10 border-loss/20 text-loss" : 
                                   "bg-bg border-border text-text-main focus:border-accent"
                                 )}
                                 value={bet.status}
                                 onChange={(e) => {
                                   const newQueue = [...bulkQueue];
                                   newQueue[idx].status = e.target.value as any;
                                   setBulkQueue(newQueue);
                                 }}
                               >
                                 <option value="pending">Pendente</option>
                                 <option value="won">Ganha</option>
                                 <option value="lost">Perdida</option>
                                 <option value="void">Reembolso</option>
                               </select>
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Stake (R$)</p>
                               <input 
                                 type="number"
                                 step="0.01"
                                 className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[10px] font-black text-text-main focus:border-accent outline-none shadow-sm"
                                 value={bet.stake}
                                 onChange={(e) => {
                                   const newQueue = [...bulkQueue];
                                   newQueue[idx].stake = Number(e.target.value);
                                   setBulkQueue(newQueue);
                                 }}
                               />
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 px-1">Odd</p>
                               <input 
                                 type="number"
                                 step="0.01"
                                 className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[10px] font-black text-accent focus:border-accent outline-none shadow-sm"
                                 value={bet.odds}
                                 onChange={(e) => {
                                   const newQueue = [...bulkQueue];
                                   newQueue[idx].odds = Number(e.target.value);
                                   setBulkQueue(newQueue);
                                 }}
                               />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  <div className="p-6 border-t border-border bg-surface flex gap-3">
                    <button 
                      onClick={() => setBulkQueue([])}
                      className="flex-1 py-4 px-6 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface transition-all"
                    >
                      Descartar Tudo
                    </button>
                    <button 
                      onClick={async () => {
                        setIsScanning(true);
                        try {
                          for (const bet of bulkQueue) {
                            await addBet(bet, true);
                          }
                          setBulkQueue([]);
                          setActiveTab('bets');
                        } catch (err) {
                          setScanError("Erro ao registrar algumas apostas.");
                        } finally {
                          setIsScanning(false);
                        }
                      }}
                      className="flex-none md:flex-3 py-4 px-6 bg-accent text-bg rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Registrar {bulkQueue.length} Apostas
                    </button>
                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast Notification */}
      {/* Transaction Edit Modal */}
      <AnimatePresence>
        {showTransactionEditModal && editingTransactionId && (
           <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowTransactionEditModal(false);
                  setEditingTransactionId(null);
                }}
                className="absolute inset-0 bg-bg/95 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md glass-card p-0 overflow-hidden relative border-border bg-surface/50 shadow-2xl"
              >
                 <div className="p-6 border-b border-border flex items-center justify-between bg-bg/40">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-accent/10 rounded-lg">
                          <Pencil className="w-5 h-5 text-accent" />
                       </div>
                       <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter">Editar Transação</h3>
                       </div>
                    </div>
                    <button 
                      onClick={() => {
                        setShowTransactionEditModal(false);
                        setEditingTransactionId(null);
                      }}
                      className="text-text-dim hover:text-text-main transition-colors p-2 hover:bg-surface rounded-full"
                    >
                       <XCircle className="w-6 h-6" />
                    </button>
                 </div>

                 <div className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Tipo</label>
                        <div className="grid grid-cols-3 gap-2">
                           {['withdrawal', 'deposit', 'transfer', 'adjustment'].map((type) => (
                             <button
                               key={type}
                               onClick={() => setTransactionForm({ ...transactionForm, type: type as any })}
                               className={cn(
                                 "py-2 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border",
                                 transactionForm.type === type 
                                    ? "bg-accent/10 border-accent text-accent" 
                                    : "bg-surface border-border text-text-dim hover:border-text-dim/40"
                               )}
                             >
                               {type === 'withdrawal' ? 'Saque' : type === 'deposit' ? 'Aporte' : type === 'adjustment' ? 'Ajuste' : 'Transfer.'}
                             </button>
                           ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <InputGroup 
                           label="Valor (R$)" 
                           type="number" 
                           value={transactionForm.amount} 
                           onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})} 
                         />
                         <InputGroup 
                           label="Data" 
                           type="datetime-local" 
                           value={transactionForm.date} 
                           onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})} 
                         />
                      </div>

                      {transactionForm.type === 'transfer' ? (
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Origem</label>
                             <select 
                               value={transactionForm.type === 'deposit' ? transactionForm.toBookmaker : transactionForm.fromBookmaker}
                              onChange={(e) => {
                                if (transactionForm.type === 'deposit') {
                                  setTransactionForm({...transactionForm, toBookmaker: e.target.value});
                                } else {
                                  setTransactionForm({...transactionForm, fromBookmaker: e.target.value});
                                }
                              }}
                              className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                            >
                              {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                             </select>
                           </div>
                           <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Destino</label>
                             <select 
                               value={transactionForm.toBookmaker}
                               onChange={(e) => setTransactionForm({...transactionForm, toBookmaker: e.target.value})}
                               className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                             >
                               {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                             </select>
                           </div>
                        </div>
                      ) : (
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Casa de Aposta</label>
                           <select 
                             value={transactionForm.type === 'deposit' ? transactionForm.toBookmaker : transactionForm.fromBookmaker}
                              onChange={(e) => {
                                if (transactionForm.type === 'deposit') {
                                  setTransactionForm({...transactionForm, toBookmaker: e.target.value});
                                } else {
                                  setTransactionForm({...transactionForm, fromBookmaker: e.target.value});
                                }
                              }}
                              className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold uppercase tracking-tight text-text-main focus:border-accent outline-none"
                            >
                              {userBookmakers.map(bm => <option key={bm} value={bm}>{bm}</option>)}
                           </select>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2 block">Notas</label>
                        <textarea 
                          value={transactionForm.notes}
                          onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                          className="w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold text-text-main focus:border-accent outline-none min-h-[80px]"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
                          showToast("Informe um valor válido", "info");
                          return;
                        }
                        addTransaction({
                          amount: parseFloat(transactionForm.amount),
                          date: transactionForm.date,
                          type: transactionForm.type,
                          fromBookmaker: transactionForm.type === 'deposit' ? undefined : transactionForm.fromBookmaker,
                          toBookmaker: (transactionForm.type === 'withdrawal' || transactionForm.type === 'adjustment') ? undefined : transactionForm.toBookmaker,
                          notes: transactionForm.notes
                        });
                      }}
                      className="w-full bg-accent text-bg py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                    >
                      Salvar Alterações
                    </button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Balance Adjustment Modal */}
      <AnimatePresence>
        {adjustingBookmaker && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAdjustingBookmaker(null)}
                className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-surface border border-border p-8 rounded-2xl w-full max-w-md shadow-2xl z-10"
              >
                 <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Ajustar Saldo Real</h3>
                 <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-6">
                    Ajustando banca na <span className="text-accent">{adjustingBookmaker}</span>
                 </p>

                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1 block">Saldo Atual na Casa (R$)</label>
                       <input 
                         type="number"
                         step="0.01"
                         value={adjustmentValue}
                         onChange={(e) => setAdjustmentValue(e.target.value)}
                         className="w-full bg-bg border border-border rounded-lg p-4 text-xl font-black tabular-nums focus:border-accent outline-none"
                         autoFocus
                       />
                       <p className="text-[9px] text-text-dim/60 italic mt-2">
                         O sistema criará um registro de ajuste para igualar o saldo informado.
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                       <button 
                         onClick={() => setAdjustingBookmaker(null)}
                         className="py-3 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest text-text-dim hover:text-text-main transition-all"
                       >
                         Cancelar
                       </button>
                       <button 
                         onClick={handleBalanceAdjustment}
                         className="py-3 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest text-bg bg-accent hover:brightness-110 transition-all shadow-lg shadow-accent/20"
                       >
                         Confirmar Ajuste
                       </button>
                    </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && editingBetId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => {
                 setShowEditModal(false);
                 setEditingBetId(null);
               }}
               className="absolute inset-0 bg-bg/95 backdrop-blur-xl"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="w-full max-w-2xl glass-card p-0 overflow-hidden relative border-border bg-surface/50 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)]"
             >
                <div className="p-6 border-b border-border flex items-center justify-between bg-bg/40">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/10 rounded-lg">
                         <Edit3 className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                         <h3 className="text-xl font-black uppercase tracking-tighter">Editar Aposta</h3>
                         <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim opacity-50">Ajuste os detalhes do seu registro</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => {
                       setShowEditModal(false);
                       setEditingBetId(null);
                     }}
                     className="text-text-dim hover:text-text-main transition-colors p-2 hover:bg-surface rounded-full"
                   >
                      <XCircle className="w-6 h-6" />
                   </button>
                </div>

                <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                   <form onSubmit={(e) => {
                      e.preventDefault();
                      const betData = {
                         date: safeNewDate(betForm.date).toISOString(),
                         sport: betForm.sport,
                         event: betForm.event,
                         market: betForm.market,
                         selection: betForm.selection,
                         odds: Number(betForm.odds),
                         stake: Number(betForm.stake),
                         status: betForm.status,
                         cashoutValue: betForm.cashoutValue ? Number(betForm.cashoutValue) : null,
                         bookmaker: betForm.bookmaker,
                         bankrollId: betForm.bankrollId
                      };
                      updateBet(editingBetId, betData);
                   }} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputGroup 
                            label="Data e Hora" 
                            type="datetime-local" 
                            value={betForm.date} 
                            onChange={(e) => setBetForm({...betForm, date: e.target.value})} 
                            required 
                         />
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Casa de Aposta</label>
                            <div className="grid grid-cols-2 gap-2">
                               {userBookmakers.map(b => (
                                  <button
                                     key={b}
                                     type="button"
                                     onClick={() => {
                                        setBetForm({...betForm, bookmaker: betForm.bookmaker === b ? '' : b});
                                        setIsManualBookmaker(false);
                                     }}
                                     className={cn(
                                        "px-2 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-tight transition-all duration-300",
                                        betForm.bookmaker === b 
                                           ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_-8px_rgba(34,197,94,0.5)]" 
                                           : "bg-surface border-border text-text-dim hover:border-border-hover"
                                     )}
                                  >
                                     {b}
                                  </button>
                               ))}
                               {isManualBookmaker ? (
                                  <div className="relative col-span-2">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={betForm.bookmaker}
                                      onChange={(e) => setBetForm(prev => ({...prev, bookmaker: e.target.value}))}
                                      placeholder="Digite a casa..."
                                      className="w-full px-4 py-3 bg-surface border border-accent text-[10px] font-black uppercase tracking-tight rounded-lg focus:outline-none"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setBetForm(prev => ({...prev, bookmaker: ''}));
                                        setIsManualBookmaker(false);
                                      }}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-loss transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                               ) : (
                                  <button
                                     type="button"
                                     onClick={() => {
                                       const isCustom = betForm.bookmaker !== '' && !userBookmakers.includes(betForm.bookmaker);
                                       if (isCustom) {
                                         setBetForm(prev => ({...prev, bookmaker: ''}));
                                         setIsManualBookmaker(false);
                                       } else {
                                         setIsManualBookmaker(true);
                                         setBetForm(prev => ({...prev, bookmaker: ''}));
                                       }
                                     }}
                                     className={cn(
                                        "px-2 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-tight transition-all duration-300",
                                        (betForm.bookmaker !== '' && !userBookmakers.includes(betForm.bookmaker))
                                           ? "bg-accent/10 border-accent text-accent shadow-[0_0_20px_-8px_rgba(34,197,94,0.5)]" 
                                           : "bg-surface border-border text-text-dim hover:border-border-hover"
                                     )}
                                  >
                                     {(betForm.bookmaker !== '' && !userBookmakers.includes(betForm.bookmaker)) ? betForm.bookmaker : "Outra"}
                                  </button>
                               )}
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputGroup 
                            label="Esporte" 
                            type="text" 
                            placeholder="Futebol, Basquete..."
                            value={betForm.sport} 
                            onChange={(e) => setBetForm({...betForm, sport: e.target.value})} 
                            required 
                         />
                         <InputGroup 
                            label="Evento" 
                            type="text" 
                            placeholder="Ex: Real Madrid x Barcelona"
                            value={betForm.event} 
                            onChange={(e) => setBetForm({...betForm, event: e.target.value})} 
                            required 
                         />
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                         <InputGroup 
                            label="Mercado / Detalhes da Aposta" 
                            type="text" 
                            placeholder="Ex: Resultado Final • Real Madrid"
                            value={betForm.market} 
                            onChange={(e) => setBetForm({...betForm, market: e.target.value})} 
                            required 
                         />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputGroup 
                            label="Odd" 
                            type="number" 
                            step="0.01"
                            value={betForm.odds} 
                            onChange={(e) => setBetForm({...betForm, odds: e.target.value})} 
                            required 
                         />
                         <InputGroup 
                            label="Stake" 
                            type="number" 
                            step="0.01"
                            value={betForm.stake} 
                            onChange={(e) => setBetForm({...betForm, stake: e.target.value})} 
                            required 
                         />
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Status da Aposta</label>
                           <select 
                              className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-sm font-bold text-text-main"
                              value={betForm.status}
                              onChange={(e) => setBetForm({...betForm, status: e.target.value as Bet['status']})}
                           >
                              <option value="pending">Pendente</option>
                              <option value="won">Ganha (Win)</option>
                              <option value="half_win">Meio Green (Half Win)</option>
                              <option value="lost">Perdida (Loss)</option>
                              <option value="half_loss">Meio Red (Half Loss)</option>
                              <option value="void">Reembolsada / Anulada (Void)</option>
                              <option value="cashout">Cash Out (Encerrada)</option>
                           </select>
                         </div>
                      </div>

                      <div className="pt-6 flex gap-4">
                         <button 
                            type="button"
                            onClick={() => {
                              setShowEditModal(false);
                              setEditingBetId(null);
                            }}
                            className="flex-1 py-4 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface transition-all"
                         >
                            Cancelar
                         </button>
                         <button 
                            type="submit"
                            className="flex-[2] py-4 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
                         >
                            Salvar Alterações
                         </button>
                      </div>
                   </form>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBankrollMenuOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBankrollMenuOpen(false)}
              className="absolute inset-0 bg-bg/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="stat-card p-0 w-full max-w-sm border-border bg-surface shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="p-6 border-b border-border bg-bg/20 backdrop-blur-xl">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                       <Wallet className="w-5 h-5 text-accent" />
                       Minhas Bancas
                    </h3>
                    <button onClick={() => setIsBankrollMenuOpen(false)} className="text-text-dim hover:text-text-main transition-colors p-1 hover:bg-surface rounded-full">
                      <XCircle className="w-6 h-6" />
                    </button>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim mt-2 opacity-50">Escolha o ambiente de gestão</p>
              </div>
              
              <div className="p-4 max-h-[450px] overflow-y-auto no-scrollbar space-y-3">
                {bankrolls.map(b => (
                  <motion.button
                    key={b.id}
                    whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.02)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveBankrollId(b.id);
                      localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', b.id);
                      setIsBankrollMenuOpen(false);
                      showToast(`Banca "${b.name}" ativada!`);
                    }}
                    className={cn(
                      "w-full p-5 rounded-2xl border flex items-center justify-between transition-all group overflow-hidden relative",
                      b.id === activeBankrollId 
                        ? "bg-accent/10 border-accent shadow-[0_0_30px_-5px_rgba(34,197,94,0.1)]" 
                        : "bg-surface border-border hover:border-accent/40"
                    )}
                  >
                    {b.id === activeBankrollId && (
                       <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full" />
                    )}
                    <div className="flex flex-col items-start relative z-10">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                           "text-sm font-black uppercase tracking-tight",
                           b.id === activeBankrollId ? "text-accent" : "text-text-main"
                        )}>{b.name}</span>
                        {b.id === activeBankrollId && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent text-[7px] text-bg rounded-full font-black animate-pulse">
                             <Check className="w-2 h-2" />
                             ATIVA
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 opacity-60">
                         <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">
                            Unit: {formatCurrency(b.unitSize)}
                         </span>
                         <span className="w-1 h-1 bg-border rounded-full" />
                         <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">
                            {(b.total / b.unitSize).toFixed(0)}u
                         </span>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-all duration-300",
                      b.id === activeBankrollId ? "text-accent translate-x-0 opacity-100" : "text-text-dim opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                    )} />
                  </motion.button>
                ))}
              </div>

              <div className="p-4 bg-bg/40 border-t border-border">
                <button 
                  onClick={() => {
                    setIsBankrollMenuOpen(false);
                    setIsAddingBankroll(true);
                  }}
                  className="w-full py-4 border-2 border-border border-dashed rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim hover:border-accent/50 hover:text-accent transition-all hover:bg-accent/5"
                >
                  <Plus className="w-4 h-4" />
                  Criar Novo Ambiente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[100] pointer-events-none w-full max-w-xs px-4"
          >
            <div className={cn(
              "glass-card px-6 py-4 flex items-center gap-4 border-l-4",
              successToast.type === 'success' ? "border-accent shadow-accent/20" : 
              successToast.type === 'loss' ? "border-loss shadow-loss/20" :
              "border-text-dim shadow-black/40"
            )}>
              <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                successToast.type === 'success' ? "bg-accent text-bg" : 
                successToast.type === 'loss' ? "bg-loss text-white" :
                "bg-text-dim/10 text-text-dim"
              )}>
                {successToast.type === 'success' ? <TrendingUp className="w-5 h-5" /> : 
                 successToast.type === 'loss' ? <TrendingDown className="w-5 h-5" /> :
                 <CheckCircle2 className="w-5 h-5" />}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest leading-tight text-text-main">
                {successToast.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatsCard({ title, value, trend, icon }: { title: string, value: string, trend?: 'up' | 'down', icon: React.ReactNode }) {
  return (
    <div className="stat-card">
      <p className="text-text-dim text-[11px] font-black uppercase tracking-widest mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className={cn(
            "text-3xl font-black tracking-tighter",
            trend === 'up' ? "text-accent" : trend === 'down' ? "text-loss" : "text-text-main"
        )}>{value}</h4>
      </div>
    </div>
  )
}

function StatusBadge({ status, isSyncing }: { status: Bet['status'], isSyncing?: boolean }) {
  if (isSyncing) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-[0.12em] bg-accent/20 text-accent border border-accent/40 shadow-[0_0_10px_rgba(0,255,149,0.1)] animate-pulse uppercase backdrop-blur-md">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Sync...
      </span>
    )
  }

  const configs = {
    won: { 
      label: 'GREEN', 
      bg: 'bg-accent/15',
      text: 'text-accent',
      border: 'border-accent/30',
      shadow: 'shadow-[0_0_15px_rgba(0,255,149,0.08)]',
      dotColor: 'bg-accent shadow-[0_0_6px_currentColor]'
    },
    half_win: { 
      label: '½ GREEN', 
      bg: 'bg-accent/10',
      text: 'text-accent/90',
      border: 'border-accent/20',
      shadow: 'shadow-[0_0_10px_rgba(0,255,149,0.04)]',
      dotColor: 'bg-accent/80'
    },
    lost: { 
      label: 'RED', 
      bg: 'bg-loss/15',
      text: 'text-loss',
      border: 'border-loss/30',
      shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.08)]',
      dotColor: 'bg-loss shadow-[0_0_6px_currentColor]'
    },
    half_loss: { 
      label: '½ RED', 
      bg: 'bg-loss/10',
      text: 'text-loss/90',
      border: 'border-loss/20',
      shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.04)]',
      dotColor: 'bg-loss/80'
    },
    void: { 
      label: 'VOIDED', 
      bg: 'bg-refund/15',
      text: 'text-refund',
      border: 'border-refund/30',
      shadow: 'shadow-[0_0_15px_rgba(255,184,0,0.08)]',
      dotColor: 'bg-refund shadow-[0_0_6px_currentColor]'
    },
    pending: { 
      label: 'PENDING', 
      bg: 'bg-white/5',
      text: 'text-text-dim',
      border: 'border-white/10',
      shadow: 'shadow-none',
      dotColor: 'bg-text-dim/30'
    },
    cashout: { 
      label: 'CASH OUT', 
      bg: 'bg-amber-500/15',
      text: 'text-amber-500',
      border: 'border-amber-500/30',
      shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.08)]',
      dotColor: 'bg-amber-500 shadow-[0_0_6px_currentColor]'
    },
  }
  
  const config = configs[status] || configs.pending;

  return (
    <span className={cn(
      "relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.12em] border backdrop-blur-xl transition-all duration-300 cursor-default select-none group",
      config.bg, config.text, config.border, config.shadow
    )}>
      {/* Glossy overlay effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
      
      <div className={cn("w-1 h-1 rounded-full shrink-0 transition-transform group-hover:scale-125", config.dotColor)} />
      <span className="relative z-10">{config.label}</span>
    </span>
  )
}

function InputGroup({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest group-focus-within:text-accent transition-colors">{label}</label>
      <input 
        className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-sm font-bold text-text-main transition-all focus:ring-4 focus:ring-accent/10"
        {...props}
      />
    </div>
  )
}

function SortableBankrollItem({ b, activeBankrollId, setActiveBankrollId, deleteBankroll, showToast }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: b.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1
  };

  return (
    <motion.div 
        ref={setNodeRef}
        style={style}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
            "p-3 rounded-xl border flex items-center gap-3 transition-all group relative overflow-hidden",
            b.id === activeBankrollId 
              ? "bg-accent/[0.08] border-accent/50 shadow-lg shadow-accent/5" 
              : "bg-surface border-border hover:border-accent/30 hover:bg-white/[0.02]",
            isDragging && "opacity-100 z-50 bg-[#1A1D23] border-accent shadow-2xl scale-[1.03] shadow-accent/20 cursor-grabbing"
        )}
    >
        <button 
          {...attributes} 
          {...listeners}
          className="p-1.5 hover:bg-white/10 rounded-lg cursor-grab active:cursor-grabbing text-text-dim/30 hover:text-accent transition-all"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {b.id === activeBankrollId && (
           <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full translate-x-8 -translate-y-8" />
        )}

        <div onClick={() => {
            setActiveBankrollId(b.id);
            localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', b.id);
            showToast(`Banca "${b.name}" ativada!`);
        }} className="flex-1 cursor-pointer relative z-10 py-1">
            <div className="flex items-center gap-2">
                <p className="font-black text-sm uppercase">{b.name}</p>
                {b.id === activeBankrollId && (
                   <span className="text-[7px] bg-accent text-bg px-1.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                      <Check className="w-2 h-2" />
                      ATIVA
                   </span>
                )}
            </div>
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-0.5 opacity-60">
                Inicial: {formatCurrency(b.total)} • Unit: {formatCurrency(b.unitSize)}
            </p>
        </div>
        
        <div className="flex items-center gap-1 relative z-10">
            <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBankroll(b.id);
                }}
                className="p-2 text-text-dim hover:text-loss transition-colors hover:bg-loss/10 rounded-lg opacity-0 group-hover:opacity-100"
                title="Excluir Banca"
            >
                <Trash2 className="w-4 h-4" />
            </button>
            <ChevronRight className={cn(
               "w-4 h-4 transition-all duration-300",
               b.id === activeBankrollId ? "text-accent opacity-100" : "text-text-dim opacity-40 group-hover:opacity-100"
            )} />
        </div>
    </motion.div>
  );
}
