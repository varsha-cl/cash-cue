import React from 'react';
import { getGoals, getWalletBalance } from './stakingService';

const DebugPanel: React.FC = () => {
  const goals = getGoals();
  const walletBalance = getWalletBalance();
  
  const clearLocalStorage = () => {
    if (window.confirm('Are you sure you want to clear all stored goals and reset wallet balance?')) {
      localStorage.clear();
      window.location.reload();
    }
  };
  
  return (
    <div className="debug-panel">
      <h3>Debug Panel</h3>
      <div className="debug-info">
        <p><strong>Simulated Wallet Balance:</strong> {walletBalance.toFixed(4)} SOL</p>
        <p><strong>Stored Goals:</strong> {goals.length}</p>
      </div>
      <button className="debug-button" onClick={clearLocalStorage}>
        Clear Storage & Reset
      </button>
    </div>
  );
};

export default DebugPanel; 