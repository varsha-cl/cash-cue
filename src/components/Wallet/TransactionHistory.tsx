import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  fetchAllTransactions, 
  fetchTransactionDetails, 
  formatTransactionData,
  TransactionData
} from './transactionService';
import './TransactionHistory.css';

interface TransactionHistoryProps {
  limit?: number;
  showLoadMore?: boolean;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
  limit = 10,
  showLoadMore = true
}) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastSignature, setLastSignature] = useState<string | undefined>(undefined);

  const fetchTransactions = async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch transaction signatures
      const options: any = { limit };
      if (lastSignature) {
        options.before = lastSignature;
      }
      
      const signatures = await connection.getSignaturesForAddress(publicKey, options);
      
      // Check if we have more transactions
      setHasMore(signatures.length === limit);
      
      // Update last signature for pagination
      if (signatures.length > 0) {
        setLastSignature(signatures[signatures.length - 1].signature);
      }

      // Fetch transaction details
      const signatureStrings = signatures.map(sig => sig.signature);
      const txDetails = await connection.getParsedTransactions(signatureStrings, {
        maxSupportedTransactionVersion: 0,
      });

      // Format transaction data
      const formattedTxs = signatures.map((sig, index) => {
        const tx = txDetails[index];
        return formatTransactionData(sig, tx);
      });

      // Update transactions
      setTransactions(prev => [...prev, ...formattedTxs]);
    } catch (err) {
      console.error('Error fetching wallet transactions:', err);
      setError('Failed to fetch transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset transactions when wallet changes
  useEffect(() => {
    setTransactions([]);
    setLastSignature(undefined);
    setHasMore(true);
    
    if (publicKey) {
      fetchTransactions();
    }
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="transaction-history wallet-not-connected">
        <p>Connect your wallet to view transaction history</p>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <h2>Transaction History</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {transactions.length === 0 && !loading ? (
        <div className="no-transactions">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="transaction-list">
          {transactions.map((tx) => (
            <div key={tx.signature} className="transaction-item">
              <div className="transaction-header">
                <div className="transaction-type">{tx.type}</div>
                <div className={`transaction-status ${tx.status.toLowerCase()}`}>
                  {tx.status}
                </div>
              </div>
              
              <div className="transaction-details">
                <div className="transaction-signature">
                  <span className="label">Signature:</span>
                  <a 
                    href={`https://explorer.solana.com/tx/${tx.signature}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                  </a>
                </div>
                
                <div className="transaction-time">
                  <span className="label">Time:</span>
                  {tx.timestamp ? tx.timestamp.toLocaleString() : 'Unknown'}
                </div>
                
                <div className="transaction-fee">
                  <span className="label">Fee:</span>
                  {tx.fee / 1000000000} SOL
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showLoadMore && hasMore && (
        <div className="load-more">
          <button 
            onClick={fetchTransactions} 
            disabled={loading}
            className="load-more-button"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
      
      {loading && <div className="loading">Loading transactions...</div>}
    </div>
  );
};

export default TransactionHistory; 