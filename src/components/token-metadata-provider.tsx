'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { TokenInfo } from '@/lib/kol-types';

interface TokenMetadataContextType {
  getTokenInfo: (mintAddress: string) => TokenInfo | undefined;
  preloadTokens: (mintAddresses: string[]) => Promise<void>;
  isLoading: (mintAddress: string) => boolean;
}

const TokenMetadataContext = createContext<TokenMetadataContextType | undefined>(undefined);

interface TokenMetadataProviderProps {
  children: ReactNode;
}

export function TokenMetadataProvider({ children }: TokenMetadataProviderProps) {
  // This is a simplified provider for now
  // In production, this could manage global token metadata state
  
  const getTokenInfo = (mintAddress: string): TokenInfo | undefined => {
    // For now, return undefined to let components handle their own fetching
    return undefined;
  };

  const preloadTokens = async (mintAddresses: string[]): Promise<void> => {
    // Implementation for batch preloading tokens
    // This would use the fetchMultipleTokenMetadata function
  };

  const isLoading = (mintAddress: string): boolean => {
    // Track loading states globally
    return false;
  };

  return (
    <TokenMetadataContext.Provider 
      value={{
        getTokenInfo,
        preloadTokens,
        isLoading,
      }}
    >
      {children}
    </TokenMetadataContext.Provider>
  );
}

export function useTokenMetadataContext() {
  const context = useContext(TokenMetadataContext);
  if (!context) {
    throw new Error('useTokenMetadataContext must be used within a TokenMetadataProvider');
  }
  return context;
}