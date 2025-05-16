import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { fetchAndFormatTransactions, TransactionData, delay, getCachedTransactions } from './transactionService';
import './RecentTransactions.css';
import { Zap, ExternalLink, Clock, AlertTriangle, RefreshCw, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface RecentTransactionsProps {
  limit?: number;
  showViewAll?: boolean;
  onViewAllClick?: () => void;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
  limit = 5,
  showViewAll = true,
  onViewAllClick
}) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [usingCachedData, setUsingCachedData] = useState<boolean>(false);

  // Fetch transactions with simplified logic
  const fetchTransactions = async (force = false) => {
    if (!publicKey) {
      console.log('No public key available');
      return;
    }

    console.log('RecentTransactions: Starting fetch, publicKey:', publicKey.toString());

    // Don't refetch if we've fetched within the last 30 seconds (unless forced)
    const now = Date.now();
    if (!force && now - lastFetchTime < 30000 && transactions.length > 0) {
      console.log('Skipping fetch - recently fetched');
      return;
    }

    // Always check for cached transactions first, even before setting loading state
    const cachedData = getCachedTransactions(publicKey.toString(), limit);
    console.log('RecentTransactions: Cached data:', cachedData ? cachedData.length : 0, 'transactions');
    
    // Always use cached data if available
    if (cachedData && cachedData.length > 0) {
      console.log('RecentTransactions: Using cached data');
      setTransactions(cachedData);
      setUsingCachedData(true);
      // If we have cached data, we can show it immediately
      // Only set loading if we don't have any transactions yet
      setLoading(transactions.length === 0);
    } else {
      // No cached data, show loading state
      setLoading(true);
    }
    
    try {
      console.log('RecentTransactions: Fetching fresh data...');
      const formattedTxs = await fetchAndFormatTransactions(connection, publicKey, limit);
      console.log('RecentTransactions: Fetched', formattedTxs.length, 'transactions');
      
      // Always update transactions if we got any
      if (formattedTxs.length > 0) {
        console.log('RecentTransactions: Setting transactions to fresh data');
        setTransactions(formattedTxs);
        setUsingCachedData(false);
      } else if (transactions.length === 0) {
        // If we didn't get any transactions and don't have any cached ones
        console.log('RecentTransactions: No transactions found');
      }
      
      setLastFetchTime(Date.now());
      setError(null); // Clear any previous errors
    } catch (err: any) {
      // This should never happen with the updated fetchAndFormatTransactions
      console.error('Unexpected error in RecentTransactions:', err);
      // Only set error if we don't have any transactions to show
      if (transactions.length === 0) {
        setError('Failed to fetch transactions');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount or when dependencies change
  useEffect(() => {
    console.log('RecentTransactions: useEffect triggered, publicKey:', publicKey?.toString());
    if (publicKey) {
      // Immediately check for cached transactions
      const cachedData = getCachedTransactions(publicKey.toString(), limit);
      if (cachedData && cachedData.length > 0) {
        console.log('RecentTransactions: Found cached data on mount, using it');
        setTransactions(cachedData);
        setUsingCachedData(true);
      }
      
      // Then fetch fresh data
      fetchTransactions();
    } else {
      // Reset state when wallet disconnects
      setTransactions([]);
      setError(null);
      setLoading(false);
      setUsingCachedData(false);
    }
  }, [publicKey, connection]);

  const handleManualRetry = () => {
    fetchTransactions(true); // Force refetch
  };

  if (!publicKey) {
    return null;
  }

  const formatDate = (timestamp: Date | null) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    }
  };

  // Function to generate a sensible title for unknown transaction types
  const getTransactionTitle = (tx: TransactionData) => {
    if (tx.type && tx.type !== 'Unknown') {
      return tx.type;
    }
    
    // If type is unknown, try to create a meaningful title from other data
    if (tx.fee) {
      return `Transaction (Fee: ${tx.fee / 1000000} SOL)`;
    }
    
    if (tx.slot) {
      return `Transaction at Slot #${tx.slot}`;
    }
    
    if (tx.timestamp) {
      const date = new Date(tx.timestamp);
      return `Transaction on ${date.toLocaleDateString()}`;
    }
    
    // If all else fails, use a portion of the signature
    if (tx.signature) {
      return `Transaction ${tx.signature.substring(0, 8)}...`;
    }
    
    return 'Solana Transaction';
  };

  // Function to get appropriate icon for transaction type
  const getTransactionIcon = (tx: TransactionData) => {
    if (tx.type.includes('Staking')) {
      return <Zap size={16} />;
    } else if (tx.type.includes('Token')) {
      return <DollarSign size={16} />;
    } else if (tx.type.includes('System')) {
      return tx.status === 'Success' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />;
    } else {
      return tx.status === 'Success' ? '✓' : '✗';
    }
  };

  // Add debug logging to the render function
  console.log('RecentTransactions: Rendering with', transactions.length, 'transactions, loading:', loading, 'usingCachedData:', usingCachedData);

  return (
    <div className="recent-transactions">
      <div className="recent-transactions-header">
        <h3>Recent Transactions</h3>
        <div className="flex items-center">
          <button 
            className="refresh-button mr-2"
            onClick={handleManualRetry}
            disabled={loading}
            title="Refresh transactions"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {showViewAll && transactions.length > 0 && (
            <button 
              className="view-all-button"
              onClick={onViewAllClick}
            >
              View All
            </button>
          )}
        </div>
      </div>

      {usingCachedData && transactions.length > 0 && (
        <div className="cached-data-notice">
          <Clock size={14} className="mr-1" />
          <span>Showing cached data. </span>
          <button 
            onClick={handleManualRetry} 
            className="text-amber-500 hover:text-amber-600 underline"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      )}
      
      {loading && transactions.length === 0 ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <div className="mt-2">Loading transactions...</div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="no-transactions">No recent transactions found</div>
      ) : (
        <div className="transaction-list-compact">
          {transactions.map((tx) => (
            <div key={tx.signature} className="transaction-item-compact">
              <div className={`transaction-icon ${tx.status.toLowerCase()}`}>
                {getTransactionIcon(tx)}
              </div>
              <div className="transaction-info">
                <div className="transaction-type" title={tx.type}>
                  {getTransactionTitle(tx)}
                </div>
                <div className="transaction-time">
                  <Clock size={12} className="inline mr-1" />
                  {formatDate(tx.timestamp)}
                  {tx.fee > 0 && (
                    <span className="ml-2 text-gray-500">Fee: {(tx.fee / 1000000).toFixed(6)} SOL</span>
                  )}
                </div>
              </div>
              <div className={`transaction-status ${tx.status.toLowerCase()}`}>
                {tx.status}
              </div>
              <a 
                href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="transaction-link"
                title="View on Solana Explorer"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
          
          {loading && transactions.length > 0 && (
            <div className="flex justify-center items-center py-2 text-xs text-gray-500">
              <div className="loading-spinner-small mr-2"></div>
              Refreshing...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentTransactions; 