'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface HowItWorksContextType {
  showHowItWorks: boolean
  setShowHowItWorks: (show: boolean) => void
  toggleHowItWorks: () => void
}

const HowItWorksContext = createContext<HowItWorksContextType | undefined>(undefined)

export function HowItWorksProvider({ children }: { children: ReactNode }) {
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  const toggleHowItWorks = () => {
    setShowHowItWorks(prev => !prev)
  }

  return (
    <HowItWorksContext.Provider 
      value={{ 
        showHowItWorks, 
        setShowHowItWorks, 
        toggleHowItWorks 
      }}
    >
      {children}
    </HowItWorksContext.Provider>
  )
}

export function useHowItWorks() {
  const context = useContext(HowItWorksContext)
  if (context === undefined) {
    throw new Error('useHowItWorks must be used within a HowItWorksProvider')
  }
  return context
}