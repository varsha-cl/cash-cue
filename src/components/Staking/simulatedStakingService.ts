import { GoalData } from './StakingComponent';
import { updateWalletBalance } from './stakingService';

// This service provides a simulated staking experience for development
export class SimulatedStakingService {
  // Simulate creating a stake account
  async createStakeAccount(
    stakeAmount: number,
    goalData: GoalData
  ): Promise<string> {
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a mock transaction ID
    const mockTxId = 'mock-tx-' + Math.random().toString(36).substring(2, 15);
    
    // Generate a mock stake account public key
    const mockStakeAccountPubkey = 'mock-stake-' + Math.random().toString(36).substring(2, 15);
    
    // Store the mock stake account public key in the goal data
    goalData.stakeAccountPubkey = mockStakeAccountPubkey;
    
    // Update the simulated wallet balance
    updateWalletBalance(stakeAmount, 'subtract');
    
    console.log('Simulated staking transaction completed:', mockTxId);
    console.log('Simulated stake amount:', stakeAmount, 'SOL');
    
    return mockTxId;
  }
  
  // Simulate settling a stake
  async settleStake(
    goalData: GoalData,
    isGoalAchieved: boolean
  ): Promise<string> {
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a mock transaction ID
    const mockTxId = 'mock-settle-' + Math.random().toString(36).substring(2, 15);
    
    console.log(`Simulated stake settlement for goal: ${goalData.description}`);
    console.log(`Goal ${isGoalAchieved ? 'achieved' : 'failed'}`);
    console.log(`Original stake amount: ${goalData.stakeAmount} SOL`);
    
    // Calculate reward or penalty
    const finalAmount = isGoalAchieved 
      ? goalData.stakeAmount * 1.1 
      : goalData.stakeAmount * 0.9;
    
    // Return the funds to the wallet with reward or penalty
    updateWalletBalance(finalAmount, 'add');
    
    console.log(`Final amount after ${isGoalAchieved ? 'reward' : 'penalty'}: ${finalAmount.toFixed(4)} SOL`);
    
    return mockTxId;
  }
} 