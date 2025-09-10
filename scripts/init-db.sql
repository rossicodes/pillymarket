-- Initialize Pillymarket Database
-- This script creates the necessary tables for the MVP

-- Create KOL trading data table
CREATE TABLE IF NOT EXISTS kol_trades (
    id SERIAL PRIMARY KEY,
    kol_address VARCHAR(64) NOT NULL,
    token_address VARCHAR(64) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    token_amount DECIMAL(20, 6) NOT NULL,
    sol_amount DECIMAL(20, 9) NOT NULL,
    price_per_token DECIMAL(20, 9) NOT NULL,
    transaction_hash VARCHAR(128) NOT NULL UNIQUE,
    block_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_kol_address (kol_address),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_block_time (block_time),
    INDEX idx_created_at (created_at)
);

-- Create leaderboard cache table (for performance)
CREATE TABLE IF NOT EXISTS kol_leaderboard_cache (
    id SERIAL PRIMARY KEY,
    kol_address VARCHAR(64) NOT NULL UNIQUE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    total_pnl_sol DECIMAL(20, 9) DEFAULT 0,
    total_pnl_usd DECIMAL(20, 2) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    active_trades INTEGER DEFAULT 0,
    rank_position INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_kol_leaderboard_address (kol_address),
    INDEX idx_period_start (period_start),
    INDEX idx_rank_position (rank_position),
    INDEX idx_last_updated (last_updated)
);

-- Create pills market data table
CREATE TABLE IF NOT EXISTS pills_market_data (
    id SERIAL PRIMARY KEY,
    kol_address VARCHAR(64) NOT NULL,
    period_id VARCHAR(64) NOT NULL,
    share_price DECIMAL(10, 4) DEFAULT 0.5000,
    total_shares INTEGER DEFAULT 0,
    total_invested DECIMAL(20, 6) DEFAULT 0,
    probability DECIMAL(8, 6) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(kol_address, period_id),
    
    -- Indexes
    INDEX idx_pills_kol_address (kol_address),
    INDEX idx_period_id (period_id),
    INDEX idx_pills_last_updated (last_updated)
);

-- Create webhook logs table (for debugging)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    webhook_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_webhook_type (webhook_type),
    INDEX idx_processed (processed),
    INDEX idx_webhook_created_at (created_at)
);

-- Insert initial data for tracked KOLs (from traders.json)
-- This will be populated by the application on first run