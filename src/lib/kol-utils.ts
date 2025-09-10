import type { 
  Trade, 
  TradeTransaction, 
  KOLLeaderboardEntry, 
  LeaderboardPeriod,
  LeaderboardData,
  TokenInfo 
} from './kol-types';
import { getKOLByAddress } from './kol-data';

/**
 * Calculate P&L for a completed trade
 */
export function calculateTradePnL(trade: Trade): { pnlSol: number; pnlUsd: number } {
  const totalBought = trade.totalBuyAmount;
  const totalSold = trade.totalSellAmount;
  const pnlSol = totalSold - totalBought;
  
  // For now, use a mock SOL price - in production this would come from an API
  const solPriceUsd = 213.45;
  const pnlUsd = pnlSol * solPriceUsd;
  
  return { pnlSol, pnlUsd };
}

/**
 * Determine if a trade is complete based on buy/sell amounts
 */
export function isTradeComplete(trade: Trade): boolean {
  // A trade is considered complete if the total token amount sold >= total token amount bought
  const totalTokensBought = trade.buys.reduce((sum, buy) => sum + buy.tokenAmount, 0);
  const totalTokensSold = trade.sells.reduce((sum, sell) => sum + sell.tokenAmount, 0);
  
  // Allow for small rounding differences (0.1% tolerance)
  const tolerance = totalTokensBought * 0.001;
  return totalTokensSold >= (totalTokensBought - tolerance);
}

/**
 * Calculate win rate for a KOL
 */
export function calculateWinRate(winningTrades: number, losingTrades: number): number {
  const totalTrades = winningTrades + losingTrades;
  if (totalTrades === 0) return 0;
  return (winningTrades / totalTrades) * 100;
}

/**
 * Create a 24-hour leaderboard period starting from the most recent midnight UTC
 */
export function getCurrentLeaderboardPeriod(): LeaderboardPeriod {
  const now = Date.now();
  const currentDate = new Date(now);
  
  // Get start of current day in UTC
  const startTime = new Date(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()).getTime();
  const endTime = startTime + (24 * 60 * 60 * 1000); // Add 24 hours
  
  return {
    startTime,
    endTime,
    isActive: now < endTime,
    periodId: `${startTime}-${endTime}`,
  };
}

/**
 * Filter trades within a specific time period
 */
export function filterTradesByPeriod(trades: Trade[], period: LeaderboardPeriod): Trade[] {
  return trades.filter(trade => 
    trade.startedAt >= period.startTime && trade.startedAt < period.endTime
  );
}

/**
 * Calculate leaderboard entry for a KOL
 */
export function calculateKOLLeaderboardEntry(
  kolAddress: string,
  trades: Trade[],
  period: LeaderboardPeriod
): KOLLeaderboardEntry | null {
  const kol = getKOLByAddress(kolAddress);
  if (!kol) return null;

  const periodTrades = filterTradesByPeriod(trades, period);
  const activeTrades = periodTrades.filter(trade => !isTradeComplete(trade));
  const completedTrades = periodTrades.filter(trade => isTradeComplete(trade));
  
  let totalPnlSol = 0;
  let totalPnlUsd = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  // Calculate P&L for completed trades only
  completedTrades.forEach(trade => {
    const { pnlSol, pnlUsd } = calculateTradePnL(trade);
    totalPnlSol += pnlSol;
    totalPnlUsd += pnlUsd;
    
    if (pnlSol > 0) {
      winningTrades++;
    } else {
      losingTrades++;
    }
  });

  const winRate = calculateWinRate(winningTrades, losingTrades);
  const lastTradeAt = periodTrades.length > 0 
    ? Math.max(...periodTrades.map(t => t.lastActivityAt))
    : undefined;

  return {
    kol,
    totalTrades: completedTrades.length,
    totalPnlSol,
    totalPnlUsd,
    winningTrades,
    losingTrades,
    winRate,
    activeTrades,
    completedTrades,
    lastTradeAt,
    rank: 0, // Will be assigned when sorting
  };
}

/**
 * Create leaderboard from KOL trades data
 */
export function createLeaderboard(
  kolTrades: Record<string, Trade[]>,
  period?: LeaderboardPeriod
): LeaderboardData {
  const currentPeriod = period || getCurrentLeaderboardPeriod();
  const entries: KOLLeaderboardEntry[] = [];

  // Calculate entries for each KOL
  Object.keys(kolTrades).forEach(kolAddress => {
    const entry = calculateKOLLeaderboardEntry(kolAddress, kolTrades[kolAddress], currentPeriod);
    if (entry) {
      entries.push(entry);
    }
  });

  // Sort by total P&L (descending) and assign ranks
  entries.sort((a, b) => b.totalPnlSol - a.totalPnlSol);
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return {
    period: currentPeriod,
    entries,
    lastUpdated: Date.now(),
    solPriceUsd: 213.45, // Mock price - replace with real API call
  };
}

/**
 * Format SOL amount for display
 */
export function formatSOL(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(2)}K SOL`;
  }
  if (Math.abs(amount) >= 1) {
    return `${amount.toFixed(3)} SOL`;
  }
  return `${amount.toFixed(6)} SOL`;
}

/**
 * Format USD amount for display
 */
export function formatUSD(amount: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  if (Math.abs(amount) >= 1000000) {
    return formatter.format(amount / 1000000) + 'M';
  }
  if (Math.abs(amount) >= 1000) {
    return formatter.format(amount / 1000) + 'K';
  }
  return formatter.format(amount);
}

/**
 * Format win rate percentage
 */
export function formatWinRate(winRate: number): string {
  return `${winRate.toFixed(1)}%`;
}

/**
 * Get time until period ends
 */
export function getTimeUntilPeriodEnd(period: LeaderboardPeriod): string {
  const now = Date.now();
  const timeLeft = period.endTime - now;
  
  if (timeLeft <= 0) return 'Ended';
  
  const hours = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Calculate trade performance metrics
 */
export function getTradePerformanceColor(pnl: number): string {
  if (pnl > 0) return 'text-green-600 dark:text-green-400';
  if (pnl < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
}

/**
 * Generate mock trade data for development
 */
export function generateMockTradeData(): Record<string, Trade[]> {
  // This will be replaced with real webhook data
  return {};
}

/**
 * Generate mock trade data with real token addresses for testing
 */
export function generateMockTradeDataWithTokens(): Record<string, Trade[]> {
  // Popular Pump.Fun tokens for testing - these are real mint addresses
  const mockTokens = [
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // PopCat
    'pumpsAhyGRKJaW5eiKEQT3p7vJk3N8TyWWpMb7m3CdSL', // Example Pump.Fun token
    'WENWENvqqNya429ubCdR81ZmD69brwQbSgd4PzLbwPE3', // WEN
  ];

  // This will be replaced with real webhook data
  // For now, return empty to maintain existing behavior
  return {};
}