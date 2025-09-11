import { Pool } from 'pg';
import type { Address } from 'gill';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface TokenTransfer {
  fromTokenAccount: string;
  toTokenAccount: string;
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
}

interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

interface ProcessedTrade {
  kolAddress: string;
  tokenMint: string;
  transactionType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  signature: string;
  timestamp: number;
  slot: number;
}

/**
 * Process webhook transaction and save to database
 */
export async function processWebhookTransaction(
  signature: string,
  timestamp: number,
  slot: number,
  involvedKOLs: string[],
  tokenTransfers: TokenTransfer[],
  solTransfers: NativeTransfer[],
  transactionType?: string
) {
  const client = await pool.connect();
  
  try {
    console.log(`💾 Processing transaction ${signature} for database storage`);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Log the webhook processing
    await client.query(`
      INSERT INTO webhook_logs (signature, kol_wallet_address, transaction_type, processing_status, raw_data)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (signature) DO UPDATE SET
        processing_status = 'processing',
        raw_data = EXCLUDED.raw_data
    `, [
      signature,
      involvedKOLs[0], // Use first KOL for logging
      transactionType || 'pump_fun',
      'processing',
      JSON.stringify({ tokenTransfers, solTransfers, timestamp, slot })
    ]);
    
    // Process each token involved in the transaction
    for (const tokenTransfer of tokenTransfers) {
      const { mint: tokenMint, tokenAmount } = tokenTransfer;
      
      // Determine which KOL is involved and transaction direction
      const isKOLReceiver = involvedKOLs.includes(tokenTransfer.toUserAccount);
      const isKOLSender = involvedKOLs.includes(tokenTransfer.fromUserAccount);
      
      if (!isKOLReceiver && !isKOLSender) continue;
      
      const kolAddress = isKOLReceiver ? tokenTransfer.toUserAccount : tokenTransfer.fromUserAccount;
      const tradeType: 'buy' | 'sell' = isKOLReceiver ? 'buy' : 'sell';
      
      // Find corresponding SOL transfer
      const correspondingSolTransfer = solTransfers.find(solTransfer => 
        (tradeType === 'buy' && solTransfer.fromUserAccount === kolAddress) ||
        (tradeType === 'sell' && solTransfer.toUserAccount === kolAddress)
      );
      
      const solAmount = correspondingSolTransfer ? Math.abs(correspondingSolTransfer.amount) / 1e9 : 0; // Convert lamports to SOL
      const tokenAmountDecimal = tokenAmount; // Assume already properly decimaled
      
      console.log(`📝 Processing ${tradeType} for KOL ${kolAddress}: ${tokenAmountDecimal} tokens, ${solAmount} SOL`);
      
      // 1. Ensure token exists in tokens table
      await upsertToken(client, tokenMint);
      
      // 2. Get or create trade record
      const trade = await upsertTrade(client, kolAddress, tokenMint);
      
      // 3. Record the individual transaction
      await insertTradeTransaction(client, trade.id, signature, tradeType, solAmount, tokenAmountDecimal, timestamp, slot);
      
      // 4. Update trade aggregation
      await updateTradeAggregation(client, trade.id, tradeType, solAmount, tokenAmountDecimal);
    }
    
    // Mark webhook as processed
    await client.query(`
      UPDATE webhook_logs 
      SET processing_status = 'processed', error_message = null 
      WHERE signature = $1
    `, [signature]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✅ Successfully processed transaction ${signature}`);
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    
    console.error(`❌ Error processing transaction ${signature}:`, error);
    
    // Mark webhook as failed
    try {
      await client.query(`
        UPDATE webhook_logs 
        SET processing_status = 'failed', error_message = $1 
        WHERE signature = $2
      `, [error instanceof Error ? error.message : String(error), signature]);
    } catch (updateError) {
      console.error('Error updating webhook log:', updateError);
    }
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ensure token exists in database, create if missing
 */
async function upsertToken(client: any, tokenMint: string) {
  const result = await client.query(`
    INSERT INTO tokens (mint_address, created_at, updated_at)
    VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (mint_address) DO UPDATE SET
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, mint_address
  `, [tokenMint]);
  
  console.log(`🪙 Token ${tokenMint} ensured in database`);
  return result.rows[0];
}

/**
 * Get or create trade record for KOL-token pair
 */
async function upsertTrade(client: any, kolAddress: string, tokenMint: string) {
  // First get KOL ID
  const kolResult = await client.query('SELECT id FROM kols WHERE wallet_address = $1', [kolAddress]);
  if (kolResult.rows.length === 0) {
    throw new Error(`KOL ${kolAddress} not found in database`);
  }
  const kolId = kolResult.rows[0].id;
  
  // Get token ID
  const tokenResult = await client.query('SELECT id FROM tokens WHERE mint_address = $1', [tokenMint]);
  if (tokenResult.rows.length === 0) {
    throw new Error(`Token ${tokenMint} not found in database`);
  }
  const tokenId = tokenResult.rows[0].id;
  
  // Get or create trade
  const result = await client.query(`
    INSERT INTO trades (kol_id, token_id, started_at, last_activity_at, created_at, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (kol_id, token_id) DO UPDATE SET
      last_activity_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, kol_id, token_id
  `, [kolId, tokenId]);
  
  console.log(`📈 Trade record ensured for KOL ${kolAddress} and token ${tokenMint}`);
  return result.rows[0];
}

/**
 * Insert individual trade transaction
 */
async function insertTradeTransaction(
  client: any,
  tradeId: string,
  signature: string,
  transactionType: 'buy' | 'sell',
  solAmount: number,
  tokenAmount: number,
  timestamp: number,
  slot: number
) {
  const blockTime = new Date(timestamp * 1000);
  const pricePerToken = tokenAmount > 0 ? solAmount / tokenAmount : 0;
  const adjustedSolAmount = transactionType === 'sell' ? -solAmount : solAmount;
  
  await client.query(`
    INSERT INTO trade_transactions (trade_id, signature, transaction_type, sol_amount, token_amount, price_per_token, slot, block_time, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    ON CONFLICT (signature) DO NOTHING
  `, [tradeId, signature, transactionType, adjustedSolAmount, tokenAmount, pricePerToken, slot, blockTime]);
  
  console.log(`📝 Recorded ${transactionType} transaction: ${tokenAmount} tokens for ${solAmount} SOL`);
}

/**
 * Update trade aggregation data
 */
async function updateTradeAggregation(
  client: any,
  tradeId: string,
  transactionType: 'buy' | 'sell',
  solAmount: number,
  tokenAmount: number
) {
  if (transactionType === 'buy') {
    await client.query(`
      UPDATE trades SET
        total_buy_amount = total_buy_amount + $1,
        total_token_bought = total_token_bought + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [solAmount, tokenAmount, tradeId]);
  } else {
    await client.query(`
      UPDATE trades SET
        total_sell_amount = total_sell_amount + $1,
        total_token_sold = total_token_sold + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [solAmount, tokenAmount, tradeId]);
  }
  
  // Recalculate P&L
  const tradeResult = await client.query(`
    SELECT total_buy_amount, total_sell_amount, total_token_bought, total_token_sold
    FROM trades WHERE id = $1
  `, [tradeId]);
  
  if (tradeResult.rows.length > 0) {
    const trade = tradeResult.rows[0];
    const pnlSol = parseFloat(trade.total_sell_amount) - parseFloat(trade.total_buy_amount);
    
    await client.query(`
      UPDATE trades SET
        pnl_sol = $1,
        pnl_usd = $1 * 213.45,
        is_open = CASE 
          WHEN total_token_bought > total_token_sold THEN true 
          ELSE false 
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [pnlSol, tradeId]);
  }
  
  console.log(`📊 Updated trade aggregation for ${transactionType}`);
}