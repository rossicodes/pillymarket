import type { TokenInfo } from './kol-types';

/**
 * Helius API configuration and token metadata fetching
 * Used to get token names, symbols, and images for display in trade cards
 * Uses the getAsset method for comprehensive token information
 */

const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/';
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '';

interface HeliusGetAssetResponse {
  jsonrpc: string;
  result: {
    last_indexed_slot: number;
    interface: string;
    id: string;
    content?: {
      $schema: string;
      json_uri: string;
      files?: Array<{
        uri: string;
        cdn_uri?: string;
        mime: string;
      }>;
      metadata: {
        description?: string;
        name: string;
        symbol: string;
        token_standard: string;
      };
      links?: {
        image?: string;
      };
    };
    authorities?: Array<{
      address: string;
      scopes: string[];
    }>;
    compression?: {
      eligible: boolean;
      compressed: boolean;
      data_hash: string;
      creator_hash: string;
      asset_hash: string;
      tree: string;
      seq: number;
      leaf_id: number;
    };
    grouping?: Array<{
      group_key: string;
      group_value: string;
    }>;
    royalty?: {
      royalty_model: string;
      target?: string;
      percent: number;
      basis_points: number;
      primary_sale_happened: boolean;
      locked: boolean;
    };
    creators?: Array<{
      address: string;
      share: number;
      verified: boolean;
    }>;
    ownership: {
      frozen: boolean;
      delegated: boolean;
      delegate?: string;
      ownership_model: string;
      owner: string;
    };
    supply?: {
      print_max_supply: number;
      print_current_supply: number;
      edition_nonce: number;
    };
    mutable: boolean;
    burnt: boolean;
    token_info?: {
      supply: number;
      decimals: number;
      token_program: string;
      associated_token_address?: string;
      price_info?: {
        price_per_token: number;
        total_price: number;
        currency: string;
      };
    };
    mint_extensions?: {
      transfer_fee_config?: {
        withheld_amount: number;
        newer_transfer_fee: {
          epoch: number;
          maximum_fee: number;
          transfer_fee_basis_points: number;
        };
        older_transfer_fee: {
          epoch: number;
          maximum_fee: number;
          transfer_fee_basis_points: number;
        };
        withdraw_withheld_authority: string;
        transfer_fee_config_authority: string;
      };
    };
  };
  id: string;
}

interface HeliusAssetResponse {
  id: string;
  interface: string;
  content?: {
    $schema: string;
    json_uri: string;
    files?: {
      uri: string;
      cdn_uri?: string;
      mime: string;
    }[];
    metadata: {
      name: string;
      symbol: string;
      description?: string;
    };
  };
  authorities?: {
    address: string;
    scopes: string[];
  }[];
  compression?: {
    eligible: boolean;
    compressed: boolean;
    data_hash: string;
    creator_hash: string;
    asset_hash: string;
    tree: string;
    seq: number;
    leaf_id: number;
  };
  grouping?: {
    group_key: string;
    group_value: string;
  }[];
  royalty?: {
    royalty_model: string;
    target?: string;
    percent: number;
    basis_points: number;
    primary_sale_happened: boolean;
    locked: boolean;
  };
  creators?: {
    address: string;
    share: number;
    verified: boolean;
  }[];
  ownership: {
    frozen: boolean;
    delegated: boolean;
    delegate?: string;
    ownership_model: string;
    owner: string;
  };
  supply?: {
    print_max_supply: number;
    print_current_supply: number;
    edition_nonce: number;
  };
  mutable: boolean;
  burnt: boolean;
}

/**
 * Token metadata cache to avoid repeated API calls
 */
const tokenMetadataCache = new Map<string, TokenInfo>();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch token metadata from Helius API using the getAsset method
 */
export async function fetchTokenMetadata(mintAddress: string): Promise<TokenInfo> {
  // Check cache first
  const cached = tokenMetadataCache.get(mintAddress);
  if (cached && Date.now() - cached.lastUpdated < TOKEN_CACHE_TTL) {
    return cached;
  }

  try {
    if (!HELIUS_API_KEY) {
      console.warn('HELIUS_API_KEY not configured, using fallback metadata');
      return createFallbackTokenInfo(mintAddress);
    }

    // Use Helius getAsset RPC method for comprehensive token data
    const rpcUrl = `${HELIUS_RPC_URL}?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getAsset',
        params: {
          id: mintAddress,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status}`);
    }

    const data: HeliusGetAssetResponse = await response.json();
    const result = data.result;

    let tokenInfo: TokenInfo;

    if (result && result.content?.metadata) {
      // Extract token information from the comprehensive response
      const metadata = result.content.metadata;
      const tokenInfoData = result.token_info;
      
      // Get the best image URL available
      let imageUrl: string | undefined;
      if (result.content.files && result.content.files.length > 0) {
        // Prefer CDN URL if available, otherwise use the original URI
        imageUrl = result.content.files[0].cdn_uri || result.content.files[0].uri;
      } else if (result.content.links?.image) {
        imageUrl = result.content.links.image;
      }

      tokenInfo = {
        address: mintAddress,
        name: metadata.name || 'Unknown Token',
        symbol: metadata.symbol || 'UNKNOWN',
        decimals: tokenInfoData?.decimals || 9,
        image: imageUrl,
        lastUpdated: Date.now(),
        // Additional data from getAsset that we can store for future use
        priceInfo: tokenInfoData?.price_info ? {
          pricePerToken: tokenInfoData.price_info.price_per_token,
          currency: tokenInfoData.price_info.currency,
        } : undefined,
        supply: tokenInfoData?.supply,
        description: metadata.description,
        tokenProgram: tokenInfoData?.token_program,
      };
    } else {
      tokenInfo = createFallbackTokenInfo(mintAddress);
    }

    // Cache the result
    tokenMetadataCache.set(mintAddress, tokenInfo);
    return tokenInfo;

  } catch (error) {
    console.error('Error fetching token metadata from Helius:', error);
    return createFallbackTokenInfo(mintAddress);
  }
}

/**
 * Fetch multiple token metadata entries in batch
 * Note: getAsset doesn't support batch requests, so we'll make individual calls
 * with proper rate limiting and concurrency control
 */
export async function fetchMultipleTokenMetadata(mintAddresses: string[]): Promise<Record<string, TokenInfo>> {
  const results: Record<string, TokenInfo> = {};
  
  // Check cache for existing entries
  const uncachedAddresses: string[] = [];
  
  mintAddresses.forEach(address => {
    const cached = tokenMetadataCache.get(address);
    if (cached && Date.now() - cached.lastUpdated < TOKEN_CACHE_TTL) {
      results[address] = cached;
    } else {
      uncachedAddresses.push(address);
    }
  });

  if (uncachedAddresses.length === 0) {
    return results;
  }

  if (!HELIUS_API_KEY) {
    console.warn('HELIUS_API_KEY not configured, using fallback metadata');
    uncachedAddresses.forEach(address => {
      results[address] = createFallbackTokenInfo(address);
    });
    return results;
  }

  // Fetch tokens with controlled concurrency to avoid rate limits
  const concurrencyLimit = 10; // Process 10 tokens at a time
  const batches = [];
  
  for (let i = 0; i < uncachedAddresses.length; i += concurrencyLimit) {
    batches.push(uncachedAddresses.slice(i, i + concurrencyLimit));
  }

  try {
    for (const batch of batches) {
      // Process batch of tokens concurrently
      const batchPromises = batch.map(async (mintAddress) => {
        try {
          const tokenInfo = await fetchTokenMetadata(mintAddress);
          results[mintAddress] = tokenInfo;
          return tokenInfo;
        } catch (error) {
          console.error(`Error fetching token ${mintAddress}:`, error);
          const fallback = createFallbackTokenInfo(mintAddress);
          results[mintAddress] = fallback;
          return fallback;
        }
      });

      // Wait for current batch to complete before starting next batch
      await Promise.all(batchPromises);
      
      // Small delay between batches to respect rate limits
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

  } catch (error) {
    console.error('Error batch fetching token metadata from Helius:', error);
    
    // Fallback for failed requests
    uncachedAddresses.forEach(address => {
      if (!results[address]) {
        results[address] = createFallbackTokenInfo(address);
      }
    });
  }

  return results;
}

/**
 * Create fallback token info when API is unavailable
 */
function createFallbackTokenInfo(mintAddress: string): TokenInfo {
  return {
    address: mintAddress,
    name: 'Unknown Token',
    symbol: `${mintAddress.slice(0, 4).toUpperCase()}`,
    decimals: 9,
    image: undefined,
    lastUpdated: Date.now(),
  };
}

/**
 * Clear token metadata cache
 */
export function clearTokenMetadataCache(): void {
  tokenMetadataCache.clear();
}

/**
 * Get cached token metadata without making API calls
 */
export function getCachedTokenMetadata(mintAddress: string): TokenInfo | undefined {
  const cached = tokenMetadataCache.get(mintAddress);
  if (cached && Date.now() - cached.lastUpdated < TOKEN_CACHE_TTL) {
    return cached;
  }
  return undefined;
}

/**
 * Check if Helius API is configured
 */
export function isHeliusConfigured(): boolean {
  return Boolean(HELIUS_API_KEY);
}