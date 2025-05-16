import { GoalData } from './StakingComponent';

// In a real application, this would interact with your Solana program
// For now, we'll use localStorage to persist goals

const GOALS_STORAGE_KEY = 'staked_goals';
const WALLET_BALANCE_KEY = 'simulated_wallet_balance';

// Helper function to properly serialize dates
const serializeGoal = (goal: GoalData): any => {
  return {
    ...goal,
    targetDate: goal.targetDate.toISOString(),
    completedDate: goal.completedDate ? goal.completedDate.toISOString() : undefined
  };
};

// Helper function to properly deserialize dates
const deserializeGoal = (serializedGoal: any): GoalData => {
  return {
    ...serializedGoal,
    targetDate: new Date(serializedGoal.targetDate),
    completedDate: serializedGoal.completedDate ? new Date(serializedGoal.completedDate) : undefined
  };
};

export const saveGoal = (goalData: GoalData): void => {
  const existingGoals = getGoals();
  
  // Check if this goal already exists (to prevent duplicates)
  const existingIndex = existingGoals.findIndex(g => g.id === goalData.id);
  
  let updatedGoals;
  if (existingIndex >= 0) {
    // Update existing goal
    updatedGoals = [...existingGoals];
    updatedGoals[existingIndex] = goalData;
  } else {
    // Add new goal
    updatedGoals = [...existingGoals, goalData];
  }
  
  // Serialize goals properly before storing
  const serializedGoals = updatedGoals.map(serializeGoal);
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(serializedGoals));
  
  console.log('Saved goals to localStorage:', updatedGoals);
};

export const getGoals = (): GoalData[] => {
  const goalsJson = localStorage.getItem(GOALS_STORAGE_KEY);
  if (!goalsJson) return [];
  
  try {
    const serializedGoals = JSON.parse(goalsJson);
    // Deserialize goals properly
    const goals = serializedGoals.map(deserializeGoal);
    console.log('Retrieved goals from localStorage:', goals);
    return goals;
  } catch (err) {
    console.error('Error parsing goals from storage:', err);
    return [];
  }
};

export const updateGoal = (goalId: string, updates: Partial<GoalData>): void => {
  const existingGoals = getGoals();
  const goalToUpdate = existingGoals.find(goal => goal.id === goalId);
  
  if (!goalToUpdate) {
    console.error(`Goal with ID ${goalId} not found for update`);
    return;
  }
  
  const updatedGoals = existingGoals.map(goal => 
    goal.id === goalId ? { ...goal, ...updates } : goal
  );
  
  // Serialize goals properly before storing
  const serializedGoals = updatedGoals.map(serializeGoal);
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(serializedGoals));
  
  console.log(`Updated goal ${goalId}:`, updates);
};

export const deleteGoal = (goalId: string): void => {
  const existingGoals = getGoals();
  const updatedGoals = existingGoals.filter(goal => goal.id !== goalId);
  
  // Serialize goals properly before storing
  const serializedGoals = updatedGoals.map(serializeGoal);
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(serializedGoals));
  
  console.log(`Deleted goal ${goalId}`);
};

// Check for expired goals and mark them for settlement
export const checkGoalDeadlines = (): GoalData[] => {
  const goals = getGoals();
  const now = new Date();
  const expiredGoals: GoalData[] = [];
  
  goals.forEach(goal => {
    // If goal has expired and hasn't been completed yet
    if (now > goal.targetDate && !goal.isCompleted && !goal.isProcessing && !goal.readyForSettlement) {
      // Mark the goal as ready for processing
      goal.readyForSettlement = true;
      updateGoal(goal.id, { readyForSettlement: true });
      expiredGoals.push(goal);
    }
  });
  
  return expiredGoals;
};

// Get all goals that are ready for settlement
export const getGoalsReadyForSettlement = (): GoalData[] => {
  const goals = getGoals();
  return goals.filter(goal => goal.readyForSettlement && !goal.isCompleted);
};

// Save simulated wallet balance
export const saveWalletBalance = (balance: number): void => {
  localStorage.setItem(WALLET_BALANCE_KEY, balance.toString());
  console.log('Saved wallet balance to localStorage:', balance);
};

// Get simulated wallet balance
export const getWalletBalance = (): number => {
  const balanceStr = localStorage.getItem(WALLET_BALANCE_KEY);
  if (!balanceStr) return 10; // Default starting balance
  
  try {
    return parseFloat(balanceStr);
  } catch (err) {
    console.error('Error parsing wallet balance from storage:', err);
    return 10; // Default starting balance
  }
};

// Update simulated wallet balance
export const updateWalletBalance = (amount: number, operation: 'add' | 'subtract'): number => {
  const currentBalance = getWalletBalance();
  let newBalance: number;
  
  if (operation === 'add') {
    newBalance = currentBalance + amount;
  } else {
    newBalance = Math.max(0, currentBalance - amount);
  }
  
  saveWalletBalance(newBalance);
  return newBalance;
}; 