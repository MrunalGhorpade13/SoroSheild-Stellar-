import React, { useState, useEffect } from 'react';
import { checkFreighter, getXLMBalance } from '../lib/stellar';
import { Wallet, LogOut, Coins, Info } from 'lucide-react';

interface WalletConnectProps {
  onWalletConnected: (address: string | null) => void;
  walletAddress: string | null;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ onWalletConnected, walletAddress }) => {
  const [installed, setInstalled] = useState(false);
  const [balance, setBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState(false);

  // Check wallet installation on load
  useEffect(() => {
    async function init() {
      const status = await checkFreighter();
      setInstalled(status.installed);
      if (status.address) {
        onWalletConnected(status.address);
        loadBalance(status.address);
      }
    }
    init();
  }, []);

  // Update balance when address changes
  useEffect(() => {
    if (walletAddress) {
      loadBalance(walletAddress);
    }
  }, [walletAddress]);

  const loadBalance = async (addr: string) => {
    const bal = await getXLMBalance(addr);
    const parsed = parseFloat(bal);
    setBalance(isNaN(parsed) ? '0.00' : parsed.toFixed(2));
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const status = await checkFreighter();
      if (!status.installed) {
        alert('Freighter extension not found! Please download and install Freighter from freighter.app.');
        window.open('https://www.freighter.app/', '_blank');
        return;
      }
      
      if (status.address) {
        onWalletConnected(status.address);
        await loadBalance(status.address);
      } else {
        console.warn('User rejected wallet connection or account is locked.');
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    onWalletConnected(null);
    setBalance('0.00');
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!installed) {
    return (
      <a
        href="https://www.freighter.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-xl text-sm border border-amber-200 transition-all hover:bg-amber-100 font-semibold"
      >
        <Info className="w-4 h-4 text-amber-600 animate-pulse" />
        <span>Install Freighter Wallet</span>
      </a>
    );
  }

  if (walletAddress) {
    return (
      <div className="flex items-center gap-3">
        {/* Balance Display */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 text-sm">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-semibold">{balance} XLM</span>
        </div>

        {/* Wallet Address & Disconnect */}
        <div className="flex items-center gap-2 bg-stellar-lightBg border border-stellar-blue/20 px-3.5 py-2 rounded-xl text-sm text-stellar-blue font-semibold">
          <Wallet className="w-4 h-4" />
          <span>{truncateAddress(walletAddress)}</span>
          <button
            onClick={handleDisconnect}
            title="Disconnect Wallet"
            className="text-slate-400 hover:text-red-500 transition-all ml-1"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-stellar-blue text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:bg-stellar-darkBlue hover:shadow-lg active:scale-95 disabled:opacity-50"
    >
      <Wallet className="w-4.5 h-4.5" />
      <span>{loading ? 'Connecting...' : 'Connect Wallet'}</span>
    </button>
  );
};
