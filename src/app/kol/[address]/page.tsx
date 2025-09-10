import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, Twitter } from 'lucide-react';
import Link from 'next/link';
import { getKOLByAddress } from '@/lib/kol-data';

interface KOLDetailPageProps {
  params: Promise<{
    address: string;
  }>;
}

export default async function KOLDetailPage({ params }: KOLDetailPageProps) {
  const { address } = await params;
  const kol = getKOLByAddress(address);

  if (!kol) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">KOL Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The requested KOL address was not found in our tracking list.
        </p>
        <Link href="/">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Market
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Market
          </Button>
        </Link>
      </div>

      {/* KOL Profile */}
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="w-24 h-24 border-4 border-white/20">
              <AvatarImage src={kol.avatar} alt={kol.name} />
              <AvatarFallback className="text-2xl">{kol.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{kol.name}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">@{kol.twitter}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`https://x.com/${kol.twitter}`} target="_blank">
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Stats - Placeholder for now */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+0.00 SOL</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
            </div>
          </div>
          <div className="mt-6 text-center text-gray-600 dark:text-gray-400">
            <p>Real-time trading data will be available once the MVP is connected to live Helius webhooks.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}