import React, { useState, useEffect } from 'react';
import { Filter, Plus, Calendar, Tag, CreditCard, Edit, Trash2, Zap, ArrowDown, ArrowUp, DollarSign, Clock, ExternalLink } from 'lucide-react';
import useAppStore from './state-utils/state-management';
import { executeQuery } from '../postgres-proxy/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import RecentTransactions from './Wallet/RecentTransactions';
import { checkStakingEvents, seedStakingEvents, updateStakingEventsWithConnectedWallet } from '../seed-data';

// Define interfaces for our data types
interface StakingEvent {
  id: string;
  token: string;
  amount: string;
  wallet_address: string;
  transaction_signature: string;
  staking_program_id: string;
  staked_at: string;
}

interface Expense {
  id?: string;
  from_acc: string;
  to_acc: string;
  from_name: string;
  to_name: string;
  category: string;
  amount: number;
  description: string;
  created_at: string;
  transaction_signature?: string;
  isStakingEvent: boolean;
  token?: string;
}

// For database query results
interface QueryResult {
  rows?: any[];
  [key: string]: any;
}

const Expenses = () => {

const { dataVersion, setDataVersion } = useAppStore();
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<{start: string | null, end: string | null}>({start: null, end: null});
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [stakingEvents, setStakingEvents] = useState<any[]>([]);
  const [combinedTransactions, setCombinedTransactions] = useState<any[]>([]);
  const { publicKey, connected } = useWallet();
  const [tableHeight, setTableHeight] = useState<number>(500);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);

  // Add a new state variable to control the transaction view
  // Default to showing Solana transactions when wallet is connected
  const [showSolanaTransactions, setShowSolanaTransactions] = useState<boolean>(false);
  
  // Update showSolanaTransactions when wallet connection changes
  useEffect(() => {
    if (connected) {
      setShowSolanaTransactions(true);
      
      // If wallet is connected, update sample staking events with the connected wallet address
      if (publicKey) {
        updateStakingEventsWithConnectedWallet(publicKey.toString());
        // Refresh data when wallet is connected
        fetchData();
      }
    }
  }, [connected, publicKey]);

  // Fetch data when showSolanaTransactions changes
  useEffect(() => {
    if (showSolanaTransactions) {
      fetchData();
    }
  }, [showSolanaTransactions]);

  // Check if there are staking events and seed them if needed
  useEffect(() => {
    const checkAndSeedStakingEvents = async () => {
      try {
        setIsSeeding(true);
        const count = await checkStakingEvents();
        console.log(`Found ${count} staking events`);
        
        // If there are fewer than 5 staking events, seed the database
        if (count < 5) {
          console.log('Seeding staking events...');
          await seedStakingEvents();
          
          // If wallet is connected, update sample staking events with the connected wallet address
          if (connected && publicKey) {
            await updateStakingEventsWithConnectedWallet(publicKey.toString());
          }
          
          // Trigger a data refresh
          setDataVersion(dataVersion + 1);
        }
      } catch (error) {
        console.error('Error checking or seeding staking events:', error);
      } finally {
        setIsSeeding(false);
      }
    };
    
    checkAndSeedStakingEvents();
  }, []);

  // Adjust table height based on window size
  useEffect(() => {
    const updateTableHeight = () => {
      // Calculate available height (viewport height minus other UI elements)
      const viewportHeight = window.innerHeight;
      const estimatedOtherUIHeight = 450; // Header, cards, filters, etc.
      const availableHeight = Math.max(300, viewportHeight - estimatedOtherUIHeight);
      setTableHeight(availableHeight);
    };

    // Initial calculation
    updateTableHeight();
    
    // Update on window resize
    window.addEventListener('resize', updateTableHeight);
    return () => window.removeEventListener('resize', updateTableHeight);
  }, []);

  // Helper functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.category_id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const getAccountName = (accountId: string): string => {
    const account = accounts.find(a => a.account_id === accountId);
    return account ? account.name : 'Unknown';
  };

  // New function to fetch staking events
  const fetchStakingEvents = async (): Promise<StakingEvent[]> => {
    try {
      // Fetch all staking events
      const stakingResult = await executeQuery(`
        SELECT * FROM staking_events 
        ORDER BY staked_at DESC
      `);
      
      if (stakingResult && stakingResult.length > 0) {
        // Transform the results to match the StakingEvent interface
        const events: StakingEvent[] = stakingResult.map((result: any) => ({
          id: result.id || '',
          token: result.token || 'SOL',
          amount: result.amount || '0',
          wallet_address: result.wallet_address || '',
          transaction_signature: result.transaction_signature || '',
          staking_program_id: result.staking_program_id || '',
          staked_at: result.staked_at || new Date().toISOString()
        }));
        
        setStakingEvents(events);
        return events;
      }
      return [];
    } catch (error) {
      console.error('Error fetching staking events:', error);
      return [];
    }
  };

  // Convert staking events to expense format
  const convertStakingEventsToExpenses = (events: StakingEvent[]): Expense[] => {
    if (!events || events.length === 0) return [];
    
    return events.map(event => ({
      from_acc: event.wallet_address,
      to_acc: event.staking_program_id || 'Solana Staking Program',
      from_name: `${event.wallet_address.substring(0, 4)}...${event.wallet_address.substring(event.wallet_address.length - 4)}`,
      to_name: 'Solana Staking',
      category: 'Investments',
      amount: parseFloat(event.amount),
      description: `Staked ${event.amount} ${event.token} on Solana`,
      created_at: event.staked_at,
      transaction_signature: event.transaction_signature,
      isStakingEvent: true, // Flag to identify staking events
      token: event.token
    }));
  };

  const fetchData = async () => {
    try {
      // Fetch expenses
      const expensesResult = await executeQuery('SELECT * FROM money_movement');
      console.log("-----------expenses_______", expensesResult)
      
      // Fetch staking events
      const stakingEvents = await fetchStakingEvents();
      
      // Process the expenses data
      let expenses: Expense[] = [];
      if (expensesResult && expensesResult[0] && expensesResult[0].rows) {
        expenses = expensesResult[0].rows.map(row => ({
          id: row.id,
          from_acc: row.from_acc,
          to_acc: row.to_acc,
          from_name: row.from_name,
          to_name: row.to_name,
          category: row.category,
          amount: parseFloat(row.amount),
          description: row.description,
          created_at: row.created_at,
          isStakingEvent: false // Flag to identify regular expenses
        }));
      }
      
      // Convert staking events to expense format
      const stakingExpenses = convertStakingEventsToExpenses(stakingEvents);
      
      // Combine and sort all transactions by date (newest first)
      const combined = [...expenses].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
      
      setCombinedTransactions(combined);
      setFilteredExpenses(combined);
      console.log("Combined transactions:", combined);
    }
    catch (error) {
        console.error('Error fetching data:', error);
        // Set empty arrays to prevent UI errors
        setFilteredExpenses([]);
        setCombinedTransactions([]);
        setCategories([]);
        setAccounts([]);
      }
}

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchData();
  }, []);
  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchData();
  }, [dataVersion]);


  // Event handlers
  const openFilterModal = () => {
    // Implementation for opening filter modal
  };

  const openAddExpenseModal = () => {
    // Implementation for opening add expense modal
  };

  const openAddCategoryModal = () => {
    // Implementation for opening add category modal
  };

  const openAddAccountModal = () => {
    // Implementation for opening add account modal
  };
  
  const openEditExpenseModal = (expense: any) => {
    // Implementation for opening edit expense modal
  };

  const handleDeleteExpense = (expenseId: string) => {
    // Implementation for deleting an expense
  };

  const clearFilters = () => {
    setDateFilter({start: null, end: null});
    setCategoryFilter(null);
    setAccountFilter(null);
  };

  // Toggle between regular expenses and Solana transactions
  const toggleTransactionView = () => {
    setShowSolanaTransactions(!showSolanaTransactions);
  };

  // Function to generate a sensible title for unknown transaction types
  const getSolanaTransactionTitle = (tx: any) => {
    if (tx.type && tx.type !== 'Unknown') {
      return tx.type;
    }
    
    // If type is unknown, try to create a meaningful title from other data
    if (tx.fee) {
      return `Transaction (Fee: ${tx.fee / 1000000} SOL)`;
    }
    
    if (tx.slot) {
      return `#${tx.slot}`;
    }
    
    if (tx.timestamp) {
      const date = new Date(tx.timestamp);
      return `Transaction on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    }
    
    // If all else fails, use a portion of the signature
    if (tx.signature) {
      return `Transaction ${tx.signature.substring(0, 8)}...`;
    }
    
    return 'Solana Transaction';
  };

  // Add a staking event for the connected wallet
  const addStakingEventForConnectedWallet = async () => {
    if (!connected || !publicKey) {
      console.log('No wallet connected');
      return;
    }
    
    try {
      setIsSeeding(true);
      const walletAddress = publicKey.toString();
      const validatorAddress = '8SQEcP4FaYQySktNQeyxF3w8pvArx3oMEh7fPrzkN9pu';
      const token = 'SOL';
      const amount = '1.0';
      const timestamp = new Date();
      const signature = `manual_tx_${Math.random().toString(36).substring(2, 15)}`;
      
      // Insert the staking event
      await executeQuery(`
        INSERT INTO staking_events (
          wallet_address, 
          amount, 
          token, 
          staking_program_id, 
          transaction_signature, 
          staked_at
        ) VALUES (
          '${walletAddress}', 
          '${amount}', 
          '${token}', 
          '${validatorAddress}', 
          '${signature}', 
          '${timestamp.toISOString()}'
        )
      `);
      
      console.log('Successfully added staking event for connected wallet');
      
      // Refresh data
      setDataVersion(dataVersion + 1);
      
      // Show a success message
      alert('Added a 1.0 SOL staking event for your wallet');
    } catch (error) {
      console.error('Error adding staking event:', error);
      
      // Show an error message
      alert('Failed to add staking event');
    } finally {
      setIsSeeding(false);
    }
  };

    return (
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="text-2xl font-bold text-gray-800">Track your Expenses and beyond!</h1>
            <p className="text-gray-600 mb-0">Monitor and manage all your financial transactions in one place.</p>
            
            <div className="flex space-x-3 items-center">
              {/* {!connected && (
                <div className="mr-2">
                  <WalletMultiButton />
                  <span className="text-xs text-gray-500 ml-2">Connect to see your Solana transactions</span>
                </div>
              )}
              {connected && (
                <button
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md flex items-center transition-colors"
                  onClick={toggleTransactionView}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {showSolanaTransactions ? 'Show All Expenses' : 'Show Solana Transactions'}
                </button>
              )} */}
     
              
              {/* Add a button to manually seed staking events */}
              {/* <button
                onClick={async () => {
                  setIsSeeding(true);
                  await seedStakingEvents();
                  if (connected && publicKey) {
                    await updateStakingEventsWithConnectedWallet(publicKey.toString());
                  }
                  setDataVersion(dataVersion + 1);
                  setIsSeeding(false);
                }}
                className="generate-dashboard-button"
                disabled={isSeeding}
              >
                <Zap className={`w-4 h-4 mr-2 ${isSeeding ? 'animate-pulse' : ''}`} />
                {isSeeding ? 'Adding...' : 'Add Sample Transactions'}
              </button> */}
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="metrics-grid">
            <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="metric-icon bg-blue-400 bg-opacity-30 rounded-full p-2">
                <CreditCard size={24} className="text-white " />
              </div>
              <div className="metric-details">
                <h3 className="text-blue-100 font-bold">Total Expenses</h3>
                <p className="metric-value text-white text-2xl font-extrabold">{formatCurrency(filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0))}</p>
              </div>
            </div>
            
            <div className="metric-card bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="metric-icon bg-purple-400 bg-opacity-30 rounded-full p-2">
                <Tag size={24} className="text-white" />
              </div>
              <div className="metric-details">
                <h3 className="text-purple-100 font-bold">Categories</h3>
                <p className="metric-value text-white text-2xl font-extrabold">{new Set(filteredExpenses.map(expense => expense.category)).size}</p>
                <p className="text-sm text-purple-100">Unique categories used</p>
              </div>
            </div>
            
            <div className="metric-card bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="metric-icon bg-green-400 bg-opacity-30 rounded-full p-2">
                <Calendar size={24} className="text-white " />
              </div>
              <div className="metric-details">
                <h3 className="text-green-100 font-bold">Total Transactions</h3>
                <p className="metric-value text-white text-2xl font-extrabold">{filteredExpenses.length}</p>
                <p className="text-sm text-green-100">Unique transactions</p>
              </div>
            </div>
{/*             
            <div className="metric-card bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="metric-icon bg-amber-400 bg-opacity-30 rounded-full p-2">
                <Zap size={24} className="text-white animate-pulse" />
              </div>
              <div className="metric-details">
                <h3 className="text-amber-100 font-bold">Solana Transactions</h3>
                <p className="metric-value text-white text-2xl font-extrabold">
                  {showSolanaTransactions && connected ? 
                    (filteredExpenses.filter(exp => exp.isStakingEvent).length || '0') : '0'}
                </p>
                <p className="text-sm text-amber-100">Blockchain transactions</p>
              </div>
            </div> */}
          </div>
          
          {/* Active Filters Display */}
          {(dateFilter.start || dateFilter.end || categoryFilter || accountFilter) && (
            <div className="bg-gray-50 p-3 rounded-md mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Active Filters:</span>
              
              {dateFilter.start && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  From: {dateFilter.start}
                </span>
              )}
              
              {dateFilter.end && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  To: {dateFilter.end}
                </span>
              )}
              
              {categoryFilter && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center">
                  <Tag className="w-3 h-3 mr-1" />
                  {getCategoryName(categoryFilter)}
                </span>
              )}
              
              {accountFilter && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {getAccountName(accountFilter)}
                </span>
              )}
              
              <button
                onClick={clearFilters}
                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-xs"
              >
                Clear All
              </button>
            </div>
          )}
          
          {/* Main Content Area - Split into two sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Left Section - Expenses Table (2/3 width on large screens) */}
            <div className={`${showSolanaTransactions ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-700 text-white">
                  <h2 className="text-xl font-bold flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Expense Transactions
                  </h2>
                  <p className="text-sm opacity-80">
                    Track all your financial transactions in one place
                  </p>
                </div>
                
                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: `${tableHeight}px` }}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            Description
                            <span className="ml-1 text-gray-400">
                              <ArrowDown size={12} />
                            </span>
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            Amount
                            <span className="ml-1 text-gray-400">
                              <ArrowDown size={12} />
                            </span>
                          </div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      { filteredExpenses && filteredExpenses.length > 0 ? (
                        filteredExpenses.map((expense, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${expense.isStakingEvent ? 'bg-amber-50' : ''}`}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {expense.isStakingEvent ? (
                                <div className="flex items-center">
                                  <Zap size={16} className="text-amber-500 mr-2 flex-shrink-0" />
                                  <span className="truncate max-w-[200px]">{expense.description || '-'}</span>
                                </div>
                              ) : (
                                <span className="truncate max-w-[200px] block">{expense.description || '-'}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <span className={`px-2 py-1 ${expense.isStakingEvent ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'} rounded-full text-xs`}>
                                {expense.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <span className={`px-2 py-1 ${expense.isStakingEvent ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'} rounded-full text-xs`}>
                                {expense.from_name || (expense.from_acc ? `Account #${expense.from_acc}` : '-')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <span className={`px-2 py-1 ${expense.isStakingEvent ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'} rounded-full text-xs`}>
                                {expense.to_name || (expense.to_acc ? `Account #${expense.to_acc}` : '-')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              <span className={`${expense.isStakingEvent ? 'text-amber-600 font-bold' : 'text-gray-900'}`}>
                                {formatCurrency(expense.amount)}
                              </span>
                              {expense.isStakingEvent && (
                                <span className="ml-1 text-xs text-amber-500">{expense.token}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {expense.isStakingEvent ? (
                                <a
                                  href={`https://explorer.solana.com/tx/${expense.transaction_signature}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-600 hover:text-amber-900 mr-3 flex items-center justify-end"
                                >
                                  <span className="mr-1">View</span>
                                  <ExternalLink size={14} />
                                </a>
                              ) : (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => openEditExpenseModal(expense)}
                                    className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                            No expenses found. Add some expenses to get started!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Right Section - Solana Transactions (1/3 width on large screens) */}
            {connected && showSolanaTransactions && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
                  <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-700 text-white">
                    <h2 className="text-xl font-bold flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      Solana Transactions
                    </h2>
                    <p className="text-sm opacity-80">
                      Your recent blockchain activity
                    </p>
                  </div>
                  
                  <div className="flex-grow overflow-y-auto" style={{ maxHeight: `${tableHeight}px` }}>
                    <RecentTransactions 
                      limit={10} 
                      showViewAll={false} 
                      key={`recent-transactions-${publicKey?.toString() || 'no-wallet'}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Placeholder for Solana transactions when not connected
          {!connected && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <Zap size={48} className="mx-auto text-amber-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Connect Your Solana Wallet</h3>
              <p className="text-gray-600 mb-4">Connect your wallet to see your Solana transactions alongside your regular expenses.</p>
              <WalletMultiButton />
            </div>
          )} */}
        
          <br />
          <br />
          <br />
          <br />
          <br />
        </div>  
    )
}


export default Expenses;