import { useDBStore } from '../postgres-db/stores';

// SQL to create the staking_events and nft_mints tables
const stakingSQL = `
CREATE TABLE IF NOT EXISTS staking_events (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    amount VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255),
    transaction_signature VARCHAR(255),
    staking_program_id VARCHAR(255),
    staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nft_mints (
    id SERIAL PRIMARY KEY,
    mint_address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    metadata_uri TEXT NOT NULL,
    staking_token VARCHAR(255),
    staking_amount VARCHAR(255),
    wallet_address VARCHAR(255),
    transaction_signature VARCHAR(255),
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staking_events_wallet ON staking_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_mints_wallet ON nft_mints(wallet_address);
`;

// Function to initialize the database
export const initializeDatabase = async () => {
  try {
    const dbName = "lockedin";
    const dbDescription = "Sample data for projects";
    const dbStore = useDBStore.getState();
    
    console.log("useDBStore databases:", dbStore.databases);

    // Check if database exists
    if (dbStore.databases[dbName]) {
      console.log(`Database ${dbName} already exists.`);
      if (!dbStore.active || dbStore.active.name !== dbName) {
        await dbStore.connect(dbName);
      }
    } else {
      console.log(`Database ${dbName} does not exist. Creating it...`);
      // Create and initialize the database
      await dbStore.create({ name: dbName, description: dbDescription });
      await dbStore.connect(dbName);
    }

    // Execute the SQL to create the tables
    try {
      console.log("Creating staking_events and nft_mints tables...");
      await dbStore.execute(stakingSQL);
      console.log("Tables created successfully!");
    } catch (sqlError) {
      // Check if this is a "table already exists" error
      if (sqlError instanceof Error && 
          sqlError.message.includes("relation") && 
          sqlError.message.includes("already exists")) {
        console.log("Tables already exist, continuing...");
      } else {
        // For other SQL errors, log but don't fail
        console.error("SQL execution error:", sqlError);
      }
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

// Export the SQL for use in other files
export const STAKING_SQL = stakingSQL; 