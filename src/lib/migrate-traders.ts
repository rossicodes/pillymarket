/**
 * Migration script to populate the KOLs table with trader data
 * This script reads from traders.json and inserts the data into the database
 * 
 * Usage:
 * 1. Set DATABASE_URL in your environment
 * 2. Run: npx ts-node src/lib/migrate-traders.ts
 */

import { Pool } from 'pg';
import tradersData from '../../traders.json';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface TraderData {
  name: string;
  walletAddress: string;
  imageUrl: string;
  twitterHandle: string;
  telegramHandle: boolean;
}

/**
 * Extract Twitter handle from full URL
 */
function extractTwitterHandle(twitterUrl: string): string {
  if (twitterUrl.startsWith('https://x.com/')) {
    return twitterUrl.replace('https://x.com/', '');
  }
  return twitterUrl;
}

/**
 * Migrate trader data to the database
 */
async function migrateTraders() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting trader migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Clear existing KOLs (optional - remove this if you want to keep existing data)
    await client.query('DELETE FROM kols');
    console.log('🗑️  Cleared existing KOL data');
    
    // Insert each trader
    const insertQuery = `
      INSERT INTO kols (wallet_address, name, twitter_handle, image_url, telegram_handle, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        twitter_handle = EXCLUDED.twitter_handle,
        image_url = EXCLUDED.image_url,
        telegram_handle = EXCLUDED.telegram_handle,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, name, wallet_address;
    `;
    
    let insertedCount = 0;
    
    for (const trader of tradersData as TraderData[]) {
      try {
        const result = await client.query(insertQuery, [
          trader.walletAddress,
          trader.name,
          extractTwitterHandle(trader.twitterHandle),
          trader.imageUrl,
          trader.telegramHandle,
          true // is_active
        ]);
        
        const kol = result.rows[0];
        console.log(`✅ Inserted/Updated: ${kol.name} (${kol.wallet_address})`);
        insertedCount++;
        
      } catch (error) {
        console.error(`❌ Error inserting trader ${trader.name}:`, error);
        throw error; // Rollback transaction on error
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📊 Total traders migrated: ${insertedCount}`);
    
    // Verify the data
    const countResult = await client.query('SELECT COUNT(*) FROM kols WHERE is_active = true');
    console.log(`📈 Active KOLs in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('💥 Migration failed:', error);
    throw error;
    
  } finally {
    client.release();
  }
}

/**
 * Create the initial leaderboard period for the current day
 */
async function createInitialPeriod() {
  const client = await pool.connect();
  
  try {
    console.log('📅 Creating initial leaderboard period...');
    
    const now = Date.now();
    const currentDate = new Date(now);
    
    // Get start of current day in UTC
    const startTime = new Date(
      currentDate.getUTCFullYear(), 
      currentDate.getUTCMonth(), 
      currentDate.getUTCDate()
    );
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
    
    const periodId = `${startTime.getTime()}-${endTime.getTime()}`;
    
    const insertPeriodQuery = `
      INSERT INTO leaderboard_periods (period_id, start_time, end_time, is_active, sol_price_usd)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (period_id) DO NOTHING
      RETURNING id, period_id;
    `;
    
    const result = await client.query(insertPeriodQuery, [
      periodId,
      startTime,
      endTime,
      now < endTime.getTime(), // is_active if current time is before end time
      213.45 // Mock SOL price - replace with real API call
    ]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Created leaderboard period: ${periodId}`);
    } else {
      console.log(`ℹ️  Leaderboard period already exists: ${periodId}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating leaderboard period:', error);
  } finally {
    client.release();
  }
}

/**
 * Display current KOL data for verification
 */
async function verifyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verifying migration results...');
    
    const query = `
      SELECT wallet_address, name, twitter_handle, telegram_handle, is_active, created_at
      FROM kols 
      ORDER BY name;
    `;
    
    const result = await client.query(query);
    
    console.log(`\n📋 KOLs in database (${result.rows.length}):`);
    console.log('─'.repeat(80));
    
    result.rows.forEach((kol, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${kol.name.padEnd(15)} | @${kol.twitter_handle.padEnd(15)} | ${kol.wallet_address.slice(0, 8)}...`);
    });
    
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    await migrateTraders();
    await createInitialPeriod();
    await verifyMigration();
    
    console.log('\n✅ All migration tasks completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
    
  } finally {
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  main();
}

export { migrateTraders, createInitialPeriod, verifyMigration };