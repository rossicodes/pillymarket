import type { KOL } from './kol-types';
import { type Address } from 'gill';
import tradersData from '../../traders.json';

/**
 * Function to extract Twitter handle from full URL
 */
function extractTwitterHandle(twitterUrl: string): string {
  if (twitterUrl.startsWith('https://x.com/')) {
    return twitterUrl.replace('https://x.com/', '');
  }
  return twitterUrl;
}

/**
 * Convert traders.json data to KOL format
 * These are the 21 real KOL wallets we'll monitor via Helius webhooks
 */
export const TRACKED_KOLS: KOL[] = tradersData.map((trader) => ({
  address: trader.walletAddress as Address,
  name: trader.name,
  twitter: extractTwitterHandle(trader.twitterHandle),
  avatar: `/${trader.imageUrl}`, // Images are stored directly in public/
  isActive: true,
  telegramHandle: trader.telegramHandle,
}));

/**
 * Get KOL by wallet address
 */
export function getKOLByAddress(address: string): KOL | undefined {
  return TRACKED_KOLS.find(kol => kol.address === address);
}

/**
 * Get all active KOL addresses for webhook monitoring
 */
export function getActiveKOLAddresses(): Address[] {
  return TRACKED_KOLS.filter(kol => kol.isActive).map(kol => kol.address);
}

/**
 * Get KOL display name with fallback
 */
export function getKOLDisplayName(address: string): string {
  const kol = getKOLByAddress(address);
  return kol?.name || `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get KOL Twitter handle with fallback
 */
export function getKOLTwitter(address: string): string | undefined {
  const kol = getKOLByAddress(address);
  return kol?.twitter;
}