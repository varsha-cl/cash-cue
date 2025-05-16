import React, { FC, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import './wallet.css'; // Import the CSS file

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
        </div>
    );
};

export default WalletConnector;