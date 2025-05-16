import { executeQuery } from './postgres-proxy/utils';

/**
 * Seeds the database with sample staking events
 */
export const seedStakingEvents = async () => {
  try {
    console.log('Seeding staking events...');
    
    // Sample wallet addresses (including a placeholder for the connected wallet)
    const walletAddresses = [
      'CONNECTED_WALLET_PLACEHOLDER', // This will be replaced with the actual connected wallet
      '5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8',
      'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      '2q7pyhPwAwZ3QMfZrnAbDhnh9mDUqycszcpf86VgQxhF'
    ];
    
    // Sample validator addresses
    const validatorAddresses = [
      '8SQEcP4FaYQySktNQeyxF3w8pvArx3oMEh7fPrzkN9pu',
      'CakcnaRDHka2gXyfbEd2d3xsvkJkqsLw2akB3zsN1D2S',
      'DumiCKHVqoCQKD8roLApzR5Fit8qGV5fVQsJV9sTZk4a'
    ];
    
    // Sample tokens
    const tokens = ['SOL'];
    
    // Sample amounts
    const amounts = ['0.1', '0.5', '1.0', '2.0', '5.0'];
    
    // Generate 10 sample staking events
    for (let i = 0; i < 10; i++) {
      const walletAddress = walletAddresses[i % walletAddresses.length];
      const validatorAddress = validatorAddresses[i % validatorAddresses.length];
      const token = tokens[i % tokens.length];
      const amount = amounts[i % amounts.length];
      const timestamp = new Date(Date.now() - i * 86400000); // Each event 1 day apart
      const signature = `sample_tx_${Math.random().toString(36).substring(2, 15)}`;
      
      // Insert the staking event
      await executeQuery(`
        INSERT INTO staking_events (
          wallet_address, 
          amount, 
          token, 
          staking_program_id, 
          transaction_signature, 
          staked_at
        ) VALUES (
          '${walletAddress}', 
          '${amount}', 
          '${token}', 
          '${validatorAddress}', 
          '${signature}', 
          '${timestamp.toISOString()}'
        )
      `);
    }
    
    console.log('Successfully seeded staking events');
    return true;
  } catch (error) {
    console.error('Error seeding staking events:', error);
    return false;
  }
};

/**
 * Updates sample staking events with the connected wallet address
 */
export const updateStakingEventsWithConnectedWallet = async (connectedWalletAddress: string) => {
  try {
    if (!connectedWalletAddress) return false;
    
    console.log('Updating staking events with connected wallet address:', connectedWalletAddress);
    
    // Update staking events that have the placeholder wallet address
    await executeQuery(`
      UPDATE staking_events 
      SET wallet_address = '${connectedWalletAddress}' 
      WHERE wallet_address = 'CONNECTED_WALLET_PLACEHOLDER'
    `);
    
    console.log('Successfully updated staking events with connected wallet address');
    return true;
  } catch (error) {
    console.error('Error updating staking events with connected wallet address:', error);
    return false;
  }
};

/**
 * Checks if there are any staking events in the database
 */
export const checkStakingEvents = async (): Promise<number> => {
  try {
    const result = await executeQuery(`
      SELECT COUNT(*) as count FROM staking_events
    `);
    
    if (result && result.length > 0) {
      // Type assertion to access the count property
      const countResult = result[0] as any;
      if (countResult && countResult.count !== undefined) {
        return parseInt(countResult.count.toString());
      }
    }
    
    return 0;
  } catch (error) {
    console.error('Error checking staking events:', error);
    return 0;
  }
}; 