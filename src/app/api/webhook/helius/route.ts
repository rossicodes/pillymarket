import { NextRequest, NextResponse } from 'next/server';
import { getActiveKOLAddresses } from '@/lib/kol-data';

/**
 * Helius Webhook Handler
 * This endpoint receives real-time transaction data from Helius webhooks
 * for the monitored KOL wallets trading on Pump.Fun and PumpSwap
 */

interface HeliusWebhookPayload {
  accountData: {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      userAccount: string;
    }>;
  }[];
  description: string;
  events: unknown[];
  fee: number;
  feePayer: string;
  instructions: Array<{
    accounts: string[];
    data: string;
    programId: string;
    innerInstructions: unknown[];
  }>;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  signature: string;
  slot: number;
  source: string;
  timestamp: number;
  tokenTransfers: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
  }>;
  transactionError: string | null;
  type: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const payload: HeliusWebhookPayload[] = await request.json();
    
    // Verify the webhook is from Helius (in production, verify signature/auth)
    const heliusSecret = process.env.HELIUS_WEBHOOK_SECRET;
    const authHeader = request.headers.get('authorization');
    
    if (heliusSecret && authHeader !== `Bearer ${heliusSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the list of KOL addresses we're monitoring
    const monitoredAddresses = getActiveKOLAddresses();
    
    // Process each transaction
    for (const transaction of payload) {
      // Skip failed transactions
      if (transaction.transactionError) {
        console.log(`Skipping failed transaction: ${transaction.signature}`);
        continue;
      }

      // Check if this transaction involves any of our monitored KOLs
      const involvedKOLs = transaction.accountData
        .map(account => account.account)
        .filter(account => monitoredAddresses.includes(account));

      if (involvedKOLs.length === 0) {
        continue; // Skip transactions not involving our KOLs
      }

      // Check if this is a Pump.Fun or PumpSwap transaction
      const isPumpFunTx = transaction.instructions.some(
        instruction => 
          instruction.programId === '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P' || // Pump.Fun program ID
          instruction.programId === 'PumpS....' // PumpSwap program ID (placeholder)
      );

      if (!isPumpFunTx) {
        continue; // Only process Pump.Fun/PumpSwap transactions
      }

      console.log(`Processing Pump.Fun transaction for KOL(s): ${involvedKOLs.join(', ')}`);
      console.log(`Transaction signature: ${transaction.signature}`);
      console.log(`Timestamp: ${new Date(transaction.timestamp * 1000).toISOString()}`);

      // Extract token transfers for this transaction
      const tokenTransfers = transaction.tokenTransfers.filter(
        transfer => involvedKOLs.includes(transfer.fromUserAccount) || 
                    involvedKOLs.includes(transfer.toUserAccount)
      );

      // Extract native SOL transfers
      const solTransfers = transaction.nativeTransfers.filter(
        transfer => involvedKOLs.includes(transfer.fromUserAccount) || 
                    involvedKOLs.includes(transfer.toUserAccount)
      );

      // TODO: Process this transaction data
      // 1. Parse using solana-dex-parser to get buy/sell info
      // 2. Store in database with trade aggregation logic
      // 3. Update real-time leaderboard
      // 4. Fetch token metadata if needed

      // For now, just log the transaction details
      console.log('Token transfers:', tokenTransfers);
      console.log('SOL transfers:', solTransfers);
    }

    return NextResponse.json({ 
      success: true, 
      processed: payload.length,
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('Error processing Helius webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'ok',
    service: 'Helius webhook handler',
    monitoredKOLs: getActiveKOLAddresses().length
  });
}