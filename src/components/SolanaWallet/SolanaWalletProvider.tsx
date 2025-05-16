import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import the wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: ReactNode;
}

const SolanaWalletProvider: FC<SolanaWalletProviderProps> = ({ children }) => {
  // Set to 'devnet' for development, 'mainnet-beta' for production
  const network = WalletAdapterNetwork.Devnet;
  
  // Use a custom RPC endpoint with higher rate limits
  // This helps avoid 429 rate limit errors when fetching transactions
  const endpoint = useMemo(() => {
    // Use Helius RPC endpoint with API key for higher rate limits
    return "https://devnet.helius-rpc.com/?api-key=39dd186b-8a8b-412f-8ed9-db96c52d1196";
    
    // Fallback to default endpoint if needed
    // return clusterApiUrl(network);
  }, []);

  // Initialize all the supported wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaWalletProvider; 