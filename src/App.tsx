// @ts-ignore
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { Clock, CheckSquare, LayoutDashboard, DollarSign, BarChart, Database } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import ChatUI from './chat-system/chat-ui';
import FeatureChatLayout from './layouts/feature-chat-layout';
import { auth } from './firebase/config';
import TaskManagement from './components/TaskManagement/TaskManagement';
import Dashboard from './components/Dashboard';
import LockIn from './components/LockIn/LockIn';
import SignInScreen from './components/SignInScreen';
import { useDBStore } from './postgres-db/stores';
import Chat from './components/Chat/Chat';
import { FaRobot } from 'react-icons/fa';
import useAppStore from './components/state-utils/state-management';
import AiButton from './components/AiButton';
import SQLPlayground from './components/SQLPlayground';
import { SolanaWalletProvider } from './components/Wallet/WalletProvider';
import WalletConnector from './components/Wallet/WalletConnector';
import './components/Wallet/wallet.css';
import Expenses from './components/Expenses';
import SolanaStaking from './components/SolanaWallet/SolanaStaking';
import { initializeDatabase } from './scripts/init-db';
import { TTSProvider, useTTS } from './context/TTSContext';
import SpeechControl from './components/SpeechControl/SpeechControl';

// Assuming you have the SQL as a string
const projectSQL = `
CREATE TABLE IF NOT EXISTS money_movement (
    id SERIAL PRIMARY KEY,
    from_acc VARCHAR(255),
    to_acc VARCHAR(255),
    from_name VARCHAR(255),
    to_name VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_category CHECK (category IN ('Housing', 'Groceries', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Dining Out', 'Education', 'Travel', 'Shopping', 'Personal Care', 'Gifts', 'Investments', 'Miscellaneous'))
);

CREATE TABLE IF NOT EXISTS graphs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data_query TEXT NOT NULL,
    dataset_label VARCHAR(255),
    background_colors TEXT[] DEFAULT ARRAY[
        '#FF6384', '#36A2EB', '#FFCE56', 
        '#4BC0C0', '#9966FF', '#FF9F40'
    ],
    hover_background_colors TEXT[],
    should_display BOOLEAN DEFAULT true, -- to indicate if the graph should be displayed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staking_events (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    amount VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255),
    transaction_signature VARCHAR(255),
    staking_program_id VARCHAR(255),
    staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nft_mints (
    id SERIAL PRIMARY KEY,
    mint_address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    metadata_uri TEXT NOT NULL,
    staking_token VARCHAR(255),
    staking_amount VARCHAR(255),
    wallet_address VARCHAR(255),
    transaction_signature VARCHAR(255),
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staking_events_wallet ON staking_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_mints_wallet ON nft_mints(wallet_address);
`;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const INTRO_TEXT = `Welcome to CashCow — a voice-first expense-tracking assistant. You can start typing or use the microphone to talk to CashCow`

  const INTRO_KEY = 'cashcow_intro_played';

  const { isTtsOn, synth } = useTTS();

  useEffect(() => {
    if (loading || !user || !synth || !isTtsOn) return;
    if (localStorage.getItem(INTRO_KEY) === 'yes') return;

    const playIntro = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;
      const u = new SpeechSynthesisUtterance(INTRO_TEXT);
      // u.voice = voices.find(v => /en-US/i.test(v.lang)) ?? voices[0];
      synth.speak(u);
      localStorage.setItem(INTRO_KEY, 'yes');
    };

    if (synth.getVoices().length) playIntro();
    else {
      synth.addEventListener('voiceschanged', playIntro);
      return () => synth.removeEventListener('voiceschanged', playIntro);
    }
  }, [loading, user, synth, isTtsOn]);


  useEffect(() => {
    const importSampleData = async () => {
      try {
        const dbName = "lockedin";
        const dbDescription = "Sample data for projects";
        const dbStore = useDBStore.getState();

        // Check if database exists
        if (dbStore.databases[dbName]) {
          console.log(`Database ${dbName} already exists.`);
          if (!dbStore.active || dbStore.active.name !== dbName) {
            await dbStore.connect(dbName);
          }
          // Initialize staking_events and nft_mints tables
          await initializeDatabase();
          return;
        }

        // Create and initialize the database
        await dbStore.create({ name: dbName, description: dbDescription });
        await dbStore.connect(dbName);

        try {
          console.log("Executing SQL to create tables");
          await dbStore.execute(projectSQL);

          // Initialize staking_events and nft_mints tables
          await initializeDatabase();
        } catch (sqlError) {
          // Check if this is a "table already exists" error
          if (sqlError instanceof Error &&
            sqlError.message.includes("relation") &&
            sqlError.message.includes("already exists")) {
            console.log("Table already exists, continuing...");
          } else {
            // For other SQL errors, log but don't fail
            console.error("SQL execution error:", sqlError);
          }
        }

      } catch (err) {
        setError('Error importing sample data');
        console.error('Error:', err);
      }
    };

    importSampleData();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setWalletConnected(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleWalletConnection = (connected: boolean) => {
    setWalletConnected(connected);
    console.log("Wallet connection status:", connected);
  };


  if (loading) {
    return <div>Loading...</div>;
  }



  return (
    <Router>
      <div className="h-screen flex flex-col overflow-hidden">
        <nav className="bg-white shadow-md">
          <div className="container mx-auto px-1 py-3">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <Link to="/" className="flex items-center px-4 py-2 text-xl font-bold text-blue-600 hover:text-blue-800">
                  <span>CashCow</span>
                </Link>
                <Link to="/expenses" className="flex items-center px-3 py-2 text-green-700 hover:text-green-900">
                  <DollarSign className="h-5 w-5 mr-1" />
                  <span>Expenses</span>
                </Link>
                {/* <Link to="/tasks" className="flex items-center px-3 py-2 text-gray-700 hover:text-gray-900">
                    <CheckSquare className="h-5 w-5 mr-1" />
                    <span>TaskManagement</span>
                  </Link> */}
                <Link to="/dashboard" className="flex items-center px-3 py-2 text-purple-700 hover:text-purple-900">
                  <BarChart className="h-5 w-5 mr-1" />
                  <span>Dashboard</span>
                </Link>
                {/* <Link to="/staking" className="flex items-center px-3 py-2 text-indigo-700 hover:text-indigo-900">
                    <BarChart className="h-5 w-5 mr-1" />
                    <span>Staking</span>
                  </Link> */}
                <Link to="/sql-playground" className="flex items-center px-3 py-2 text-orange-700 hover:text-orange-900">
                  <Database className="h-5 w-5 mr-1" />
                  <span>Playground</span>
                </Link>
              </div>
              <div className="flex items-center">
                <SpeechControl />



                {/* <span className="mr-4 text-gray-700">Hello, {user.displayName || user.email}</span> */}
                <span className="mr-4 text-gray-700">
                  <WalletConnector
                    onConnectionChange={handleWalletConnection}
                    isUserLoggedIn={!!user}
                  />

                </span>

                {/* <AiButton/> */}
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-grow overflow-hidden">
          <Routes>
            <Route element={<FeatureChatLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/tasks" element={<TaskManagement />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/staking" element={<SolanaStaking />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              <Route path="/sql-playground" element={<SQLPlayground />} />
            </Route>
          </Routes>
        </div>
      </div>
    </Router>
  );
}

// export default App;

export default function AppWithProviders() {
  return (
    <SolanaWalletProvider>
      <TTSProvider>
        <App />
      </TTSProvider>
    </SolanaWalletProvider>
  );
}

