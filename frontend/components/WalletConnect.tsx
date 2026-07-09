// frontend/components/WalletConnect.tsx

'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, ChevronDown, Loader2, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    }
    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptions]);

  // Close on ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowOptions(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  if (mounted && isConnected && address) {
    return (
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        <button
          id="wallet-connected-btn"
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 hover:bg-white/5 transition-all cursor-pointer active:scale-95"
        >
          <div className="w-2 h-2 rounded-full bg-tertiary pulse-green"></div>
          <span className="font-sans text-sm font-medium text-primary">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <ChevronDown size={14} className={`text-primary transition-transform ${showOptions ? 'rotate-180' : ''}`} />
        </button>

        {showOptions && (
          <div className="absolute right-0 top-full mt-2 glass-panel rounded-xl shadow-xl z-[9999] min-w-[160px] overflow-hidden border border-white/10">
            <div className="px-4 py-2 border-b border-white/5">
              <p className="font-sans text-[10px] text-outline uppercase tracking-wider">Connected</p>
              <p className="font-mono text-xs text-on-surface mt-0.5 truncate max-w-[140px]">{address}</p>
            </div>
            <button
              id="wallet-disconnect-btn"
              onClick={() => {
                disconnect();
                setShowOptions(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-on-surface-variant hover:bg-white/10 hover:text-error transition-colors"
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
    <div className="relative" ref={dropdownRef}>
      <button
        id="wallet-connect-btn"
        onClick={() => setShowOptions(!showOptions)}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 hover:from-primary/30 hover:to-secondary/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 size={16} className="text-primary animate-spin" />
        ) : (
          <Wallet size={16} className="text-primary" />
        )}
        <span className="font-sans text-sm font-medium text-primary">
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </span>
        {!isPending && <ChevronDown size={14} className={`text-primary transition-transform ${showOptions ? 'rotate-180' : ''}`} />}
      </button>

      {showOptions && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-[9998] md:hidden"
            onClick={() => setShowOptions(false)}
          />

          <div
            id="wallet-options-dropdown"
            className="absolute right-0 top-full mt-2 glass-panel rounded-2xl shadow-2xl z-[9999] w-64 overflow-hidden border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <p className="font-sans text-sm font-semibold text-on-surface">Connect Wallet</p>
              <button
                onClick={() => setShowOptions(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Connector options */}
            <div className="p-2 flex flex-col gap-1">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  id={`wallet-option-${connector.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    connect({ connector });
                    setShowOptions(false);
                  }}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {/* Connector icon */}
                  <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Wallet size={16} className="text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-sans text-sm font-semibold text-on-surface">{connector.name}</p>
                    <p className="font-sans text-[10px] text-outline mt-0.5">
                      {connector.name.toLowerCase().includes('coinbase')
                        ? 'Smart Wallet or Extension'
                        : connector.name.toLowerCase().includes('metamask')
                        ? 'Browser Extension'
                        : 'Browser Wallet'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Note */}
            <div className="px-4 py-3 border-t border-white/5">
              <p className="font-sans text-[10px] text-outline leading-relaxed">
                Connect on <span className="text-primary font-semibold">Base Sepolia</span> testnet to use MemoryMint
              </p>
            </div>

            {/* Error state */}
            {error && (
              <div className="px-4 py-2 bg-error/10 border-t border-error/20">
                <p className="font-sans text-[11px] text-error">{error.message}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
