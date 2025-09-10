import { type Address } from 'gill';

/**
 * $PILLS Token Configuration
 */
export const PILLS_TOKEN = {
  // This would be the actual $PILLS token mint address on Solana
  mintAddress: 'PILLS1234567890123456789012345678901234567' as Address,
  symbol: 'PILLS',
  name: 'Pills Token',
  decimals: 6,
};

/**
 * Market Period (Epoch) - 24 hour periods for KOL betting
 */
export interface MarketPeriod {
  /** Unique period identifier */
  id: string;
  /** Period number (incremental) */
  epochNumber: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Whether this period is currently active */
  isActive: boolean;
  /** Whether this period has been resolved */
  isResolved: boolean;
  /** Winning KOL address (if resolved) */
  winner?: Address;
  /** Total volume traded in this period */
  totalVolume: number;
}

/**
 * KOL Share - represents a bet on a specific KOL
 */
export interface KOLShare {
  /** Market period this share belongs to */
  periodId: string;
  /** KOL address this share represents */
  kolAddress: Address;
  /** Current price per share in PILLS */
  pricePerShare: number;
  /** Total shares outstanding for this KOL */
  totalShares: number;
  /** Total PILLS invested in this KOL */
  totalInvested: number;
  /** Current market probability (0-1) */
  probability: number;
  /** Last price update timestamp */
  lastUpdated: number;
}

/**
 * User Position - tracks user's holdings in a specific KOL
 */
export interface UserPosition {
  /** User wallet address */
  userAddress: Address;
  /** Market period */
  periodId: string;
  /** KOL address */
  kolAddress: Address;
  /** Number of shares owned */
  sharesOwned: number;
  /** Average price paid per share */
  averagePrice: number;
  /** Total PILLS invested */
  totalInvested: number;
  /** Current market value */
  currentValue: number;
  /** Unrealized P&L */
  unrealizedPnL: number;
  /** Last trade timestamp */
  lastTradeAt: number;
}

/**
 * Trade Order - buy or sell shares
 */
export interface TradeOrder {
  /** Unique order ID */
  id: string;
  /** User wallet address */
  userAddress: Address;
  /** Market period */
  periodId: string;
  /** KOL address */
  kolAddress: Address;
  /** Order type */
  type: 'buy' | 'sell';
  /** Number of shares */
  shares: number;
  /** Price per share in PILLS */
  pricePerShare: number;
  /** Total value (shares * pricePerShare) */
  totalValue: number;
  /** Order status */
  status: 'pending' | 'filled' | 'cancelled' | 'failed';
  /** Transaction signature */
  signature?: string;
  /** Created timestamp */
  createdAt: number;
  /** Filled timestamp */
  filledAt?: number;
}

/**
 * Market Summary - overall market stats for a period
 */
export interface MarketSummary {
  /** Market period */
  period: MarketPeriod;
  /** All KOL shares in this market */
  kolShares: KOLShare[];
  /** Total market volume */
  totalVolume: number;
  /** Number of active traders */
  activeTraders: number;
  /** Total shares outstanding across all KOLs */
  totalShares: number;
  /** Most popular KOL (by volume) */
  mostPopular?: Address;
  /** Current favorite (highest probability) */
  currentFavorite?: Address;
}

/**
 * User Portfolio - user's complete portfolio across all markets
 */
export interface UserPortfolio {
  /** User wallet address */
  userAddress: Address;
  /** PILLS balance */
  pillsBalance: number;
  /** All active positions */
  positions: UserPosition[];
  /** Total portfolio value in PILLS */
  totalValue: number;
  /** Total unrealized P&L */
  totalPnL: number;
  /** Recent trades */
  recentTrades: TradeOrder[];
  /** Win/loss record */
  stats: {
    totalMarkets: number;
    wonMarkets: number;
    lostMarkets: number;
    totalInvested: number;
    totalReturned: number;
    netProfit: number;
  };
}

/**
 * Market Resolution - final results when period ends
 */
export interface MarketResolution {
  /** Market period */
  periodId: string;
  /** Winning KOL address */
  winner: Address;
  /** Final leaderboard positions */
  finalRanking: Array<{
    kolAddress: Address;
    rank: number;
    pnlSol: number;
  }>;
  /** Payout per winning share */
  payoutPerShare: number;
  /** Total winning shares */
  totalWinningShares: number;
  /** Total prize pool */
  totalPrizePool: number;
  /** Resolution timestamp */
  resolvedAt: number;
}

/**
 * Real-time Market Event - for live updates
 */
export interface MarketEvent {
  /** Event type */
  type: 'trade' | 'price_update' | 'new_period' | 'resolution';
  /** Event timestamp */
  timestamp: number;
  /** Period ID */
  periodId: string;
  /** Event data */
  data: {
    kolAddress?: Address;
    userAddress?: Address;
    shares?: number;
    price?: number;
    newPrice?: number;
    probability?: number;
  };
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Trading Constants
 */
export const TRADING_CONFIG = {
  /** Minimum bet amount in PILLS */
  MIN_BET: 1,
  /** Maximum bet amount in PILLS (no limit = -1) */
  MAX_BET: -1,
  /** Trading fee percentage (0 = no fees) */
  TRADING_FEE: 0,
  /** Market maker fee for liquidity */
  MARKET_MAKER_FEE: 0,
  /** Minimum shares per trade */
  MIN_SHARES: 0.01,
  /** Price precision (decimal places) */
  PRICE_PRECISION: 4,
} as const;

/**
 * Market States
 */
export enum MarketState {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  RESOLVING = 'resolving',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

/**
 * Error Types
 */
export enum MarketError {
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  INVALID_AMOUNT = 'invalid_amount',
  MARKET_CLOSED = 'market_closed',
  POSITION_NOT_FOUND = 'position_not_found',
  TRANSACTION_FAILED = 'transaction_failed',
  ALREADY_RESOLVED = 'already_resolved',
}