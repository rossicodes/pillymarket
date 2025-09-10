'use client'

import { PillsMarket } from '@/components/pills-market'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSolana } from '@/components/solana/use-solana'
import Link from 'next/link'

export default function DashboardFeature() {
  const { account } = useSolana()

  return (
    <div className="space-y-8 font-bold">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl ">How it works</h1>
      </div>
      {/* How it Works */}
      <Card>
        <CardContent className="p-8 font-bold">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-xl mb-3">1. Place a Bet</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fund your account with $PILLS then you&apos;re ready to bet. No bet limits and no fees.
              </p>
            </div>
            <div>
              <div className="text-xl mb-3">2. Watch & Trade</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Odds shift in real time as other traders bet. Sell your KOL shares at any time.
              </p>
            </div>
            <div>
              <div className="text-xl mb-3">3. Profit 🤑</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Wait until the market ends to redeem winning shares for $PILL.
              </p>
            </div>
          </div>

          <div className="pt-6 text-center">
            {!account ? (
              <p className="text-gray-600 dark:text-gray-400">Connect your wallet to start trading</p>
            ) : (
              <Button asChild>
                <Link href="/account">View Your Account</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Prediction Market */}
      <PillsMarket />
    </div>
  )
}
