import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { aiServiceAPI } from '../Ai/Ai';

interface NFT {
  mint_address: string;
  name: string;
  symbol: string;
  metadata_uri: string;
  minted_at: string;
  image_url?: string;
}

const NFTGallery: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      fetchNFTs();
    } else {
      setNfts([]);
    }
  }, [connected, publicKey]);

  const fetchNFTs = async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get NFT minting history from our database
      const nftHistory = await aiServiceAPI.getNFTMintingHistory(publicKey.toString());
      
      // Fetch metadata for each NFT
      const nftsWithMetadata = await Promise.all(
        nftHistory.map(async (nft: NFT) => {
          try {
            // Try to fetch metadata from the URI
            const response = await fetch(nft.metadata_uri);
            if (response.ok) {
              const metadata = await response.json();
              return {
                ...nft,
                image_url: metadata.image || null,
              };
            }
            return nft;
          } catch (error) {
            console.error(`Error fetching metadata for NFT ${nft.mint_address}:`, error);
            return nft;
          }
        })
      );
      
      setNfts(nftsWithMetadata);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      setError('Failed to fetch NFTs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">NFT Gallery</h2>
        <p className="text-gray-600">Please connect your wallet to view your NFTs.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">NFT Gallery</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      ) : nfts.length === 0 ? (
        <div className="p-3 bg-gray-100 text-gray-700 rounded-md">
          <p>You haven't minted any NFTs yet.</p>
          <p className="mt-2">Complete staking to earn achievement NFTs!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nfts.map((nft) => (
            <div key={nft.mint_address} className="border rounded-lg overflow-hidden shadow-sm">
              {nft.image_url ? (
                <img 
                  src={nft.image_url} 
                  alt={nft.name} 
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    // If image fails to load, replace with placeholder
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=NFT+Image';
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No image available</span>
                </div>
              )}
              
              <div className="p-4">
                <h3 className="font-bold text-lg">{nft.name}</h3>
                <p className="text-sm text-gray-600">{nft.symbol}</p>
                <p className="text-xs text-gray-500 mt-2 truncate">
                  Mint: {nft.mint_address}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Minted: {new Date(nft.minted_at).toLocaleDateString()}
                </p>
                <a 
                  href={`https://explorer.solana.com/address/${nft.mint_address}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-2 inline-block"
                >
                  View on Solana Explorer
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={fetchNFTs}
        disabled={isLoading || !connected}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Loading...' : 'Refresh NFTs'}
      </button>
    </div>
  );
};

export default NFTGallery; 