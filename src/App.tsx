import React, { useState, useEffect, useMemo } from 'react';
import { 
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
  HelpCircle,
  Clock,
  LayoutDashboard,
  Target,
  LogOut,
  LogIn,
  ImagePlus,
  Loader2,
  Camera,
  Sparkles,
  Square,
  CheckSquare,
  DollarSign,
  RotateCcw,
  Share,
  Copy,
  Zap,
  ChevronRight,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
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
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, signInWithGoogle, signOut, loginWithEmail, registerWithEmail, getRedirectResult } from './lib/firebase';
import { cn, formatCurrency, calculateProfit, safeNewDate } from './lib/utils';
import { Bet, Bankroll, Stats } from './types';
import { extractBetFromImage, checkBetResult, getAIInsights, AIInsight, openApiKeySelector } from './services/geminiService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bets, setBets] = useState<Bet[]>([]);
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'bets' | 'register' | 'insights' | 'settings' | 'trash'>('dashboard');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<null | { confirmed: boolean, data: Omit<Bet, 'id' | 'profit'> }>(null);
  const [isSyncingResults, setIsSyncingResults] = useState(false);
  const [syncingBetId, setSyncingBetId] = useState<string | null>(null);
  const [selectedBetIds, setSelectedBetIds] = useState<Set<string>>(new Set());
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('Todos');

  // AI Insights State
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Email Auth State
  const [isRegistering, setIsRegistering] = useState(false);
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
  const [successToast, setSuccessToast] = useState<{ message: string, type: 'success' | 'info' } | null>(null);
  const [cashoutBetId, setCashoutBetId] = useState<string | null>(null);
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
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

    const bankrollsQuery = query(
      collection(db, 'bankrolls'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeBankrolls = onSnapshot(bankrollsQuery, async (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Bankroll[];

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

      const firstBankrollId = bankrolls[0]?.id;
      const filtered = allBets.filter(bet => {
        if (!bet.bankrollId) {
          // Orphaned bets belong to first bankroll
          return !activeBankrollId || activeBankrollId === firstBankrollId || activeBankrollId === 'default';
        }
        return bet.bankrollId === activeBankrollId;
      });

      setBets(filtered);
      setLoading(false);
    });

    return () => unsubscribeBets();
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
    event: '',
    market: '',
    selection: '',
    odds: '',
    stake: bankroll.unitSize.toString(),
    status: 'pending' as Bet['status'],
    cashoutValue: ''
  });

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

        const betData = {
          userId: user?.uid || '',
          bankrollId: activeBankrollId || '',
          date: data.date ? safeNewDate(data.date).toISOString() : new Date().toISOString(),
          sport: data.sport || 'Futebol',
          event: data.event || '',
          market: data.market || '',
          selection: data.selection || '',
          odds: data.odds || 0,
          stake: data.stake || bankroll.unitSize,
          status: 'pending' as Bet['status'],
          cashoutValue: null,
          deleted: false,
          createdAt: new Date().toISOString()
        };

        if (isMultiple) {
          newBetsQueue.push(betData);
        } else {
          setBetForm(prev => ({
            ...prev,
            date: data.date ? format(safeNewDate(data.date), "yyyy-MM-dd'T'HH:mm") : prev.date,
            sport: betData.sport,
            event: betData.event,
            market: betData.market,
            selection: betData.selection,
            odds: betData.odds.toString(),
            stake: betData.stake.toString(),
          }));
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

      const betDate = safeNewDate(bet.date);
      if (timeRange === '24h') return isAfter(betDate, subHours(now, 24));
      if (timeRange === '7d') return isAfter(betDate, subDays(now, 7));
      if (timeRange === '30d') return isAfter(betDate, subDays(now, 30));
      return true;
    });
  }, [bets, timeRange, activeTab]);

  const historyBets = useMemo(() => {
    return bets.filter(bet => {
        // Handle Trash vs History view
        if (activeTab === 'trash' && !bet.deleted) return false;
        if (activeTab !== 'trash' && bet.deleted) return false;

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

        // Search Filter
        if (historySearchTerm) {
            const search = historySearchTerm.toLowerCase();
            return (
                bet.event.toLowerCase().includes(search) ||
                bet.market.toLowerCase().includes(search) ||
                bet.selection.toLowerCase().includes(search)
            );
        }

        return true;
    });
  }, [bets, historySearchTerm, historyStatusFilter, activeTab]);

  const groupedHistory = useMemo(() => {
    const groups: { [key: string]: { bets: Bet[], totalStake: number, totalProfit: number } } = {};
    
    historyBets.forEach(bet => {
        const dateKey = format(safeNewDate(bet.date), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
            groups[dateKey] = { bets: [], totalStake: 0, totalProfit: 0 };
        }
        groups[dateKey].bets.push(bet);
        if (bet.status !== 'pending') {
            groups[dateKey].totalStake += bet.stake;
            groups[dateKey].totalProfit += bet.profit;
        }
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [historyBets]);

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
      unitsWon: totalProfit / bankroll.unitSize
    };
  }, [filteredBets, bankroll.unitSize]);

  // All-time stats specifically for "Banca Atual" (ignores timeRange/filters)
  const allTimeStats = useMemo(() => {
    // Only bets that are NOT deleted
    const activeBets = bets.filter(b => !b.deleted);
    const settledBets = activeBets.filter(b => b.status !== 'pending');
    const pendingBets = activeBets.filter(b => b.status === 'pending');
    
    const totalProfit = settledBets.reduce((acc, b) => acc + b.profit, 0);
    const totalPendingStakes = pendingBets.reduce((acc, b) => acc + b.stake, 0);
    
    return {
      totalProfit,
      pendingCount: pendingBets.length,
      pendingStake: totalPendingStakes,
      currentBalance: bankroll.total + totalProfit - totalPendingStakes
    };
  }, [bets, bankroll.total]);

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

  const addBet = async (newBet: Omit<Bet, 'id' | 'profit'>, force = false) => {
    if (!user) return;

    // Check for duplicates
    const isDuplicate = bets.some(b => 
      !b.deleted &&
      b.event.toLowerCase() === newBet.event.toLowerCase() &&
      b.market.toLowerCase() === newBet.market.toLowerCase() &&
      b.selection.toLowerCase() === newBet.selection.toLowerCase() &&
      Math.abs(b.odds - newBet.odds) < 0.001 &&
      Math.abs(b.stake - newBet.stake) < 0.001
    );

    if (isDuplicate && !force) {
      setDuplicateWarning({ confirmed: false, data: newBet });
      return;
    }

    const profit = calculateProfit(newBet.stake, newBet.odds, newBet.status, newBet.cashoutValue);
    
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
          cashoutValue: ''
        });
      }
      setDuplicateWarning(null);
    } catch (error) {
      console.error("Erro ao salvar aposta:", error);
    }
  };

  const deleteBet = async (id: string) => {
    if (!user) return;
    try {
      // Soft delete
      await updateDoc(doc(db, 'bets', id), {
        deleted: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao excluir aposta:", error);
    }
  };

  const restoreBet = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'bets', id), {
        deleted: false,
        updatedAt: serverTimestamp()
      });
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
    if (!user) return;
    const bet = bets.find(b => b.id === id);
    if (!bet) return;

    const finalStake = updatedData.stake ?? bet.stake;
    const finalOdds = updatedData.odds ?? bet.odds;
    const finalStatus = updatedData.status ?? bet.status;
    const finalCashout = updatedData.cashoutValue !== undefined ? updatedData.cashoutValue : bet.cashoutValue;

    try {
      await updateDoc(doc(db, 'bets', id), {
        ...updatedData,
        profit: calculateProfit(finalStake, finalOdds, finalStatus, finalCashout),
        updatedAt: serverTimestamp()
      });
      showToast("Aposta atualizada com sucesso!", "info");
      setActiveTab('bets');
      setEditingBetId(null);
    } catch (error) {
      console.error("Erro ao atualizar aposta:", error);
    }
  };

  const deleteSelectedBets = async () => {
    if (!user || selectedBetIds.size === 0) return;
    if (!window.confirm(`Deseja mover as ${selectedBetIds.size} apostas selecionadas para a lixeira?`)) return;
    
    try {
      const ids = Array.from(selectedBetIds) as string[];
      for (const id of ids) {
        await updateDoc(doc(db, 'bets', id), {
          deleted: true,
          updatedAt: serverTimestamp()
        });
      }
      setSelectedBetIds(new Set());
      showToast("Apostas movidas para a lixeira!");
    } catch (error) {
      console.error("Erro ao excluir apostas:", error);
    }
  };

  const updateStatusForSelected = async (status: Bet['status']) => {
    if (!user || selectedBetIds.size === 0) return;
    
    try {
      const ids = Array.from(selectedBetIds) as string[];
      for (const id of ids) {
        const bet = bets.find(b => b.id === id);
        if (bet) {
          await updateDoc(doc(db, 'bets', id), {
            status,
            profit: calculateProfit(bet.stake, bet.odds, status, bet.cashoutValue),
            updatedAt: serverTimestamp()
          });
        }
      }
      setSelectedBetIds(new Set());
      showToast(`Status das apostas alterado para ${status === 'won' ? 'Ganha' : status === 'lost' ? 'Perdida' : status === 'void' ? 'Reembolsada' : 'Pendente'}`);
    } catch (error) {
      console.error("Erro ao atualizar status em massa:", error);
    }
  };

  const updateStatus = async (id: string, status: Bet['status'], cashoutValue?: number) => {
    if (!user || !activeBankrollId) return;
    const bet = bets.find(b => b.id === id);
    if (!bet) return;

    try {
      const finalCashout = cashoutValue !== undefined ? cashoutValue : bet.cashoutValue;
      const data: any = {
        status,
        profit: calculateProfit(bet.stake, bet.odds, status, finalCashout),
        updatedAt: serverTimestamp(),
        bankrollId: bet.bankrollId || activeBankrollId
      };
      if (cashoutValue !== undefined) data.cashoutValue = cashoutValue;

      await updateDoc(doc(db, 'bets', id), data);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
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
      const betsToDelete = bets.filter(b => b.bankrollId === id);
      for (const bet of betsToDelete) {
        await deleteDoc(doc(db, 'bets', bet.id));
      }
      await deleteDoc(doc(db, 'bankrolls', id));
      const other = bankrolls.find(b => b.id !== id);
      if (other) {
        setActiveBankrollId(other.id);
        localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', other.id);
      }
      showToast("Banca excluída com sucesso!", "info");
    } catch (error) {
      console.error("Erro ao excluir banca:", error);
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
              Gestão de banca na nuvem v1.4.9
            </p>
          </div>

          <div className="p-8 space-y-6">
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError('');
                try {
                  if (isRegistering) {
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
                {isRegistering ? 'Criar Conta' : 'Entrar na Plataforma'}
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
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
              className="text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
            >
              {isRegistering ? 'Já tenho uma conta? Entrar' : 'Não tem uma conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-text-main bg-bg font-sans">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden lg:flex w-64 bg-bg text-text-dim p-8 flex-col border-r border-border h-screen sticky top-0">
        <div className="text-accent font-black text-2xl tracking-tighter mb-10 px-2 uppercase">
          BetStrat.
        </div>

        <nav className="space-y-4 flex-1">
          <div className="mb-6">
             <p className="text-[10px] font-black uppercase tracking-widest text-text-dim px-2 mb-2">Banca Ativa</p>
             <select 
               value={activeBankrollId || ''} 
               onChange={(e) => {
                 setActiveBankrollId(e.target.value);
                 localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', e.target.value);
               }}
               className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus:outline-none focus:border-accent appearance-none cursor-pointer"
             >
               {bankrolls.map(b => (
                 <option key={b.id} value={b.id}>{b.name}</option>
               ))}
             </select>
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
        </nav>

        <div className="pt-6 space-y-4">
          <div className="bg-surface rounded-xl p-6 border border-border group relative">
            <button 
              onClick={() => setActiveTab('settings')}
              className="absolute top-4 right-4 p-2 text-text-dim hover:text-accent hover:bg-accent/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Gerenciar Banca"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <p className="text-text-dim text-[10px] font-black uppercase tracking-widest mb-2">Banca Atual</p>
            <p className="text-text-main text-2xl font-extrabold tracking-tight">
              {formatCurrency(allTimeStats.currentBalance)}
            </p>
          </div>
          
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
                  BetStrat.
                </div>
                <select 
                    value={activeBankrollId || ''} 
                    onChange={(e) => {
                        setActiveBankrollId(e.target.value);
                        localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', e.target.value);
                    }}
                    className="bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-widest text-text-dim mt-1 focus:ring-0 cursor-pointer"
                >
                    {bankrolls.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={signOut}
                    className="p-2 text-text-dim hover:text-loss transition-colors"
                    title="Sair"
                >
                    <LogOut className="w-5 h-5" />
                </button>
                <div className="bg-surface px-3 py-1.5 rounded-lg border border-border flex flex-col items-center min-w-[80px]">
                    <span className="text-[7px] font-black uppercase tracking-widest text-text-dim">Saldo</span>
                    <span className="text-[10px] font-black text-accent">{formatCurrency(allTimeStats.currentBalance)}</span>
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
            {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'bets' ? 'Histórico de Apostas' : activeTab === 'trash' ? 'Lixeira (Arquivadas)' : activeTab === 'register' ? 'Registrar Aposta' : activeTab === 'insights' ? 'Insights com IA' : 'Gestão de Banca'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                <StatsCard title="Total Entradas" value={`${stats.totalBets}`} icon={<History />} />
                <StatsCard title="Lucro Total" value={formatCurrency(stats.totalProfit)} trend={stats.totalProfit >= 0 ? 'up' : 'down'} icon={<BarChart3 />} />
                <StatsCard title="Taxa de Acerto" value={`${stats.winRate.toFixed(1)}%`} icon={<History />} />
                <StatsCard title="ROI" value={`${stats.roi.toFixed(1)}%`} icon={<TrendingUp />} />
                <StatsCard title="Lucro em Unidades" value={`${stats.unitsWon.toFixed(1)}u`} icon={<Target />} />
              </div>

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
              <div className="glass-card p-6 min-h-[500px] border-border bg-surface">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim mb-1">P/L ACUMULADO</h3>
                    <p className={cn(
                      "text-3xl font-black tracking-tighter",
                      stats.totalProfit >= 0 ? "text-accent-green" : "text-loss"
                    )}>
                      {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg border border-border">
                    <TrendingUp className="w-4 h-4 text-accent-green" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-green">{stats.totalBets} tips</span>
                  </div>
                </div>

                <div className="h-[350px] w-full mt-6">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00FF95" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#00FF95" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="0" vertical={false} stroke="#262B34" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#7C828D', fontWeight: 900 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#7C828D', fontWeight: 900 }} 
                          tickFormatter={(val) => `R$ ${val}`} 
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#15181F', border: '1px solid #262B34', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                          itemStyle={{ fontWeight: 900, fontSize: '14px', color: '#00FF95' }}
                          labelStyle={{ opacity: 0.5, fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}
                          formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Lucro']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="profit" 
                          stroke="#00FF95" 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#profitGradient)" 
                          animationDuration={1500}
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
                           event: betForm.event,
                           market: betForm.market,
                           selection: betForm.selection,
                           odds: Number(betForm.odds),
                           stake: Number(betForm.stake),
                           status: betForm.status,
                           cashoutValue: betForm.cashoutValue ? Number(betForm.cashoutValue) : null,
                           bankrollId: activeBankrollId || '',
                        };
                        if (editingBetId) {
                           updateBet(editingBetId, betData);
                        } else {
                           addBet(betData);
                        }
                     }} className="glass-card p-8 space-y-8 relative overflow-hidden backdrop-blur-2xl bg-white/[0.02] border-white/5">
                        {isScanning && (
                           <div className="absolute inset-0 z-20 bg-bg/40 backdrop-blur-[2px] cursor-wait flex items-center justify-center">
                              <div className="flex flex-col items-center gap-4">
                                 <Loader2 className="w-8 h-8 animate-spin text-accent" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-accent">IA Preenchendo...</span>
                              </div>
                           </div>
                        )}
                        <div className="flex items-center justify-between">
                           <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                              {editingBetId ? 'Editar Registro' : 'Preenchimento Manual'}
                              {isScanning && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
                           </h3>
                           {scanError && <p className="text-loss text-[10px] font-black uppercase tracking-widest">{scanError}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <InputGroup 
                              label="Data e Hora do Jogo" 
                              type="datetime-local" 
                              value={betForm.date} 
                              onChange={(e) => setBetForm({...betForm, date: e.target.value})} 
                              required 
                           />
                           <InputGroup 
                              label="Esporte" 
                              type="text" 
                              list="sports"
                              placeholder="Futebol, Basquete..."
                              value={betForm.sport} 
                              onChange={(e) => setBetForm({...betForm, sport: e.target.value})} 
                              required 
                           />
                           <datalist id="sports">
                              <option value="Futebol" /><option value="Basquete" /><option value="Tênis" /><option value="E-Sports" />
                           </datalist>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <InputGroup 
                              label="Evento" 
                              type="text" 
                              placeholder="Ex: Real Madrid x Barcelona"
                              value={betForm.event} 
                              onChange={(e) => setBetForm({...betForm, event: e.target.value})} 
                              required 
                           />
                           <InputGroup 
                              label="Mercado" 
                              type="text" 
                              list="markets"
                              placeholder="Ex: Resultado Final"
                              value={betForm.market} 
                              onChange={(e) => setBetForm({...betForm, market: e.target.value})} 
                              required 
                           />
                           <datalist id="markets">
                              {PREDEFINED_MARKETS.map(m => <option key={m} value={m} />)}
                           </datalist>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Seleção</label>
                               <input 
                                  className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:border-accent text-sm font-bold text-text-main"
                                  type="text" 
                                  list="selections"
                                  placeholder="Ex: Real Madrid"
                                  value={betForm.selection} 
                                  onChange={(e) => setBetForm({...betForm, selection: e.target.value})} 
                                  required 
                               />
                               <datalist id="selections">
                                  {PREDEFINED_SELECTIONS.map(s => <option key={s} value={s} />)}
                               </datalist>
                            </div>
                           <InputGroup 
                              label="Odd" 
                           type="number" 
                           step="0.01"
                           placeholder="Ex: 1.85"
                           value={betForm.odds} 
                           onChange={(e) => setBetForm({...betForm, odds: e.target.value})} 
                           required 
                           />
                           <InputGroup 
                              label="Stake (Investimento)" 
                           type="number" 
                           step="0.01"
                           placeholder="Ex: 20"
                           value={betForm.stake} 
                           onChange={(e) => setBetForm({...betForm, stake: e.target.value})} 
                           required 
                           />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            {betForm.status === 'cashout' && (
                               <InputGroup 
                                  label="Valor de Encerramento (Cash Out)" 
                                  type="number" 
                                  step="0.01"
                                  placeholder="Ex: 15.50"
                                  value={betForm.cashoutValue} 
                                  onChange={(e) => setBetForm({...betForm, cashoutValue: e.target.value})} 
                                  required 
                               />
                            )}
                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row gap-4">
                           <button 
                              type="button"
                              onClick={() => {
                                 setActiveTab('dashboard');
                                 setEditingBetId(null);
                              }}
                              className="flex-1 py-4 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface transition-all"
                           >
                              Cancelar
                           </button>
                           <button 
                              type="submit"
                              className="flex-1 py-4 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                           >
                              {editingBetId ? 'Atualizar Aposta' : 'Finalizar Registro'}
                           </button>
                        </div>
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
                  {selectedBetIds.size > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                       <button 
                         onClick={() => {
                           const selectedBets = bets.filter(b => selectedBetIds.has(b.id));
                           syncResults(selectedBets);
                         }}
                         disabled={isSyncingResults}
                         className={cn(
                             "flex items-center justify-center gap-2 px-6 py-3 bg-accent text-bg rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 shadow-lg shadow-accent/20 disabled:opacity-50",
                             isSyncingResults && "animate-pulse"
                         )}
                       >
                         <Sparkles className="w-4 h-4" />
                         Sincronizar ({selectedBetIds.size})
                       </button>

                       <button 
                         onClick={deleteSelectedBets}
                         className="flex items-center justify-center gap-2 px-4 py-3 bg-loss text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 shadow-lg shadow-loss/20"
                       >
                         <Trash2 className="w-4 h-4" />
                         Excluir
                       </button>

                       <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
                          <button onClick={() => updateStatusForSelected('won')} className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all" title="Marcar como Ganha"><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => updateStatusForSelected('lost')} className="p-2 text-loss hover:bg-loss/10 rounded-lg transition-all" title="Marcar como Perdida"><XCircle className="w-4 h-4" /></button>
                          <button onClick={() => updateStatusForSelected('void')} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-all" title="Marcar como Reembolsada"><HelpCircle className="w-4 h-4" /></button>
                          <button onClick={() => updateStatusForSelected('pending')} className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-all" title="Marcar como Pendente"><Clock className="w-4 h-4" /></button>
                       </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => syncResults()}
                      disabled={isSyncingResults}
                      className={cn(
                          "flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed",
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
                    </button>
                  )}
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
                              <span className="hidden md:inline-flex items-center justify-center bg-accent/10 text-accent px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest leading-none shadow-[0_0_15px_rgba(0,255,149,0.1)] border border-accent/20 backdrop-blur-md">
                                {group.bets.length} {group.bets.length === 1 ? 'entrada' : 'entradas'}
                              </span>
                              {isCollapsed ? (
                                <ChevronRight className="w-3 h-3 text-white/20" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-accent" />
                              )}
                            </div>
                            <div className="md:hidden mt-1 flex items-center gap-2 opacity-60">
                               <span className="text-[8px] font-black text-text-dim uppercase tracking-widest">
                                 {group.bets.length} {group.bets.length === 1 ? 'entrada' : 'entradas'}
                               </span>
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
                                    <th className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-right">Lucro/Perda</th>
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
                                           bet.status === 'won' || bet.status === 'half_win' ? "border-accent shadow-[0_0_12px_rgba(0,255,149,0.15)] bg-accent/[0.01]" : 
                                           bet.status === 'lost' || bet.status === 'half_loss' ? "border-loss shadow-[0_0_12px_rgba(255,62,62,0.15)] bg-loss/[0.01]" : 
                                           bet.status === 'void' ? "border-refund shadow-[0_0_12px_rgba(255,184,0,0.15)] bg-refund/[0.01]" : "border-border/60 bg-surface/40",
                                           bet.status !== 'pending' && "border-4",
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
                                                {bet.selection}
                                                <StatusBadge 
                                                  status={bet.status} 
                                                  isSyncing={bet.id === syncingBetId} 
                                                />
                                              </div>
                                              <div className="text-[10px] text-text-dim font-black uppercase mt-1 tracking-wider opacity-80">
                                                {format(safeNewDate(bet.date), "HH:mm")} • {bet.event} • {bet.market}
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
                                            {bet.status === 'pending' ? <span className="opacity-30">Pendente</span> : (bet.profit > 0 ? '+' : '') + formatCurrency(bet.profit)}
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
                                                      setBetForm({
                                                          date: format(safeNewDate(bet.date), "yyyy-MM-dd'T'HH:mm"),
                                                          sport: bet.sport,
                                                          event: bet.event,
                                                          market: bet.market,
                                                          selection: bet.selection,
                                                          odds: bet.odds.toString(),
                                                          stake: bet.stake.toString(),
                                                          status: bet.status,
                                                          cashoutValue: bet.cashoutValue?.toString() || ''
                                                      });
                                                      setActiveTab('register');
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
                                   <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-3">
                                        <button onClick={() => toggleSelectBet(bet.id)} className="transition-transform active:scale-90">
                                           {selectedBetIds.has(bet.id) ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5 text-text-dim/30" />}
                                        </button>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-main bg-bg px-2 py-1 rounded border border-border/20">
                                          {format(safeNewDate(bet.date), "HH:mm")}
                                        </span>
                                      </div>
                                      <StatusBadge status={bet.status} isSyncing={bet.id === syncingBetId} />
                                   </div>
                                   
                                   <div className="space-y-1">
                                     <p className="text-[9px] font-black uppercase tracking-widest text-accent/80">
                                       {bet.sport} • {bet.market}
                                     </p>
                                     <h4 className="text-base font-black uppercase text-text-main leading-none py-1">{bet.selection}</h4>
                                     <p className="text-[11px] font-bold text-text-dim uppercase opacity-80 leading-tight border-t border-border/10 pt-2">{bet.event}</p>
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
                                        <p className={cn(
                                          "text-xs font-mono font-bold",
                                          bet.status === 'won' ? "text-accent" : bet.status === 'lost' ? "text-loss" : "text-text-dim"
                                        )}>
                                          {bet.status === 'pending' ? '-' : formatCurrency(bet.profit)}
                                        </p>
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
                                            setBetForm({
                                                date: format(safeNewDate(bet.date), "yyyy-MM-dd'T'HH:mm"),
                                                sport: bet.sport,
                                                event: bet.event,
                                                market: bet.market,
                                                selection: bet.selection,
                                                odds: bet.odds.toString(),
                                                stake: bet.stake.toString(),
                                                status: bet.status,
                                                cashoutValue: bet.cashoutValue?.toString() || ''
                                            });
                                            setActiveTab('register');
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

          {activeTab === 'trash' && (
            <div className="space-y-6">
               <div className="space-y-8">
                {groupedHistory.map(([date, group]: [string, any]) => (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center gap-4 px-2">
                      <div className="h-[1px] flex-1 bg-border" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                        {isToday(safeNewDate(date + 'T00:00:00')) ? 'Hoje' : 
                         isYesterday(safeNewDate(date + 'T00:00:00')) ? 'Ontem' : 
                         format(safeNewDate(date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      <div className="h-[1px] flex-1 bg-border" />
                    </div>

                    <div className="glass-card overflow-hidden border border-border">
                        <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-surface border-b border-border">
                              <th className="px-6 py-4 text-[10px] font-black text-text-dim uppercase tracking-widest">Aposta na Lixeira</th>
                              <th className="px-6 py-4 text-[10px] font-black text-text-dim uppercase tracking-widest text-right">Ações</th>
                            </tr>
                          </thead>
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
            <div className="max-w-xl space-y-8">
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
                        {bankrolls.map(b => (
                            <div key={b.id} className={cn(
                                "p-4 rounded-xl border flex items-center justify-between transition-all",
                                b.id === activeBankrollId ? "bg-accent/10 border-accent" : "bg-bg border-border hover:border-text-dim/30"
                            )}>
                                <div onClick={() => {
                                    setActiveBankrollId(b.id);
                                    localStorage.setItem('STAKEWISE_ACTIVE_BANKROLL_ID', b.id);
                                }} className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-sm uppercase">{b.name}</p>
                                        {b.id === activeBankrollId && <span className="text-[8px] bg-accent text-bg px-1.5 py-0.5 rounded-full font-black">ATIVA</span>}
                                    </div>
                                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-1">
                                        Inicial: {formatCurrency(b.total)} • Unidade: {formatCurrency(b.unitSize)}
                                    </p>
                                </div>
                                {bankrolls.length > 1 && (
                                    <button 
                                        onClick={() => deleteBankroll(b.id)}
                                        className="p-2 text-text-dim hover:text-loss transition-colors"
                                        title="Excluir Banca"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
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
                                <div key={pct} className="flex flex-col p-4 bg-surface/50 border border-border rounded-xl group hover:border-accent transition-all relative">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-dim mb-1">{pct}%</span>
                                    <span className="text-sm font-black font-mono text-accent mb-3">{formatCurrency(value)}</span>
                                    <button 
                                        onClick={() => saveBankroll({ ...bankroll, unitSize: value })}
                                        className="w-full py-2 bg-surface text-[9px] font-black uppercase tracking-widest text-text-main rounded border border-border hover:border-accent hover:text-accent transition-all"
                                    >
                                        Salvar como Unidade
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass-card p-6 border-accent/20 bg-accent/5">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-accent">Sincronizar Saldo Real</h3>
                    <p className="text-[10px] text-text-dim font-bold uppercase tracking-wider mb-6">
                        Use esta opção para ajustar sua banca de forma que o "Saldo Atual" do app fique idêntico ao saldo disponível na sua casa de apostas agora.
                    </p>
                    
                    <div className="space-y-4">
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
                </div>

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
                                            onClick={() => {
                                                if (manualAiKey.trim().length > 20) {
                                                    localStorage.setItem('STAKEWISE_CUSTOM_GEMINI_KEY', manualAiKey.trim());
                                                    showToast('Configuração Salva!', 'success');
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
                                                onClick={() => {
                                                    if (confirm('Deseja remover a chave salva localmente?')) {
                                                        localStorage.removeItem('STAKEWISE_CUSTOM_GEMINI_KEY');
                                                        setManualAiKey('');
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
                        <p className="text-[9px] font-bold font-mono text-primary">v1.4.9 (Stable)</p>
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-bg border-t border-border flex items-center justify-around px-4 z-20">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'dashboard' ? "text-accent" : "text-text-dim"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Dash</span>
        </button>
        <button 
          onClick={() => setActiveTab('register')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'register' ? "text-accent" : "text-text-dim"
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Novo</span>
        </button>
        <button 
          onClick={() => setActiveTab('insights')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'insights' ? "text-accent" : "text-text-dim"
          )}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">IA</span>
        </button>
        <button 
          onClick={() => setActiveTab('bets')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'bets' ? "text-accent" : "text-text-dim"
          )}
        >
          <History className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">History</span>
        </button>
        <button 
          onClick={() => setActiveTab('trash')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'trash' ? "text-accent" : "text-text-dim"
          )}
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Trash</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'settings' ? "text-accent" : "text-text-dim"
          )}
        >
          <Settings2 className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest">Prefs</span>
        </button>
      </nav>

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
                    <button 
                      onClick={() => setBulkQueue([])}
                      className="p-2 hover:bg-surface rounded-full transition-colors"
                    >
                      <XCircle className="w-6 h-6 text-text-dim" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 p-6 space-y-4">
                    {bulkQueue.map((bet: any, idx) => (
                      <div key={idx} className="bg-surface border border-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center relative overflow-hidden group">
                        {bet.isLive && (
                           <div className="absolute top-0 right-10 px-3 py-1 bg-accent/20 border-b border-l border-accent/20 rounded-bl-lg">
                              <p className="text-[9px] font-black text-accent uppercase tracking-widest flex items-center gap-1">
                                 <Zap className="w-2.5 h-2.5" />
                                 Entrada Ao Vivo
                              </p>
                           </div>
                        )}
                        <div className="md:col-span-1">
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">{bet.sport}</p>
                          <input 
                            className="bg-transparent text-sm font-bold w-full focus:outline-none focus:text-accent truncate uppercase"
                            value={bet.event}
                            onChange={(e) => {
                              const newQueue = [...bulkQueue];
                              newQueue[idx].event = e.target.value;
                              setBulkQueue(newQueue);
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Entrada</p>
                          <input 
                            className="bg-transparent text-sm font-bold w-full focus:outline-none focus:text-accent truncate uppercase"
                            value={bet.selection}
                            onChange={(e) => {
                              const newQueue = [...bulkQueue];
                              newQueue[idx].selection = e.target.value;
                              setBulkQueue(newQueue);
                            }}
                          />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Data / Hora</p>
                           <div className="flex items-center gap-2">
                              <input 
                                type="datetime-local"
                                className="bg-transparent text-xs font-bold w-full focus:outline-none focus:text-accent uppercase text-text-dim"
                                value={new Date(new Date(bet.date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                onChange={(e) => {
                                  const newQueue = [...bulkQueue];
                                  newQueue[idx].date = new Date(e.target.value).toISOString();
                                  newQueue[idx].isLive = false; // Manually adjusted date usually means not "live" anymore
                                  setBulkQueue(newQueue);
                                }}
                              />
                           </div>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Stake</p>
                            <input 
                              type="number"
                              className="bg-transparent text-sm font-bold w-full focus:outline-none focus:text-accent uppercase"
                              value={bet.stake}
                              onChange={(e) => {
                                const newQueue = [...bulkQueue];
                                newQueue[idx].stake = Number(e.target.value);
                                setBulkQueue(newQueue);
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Odd</p>
                            <input 
                              type="number"
                              className="bg-transparent text-sm font-bold w-full focus:outline-none focus:text-accent uppercase"
                              value={bet.odds}
                              onChange={(e) => {
                                const newQueue = [...bulkQueue];
                                newQueue[idx].odds = Number(e.target.value);
                                setBulkQueue(newQueue);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                           <button 
                             type="button"
                             onClick={() => {
                               const newQueue = bulkQueue.filter((_, i) => i !== idx);
                               setBulkQueue(newQueue);
                             }}
                             className="p-2 hover:bg-loss/10 text-loss rounded-md transition-colors"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
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
              successToast.type === 'success' ? "border-accent shadow-accent/20" : "border-text-dim shadow-black/40"
            )}>
              <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                successToast.type === 'success' ? "bg-accent/10 text-accent" : "bg-text-dim/10 text-text-dim"
              )}>
                <CheckCircle2 className="w-5 h-5" />
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
      <span className="flex items-center gap-2 px-2 py-1 rounded text-[10px] font-black tracking-wider bg-accent/20 text-accent animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        SINC...
      </span>
    )
  }

  const configs = {
    won: { label: 'WIN', class: 'bg-accent/10 text-accent' },
    half_win: { label: 'HALF WIN', class: 'bg-accent/10 text-accent border border-accent/30' },
    lost: { label: 'LOSS', class: 'bg-loss/10 text-loss' },
    half_loss: { label: 'HALF LOSS', class: 'bg-loss/10 text-loss border border-loss/30' },
    void: { label: 'VOID', class: 'bg-refund/10 text-refund' },
    pending: { label: 'PENDENTE', class: 'bg-text-dim/10 text-text-dim' },
    cashout: { label: 'CASH OUT', class: 'bg-amber-500/10 text-amber-500' },
  }
  
  const config = configs[status]

  return (
    <span className={cn(
      "status-pill px-2 py-1 rounded text-[10px] font-black tracking-wider",
      config.class
    )}>
      {config.label}
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
