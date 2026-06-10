// frontend/components/PaymentReceipt.tsx

'use client';

import { PaymentReceipt } from '@/types';
import { ExternalLink } from 'lucide-react';

interface PaymentReceiptProps {
  receipt: PaymentReceipt;
}

export function PaymentReceiptBadge({ receipt }: PaymentReceiptProps) {
  const isDev = receipt.network.toLowerCase().includes('sepolia');
  const chainName = isDev ? 'Base Sepolia' : 'Base';
  
  return (
    <div className="absolute -bottom-3 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-tertiary-container/20 border border-tertiary/40 backdrop-blur-md shadow-[0_0_10px_rgba(60,227,106,0.1)] z-10">
      <div className="w-1.5 h-1.5 rounded-full bg-tertiary pulse-green"></div>
      <span className="font-sans text-xs font-semibold text-tertiary">
        ${receipt.amount} USDC Paid
      </span>
      <div className="w-px h-3 bg-tertiary/30"></div>
      <a 
        href={receipt.explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[11px] text-tertiary-fixed-dim hover:underline flex items-center gap-1"
      >
        {receipt.txHash.slice(0, 6)}...{receipt.txHash.slice(-4)}
        <ExternalLink size={11} className="shrink-0" />
      </a>
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-tertiary/20 text-tertiary uppercase tracking-wider ml-1">
        {chainName}
      </span>
    </div>
  );
}
