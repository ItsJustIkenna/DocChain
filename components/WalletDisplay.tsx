'use client';

import { useState, useEffect } from 'react';
import { suiClient } from '@/lib/sui';

interface WalletDisplayProps {
  patientId: string;
  suiAddress: string;
}

export default function WalletDisplay({ patientId, suiAddress }: WalletDisplayProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedKey, setExportedKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, [suiAddress]);

  const fetchBalance = async () => {
    try {
      const balance = await suiClient.getBalance({
        owner: suiAddress,
      });
      
      // Convert MIST to SUI (1 SUI = 1,000,000,000 MIST)
      const suiBalance = (parseInt(balance.totalBalance) / 1_000_000_000).toFixed(4);
      setBalance(suiBalance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance('0.0000');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWallet = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/patients/export-wallet?patientId=${patientId}`);
      const data = await response.json();
      
      if (response.ok) {
        setExportedKey(data.privateKey);
        setShowExportModal(true);
      } else {
        alert('Failed to export wallet: ' + data.error);
      }
    } catch (err) {
      console.error('Error exporting wallet:', err);
      alert('Failed to export wallet');
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <>
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="text-2xl mr-2">👛</span>
            Your Blockchain Wallet
          </h3>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Active
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          DocChain automatically created a Sui blockchain wallet for you. 
          All your appointments are recorded here.
        </p>

        <div className="bg-white rounded-lg p-4 mb-3">
          <p className="text-xs text-gray-500 mb-1">Wallet Address:</p>
          <div className="flex items-center justify-between">
            <code className="text-xs text-purple-600 break-all font-mono flex-1 mr-2">
              {suiAddress}
            </code>
            <button
              onClick={() => copyToClipboard(suiAddress)}
              className="text-purple-600 hover:text-purple-700 text-xs"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 mb-1">Balance:</p>
          {loading ? (
            <div className="animate-pulse h-6 bg-gray-200 rounded w-24"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{balance} SUI</p>
          )}
        </div>

        <div className="flex gap-2">
          <a
            href={`https://suiscan.xyz/devnet/account/${suiAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-center text-sm font-medium"
          >
            View on Explorer →
          </a>
          <button
            onClick={handleExportWallet}
            disabled={exporting}
            className="flex-1 bg-white text-purple-600 px-4 py-2 rounded-lg border-2 border-purple-600 hover:bg-purple-50 text-sm font-medium disabled:opacity-50"
          >
            {exporting ? 'Loading...' : 'Export Wallet'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Your wallet is managed by DocChain for simplicity. You can export it anytime to use with external wallets.
        </p>
      </div>

      {/* Export Modal */}
      {showExportModal && exportedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Export Your Wallet</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Keep This Private!</p>
              <p className="text-xs text-yellow-700">
                Anyone with this private key can access your wallet and all your assets. 
                Store it securely and never share it.
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Private Key (Base64):</p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <code className="text-xs text-gray-800 break-all font-mono block mb-2">
                  {exportedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(exportedKey)}
                  className="text-purple-600 hover:text-purple-700 text-xs font-medium"
                >
                  📋 Copy Private Key
                </button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-900 mb-2">How to import:</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Install Sui Wallet browser extension</li>
                <li>Open wallet → Settings → Import Private Key</li>
                <li>Paste the private key above</li>
                <li>Your wallet will appear with all your appointment NFTs</li>
              </ol>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-900"
            >
              I've Saved It Securely
            </button>
          </div>
        </div>
      )}
    </>
  );
}
