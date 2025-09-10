import { type Address } from 'gill';

export interface KOL {
  /** Wallet address of the KOL */
  address: Address;
  /** Display name/handle */
  name: string;
  /** Twitter handle (without @) */
  twitter: string;
  /** Profile image URL */
  avatar?: string;
  /** Whether this KOL is active in current period */
  isActive: boolean;
  /** Whether this KOL has a Telegram handle */
  telegramHandle?: boolean;
}

export interface TokenInfo {
  /** Token mint address */
  address: string;
  /** Token name */
  name: string;
  /** Token symbol/ticker */
  symbol: string;
  /** Token image URL */
  image?: string;
  /** Token decimals */
  decimals: number;
  /** When this metadata was last updated */
  lastUpdated: number;
  /** Price information if available */
  priceInfo?: {
    pricePerToken: number;
    currency: string;
  };
  /** Total token supply */
  supply?: number;
  /** Token description */
  description?: string;
  /** Token program address */
  tokenProgram?: string;
}

export interface Trade {
  /** Unique trade ID */
  id: string;
  /** KOL wallet address */
  kol: Address;
  /** Token being traded */
  token: TokenInfo;
  /** Array of buy transactions */
  buys: TradeTransaction[];
  /** Array of sell transactions */
  sells: TradeTransaction[];
  /** Total SOL spent on buys */
  totalBuyAmount: number;
  /** Total SOL received from sells */
  totalSellAmount: number;
  /** Current P&L in SOL */
  pnlSol: number;
  /** Current P&L in USD */
  pnlUsd: number;
  /** Whether the trade is still open (has remaining tokens) */
  isOpen: boolean;
  /** Timestamp of first buy */
  startedAt: number;
  /** Timestamp of last transaction */
  lastActivityAt: number;
  /** Current status */
  status: 'active' | 'completed' | 'partial_exit';
}

export interface TradeTransaction {
  /** Transaction signature */
  signature: string;
  /** Transaction type */
  type: 'BUY' | 'SELL';
  /** SOL amount */
  solAmount: number;
  /** Token amount */
  tokenAmount: number;
  /** Block timestamp */
  timestamp: number;
  /** Solana slot */
  slot: number;
  /** Transaction index for ordering */
  idx: string;
}

export interface KOLLeaderboardEntry {
  /** KOL information */
  kol: KOL;
  /** Total number of completed trades in period */
  totalTrades: number;
  /** Total P&L in SOL for the period */
  totalPnlSol: number;
  /** Total P&L in USD for the period */
  totalPnlUsd: number;
  /** Number of winning trades */
  winningTrades: number;
  /** Number of losing trades */
  losingTrades: number;
  /** Win rate percentage */
  winRate: number;
  /** Current active trades */
  activeTrades: Trade[];
  /** Completed trades for the period */
  completedTrades: Trade[];
  /** Last trade timestamp */
  lastTradeAt?: number;
  /** Current rank on leaderboard */
  rank: number;
}

export interface LeaderboardPeriod {
  /** Period start timestamp */
  startTime: number;
  /** Period end timestamp */
  endTime: number;
  /** Whether this is the current active period */
  isActive: boolean;
  /** Period identifier */
  periodId: string;
}

export interface LeaderboardData {
  /** Current leaderboard period */
  period: LeaderboardPeriod;
  /** KOL entries sorted by performance */
  entries: KOLLeaderboardEntry[];
  /** Last update timestamp */
  lastUpdated: number;
  /** Current SOL price in USD */
  solPriceUsd: number;
}

// Prediction market interface for the betting aspect
export interface KOLPredictionMarket {
  /** Market address */
  address: Address;
  /** Market title */
  title: string;
  /** Market description */
  description: string;
  /** Leaderboard period this market is for */
  period: LeaderboardPeriod;
  /** Available KOLs to bet on */
  kols: KOL[];
  /** Current odds for each KOL */
  odds: Record<Address, number>;
  /** Total pool amount */
  totalPool: bigint;
  /** Whether market is resolved */
  isResolved: boolean;
  /** Winning KOL address (if resolved) */
  winner?: Address;
  /** Market resolution timestamp */
  resolutionTime?: number;
  /** Minimum bet amount */
  minBetAmount: bigint;
  /** House fee percentage */
  houseFee: number;
}

export interface KOLBet {
  /** Bet transaction signature */
  signature: string;
  /** Bettor address */
  user: Address;
  /** KOL being bet on */
  kol: Address;
  /** Bet amount in lamports */
  amount: bigint;
  /** Expected payout if wins */
  expectedPayout: bigint;
  /** Bet timestamp */
  timestamp: number;
  /** Whether bet has been paid out */
  isPaidOut: boolean;
}

// Error types
export interface KOLTrackingError extends Error {
  code: 'TOKEN_FETCH_ERROR' | 'TRADE_PARSE_ERROR' | 'WEBHOOK_ERROR' | 'DATABASE_ERROR';
  context?: unknown;
}