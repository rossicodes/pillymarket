'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Clock, Twitter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getKOLByAddress } from '@/lib/kol-data';
import { formatSOL, formatUSD, formatWinRate, getTradePerformanceColor } from '@/lib/kol-utils';
import { useTokenInfo } from '@/hooks/use-token-metadata';
import type { Trade, TradeTransaction } from '@/lib/kol-types';

interface KOLDetailPageProps {
  params: {
    address: string;
  };
}

export default function KOLDetailPage({ params }: KOLDetailPageProps) {
  const router = useRouter();
  const kol = getKOLByAddress(params.address);

  if (!kol) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">KOL Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The requested KOL could not be found.
        </p>
        <Button onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>
      </div>
    );
  }

  // Mock data - in production this would come from the database
  const mockTrades: Trade[] = [];
  
  const totalPnlSol = 0;
  const totalPnlUsd = 0;
  const totalTrades = mockTrades.length;
  const activeTrades = mockTrades.filter(trade => trade.isOpen);
  const completedTrades = mockTrades.filter(trade => !trade.isOpen);
  
  const winningTrades = completedTrades.filter(trade => trade.pnlSol > 0).length;
  const losingTrades = completedTrades.filter(trade => trade.pnlSol < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>
      </div>

      {/* KOL Profile */}
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-white/20">
              <AvatarImage src={kol.avatar} alt={kol.name} />
              <AvatarFallback className="text-2xl">{kol.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{kol.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <Link 
                  href={`https://twitter.com/${kol.twitter}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Twitter className="w-4 h-4" />
                  @{kol.twitter}
                </Link>
                <Badge variant="secondary" className="gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Active Trader
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className={`text-2xl font-mono font-bold ${getTradePerformanceColor(totalPnlSol)}`}>
                    {totalPnlSol >= 0 ? '+' : ''}{formatSOL(totalPnlSol)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">24h P&L</div>
                </div>
                
                <div>
                  <div className={`text-2xl font-mono font-bold ${getTradePerformanceColor(totalPnlUsd)}`}>
                    {totalPnlUsd >= 0 ? '+' : ''}{formatUSD(totalPnlUsd)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">USD Value</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold">{totalTrades}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Trades</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold">{formatWinRate(winRate)}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Active Trades ({activeTrades.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTrades.map(trade => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Trade History ({completedTrades.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTrades.length > 0 ? (
            <div className="space-y-4">
              {completedTrades.slice(0, 10).map(trade => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
              {completedTrades.length > 10 && (
                <div className="text-center pt-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Latest 10 of {completedTrades.length} trades
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">No trades yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Info */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Wallet Address</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {kol.address}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(kol.address)}
                >
                  Copy
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link 
                    href={`https://solscan.io/account/${kol.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Tracked for Pump.Fun transactions • Updates in real-time • Rankings reset daily
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  const isProfit = trade.pnlSol > 0;
  const statusColor = trade.isOpen ? 'text-blue-600' : (isProfit ? 'text-green-600' : 'text-red-600');
  
  // Fetch token metadata with fallback to existing trade.token data
  const { tokenInfo, isLoading } = useTokenInfo(trade.token.address);
  const displayToken = tokenInfo || trade.token;
  
  return (
    <Card className="border-l-4" style={{ borderLeftColor: trade.isOpen ? '#3B82F6' : (isProfit ? '#10B981' : '#EF4444') }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {displayToken.image ? (
                <img 
                  src={displayToken.image} 
                  alt={displayToken.symbol}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {displayToken.symbol.slice(0, 2).toUpperCase()}
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{displayToken.symbol}</span>
                <Badge variant={trade.isOpen ? "default" : "secondary"}>
                  {trade.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {displayToken.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                {displayToken.address.slice(0, 8)}...{displayToken.address.slice(-4)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className={`font-mono font-bold ${getTradePerformanceColor(trade.pnlSol)}`}>
              {trade.pnlSol >= 0 ? '+' : ''}{formatSOL(trade.pnlSol)}
            </div>
            <div className={`text-sm ${getTradePerformanceColor(trade.pnlUsd)}`}>
              ({trade.pnlUsd >= 0 ? '+' : ''}{formatUSD(trade.pnlUsd)})
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400">Buys</div>
            <div className="font-mono">{formatSOL(trade.totalBuyAmount)}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Sells</div>
            <div className="font-mono">{formatSOL(trade.totalSellAmount)}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Transactions</div>
            <div>{trade.buys.length + trade.sells.length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}