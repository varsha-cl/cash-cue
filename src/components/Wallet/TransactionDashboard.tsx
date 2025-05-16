import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import TransactionHistory from './TransactionHistory';
import RecentTransactions from './RecentTransactions';
import './TransactionDashboard.css';

interface TransactionDashboardProps {
  defaultView?: 'recent' | 'history';
}

const TransactionDashboard: React.FC<TransactionDashboardProps> = ({ 
  defaultView = 'recent' 
}) => {
  const { publicKey } = useWallet();
  const [activeView, setActiveView] = useState<'recent' | 'history'>(defaultView);

  if (!publicKey) {
    return (
      <div className="transaction-dashboard wallet-not-connected">
        <p>Connect your wallet to view transaction history</p>
      </div>
    );
  }

  return (
    <div className="transaction-dashboard">
      <div className="dashboard-header">
        <h2>Wallet Transactions</h2>
        <div className="view-toggle">
          <button 
            className={`toggle-button ${activeView === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveView('recent')}
          >
            Recent
          </button>
          <button 
            className={`toggle-button ${activeView === 'history' ? 'active' : ''}`}
            onClick={() => setActiveView('history')}
          >
            Full History
          </button>
        </div>
      </div>

      {activeView === 'recent' ? (
        <div className="dashboard-content">
          <RecentTransactions 
            limit={10} 
            showViewAll={true}
            onViewAllClick={() => setActiveView('history')}
          />
        </div>
      ) : (
        <div className="dashboard-content">
          <TransactionHistory limit={20} showLoadMore={true} />
        </div>
      )}
    </div>
  );
};

export default TransactionDashboard; 