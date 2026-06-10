// frontend/components/WalletConnect.tsx

'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showOptions, setShowOptions] = useState(false);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2 relative">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 hover:bg-white/5 transition-all cursor-pointer active:scale-95"
        >
          <div className="w-2 h-2 rounded-full bg-tertiary pulse-green"></div>
          <span className="font-sans text-sm font-medium text-primary">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <ChevronDown size={14} className="text-primary" />
        </button>

        {showOptions && (
          <div className="absolute right-0 top-full mt-2 glass-panel rounded-xl shadow-xl z-50 min-w-[150px] overflow-hidden">
            <button
              onClick={() => {
                disconnect();
                setShowOptions(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition-colors"
            >
              <span>Disconnect</span>
              <LogOut size={14} className="text-error" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 hover:from-primary/30 hover:to-secondary/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
      >
        <Wallet size={16} className="text-primary" />
        <span className="font-sans text-sm font-medium text-primary">
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </span>
        <ChevronDown size={14} className="text-primary" />
      </button>

      {showOptions && (
        <div className="absolute right-0 top-full mt-2 glass-panel rounded-xl shadow-xl z-50 min-w-[180px] overflow-hidden">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector });
                setShowOptions(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition-colors"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
