'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X, Wallet } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { ClusterDropdown } from '@/components/cluster-dropdown'
import { useSolana } from '@/components/solana/use-solana'
import { useUserPortfolio, useMarketFormatters } from '@/hooks/use-pills-market'
import { useHowItWorks } from '@/contexts/how-it-works-context'
import Image from 'next/image'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const { account } = useSolana()
  const { pillsBalance } = useUserPortfolio()
  const { formatPILLS } = useMarketFormatters()
  const { toggleHowItWorks } = useHowItWorks()

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  function handleLinkClick(path: string, label: string) {
    if (label === 'How It Works') {
      // Navigate to home page first, then toggle
      if (pathname !== '/') {
        router.push('/')
      }
      toggleHowItWorks()
      setShowMenu(false)
    }
  }

  return (
    <header className="relative z-50 px-4 py-2 bg-card/50 font-extrabold">
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link className="flex items-center gap-1 text-xl hover:text-neutral-500 dark:hover:text-white" href="/">
            <Image src="/pillylogo.png" alt="Pillymarket Logo" width={32} height={32} className="rounded-md" />
            <span>Pillymarket</span>
          </Link>
          <div className="hidden md:flex items-center">
            <ul className="flex gap-4 flex-nowrap items-center">
              {links.map(({ label, path }) => (
                <li key={path}>
                  {label === 'How It Works' ? (
                    <button
                      className={`hover:text-neutral-500 dark:hover:text-white ${isActive(path) ? 'text-neutral-500 dark:text-white' : ''}`}
                      onClick={() => handleLinkClick(path, label)}
                    >
                      {label}
                    </button>
                  ) : (
                    <Link
                      className={`hover:text-neutral-500 dark:hover:text-white ${isActive(path) ? 'text-neutral-500 dark:text-white' : ''}`}
                      href={path}
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <div className="hidden md:flex items-center gap-4">
          {account && (
            <div className="flex items-center gap-2 text-sm ">
              <Wallet className="w-4 h-4" />
              <span>{formatPILLS(pillsBalance)}</span>
            </div>
          )}
          <WalletDropdown />
          <ClusterDropdown />
          <ThemeSelect />
        </div>

        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-sm">
            <div className="flex flex-col p-4 gap-4 border-t dark:border-neutral-800">
              {account && (
                <div className="flex items-center gap-2 text-sm justify-center">
                  <Wallet className="w-4 h-4" />
                  <span>{formatPILLS(pillsBalance)}</span>
                </div>
              )}
              <div className="flex justify-end items-center gap-4">
                <WalletDropdown />
                <ClusterDropdown />
                <ThemeSelect />
              </div>
              <ul className="flex flex-col gap-4">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    {label === 'How It Works' ? (
                      <button
                        className={`block text-lg py-2 text-left ${isActive(path) ? 'text-foreground' : 'text-muted-foreground'} hover:text-foreground`}
                        onClick={() => handleLinkClick(path, label)}
                      >
                        {label}
                      </button>
                    ) : (
                      <Link
                        className={`block text-lg py-2  ${isActive(path) ? 'text-foreground' : 'text-muted-foreground'} hover:text-foreground`}
                        href={path}
                        onClick={() => setShowMenu(false)}
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
