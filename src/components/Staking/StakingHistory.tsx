import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getStakingHistory, StakingHistoryEntry } from './stakingHistoryService';
import { ArrowUpCircle, ArrowDownCircle, Clock, ExternalLink } from 'lucide-react';
import './Staking.css';

interface StakingHistoryProps {
  className?: string;
}

const StakingHistory: React.FC<StakingHistoryProps> = ({ className = '' }) => {
  const { connected } = useWallet();
  const [history, setHistory] = useState<StakingHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadHistory = () => {
      try {
        setLoading(true);
        const stakingHistory = getStakingHistory();
        console.log('Loaded staking history:', stakingHistory);
        
        // Sort history by timestamp (newest first)
        const sortedHistory = [...stakingHistory].sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
        
        setHistory(sortedHistory);
      } catch (error) {
        console.error('Error loading staking history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Load history immediately
    loadHistory();
    
    // Set up an interval to refresh history periodically
    const intervalId = setInterval(loadHistory, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Format date to a readable string
  const formatDate = (date: Date): string => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get icon based on transaction type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stake':
        return <ArrowUpCircle size={18} className="transaction-icon stake" />;
      case 'reward':
        return <ArrowDownCircle size={18} className="transaction-icon reward" />;
      case 'penalty':
        return <ArrowDownCircle size={18} className="transaction-icon penalty" />;
      default:
        return <Clock size={18} className="transaction-icon" />;
    }
  };

  // Get transaction type label
  const getTransactionTypeLabel = (type: string): string => {
    switch (type) {
      case 'stake':
        return 'Staked';
      case 'reward':
        return 'Reward';
      case 'penalty':
        return 'Penalty';
      default:
        return 'Unknown';
    }
  };

  // Get explorer URL for transaction
  const getExplorerUrl = (txId: string): string => {
    // For simulated transactions, we don't have a real URL
    if (txId.startsWith('mock-')) {
      return '#';
    }
    
    // For real transactions, link to Solana Explorer
    // Use devnet for development, mainnet for production
    const network = process.env.NODE_ENV === 'production' ? 'mainnet-beta' : 'devnet';
    return `https://explorer.solana.com/tx/${txId}?cluster=${network}`;
  };

  return (
    <div className={`staking-history-container ${className}`}>
      <h2>Staking History</h2>
      
      {!connected ? (
        <div className="staking-connect-wallet">
          <p>Please connect your wallet to view staking history.</p>
        </div>
      ) : loading ? (
        <div className="loading-indicator">
          <p>Loading staking history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="empty-history">
          <p>No staking history found. Start staking to see your history here!</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((entry) => (
            <div key={entry.id} className={`history-item ${entry.type}`}>
              <div className="history-icon">
                {getTransactionIcon(entry.type)}
              </div>
              
              <div className="history-details">
                <div className="history-header">
                  <span className="transaction-type">{getTransactionTypeLabel(entry.type)}</span>
                  <span className="transaction-amount">
                    {entry.type === 'stake' ? '-' : '+'}{entry.amount.toFixed(4)} SOL
                  </span>
                </div>
                
                <div className="history-description">
                  <span className="goal-description">{entry.goalDescription}</span>
                  <span className="transaction-date">{formatDate(entry.timestamp)}</span>
                </div>
                
                {entry.type !== 'stake' && entry.achieved !== undefined && (
                  <div className={`goal-status ${entry.achieved ? 'achieved' : 'failed'}`}>
                    {entry.achieved ? 'Goal achieved' : 'Goal not met'}
                  </div>
                )}
                
                <div className="transaction-link">
                  <a 
                    href={getExplorerUrl(entry.transactionId)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={entry.transactionId.startsWith('mock-') ? 'simulated' : ''}
                  >
                    <span>
                      {entry.transactionId.startsWith('mock-') 
                        ? 'Simulated Transaction' 
                        : 'View on Explorer'}
                    </span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StakingHistory; 