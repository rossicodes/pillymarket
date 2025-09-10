/**
 * Database connection and utility functions for PillyMarket
 * PostgreSQL connection for Railway deployment
 */

import { Pool, PoolClient } from 'pg';

// Global connection pool
let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }
  
  return pool;
}

/**
 * Get a database client from the pool
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await getClient();
  
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Database utility functions
 */

/**
 * Get KOL by wallet address
 */
export async function getKOLByWallet(walletAddress: string) {
  const results = await query(
    'SELECT * FROM kols WHERE wallet_address = $1 AND is_active = true',
    [walletAddress]
  );
  return results[0] || null;
}

/**
 * Get all active KOLs
 */
export async function getAllActiveKOLs() {
  return await query(
    'SELECT * FROM kols WHERE is_active = true ORDER BY name'
  );
}

/**
 * Get or create token record
 */
export async function getOrCreateToken(mintAddress: string, tokenData?: {
  name?: string;
  symbol?: string;
  decimals?: number;
  imageUrl?: string;
  description?: string;
  tokenProgram?: string;
  supply?: number;
  priceUsd?: number;
}) {
  return await transaction(async (client) => {
    // Try to get existing token
    let result = await client.query(
      'SELECT * FROM tokens WHERE mint_address = $1',
      [mintAddress]
    );
    
    if (result.rows.length > 0) {
      // Update token data if provided
      if (tokenData) {
        await client.query(`
          UPDATE tokens SET
            name = COALESCE($2, name),
            symbol = COALESCE($3, symbol),
            decimals = COALESCE($4, decimals),
            image_url = COALESCE($5, image_url),
            description = COALESCE($6, description),
            token_program = COALESCE($7, token_program),
            supply = COALESCE($8, supply),
            price_usd = COALESCE($9, price_usd),
            last_price_update = CASE WHEN $9 IS NOT NULL THEN CURRENT_TIMESTAMP ELSE last_price_update END,
            updated_at = CURRENT_TIMESTAMP
          WHERE mint_address = $1
        `, [
          mintAddress,
          tokenData.name,
          tokenData.symbol,
          tokenData.decimals,
          tokenData.imageUrl,
          tokenData.description,
          tokenData.tokenProgram,
          tokenData.supply,
          tokenData.priceUsd
        ]);
      }
      return result.rows[0];
    }
    
    // Create new token
    const insertResult = await client.query(`
      INSERT INTO tokens (
        mint_address, name, symbol, decimals, image_url, description, 
        token_program, supply, price_usd, last_price_update
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      mintAddress,
      tokenData?.name || 'Unknown Token',
      tokenData?.symbol || 'UNKNOWN',
      tokenData?.decimals || 9,
      tokenData?.imageUrl,
      tokenData?.description,
      tokenData?.tokenProgram,
      tokenData?.supply,
      tokenData?.priceUsd,
      tokenData?.priceUsd ? new Date() : null
    ]);
    
    return insertResult.rows[0];
  });
}

/**
 * Get current active leaderboard period
 */
export async function getCurrentLeaderboardPeriod() {
  const results = await query(
    'SELECT * FROM leaderboard_periods WHERE is_active = true ORDER BY start_time DESC LIMIT 1'
  );
  return results[0] || null;
}

/**
 * Get leaderboard data for a specific period
 */
export async function getLeaderboardData(periodId?: string) {
  let period;
  
  if (periodId) {
    const results = await query(
      'SELECT * FROM leaderboard_periods WHERE period_id = $1',
      [periodId]
    );
    period = results[0];
  } else {
    period = await getCurrentLeaderboardPeriod();
  }
  
  if (!period) {
    throw new Error('No active leaderboard period found');
  }
  
  // Get leaderboard entries
  const entries = await query(`
    SELECT 
      k.id as kol_id,
      k.wallet_address,
      k.name,
      k.twitter_handle,
      k.image_url,
      k.telegram_handle,
      COALESCE(SUM(t.pnl_sol), 0) as total_pnl_sol,
      COALESCE(SUM(t.pnl_usd), 0) as total_pnl_usd,
      COUNT(t.id) as total_trades,
      COUNT(CASE WHEN t.pnl_sol > 0 THEN 1 END) as winning_trades,
      COUNT(CASE WHEN t.pnl_sol < 0 THEN 1 END) as losing_trades,
      COUNT(CASE WHEN t.is_open THEN 1 END) as active_trades,
      MAX(t.last_activity_at) as last_trade_at
    FROM kols k
    LEFT JOIN trades t ON k.id = t.kol_id 
      AND t.started_at >= $1 
      AND t.started_at < $2
    WHERE k.is_active = true
    GROUP BY k.id, k.wallet_address, k.name, k.twitter_handle, k.image_url, k.telegram_handle
    ORDER BY total_pnl_sol DESC
  `, [period.start_time, period.end_time]);
  
  return {
    period,
    entries,
  };
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Process cleanup
process.on('beforeExit', () => {
  closePool().catch(console.error);
});

process.on('SIGINT', () => {
  closePool().then(() => process.exit(0)).catch(console.error);
});

process.on('SIGTERM', () => {
  closePool().then(() => process.exit(0)).catch(console.error);
});