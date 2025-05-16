import React, { useState, useEffect } from 'react';
import { useDBStore } from './stores';
import { SAMPLE_DATA } from './postgres/sample-data';
import ChatUi from '../chat-system/chat-ui';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import { SolanaWalletProvider } from './components/Wallet/WalletProvider';
import WalletConnector from './components/Wallet/WalletConnector';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);

  // Add auth state listener to track user login status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle user logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setWalletConnected(false); // Disconnect wallet on logout
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    }
  };

  // Handle wallet connection status change
  const handleWalletConnection = (connected: boolean) => {
    setWalletConnected(connected);
  };

  useEffect(() => {
    const importSampleData = async () => {
      try {
        // Import sample data for orders
        const ordersData = SAMPLE_DATA.find(data => data.key === "orders");
        if (ordersData) {
          await useDBStore.getState().import(ordersData);
          console.log("Orders data imported successfully");
        }

        // Import sample data for schools
        const schoolsData = SAMPLE_DATA.find(data => data.key === "schools");
        if (schoolsData) {
          await useDBStore.getState().import(schoolsData);
          console.log("Schools data imported successfully");
        }
      } catch (err) {
        setError('Error importing sample data');
        console.error('Error:', err);
      }
    };

    importSampleData();
  }, []);

  return (
    <SolanaWalletProvider>
      <div>
        <h1>App Component</h1>
        {error && <p className="error">{error}</p>}
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {user ? (
              <div>
                <p>Welcome, {user.email}</p>
                <WalletConnector 
                  onConnectionChange={handleWalletConnection} 
                  isUserLoggedIn={!!user}
                />
                {walletConnected && <p>Wallet connected successfully!</p>}
                <button onClick={handleLogout}>Logout</button>
                <ChatUi />
              </div>
            ) : (
              <p>Please log in to access the application</p>
            )}
          </>
        )}
      </div>
    </SolanaWalletProvider>
  );
}

export default App;
