import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addMissingTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding missing database tables...');
    
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ UUID extension enabled');
    
    // Trade transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS trade_transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
          
          -- Transaction details
          signature VARCHAR(100) UNIQUE NOT NULL,
          transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
          
          -- Amounts
          sol_amount DECIMAL(20, 9) NOT NULL,
          token_amount DECIMAL(30, 9) NOT NULL,
          price_per_token DECIMAL(20, 9),
          
          -- Blockchain data
          slot BIGINT,
          block_time TIMESTAMP WITH TIME ZONE NOT NULL,
          
          -- Metadata
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Indexes for trade transactions
    await client.query('CREATE INDEX IF NOT EXISTS idx_trade_transactions_trade_id ON trade_transactions(trade_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_trade_transactions_signature ON trade_transactions(signature);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_trade_transactions_block_time ON trade_transactions(block_time);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_trade_transactions_type ON trade_transactions(transaction_type);');
    
    console.log('✅ Created trade_transactions table');
    
    // Leaderboard periods table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_periods (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          period_id VARCHAR(50) UNIQUE NOT NULL,
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          is_active BOOLEAN DEFAULT false,
          sol_price_usd DECIMAL(10, 2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Indexes for leaderboard periods
    await client.query('CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_start_time ON leaderboard_periods(start_time);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_active ON leaderboard_periods(is_active);');
    
    console.log('✅ Created leaderboard_periods table');
    
    // Webhook logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          signature VARCHAR(100) UNIQUE NOT NULL,
          kol_wallet_address VARCHAR(50),
          transaction_type VARCHAR(20),
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          processing_status VARCHAR(20) DEFAULT 'pending',
          error_message TEXT,
          raw_data JSONB
      );
    `);
    
    // Indexes for webhook logs
    await client.query('CREATE INDEX IF NOT EXISTS idx_webhook_logs_signature ON webhook_logs(signature);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_webhook_logs_kol_wallet ON webhook_logs(kol_wallet_address);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(processing_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at);');
    
    console.log('✅ Created webhook_logs table');
    
    // Update function for automatic timestamps
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    console.log('✅ Created update timestamp function');
    
    console.log('\n🎉 All missing tables have been created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingTables();