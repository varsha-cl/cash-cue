import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ArrowRight, Target, Calendar, BarChart3, Coins, AlertCircle } from 'lucide-react';
import { SolanaStakingService } from './solanaStakingService';
import { SimulatedStakingService } from './simulatedStakingService';
import './Staking.css';
import { getWalletBalance, saveWalletBalance } from './stakingService';
import { recordStake } from './stakingHistoryService';

// Set this to false to use real Solana transactions, or true to use simulated transactions
export const USE_SIMULATED_STAKING = true;

interface StakingProps {
  isWalletConnected: boolean;
  onStakeComplete: (goalData: GoalData) => void;
}

export interface Metric {
  metricName: string;
  currentValue: number;
  targetValue: number;
}

export interface GoalData {
  id: string;
  description: string;
  targetDate: Date;
  stakeAmount: number;
  stakeAccountPubkey?: string;
  transactionId?: string;
  isCompleted: boolean;
  completedDate?: Date;
  isProcessing: boolean;
  readyForSettlement: boolean;
  metrics: Metric[];
}

const StakingComponent: React.FC<StakingProps> = ({ isWalletConnected, onStakeComplete }) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const solanaStakingService = new SolanaStakingService(connection);
  const simulatedStakingService = new SimulatedStakingService();
  
  const [stakeAmount, setStakeAmount] = useState<number>(0.1);
  const [goalDescription, setGoalDescription] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [metricName, setMetricName] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [targetValue, setTargetValue] = useState<number>(0);
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Load wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!isWalletConnected) {
        setWalletBalance(0);
        return;
      }
      
      setIsLoadingBalance(true);
      
      try {
        if (USE_SIMULATED_STAKING) {
          // Use simulated wallet balance
          const simulatedBalance = getWalletBalance();
          setWalletBalance(simulatedBalance);
        } else if (publicKey) {
          // Fetch real wallet balance from Solana
          const balance = await connection.getBalance(publicKey);
          const solBalance = balance / LAMPORTS_PER_SOL;
          setWalletBalance(solBalance);
          
          // Also update the simulated balance for consistency
          saveWalletBalance(solBalance);
        }
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
      } finally {
        setIsLoadingBalance(false);
      }
    };
    
    fetchBalance();
    
    // Refresh balance every 30 seconds
    const intervalId = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [isWalletConnected, publicKey, connection]);

  if (!isWalletConnected) {
    return (
      <div className="staking-connect-wallet">
        <div className="connect-wallet-icon">
          <Coins size={48} />
        </div>
        <h3>Connect Your Wallet</h3>
        <p>Please connect your Solana wallet to stake SOL and set productivity goals.</p>
      </div>
    );
  }

  const handleStake = async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }

    if (!USE_SIMULATED_STAKING && !signTransaction) {
      setError('Your wallet does not support transaction signing. Please use a different wallet.');
      return;
    }

    if (!goalDescription || !targetDate || !metricName || targetValue <= 0 || stakeAmount <= 0) {
      setError('Please fill in all fields');
      return;
    }

    // Check if wallet has sufficient balance
    if (stakeAmount > walletBalance && !USE_SIMULATED_STAKING) {
      setError(`Insufficient balance. You have ${walletBalance.toFixed(4)} SOL but are trying to stake ${stakeAmount} SOL.`);
      return;
    }

    setIsStaking(true);
    setError(null);

    try {
      // Create goal data object
      const goalData: GoalData = {
        id: 'pending-tx-' + Math.random().toString(36).substring(2, 15),
        description: goalDescription,
        targetDate: new Date(targetDate),
        stakeAmount: stakeAmount,
        isCompleted: false,
        isProcessing: false,
        readyForSettlement: false,
        metrics: [
          {
            metricName,
            currentValue,
            targetValue
          }
        ]
      };
      
      let txId: string;
      
      if (USE_SIMULATED_STAKING) {
        // Use simulated staking service
        txId = await simulatedStakingService.createStakeAccount(stakeAmount, goalData);
        
        // Simulate wallet balance change
        setWalletBalance(prev => prev - stakeAmount);
      } else {
        // Use real Solana staking service
        txId = await solanaStakingService.createStakeAccount(
          publicKey,
          signTransaction!,
          stakeAmount,
          goalData
        );
        
        // Update wallet balance after staking
        const newBalance = await connection.getBalance(publicKey);
        setWalletBalance(newBalance / LAMPORTS_PER_SOL);
      }
      
      // Update goal data with transaction ID
      goalData.id = txId;
      goalData.transactionId = txId;
      
      // Record the stake in staking history
      recordStake(goalData);
      
      // Call the callback with the goal data
      onStakeComplete(goalData);

      // Reset form
      setGoalDescription('');
      setTargetDate('');
      setMetricName('');
      setCurrentValue(0);
      setTargetValue(0);
      setStakeAmount(0.1);
      
      console.log('Staking transaction completed:', txId);
    } catch (err) {
      console.error('Staking error:', err);
      setError(`Failed to stake SOL: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className="staking-container">
      <h2>Stake SOL for Your Goal</h2>
      <p className="staking-description">
        Set a productivity goal, stake SOL, and earn rewards when you meet your target!
      </p>
      
      {USE_SIMULATED_STAKING && (
        <div className="simulation-notice">
          <AlertCircle size={16} />
          <span>Running in simulation mode. No real SOL will be staked.</span>
        </div>
      )}
      
      {error && (
        <div className="staking-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="wallet-balance-display">
        <span className="balance-label">Your Wallet Balance:</span>
        {isLoadingBalance ? (
          <span className="balance-value loading">Loading...</span>
        ) : (
          <span className="balance-value">{walletBalance.toFixed(4)} SOL</span>
        )}
      </div>
      
      <div className="staking-form">
        <div className="form-group">
          <label htmlFor="goalDescription">Goal Description</label>
          <input
            id="goalDescription"
            type="text"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder="E.g., Complete 10 tasks this week"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="targetDate">Target Date</label>
          <input
            id="targetDate"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="metricName">Metric to Track</label>
          <input
            id="metricName"
            type="text"
            value={metricName}
            onChange={(e) => setMetricName(e.target.value)}
            placeholder="E.g., Tasks Completed"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group half">
            <label htmlFor="currentValue">Current Value</label>
            <input
              id="currentValue"
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(Number(e.target.value))}
              min="0"
            />
          </div>
          
          <div className="form-group half">
            <label htmlFor="targetValue">Target Value</label>
            <input
              id="targetValue"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              min="1"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="stakeAmount">Stake Amount (SOL)</label>
          <div className="stake-amount-input">
            <input
              id="stakeAmount"
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Number(e.target.value))}
              min="0.01"
              step="0.01"
              className={stakeAmount > walletBalance && !USE_SIMULATED_STAKING ? "input-error" : ""}
            />
            {stakeAmount > walletBalance && !USE_SIMULATED_STAKING && (
              <div className="input-error-icon">
                <AlertCircle size={16} />
              </div>
            )}
          </div>
          {stakeAmount > walletBalance && !USE_SIMULATED_STAKING && (
            <div className="input-error-message">
              Amount exceeds your balance
            </div>
          )}
        </div>
        
        <button 
          className="stake-button" 
          onClick={handleStake}
          disabled={
            isStaking || 
            (!USE_SIMULATED_STAKING && stakeAmount > walletBalance) || 
            !goalDescription || 
            !targetDate || 
            !metricName || 
            targetValue <= 0
          }
        >
          {isStaking ? 'Staking...' : 'Stake SOL'}
        </button>
      </div>
    </div>
  );
};

export default StakingComponent; 