import type { 
  MarketPeriod, 
  KOLShare, 
  UserPosition, 
  TradeOrder,
  MarketSummary,
  UserPortfolio 
} from './pills-market-types';
import { TRADING_CONFIG, MarketError } from './pills-market-types';
import type { Address } from 'gill';
import { getKOLByAddress } from './kol-data';

/**
 * Automated Market Maker for KOL prediction markets
 * Uses constant product formula with modifications for prediction markets
 */
export class PillsMarketEngine {
  /**
   * Calculate share price using automated market maker formula
   * Price increases as more people bet on a KOL, decreases as others gain popularity
   */
  calculateSharePrice(
    kolShares: KOLShare[], 
    kolAddress: Address, 
    shareAmount: number,
    isBuy: boolean
  ): number {
    const targetKOL = kolShares.find(share => share.kolAddress === kolAddress);
    if (!targetKOL) throw new Error('KOL not found in market');

    // Base price starts at 0.50 PILLS (50% probability distributed equally)
    const basePrice = 0.50;
    
    // Calculate total market investment
    const totalInvested = kolShares.reduce((sum, share) => sum + share.totalInvested, 0);
    
    if (totalInvested === 0) {
      return basePrice;
    }
    
    // Current market share (percentage of total investment)
    const currentMarketShare = targetKOL.totalInvested / totalInvested;
    
    // Simulate the trade to see new market state
    const tradeValue = shareAmount * (isBuy ? 1 : -1);
    const newInvestment = Math.max(0, targetKOL.totalInvested + tradeValue);
    const newTotalInvested = totalInvested + (isBuy ? tradeValue : 0);
    
    // New market share after trade
    const newMarketShare = newInvestment / Math.max(newTotalInvested, 1);
    
    // Price based on market share with exponential curve
    // Higher market share = exponentially higher price
    const priceCurve = Math.pow(newMarketShare * 2, 1.5);
    const newPrice = Math.min(0.95, Math.max(0.05, basePrice + priceCurve));
    
    return Math.round(newPrice * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Calculate all probabilities for KOLs in a market
   * Probabilities must sum to 100%
   */
  calculateProbabilities(kolShares: KOLShare[]): Record<string, number> {
    const totalInvested = kolShares.reduce((sum, share) => sum + share.totalInvested, 0);
    
    if (totalInvested === 0) {
      // Equal probability for all KOLs when no bets placed
      const equalProb = 1 / kolShares.length;
      return kolShares.reduce((acc, share) => ({
        ...acc,
        [share.kolAddress]: equalProb
      }), {});
    }
    
    // Probability based on investment share with softmax normalization
    const softmaxDenominator = kolShares.reduce((sum, share) => {
      const marketShare = share.totalInvested / totalInvested;
      return sum + Math.exp(marketShare * 5); // Scale factor for sharpness
    }, 0);
    
    return kolShares.reduce((acc, share) => {
      const marketShare = share.totalInvested / totalInvested;
      const probability = Math.exp(marketShare * 5) / softmaxDenominator;
      return {
        ...acc,
        [share.kolAddress]: Math.round(probability * 10000) / 10000
      };
    }, {});
  }

  /**
   * Execute a buy order
   */
  async executeBuyOrder(
    userAddress: Address,
    periodId: string,
    kolAddress: Address,
    pillsAmount: number,
    currentShares: KOLShare[]
  ): Promise<{ order: TradeOrder; newPrice: number; sharesReceived: number }> {
    // Validate minimum bet
    if (pillsAmount < TRADING_CONFIG.MIN_BET) {
      throw new Error(MarketError.INVALID_AMOUNT);
    }

    // Calculate current price and shares received
    const currentPrice = this.calculateSharePrice(currentShares, kolAddress, 0, true);
    const sharesReceived = pillsAmount / currentPrice;
    
    // Calculate new price after purchase
    const newPrice = this.calculateSharePrice(currentShares, kolAddress, pillsAmount, true);
    
    const order: TradeOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userAddress,
      periodId,
      kolAddress,
      type: 'buy',
      shares: sharesReceived,
      pricePerShare: currentPrice,
      totalValue: pillsAmount,
      status: 'pending',
      createdAt: Date.now(),
    };
    
    return { order, newPrice, sharesReceived };
  }

  /**
   * Execute a sell order
   */
  async executeSellOrder(
    userAddress: Address,
    periodId: string,
    kolAddress: Address,
    sharesAmount: number,
    currentShares: KOLShare[],
    userPosition: UserPosition
  ): Promise<{ order: TradeOrder; newPrice: number; pillsReceived: number }> {
    // Validate user has enough shares
    if (sharesAmount > userPosition.sharesOwned) {
      throw new Error(MarketError.INSUFFICIENT_FUNDS);
    }

    // Calculate current price and PILLS received
    const currentPrice = this.calculateSharePrice(currentShares, kolAddress, 0, false);
    const pillsReceived = sharesAmount * currentPrice;
    
    // Calculate new price after sale
    const newPrice = this.calculateSharePrice(currentShares, kolAddress, -pillsReceived, false);
    
    const order: TradeOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userAddress,
      periodId,
      kolAddress,
      type: 'sell',
      shares: sharesAmount,
      pricePerShare: currentPrice,
      totalValue: pillsReceived,
      status: 'pending',
      createdAt: Date.now(),
    };
    
    return { order, newPrice, pillsReceived };
  }

  /**
   * Update KOL share after a trade is executed
   */
  updateKOLShareAfterTrade(
    kolShare: KOLShare,
    order: TradeOrder,
    newPrice: number
  ): KOLShare {
    const isBuy = order.type === 'buy';
    
    return {
      ...kolShare,
      pricePerShare: newPrice,
      totalShares: kolShare.totalShares + (isBuy ? order.shares : -order.shares),
      totalInvested: kolShare.totalInvested + (isBuy ? order.totalValue : -order.totalValue),
      lastUpdated: Date.now(),
      probability: 0, // Will be recalculated by calling calculateProbabilities
    };
  }

  /**
   * Update user position after a trade
   */
  updateUserPosition(
    existingPosition: UserPosition | undefined,
    order: TradeOrder,
    userAddress: Address
  ): UserPosition {
    if (!existingPosition) {
      // New position
      if (order.type === 'sell') {
        throw new Error(MarketError.POSITION_NOT_FOUND);
      }
      
      return {
        userAddress,
        periodId: order.periodId,
        kolAddress: order.kolAddress,
        sharesOwned: order.shares,
        averagePrice: order.pricePerShare,
        totalInvested: order.totalValue,
        currentValue: order.totalValue,
        unrealizedPnL: 0,
        lastTradeAt: order.createdAt,
      };
    }

    // Update existing position
    if (order.type === 'buy') {
      const newTotalShares = existingPosition.sharesOwned + order.shares;
      const newTotalInvested = existingPosition.totalInvested + order.totalValue;
      const newAveragePrice = newTotalInvested / newTotalShares;
      
      return {
        ...existingPosition,
        sharesOwned: newTotalShares,
        averagePrice: newAveragePrice,
        totalInvested: newTotalInvested,
        currentValue: newTotalShares * order.pricePerShare,
        unrealizedPnL: (newTotalShares * order.pricePerShare) - newTotalInvested,
        lastTradeAt: order.createdAt,
      };
    } else {
      // Sell order
      const newTotalShares = existingPosition.sharesOwned - order.shares;
      const realizedPnL = (order.pricePerShare - existingPosition.averagePrice) * order.shares;
      
      if (newTotalShares <= 0) {
        // Position closed
        return {
          ...existingPosition,
          sharesOwned: 0,
          currentValue: 0,
          unrealizedPnL: 0,
          lastTradeAt: order.createdAt,
        };
      }
      
      return {
        ...existingPosition,
        sharesOwned: newTotalShares,
        currentValue: newTotalShares * order.pricePerShare,
        unrealizedPnL: (newTotalShares * order.pricePerShare) - (existingPosition.totalInvested - order.totalValue),
        lastTradeAt: order.createdAt,
      };
    }
  }

  /**
   * Generate market summary with current state
   */
  generateMarketSummary(
    period: MarketPeriod,
    kolShares: KOLShare[],
    activeTraders: number
  ): MarketSummary {
    const totalVolume = kolShares.reduce((sum, share) => sum + share.totalInvested, 0);
    const totalShares = kolShares.reduce((sum, share) => sum + share.totalShares, 0);
    
    // Find most popular and current favorite
    const mostPopular = kolShares.reduce((max, share) => 
      share.totalInvested > (max?.totalInvested || 0) ? share : max
    , kolShares[0])?.kolAddress;
    
    const currentFavorite = kolShares.reduce((max, share) =>
      share.probability > (max?.probability || 0) ? share : max
    , kolShares[0])?.kolAddress;
    
    return {
      period,
      kolShares: kolShares.map(share => ({
        ...share,
        probability: this.calculateProbabilities(kolShares)[share.kolAddress] || 0
      })),
      totalVolume,
      activeTraders,
      totalShares,
      mostPopular,
      currentFavorite,
    };
  }

  /**
   * Calculate market resolution payouts
   */
  calculateMarketResolution(
    periodId: string,
    winningKOLAddress: Address,
    kolShares: KOLShare[],
    finalRanking: Array<{ kolAddress: Address; rank: number; pnlSol: number }>
  ) {
    const winningKOLShare = kolShares.find(share => share.kolAddress === winningKOLAddress);
    if (!winningKOLShare) throw new Error('Winning KOL not found');
    
    const totalPrizePool = kolShares.reduce((sum, share) => sum + share.totalInvested, 0);
    const totalWinningShares = winningKOLShare.totalShares;
    const payoutPerShare = totalWinningShares > 0 ? totalPrizePool / totalWinningShares : 0;
    
    return {
      periodId,
      winner: winningKOLAddress,
      finalRanking,
      payoutPerShare,
      totalWinningShares,
      totalPrizePool,
      resolvedAt: Date.now(),
    };
  }

  /**
   * Format PILLS amount for display
   */
  formatPILLS(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M PILLS`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K PILLS`;
    }
    return `${amount.toFixed(2)} PILLS`;
  }

  /**
   * Format share price for display
   */
  formatSharePrice(price: number): string {
    return `${price.toFixed(TRADING_CONFIG.PRICE_PRECISION)} PILLS`;
  }

  /**
   * Format probability as percentage
   */
  formatProbability(probability: number): string {
    return `${(probability * 100).toFixed(1)}%`;
  }
}

// Export singleton instance
export const pillsMarketEngine = new PillsMarketEngine();