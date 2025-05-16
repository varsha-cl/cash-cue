import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import StakingComponent, { GoalData } from './StakingComponent';
import GoalTracker from './GoalTracker';
import StakingHistory from './StakingHistory';
import { saveGoal, getGoals, updateGoal, deleteGoal, checkGoalDeadlines } from './stakingService';
import { Coins, Plus, List, History } from 'lucide-react';
import './Staking.css';
import DebugPanel from './DebugPanel';

interface DashboardStakingProps {
  dashboardGenerated: boolean;
  metrics?: {
    name: string;
    value: number;
  }[];
  forceShow?: boolean;
}

const DashboardStaking: React.FC<DashboardStakingProps> = ({ 
  dashboardGenerated,
  metrics = [],
  forceShow = false
}) => {
  const { connected } = useWallet();
  const [showStaking, setShowStaking] = useState<boolean>(false);
  const [showGoals, setShowGoals] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [goals, setGoals] = useState<GoalData[]>([]);

  // Load goals from storage on component mount
  useEffect(() => {
    const loadGoals = () => {
      const loadedGoals = getGoals();
      console.log('Loaded goals:', loadedGoals);
      setGoals(loadedGoals);
      
      // Check for expired goals
      const expiredGoals = checkGoalDeadlines();
      if (expiredGoals.length > 0) {
        console.log('Found expired goals:', expiredGoals);
      }
    };
    
    // Load goals immediately
    loadGoals();
    
    // Set up an interval to refresh goals periodically
    const intervalId = setInterval(loadGoals, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Handle goal completion
  const handleGoalCompleted = (goalId: string, isCompleted: boolean) => {
    updateGoal(goalId, { 
      isCompleted,
      isProcessing: false,
      readyForSettlement: false,
      completedDate: new Date()
    });
    
    // Update local state
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              isCompleted,
              isProcessing: false,
              readyForSettlement: false,
              completedDate: new Date()
            } 
          : goal
      )
    );
  };

  // Handle goal deletion
  const handleGoalDeleted = (goalId: string) => {
    deleteGoal(goalId);
    
    // Update local state
    setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
  };

  // Handle goal updates
  const handleGoalUpdated = (goalId: string, updates: Partial<GoalData>) => {
    updateGoal(goalId, updates);
    
    // Update local state
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? { ...goal, ...updates } 
          : goal
      )
    );
  };

  // Handle new goal creation
  const handleStakeComplete = (goalData: GoalData) => {
    saveGoal(goalData);
    setGoals(prevGoals => [...prevGoals, goalData]);
    setShowStaking(false);
    setShowGoals(true);
    setShowHistory(false);
  };

  // Update current values for metrics in goals based on dashboard data
  useEffect(() => {
    if (dashboardGenerated && metrics.length > 0) {
      const updatedGoals = goals.map(goal => {
        const updatedMetrics = goal.metrics.map(metric => {
          const matchingDashboardMetric = metrics.find(m => 
            m.name.toLowerCase() === metric.metricName.toLowerCase()
          );
          
          if (matchingDashboardMetric) {
            return {
              ...metric,
              currentValue: matchingDashboardMetric.value
            };
          }
          
          return metric;
        });
        
        return {
          ...goal,
          metrics: updatedMetrics
        };
      });
      
      // Update goals with new metric values
      updatedGoals.forEach(goal => {
        if (JSON.stringify(goal) !== JSON.stringify(goals.find(g => g.id === goal.id))) {
          updateGoal(goal.id, goal);
        }
      });
      
      setGoals(updatedGoals);
    }
  }, [dashboardGenerated, metrics]);

  // If forceShow is true, always render regardless of dashboardGenerated
  // This ensures the component is visible for debugging
  if (forceShow || dashboardGenerated) {
    return (
      <div className="dashboard-staking" style={{ display: 'block' }}>
        <div className="staking-actions">
          <button 
            className={`action-button ${showGoals ? 'active' : ''}`}
            onClick={() => {
              setShowStaking(false);
              setShowGoals(true);
              setShowHistory(false);
            }}
            disabled={!connected}
          >
            <List size={18} />
            <span>View Goals</span>
          </button>
          
          <button 
            className={`action-button ${showStaking ? 'active' : ''}`}
            onClick={() => {
              setShowStaking(true);
              setShowGoals(false);
              setShowHistory(false);
            }}
            disabled={!connected}
          >
            <Plus size={18} />
            <span>New Goal</span>
          </button>
          
          <button 
            className={`action-button ${showHistory ? 'active' : ''}`}
            onClick={() => {
              setShowStaking(false);
              setShowGoals(false);
              setShowHistory(true);
            }}
            disabled={!connected}
          >
            <History size={18} />
            <span>History</span>
          </button>
        </div>
        
        {!connected && (
          <div className="staking-connect-wallet">
            <div className="connect-wallet-icon">
              <Coins size={48} />
            </div>
            <h3>Connect Your Wallet</h3>
            <p>Please connect your Solana wallet to stake SOL and set productivity goals.</p>
          </div>
        )}
        
        {connected && showStaking && (
          <StakingComponent 
            isWalletConnected={connected}
            onStakeComplete={handleStakeComplete}
          />
        )}
        
        {connected && showGoals && (
          <GoalTracker 
            goals={goals}
            onGoalCompleted={handleGoalCompleted}
            onGoalDeleted={handleGoalDeleted}
            onGoalUpdated={handleGoalUpdated}
          />
        )}
        
        {/* {connected && showHistory && (
          <StakingHistory />
        )} */}
        
        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </div>
    );
  }

  // If we reach here, don't render anything
  console.log('DashboardStaking not rendering: dashboardGenerated =', dashboardGenerated, 'forceShow =', forceShow);
  return null;
};

export default DashboardStaking; 