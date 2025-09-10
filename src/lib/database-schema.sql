-- Database schema for PillyMarket KOL tracking system
-- PostgreSQL schema for Railway deployment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- KOLs table - stores the trader information
CREATE TABLE kols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    twitter_handle VARCHAR(50),
    image_url VARCHAR(255),
    telegram_handle BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast wallet lookups
CREATE INDEX idx_kols_wallet_address ON kols(wallet_address);
CREATE INDEX idx_kols_active ON kols(is_active);

-- Tokens table - stores token metadata
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mint_address VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(20),
    decimals INTEGER DEFAULT 9,
    image_url TEXT,
    description TEXT,
    token_program VARCHAR(50),
    supply BIGINT,
    price_usd DECIMAL(18, 8),
    last_price_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast token lookups
CREATE INDEX idx_tokens_mint_address ON tokens(mint_address);

-- Trades table - stores aggregated trade information
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kol_id UUID NOT NULL REFERENCES kols(id) ON DELETE CASCADE,
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    
    -- Trade aggregation data
    total_buy_amount DECIMAL(20, 9) DEFAULT 0, -- SOL amount spent on buys
    total_sell_amount DECIMAL(20, 9) DEFAULT 0, -- SOL amount received from sells
    total_token_bought DECIMAL(30, 9) DEFAULT 0, -- Token amount bought
    total_token_sold DECIMAL(30, 9) DEFAULT 0, -- Token amount sold
    
    -- P&L calculations
    pnl_sol DECIMAL(20, 9) DEFAULT 0,
    pnl_usd DECIMAL(20, 2) DEFAULT 0,
    
    -- Trade status
    is_open BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, partial
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one trade record per KOL-token pair
    UNIQUE(kol_id, token_id)
);

-- Indexes for trades
CREATE INDEX idx_trades_kol_id ON trades(kol_id);
CREATE INDEX idx_trades_token_id ON trades(token_id);
CREATE INDEX idx_trades_started_at ON trades(started_at);
CREATE INDEX idx_trades_is_open ON trades(is_open);
CREATE INDEX idx_trades_pnl_sol ON trades(pnl_sol DESC);

-- Trade transactions table - stores individual buy/sell transactions
CREATE TABLE trade_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    
    -- Transaction details
    signature VARCHAR(100) UNIQUE NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    
    -- Amounts
    sol_amount DECIMAL(20, 9) NOT NULL, -- SOL amount (positive for buys, negative for sells)
    token_amount DECIMAL(30, 9) NOT NULL, -- Token amount
    price_per_token DECIMAL(20, 9), -- SOL per token
    
    -- Blockchain data
    slot BIGINT,
    block_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for trade transactions
CREATE INDEX idx_trade_transactions_trade_id ON trade_transactions(trade_id);
CREATE INDEX idx_trade_transactions_signature ON trade_transactions(signature);
CREATE INDEX idx_trade_transactions_block_time ON trade_transactions(block_time);
CREATE INDEX idx_trade_transactions_type ON trade_transactions(transaction_type);

-- Leaderboard periods table - tracks 24-hour periods
CREATE TABLE leaderboard_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id VARCHAR(50) UNIQUE NOT NULL, -- Format: startTimestamp-endTimestamp
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    sol_price_usd DECIMAL(10, 2), -- SOL price at period start
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for leaderboard periods
CREATE INDEX idx_leaderboard_periods_start_time ON leaderboard_periods(start_time);
CREATE INDEX idx_leaderboard_periods_active ON leaderboard_periods(is_active);

-- Webhook logs table - track webhook processing
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signature VARCHAR(100) UNIQUE NOT NULL,
    kol_wallet_address VARCHAR(50),
    transaction_type VARCHAR(20), -- pump_fun, pump_swap, other
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processed, failed
    error_message TEXT,
    raw_data JSONB -- Store the full webhook payload
);

-- Index for webhook logs
CREATE INDEX idx_webhook_logs_signature ON webhook_logs(signature);
CREATE INDEX idx_webhook_logs_kol_wallet ON webhook_logs(kol_wallet_address);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(processing_status);
CREATE INDEX idx_webhook_logs_processed_at ON webhook_logs(processed_at);

-- Prediction markets table (for future prediction market feature)
CREATE TABLE prediction_markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID NOT NULL REFERENCES leaderboard_periods(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    market_type VARCHAR(20) DEFAULT 'winner_prediction', -- winner_prediction, top3, etc
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, cancelled
    total_volume DECIMAL(20, 9) DEFAULT 0,
    resolution_data JSONB, -- Store winner information when resolved
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User bets table (for future prediction market feature)
CREATE TABLE user_bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES prediction_markets(id),
    user_wallet VARCHAR(50) NOT NULL,
    predicted_kol_id UUID NOT NULL REFERENCES kols(id),
    bet_amount DECIMAL(20, 9) NOT NULL,
    potential_payout DECIMAL(20, 9),
    is_winning_bet BOOLEAN,
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_kols_updated_at BEFORE UPDATE ON kols 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prediction_markets_updated_at BEFORE UPDATE ON prediction_markets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();