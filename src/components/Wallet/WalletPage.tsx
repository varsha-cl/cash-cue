import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import TransactionDashboard from './TransactionDashboard';
import './WalletPage.css';

const WalletPage: React.FC = () => {
  const { publicKey, connected } = useWallet();

  return (
    <div className="wallet-page">
      <div className="wallet-header">
        <h1>Wallet Dashboard</h1>
        <WalletMultiButton />
      </div>

      {connected && publicKey ? (
        <div className="wallet-content">
          <div className="wallet-info">
            <h2>Wallet Address</h2>
            <div className="wallet-address">
              {publicKey.toString()}
            </div>
          </div>
          
          <TransactionDashboard defaultView="recent" />
        </div>
      ) : (
        <div className="wallet-connect-prompt">
          <p>Connect your wallet to view your transaction history</p>
        </div>
      )}
    </div>
  );
};

export default WalletPage; 