'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Clock, BarChart3, TrendingUp, TrendingDown, DollarSign, Zap } from 'lucide-react'
import Link from 'next/link'
import { useTrading, useMarketFormatters } from '@/hooks/use-pills-market'
import { useLiveLeaderboard } from '@/hooks/use-live-leaderboard'
import { formatSOL, formatUSD, formatWinRate, getTradePerformanceColor } from '@/lib/kol-utils'
import type { LiveLeaderboardEntry } from '@/hooks/use-live-leaderboard'
import type { Address } from 'gill'

export function PillsMarket() {
  const { leaderboardData, isLoading, error, refresh } = useLiveLeaderboard()
  const { formatPILLS } = useMarketFormatters()

  if (isLoading) {
    return <MarketSkeleton />
  }

  if (error || !leaderboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">
          {error || 'Failed to load leaderboard data'}
        </p>
        <Button onClick={refresh}>Try Again</Button>
      </div>
    )
  }

  const timeLeft = leaderboardData.period.endTime - Date.now()
  const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000))
  const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))

  return (
    <div className="space-y-6">
      {/* Market Header */}
      <div className="text-center space-y-3">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">KOL Trading Leaderboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time rankings of top crypto KOLs trading on Pump.Fun</p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span>🔴 Live</span>
            <span>Last updated: {new Date(leaderboardData.lastUpdated).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{formatPILLS(leaderboardData.totalVolume)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Volume</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{leaderboardData.activeTraders}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Traders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{leaderboardData.entries.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">KOLs</div>
          </CardContent>
        </Card>
      </div>

      {/* Live Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="w-full flex justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Live P&L Rankings
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                Cycle Ends in {hoursLeft}h {minutesLeft}m
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboardData.entries.map((entry) => (
              <LiveLeaderboardRow key={entry.kol.address} entry={entry} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LiveLeaderboardRow({ entry }: { entry: LiveLeaderboardEntry }) {
  const [isFlashing, setIsFlashing] = useState(false)

  // Flash effect for P&L changes
  useEffect(() => {
    if (entry.isAnimating && (entry.animationType === 'pnl-gain' || entry.animationType === 'pnl-loss')) {
      setIsFlashing(true)
      const timeout = setTimeout(() => setIsFlashing(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [entry.isAnimating, entry.animationType])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankChangeIcon = () => {
    if (entry.rankChange === 'up') return <TrendingUp className="w-4 h-4 text-green-500 animate-bounce" />
    if (entry.rankChange === 'down') return <TrendingDown className="w-4 h-4 text-red-500 animate-bounce" />
    return null
  }

  return (
    <div 
      className={`
        flex items-center justify-between p-4 rounded-lg border bg-card 
        hover:bg-accent/50 transition-all duration-300
        ${entry.isAnimating && entry.animationType === 'rank-up' ? 'animate-pulse bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
        ${entry.isAnimating && entry.animationType === 'rank-down' ? 'animate-pulse bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : ''}
        ${isFlashing ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-center gap-4">
        {/* Rank with animation */}
        <div className="flex items-center gap-2 min-w-[60px]">
          <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
            {getRankIcon(entry.rank)}
          </div>
          {entry.isAnimating && getRankChangeIcon()}
        </div>

        {/* KOL Info */}
        <Avatar className="w-12 h-12 border-2 border-white/20">
          <AvatarImage src={entry.kol.avatar} alt={entry.kol.name} />
          <AvatarFallback>{entry.kol.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold text-lg">{entry.kol.name}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">@{entry.kol.twitter}</div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* P&L with flash animation */}
        <div className={`text-right transition-all duration-500 ${
          isFlashing && entry.totalPnlSol > 0 ? 'text-green-500 scale-110' : 
          isFlashing && entry.totalPnlSol < 0 ? 'text-red-500 scale-110' : ''
        }`}>
          <div className={`font-mono font-bold text-lg ${getTradePerformanceColor(entry.totalPnlSol)}`}>
            {entry.totalPnlSol >= 0 ? '+' : ''}
            {formatSOL(entry.totalPnlSol)}
          </div>
          <div className={`text-sm ${getTradePerformanceColor(entry.totalPnlUsd)}`}>
            ({entry.totalPnlUsd >= 0 ? '+' : ''}
            {formatUSD(entry.totalPnlUsd)})
          </div>
        </div>

        {/* Trading Stats */}
        <div className="text-right text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span>{entry.totalTrades} trades</span>
            {entry.activeTrades > 0 && (
              <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400">
                {entry.activeTrades} active
              </Badge>
            )}
          </div>
          <div className="text-gray-600 dark:text-gray-400">{formatWinRate(entry.winRate)} win rate</div>
        </div>

        {/* Share Price & Probability */}
        <div className="text-right text-sm">
          <div className="font-bold">${entry.sharePrice.toFixed(3)}</div>
          <div className="text-gray-600 dark:text-gray-400">{(entry.probability * 100).toFixed(1)}% chance</div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <TradingModal kolAddress={entry.kol.address as Address}>
            <Button size="sm" className="relative">
              <DollarSign className="w-4 h-4 mr-1" />
              Trade
              {entry.isAnimating && (
                <Zap className="w-3 h-3 ml-1 text-yellow-400 animate-pulse" />
              )}
            </Button>
          </TradingModal>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/kol/${entry.kol.address}`}>View</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function TradingModal({ kolAddress, children }: { kolAddress: Address; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { buyShares, sellShares, getKOLPrice, calculateShares, canTrade } = useTrading()
  const { formatShares } = useMarketFormatters()
  
  // Find KOL from leaderboard data or fallback to address lookup
  const { leaderboardData } = useLiveLeaderboard()
  const kolEntry = leaderboardData?.entries.find(e => e.kol.address === kolAddress)
  const kol = kolEntry?.kol

  if (!kol) return null

  const currentPrice = kolEntry?.sharePrice || getKOLPrice(kolAddress)
  const pillsAmount = parseFloat(amount) || 0
  const sharesAmount = calculateShares(kolAddress, pillsAmount)

  const handleTrade = async () => {
    if (!canTrade || !pillsAmount) return

    setIsSubmitting(true)

    try {
      let result
      if (tradeType === 'buy') {
        result = await buyShares(kolAddress, pillsAmount)
      } else {
        result = await sellShares(kolAddress, sharesAmount)
      }

      if (result.success) {
        setAmount('')
        setIsOpen(false)
        // Could show success toast here
      } else {
        // Could show error toast here
        console.error('Trade failed:', result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={kol.avatar} alt={kol.name} />
              <AvatarFallback>{kol.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <div>{kol.name}</div>
              <div className="text-sm text-gray-500">@{kol.twitter}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Current Price: ${currentPrice.toFixed(3)} • Rank: #{kolEntry?.rank || 'N/A'}
            {kolEntry && (
              <div className={`text-sm ${getTradePerformanceColor(kolEntry.totalPnlSol)}`}>
                P&L: {formatSOL(kolEntry.totalPnlSol)} ({formatUSD(kolEntry.totalPnlUsd)})
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trade Type Toggle */}
          <div className="flex gap-2">
            <Button
              variant={tradeType === 'buy' ? 'default' : 'outline'}
              onClick={() => setTradeType('buy')}
              className="flex-1"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Buy
            </Button>
            <Button
              variant={tradeType === 'sell' ? 'default' : 'outline'}
              onClick={() => setTradeType('sell')}
              className="flex-1"
            >
              <TrendingDown className="w-4 h-4 mr-1" />
              Sell
            </Button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {tradeType === 'buy' ? 'PILLS Amount' : 'Shares Amount'}
            </label>
            <Input 
              type="number" 
              placeholder="0.00" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-mono"
            />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {tradeType === 'buy' 
                ? `≈ ${formatShares(sharesAmount)} shares` 
                : `≈ $${pillsAmount.toFixed(2)} PILLS`
              }
            </div>
          </div>

          {/* Trade Button */}
          <Button 
            onClick={handleTrade} 
            disabled={!canTrade || !pillsAmount || isSubmitting} 
            className="w-full text-lg py-6"
            size="lg"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {tradeType === 'buy' ? 'Buy' : 'Sell'} Shares
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MarketSkeleton() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mx-auto animate-pulse" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto mb-2 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
