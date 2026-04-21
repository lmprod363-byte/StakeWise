export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'cashout' | 'half_win' | 'half_loss';
export type BetResult = 'PENDING' | 'WIN' | 'LOSS' | 'VOID';
export type TransactionType = 'withdrawal' | 'deposit' | 'transfer' | 'adjustment';

export interface Bet {
  id: string;
  date: string;
  sport: string;
  event: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  status: BetStatus;
  profit: number;
  bookmaker?: string;
  notes?: string;
  cashoutValue?: number;
  deleted?: boolean;
  bankrollId: string;
}

export interface Bankroll {
  id: string;
  name: string;
  total: number;
  unitSize: number;
  userId: string;
  createdAt: any;
}

export interface Stats {
  totalBets: number;
  winRate: number;
  totalProfit: number;
  roi: number;
  unitsWon: number;
}

export interface BankrollStats extends Stats {
  yield: number;
}

export interface Transaction {
  id: string;
  userId: string;
  bankrollId: string;
  date: string;
  amount: number;
  type: TransactionType;
  fromBookmaker?: string;
  toBookmaker?: string;
  notes?: string;
  deleted?: boolean;
  createdAt?: any;
  updatedAt?: any;
}
