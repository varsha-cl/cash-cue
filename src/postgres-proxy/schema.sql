-- Existing tables
CREATE TABLE IF NOT EXISTS money_movement (
    id SERIAL PRIMARY KEY,
    from_acc VARCHAR(255),
    to_acc VARCHAR(255),
    from_name VARCHAR(255),
    to_name VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_category CHECK (category IN ('Housing', 'Groceries', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Dining Out', 'Education', 'Travel', 'Shopping', 'Personal Care', 'Gifts', 'Investments', 'Miscellaneous'))
);

CREATE TABLE IF NOT EXISTS graphs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data_query TEXT NOT NULL,
    dataset_label VARCHAR(255),
    background_colors TEXT[] DEFAULT ARRAY[
        '#FF6384', '#36A2EB', '#FFCE56', 
        '#4BC0C0', '#9966FF', '#FF9F40'
    ],
    hover_background_colors TEXT[],
    should_display BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New tables for Solana staking and NFT minting
CREATE TABLE IF NOT EXISTS nft_mints (
    id SERIAL PRIMARY KEY,
    mint_address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    metadata_uri TEXT NOT NULL,
    target_type VARCHAR(50),
    target_value VARCHAR(255),
    staking_token VARCHAR(255),
    staking_amount VARCHAR(255),
    wallet_address VARCHAR(255),
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    value VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255),
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staking_events (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    amount VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255),
    transaction_signature VARCHAR(255),
    staking_program_id VARCHAR(255),
    staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staking_events_wallet ON staking_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_mints_wallet ON nft_mints(wallet_address);
CREATE INDEX IF NOT EXISTS idx_achievements_wallet ON achievements(wallet_address);

-- Create a view for staking analytics
CREATE OR REPLACE VIEW staking_analytics AS
SELECT 
    wallet_address,
    token,
    SUM(CAST(amount AS DECIMAL)) as total_staked,
    COUNT(*) as staking_count,
    MIN(staked_at) as first_staked_at,
    MAX(staked_at) as last_staked_at
FROM staking_events
GROUP BY wallet_address, token;

-- Create a view for NFT minting analytics
CREATE OR REPLACE VIEW nft_minting_analytics AS
SELECT 
    wallet_address,
    COUNT(*) as total_nfts,
    MIN(minted_at) as first_minted_at,
    MAX(minted_at) as last_minted_at
FROM nft_mints
GROUP BY wallet_address; 