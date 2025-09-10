import type { Metadata } from 'next'
import './globals.css'
import localFont from 'next/font/local'
import { AppProviders } from '@/components/app-providers'
import { AppLayout } from '@/components/app-layout'
import React from 'react'

export const metadata: Metadata = {
  title: 'Pillymarket',
  description: '&copy; Pillymarket 2025',
}

const links: { label: string; path: string }[] = [
  { label: 'Market', path: '/' },
  { label: 'Account', path: '/account' },
]

const openSauce = localFont({
  src: [
    {
      path: './fonts/OpenSauceOne-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/OpenSauceOne-Bold.ttf',
      weight: '700',
      style: 'bold',
    },
    {
      path: './fonts/OpenSauceOne-ExtraBold.ttf',
      weight: '800',
      style: 'extrabold',
    },
  ],
  display: 'swap',
  variable: '--font-open-sauce',
})

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={openSauce.variable}>
      <body className="antialiased">
        <AppProviders>
          <AppLayout links={links}>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  )
}
// Patch BigInt so we can log it using JSON.stringify without any errors
declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
