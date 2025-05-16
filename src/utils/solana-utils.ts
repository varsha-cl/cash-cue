import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Keypair
} from "@solana/web3.js";
import { BN } from "bn.js";

// Initialize Solana connection to devnet
export const solanaConnection = new Connection("https://api.devnet.solana.com", "confirmed");

// Function to get SOL balance for a wallet
export const getWalletBalance = async (walletPublicKey: string): Promise<number> => {
  try {
    const balance = await solanaConnection.getBalance(new PublicKey(walletPublicKey));
    return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    throw error;
  }
};

// Function to create a staking transaction
export const createStakingTransaction = async (
  walletPublicKey: string,
  amount: number,
  stakingProgramId: string
): Promise<Transaction> => {
  try {
    // Convert amount to lamports
    const lamports = amount * LAMPORTS_PER_SOL;
    
    // Create a transaction to send SOL to the staking program
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(walletPublicKey),
        toPubkey: new PublicKey(stakingProgramId),
        lamports: lamports,
      }),
      // Add a memo to identify this as a staking transaction
      new TransactionInstruction({
        keys: [
          { pubkey: new PublicKey(walletPublicKey), isSigner: true, isWritable: true },
        ],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from("Staking transaction", "utf-8"),
      })
    );
    
    // Get recent blockhash
    const { blockhash } = await solanaConnection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(walletPublicKey);
    
    return transaction;
  } catch (error) {
    console.error("Error creating staking transaction:", error);
    throw error;
  }
};

// Function to request SOL from devnet faucet
export const requestAirdrop = async (walletPublicKey: string, amount: number = 1): Promise<string> => {
  try {
    const lamports = amount * LAMPORTS_PER_SOL;
    const signature = await solanaConnection.requestAirdrop(
      new PublicKey(walletPublicKey),
      lamports
    );
    
    // Wait for confirmation
    await solanaConnection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  } catch (error) {
    console.error("Error requesting airdrop:", error);
    throw error;
  }
};

// Function to get transaction history for a wallet
export const getTransactionHistory = async (walletPublicKey: string, limit: number = 10): Promise<any[]> => {
  try {
    const signatures = await solanaConnection.getSignaturesForAddress(
      new PublicKey(walletPublicKey),
      { limit }
    );
    
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        const tx = await solanaConnection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        return {
          signature: sig.signature,
          timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
          status: sig.confirmationStatus,
          details: tx,
        };
      })
    );
    
    return transactions;
  } catch (error) {
    console.error("Error getting transaction history:", error);
    throw error;
  }
};

// Function to validate a Solana address
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

// Function to format a Solana address for display (truncate middle)
export const formatSolanaAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Function to generate a new Solana keypair (for testing purposes only)
export const generateKeypair = (): { publicKey: string; secretKey: string } => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toString(),
    secretKey: Buffer.from(keypair.secretKey).toString('base64'),
  };
}; 