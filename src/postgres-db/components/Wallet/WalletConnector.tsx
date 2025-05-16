import React, { FC, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletConnectorProps {
    onConnectionChange: (connected: boolean) => void;
    isUserLoggedIn: boolean;
}

const WalletConnector: FC<WalletConnectorProps> = ({ onConnectionChange, isUserLoggedIn }) => {
    const { connected, disconnect } = useWallet();

    // Update parent component when wallet connection status changes
    useEffect(() => {
        if (isUserLoggedIn) {
            onConnectionChange(connected);
        } else if (connected) {
            // Disconnect wallet if user logs out
            disconnect();
            onConnectionChange(false);
        }
    }, [connected, isUserLoggedIn, onConnectionChange, disconnect]);

    if (!isUserLoggedIn) {
        return null;
    }

    return (
        <div className="wallet-connector">
            <WalletMultiButton />
            {connected && (
                <div className="wallet-status">
                    <span className="status-indicator connected"></span>
                    Wallet Connected
                </div>
            )}
            <style jsx>{`
                .wallet-connector {
                    margin: 1rem 0;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .wallet-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .status-indicator {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                }
                .connected {
                    background-color: #4caf50;
                }
            `}</style>
        </div>
    );
};

export default WalletConnector; 