'use client';

import { useState, useEffect } from 'react';

interface WalletConnectProps {
  patientId: string;
  onConnected?: (address: string) => void;
}

export default function WalletConnect({ patientId, onConnected }: WalletConnectProps) {
  const [suiAddress, setSuiAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkWalletStatus();
  }, [patientId]);

  const checkWalletStatus = async () => {
    try {
      const response = await fetch(`/api/patients/connect-wallet?patientId=${patientId}`);
      const data = await response.json();
      
      if (data.connected) {
        setSuiAddress(data.suiAddress);
        onConnected?.(data.suiAddress);
      }
    } catch (err) {
      console.error('Error checking wallet status:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    setConnecting(true);
    setError('');

    try {
      // Check if Sui Wallet extension is installed
      if (!(window as any).suiWallet) {
        setError('Sui Wallet extension not found. Please install it from Chrome Web Store.');
        setConnecting(false);
        return;
      }

      const suiWallet = (window as any).suiWallet;
      
      // Request connection
      const accounts = await suiWallet.requestPermissions();
      
      if (!accounts || accounts.length === 0) {
        setError('No accounts found in wallet');
        setConnecting(false);
        return;
      }

      const address = accounts[0];
      
      // Create message to sign
      const message = `Connect DocChain wallet for patient ${patientId}`;
      const messageBytes = new TextEncoder().encode(message);
      
      // Sign the message
      const { signature } = await suiWallet.signMessage({
        message: messageBytes,
      });

      // Verify and save to backend
      const response = await fetch('/api/patients/connect-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          suiAddress: address,
          signature,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to connect wallet');
        setConnecting(false);
        return;
      }

      setSuiAddress(address);
      onConnected?.(address);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setSuiAddress(null);
    // Note: We don't remove from database, just clear local state
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (suiAddress) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="text-2xl mr-2">🔗</span>
            Wallet Connected
          </h3>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Active
          </span>
        </div>
        
        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 mb-1">Sui Address:</p>
          <code className="text-xs text-purple-600 break-all font-mono">
            {suiAddress}
          </code>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Your wallet is connected. You can now claim your past appointments as blockchain NFTs.
        </p>

        <button
          onClick={disconnectWallet}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
        <span className="text-2xl mr-2">👛</span>
        Connect Your Sui Wallet
      </h3>
      
      <p className="text-sm text-gray-600 mb-4">
        Connect your Sui wallet to claim your appointment records as blockchain NFTs. 
        This gives you permanent, portable ownership of your medical appointment history.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={connectWallet}
        disabled={connecting}
        className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
      >
        {connecting ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          </>
        ) : (
          'Connect Sui Wallet'
        )}
      </button>

      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-2">Don't have a Sui wallet? Install:</p>
        <ul className="space-y-1">
          <li>
            <a 
              href="https://chrome.google.com/webstore/detail/sui-wallet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              • Sui Wallet Extension
            </a>
          </li>
          <li>
            <a 
              href="https://suiet.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              • Suiet Wallet
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
