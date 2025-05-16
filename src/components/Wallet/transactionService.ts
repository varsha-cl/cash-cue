import { Connection, PublicKey, ConfirmedSignatureInfo, ParsedTransactionWithMeta } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import React, { useState, useEffect } from 'react';

// Interface for transaction data
export interface TransactionData {
  signature: string;
  blockTime: number | null;
  timestamp: Date | null;
  slot: number;
  status: string;
  fee: number;
  error: string | null;
  type: string;
  details: any;
}

// Simple in-memory cache for transactions
interface TransactionCache {
  [key: string]: {
    data: TransactionData[];
    timestamp: number;
    publicKey: string;
  }
}

// Cache expiration time (10 minutes - increased from 5 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;

// Global transaction cache
export const transactionCache: TransactionCache = {};

// Helper function to delay execution
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to get cached transactions
 * @param publicKey - Public key to get transactions for
 * @param limit - Number of transactions to get
 * @returns Cached transactions or null if not found or expired
 */
export const getCachedTransactions = (publicKey: string, limit: number): TransactionData[] | null => {
  const cacheKey = `${publicKey}-${limit}`;
  const cachedData = transactionCache[cacheKey];
  
  if (!cachedData) return null;
  
  // Check if cache is expired
  const now = Date.now();
  if (now - cachedData.timestamp > CACHE_EXPIRATION) {
    delete transactionCache[cacheKey];
    return null;
  }
  
  // Check if cache is for the same public key
  if (cachedData.publicKey !== publicKey) {
    delete transactionCache[cacheKey];
    return null;
  }
  
  return cachedData.data;
};

/**
 * Helper function to cache transactions
 * @param publicKey - Public key to cache transactions for
 * @param limit - Number of transactions cached
 * @param data - Transaction data to cache
 */
const cacheTransactions = (publicKey: string, limit: number, data: TransactionData[]): void => {
  const cacheKey = `${publicKey}-${limit}`;
  transactionCache[cacheKey] = {
    data,
    timestamp: Date.now(),
    publicKey
  };
  console.log(`Cached ${data.length} transactions for ${publicKey}`);
};

/**
 * Fetches all transactions for a given public key
 * @param connection - Solana connection
 * @param address - Public key to fetch transactions for
 * @param limit - Optional limit for number of transactions to fetch (default: 20)
 * @returns Array of transaction signatures
 */
export const fetchAllTransactions = async (
  connection: Connection,
  address: PublicKey,
  limit: number = 20
): Promise<ConfirmedSignatureInfo[]> => {
  try {
    // Fetch transaction signatures
    const signatures = await connection.getSignaturesForAddress(address, { limit });
    return signatures;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Fetches all transactions for a given public key with pagination
 * @param connection - Solana connection
 * @param address - Public key to fetch transactions for
 * @param beforeSignature - Optional signature to fetch transactions before
 * @param limit - Optional limit for number of transactions to fetch (default: 20)
 * @returns Array of transaction signatures
 */
export const fetchTransactionsBefore = async (
  connection: Connection,
  address: PublicKey,
  beforeSignature?: string,
  limit: number = 20
): Promise<ConfirmedSignatureInfo[]> => {
  try {
    const options: any = { limit };
    if (beforeSignature) {
      options.before = beforeSignature;
    }
    
    // Fetch transaction signatures
    const signatures = await connection.getSignaturesForAddress(address, options);
    return signatures;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Fetches detailed transaction data for a list of signatures
 * @param connection - Solana connection
 * @param signatures - Array of transaction signatures
 * @returns Array of parsed transactions
 */
export const fetchTransactionDetails = async (
  connection: Connection,
  signatures: string[]
): Promise<ParsedTransactionWithMeta[]> => {
  try {
    // Fetch transaction details
    const transactions = await connection.getParsedTransactions(signatures, {
      maxSupportedTransactionVersion: 0,
    });
    
    // Filter out null transactions
    return transactions.filter(tx => tx !== null) as ParsedTransactionWithMeta[];
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    throw error;
  }
};

/**
 * Formats transaction data for display
 * @param signature - Transaction signature info
 * @param transaction - Parsed transaction data
 * @returns Formatted transaction data
 */
export const formatTransactionData = (
  signature: ConfirmedSignatureInfo,
  transaction: ParsedTransactionWithMeta | null
): TransactionData => {
  // Default transaction data
  const txData: TransactionData = {
    signature: signature.signature,
    blockTime: signature.blockTime !== undefined ? signature.blockTime : null,
    timestamp: signature.blockTime ? new Date(signature.blockTime * 1000) : null,
    slot: signature.slot,
    status: signature.err ? 'Failed' : 'Success',
    fee: 0,
    error: signature.err ? JSON.stringify(signature.err) : null,
    type: 'Unknown',
    details: {}
  };

  // If we have transaction details, extract more information
  if (transaction) {
    // Extract fee
    txData.fee = transaction.meta?.fee || 0;
    
    // Try to determine transaction type
    const instructions = transaction.transaction.message.instructions;
    if (instructions.length > 0) {
      // This is a simplified approach - in a real app, you'd want to parse program IDs
      // and instruction data to determine more specific transaction types
      const programId = instructions[0].programId?.toString();
      
      if (programId) {
        // Check for common program IDs
        if (programId === '11111111111111111111111111111111') {
          txData.type = 'System Transaction';
        } else if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
          txData.type = 'Token Transaction';
        } else if (programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
          txData.type = 'Memo Transaction';
        } else if (programId === '8SQEcP4FaYQySktNQeyxF3w8pvArx3oMEh7fPrzkN9pu') {
          txData.type = 'Staking Transaction';
        } else {
          txData.type = `Program: ${programId.slice(0, 8)}...`;
        }
      }
    }
    
    // Add the full transaction details
    txData.details = transaction;
  }

  return txData;
};

/**
 * Fetches and formats transactions with rate limiting protection
 * @param connection - Solana connection
 * @param publicKey - Public key to fetch transactions for
 * @param limit - Number of transactions to fetch
 * @returns Formatted transaction data
 */
export const fetchAndFormatTransactions = async (
  connection: Connection,
  publicKey: PublicKey,
  limit: number = 5
): Promise<TransactionData[]> => {
  // Check cache first
  const publicKeyStr = publicKey.toString();
  const cachedData = getCachedTransactions(publicKeyStr, limit);
  console.log(`Debug - Cache check: ${cachedData ? cachedData.length : 0} cached transactions for ${publicKeyStr}`);
  
  // If we have cached data, store it for potential fallback
  const cachedTransactions = cachedData || [];
  
  let signatures: ConfirmedSignatureInfo[] = [];
  let newTransactions: TransactionData[] = [];
  let fetchSuccessful = false;
  
  // Step 1: Try to fetch signatures (this is the most common failure point)
  try {
    console.log(`Fetching transaction signatures for ${publicKeyStr}, limit: ${limit}`);
    signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    console.log(`Found ${signatures.length} transaction signatures`);
    
    if (signatures.length === 0) {
      console.log('No transactions found, returning cached data');
      return cachedTransactions;
    }
  } catch (error: any) {
    console.error('Error fetching transaction signatures:', error.message);
    console.log(`Signature fetch failed, returning cached data (${cachedTransactions.length} transactions)`);
    return cachedTransactions;
  }
  
  // Step 2: Try to fetch transaction details
  try {
    // Get all signature strings
    const signatureStrings = signatures.map(sig => sig.signature);
    
    // Fetch transaction details in a single batch
    console.log(`Fetching details for ${signatureStrings.length} transactions`);
    const txDetails = await connection.getParsedTransactions(signatureStrings, {
      maxSupportedTransactionVersion: 0,
    });
    
    console.log(`Got ${txDetails.filter(tx => tx !== null).length} transaction details`);
    
    // Format transaction data
    newTransactions = signatures.map((sig, index) => {
      const tx = index < txDetails.length ? txDetails[index] : null;
      return formatTransactionData(sig, tx);
    });
    
    // Cache the results
    cacheTransactions(publicKeyStr, limit, newTransactions);
    fetchSuccessful = true;
    console.log(`Formatted and cached ${newTransactions.length} transactions`);
  } catch (error: any) {
    console.error('Error fetching transaction details:', error.message);
    console.log(`Detail fetch failed, will try to use signatures for basic info`);
    
    // Try to create basic transactions from signatures only
    try {
      newTransactions = signatures.map(sig => formatTransactionData(sig, null));
      console.log(`Created ${newTransactions.length} basic transactions from signatures`);
      
      // Cache these basic transactions too
      if (newTransactions.length > 0) {
        cacheTransactions(publicKeyStr, limit, newTransactions);
        fetchSuccessful = true;
      }
    } catch (innerError: any) {
      console.error('Error creating basic transactions:', innerError.message);
    }
  }
  
  // Return new transactions if fetch was successful
  if (fetchSuccessful && newTransactions.length > 0) {
    console.log(`Fetch successful: Returning ${newTransactions.length} new transactions`);
    return newTransactions;
  }
  
  // Otherwise return cached data
  console.log(`Fetch failed or empty: Returning ${cachedTransactions.length} cached transactions`);
  return cachedTransactions;
};

/**
 * Hook to fetch all transactions for the connected wallet
 * @param limit - Optional limit for number of transactions to fetch
 * @returns Object containing transactions, loading state, and error
 */
export const useWalletTransactions = (limit: number = 20) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState<boolean>(false);
  const [usingCachedData, setUsingCachedData] = useState<boolean>(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!publicKey) return;

      setLoading(true);
      setError(null);
      setRateLimited(false);
      setUsingCachedData(false);

      try {
        // Get transactions - this will never throw an error now
        const formattedTxs = await fetchAndFormatTransactions(connection, publicKey, limit);
        
        // Check if we got any transactions
        if (formattedTxs.length > 0) {
          setTransactions(formattedTxs);
          
          // Check if we're using cached data by comparing with the cache
          const cachedData = getCachedTransactions(publicKey.toString(), limit);
          if (cachedData && 
              JSON.stringify(formattedTxs) === JSON.stringify(cachedData) && 
              Date.now() - transactionCache[`${publicKey.toString()}-${limit}`].timestamp > 60000) {
            setUsingCachedData(true);
          }
        } else {
          // No transactions found, keep existing or set empty
          if (transactions.length === 0) {
            setTransactions([]);
          }
        }
      } catch (err: any) {
        // This should never happen with the updated fetchAndFormatTransactions
        console.error('Unexpected error in useWalletTransactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [connection, publicKey, limit]);

  return { transactions, loading, error, rateLimited, usingCachedData };
}; 