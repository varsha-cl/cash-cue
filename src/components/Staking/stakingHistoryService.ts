import { GoalData } from './StakingComponent';

// Storage key for staking history
const STAKING_HISTORY_KEY = 'staking_history';

// Interface for staking history entry
export interface StakingHistoryEntry {
  id: string;
  timestamp: Date;
  type: 'stake' | 'reward' | 'penalty';
  amount: number;
  goalDescription: string;
  transactionId: string;
  achieved?: boolean;
}

// Helper function to properly serialize dates
const serializeHistoryEntry = (entry: StakingHistoryEntry): any => {
  return {
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  };
};

// Helper function to properly deserialize dates
const deserializeHistoryEntry = (serializedEntry: any): StakingHistoryEntry => {
  return {
    ...serializedEntry,
    timestamp: new Date(serializedEntry.timestamp),
  };
};

// Get staking history from localStorage
export const getStakingHistory = (): StakingHistoryEntry[] => {
  const historyJson = localStorage.getItem(STAKING_HISTORY_KEY);
  if (!historyJson) return [];
  
  try {
    const serializedHistory = JSON.parse(historyJson);
    // Deserialize history entries properly
    const history = serializedHistory.map(deserializeHistoryEntry);
    console.log('Retrieved staking history from localStorage:', history);
    return history;
  } catch (err) {
    console.error('Error parsing staking history from storage:', err);
    return [];
  }
};

// Add a new entry to staking history
export const addStakingHistoryEntry = (entry: StakingHistoryEntry): void => {
  const existingHistory = getStakingHistory();
  
  // Add new entry to history
  const updatedHistory = [...existingHistory, entry];
  
  // Serialize history properly before storing
  const serializedHistory = updatedHistory.map(serializeHistoryEntry);
  localStorage.setItem(STAKING_HISTORY_KEY, JSON.stringify(serializedHistory));
  
  console.log('Added entry to staking history:', entry);
};

// Record a new stake
export const recordStake = (goal: GoalData): void => {
  const entry: StakingHistoryEntry = {
    id: `stake-${Date.now()}`,
    timestamp: new Date(),
    type: 'stake',
    amount: goal.stakeAmount,
    goalDescription: goal.description,
    transactionId: goal.transactionId || goal.id,
  };
  
  addStakingHistoryEntry(entry);
};

// Record a reward or penalty
export const recordSettlement = (goal: GoalData, achieved: boolean): void => {
  // Calculate reward or penalty amount
  const finalAmount = achieved 
    ? goal.stakeAmount * 1.1  // 10% reward
    : goal.stakeAmount * 0.9; // 10% penalty
  
  const entry: StakingHistoryEntry = {
    id: `settlement-${Date.now()}`,
    timestamp: new Date(),
    type: achieved ? 'reward' : 'penalty',
    amount: finalAmount,
    goalDescription: goal.description,
    transactionId: goal.transactionId || goal.id,
    achieved,
  };
  
  addStakingHistoryEntry(entry);
};

// Clear staking history (for testing purposes)
export const clearStakingHistory = (): void => {
  localStorage.removeItem(STAKING_HISTORY_KEY);
  console.log('Cleared staking history');
}; 