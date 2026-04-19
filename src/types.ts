export type BetStatus = 'pending' | 'won' | 'lost' | 'void' | 'cashout' | 'half_win' | 'half_loss';
export type BetResult = 'PENDING' | 'WIN' | 'LOSS' | 'VOID';

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
  notes?: string;
  cashoutValue?: number;
  deleted?: boolean;
}

export interface Bankroll {
  total: number;
  unitSize: number;
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
