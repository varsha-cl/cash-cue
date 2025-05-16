import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { GoalData } from './StakingComponent';
import { SolanaStakingService } from './solanaStakingService';
import { SimulatedStakingService } from './simulatedStakingService';
import { recordSettlement } from './stakingHistoryService';
import { Edit, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import './Staking.css';
import { USE_SIMULATED_STAKING } from './StakingComponent';

interface GoalTrackerProps {
  goals: GoalData[];
  onGoalCompleted: (goalId: string, isCompleted: boolean) => void;
  onGoalDeleted: (goalId: string) => void;
  onGoalUpdated: (goalId: string, updates: Partial<GoalData>) => void;
}

const GoalTracker: React.FC<GoalTrackerProps> = ({ 
  goals, 
  onGoalCompleted, 
  onGoalDeleted,
  onGoalUpdated
}) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const solanaStakingService = new SolanaStakingService(connection);
  const simulatedStakingService = new SimulatedStakingService();
  
  const [processingGoal, setProcessingGoal] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GoalData>>({});
  const [error, setError] = useState<string | null>(null);

  // Check for expired goals on component mount and periodically
  useEffect(() => {
    const checkExpiredGoals = () => {
      const now = new Date();
      goals.forEach(goal => {
        if (now > goal.targetDate && !goal.isCompleted && !goal.readyForSettlement) {
          onGoalUpdated(goal.id, { readyForSettlement: true });
        }
      });
    };
    
    // Check immediately
    checkExpiredGoals();
    
    // Then check every minute
    const interval = setInterval(checkExpiredGoals, 60000);
    
    return () => clearInterval(interval);
  }, [goals, onGoalUpdated]);

  const isGoalExpired = (targetDate: Date): boolean => {
    return new Date() > targetDate;
  };

  const isGoalAchieved = (goal: GoalData): boolean => {
    // Check if all metrics have reached their target values
    return goal.metrics.every(metric => metric.currentValue >= metric.targetValue);
  };

  const handleClaimReward = async (goal: GoalData) => {
    if (!USE_SIMULATED_STAKING && (!publicKey || !signTransaction)) {
      setError('Wallet not connected or does not support transaction signing');
      return;
    }
    
    setProcessingGoal(goal.id);
    setError(null);
    
    try {
      // Mark goal as processing
      onGoalUpdated(goal.id, { isProcessing: true });
      
      const achieved = isGoalAchieved(goal);
      
      if (USE_SIMULATED_STAKING) {
        // Use simulated staking service
        await simulatedStakingService.settleStake(goal, achieved);
      } else {
        // Settle the stake using Solana staking service
        if (goal.stakeAccountPubkey) {
          await solanaStakingService.settleStake(
            publicKey!,
            signTransaction!,
            goal,
            achieved
          );
        }
      }
      
      // Record the settlement in staking history
      recordSettlement(goal, achieved);
      
      // Call the callback to update the goal status
      onGoalCompleted(goal.id, achieved);
      
      console.log(`Goal ${achieved ? 'achieved' : 'failed'}: ${goal.description}`);
      
    } catch (err) {
      console.error('Error processing goal:', err);
      setError(`Failed to process goal: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Reset processing state
      onGoalUpdated(goal.id, { isProcessing: false });
    } finally {
      setProcessingGoal(null);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      onGoalDeleted(goalId);
    }
  };

  const handleEditGoal = (goal: GoalData) => {
    setEditingGoal(goal.id);
    setEditForm({
      description: goal.description,
      targetDate: goal.targetDate,
      metrics: [...goal.metrics]
    });
  };

  const handleSaveEdit = (goalId: string) => {
    onGoalUpdated(goalId, editForm);
    setEditingGoal(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setEditForm({});
  };

  const handleMetricChange = (index: number, field: 'metricName' | 'currentValue' | 'targetValue', value: string | number) => {
    if (!editForm.metrics) return;
    
    const updatedMetrics = [...editForm.metrics];
    updatedMetrics[index] = {
      ...updatedMetrics[index],
      [field]: field === 'metricName' ? value : Number(value)
    };
    
    setEditForm({
      ...editForm,
      metrics: updatedMetrics
    });
  };

  return (
    <div className="goal-tracker-container">
      <h2>Your Staked Goals</h2>
      
      {error && (
        <div className="staking-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {goals.length === 0 ? (
        <p>You don't have any staked goals yet.</p>
      ) : (
        <div className="goals-list">
          {goals.map(goal => {
            const expired = isGoalExpired(goal.targetDate);
            const achieved = isGoalAchieved(goal);
            const canClaim = expired && !goal.isCompleted;
            const isEditing = editingGoal === goal.id;
            
            return (
              <div 
                key={goal.id} 
                className={`goal-card ${expired ? (achieved ? 'achieved' : 'failed') : ''}`}
              >
                {isEditing ? (
                  <div className="edit-form">
                    <h3>Edit Goal</h3>
                    
                    <div className="form-group">
                      <label>Description</label>
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Target Date</label>
                      <input
                        type="date"
                        value={editForm.targetDate instanceof Date 
                          ? editForm.targetDate.toISOString().split('T')[0] 
                          : ''}
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          targetDate: new Date(e.target.value)
                        })}
                      />
                    </div>
                    
                    {editForm.metrics?.map((metric, index) => (
                      <div key={index} className="metric-edit">
                        <div className="form-group">
                          <label>Metric Name</label>
                          <input
                            type="text"
                            value={metric.metricName}
                            onChange={(e) => handleMetricChange(index, 'metricName', e.target.value)}
                          />
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group half">
                            <label>Current Value</label>
                            <input
                              type="number"
                              value={metric.currentValue}
                              onChange={(e) => handleMetricChange(index, 'currentValue', e.target.value)}
                              min="0"
                            />
                          </div>
                          
                          <div className="form-group half">
                            <label>Target Value</label>
                            <input
                              type="number"
                              value={metric.targetValue}
                              onChange={(e) => handleMetricChange(index, 'targetValue', e.target.value)}
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="edit-actions">
                      <button 
                        className="edit-button save" 
                        onClick={() => handleSaveEdit(goal.id)}
                      >
                        Save Changes
                      </button>
                      <button 
                        className="edit-button cancel" 
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="goal-header">
                      <h3>{goal.description}</h3>
                      {!goal.isCompleted && !expired && (
                        <div className="goal-actions">
                          <button 
                            className="icon-button" 
                            onClick={() => handleEditGoal(goal)}
                            title="Edit Goal"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="icon-button" 
                            onClick={() => handleDeleteGoal(goal.id)}
                            title="Delete Goal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="goal-details">
                      <p>
                        <strong>Target Date:</strong> {goal.targetDate.toLocaleDateString()}
                        {expired && <span className="expired-tag">Expired</span>}
                      </p>
                      
                      <p><strong>Staked Amount:</strong> {goal.stakeAmount} SOL</p>
                      
                      {goal.stakeAccountPubkey && (
                        <p className="stake-account">
                          <strong>Stake Account:</strong> 
                          <span className="pubkey">{`${goal.stakeAccountPubkey.substring(0, 8)}...${goal.stakeAccountPubkey.substring(goal.stakeAccountPubkey.length - 8)}`}</span>
                        </p>
                      )}
                      
                      <div className="metrics-list">
                        <strong>Metrics:</strong>
                        {goal.metrics.map((metric, index) => (
                          <div key={index} className="metric-item">
                            <span>{metric.metricName}:</span>
                            <div className="metric-progress">
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{ 
                                    width: `${Math.min(100, (metric.currentValue / metric.targetValue) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="progress-text">
                                {metric.currentValue} / {metric.targetValue}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {canClaim && (
                      <button 
                        className={`claim-button ${achieved ? 'success' : 'failure'}`}
                        onClick={() => handleClaimReward(goal)}
                        disabled={processingGoal === goal.id || goal.isProcessing}
                      >
                        {processingGoal === goal.id || goal.isProcessing
                          ? 'Processing...' 
                          : achieved 
                            ? 'Claim Reward' 
                            : 'Settle Stake'}
                      </button>
                    )}
                    
                    {goal.isCompleted && (
                      <div className="goal-status">
                        {achieved 
                          ? (
                            <div className="status-success">
                              <CheckCircle size={16} />
                              <span>Goal achieved! Reward claimed.</span>
                            </div>
                          ) : (
                            <div className="status-failure">
                              <XCircle size={16} />
                              <span>Goal not met. Stake settled.</span>
                            </div>
                          )
                        }
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalTracker; 