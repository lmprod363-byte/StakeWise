import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
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
  ShieldCheck,
  LogOut,
  LogIn,
  Pencil,
  ImagePlus,
  Loader2,
  Play,
  RefreshCw,
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
  AlertTriangle,
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
import { auth, db, signOut, getRedirectResult } from './lib/firebase';
import { cn, formatCurrency, calculateProfit, safeNewDate, isMatchOngoing, getBookmakerLogo } from './lib/utils';
import { Bet, Bankroll, Stats, Transaction } from './types';
import { 
  extractBetFromImage, 
  checkBetResult, 
  openApiKeySelector 
} from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { RenderEventWithScore } from './components/RenderEventWithScore';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { AuthScreen } from './components/auth/AuthScreen';
import { 
  TRANSITIONS, 
  PAGE_VARIANTS, 
  MODAL_VARIANTS, 
  STAGGER_CONTAINER, 
  STAGGER_ITEM,
  BOOKMAKER_CONFIGS 
} from './constants';
import { InputGroup } from './components/ui/InputGroup';
import { TransactionEditModal } from './components/modals/TransactionEditModal';
import { BalanceAdjustmentModal } from './components/modals/BalanceAdjustmentModal';
import { BankrollMenuModal } from './components/modals/BankrollMenuModal';
import { BetManagementModals } from './components/BetManagementModals';
import { AppShell } from './components/AppShell';
import { AddBankrollModal } from './components/modals/AddBankrollModal';
import { DeleteBetModal } from './components/modals/DeleteBetModal';
import { HistoryBetRow, HistoryBetCard } from './components/HistoryBetItem';
import { StatusBadge } from './components/StatusBadge';
import { SortableBankrollItem } from './components/SortableBankrollItem';

// Tab Components
import { SettingsTab } from './components/tabs/SettingsTab';
import { TransfersTab } from './components/tabs/TransfersTab';
import { RegisterTab } from './components/tabs/RegisterTab';
import { InsightsTab } from './components/tabs/InsightsTab';
import { TrashTab } from './components/tabs/TrashTab';
import { BetsTab } from './components/tabs/BetsTab';
import { StakeTab } from './components/tabs/StakeTab';

import { getBookmakerStyle } from './lib/utils';
import { PREDEFINED_MARKETS, PREDEFINED_SELECTIONS } from './constants';

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
    const found = bankrolls.find(b => b.id === activeBankrollId);
    if (found) return found;
    if (bankrolls.length > 0) return bankrolls[0];
    return { id: 'default', name: 'Principal', total: 1000, unitSize: 20, userId: '', createdAt: null } as Bankroll;
  }, [bankrolls, activeBankrollId]);

  // Remover o useEffect instável que forçava activeBankrollId = bankroll.id
  // Isso evitava mudanças se o banco escolhido não estivesse carregado no momento exato.

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bets' | 'register' | 'insights' | 'settings' | 'trash' | 'transfers' | 'stake'>('dashboard');
  const [viewAllBankrolls, setViewAllBankrolls] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<null | { confirmed: boolean, data: Omit<Bet, 'id' | 'profit'> }>(null);
  const [isSyncingResults, setIsSyncingResults] = useState(false);
  const [isSyncingScores, setIsSyncingScores] = useState(false);
  const [manualSyncProgress, setManualSyncProgress] = useState(0); // 0 a 100 para manual
  const [isRegistering, setIsRegistering] = useState(false);
  const [syncingBetId, setSyncingBetId] = useState<string | null>(null);
  const [selectedBetIds, setSelectedBetIds] = useState<Set<string>>(new Set());
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(historySearchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [historySearchTerm]);
  
  const [historyStatusFilter, setHistoryStatusFilter] = useState('Todos');
  const [historyBookmakerFilter, setHistoryBookmakerFilter] = useState<string[]>([]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [showTransactionEditModal, setShowTransactionEditModal] = useState(false);
  const [expandedTransactionGroups, setExpandedTransactionGroups] = useState<Set<string>>(new Set());
  const [adjustingBookmaker, setAdjustingBookmaker] = useState<string | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [localActualBalance, setLocalActualBalance] = useState('');
  const [localStakeCalculationMode, setLocalStakeCalculationMode] = useState<'initial' | 'current'>('initial');
  const [showAllPercentages, setShowAllPercentages] = useState(false);
  const [manualAiKey, setManualAiKey] = useState(localStorage.getItem('STAKEWISE_CUSTOM_GEMINI_KEY') || '');
  const [isAddingBankroll, setIsAddingBankroll] = useState(false);

  const [localTotal, setLocalTotal] = useState('');
  const [localUnit, setLocalUnit] = useState('');
  const [localStopLoss, setLocalStopLoss] = useState('');
  const [localStopGreen, setLocalStopGreen] = useState('');
  const [localWeeklyGoal, setLocalWeeklyGoal] = useState('');
  const [localMonthlyGoal, setLocalMonthlyGoal] = useState('');
  const [localWorkingCapital, setLocalWorkingCapital] = useState('');
  const [transactionForm, setTransactionForm] = useState({
    type: 'deposit' as 'deposit' | 'withdraw' | 'transfer',
    amount: '',
    category: 'Deposito',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    description: '',
    bankrollId: activeBankrollId || '',
    bookmaker: ''
  });

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
  const [showSyncBanner, setShowSyncBanner] = useState(false);

  useEffect(() => {
    const hasPending = bets.some(b => b.status === 'pending' && !b.deleted);
    if (hasPending && activeTab === 'dashboard') {
      setShowSyncBanner(true);
    }
  }, [bets.length, activeTab]);



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
          showToast(`DOMÍNIO NÃO AUTORIZADO: Adicione '${domain}' no Console do Firebase > Authentication > Settings > Authorized Domains.`, "loss");
        } else if (err.code === 'auth/popup-blocked') {
          showToast("POPUP BLOQUEADO: O navegador bloqueou a janela de login.", "loss");
        } else {
          showToast(`Erro no retorno do Google: ${err.message}`, "loss");
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
    }, (error) => {
      console.error("Erro ao escutar bancas:", error);
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
      const dbBets = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Bet[];

      // De-duplicate bets by ID before processing
      const uniqueBetsMap = new Map();
      dbBets.forEach(bet => uniqueBetsMap.set(bet.id, bet));
      const allBets = Array.from(uniqueBetsMap.values());

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
      const dbTransactions = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Transaction[];

      // De-duplicate transactions
      const uniqueTransactionsMap = new Map();
      dbTransactions.forEach(t => uniqueTransactionsMap.set(t.id, t));
      const list = Array.from(uniqueTransactionsMap.values());

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
    const total = parseFloat(localTotal) || bankroll.total || 0;
    const unitSize = parseFloat(localUnit) || bankroll.unitSize || 0;
    const dailyStopLoss = parseFloat(localStopLoss) || bankroll.dailyStopLoss || 0;
    const dailyStopGreen = parseFloat(localStopGreen) || bankroll.dailyStopGreen || 0;
    const weeklyGoal = parseFloat(localWeeklyGoal) || bankroll.weeklyGoal || 0;
    const monthlyGoal = parseFloat(localMonthlyGoal) || bankroll.monthlyGoal || 0;
    const workingCapitalPct = parseFloat(localWorkingCapital) || bankroll.workingCapitalPct || 0;
    const stakeCalculationMode = localStakeCalculationMode;
    
    saveBankroll({ 
      total, 
      unitSize, 
      dailyStopLoss, 
      dailyStopGreen, 
      weeklyGoal, 
      monthlyGoal, 
      workingCapitalPct,
      stakeCalculationMode
    });
    
    setLocalStopLoss('');
    setLocalStopGreen('');
    setLocalWeeklyGoal('');
    setLocalMonthlyGoal('');
    setLocalWorkingCapital('');
    showToast("Configurações salvas!", "success");
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
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
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
          
          // Quality 0.9 for better legibility by AI
          resolve(canvas.toDataURL('image/jpeg', 0.9));
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

  const goalStats = useMemo(() => {
    const activeBets = bets.filter(b => !b.deleted && b.bankrollId === activeBankrollId);
    
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    
    const dayBets = activeBets.filter(b => safeNewDate(b.date).getTime() >= startOfToday);
    const dayFinishedBets = dayBets.filter(b => b.status !== 'pending');
    const dayProfit = dayFinishedBets.reduce((acc, b) => acc + b.profit, 0);
    const dayLoss = dayFinishedBets.filter(b => b.profit < 0).reduce((acc, b) => acc + b.profit, 0);

    // Weekly stats (Start from current week's Monday)
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);
    const startOfWeek = monday.getTime();
    
    const weekBets = activeBets.filter(b => safeNewDate(b.date).getTime() >= startOfWeek);
    const weekProfit = weekBets.filter(b => b.status !== 'pending').reduce((acc, b) => acc + b.profit, 0);

    // Monthly stats
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const monthBets = activeBets.filter(b => safeNewDate(b.date).getTime() >= startOfMonth);
    const monthProfit = monthBets.filter(b => b.status !== 'pending').reduce((acc, b) => acc + b.profit, 0);

    return {
      dayProfit,
      dayLoss,
      weekProfit,
      monthProfit,
      dailyGordura: Math.max(0, dayProfit - (bankroll.dailyStopGreen || 0))
    };
  }, [bets, activeBankrollId, bankroll.dailyStopGreen]);

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
    return sortedGroups;
  }, [historyTransactions]);

  // Handle transaction groups expansion in a clean way
  useEffect(() => {
    if (expandedTransactionGroups.size === 0 && groupedTransactions.length > 0) {
      setExpandedTransactionGroups(new Set(groupedTransactions.map(([date]) => date)));
    }
  }, [groupedTransactions]);

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

    // Identificar duplicidade (exata ou muito similar no mesmo dia)
    const isDuplicate = bets.some(b => {
      if (b.deleted) return false;
      
      const normalize = (s: string) => (s || '')
        .toLowerCase()
        .replace(/\s*[xv]\.?s\s*/g, ' x ') 
        .replace(/[^a-z0-9]/g, '') 
        .trim();
      
      const bDate = safeNewDate(b.date);
      const nDate = safeNewDate(newBet.date);
      
      const sameDay = bDate.getFullYear() === nDate.getFullYear() &&
                      bDate.getMonth() === nDate.getMonth() &&
                      bDate.getDate() === nDate.getDate();
      
      const sameOdds = Math.abs(Number(b.odds) - Number(newBet.odds)) < 0.01;
      const sameStake = Math.abs(Number(b.stake) - Number(newBet.stake)) < 0.01;
      const sameEvent = normalize(b.event) === normalize(newBet.event);
      const samePick = normalize(b.selection) === normalize(newBet.selection) || 
                       normalize(b.selection) === normalize(newBet.market) ||
                       normalize(b.market) === normalize(newBet.selection);

      return (sameEvent && samePick && (sameDay || (sameOdds && sameStake)));
    });

    if (isDuplicate && !force) {
      setDuplicateWarning({ confirmed: false, data: newBet as Bet });
      return;
    }

    const stakeNum = Number(newBet.stake);
    const oddsNum = Number(newBet.odds);
    const cashoutNum = newBet.cashoutValue ? Number(newBet.cashoutValue) : undefined;

    const profit = calculateProfit(stakeNum, oddsNum, newBet.status, cashoutNum);
    
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

  const syncResults = async (specificBets?: Bet[], silent = false) => {
    if (!user || isSyncingResults) return;
    
    // If specificBets provided, use them; otherwise, use all pending/non-deleted ones
    const betsToSync = specificBets || bets.filter(b => b.status === 'pending' && !b.deleted);
    
    if (betsToSync.length === 0) {
      if (!silent) alert("Não há apostas selecionadas ou pendentes para sincronizar.");
      return;
    }

    setIsSyncingResults(true);
    setManualSyncProgress(0);
    try {
      let completed = 0;
      for (const bet of betsToSync) {
        setSyncingBetId(bet.id);
        const result = await checkBetResult(bet.event, bet.market, bet.selection, bet.date);
        
        // Sincronização de RESULTADO: Só altera se a aposta foi resolvida (ganha/perdida/anulada)
        if (result.status !== 'pending') {
          await updateStatus(bet.id, result.status, undefined, result.score);
        } else if (result.score) {
          // Se ainda pendente mas trouxe placar, atualiza apenas o placar
          await updateBetScore(bet.id, result.score, result.matchTime);
        }
        
        completed++;
        setManualSyncProgress((completed / betsToSync.length) * 100);
        setSyncingBetId(null);
        
        // Adiciona um pequeno delay entre requisições para evitar 429
        if (betsToSync.length > 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      setSelectedBetIds(new Set()); // Limpa seleção após sincronizar
      if (!silent) showToast("Sincronização concluída!", "success");
      else showToast("Resultados atualizados!", "success");
      setShowSyncBanner(false);
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
      if (!silent) {
        const errorMsg = error.message || "Verifique sua conexão";
        showToast(`Erro na sincronização: ${errorMsg}`, "info");
      }
    } finally {
      setIsSyncingResults(false);
      setSyncingBetId(null);
      setTimeout(() => setManualSyncProgress(0), 1000);
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
        profit: calculateProfit(finalStake, finalOdds, finalStatus, finalCashout),
        updatedAt: serverTimestamp()
      };

      const allowedFields = [
        'status', 'profit', 'updatedAt', 'odds', 'stake', 
        'selection', 'market', 'event', 'sport', 'league', 'date', 
        'deleted', 'cashoutValue', 'notes', 'bookmaker', 'bankrollId', 'userId',
        'betId', 'isLive', 'score', 'matchTime'
      ];

      // Add common identification fields if missing
      if (!bet.bankrollId) dataToUpdate.bankrollId = activeBankrollId;
      if (!bet.userId) dataToUpdate.userId = user.uid;

      // Only add fields that are in the allowed list AND have actually changed
      Object.entries(updatedData).forEach(([key, value]) => {
        if (allowedFields.includes(key)) {
          // Check if value is different from existing bet value
          if (value !== (bet as any)[key]) {
            dataToUpdate[key] = value;
          }
        }
      });

      // Clear undefined values just in case
      Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

      // If only profit and updatedAt are present, it means nothing significant changed
      const changesCount = Object.keys(dataToUpdate).filter(k => k !== 'profit' && k !== 'updatedAt').length;
      if (changesCount === 0) {
        setEditingBetId(null);
        setShowEditModal(false);
        return;
      }

      await updateDoc(doc(db, 'bets', id), dataToUpdate);
      showToast("Aposta atualizada com sucesso!", "success");
      setEditingBetId(null);
      setIsManualBookmaker(false);
      setShowEditModal(false);
    } catch (error) {
      console.error("Erro ao atualizar aposta:", error);
      if (error instanceof Error && error.message.includes('permissions')) {
         showToast("Erro de permissão no Firebase. Verifique sua conexão.", "info");
      } else {
         showToast("Erro ao salvar alterações.", "loss");
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

  const updateBetScore = async (id: string, score: string, matchTime?: string) => {
    if (!user) return;
    try {
      const data: any = {
        score,
        updatedAt: serverTimestamp()
      };
      if (matchTime) data.matchTime = matchTime;
      
      await updateDoc(doc(db, 'bets', id), data);
    } catch (error) {
      console.error("Erro ao atualizar placar:", error);
    }
  };

  const syncOnlyScores = async (specificBets: Bet[]) => {
    if (!user || isSyncingResults || isSyncingScores) return;
    
    setIsSyncingScores(true);
    try {
      for (const bet of specificBets) {
        setSyncingBetId(bet.id);
        const result = await checkBetResult(bet.event, bet.market, bet.selection, bet.date);
        if (result.score) {
          await updateBetScore(bet.id, result.score, result.matchTime);
        }
        setSyncingBetId(null);
        // Delay extra para evitar Rate Limit
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (error) {
      console.error("Erro na sincronização de placares:", error);
    } finally {
      setIsSyncingScores(false);
      setSyncingBetId(null);
    }
  };

  const updateStatus = async (id: string, status: Bet['status'], cashoutValue?: number, score?: string) => {
    if (!user || !activeBankrollId) {
      if (!user) return;
      showToast("Selecione uma banca ativa primeiro.", "info");
      return;
    }
    const bet = bets.find(b => b.id === id);
    if (!bet) return;

    // Optimistic cache for profit calculation to avoid lag in UI feedback
    const finalCashout = cashoutValue !== undefined ? cashoutValue : bet.cashoutValue;
    const optimisticProfit = calculateProfit(bet.stake, bet.odds, status, finalCashout);

    // Optimistic update to UI state
    const optimisticBets = bets.map(b => 
      b.id === id ? { 
        ...b, 
        status, 
        profit: optimisticProfit,
        score: score !== undefined ? score : b.score,
        cashoutValue: finalCashout
      } : b
    );
    
    // Set syncing state for visual feedback
    setSyncingBetId(id);
    setBets(optimisticBets);

    try {
      const data: any = {
        status,
        profit: optimisticProfit,
        updatedAt: serverTimestamp()
      };

      if (score !== undefined) {
        data.score = score;
      }
      
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
        const impact = optimisticProfit;
        showToast(`${labels[status] || 'ATUALIZADA'}: ${impact >= 0 ? '+' : ''}${formatCurrency(impact)}`, impact >= 0 ? 'success' : 'loss');
      }
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      showToast("Erro ao atualizar: " + (error instanceof Error ? error.message : String(error)), "info");
    } finally {
      setSyncingBetId(null);
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
      // Sanitize data to remove undefined and NaN values that crash Firestore
      const sanitizedData: any = { ...data, updatedAt: serverTimestamp() };
      Object.keys(sanitizedData).forEach(key => {
        if (sanitizedData[key] === undefined || (typeof sanitizedData[key] === 'number' && isNaN(sanitizedData[key]))) {
          delete sanitizedData[key];
        }
      });

      await updateDoc(doc(db, 'bankrolls', activeBankrollId), sanitizedData);
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

  if (authLoading || bankrollsLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreen onSuccess={() => {}} showToast={showToast} />;
  }

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      bankroll={bankroll}
      allTimeStats={allTimeStats}
      bookmakerExposure={bookmakerExposure}
      bookmakerBalances={bookmakerBalances}
      getBookmakerStyle={getBookmakerStyle}
      showBalanceFeedback={showBalanceFeedback}
      balanceDelta={balanceDelta}
      setAdjustingBookmaker={setAdjustingBookmaker}
      setAdjustmentValue={setAdjustmentValue}
      setIsBankrollMenuOpen={setIsBankrollMenuOpen}
      signOut={signOut}
      formatCurrency={formatCurrency}
      isMobileMenuOpen={isMobileMenuOpen}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
      successToast={successToast}
      user={user}
      showToast={showToast}
    >
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <Dashboard 
            activeBankrollId={activeBankrollId}
            bankroll={bankroll}
            stats={stats}
            allTimeStats={allTimeStats}
            goalStats={goalStats}
            chartData={chartData}
            chartRange={chartRange}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            showSyncBanner={showSyncBanner}
            setShowSyncBanner={setShowSyncBanner}
            isSyncingResults={isSyncingResults}
            syncResults={() => syncResults()}
            bookmakerExposure={bookmakerExposure}
            getBookmakerStyle={getBookmakerStyle}
            formatCurrency={formatCurrency}
            variants={{
              page: PAGE_VARIANTS,
              stagger: STAGGER_CONTAINER,
              item: STAGGER_ITEM
            }}
            transitions={TRANSITIONS}
          />
        )}

        {activeTab === 'bets' && (
           <BetsTab 
             bets={bets}
             activeBankrollId={activeBankrollId}
             isSyncingResults={isSyncingResults}
             isSyncingScores={isSyncingScores}
             manualSyncProgress={manualSyncProgress}
             syncingBetId={syncingBetId}
             selectedBetIds={selectedBetIds}
             setSelectedBetIds={setSelectedBetIds}
             historySearchTerm={historySearchTerm}
             setHistorySearchTerm={setHistorySearchTerm}
             historyStatusFilter={historyStatusFilter}
             setHistoryStatusFilter={setHistoryStatusFilter}
             historyBookmakerFilter={historyBookmakerFilter}
             setHistoryBookmakerFilter={setHistoryBookmakerFilter}
             collapsedDates={collapsedDates}
             toggleDateCollapse={toggleDateCollapse}
             syncOnlyScores={syncOnlyScores}
             syncResults={syncResults}
             updateStatus={updateStatus}
             deleteBet={deleteBet}
             permanentlyDeleteSelectedBets={permanentlyDeleteSelectedBets}
             deleteSelectedBets={deleteSelectedBets}
             userBookmakers={userBookmakers}
             setEditingBetId={setEditingBetId}
             setBetForm={setBetForm}
             setShowEditModal={setShowEditModal}
             setCashoutBetId={setCashoutBetId}
             setCashoutAmount={setCashoutAmount}
             bankroll={bankroll}
             setIsManualBookmaker={setIsManualBookmaker}
            groupedHistory={groupedHistory}
            activeTab={activeTab}
            updateStatusForSelected={updateStatusForSelected}
            updateBookmakerForSelected={updateBookmakerForSelected}
            restoreSelectedBets={restoreSelectedBets}
            toggleSelectAll={toggleSelectAll}
            toggleSelectBet={toggleSelectBet}
           />
        )}

        {activeTab === 'stake' && (
          <StakeTab 
            activeBankrollId={activeBankrollId}
            bankroll={bankroll}
            allTimeStats={allTimeStats}
            saveBankroll={saveBankroll}
            setLocalUnit={setLocalUnit}
            showToast={showToast}
          />
        )}

        {activeTab === 'register' && (
          <RegisterTab 
            user={user}
            bankroll={bankroll}
            activeBankrollId={activeBankrollId}
            userBookmakers={userBookmakers}
            editingBetId={editingBetId}
            setEditingBetId={setEditingBetId}
            isRegistering={isRegistering}
            addBet={addBet}
            updateBet={updateBet}
            setActiveTab={setActiveTab}
            showToast={showToast}
            predefinedMarkets={PREDEFINED_MARKETS}
            predefinedSelections={PREDEFINED_SELECTIONS}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab 
            bets={bets}
          />
        )}
        {activeTab === 'transfers' && (
          <TransfersTab 
            activeBankrollId={activeBankrollId}
            userBookmakers={userBookmakers}
            bookmakerBalances={bookmakerBalances}
            removeBookmaker={removeBookmaker}
            addBookmaker={addBookmaker}
            newBookmakerName={newBookmakerName}
            setNewBookmakerName={setNewBookmakerName}
            isAddingNewBookmaker={isAddingNewBookmaker}
            setIsAddingNewBookmaker={setIsAddingNewBookmaker}
            setAdjustingBookmaker={setAdjustingBookmaker}
            setAdjustmentValue={setAdjustmentValue}
            addTransaction={addTransaction}
            deleteTransaction={deleteTransaction}
            historyTransactions={historyTransactions}
            groupedTransactions={groupedTransactions}
            toggleTransactionGroup={toggleTransactionGroup}
            expandedTransactionGroups={expandedTransactionGroups}
            setShowTransactionEditModal={setShowTransactionEditModal}
            setEditingTransactionId={setEditingTransactionId}
            showToast={showToast}
            getBookmakerLogo={getBookmakerLogo}
          />
        )}
        {activeTab === 'trash' && (
          <TrashTab 
            groupedHistory={groupedHistory}
            restoreBet={restoreBet}
            restoreTransaction={restoreTransaction}
            setBetToDelete={setBetToDelete}
            permanentlyDeleteTransaction={permanentlyDeleteTransaction}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab 
            user={user}
            bankrolls={bankrolls}
            activeBankrollId={activeBankrollId}
            bankroll={bankroll}
            setActiveBankrollId={setActiveBankrollId}
            saveBankroll={saveBankroll}
            deleteBankroll={deleteBankroll}
            handleDragEndBankrolls={handleDragEndBankrolls}
            setIsAddingBankroll={setIsAddingBankroll}
            showToast={showToast}
            auditReport={auditReport}
            fixOrphanedBets={fixOrphanedBets}
            removeDuplicates={removeDuplicates}
            setActiveTab={setActiveTab}
            allTimeStats={allTimeStats}
          />
        )}
      </AnimatePresence>


      {/* Modals & Overlays */}
      <AddBankrollModal 
        isOpen={isAddingBankroll}
        onClose={() => setIsAddingBankroll(false)}
        addBankroll={addBankroll}
      />

      <DeleteBetModal 
        isOpen={!!betToDelete}
        onClose={() => setBetToDelete(null)}
        onConfirm={() => permanentlyDeleteBet(betToDelete)}
      />

      <BetManagementModals 
        cashoutBetId={cashoutBetId}
        setCashoutBetId={setCashoutBetId}
        bets={bets}
        cashoutAmount={cashoutAmount}
        setCashoutAmount={setCashoutAmount}
        updateStatus={updateStatus}
        bulkQueue={bulkQueue}
        setBulkQueue={setBulkQueue}
        userBookmakers={userBookmakers}
        addBet={addBet}
        isScanning={isScanning}
        setIsScanning={setIsScanning}
        showToast={showToast}
        setActiveTab={setActiveTab}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editingBetId={editingBetId}
        setEditingBetId={setEditingBetId}
        betForm={betForm}
        setBetForm={setBetForm}
        isManualBookmaker={isManualBookmaker}
        setIsManualBookmaker={setIsManualBookmaker}
        updateBet={updateBet}
        safeNewDate={safeNewDate}
        duplicateWarning={duplicateWarning}
        setDuplicateWarning={setDuplicateWarning}
      />

      <AnimatePresence>
        {showTransactionEditModal && editingTransactionId && (
          <TransactionEditModal
            isOpen={showTransactionEditModal && !!editingTransactionId}
            onClose={() => {
              setShowTransactionEditModal(false);
              setEditingTransactionId(null);
            }}
            transactionForm={transactionForm}
            setTransactionForm={setTransactionForm}
            userBookmakers={userBookmakers}
            addTransaction={addTransaction}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Balance Adjustment Modal */}
      <AnimatePresence>
        {adjustingBookmaker && (
          <BalanceAdjustmentModal
            isOpen={!!adjustingBookmaker}
            onClose={() => setAdjustingBookmaker(null)}
            adjustingBookmaker={adjustingBookmaker}
            adjustmentValue={adjustmentValue}
            setAdjustmentValue={setAdjustmentValue}
            handleBalanceAdjustment={handleBalanceAdjustment}
          />
        )}
      </AnimatePresence>

      {/* Bankroll Menu Modal */}
      <AnimatePresence>
        {isBankrollMenuOpen && (
          <BankrollMenuModal
            isOpen={isBankrollMenuOpen}
            onClose={() => setIsBankrollMenuOpen(false)}
            bankrolls={bankrolls}
            activeBankrollId={activeBankrollId}
            setActiveBankrollId={setActiveBankrollId}
            setIsAddingBankroll={setIsAddingBankroll}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </AppShell>
  )
}


