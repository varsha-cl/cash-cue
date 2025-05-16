import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { aiServiceAPI } from '../Ai/Ai';
import { saveWalletBalance as saveSimulatedWalletBalance, getWalletBalance as getSimulatedWalletBalance } from '../Staking/stakingService';

// Default staking program ID (replace with your actual staking program ID)
const DEFAULT_STAKING_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

const SolanaStaking: React.FC = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const [amount, setAmount] = useState<number>(0.1);
  const [stakingProgramId, setStakingProgramId] = useState<string>(DEFAULT_STAKING_PROGRAM_ID);
  const [balance, setBalance] = useState<number | null>(null);
  const [stakingHistory, setStakingHistory] = useState<any[]>([]);
  const [nftHistory, setNftHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nftMetadata, setNftMetadata] = useState<string>('https://arweave.net/your-metadata-uri');
  const [nftName, setNftName] = useState<string>('Staking Achievement');
  const [nftSymbol, setNftSymbol] = useState<string>('STAKE');
  const [lastStakeSignature, setLastStakeSignature] = useState<string | null>(null);
  const [stakeAccountAddress, setStakeAccountAddress] = useState<string | null>('ELWtUrv76uoAf6TDqQ2eigVX43AC6DEysAmNGrrcRVWT');
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState<boolean>(false);
  const [isStakeSettled, setIsStakeSettled] = useState<boolean>(false);
  const [goalMet, setGoalMet] = useState<boolean | null>(null);
  const [settlementResult, setSettlementResult] = useState<string | null>(null);
  const [showBalancePopup, setShowBalancePopup] = useState<boolean>(false);
  const [updatedBalance, setUpdatedBalance] = useState<number | null>(null);
  const [showMintButton, setShowMintButton] = useState<boolean>(false);
  const [monthlyExpenseLimit, setMonthlyExpenseLimit] = useState<number>(0);

  // Hardcoded incentive percentage (20% bonus)
  const INCENTIVE_PERCENTAGE = 20;

  // Get wallet balance and history when connected
  useEffect(() => {
    if (connected && publicKey) {
      fetchWalletData();
    } else {
      setBalance(null);
      setStakingHistory([]);
      setNftHistory([]);
      setLastStakeSignature(null);
      setIsStakeSettled(false);
      setGoalMet(null);
      setSettlementResult(null);
      setShowMintButton(false);
      setShowBalancePopup(false);
    }
  }, [connected, publicKey]);

  // Check if stake is settled periodically
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (connected && publicKey && lastStakeSignature && !isStakeSettled) {
      // Check settlement status every 5 seconds
      intervalId = setInterval(async () => {
        try {
          const hasStaked = await aiServiceAPI.checkStakingCompleted(publicKey.toString());
          console.log("Checking if stake is settled:", hasStaked);
          
          if (hasStaked) {
            setIsStakeSettled(true);
            setSuccess("Stake has been settled successfully! Click 'Settle Stake' to see if you met your goal.");
            
            // Clear the interval once settled
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error("Error checking stake settlement:", error);
        }
      }, 5000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [connected, publicKey, lastStakeSignature, isStakeSettled]);

  // Add this useEffect to ensure popup displays when goal status is determined
  useEffect(() => {
    if (goalMet !== null && updatedBalance !== null) {
      console.log("Goal status determined, showing popup with balance:", updatedBalance);
      setShowBalancePopup(true);
    }
  }, [goalMet, updatedBalance]);

  const fetchWalletData = async () => {
    if (!publicKey) return;
    
    try {
      // Get wallet balance
      const walletBalance = await aiServiceAPI.getWalletBalance(publicKey.toString());
      setBalance(walletBalance);
      
      // Get simulated wallet balance
      const simulatedBalance = getSimulatedWalletBalance();
      console.log("Simulated wallet balance:", simulatedBalance);
      
      // Get staking history
      const history = await aiServiceAPI.getStakingHistory(publicKey.toString());
      setStakingHistory(history);
      
      // Get NFT minting history
      const nfts = await aiServiceAPI.getNFTMintingHistory(publicKey.toString());
      setNftHistory(nfts);
      
      // Set the last stake signature if available
      if (history && history.length > 0) {
        const lastSignature = history[0].transaction_signature || null;
        setLastStakeSignature(lastSignature);
        console.log("Last stake transaction signature:", lastSignature);
        
        // Check if this stake is already settled
        if (lastSignature) {
          const hasStaked = await aiServiceAPI.checkStakingCompleted(publicKey.toString());
          setIsStakeSettled(hasStaked);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setError('Failed to fetch wallet data. Please try again.');
    }
  };

  const handleStake = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setIsWaitingForConfirmation(false);
    setIsStakeSettled(false);
    setGoalMet(null);
    setSettlementResult(null);
    setShowMintButton(false);
    setShowBalancePopup(false);

    try {
      // Get current simulated wallet balance
      const currentSimulatedBalance = getSimulatedWalletBalance();
      
      // Check if there's enough balance to stake
      if (currentSimulatedBalance < amount) {
        setError(`Insufficient simulated balance. You have ${currentSimulatedBalance.toFixed(4)} SOL but trying to stake ${amount} SOL.`);
        setIsLoading(false);
        return;
      }
      
      // Update simulated wallet balance (subtract staked amount)
      const newSimulatedBalance = currentSimulatedBalance - amount;
      saveSimulatedWalletBalance(newSimulatedBalance);
      console.log(`Staking ${amount} SOL. Updated simulated wallet balance: ${newSimulatedBalance}`);

      // Create staking transaction
      const serializedTransaction = await aiServiceAPI.stakeSOL(
        publicKey.toString(),
        amount,
        stakingProgramId
      );

      // Deserialize the transaction
      const transaction = Transaction.from(Buffer.from(serializedTransaction, 'base64'));
      
      // Sign the transaction with the wallet
      const signedTransaction = await signTransaction(transaction);
      
      // Send the signed transaction
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      console.log("Stake transaction sent with signature:", signature);
      setSuccess(`Staking transaction sent! Waiting for confirmation...`);
      setIsWaitingForConfirmation(true);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      setIsWaitingForConfirmation(false);
      
      console.log("Stake transaction confirmed with signature:", signature);
      console.log("Stake account address:", stakeAccountAddress);
      
      // Record the successful stake in the database
      await aiServiceAPI.recordSuccessfulStake(
        publicKey.toString(),
        amount,
        stakingProgramId,
        signature
      );
      
      setSuccess(
        <span>
          Staking successful! Transaction signature: <a 
            href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {signature}
          </a>
        </span>
      );
      setLastStakeSignature(signature);
      
      // Refresh wallet data
      fetchWalletData();
    } catch (error) {
      console.error('Error staking SOL:', error);
      setError(`Error staking SOL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsWaitingForConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettleStake = async () => {
    if (!publicKey || !lastStakeSignature) {
      setError('No stake transaction to settle');
      return;
    }

    setIsSettling(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log("Manually checking if stake is settled for signature:", lastStakeSignature);
      const hasStaked = await aiServiceAPI.checkStakingCompleted(publicKey.toString());
      
      if (hasStaked) {
        setIsStakeSettled(true);
        
        // Get the staking details from history
        const stakeDetails = stakingHistory.find(
          (stake) => stake.transaction_signature === lastStakeSignature
        );
        
        if (!stakeDetails) {
          throw new Error("Could not find stake details");
        }
        
        const stakedAmount = parseFloat(stakeDetails.amount);
        
        // Get initial wallet balance before any adjustments
        const initialBalance = await aiServiceAPI.getWalletBalance(publicKey.toString());
        console.log("Initial wallet balance:", initialBalance);
        
        // Get initial simulated wallet balance
        const initialSimulatedBalance = getSimulatedWalletBalance();
        console.log("Initial simulated wallet balance:", initialSimulatedBalance);
        
        // Simulate goal metric check (50% chance of success for demo purposes)
        // In a real application, this would check actual metrics or conditions
        const isGoalMet = Math.random() > 0.5;
        setGoalMet(isGoalMet);
        
        let newBalance = initialBalance;
        let newSimulatedBalance = initialSimulatedBalance;
        
        if (isGoalMet) {
          // Goal met: Return stake + incentive
          const incentiveAmount = (stakedAmount * INCENTIVE_PERCENTAGE) / 100;
          const totalReturn = stakedAmount + incentiveAmount;
          
          // Simulate adding the stake amount + bonus back to the wallet
          newBalance = initialBalance + totalReturn;
          
          // Update the simulated wallet balance
          newSimulatedBalance = initialSimulatedBalance + totalReturn;
          saveSimulatedWalletBalance(newSimulatedBalance);
          console.log("Goal met - updated simulated wallet balance to:", newSimulatedBalance);
          
          setSettlementResult(`Congratulations! You met your goal and earned back your ${stakedAmount} SOL plus a ${INCENTIVE_PERCENTAGE}% bonus of ${incentiveAmount.toFixed(4)} SOL, for a total of ${totalReturn.toFixed(4)} SOL.`);
          setSuccess(`Goal achieved! Your stake has been returned with a bonus.`);
          
          // Show mint button when goal is met
          setShowMintButton(true);
        } else {
          // Goal not met: Stake is lost (don't add anything back to the wallet)
          // The balance should remain the same as initialBalance
          newBalance = initialBalance;
          
          // For simulated wallet, we need to ensure it doesn't increase
          // Keep the simulated balance the same
          newSimulatedBalance = initialSimulatedBalance;
          saveSimulatedWalletBalance(newSimulatedBalance);
          console.log("Goal not met - keeping simulated wallet balance at:", newSimulatedBalance);
          
          setSettlementResult(`Unfortunately, you did not meet your goal. Your staked ${stakedAmount} SOL has been forfeited.`);
          setError(`Goal not achieved. Your stake has been forfeited.`);
          
          // Don't show mint button when goal is not met
          setShowMintButton(false);
        }
        
        // Set the updated balance based on goal outcome
        setUpdatedBalance(newBalance);
        
        // Force the popup to display by setting showBalancePopup to true
        console.log("Showing balance popup with updated balance:", newBalance);
        setShowBalancePopup(true);
      } else {
        setError("Stake is not yet settled. Please try again later.");
      }
    } catch (error) {
      console.error('Error settling stake:', error);
      setError(`Error settling stake: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSettling(false);
    }
  };

  const handleMintNFT = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!lastStakeSignature) {
      setError('You need to complete staking before minting an NFT');
      return;
    }

    if (!goalMet) {
      setError('You can only mint an NFT if you met your goal');
      return;
    }

    setIsMinting(true);
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if user has completed staking
      const hasStaked = await aiServiceAPI.checkStakingCompleted(
        publicKey.toString()
      );

      if (!hasStaked) {
        setError('No confirmed staking transaction found. Please stake SOL first.');
        setIsMinting(false);
        setIsLoading(false);
        return;
      }

      console.log("Minting NFT for stake transaction:", lastStakeSignature);
      
      // Mint NFT for successful staking
      const mintAddress = await aiServiceAPI.mintNFTOnSuccessfulStaking(
        publicKey.toString(),
        nftMetadata,
        nftName,
        nftSymbol,
        lastStakeSignature
      );
      
      console.log("NFT minted successfully with mint address:", mintAddress);
      setSuccess(`NFT minted successfully! Mint address: ${mintAddress}`);
      
      // Refresh wallet data
      fetchWalletData();
    } catch (error) {
      console.error('Error minting NFT:', error);
      setError(`Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMinting(false);
      setIsLoading(false);
    }
  };

  const closeBalancePopup = () => {
    console.log("Closing balance popup");
    setShowBalancePopup(false);
  };

  // Debug function to manually show the balance popup
  const debugShowBalancePopup = () => {
    console.log("Manually showing balance popup");
    setUpdatedBalance(balance);
    setGoalMet(true);
    setShowBalancePopup(true);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
            <h2 className="text-2xl font-bold text-white">Goal Motivator</h2>
            <p className="text-sm text-blue-100 mt-1">Bet your SOLs that you will meet your financial goal. If you <b>lose</b>, the SOL will go to your charity of choice.</p>
          </div>
          {/* </div> */}
          
          <div className="p-6 space-y-6">
            {/* <div className="mb-2">
              <WalletMultiButton className="w-full md:w-auto shadow-sm hover:shadow-md transition-all duration-200" />
            </div> */}
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Amount to Stake (SOL)
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  min="0.001"
                  step="0.001"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Monthly Expense Limit
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={monthlyExpenseLimit}
                  onChange={(e) => setMonthlyExpenseLimit(parseFloat(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
               Charity ID 
              </label>
              <input
                type="text"
                // value={stakingProgramId}
                value={"Doctors Without Borders USA"}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
              />
              <p className="text-xs italic text-gray-500 mt-1 ml-2">8SQEcP4FaYQySktNQeyxF3w8pvArx3oMEh7fPrzkN9pu</p>
            </div>
        
            
            <div className="pt-2">
              <button
                onClick={handleStake}
                disabled={isLoading || !connected}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? 'Processing...' : isWaitingForConfirmation ? 'Confirming...' : 'Stake SOL'}
              </button>
              <p className="text-xs text-gray-500 mt-2 italic text-center">
                Note: This is a simulation using the Solana Memo Program. No actual SOL will be staked.
              </p>
            </div>
          </div>
        </div>
        <div className="md:w-64 bg-gray-50 p-4 rounded-lg self-start">
          {connected && publicKey ? (
            <div className="text-sm">
              <h3 className="font-medium text-gray-700 mb-2">Wallet Details</h3>
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <p className="text-xs font-mono text-gray-700 break-all">{publicKey.toString()}</p>
              </div>
              {balance !== null && (
                <div className="space-y-1 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Solana Balance</p>
                    <p className="text-sm font-medium text-gray-700">{balance.toFixed(4)} SOL</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Simulated Balance</p>
                    <p className="text-sm font-medium text-amber-600">{getSimulatedWalletBalance().toFixed(4)} SOL</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">Staking uses the simulated balance for demonstration purposes.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Connect your wallet to view details</p>
          )}
        </div>
      </div>

      {lastStakeSignature && !isStakeSettled && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Stake Settlement</h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Your stake is being processed. Once settled, you can check if you met your goal.
          </p>
          <button
            onClick={handleSettleStake}
            disabled={isSettling || !connected || !lastStakeSignature}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-gray-400"
          >
            {isSettling ? 'Checking...' : 'Check Settlement Status'}
          </button>
        </div>
      )}

      {lastStakeSignature && isStakeSettled && goalMet === null && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Stake Settlement</h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Your stake is settled. Click the button to see if you met your goal.
          </p>
          <button
            onClick={handleSettleStake}
            disabled={isSettling || !connected || !lastStakeSignature}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-gray-400"
          >
            {isSettling ? 'Checking...' : 'Settle Stake'}
          </button>
        </div>
      )}
      
      {settlementResult && (
        <div className={`p-4 rounded-md mb-6 ${goalMet ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className="text-lg font-semibold mb-2">{goalMet ? 'Goal Achieved!' : 'Goal Not Met'}</h3>
          <p className={`text-sm ${goalMet ? 'text-green-700' : 'text-red-700'}`}>
            {settlementResult}
          </p>
          
          {/* NFT Minting Button - Only shown after settlement when goal is met */}
          {showMintButton && goalMet && (
            <div className="mt-4">
              <button
                onClick={handleMintNFT}
                disabled={isMinting || isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                {isMinting ? 'Minting NFT...' : 'Mint Achievement NFT'}
              </button>
              <p className="text-xs text-green-700 mt-2">
                Mint an NFT to commemorate your achievement!
              </p>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <>
          <div className="p-3 bg-green-100 text-green-700 rounded-md my-4">
            {success}
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h2 className="text-2xl font-bold mb-4">Your stake is made</h2>
              <p className="text-lg">
                If your monthly spending is less than <span className="font-semibold">{monthlyExpenseLimit}</span> USD, you will receive back your stake of <span className="font-semibold">{amount}</span> SOL.
              </p>
            </div>
          </div>
        </>
      )}
      
      {lastStakeSignature && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Last Stake Transaction</h3>
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm font-medium">Transaction Signature:</p>
            <div className="flex items-center mt-1">
              <input
                type="text"
                value={lastStakeSignature}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-xs"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(lastStakeSignature);
                  alert('Transaction signature copied to clipboard!');
                }}
                className="ml-2 p-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Copy
              </button>
            </div>
            <a 
              href={`https://explorer.solana.com/tx/${lastStakeSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              View on Solana Explorer
            </a>
            <p className="text-sm mt-2">
              <span className="font-medium">Status:</span> 
              <span className={`ml-1 ${isStakeSettled ? 'text-green-600' : 'text-amber-600'}`}>
                {isStakeSettled ? 'Settled' : 'Pending Settlement'}
              </span>
              {goalMet !== null && (
                <span className={`ml-2 ${goalMet ? 'text-green-600' : 'text-red-600'}`}>
                  | Goal: {goalMet ? 'Met' : 'Not Met'}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      
      {/* {stakingHistory.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Staking History</h3>
          <div className="bg-gray-50 p-3 rounded-md">
            <ul className="divide-y divide-gray-200">
              {stakingHistory.map((event, index) => (
                <li key={index} className="py-2">
                  <p className="text-sm">
                    Staked {event.amount} {event.token} on {new Date(event.staked_at).toLocaleString()}
                  </p>
                  {event.transaction_signature && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-700">
                        Transaction: 
                        <a 
                          href={`https://explorer.solana.com/tx/${event.transaction_signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          {event.transaction_signature.substring(0, 8)}...
                          {event.transaction_signature.substring(event.transaction_signature.length - 8)}
                        </a>
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {nftHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">NFT Minting History</h3>
          <div className="bg-gray-50 p-3 rounded-md">
            <ul className="divide-y divide-gray-200">
              {nftHistory.map((nft, index) => (
                <li key={index} className="py-2">
                  <p className="text-sm font-medium">{nft.name} ({nft.symbol})</p>
                  <p className="text-xs text-gray-600">
                    Mint: 
                    <a 
                      href={`https://explorer.solana.com/address/${nft.mint_address}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      {nft.mint_address}
                    </a>
                  </p>
                  <p className="text-xs text-gray-600">Minted on: {new Date(nft.minted_at).toLocaleString()}</p>
                  {nft.transaction_signature && (
                    <p className="text-xs text-gray-600">
                      For stake: 
                      <a 
                        href={`https://explorer.solana.com/tx/${nft.transaction_signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        {nft.transaction_signature.substring(0, 8)}...
                        {nft.transaction_signature.substring(nft.transaction_signature.length - 8)}
                      </a>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )} */}

      {/* Balance Update Popup - Enhanced for better visibility */}
      {showBalancePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">Wallet Balance Updated</h3>
            <p className="text-sm text-gray-600 mb-4">
              {goalMet 
                ? "Your stake has been returned with a bonus!" 
                : "Your stake has been forfeited."}
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <p className="text-sm font-medium">Current Wallet Balance:</p>
              <p className="text-xl font-bold text-blue-600">{updatedBalance?.toFixed(4)} SOL</p>
              <p className="text-sm font-medium mt-2">Simulated Balance:</p>
              <p className="text-xl font-bold text-amber-600">{getSimulatedWalletBalance().toFixed(4)} SOL</p>
              <p className="text-xs text-gray-500 mt-1">This is the balance shown in the Debug Panel</p>
            </div>
            
            {goalMet && (
              <div className="mb-4">
                <button
                  onClick={handleMintNFT}
                  disabled={isMinting}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {isMinting ? 'Minting NFT...' : 'Mint Achievement NFT'}
                </button>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={closeBalancePopup}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolanaStaking; 