'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { ReactQueryProvider } from './react-query-provider'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { HowItWorksProvider } from '@/contexts/how-it-works-context'
import React from 'react'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ReactQueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SolanaProvider>
          <HowItWorksProvider>
            {children}
          </HowItWorksProvider>
        </SolanaProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  )
}
