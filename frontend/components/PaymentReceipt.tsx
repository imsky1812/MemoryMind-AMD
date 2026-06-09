// frontend/components/PaymentReceipt.tsx

'use client';

import { PaymentReceipt as Receipt } from '@/types';
import { ExternalLink, CheckCircle } from 'lucide-react';

interface PaymentReceiptProps {
  receipt: Receipt;
}

export function PaymentReceiptBadge({ receipt }: PaymentReceiptProps) {
  return (
    <div className="flex items-center gap-2 mt-2 bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-3 py-2 text-xs">
      <CheckCircle className="text-emerald-400 shrink-0" size={12} />
      <span className="text-emerald-300">
        Paid ${receipt.amount} {receipt.asset} on {receipt.network}
      </span>
      <span className="text-slate-500">·</span>
      <a
        href={receipt.explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
      >
        {receipt.txHash.slice(0, 8)}...
        <ExternalLink size={10} />
      </a>
    </div>
  );
}