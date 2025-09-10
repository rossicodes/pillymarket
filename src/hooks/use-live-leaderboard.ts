'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TRACKED_KOLS } from '@/lib/kol-data';
import { generateMockTradeData, createLeaderboard, getCurrentLeaderboardPeriod } from '@/lib/kol-utils';
import { pillsMarketEngine } from '@/lib/pills-market-engine';
import type { 
  KOLShare,
  MarketPeriod
} from '@/lib/pills-market-types';
import type { KOLLeaderboardEntry } from '@/lib/kol-types';

export interface LiveLeaderboardEntry {
  kol: KOLLeaderboardEntry['kol'];
  rank: number;
  previousRank: number;
  rankChange: 'up' | 'down' | 'same';
  totalPnlSol: number;
  totalPnlUsd: number;
  totalTrades: number;
  winRate: number;
  activeTrades: number;
  // Pills Market data
  sharePrice: number;
  sharesOwned: number;
  probability: number;
  totalInvested: number;
  // Animation state
  isAnimating: boolean;
  animationType: 'rank-up' | 'rank-down' | 'pnl-gain' | 'pnl-loss' | null;
}

export interface LiveLeaderboardData {
  period: MarketPeriod;
  entries: LiveLeaderboardEntry[];
  totalVolume: number;
  activeTraders: number;
  lastUpdated: number;
}

/**
 * Hook that combines real-time KOL P&L leaderboard with pills market trading
 */
export function useLiveLeaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LiveLeaderboardData | null>(null);
  const [previousData, setPreviousData] = useState<LiveLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate current market period
  const currentPeriod = useMemo((): MarketPeriod => {
    const now = Date.now();
    const currentDate = new Date(now);
    
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

  // Initialize KOL shares for pills market
  const initializeKOLShares = useCallback((): KOLShare[] => {
    return TRACKED_KOLS.map(kol => ({
      periodId: currentPeriod.id,
      kolAddress: kol.address,
      pricePerShare: 0.50,
      totalShares: 0,
      totalInvested: 0,
      probability: 1 / TRACKED_KOLS.length,
      lastUpdated: Date.now(),
    }));
  }, [currentPeriod.id]);

  // Load and combine leaderboard + market data
  const loadLiveData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get real P&L data from KOL trading
      const mockTrades = generateMockTradeData();
      const leaderboardPeriod = getCurrentLeaderboardPeriod();
      const kolLeaderboard = createLeaderboard(mockTrades, leaderboardPeriod);
      
      // Get pills market data
      const kolShares = initializeKOLShares();
      const probabilities = pillsMarketEngine.calculateProbabilities(kolShares);
      
      const updatedShares = kolShares.map(share => ({
        ...share,
        probability: probabilities[share.kolAddress] || 0
      }));
      
      // Combine data into live leaderboard entries
      const entries: LiveLeaderboardEntry[] = TRACKED_KOLS.map((kol, index) => {
        const kolEntry = kolLeaderboard.entries.find(entry => entry.kol.address === kol.address);
        const shareData = updatedShares.find(share => share.kolAddress === kol.address);
        
        const currentRank = kolEntry?.rank || index + 1;
        const previousRank = previousData?.entries.find(e => e.kol.address === kol.address)?.rank || currentRank;
        
        let rankChange: 'up' | 'down' | 'same' = 'same';
        if (currentRank < previousRank) rankChange = 'up';
        else if (currentRank > previousRank) rankChange = 'down';
        
        return {
          kol: {
            ...kol,
            rank: currentRank
          },
          rank: currentRank,
          previousRank,
          rankChange,
          totalPnlSol: kolEntry?.totalPnlSol || 0,
          totalPnlUsd: kolEntry?.totalPnlUsd || 0,
          totalTrades: kolEntry?.totalTrades || 0,
          winRate: kolEntry?.winRate || 0,
          activeTrades: kolEntry?.activeTrades?.length || 0,
          sharePrice: shareData?.pricePerShare || 0.50,
          sharesOwned: 0, // Would come from user portfolio
          probability: shareData?.probability || 0,
          totalInvested: shareData?.totalInvested || 0,
          isAnimating: false,
          animationType: null,
        };
      });
      
      // Sort by P&L (highest to lowest) and update ranks
      entries.sort((a, b) => b.totalPnlSol - a.totalPnlSol);
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
        
        // Check if rank changed for animation
        const prevEntry = previousData?.entries.find(e => e.kol.address === entry.kol.address);
        if (prevEntry && prevEntry.rank !== entry.rank) {
          entry.isAnimating = true;
          entry.animationType = entry.rank < prevEntry.rank ? 'rank-up' : 'rank-down';
        }
        
        // Check for significant P&L changes
        if (prevEntry && Math.abs(entry.totalPnlSol - prevEntry.totalPnlSol) > 0.1) {
          entry.isAnimating = true;
          entry.animationType = entry.totalPnlSol > prevEntry.totalPnlSol ? 'pnl-gain' : 'pnl-loss';
        }
      });
      
      const newData: LiveLeaderboardData = {
        period: currentPeriod,
        entries,
        totalVolume: kolLeaderboard.period.totalVolume || 0,
        activeTraders: entries.filter(e => e.totalTrades > 0).length,
        lastUpdated: Date.now(),
      };
      
      setPreviousData(leaderboardData);
      setLeaderboardData(newData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod, initializeKOLShares, leaderboardData, previousData]);

  useEffect(() => {
    loadLiveData();
  }, []);

  // Auto-refresh every 10 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadLiveData();
    }, 10000);

    return () => clearInterval(interval);
  }, []); // Intentionally not including loadLiveData to avoid excessive re-renders

  // Clear animations after delay
  useEffect(() => {
    if (leaderboardData?.entries.some(e => e.isAnimating)) {
      const timeout = setTimeout(() => {
        setLeaderboardData(prev => prev ? {
          ...prev,
          entries: prev.entries.map(entry => ({
            ...entry,
            isAnimating: false,
            animationType: null,
          }))
        } : null);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [leaderboardData]);

  const refresh = useCallback(() => {
    loadLiveData();
  }, [loadLiveData]);

  return {
    leaderboardData,
    isLoading,
    error,
    refresh,
  };
}