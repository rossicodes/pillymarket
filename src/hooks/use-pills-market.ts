'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSolana } from '@/components/solana/use-solana';
import { pillsMarketEngine } from '@/lib/pills-market-engine';
import { TRACKED_KOLS } from '@/lib/kol-data';
import type { 
  MarketPeriod, 
  KOLShare, 
  UserPosition, 
  TradeOrder,
  MarketSummary,
  UserPortfolio 
} from '@/lib/pills-market-types';
import { PILLS_TOKEN, TRADING_CONFIG } from '@/lib/pills-market-types';
import type { Address } from 'gill';

/**
 * Hook for managing the current market period and KOL shares
 */
export function useMarketData() {
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate current market period (24h from current midnight UTC)
  const currentPeriod = useMemo((): MarketPeriod => {
    const now = Date.now();
    const currentDate = new Date(now);
    
    // Get start of current day in UTC
    const startTime = new Date(
      currentDate.getUTCFullYear(), 
      currentDate.getUTCMonth(), 
      currentDate.getUTCDate()
    ).getTime();
    const endTime = startTime + (24 * 60 * 60 * 1000);
    
    return {
      id: `period_${startTime}`,
      epochNumber: Math.floor(startTime / (24 * 60 * 60 * 1000)),
      startTime,
      endTime,
      isActive: now >= startTime && now < endTime,
      isResolved: now >= endTime,
      totalVolume: 0,
    };
  }, []);

  // Initialize KOL shares for current period
  const initializeKOLShares = useCallback((): KOLShare[] => {
    return TRACKED_KOLS.map(kol => ({
      periodId: currentPeriod.id,
      kolAddress: kol.address,
      pricePerShare: 0.50, // Start at base price (equal probability)
      totalShares: 0,
      totalInvested: 0,
      probability: 1 / TRACKED_KOLS.length, // Equal probability initially
      lastUpdated: Date.now(),
    }));
  }, [currentPeriod.id]);

  // Load market data (in production, this would come from API/database)
  const loadMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In production, fetch from API
      // For now, initialize with empty market
      const kolShares = initializeKOLShares();
      const probabilities = pillsMarketEngine.calculateProbabilities(kolShares);
      
      const updatedShares = kolShares.map(share => ({
        ...share,
        probability: probabilities[share.kolAddress] || 0
      }));
      
      const summary = pillsMarketEngine.generateMarketSummary(
        currentPeriod,
        updatedShares,
        0 // activeTraders - would come from API
      );
      
      setMarketSummary(summary);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod, initializeKOLShares]);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  // Refresh market data
  const refresh = useCallback(() => {
    loadMarketData();
  }, [loadMarketData]);

  return {
    marketSummary,
    currentPeriod,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for user's PILLS balance and portfolio
 */
export function useUserPortfolio() {
  const { account } = useSolana();
  const userAddress = account?.address;
  
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null);
  const [pillsBalance, setPillsBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user portfolio (in production, from API)
  const loadPortfolio = useCallback(async () => {
    if (!userAddress) {
      setPortfolio(null);
      setPillsBalance(0);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // In production, fetch from API
      // For demo, start with some PILLS balance
      const demoBalance = 1000; // 1000 PILLS for testing
      setPillsBalance(demoBalance);
      
      const demoPortfolio: UserPortfolio = {
        userAddress: userAddress as Address,
        pillsBalance: demoBalance,
        positions: [], // Would load from API
        totalValue: demoBalance,
        totalPnL: 0,
        recentTrades: [],
        stats: {
          totalMarkets: 0,
          wonMarkets: 0,
          lostMarkets: 0,
          totalInvested: 0,
          totalReturned: 0,
          netProfit: 0,
        },
      };
      
      setPortfolio(demoPortfolio);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Update PILLS balance
  const updateBalance = useCallback((newBalance: number) => {
    setPillsBalance(newBalance);
    if (portfolio) {
      setPortfolio({
        ...portfolio,
        pillsBalance: newBalance,
        totalValue: newBalance + portfolio.positions.reduce((sum, pos) => sum + pos.currentValue, 0),
      });
    }
  }, [portfolio]);

  return {
    portfolio,
    pillsBalance,
    isLoading,
    error,
    updateBalance,
    refresh: loadPortfolio,
  };
}

/**
 * Hook for trading operations (buy/sell shares)
 */
export function useTrading() {
  const { account } = useSolana();
  const userAddress = account?.address;
  const { marketSummary, refresh: refreshMarket } = useMarketData();
  const { pillsBalance, updateBalance } = useUserPortfolio();
  
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buy shares
  const buyShares = useCallback(async (
    kolAddress: Address,
    pillsAmount: number
  ): Promise<{ success: boolean; order?: TradeOrder; error?: string }> => {
    if (!userAddress || !marketSummary) {
      return { success: false, error: 'Wallet not connected or market not loaded' };
    }

    if (pillsAmount > pillsBalance) {
      return { success: false, error: 'Insufficient PILLS balance' };
    }

    if (pillsAmount < TRADING_CONFIG.MIN_BET) {
      return { success: false, error: `Minimum bet is ${TRADING_CONFIG.MIN_BET} PILLS` };
    }

    try {
      setIsTrading(true);
      setError(null);
      
      // Execute buy order using market engine
      const result = await pillsMarketEngine.executeBuyOrder(
        userAddress as Address,
        marketSummary.period.id,
        kolAddress,
        pillsAmount,
        marketSummary.kolShares
      );
      
      // In production, this would:
      // 1. Submit transaction to Solana
      // 2. Wait for confirmation
      // 3. Update database
      // 4. Emit real-time events
      
      // For demo, simulate successful transaction
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      // Update local state
      updateBalance(pillsBalance - pillsAmount);
      result.order.status = 'filled';
      result.order.filledAt = Date.now();
      
      // Refresh market data to show updated prices
      refreshMarket();
      
      return { success: true, order: result.order };
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Trade failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
      
    } finally {
      setIsTrading(false);
    }
  }, [userAddress, marketSummary, pillsBalance, updateBalance, refreshMarket]);

  // Sell shares
  const sellShares = useCallback(async (
    kolAddress: Address,
    sharesAmount: number
  ): Promise<{ success: boolean; order?: TradeOrder; error?: string }> => {
    if (!userAddress || !marketSummary) {
      return { success: false, error: 'Wallet not connected or market not loaded' };
    }

    // In production, would check user's actual position from database
    // For demo, assume user has shares to sell
    const mockPosition: UserPosition = {
      userAddress: userAddress as Address,
      periodId: marketSummary.period.id,
      kolAddress,
      sharesOwned: sharesAmount, // Demo: assume user has enough shares
      averagePrice: 0.50,
      totalInvested: sharesAmount * 0.50,
      currentValue: 0,
      unrealizedPnL: 0,
      lastTradeAt: Date.now(),
    };

    try {
      setIsTrading(true);
      setError(null);
      
      // Execute sell order using market engine
      const result = await pillsMarketEngine.executeSellOrder(
        userAddress as Address,
        marketSummary.period.id,
        kolAddress,
        sharesAmount,
        marketSummary.kolShares,
        mockPosition
      );
      
      // Simulate successful transaction
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      updateBalance(pillsBalance + result.pillsReceived);
      result.order.status = 'filled';
      result.order.filledAt = Date.now();
      
      // Refresh market data
      refreshMarket();
      
      return { success: true, order: result.order };
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sell failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
      
    } finally {
      setIsTrading(false);
    }
  }, [userAddress, marketSummary, pillsBalance, updateBalance, refreshMarket]);

  // Get current price for a KOL
  const getKOLPrice = useCallback((kolAddress: Address): number => {
    if (!marketSummary) return 0.50; // Default price
    
    const kolShare = marketSummary.kolShares.find(share => share.kolAddress === kolAddress);
    return kolShare?.pricePerShare || 0.50;
  }, [marketSummary]);

  // Calculate shares for PILLS amount
  const calculateShares = useCallback((kolAddress: Address, pillsAmount: number): number => {
    const price = getKOLPrice(kolAddress);
    return pillsAmount / price;
  }, [getKOLPrice]);

  // Calculate PILLS for shares amount
  const calculatePILLS = useCallback((kolAddress: Address, sharesAmount: number): number => {
    const price = getKOLPrice(kolAddress);
    return sharesAmount * price;
  }, [getKOLPrice]);

  return {
    buyShares,
    sellShares,
    getKOLPrice,
    calculateShares,
    calculatePILLS,
    isTrading,
    error,
    canTrade: !!userAddress && !!marketSummary && !isTrading,
  };
}

/**
 * Hook for formatting market values
 */
export function useMarketFormatters() {
  const formatPILLS = useCallback((amount: number): string => {
    return pillsMarketEngine.formatPILLS(amount);
  }, []);

  const formatPrice = useCallback((price: number): string => {
    return pillsMarketEngine.formatSharePrice(price);
  }, []);

  const formatProbability = useCallback((probability: number): string => {
    return pillsMarketEngine.formatProbability(probability);
  }, []);

  const formatShares = useCallback((shares: number): string => {
    if (shares >= 1000) {
      return `${(shares / 1000).toFixed(1)}K`;
    }
    return shares.toFixed(2);
  }, []);

  return {
    formatPILLS,
    formatPrice,
    formatProbability,
    formatShares,
  };
}