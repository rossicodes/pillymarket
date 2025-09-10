'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchTokenMetadata, fetchMultipleTokenMetadata, getCachedTokenMetadata } from '@/lib/helius-api';
import type { TokenInfo } from '@/lib/kol-types';

/**
 * Hook for fetching and caching single token metadata
 */
export function useTokenMetadata(mintAddress?: string) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!mintAddress) {
      setTokenInfo(undefined);
      return;
    }

    // Check cache first
    const cached = getCachedTokenMetadata(mintAddress);
    if (cached) {
      setTokenInfo(cached);
      return;
    }

    // Fetch from API
    setIsLoading(true);
    setError(undefined);
    
    fetchTokenMetadata(mintAddress)
      .then(info => {
        setTokenInfo(info);
        setError(undefined);
      })
      .catch(err => {
        console.error('Error fetching token metadata:', err);
        setError(err.message || 'Failed to fetch token metadata');
        setTokenInfo({
          address: mintAddress,
          name: 'Unknown Token',
          symbol: `${mintAddress.slice(0, 4).toUpperCase()}`,
          decimals: 9,
          image: undefined,
          lastUpdated: Date.now(),
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [mintAddress]);

  return { tokenInfo, isLoading, error };
}

/**
 * Hook for fetching multiple token metadata entries
 */
export function useMultipleTokenMetadata(mintAddresses: string[] = []) {
  const [tokenInfos, setTokenInfos] = useState<Record<string, TokenInfo>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchMetadata = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) {
      setTokenInfos({});
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const results = await fetchMultipleTokenMetadata(addresses);
      setTokenInfos(results);
      setError(undefined);
    } catch (err) {
      console.error('Error fetching multiple token metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token metadata');
      
      // Create fallback data
      const fallbackResults: Record<string, TokenInfo> = {};
      addresses.forEach(address => {
        fallbackResults[address] = {
          address,
          name: 'Unknown Token',
          symbol: `${address.slice(0, 4).toUpperCase()}`,
          decimals: 9,
          image: undefined,
          lastUpdated: Date.now(),
        };
      });
      setTokenInfos(fallbackResults);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata(mintAddresses);
  }, [mintAddresses.join(','), fetchMetadata]);

  const refetch = useCallback(() => {
    fetchMetadata(mintAddresses);
  }, [mintAddresses, fetchMetadata]);

  return { tokenInfos, isLoading, error, refetch };
}

/**
 * Hook for getting token info with real-time updates
 */
export function useTokenInfo(mintAddress?: string) {
  const { tokenInfo, isLoading, error } = useTokenMetadata(mintAddress);
  
  // Return formatted token info with fallbacks
  const formattedTokenInfo = tokenInfo || (mintAddress ? {
    address: mintAddress,
    name: 'Unknown Token',
    symbol: `${mintAddress.slice(0, 4).toUpperCase()}`,
    decimals: 9,
    image: undefined,
    lastUpdated: Date.now(),
  } : undefined);

  return {
    tokenInfo: formattedTokenInfo,
    isLoading,
    error,
    hasTokenInfo: Boolean(tokenInfo),
  };
}