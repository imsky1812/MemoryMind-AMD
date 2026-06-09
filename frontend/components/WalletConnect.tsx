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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-700 rounded-lg px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300 text-sm font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="Disconnect wallet"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isPending}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        <Wallet size={16} />
        {isPending ? 'Connecting...' : 'Connect Wallet'}
        <ChevronDown size={14} />
      </button>

      {showOptions && (
        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[180px]">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector });
                setShowOptions(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}