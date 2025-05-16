import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  StakeProgram, 
  Authorized, 
  Lockup, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { GoalData } from './StakingComponent';

// This service handles the actual Solana staking operations
export class SolanaStakingService {
  private connection: Connection;
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  // Create a new stake account and delegate stake
  async createStakeAccount(
    walletPublicKey: PublicKey,
    signTransaction: (transaction: Transaction) => Promise<Transaction>,
    stakeAmount: number,
    goalData: GoalData
  ): Promise<string> {
    try {
      // Generate a new stake account keypair
      const stakeAccount = Keypair.generate();
      
      // Calculate minimum rent exemption
      const minimumRent = await this.connection.getMinimumBalanceForRentExemption(
        StakeProgram.space
      );
      
      // Convert SOL to lamports
      const lamports = stakeAmount * LAMPORTS_PER_SOL + minimumRent;
      
      // Create stake account transaction
      const createStakeAccountTx = StakeProgram.createAccount({
        fromPubkey: walletPublicKey,
        stakePubkey: stakeAccount.publicKey,
        authorized: new Authorized(walletPublicKey, walletPublicKey),
        lockup: new Lockup(0, 0, walletPublicKey),
        lamports
      });
      
      // Get the latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      createStakeAccountTx.recentBlockhash = blockhash;
      createStakeAccountTx.feePayer = walletPublicKey;
      
      // Sign the transaction
      const signedTx = await signTransaction(createStakeAccountTx);
      
      // Send the transaction
      const txId = await this.connection.sendRawTransaction(signedTx.serialize());
      await this.connection.confirmTransaction(txId);
      
      // Store the stake account public key in the goal data
      goalData.stakeAccountPubkey = stakeAccount.publicKey.toString();
      
      return txId;
    } catch (error) {
      console.error('Error creating stake account:', error);
      throw error;
    }
  }
  
  // Withdraw stake and rewards if goal is achieved, or penalize if not achieved
  async settleStake(
    walletPublicKey: PublicKey,
    signTransaction: (transaction: Transaction) => Promise<Transaction>,
    goalData: GoalData,
    isGoalAchieved: boolean
  ): Promise<string> {
    try {
      if (!goalData.stakeAccountPubkey) {
        throw new Error('No stake account found for this goal');
      }
      
      const stakeAccountPubkey = new PublicKey(goalData.stakeAccountPubkey);
      
      // First deactivate the stake
      const deactivateTx = StakeProgram.deactivate({
        stakePubkey: stakeAccountPubkey,
        authorizedPubkey: walletPublicKey
      });
      
      // Get the latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      deactivateTx.recentBlockhash = blockhash;
      deactivateTx.feePayer = walletPublicKey;
      
      // Sign and send deactivate transaction
      const signedDeactivateTx = await signTransaction(deactivateTx);
      const deactivateTxId = await this.connection.sendRawTransaction(signedDeactivateTx.serialize());
      await this.connection.confirmTransaction(deactivateTxId);
      
      // Get the stake account balance
      const stakeBalance = await this.connection.getBalance(stakeAccountPubkey);
      
      // Calculate reward or penalty
      let withdrawAmount = stakeBalance;
      if (isGoalAchieved) {
        // Add 10% reward (this would be handled by a real staking program)
        withdrawAmount = Math.floor(stakeBalance * 1.1);
      } else {
        // Penalize by 10% (this would be handled by a real staking program)
        withdrawAmount = Math.floor(stakeBalance * 0.9);
      }
      
      // Create withdraw transaction
      const withdrawTx = StakeProgram.withdraw({
        stakePubkey: stakeAccountPubkey,
        authorizedPubkey: walletPublicKey,
        toPubkey: walletPublicKey,
        lamports: withdrawAmount
      });
      
      // Get the latest blockhash for withdraw transaction
      const { blockhash: withdrawBlockhash } = await this.connection.getLatestBlockhash();
      withdrawTx.recentBlockhash = withdrawBlockhash;
      withdrawTx.feePayer = walletPublicKey;
      
      // Sign and send withdraw transaction
      const signedWithdrawTx = await signTransaction(withdrawTx);
      const withdrawTxId = await this.connection.sendRawTransaction(signedWithdrawTx.serialize());
      await this.connection.confirmTransaction(withdrawTxId);
      
      return withdrawTxId;
    } catch (error) {
      console.error('Error settling stake:', error);
      throw error;
    }
  }
  
  // Get the current balance of a stake account
  async getStakeAccountBalance(stakeAccountPubkey: string): Promise<number> {
    try {
      const pubkey = new PublicKey(stakeAccountPubkey);
      const balance = await this.connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting stake account balance:', error);
      throw error;
    }
  }
} 